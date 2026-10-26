import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, FormField, Icon, Input, Modal, PageHeader, ProfileFieldControl, Select, useToast } from '@/shared/components'
import type { SelectOption } from '@/shared/components'
import {
  activeTenantAdminSeats,
  createTenant,
  fetchTenant,
  MAX_TENANT_ADMIN_SEATS,
  membershipsOfAccount,
  profileFieldsOf,
  profileScopeOf,
  updateTenant,
} from '@/mock/tenant'
import { createTenantAdminAccount, fetchAllAccounts } from '@/mock/account'
import { ensureTenantRootOrg } from '@/mock/org'
import type { PasswordResetMode, PlatformAccount, Tenant, TenantPayload, TenantType } from '@/types'
import { tenantTypeText } from './tenantMeta'
import './TenantPage.css'
import TenantAdminModal from './TenantAdminModal'

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
  memberLimit: '1000',
  adminAccountId: '',
  adminName: '',
  adminMobile: '',
  profile: {},
}

const TYPE_OPTIONS: SelectOption[] = [
  { label: '企业', value: 'enterprise' },
  { label: '政府单位', value: 'government' },
  { label: '机构', value: 'org' },
  { label: '园区', value: 'park' },
]

/** 企业统一社会信用代码（扩展档案 credit_code） */
const USCC_RE = /^[0-9A-Z]{18}$/
const MOBILE_RE = /^1[3-9]\d{9}$/

/** 主管理员取号方式：选择全局 account 中已有登录账号，或开户时新建管理员账号 */
type AdminMode = 'select' | 'create'

/**
 * 主管理员候选：**仅租户自有账号**（无平台角色）。
 * 排除停用 / 注销、超级管理员（R01）、已绑定其他租户的账号（单租户模式：一账号一租户）。
 * 平台账号不得兼任租户主管理员，否则等于绕过「进入租户」的只读与审计。
 */
function toAdminOptions(accounts: PlatformAccount[], currentTenantId?: string): SelectOption[] {
  return accounts
    .filter(
      (item) =>
        item.status === 'enabled' &&
        item.roleIds.length === 0 &&
        activeTenantAdminSeats(item.id) < MAX_TENANT_ADMIN_SEATS &&
        membershipsOfAccount(item.id).every((m) => !m.tenantId || m.tenantId === currentTenantId),
    )
    .map((item) => {
      const seats = activeTenantAdminSeats(item.id)
      return {
        label: `${item.displayName}（${item.loginName}）· ${item.mobile}${seats > 0 ? ` · 已任主管理员 ${seats} 个租户` : ''}`,
        value: item.id,
      }
    })
}

