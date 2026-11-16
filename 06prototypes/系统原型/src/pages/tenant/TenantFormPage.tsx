import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Button,
  CascaderSelect,
  FormField,
  Icon,
  Input,
  Modal,
  PageHeader,
  ProfileFieldControl,
  Select,
  useToast,
} from '@/shared/components'
import type { SelectOption } from '@/shared/components'
import {
  activeTenantAdminSeats,
  createTenant,
  DEFAULT_MEMBER_LIMIT,
  fetchTenant,
  MAX_TENANT_ADMIN_SEATS,
  MEMBER_LIMIT_MAX,
  profileFieldsOf,
  profileScopeOf,
  REGION_TREE,
  saveTenantModules,
  updateTenant,
} from '@/mock/tenant'
import { createTenantAdminAccount, fetchAllAccounts, generateStrongPassword } from '@/mock/account'
import { ensureTenantRootOrg } from '@/mock/org'
import { maskMobile } from '@/mock/member'
import { fetchTenantModuleTree } from '@/mock/menu'
import type { TenantModuleGroupNode } from '@/mock/menu'
import type { PlatformAccount, Tenant, TenantPayload, TenantType } from '@/types'
import { tenantTypeText } from './tenantMeta'
import { findTreeOption, flattenTreeOptions } from '@/shared/components'
import './TenantPage.css'
import TenantAdminModal from './TenantAdminModal'
import TenantStepper from './TenantStepper'
import TenantTabs from './TenantTabs'
import TenantModuleDrawer from './TenantModuleDrawer'
import TenantModuleTree from './TenantModuleTree'

interface FormState {
  name: string
  type: TenantType
  contactName: string
  contactPhone: string
  validFrom: string
  validTo: string
  memberLimit: string
  adminAccountId: string
  adminName: string
  adminMobile: string
  profile: Record<string, string>
}

const EMPTY_FORM: FormState = {
  name: '',
  type: 'enterprise',
  contactName: '',
  contactPhone: '',
  validFrom: '',
  validTo: '',
  memberLimit: String(DEFAULT_MEMBER_LIMIT),
  adminAccountId: '',
  adminName: '',
  adminMobile: '',
  profile: {},
}

/** 本期租户类型只开放「企业」（§本期范围）：类型创建后不可改 */
const TYPE_OPTIONS: SelectOption[] = [{ label: '企业', value: 'enterprise' }]

/** 企业统一社会信用代码（扩展档案 credit_code） */
const USCC_RE = /^[0-9A-Z]{18}$/
const MOBILE_RE = /^1[3-9]\d{9}$/

/**
 * 已有关联账号能否担任本租户主管理员：可担任返回空串，否则返回不可用的原因。
 * 规则与「更换主管理员」一致：须启用、不得超出兼任上限；平台账号也可兼任租户主管理员。
 */
function adminIssueOf(account: PlatformAccount): string {
  if (account.status !== 'enabled') return '该账号已停用，不可作为主管理员'
  if (activeTenantAdminSeats(account.id) >= MAX_TENANT_ADMIN_SEATS) {
    return `该账号已担任 ${MAX_TENANT_ADMIN_SEATS} 个租户的主管理员，超出兼任上限`
  }
  return ''
}

type EditTab = 'basic' | 'profile' | 'admin'

/**
 * 租户管理 · 新建 / 编辑（分组口径与查看页逐字对齐）：
 * - 统一四个分组名：租户信息 / 企业信息 / 主管理员 / 模块授权；
 * - 新建采用四步向导（Stepper）：租户信息 → 企业信息 → 主管理员 → 模块授权（开户一站式闭环）；
 * - 查看采用五个 Tab：租户信息 / 企业信息 / 主管理员 / 组织与成员 / 操作记录；
 * - 编辑采用三个 Tab：租户信息 / 企业信息 / 主管理员（与新建前三步一一对应）；
 * - 模块授权属「操作」不属「信息」，新建在 Step4 内嵌勾选，查看 / 编辑统一走页头按钮 + 抽屉，不占 Tab。
 */
export default function TenantFormPage() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const toast = useToast()

  const [loading, setLoading] = useState(isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [accounts, setAccounts] = useState<PlatformAccount[]>([])
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [adminOpen, setAdminOpen] = useState(false)
  const [adminForm, setAdminForm] = useState({ loginName: '', displayName: '', mobile: '', email: '' })
  /** 手机号命中已有关联账号后，用户确认关联的账号 id（空 = 未关联，走新建账号） */
  const [linkedAccountId, setLinkedAccountId] = useState('')
  /** 初始密码：单个输入框；留空 = 系统兜底生成强随机密码（与成员管理一致） */
  const [password, setPassword] = useState('')
  /** 账号是否被管理员手动改过：改过之后不再跟随手机号联动（与成员管理一致） */
  const [accountTouched, setAccountTouched] = useState(false)
  /** 密码明文 / 密文切换 */
  const [showPassword, setShowPassword] = useState(false)
  const [created, setCreated] = useState<{
    tenantId: string
    tenantName: string
    rootName: string
    loginName: string
    password: string
  } | null>(null)
  const [copied, setCopied] = useState(false)
  /** 主体标识变更二次确认（C-09）：编辑企业信用代码时先确认再保存 */
  const [creditConfirm, setCreditConfirm] = useState<{
    payload: TenantPayload
    before: string
    after: string
  } | null>(null)

  /** 新建向导当前步骤（0 起） */
  const [step, setStep] = useState(0)
  /** 编辑页当前 Tab */
  const [editTab, setEditTab] = useState<EditTab>('basic')
  /** 新建 Step3 模块授权选择 */
  const [moduleCodes, setModuleCodes] = useState<string[]>([])
  /** 编辑「模块授权」Tab 调整抽屉 */
  const [moduleDrawerOpen, setModuleDrawerOpen] = useState(false)

  /** 扁平化地区树，便于按选中值回查完整 path（省/市/区） */
  const flatRegion = useMemo(() => flattenTreeOptions(REGION_TREE), [])
  /** 新建 Step3 模块授权树数据（编辑走抽屉，无需此数据） */
  const [moduleGroups, setModuleGroups] = useState<TenantModuleGroupNode[]>([])
  useEffect(() => {
    if (!isEdit) {
      void fetchTenantModuleTree().then((groups) => {
        // 新建开户默认授权全部模块（§默认授权）：加载模块树后预置全选
        setModuleGroups(groups)
        setModuleCodes(groups.flatMap((group) => group.children.map((item) => item.id)))
      })
    }
  }, [isEdit])
  const allModuleCodes = moduleGroups.flatMap((group) => group.children.map((item) => item.id))

  const load = useCallback(async () => {
    if (!isEdit || !id) return
    setLoading(true)
    try {
      const [detail, accts] = await Promise.all([fetchTenant(id), fetchAllAccounts()])
      setAccounts(accts)
      setTenant(detail)
      setModuleCodes([...detail.moduleCodes])
      setForm({
        name: detail.name,
        type: detail.type,
        contactName: detail.contactName,
        contactPhone: detail.contactPhone,
        validFrom: detail.validFrom,
        validTo: detail.validTo,
        memberLimit: String(detail.memberLimit),
        adminAccountId: detail.adminAccountId,
        adminName: detail.adminName,
        adminMobile: detail.adminMobile,
        profile: { ...detail.profile },
      })
    } catch (error) {
      toast(error instanceof Error ? error.message : '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [id, isEdit, toast])

  useEffect(() => {
    if (isEdit) {
      void load()
    } else {
      void fetchAllAccounts().then(setAccounts)
    }
  }, [isEdit, load])

  const update = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }))
  const updateProfile = (code: string, value: string) =>
    setForm((prev) => ({ ...prev, profile: { ...prev.profile, [code]: value } }))

  /** 新增管理员账号时按手机号校验：命中即提示可直接关联 */
  const matched = useMemo(() => {
    const mobile = adminForm.mobile.trim()
    if (!MOBILE_RE.test(mobile)) return null
    return accounts.find((item) => item.mobile === mobile) ?? null
  }, [accounts, adminForm.mobile])

  /** 已确认关联的账号（手机号变更后自动失效） */
  const linkedAccount = useMemo(
    () => (linkedAccountId ? accounts.find((item) => item.id === linkedAccountId) ?? null : null),
    [accounts, linkedAccountId],
  )
  const matchedIssue = matched ? adminIssueOf(matched) : ''

  /** 密码强度实时校验：8-20 位 + 含字母 + 含数字（与成员管理一致） */
  const passwordStrength = useMemo(() => {
    const value = password.trim()
    return {
      length: value.length >= 8 && value.length <= 20,
      letter: /[A-Za-z]/.test(value),
      digit: /\d/.test(value),
    }
  }, [password])
  const passwordValid = passwordStrength.length && passwordStrength.letter && passwordStrength.digit

  const changeMobile = (mobile: string) => {
    setAdminForm((prev) => ({ ...prev, mobile, loginName: accountTouched ? prev.loginName : mobile }))
    setLinkedAccountId('')
  }

  /** 收集全量校验错误（新建 / 编辑最终提交都走这里） */
  const buildErrors = (): Record<string, string> => {
    const next: Record<string, string> = {}
    const name = form.name.trim()
    if (!name) next.name = '租户名称必填'
    else if (name.length > 100) next.name = '租户名称最长 100 字符'

    const hasName = !!form.contactName.trim()
    const hasPhone = !!form.contactPhone.trim()
    if (hasName !== hasPhone) next.contactPhone = '联系人姓名与手机号须同时填写'
    else if (hasPhone && !/^1\d{10}$/.test(form.contactPhone.trim())) next.contactPhone = '请填写 11 位手机号'

    if (form.validFrom && form.validTo && form.validTo < form.validFrom) {
      next.validTo = '结束日期不得早于开始日期'
    }

    const limit = Number(form.memberLimit.trim())
    if (!Number.isInteger(limit) || limit < 1 || limit > MEMBER_LIMIT_MAX) {
      next.memberLimit = `取值 1 至 ${MEMBER_LIMIT_MAX} 的整数`
    }

    // 扩展档案：platform / both 档必填项由平台开户时校验
    profileFieldsOf(form.type).forEach((field) => {
      const value = (form.profile[field.code] ?? '').trim()
      const platformMaintained = profileScopeOf(field) !== 'tenant'
      if (!value) {
        if (platformMaintained && field.required) next[`profile.${field.code}`] = `${field.name}必填`
        return
      }
      if (field.maxLength && value.length > field.maxLength) {
        next[`profile.${field.code}`] = `最长 ${field.maxLength} 字符`
      } else if (field.type === 'number' && Number.isNaN(Number(value))) {
        next[`profile.${field.code}`] = '请输入数字'
      }
    })

    // 统一社会信用代码（仅企业类型）：18 位大写字母与数字
    if (form.type === 'enterprise') {
      const creditCode = (form.profile.credit_code ?? '').trim().toUpperCase()
      if (creditCode && !USCC_RE.test(creditCode)) {
        next['profile.credit_code'] = '须为 18 位大写字母与数字'
      }
    }

    // 管理员账号：开户时新建登录账号；手机号命中已有账号时须先关联
    if (!isEdit) {
      if (!adminForm.displayName.trim()) next['admin.displayName'] = '姓名必填'
      const mobile = adminForm.mobile.trim()
      if (!mobile) next['admin.mobile'] = '手机号必填'
      else if (!MOBILE_RE.test(mobile)) next['admin.mobile'] = '手机号格式不正确'

      if (matched) {
        if (matchedIssue) next['admin.mobile'] = matchedIssue
        else if (!linkedAccount) {
          next['admin.mobile'] = '该手机号已关联登录账号，请点击「关联该账号」，或改用其他手机号新建账号'
        }
      } else if (!linkedAccount) {
        const loginName = adminForm.loginName.trim()
        if (!loginName) next['admin.loginName'] = '账号必填'
        else if (/^\d{11}$/.test(loginName)) next['admin.loginName'] = '账号不得为 11 位纯数字'
        // 留空由系统兜底生成；填写则须满足 8-20 位且同时包含字母和数字（与成员管理一致）
        if (password.trim() && !passwordValid) next['admin.password'] = '初始密码须为 8-20 位，且同时包含字母和数字'
      }
    }

    return next
  }

  const validate = (): boolean => {
    const next = buildErrors()
    setErrors(next)
    return Object.keys(next).length === 0
  }

  /** 向导分步校验：按四个分组逐段校验（租户信息 / 企业信息 / 主管理员 / 模块授权） */
  const validateStep = (target: number): boolean => {
    const all = buildErrors()
    const inScope = (key: string) => {
      if (target === 0) return ['name', 'validTo', 'memberLimit'].includes(key)
      if (target === 1) return key === 'contactPhone' || key.startsWith('profile.')
      if (target === 2) return key.startsWith('admin.')
      // target === 3：模块授权为纯勾选，无表单校验
      return false
    }
    const stepErrors = Object.fromEntries(Object.entries(all).filter(([key]) => inScope(key)))
    setErrors(stepErrors)
    return Object.keys(stepErrors).length === 0
  }

  /** 实际保存：新建走 createTenant + 初始化根组织；编辑走 updateTenant */
  const persist = async (
    payload: TenantPayload,
    adminLoginName = '',
    adminPassword = '',
    linkedName = '',
  ) => {
    setSubmitting(true)
    try {
      if (isEdit && id) {
        await updateTenant(id, payload)
        toast('保存成功')
        navigate(`/system/tenant/${id}`)
      } else {
        const tenant = await createTenant(payload)
        // 开户必做初始化：自动创建本租户组织架构根组织（组织名称 = 租户名称）
        const rootOrg = await ensureTenantRootOrg(tenant.id, tenant.name, tenant.type)
        // 开户一站式闭环：Step3 勾选的模块授权在开户完成后直接落库
        if (moduleCodes.length > 0) {
          await saveTenantModules(tenant.id, moduleCodes)
        }
        if (adminPassword) {
          setCreated({
            tenantId: tenant.id,
            tenantName: tenant.name,
            rootName: rootOrg.name,
            loginName: adminLoginName,
            password: adminPassword,
          })
          setCopied(false)
          toast('租户已创建，已自动创建租户管理员角色并授予全部功能权限')
        } else {
          toast(
            `租户已创建${linkedName ? `，已关联已有登录账号「${linkedName}」` : ''}，已自动创建租户管理员角色并授予全部功能权限`,
          )
          navigate(`/system/tenant/${tenant.id}`)
        }
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async () => {
    if (!validate()) return

    // 开户管理员账号：命中已有账号则直接关联，否则新建登录账号后再作为本租户主管理员
    let adminAccountId = form.adminAccountId
    let adminLoginName = ''
    let adminPassword = ''
    let linkedName = ''
    if (!isEdit) {
      if (linkedAccount) {
        adminAccountId = linkedAccount.id
        linkedName = linkedAccount.displayName
      } else {
        try {
          const createdAccount = await createTenantAdminAccount({
            loginName: adminForm.loginName.trim(),
            displayName: adminForm.displayName.trim(),
            mobile: adminForm.mobile.trim(),
            email: adminForm.email.trim(),
            passwordMode: password.trim() ? 'custom' : 'random',
            customPassword: password.trim() || undefined,
          })
          adminAccountId = createdAccount.account.id
          adminLoginName = createdAccount.account.loginName
          adminPassword = createdAccount.password
        } catch (error) {
          toast(error instanceof Error ? error.message : '管理员账号创建失败', 'error')
          return
        }
      }
    }

    const payload: TenantPayload = {
      name: form.name.trim(),
      type: form.type,
      contactName: form.contactName.trim(),
      contactPhone: form.contactPhone.trim(),
      validFrom: form.validFrom,
      validTo: form.validTo,
      profile: form.profile,
      memberLimit: Number(form.memberLimit.trim()),
      adminAccountId,
    }

    // 主体标识变更二次确认（C-09）：企业统一社会信用代码变更时先确认再保存
    if (isEdit && tenant && form.type === 'enterprise') {
      const before = (tenant.profile.credit_code ?? '').trim().toUpperCase()
      const after = (payload.profile.credit_code ?? '').trim().toUpperCase()
      if (before && after && before !== after) {
        setCreditConfirm({ payload, before, after })
        return
      }
    }

    await persist(payload, adminLoginName, adminPassword, linkedName)
  }

  const backPath = '/system/tenant'
  const fields = profileFieldsOf(form.type)

  if (loading) {
    return (
      <>
        <PageHeader breadcrumb={['系统管理', '组织与权限', '租户管理', '编辑租户']} title="编辑租户" />
        <div className="card">
          <div className="empty">加载中…</div>
        </div>
      </>
    )
  }

  /** 开户新建了管理员账号：一次性展示初始密码（关闭后不可再查） */
  const handleCopy = async () => {
    if (!created) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(created.password)
      } else {
        const ta = document.createElement('textarea')
        ta.value = created.password
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopied(true)
    } catch {
      toast('复制失败，请手动选中密码后复制', 'error')
    }
  }

  /** 复制初始密码（向导 Step2 随机生成后可直接复制） */
  const handleCopyPassword = async () => {
    if (!password.trim()) return
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(password.trim())
      else {
        const ta = document.createElement('textarea')
        ta.value = password
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      toast('密码已复制')
    } catch {
      toast('复制失败，请手动选中密码后复制', 'error')
    }
  }

  if (created) {
    return (
      <>
        <PageHeader breadcrumb={['系统管理', '组织与权限', '租户管理', '开户完成']} title="租户已创建" />
        <Modal
          open
          title="租户创建成功！"
          size="lg"
          onClose={() => navigate(`/system/tenant/${created.tenantId}`)}
          footer={
            <Button variant="primary" onClick={() => navigate(`/system/tenant/${created.tenantId}`)}>
              查看租户详情
            </Button>
          }
        >
          <div className="modal-confirm-text">
            <span style={{ color: 'var(--color-warning)', display: 'flex' }}>
              <Icon name="warning" size={16} />
            </span>
            <div>
              <div>
                租户「{created.tenantName}」已创建，已自动初始化组织架构根组织「{created.rootName}」并创建「租户管理员」角色。
              </div>
              <div className="modal-confirm-tip">
                根组织由系统自动创建、不可删除，组织名称后续可改；下级组织由租户管理员在租户端「组织架构」自行创建。
              </div>
            </div>
          </div>
          {moduleCodes.length > 0 && (
            <div className="modal-confirm-text">
              <span style={{ color: 'var(--color-success)', display: 'flex' }}>
                <Icon name="check" size={16} />
              </span>
              <div>
                <div>已为该租户开通 {moduleCodes.length} 个功能模块（开户一站式授权完成）。</div>
                <div className="modal-confirm-tip">可在详情页「模块授权」中继续调整。</div>
              </div>
            </div>
          )}
          <div className="modal-confirm-text">
            <span style={{ color: 'var(--color-warning)', display: 'flex' }}>
              <Icon name="warning" size={16} />
            </span>
            <div>
              <div>
                主管理员账号为：<b className="mono">{created.loginName}</b>，初始密码为：
                <b className="mono">{created.password}</b>。
              </div>
              <div className="modal-confirm-tip">请立即复制并线下告知用户；关闭后将无法再次查看密码，首次登录强制改密。</div>
            </div>
          </div>
          <div className="tenant-onetime">
            <span className="mono">{created.password}</span>
            <Button size="small" onClick={() => void handleCopy()}>
              {copied ? '已复制' : '复制密码'}
            </Button>
          </div>
        </Modal>
      </>
    )
  }

  /** 单个扩展档案字段渲染：region 走整体级联组件，其余复用 ProfileFieldControl */
  const renderProfileField = (field: (typeof fields)[number]) => {
    if (field.type === 'region') {
      const regionVal = form.profile[field.code] ?? ''
      const leaf = regionVal.split(',').pop() ?? ''
      return (
        <FormField
          label={field.name}
          required={field.required}
          error={errors[`profile.${field.code}`]}
          full
          hint={field.placeholder}
        >
          <CascaderSelect
            value={leaf}
            options={REGION_TREE}
            placeholder={field.placeholder ?? '省 / 市 / 区'}
            invalid={!!errors[`profile.${field.code}`]}
            onChange={(val) => {
              const hit = findTreeOption(flatRegion, val)
              updateProfile(field.code, hit ? hit.path.map((n) => n.value).join(',') : val)
            }}
          />
        </FormField>
      )
    }
    const isLogo = field.type === 'image'
    return (
      <div className={isLogo ? 'tenant-logo-field' : undefined} key={field.code}>
        <ProfileFieldControl
          field={field}
          value={form.profile[field.code] ?? ''}
          error={errors[`profile.${field.code}`]}
          disabled={profileScopeOf(field) === 'tenant'}
          onChange={(value) => updateProfile(field.code, value)}
        />
      </div>
    )
  }

  /** 不可编辑字段：纯文本 + ⓘ 提示，取消禁用态输入框 */
  const renderReadonlyType = () => (
    <FormField label="租户类型" required>
      <span className="tenant-readonly-text">
        {tenantTypeText[form.type]}
        <span className="tenant-info-icon" title="租户类型创建后不可修改">
          ⓘ
        </span>
      </span>
    </FormField>
  )

  /* ----------------------------- 新建：Step 1 租户信息 ----------------------------- */
  const renderStepBasic = () => (
    <div className="card">
      <div className="tenant-section-header">
        <span className="tenant-section-title" data-ann-target="tenant.section.tenant">
          租户信息
        </span>
        <span className="toolbar-tip">
          租户类型本期仅「企业」且创建后不可改；有效期起止非必填（都为空表示长期有效）；成员数上限默认 {DEFAULT_MEMBER_LIMIT} 人，可改
        </span>
      </div>
      <div className="tenant-section-body">
        <div className="form-grid form-grid-2">
          <FormField label="租户名称" required error={errors.name}>
            <Input
              value={form.name}
              placeholder="请输入租户名称"
              invalid={!!errors.name}
              data-ann-target="tenant.field.name"
              onChange={(e) => update({ name: e.target.value })}
            />
          </FormField>

          {renderReadonlyType()}

          <FormField
            label="有效期（起止）"
            full
            error={errors.validTo}
            hint="非必填；起止都为空表示长期有效，到期只提示不自动停用"
          >
            <div className="tenant-daterange-row" data-ann-target="tenant.field.valid">
              <Input type="date" value={form.validFrom} onChange={(e) => update({ validFrom: e.target.value })} />
              <span className="text-tertiary">至</span>
              <Input
                type="date"
                value={form.validTo}
                invalid={!!errors.validTo}
                onChange={(e) => update({ validTo: e.target.value })}
              />
            </div>
          </FormField>

          <FormField
            label="成员数上限"
            required
            error={errors.memberLimit}
            hint={`默认 ${DEFAULT_MEMBER_LIMIT}，可改；取值 1 至 ${MEMBER_LIMIT_MAX}`}
          >
            <Input
              value={form.memberLimit}
              placeholder={`1 至 ${MEMBER_LIMIT_MAX}`}
              invalid={!!errors.memberLimit}
              data-ann-target="tenant.field.limit"
              onChange={(e) => update({ memberLimit: e.target.value })}
            />
          </FormField>
        </div>
      </div>
      <div className="tenant-section-tip">
        租户编号由系统自动生成、创建后不可改；成员数上限含主管理员、停用与已移出成员，默认 {DEFAULT_MEMBER_LIMIT} 人；主管理员在下一步指定。
      </div>
    </div>
  )

  /* ----------------------------- 新建：Step 2 企业信息 ----------------------------- */
  const renderStepProfile = () => (
    <div className="card">
      <div className="tenant-section-header">
        <span className="tenant-section-title" data-ann-target="tenant.section.profile">
          企业信息
        </span>
        <span className="toolbar-tip">必填：统一社会信用代码、所在地区、详细地址；其余选填</span>
      </div>
      <div className="tenant-section-body">
        <div className="form-grid form-grid-2">
          {fields.map((field) => renderProfileField(field))}

          <FormField label="联系人" hint="非必填，与联系人电话成对填写">
            <Input
              value={form.contactName}
              placeholder="商务 / 业务对接人"
              data-ann-target="tenant.field.contact"
              onChange={(e) => update({ contactName: e.target.value })}
            />
          </FormField>

          <FormField label="联系人电话" error={errors.contactPhone} hint="非必填，11 位手机号">
            <Input
              value={form.contactPhone}
              placeholder="11 位手机号"
              invalid={!!errors.contactPhone}
              onChange={(e) => update({ contactPhone: e.target.value })}
            />
          </FormField>
        </div>
      </div>
      <div className="tenant-section-tip">
        当前类型：{tenantTypeText[form.type]}；标 * 为开户必填项，未填不可保存。租户端「租户信息」展示同一套企业信息字段，由租户自行维护（租户类型不可改）。
      </div>
    </div>
  )

  /* ----------------------------- 新建：Step 3 主管理员 ----------------------------- */
  const renderStepAdmin = () => (
    <div className="card">
      <div className="tenant-section-header">
        <span className="tenant-section-title" data-ann-target="tenant.form.admin">
          主管理员
        </span>
        <span className="toolbar-tip">该账号将成为本租户主管理员，自动获得全部功能权限；首登强制改密</span>
      </div>
      <div className="tenant-section-body">
        <div className="form-grid form-grid-2">
          <FormField label="姓名" required error={errors['admin.displayName']} hint="本租户主管理员真实姓名">
            <Input
              value={linkedAccount ? linkedAccount.displayName : adminForm.displayName}
              placeholder="请输入姓名"
              disabled={!!linkedAccount}
              invalid={!!errors['admin.displayName']}
              onChange={(e) => setAdminForm((prev) => ({ ...prev, displayName: e.target.value }))}
            />
          </FormField>

          <FormField
            label="手机号"
            required
            error={errors['admin.mobile']}
            hint="11 位手机号；提交时按手机号校验是否已有关联账号，命中即可直接关联"
          >
            <Input
              value={linkedAccount ? linkedAccount.mobile : adminForm.mobile}
              placeholder="11 位手机号"
              disabled={!!linkedAccount}
              invalid={!!errors['admin.mobile']}
              onChange={(e) => changeMobile(e.target.value)}
            />
          </FormField>

          <FormField
            label="账号"
            required
            error={errors['admin.loginName']}
            hint="默认与手机号一致，可修改；全局唯一，不得为 11 位纯数字"
          >
            <Input
              value={linkedAccount ? linkedAccount.loginName : adminForm.loginName}
              placeholder="默认与手机号一致"
              disabled={!!linkedAccount}
              invalid={!!errors['admin.loginName']}
              onChange={(e) => {
                setAccountTouched(true)
                setAdminForm((prev) => ({ ...prev, loginName: e.target.value }))
              }}
            />
            <p className="tenant-account-hint">默认将手机号作为登录账号，可修改；创建后不可更改</p>
          </FormField>

          <FormField label="邮箱" hint="非必填，用于登录凭证与通知">
            <Input
              value={adminForm.email}
              placeholder="请输入邮箱"
              onChange={(e) => setAdminForm((prev) => ({ ...prev, email: e.target.value }))}
            />
          </FormField>

          {matched && (
            <FormField label="已有关联账号" full hint="同一手机号在系统中只允许存在一个登录账号">
              <div className="tenant-link-account" data-ann-target="tenant.form.admin.link">
                <span style={{ color: 'var(--color-warning)', display: 'flex' }}>
                  <Icon name="warning" size={16} />
                </span>
                <div>
                  <div>
                    手机号 <b className="mono">{matched.mobile}</b> 已关联登录账号「{matched.displayName}（
                    {matched.loginName}）」，可直接关联该账号作为本租户管理员（平台账号亦可兼任）。
                  </div>
                  <div className="modal-confirm-tip">
                    {matchedIssue
                      ? matchedIssue
                      : linkedAccount
                        ? '已关联：将使用该账号的账号与密码登录，不再生成初始密码。'
                        : '如确为该人，请点击「关联该账号」；否则请改用其他手机号新建账号。'}
                  </div>
                </div>
                <Button
                  size="small"
                  variant={linkedAccount ? undefined : 'primary'}
                  disabled={!!matchedIssue}
                  onClick={() => {
                    if (linkedAccount) {
                      setLinkedAccountId('')
                      setAdminForm({ loginName: '', displayName: '', mobile: '', email: '' })
                      return
                    }
                    setLinkedAccountId(matched.id)
                    setAdminForm((prev) => ({
                      ...prev,
                      loginName: matched.loginName,
                      displayName: matched.displayName,
                      mobile: matched.mobile,
                      email: prev.email.trim() ? prev.email : matched.email || '',
                    }))
                  }}
                >
                  {linkedAccount ? '取消关联' : '关联该账号'}
                </Button>
              </div>
            </FormField>
          )}

          {!linkedAccount && (
            <FormField
              label="初始密码"
              error={errors['admin.password']}
              full
              hint="留空由系统自动生成强随机密码；也可自定义，须 8-20 位且同时包含字母和数字"
            >
              <div className="tenant-password-field">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  placeholder="留空由系统自动生成强随机密码"
                  invalid={!!errors['admin.password']}
                  autoComplete="new-password"
                  data-ann-target="tenant.form.admin.password"
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="tenant-password-eye"
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  title={showPassword ? '隐藏密码' : '显示密码'}
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  <Icon name={showPassword ? 'eyeOff' : 'eye'} size={16} />
                </button>
                <button type="button" className="tenant-password-random" onClick={() => { setPassword(generateStrongPassword()); setShowPassword(true); setErrors((prev) => ({ ...prev, 'admin.password': '' })) }}>
                  随机生成
                </button>
                {password.trim() && (
                  <button type="button" className="tenant-password-copy" title="复制密码" onClick={() => void handleCopyPassword()}>
                    复制
                  </button>
                )}
              </div>
              {password.trim() ? (
                <div className="tenant-strength">
                  <span className={passwordStrength.length ? 'ok' : ''}>8-20 位</span>
                  <span className={passwordStrength.letter ? 'ok' : ''}>包含字母</span>
                  <span className={passwordStrength.digit ? 'ok' : ''}>包含数字</span>
                  <span className={passwordValid ? 'tenant-strength-valid' : 'tenant-strength-invalid'}>
                    {passwordValid ? '校验通过' : '请满足以上条件'}
                  </span>
                </div>
              ) : (
                <p className="tenant-account-hint">
                  可留空：点击「保存」时系统自动生成一串强随机密码；也可手动输入（8-20 位，包含字母和数字）。
                </p>
              )}
              <p className="tenant-account-hint">
                <Icon name="lock" size={12} /> 无论自定义还是随机生成，主管理员首次登录均须强制修改初始密码。
              </p>
            </FormField>
          )}
        </div>
      </div>
    </div>
  )

  /* ----------------------------- 新建：Step 4 模块授权 ----------------------------- */
  const renderStepModule = () => (
    <div className="card">
      <div className="tenant-section-header">
        <span className="tenant-section-title" data-ann-target="tenant.section.module">
          模块授权
        </span>
        <span className="toolbar-tip">将授权作为开户最后一步，实现一站式闭环；平台侧功能不在此清单</span>
      </div>
      <div className="tenant-section-body">
        <TenantModuleTree
          groups={moduleGroups}
          codes={moduleCodes}
          onChange={setModuleCodes}
          toolbar
          scrollable
          onSelectAll={() => setModuleCodes(allModuleCodes)}
          onInvert={() => setModuleCodes(allModuleCodes.filter((code) => !moduleCodes.includes(code)))}
        />
      </div>
      <div className="tenant-section-tip">
        默认已授权全部模块（创建后租户可直接使用所有功能）；如需限制可在此取消勾选，取消后功能点对下次请求即失效，角色勾选保留，重新授权自动恢复。建后也可在详情页「模块授权」继续调整。
      </div>
    </div>
  )

  /* ----------------------------- 编辑：Tab 租户信息 ----------------------------- */
  const renderEditBasic = () => (
    <div className="card">
      <div className="tenant-section-header">
        <span className="tenant-section-title" data-ann-target="tenant.section.tenant">
          租户信息
        </span>
      </div>
      <div className="tenant-section-body">
        <div className="form-grid form-grid-2">
          <FormField label="租户名称" required error={errors.name}>
            <Input
              value={form.name}
              placeholder="请输入租户名称"
              invalid={!!errors.name}
              data-ann-target="tenant.field.name"
              onChange={(e) => update({ name: e.target.value })}
            />
          </FormField>

          {renderReadonlyType()}

          <FormField
            label="有效期（起止）"
            full
            error={errors.validTo}
            hint="非必填；起止都为空表示长期有效，到期只提示不自动停用"
          >
            <div className="tenant-daterange-row" data-ann-target="tenant.field.valid">
              <Input type="date" value={form.validFrom} onChange={(e) => update({ validFrom: e.target.value })} />
              <span className="text-tertiary">至</span>
              <Input
                type="date"
                value={form.validTo}
                invalid={!!errors.validTo}
                onChange={(e) => update({ validTo: e.target.value })}
              />
            </div>
          </FormField>

          <FormField
            label="成员数上限"
            required
            error={errors.memberLimit}
            hint={`默认 ${DEFAULT_MEMBER_LIMIT}，可改；取值 1 至 ${MEMBER_LIMIT_MAX}`}
          >
            <Input
              value={form.memberLimit}
              placeholder={`1 至 ${MEMBER_LIMIT_MAX}`}
              invalid={!!errors.memberLimit}
              data-ann-target="tenant.field.limit"
              onChange={(e) => update({ memberLimit: e.target.value })}
            />
          </FormField>
        </div>
      </div>
    </div>
  )

  /* ----------------------------- 编辑：Tab 主管理员 ----------------------------- */
  const renderEditAdmin = () => (
    <div className="card">
      <div className="tenant-section-header">
        <span className="tenant-section-title" data-ann-target="tenant.form.admin">
          主管理员
        </span>
        <Button variant="primary" data-ann-target="tenant.form.admin.change" onClick={() => setAdminOpen(true)}>
          {form.adminAccountId ? '更换主管理员' : '指定主管理员'}
        </Button>
      </div>
      <div className="tenant-section-body">
        <div className="detail-list">
          <div className="detail-item">
            <span className="detail-label">在任主管理员</span>
            <span className="detail-value">
              {form.adminAccountId
                ? `${form.adminName}${form.adminMobile ? `（${maskMobile(form.adminMobile)}）` : ''}`
                : '未指定'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )

  /* ----------------------------- 编辑：Tab 企业信息 ----------------------------- */
  const renderEditProfile = () => (
    <div className="card">
      <div className="tenant-section-header">
        <span className="tenant-section-title" data-ann-target="tenant.section.profile">
          企业信息
        </span>
        <span className="toolbar-tip">必填：统一社会信用代码、所在地区、详细地址；其余选填</span>
      </div>
      <div className="tenant-section-body">
        <div className="form-grid form-grid-2">
          {fields.map((field) => renderProfileField(field))}

          <FormField label="联系人" hint="非必填，与联系人电话成对填写">
            <Input
              value={form.contactName}
              placeholder="商务 / 业务对接人"
              data-ann-target="tenant.field.contact"
              onChange={(e) => update({ contactName: e.target.value })}
            />
          </FormField>

          <FormField label="联系人电话" error={errors.contactPhone} hint="非必填，11 位手机号">
            <Input
              value={form.contactPhone}
              placeholder="11 位手机号"
              invalid={!!errors.contactPhone}
              onChange={(e) => update({ contactPhone: e.target.value })}
            />
          </FormField>
        </div>
      </div>
      <div className="tenant-section-tip">
        当前类型：{tenantTypeText[form.type]}；标 * 为开户必填项，未填不可保存。租户端「租户信息」展示同一套企业信息字段，由租户自行维护（租户类型不可改）。
      </div>
    </div>
  )

  const handleNext = () => {
    if (!validateStep(step)) {
      toast('请先完善当前步骤的必填项', 'error')
      return
    }
    setStep((prev) => Math.min(prev + 1, 3))
  }
  const handlePrev = () => setStep((prev) => Math.max(prev - 1, 0))

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '组织与权限', '租户管理', isEdit ? '编辑租户' : '新建租户']}
        title={
          <span data-ann-target={isEdit ? 'tenant.page.form.edit' : 'tenant.page.form'}>
            {isEdit ? `编辑租户 · ${form.name}` : '新建租户'}
          </span>
        }
        description={
          isEdit
            ? '编辑租户信息：租户信息 / 企业信息 / 主管理员分 Tab 维护，模块授权走页头入口；租户编号与类型创建后不可改。'
            : '向导式开户：Step1 租户信息 → Step2 企业信息 → Step3 主管理员 → Step4 模块授权，一站式闭环。'
        }
        actions={
          isEdit ? (
            <>
              <Button onClick={() => navigate(backPath)}>返回列表</Button>
              {/* 模块授权是「操作」不是「信息」：与详情页一致走按钮 + 抽屉，不占 Tab */}
              <Button data-ann-target="tenant.form.edit.module" onClick={() => setModuleDrawerOpen(true)}>
                模块授权
              </Button>
            </>
          ) : (
            <Button onClick={() => navigate(backPath)}>返回列表</Button>
          )
        }
      />

      {isEdit ? (
        <TenantTabs
          active={editTab}
          onChange={(key) => setEditTab(key as EditTab)}
          items={[
            { key: 'basic', label: '租户信息' },
            { key: 'profile', label: '企业信息' },
            { key: 'admin', label: '主管理员' },
          ]}
        />
      ) : (
        <TenantStepper steps={['租户信息', '企业信息', '主管理员', '模块授权']} current={step} />
      )}

      <div className="tenant-stack">
        {isEdit ? (
          <>
            {editTab === 'basic' && renderEditBasic()}
            {editTab === 'profile' && renderEditProfile()}
            {editTab === 'admin' && renderEditAdmin()}
          </>
        ) : (
          <>
            {step === 0 && renderStepBasic()}
            {step === 1 && renderStepProfile()}
            {step === 2 && renderStepAdmin()}
            {step === 3 && renderStepModule()}
          </>
        )}
      </div>

      <div className="tenant-form-footer tenant-form-footer--sticky">
        {!isEdit && step > 0 && (
          <Button onClick={handlePrev}>上一步</Button>
        )}
        <div style={{ flex: 1 }} />
        {!isEdit && step < 3 && (
          <Button variant="primary" onClick={handleNext}>
            下一步
          </Button>
        )}
        {!isEdit && step === 3 && (
          <Button variant="primary" disabled={submitting} onClick={() => void handleSubmit()}>
            完成并创建
          </Button>
        )}
        {isEdit && (
          <>
            <Button onClick={() => navigate(backPath)}>取消</Button>
            <Button variant="primary" disabled={submitting} onClick={() => void handleSubmit()}>
              保存
            </Button>
          </>
        )}
      </div>

      {tenant && (
        <TenantAdminModal
          open={adminOpen}
          tenant={tenant}
          onClose={() => setAdminOpen(false)}
          onDone={() => {
            setAdminOpen(false)
            void load()
          }}
        />
      )}

      <TenantModuleDrawer
        open={moduleDrawerOpen}
        tenant={tenant}
        onClose={() => {
          setModuleDrawerOpen(false)
          void load()
        }}
        onDone={() => {
          setModuleDrawerOpen(false)
          void load()
        }}
      />

      {creditConfirm && (
        <Modal
          open
          title="确认变更主体标识"
          size="sm"
          onClose={() => setCreditConfirm(null)}
          footer={
            <>
              <Button onClick={() => setCreditConfirm(null)}>取消</Button>
              <Button
                variant="primary"
                onClick={() => {
                  const pending = creditConfirm
                  setCreditConfirm(null)
                  void persist(pending.payload)
                }}
              >
                确认变更
              </Button>
            </>
          }
        >
          <div className="modal-confirm-text" data-ann-target="tenant.modal.credit">
            <span style={{ color: 'var(--color-warning)', display: 'flex' }}>
              <Icon name="warning" size={16} />
            </span>
            <div>
              <div>
                统一社会信用代码将由 <b className="mono">{creditConfirm.before}</b> 变更为{' '}
                <b className="mono">{creditConfirm.after}</b>。
              </div>
              <div className="modal-confirm-tip">
                主体标识变更将影响对外报告与合同核对，请确认已履行内部变更手续。确认后立即生效并记入审计。
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