/**
 * 租户管理 · 新建 / 编辑（独立内容页，不再用弹窗）：
 * 上半「租户信息」= 主档统一字段 + 授权与配额；下半「其他」= 按类型渲染的扩展档案字段。
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
  const [adminMode, setAdminMode] = useState<AdminMode>('select')
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [adminOpen, setAdminOpen] = useState(false)
  const [adminForm, setAdminForm] = useState({ loginName: '', displayName: '', mobile: '', email: '' })
  const [pwdMode, setPwdMode] = useState<PasswordResetMode>('random')
  const [customPassword, setCustomPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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

  const load = useCallback(async () => {
    if (!isEdit || !id) return
    setLoading(true)
    try {
      const [detail, accts] = await Promise.all([fetchTenant(id), fetchAllAccounts()])
      setAccounts(accts)
      setTenant(detail)
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

  /** 切换类型：清空类型专属字段，保留公共字段值 */
  const changeType = (next: TenantType) => {
    const nextCodes = new Set(profileFieldsOf(next).map((field) => field.code))
    const kept: Record<string, string> = {}
    Object.entries(form.profile).forEach(([code, value]) => {
      if (nextCodes.has(code)) kept[code] = value
    })
    setForm((prev) => ({ ...prev, type: next, profile: kept }))
    setErrors({})
  }

  const validate = (): boolean => {
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
    if (!Number.isInteger(limit) || limit < 1 || limit > 1000) next.memberLimit = '取值 1 至 1000 的整数'

    // 扩展档案：platform / both 档必填项由平台开户时校验；纯 tenant 档必填项建后由租户端补录
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

    // 主管理员：选择已有全局账号 / 现场新建管理员账号
    if (!isEdit && adminMode === 'create') {
      const loginName = adminForm.loginName.trim()
      if (!loginName) next['admin.loginName'] = '登录名必填'
      else if (/^\d{11}$/.test(loginName)) next['admin.loginName'] = '登录名不得为 11 位纯数字'
      if (!adminForm.displayName.trim()) next['admin.displayName'] = '姓名必填'
      const mobile = adminForm.mobile.trim()
      if (!mobile) next['admin.mobile'] = '手机号必填'
      else if (!MOBILE_RE.test(mobile)) next['admin.mobile'] = '手机号格式不正确'
      if (pwdMode === 'custom') {
        if (customPassword.length < 8 || customPassword.length > 20) next['admin.password'] = '初始密码须为 8-20 位'
        else if (!(/[A-Za-z]/.test(customPassword) && /\d/.test(customPassword))) next['admin.password'] = '须同时包含字母和数字'
        else if (customPassword !== confirmPassword) next['admin.confirm'] = '两次输入的密码不一致'
      }
    } else if (!form.adminAccountId) {
      next.adminAccountId = '请选择主管理员账号'
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  /** 实际保存：新建走 createTenant + 初始化根组织；编辑走 updateTenant */
  const persist = async (payload: TenantPayload, adminLoginName = '', adminPassword = '') => {
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
          toast('租户已创建，已自动创建租户管理员角色并授予全部功能权限')
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

    // 开户新建管理员账号：先入全局 account 表（不持平台角色），再作为本租户主管理员
    let adminAccountId = form.adminAccountId
    let adminLoginName = ''
    let adminPassword = ''
    if (!isEdit && adminMode === 'create') {
      try {
        const createdAccount = await createTenantAdminAccount({
          loginName: adminForm.loginName.trim(),
          displayName: adminForm.displayName.trim(),
          mobile: adminForm.mobile.trim(),
          email: adminForm.email.trim(),
          passwordMode: pwdMode,
          customPassword: pwdMode === 'custom' ? customPassword : undefined,
        })
        adminAccountId = createdAccount.account.id
        adminLoginName = createdAccount.account.loginName
        adminPassword = createdAccount.password
      } catch (error) {
        toast(error instanceof Error ? error.message : '主管理员账号创建失败', 'error')
        return
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

    await persist(payload, adminLoginName, adminPassword)
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
          <div className="modal-confirm-text">
            <span style={{ color: 'var(--color-warning)', display: 'flex' }}>
              <Icon name="warning" size={16} />
            </span>
            <div>
              <div>
                主管理员登录名为：<b className="mono">{created.loginName}</b>，初始密码为：
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

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '组织与权限', '租户管理', isEdit ? form.name : '新建租户']}
        title={
          <span data-ann-target={isEdit ? 'tenant.page.form.edit' : 'tenant.page.form'}>
            {isEdit ? `编辑租户 · ${form.name}` : '新建租户'}
          </span>
        }
        description="租户 = 租户信息（主档统一字段 + 授权与配额）+ 其他（按租户类型显示的扩展字段，平台管理员可编辑）；租户编号由系统生成。"
        actions={
          <>
            <Button onClick={() => navigate(backPath)}>取消</Button>
            <Button variant="primary" disabled={submitting} onClick={() => void handleSubmit()}>
              保存
            </Button>
          </>
        }
      />

      <div className="tenant-stack">
        <div className="card">
          <div className="tenant-section-header">
            <span className="tenant-section-title" data-ann-target="tenant.section.tenant">
              租户信息
            </span>
            <span className="toolbar-tip">全类型统一字段；成员数上限与主管理员同属租户信息</span>
          </div>
          <div className="tenant-section-body">
            <div className="form-grid">
              <FormField label="租户名称" required error={errors.name}>
                <Input
                  value={form.name}
                  placeholder="请输入租户名称"
                  invalid={!!errors.name}
                  data-ann-target="tenant.field.name"
                  onChange={(e) => update({ name: e.target.value })}
                />
              </FormField>

              <FormField
                label="租户类型"
                required
                hint={isEdit ? '创建后不可改' : '决定「其他」段中的字段集，并参与功能点适用类型过滤'}
              >
                <Select
                  value={form.type}
                  options={TYPE_OPTIONS}
                  disabled={isEdit}
                  data-ann-target="tenant.field.type"
                  onChange={(e) => changeType(e.target.value as TenantType)}
                />
              </FormField>

              <FormField label="联系人姓名" hint="非必填，与手机号成对填写">
                <Input
                  value={form.contactName}
                  placeholder="商务 / 业务对接人"
                  data-ann-target="tenant.field.contact"
                  onChange={(e) => update({ contactName: e.target.value })}
                />
              </FormField>

              <FormField label="联系人手机号" error={errors.contactPhone} hint="非必填，与姓名成对填写">
                <Input
                  value={form.contactPhone}
                  placeholder="11 位手机号"
                  invalid={!!errors.contactPhone}
                  onChange={(e) => update({ contactPhone: e.target.value })}
                />
              </FormField>

              <FormField label="有效期开始" hint="非必填；起止都为空表示长期有效">
                <Input
                  type="date"
                  value={form.validFrom}
                  data-ann-target="tenant.field.valid"
                  onChange={(e) => update({ validFrom: e.target.value })}
                />
              </FormField>

              <FormField label="有效期结束" error={errors.validTo} hint="到期只提示，不自动停用">
                <Input
                  type="date"
                  value={form.validTo}
                  invalid={!!errors.validTo}
                  onChange={(e) => update({ validTo: e.target.value })}
                />
              </FormField>

              <FormField
                label="成员数上限"
                required
                error={errors.memberLimit}
                hint={isEdit ? '下调至低于当前用量时，仅禁止新增成员，不强制移出存量成员' : '默认 1000，可改'}
              >
                <Input
                  value={form.memberLimit}
                  placeholder="1 至 1000"
                  invalid={!!errors.memberLimit}
                  data-ann-target="tenant.field.limit"
                  onChange={(e) => update({ memberLimit: e.target.value })}
                />
              </FormField>

              {!isEdit && (
                <FormField
                  label="主管理员来源"
                  required
                  full
                  hint="开户必须为租户指定 1 名主管理员：可选择全局账号表中已有的登录账号，也可现场新建管理员账号"
                >
                  <div className="tenant-admin-modes" data-ann-target="tenant.form.admin.source">
                    <label className="tenant-admin-mode">
                      <input
                        type="radio"
                        name="admin-mode"
                        checked={adminMode === 'select'}
                        onChange={() => setAdminMode('select')}
                      />
                      <span>选择已有登录账号</span>
                    </label>
                    <label className="tenant-admin-mode">
                      <input
                        type="radio"
                        name="admin-mode"
                        checked={adminMode === 'create'}
                        onChange={() => setAdminMode('create')}
                      />
                      <span>新建管理员账号</span>
                    </label>
                  </div>
                </FormField>
              )}

              {isEdit ? (
                <FormField
                  label="主管理员账号"
                  full
                  hint="主管理员不可在编辑时直接修改；如需更换，请使用下方的「更换主管理员」操作"
                >
                  <Input
                    value={form.adminAccountId ? `${form.adminName}（${form.adminMobile}）` : '未指定'}
                    disabled
                  />
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <Button variant="primary" data-ann-target="tenant.form.admin.change" onClick={() => setAdminOpen(true)}>
                      {form.adminAccountId ? '更换主管理员' : '指定主管理员'}
                    </Button>
                    <span className="form-tip">更换后原账号「租户管理员」角色立即收回，可降级为普通成员或禁用</span>
                  </div>
                </FormField>
              ) : adminMode === 'create' ? (
                <>
                  <FormField
                    label="登录名"
                    required
                    error={errors['admin.loginName']}
                    hint="写入全局 account 表，不区分大小写判重，不得为 11 位纯数字"
                  >
                    <Input
                      value={adminForm.loginName}
                      placeholder="请输入登录名"
                      invalid={!!errors['admin.loginName']}
                      onChange={(e) => setAdminForm((prev) => ({ ...prev, loginName: e.target.value }))}
                    />
                  </FormField>

                  <FormField label="姓名" required error={errors['admin.displayName']}>
                    <Input
                      value={adminForm.displayName}
                      placeholder="主管理员姓名"
                      invalid={!!errors['admin.displayName']}
                      onChange={(e) => setAdminForm((prev) => ({ ...prev, displayName: e.target.value }))}
                    />
                  </FormField>

                  <FormField label="手机号" required error={errors['admin.mobile']} hint="登录凭证之一，全局唯一">
                    <Input
                      value={adminForm.mobile}
                      placeholder="11 位手机号"
                      invalid={!!errors['admin.mobile']}
                      onChange={(e) => setAdminForm((prev) => ({ ...prev, mobile: e.target.value }))}
                    />
                  </FormField>

                  <FormField label="邮箱" hint="非必填，用于登录凭证与通知">
                    <Input
                      value={adminForm.email}
                      placeholder="请输入邮箱"
                      onChange={(e) => setAdminForm((prev) => ({ ...prev, email: e.target.value }))}
                    />
                  </FormField>

                  <FormField
                    label="初始密码设置"
                    required
                    full
                    error={errors['admin.password'] || errors['admin.confirm']}
                    hint="默认系统随机生成（8 位大小写字母 + 数字）；也可自定义，须 8-20 位且同时包含字母和数字"
                  >
                    <div className="tenant-admin-modes">
                      <label className="tenant-admin-mode">
                        <input
                          type="radio"
                          name="admin-pwd-mode"
                          checked={pwdMode === 'random'}
                          onChange={() => setPwdMode('random')}
                        />
                        <span>系统随机生成（推荐）</span>
                      </label>
                      <label className="tenant-admin-mode">
                        <input
                          type="radio"
                          name="admin-pwd-mode"
                          checked={pwdMode === 'custom'}
                          onChange={() => setPwdMode('custom')}
                        />
                        <span>自定义密码</span>
                      </label>
                    </div>
                    {pwdMode === 'random' ? (
                      <p className="form-tip" style={{ marginTop: 8 }}>
                        生成规则：8 位大小写字母 + 数字；开户成功后弹窗展示一次，关闭不可再查，首次登录强制改密。
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                        <Input
                          type="password"
                          value={customPassword}
                          placeholder="请输入 8-20 位包含字母和数字的密码"
                          invalid={!!errors['admin.password']}
                          onChange={(e) => setCustomPassword(e.target.value)}
                        />
                        <Input
                          type="password"
                          value={confirmPassword}
                          placeholder="再次输入密码"
                          invalid={!!errors['admin.confirm']}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                      </div>
                    )}
                  </FormField>
                </>
              ) : (
                <FormField
                  label="主管理员账号"
                  required
                  error={errors.adminAccountId}
                  hint={`候选范围为本系统租户自有账号（平台账号不得兼任）；单租户模式下一个账号只能绑定 ${MAX_TENANT_ADMIN_SEATS} 个租户，已绑定其他租户的账号不出现在候选中。开户成功后系统将在该租户内自动创建「租户管理员」角色并分配给该账号，默认拥有租户全部功能权限（租户角色由租户自建自管，与平台角色完全隔离）`}
                >
                  <Select
                    value={form.adminAccountId}
                    placeholder="请选择主管理员账号"
                    options={toAdminOptions(accounts, id)}
                    onChange={(e) => update({ adminAccountId: e.target.value })}
                  />
                </FormField>
              )}
            </div>
          </div>
          <div className="tenant-section-tip">
            租户编号由系统自动生成、创建后不可改；成员数上限含主管理员、停用与已移出成员。模块授权在开户完成后于详情页配置。
            {!isEdit && '开户保存后系统自动初始化本租户组织架构根组织（组织名称 = 租户名称，不可删除、可改名），下级组织由租户管理员自建。'}
          </div>
        </div>

        <div className="card">
          <div className="tenant-section-header">
            <span className="tenant-section-title" data-ann-target="tenant.section.profile">
              其他
            </span>
            <span className="toolbar-tip">按租户类型显示对应扩展字段，平台管理员可直接编辑</span>
          </div>
          <div className="tenant-section-body">
            <div className="form-grid">
              {fields.map((field) => (
                <ProfileFieldControl
                  key={field.code}
                  field={field}
                  value={form.profile[field.code] ?? ''}
                  error={errors[`profile.${field.code}`]}
                  disabled={profileScopeOf(field) === 'tenant'}
                  onChange={(value) => updateProfile(field.code, value)}
                />
              ))}
            </div>
          </div>
          <div className="tenant-section-tip">
            当前类型：{tenantTypeText[form.type]}；标 * 为该类型开户必填项，未填不可保存。
            字段集由租户类型决定，切换类型后重新加载；租户端「租户信息」也可维护这些扩展字段（法定资质类字段除外，租户侧只读）。
          </div>
        </div>
      </div>

      <div className="tenant-form-footer" style={{ marginTop: 'var(--space-md)' }}>
        <Button onClick={() => navigate(backPath)}>取消</Button>
        <Button variant="primary" disabled={submitting} onClick={() => void handleSubmit()}>
          保存
        </Button>
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
