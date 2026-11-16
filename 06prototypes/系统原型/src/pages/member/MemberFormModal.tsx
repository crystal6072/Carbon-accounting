import { useEffect, useMemo, useState } from 'react'
import { Button, FormField, Icon, Input, Modal, MultiSelect, TreeSelect, useToast } from '@/shared/components'
import type { MultiSelectOption } from '@/shared/components'
import type { Role, TenantMemberItem, TreeOption } from '@/types'
import {
  createMember,
  fetchDeptOptions,
  fetchTenantRoleOptions,
  linkMember,
  probeMemberMobile,
  updateMember,
} from '@/mock/member'
import type { MobileProbeResult } from '@/mock/member'
import { generateStrongPassword } from '@/mock/account'
import { ROLE_MAX } from './memberMeta'
import './MemberPage.css'

export type MemberFormMode = 'create' | 'edit'

interface MemberFormModalProps {
  open: boolean
  tenantId: string
  mode: MemberFormMode
  /** 编辑模式的目标成员 */
  member: TenantMemberItem | null
  onClose: () => void
  onDone: () => void
  /** 「该账号已是本租户成员」时跳转查看该成员 */
  onViewMember?: (memberId: string) => void
  /** 预置所属组织（从组织树节点或路由跳转带入；新建态生效） */
  initialDeptId?: string
  /**
   * 编辑态字段范围：
   * - full（默认）：姓名 / 手机号 / 邮箱 + 所属组织 + 角色（成员管理页）；
   * - orgRole：仅所属组织 + 角色（组织架构页，账号级字段收敛）。
   */
  editScope?: 'full' | 'orgRole'
}

/** 手机号探测态：idle 未探测 / checking 探测中，其余对齐 mock 返回值 */
type ProbeState = 'idle' | 'checking' | MobileProbeResult['state']

const IDLE_PROBE: { state: ProbeState; memberId: string; displayName: string; memberDeptName: string } = {
  state: 'idle',
  memberId: '',
  displayName: '',
  memberDeptName: '',
}

interface FormState {
  displayName: string
  /** 登录账号：默认与手机号一致，可由管理员修改 */
  loginName: string
  mobile: string
  email: string
  /** 初始密码：单个输入框；留空 = 系统兜底生成强随机密码 */
  password: string
  roleNames: string[]
  deptId: string
}

const EMPTY_FORM: FormState = {
  displayName: '',
  loginName: '',
  mobile: '',
  email: '',
  password: '',
  roleNames: [],
  deptId: '',
}

/** 创建结果反馈页数据（不直接关闭弹窗，强制管理员抄录 / 复制账号信息） */
interface CreateResult {
  name: string
  account: string
  password: string
  /** 关联已有账号：不新建账号、不产生初始密码 */
  linked: boolean
}

const MOBILE_PATTERN = /^1[3-9]\d{9}$/

const TITLE: Record<MemberFormMode, string> = {
  create: '新建成员',
  edit: '编辑成员',
}

/**
 * 成员管理 · 新建 / 编辑（两态合一弹窗）。
 * - 新建：手机号默认即登录账号（可改）、一个密码输入框 + 智能兜底、角色多选、组织带入；
 *   确认后弹出结果反馈页（明文账号密码 + 一键复制 + 首登强制改密提示），支持连续新增。
 *   手机号失焦探测：未注册不打断；已注册且非本租户成员 → 横幅「关联该账号」，点按后进入关联模式
 *   （姓名 / 手机号置灰只读、隐藏账号与密码、主按钮变「确认关联」，可「取消关联」反悔）；
 *   已是本租户成员 → 红色防呆横幅并禁用提交。
 * - 编辑：姓名 / 手机号 / 邮箱改账号级字段，部门（调岗）与角色改租户域字段，账号不可改（§5.3）。
 *   `editScope="orgRole"` 时（组织架构页）表单收敛为「所属组织 + 角色」，账号级字段只读不展示。
 */
export default function MemberFormModal({
  open,
  tenantId,
  mode,
  member,
  onClose,
  onDone,
  onViewMember,
  initialDeptId,
  editScope = 'full',
}: MemberFormModalProps) {
  const toast = useToast()
  const [roles, setRoles] = useState<Role[]>([])
  const [deptOptions, setDeptOptions] = useState<TreeOption[]>([])
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<CreateResult | null>(null)
  /** 手机号探测结果：决定「新建账号」还是「关联已有账号」 */
  const [probe, setProbe] = useState(IDLE_PROBE)
  /** 根组织 id（用于「挂在根组织下」提示） */
  const [rootOrgId, setRootOrgId] = useState('')
  /** 账号是否被管理员手动改过：改过之后不再跟随手机号联动 */
  const [accountTouched, setAccountTouched] = useState(false)
  /** 密码明文 / 密文切换 */
  const [showPassword, setShowPassword] = useState(false)
  /** 关联模式确认开关：手机号命中平台已有账号（registered）后，需管理员点「关联该账号」显式进入 */
  const [linkConfirmed, setLinkConfirmed] = useState(false)
  const [copied, setCopied] = useState(false)
  /** 编辑态手机号修改开关：默认只读脱敏，点「修改」后变为可编辑输入框（§手机号专项） */
  const [editingPhone, setEditingPhone] = useState(false)
  /** 手机号变更二次确认弹窗数据（改登录手机号需二次确认） */
  const [phoneConfirm, setPhoneConfirm] = useState<{ name: string; newMobile: string } | null>(null)

  /** 关联模式：手机号命中平台已有账号且非本租户成员，且管理员已点「关联该账号」确认，表单收敛为「部门 + 角色」 */
  const isLinkMode = mode === 'create' && probe.state === 'registered' && linkConfirmed

  /** 组织架构页的编辑：只开放「所属组织 + 角色」，账号级字段（姓名 / 手机号 / 邮箱）不在本页维护 */
  const orgRoleOnly = mode === 'edit' && editScope === 'orgRole'

  const roleOptions: MultiSelectOption[] = useMemo(
    () => roles.map((role) => ({ label: role.name, value: role.name })),
    [roles],
  )

  /** 密码强度实时校验：8-20 位 + 含字母 + 含数字 */
  const passwordStrength = useMemo(() => {
    const value = form.password
    return {
      length: value.length >= 8 && value.length <= 20,
      letter: /[A-Za-z]/.test(value),
      digit: /\d/.test(value),
    }
  }, [form.password])
  const passwordValid = passwordStrength.length && passwordStrength.letter && passwordStrength.digit

  const resetCreateState = (deptId: string) => {
    setForm({ ...EMPTY_FORM, deptId })
    setErrors({})
    setProbe(IDLE_PROBE)
    setLinkConfirmed(false)
    setAccountTouched(false)
    setShowPassword(false)
    setCopied(false)
    setResult(null)
  }

  useEffect(() => {
    if (!open) return
    setErrors({})
    setResult(null)
    setCopied(false)
    setShowPassword(false)
    setAccountTouched(false)
    setLinkConfirmed(false)
    setProbe(IDLE_PROBE)
    setEditingPhone(false)
    setPhoneConfirm(null)
    void (async () => {
      const [roleList, deptTree] = await Promise.all([fetchTenantRoleOptions(tenantId), fetchDeptOptions(tenantId)])
      setRoles(roleList)
      setDeptOptions(deptTree)
      // 根组织为部门树唯一顶层节点（每个租户仅一个系统根组织）
      setRootOrgId(deptTree[0]?.value ?? '')
      if (mode === 'edit' && member) {
        // 所属组织按 deptId 回显（组织改名后归属不随名称失配）
        setForm({
          displayName: member.name,
          loginName: member.loginName,
          mobile: member.mobile,
          email: member.email,
          password: '',
          roleNames: [...member.roleNames],
          deptId: member.deptId ?? '',
        })
      } else {
        setForm({ ...EMPTY_FORM, deptId: initialDeptId ?? '' })
      }
    })()
  }, [open, mode, member, tenantId, initialDeptId])

  const update = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }))

  /** 手机号 = 账号：输入手机号时自动带入账号，直到管理员手动改过账号；改动即退出关联模式并清空探测结果 */
  const handleMobileChange = (value: string) => {
    setProbe(IDLE_PROBE)
    setLinkConfirmed(false)
    setForm((prev) => ({
      ...prev,
      mobile: value,
      loginName: accountTouched ? prev.loginName : value,
    }))
  }

  /**
   * 手机号探测（新建态，失焦触发）：未注册不打断；已注册且非本租户成员 → 给「关联该账号」横幅；
   * 已是本租户成员 → 红色防呆横幅并禁用提交。
   */
  const checkMobile = async () => {
    // 关联模式无独立手机号；编辑态未进入「修改」时手机号为脱敏只读，不查重
    if (isLinkMode) return
    if (mode === 'edit' && !editingPhone) return
    const value = form.mobile.trim()
    if (!MOBILE_PATTERN.test(value)) {
      setProbe(IDLE_PROBE)
      return
    }
    // 编辑态：新号码与脱敏原值不可能相等，此处仅为防御；其余情况均按新号码查重
    if (mode === 'edit' && member && value === member.mobile) {
      setProbe(IDLE_PROBE)
      return
    }
    setLinkConfirmed(false)
    setProbe({ state: 'checking', memberId: '', displayName: '', memberDeptName: '' })
    const probeResult = await probeMemberMobile(tenantId, value)
    setProbe({
      state: probeResult.state,
      memberId: probeResult.memberId,
      displayName: probeResult.displayName,
      memberDeptName: probeResult.memberDeptName,
    })
  }

  const validate = (linkMode = false): boolean => {
    const next: Record<string, string> = {}
    // 关联模式不收集姓名 / 账号 / 密码：账号级字段一律取自既有账号；组织架构页编辑不动账号级字段
    if (!linkMode && !orgRoleOnly) {
      if (!form.displayName.trim()) next.displayName = '姓名必填'
      else if (form.displayName.trim().length > 50) next.displayName = '姓名最长 50 字符'
      if (mode === 'create') {
        const loginName = form.loginName.trim()
        if (!loginName) next.loginName = '账号必填'
        else if (/[\u4e00-\u9fa5]/.test(loginName)) next.loginName = '账号仅支持字母、数字与下划线'
        else if (/^\d{11}$/.test(loginName) && loginName !== form.mobile.trim()) {
          next.loginName = '账号不能为 11 位纯数字'
        }
        // 留空由系统兜底生成；填写则必须满足 8-20 位且含字母和数字
        if (form.password && !passwordValid) next.password = '初始密码须为 8-20 位，且同时包含字母和数字'
      }
    }
    // 编辑态未进入「修改」时手机号为脱敏只读，跳过校验；真实号码仅在用户填写新值时校验（§手机号专项）
    if (!orgRoleOnly && !(mode === 'edit' && !editingPhone)) {
      if (!form.mobile.trim()) next.mobile = '手机号必填'
      else if (!MOBILE_PATTERN.test(form.mobile.trim())) next.mobile = '手机号格式不正确'
    }
    if (form.roleNames.length < 1) next.roleNames = '至少指派 1 个角色'
    else if (form.roleNames.length > ROLE_MAX) next.roleNames = `角色最多 ${ROLE_MAX} 个`
    if (!form.deptId) next.deptId = '请选择所属组织'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  /** 执行编辑态保存（含账号级字段更新）；手机号变更在 handleSubmit 中经二次确认后调用 */
  const doUpdate = async (mobile: string) => {
    if (!member) return
    setSubmitting(true)
    try {
      // 组织架构页只改组织与角色：账号级字段原样回传，避免误覆盖
      await updateMember(
        tenantId,
        member.id,
        orgRoleOnly
          ? {
              displayName: member.name,
              mobile: member.mobile,
              email: member.email,
              roleNames: form.roleNames,
              deptId: form.deptId,
            }
          : {
              displayName: form.displayName,
              mobile,
              email: form.email,
              roleNames: form.roleNames,
              deptId: form.deptId,
            },
      )
      toast('保存成功')
      onDone()
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      if (mode === 'edit' && member) {
        if (!validate()) return
        // 手机号进入「修改」且填写了新号码：保存前二次确认（§手机号专项）
        const newMobile = form.mobile.trim()
        const phoneChanged = editingPhone && MOBILE_PATTERN.test(newMobile) && newMobile !== member.mobile
        if (phoneChanged) {
          setPhoneConfirm({ name: form.displayName.trim(), newMobile })
          setSubmitting(false)
          return
        }
        await doUpdate(form.mobile)
        return
      }

      // 提交前再探测一次：手机号改动后未失焦、或直接点提交时也能落到正确分支
      const probeResult = await probeMemberMobile(tenantId, form.mobile.trim())
      setProbe({
        state: probeResult.state,
        memberId: probeResult.memberId,
        displayName: probeResult.displayName,
        memberDeptName: probeResult.memberDeptName,
      })
      if (probeResult.state === 'member') {
        toast('该用户已是本租户成员，请勿重复添加', 'error')
        return
      }
      // 已注册但管理员未点「关联该账号」确认：不自动关联，引导其显式确认
      if (probeResult.state === 'registered' && !linkConfirmed) {
        toast('该手机号已注册平台账号，请点击「关联该账号」确认，或更换手机号', 'error')
        return
      }
      const linkMode = probeResult.state === 'registered'
      if (!validate(linkMode)) return

      if (linkMode) {
        await linkMember(tenantId, {
          mobile: form.mobile,
          roleNames: form.roleNames,
          deptId: form.deptId,
        })
        // 关联已有账号：沿用原账号密码，结果页不给初始密码
        setResult({ name: probeResult.displayName, account: form.mobile.trim(), password: '', linked: true })
        toast('已关联已有账号，成员立即生效')
        return
      }

      const custom = form.password.trim()
      const created = await createMember(tenantId, {
        displayName: form.displayName,
        loginName: form.loginName,
        mobile: form.mobile,
        email: form.email,
        // 智能兜底：留空则 mode = random，由系统底层生成强随机密码
        passwordMode: custom ? 'custom' : 'random',
        customPassword: custom || undefined,
        roleNames: form.roleNames,
        deptId: form.deptId,
      })
      setResult({
        name: form.displayName.trim(),
        account: form.loginName.trim(),
        password: created.password,
        linked: false,
      })
      toast('成员已创建')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  /** 一键复制账号信息（姓名 / 账号 / 初始密码） */
  const copyCredentials = async () => {
    if (!result) return
    const text = result.linked
      ? `姓名：${result.name}\n账号（手机号）：${result.account}`
      : `姓名：${result.name}\n账号（手机号）：${result.account}\n初始密码：${result.password}`
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopied(true)
      toast('账号信息已复制')
    } catch {
      toast('复制失败，请手动选中并复制', 'error')
    }
  }

  const submitLabel = mode === 'edit' ? '保存' : isLinkMode ? '确认关联' : '确认新建'
  /** 已是本租户成员：红色防呆横幅 + 禁用提交，防重复添加 */
  const blockedAsMember = mode === 'create' && probe.state === 'member'

  return (
    <>
    <Modal
      open={open}
      title={
        result
          ? '新建成员 · 创建成功'
          : `${TITLE[mode]}${mode === 'edit' && member ? ` · ${member.name}` : isLinkMode ? ' · 关联已有账号' : ''}`
      }
      size="lg"
      onClose={onClose}
      // 结果反馈页禁止点 × / 遮罩 / Esc 直接关闭，必须由管理员主动确认
      closable={!result}
      footer={
        result ? (
          <>
            <Button onClick={() => resetCreateState(initialDeptId ?? '')}>继续新增下一位成员</Button>
            <Button variant="primary" onClick={onDone}>完成并关闭</Button>
          </>
        ) : (
          <>
            <Button onClick={onClose}>取消</Button>
            <Button variant="primary" disabled={submitting || blockedAsMember} onClick={() => void handleSubmit()}>
              {submitLabel}
            </Button>
          </>
        )
      }
    >
      {result ? (
        <div className="member-result" data-ann-target="member.create.onetime">
          <div className="member-result-head">
            <span className="member-result-icon"><Icon name="check" size={18} /></span>
            <span>成员已创建，请将以下账号信息线下告知员工</span>
          </div>

          <div className="member-result-card">
            <div className="member-result-row">
              <span className="member-result-label">姓名</span>
              <strong className="member-result-value">{result.name}</strong>
            </div>
            <div className="member-result-row">
              <span className="member-result-label">账号（手机号）</span>
              <strong className="member-result-value member-result-code">{result.account}</strong>
            </div>
            <div className="member-result-row">
              <span className="member-result-label">初始密码</span>
              {result.linked ? (
                <span className="member-result-value form-tip">关联已有账号，沿用其原密码</span>
              ) : (
                <strong className="member-result-value member-result-code member-result-password">{result.password}</strong>
              )}
              <Button size="small" onClick={() => void copyCredentials()}>
                {copied ? <Icon name="check" size={14} /> : '📋'} 一键复制
              </Button>
            </div>
          </div>

          <p className="member-result-tip">
            <Icon name="warning" size={14} />
            请务必将账号和密码告知员工。员工首次登录系统后，将被强制要求修改初始密码。
          </p>
          <p className="form-tip">本页关闭后初始密码不可再次查看，遗失只能由管理员再次重置密码。</p>
        </div>
      ) : (
        <>
          {mode === 'edit' &&
            (orgRoleOnly ? (
              <p className="form-tip" style={{ marginTop: 0 }}>
                本页仅可调整所属组织与角色；姓名 / 手机号 / 账号 / 邮箱为账号级字段，只读展示，如需修改请前往「成员管理」维护。部门调整不影响历史业务数据上的部门快照。
              </p>
            ) : (
              <p className="form-tip" style={{ marginTop: 0 }}>
                姓名 / 手机号 / 邮箱写在账号表、全局生效（平台后台「平台账号」同步可见）；手机号修改后请通知成员使用新号码登录；部门调整不影响历史业务数据上的部门快照。
              </p>
            ))}

          <div className="form-grid">
            {orgRoleOnly && (
              <FormField label="姓名" hint="账号级字段，只读；如需修改请前往成员管理">
                <Input value={member?.name ?? ''} readOnly disabled data-ann-target="member.form.name" />
              </FormField>
            )}

            {!orgRoleOnly &&
              (isLinkMode ? (
                <FormField label="姓名" hint="取自已有账号，只读；本租户不改动账号级字段">
                  <Input value={probe.displayName} readOnly disabled data-ann-target="member.form.name" />
                </FormField>
              ) : (
                <FormField label="姓名" required error={errors.displayName}>
                  <Input
                    value={form.displayName}
                    placeholder="请输入姓名"
                    invalid={!!errors.displayName}
                    data-ann-target="member.form.name"
                    onChange={(e) => update({ displayName: e.target.value })}
                  />
                </FormField>
              ))}

            {!orgRoleOnly && (
              <FormField
                label="手机号"
                required={mode === 'create' || editingPhone}
                error={errors.mobile}
                hint={
                  mode === 'edit'
                    ? '修改后请通知成员使用新号码登录。'
                    : isLinkMode
                      ? '已锁定为待关联账号的手机号，取消关联后可修改'
                      : undefined
                }
              >
                {mode === 'edit' && !editingPhone ? (
                  <div className="member-phone-readonly">
                    <span className="mono member-phone-mask">{form.mobile}</span>
                    <button
                      type="button"
                      className="link member-phone-edit"
                      onClick={() => {
                        setForm((p) => ({ ...p, mobile: '' }))
                        setEditingPhone(true)
                      }}
                    >
                      修改
                    </button>
                  </div>
                ) : (
                  <div className="member-phone-edit-wrap">
                    <Input
                      value={form.mobile}
                      placeholder={mode === 'edit' ? '请输入新的 11 位手机号' : '请输入手机号'}
                      invalid={!!errors.mobile}
                      disabled={isLinkMode}
                      autoFocus={mode === 'edit' && editingPhone}
                      data-ann-target="member.form.mobile"
                      onChange={(e) => update({ mobile: e.target.value })}
                      onBlur={() => void checkMobile()}
                    />
                    {mode === 'edit' && editingPhone && (
                      <button
                        type="button"
                        className="member-phone-cancel"
                        onClick={() => {
                          setForm((p) => ({ ...p, mobile: member ? member.mobile : '' }))
                          setEditingPhone(false)
                        }}
                      >
                        取消
                      </button>
                    )}
                  </div>
                )}
              </FormField>
            )}

            {orgRoleOnly && (
              <>
                <FormField label="手机号" hint="账号级字段，只读；如需修改请前往成员管理">
                  <Input value={form.mobile} readOnly disabled data-ann-target="member.form.mobile" />
                </FormField>
                <FormField label="账号" hint="创建后不可修改">
                  <Input value={member?.loginName ?? ''} readOnly disabled data-ann-target="member.form.loginName" />
                </FormField>
              </>
            )}

            {/* 未注册（free）不打断：保持正常新建表单，不渲染任何提示 */}
            {mode === 'create' && probe.state !== 'idle' && probe.state !== 'free' && (
              <div
                className={[
                  'member-probe',
                  probe.state === 'member' ? 'member-probe-danger' : '',
                  isLinkMode ? 'member-probe-linked' : '',
                ].filter(Boolean).join(' ')}
                style={{ gridColumn: '1 / -1' }}
                data-ann-target="member.form.probe"
              >
                {probe.state === 'checking' && <span className="member-probe-text">正在校验手机号…</span>}
                {probe.state === 'registered' && !linkConfirmed && (
                  <>
                    <span className="member-probe-text">
                      💡 该手机号已在平台注册，用户名为【{probe.displayName}】。
                    </span>
                    <button type="button" className="member-probe-action" onClick={() => setLinkConfirmed(true)}>
                      关联该账号
                    </button>
                  </>
                )}
                {isLinkMode && (
                  <>
                    <span className="member-probe-text">
                      将关联已有账号【{probe.displayName}】：不新建账号、不重置密码，沿用其原账号信息；本租户仅为其分配部门与角色。
                    </span>
                    <button type="button" className="member-probe-cancel" onClick={() => setLinkConfirmed(false)}>
                      ✕ 取消关联，重新输入手机号
                    </button>
                  </>
                )}
                {blockedAsMember && (
                  <span className="member-probe-text">
                    该用户已是本租户成员{probe.memberDeptName ? `（所在部门：${probe.memberDeptName}）` : ''}，请勿重复添加。
                    <button
                      type="button"
                      className="link"
                      onClick={() => {
                        onClose()
                        onViewMember?.(probe.memberId)
                      }}
                    >
                      查看成员
                    </button>
                  </span>
                )}
              </div>
            )}

            {mode === 'create' && !isLinkMode && (
              <FormField
                label="账号"
                required
                error={errors.loginName}
              >
                <Input
                  value={form.loginName}
                  placeholder="默认与手机号一致"
                  invalid={!!errors.loginName}
                  data-ann-target="member.form.loginName"
                  onChange={(e) => {
                    setAccountTouched(true)
                    update({ loginName: e.target.value })
                  }}
                />
                <p className="form-tip member-account-hint">默认将手机号作为登录账号，可修改；创建后不可更改</p>
              </FormField>
            )}

            {orgRoleOnly && (
              <FormField label="邮箱" hint="账号级字段，只读；如需修改请前往成员管理">
                <Input value={form.email || '—'} readOnly disabled data-ann-target="member.form.email" />
              </FormField>
            )}

            {mode === 'edit' && !orgRoleOnly && (
              <FormField label="邮箱" hint="选填，用于通知">
                <Input value={form.email} placeholder="请输入邮箱" data-ann-target="member.form.email" onChange={(e) => update({ email: e.target.value })} />
              </FormField>
            )}

            {mode === 'create' && !isLinkMode && (
              <FormField label="初始密码" error={errors.password} full>
                <div className="member-password-field">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    placeholder="留空由系统自动生成强随机密码"
                    invalid={!!errors.password}
                    autoComplete="new-password"
                    data-ann-target="member.form.password"
                    onChange={(e) => update({ password: e.target.value })}
                  />
                  <button
                    type="button"
                    className="member-password-eye"
                    aria-label={showPassword ? '隐藏密码' : '显示密码'}
                    title={showPassword ? '隐藏密码' : '显示密码'}
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    <Icon name={showPassword ? 'eyeOff' : 'eye'} size={16} />
                  </button>
                  <button
                    type="button"
                    className="member-password-random"
                    onClick={() => {
                      update({ password: generateStrongPassword() })
                      setShowPassword(true)
                      setErrors((prev) => ({ ...prev, password: '' }))
                    }}
                  >
                    随机生成
                  </button>
                </div>
                {form.password ? (
                  <div className="member-strength">
                    <span className={passwordStrength.length ? 'ok' : ''}>8-20 位</span>
                    <span className={passwordStrength.letter ? 'ok' : ''}>包含字母</span>
                    <span className={passwordStrength.digit ? 'ok' : ''}>包含数字</span>
                    <span className={passwordValid ? 'member-strength-valid' : 'member-strength-invalid'}>
                      {passwordValid ? '校验通过' : '请满足以上条件'}
                    </span>
                  </div>
                ) : (
                  <p className="form-tip member-account-hint">
                    可留空：点击「确认新建」时系统自动生成一串强随机密码；也可手动输入（8-20 位，包含字母和数字）。
                  </p>
                )}
                <p className="form-tip member-account-hint">
                  <Icon name="lock" size={12} /> 无论自定义还是随机生成，员工首次登录均须强制修改初始密码。
                </p>
              </FormField>
            )}

            <FormField
              label="所属组织"
              required
              error={errors.deptId}
            >
              <span data-ann-target="member.form.dept">
                <TreeSelect
                  value={form.deptId}
                  options={deptOptions}
                  placeholder="请选择所属组织"
                  onChange={(value) => update({ deptId: value })}
                />
              </span>
              {initialDeptId && mode === 'create' && (
                <p className="form-tip dept-root-tip">已带入当前所选组织节点，可修改</p>
              )}
              {form.deptId === rootOrgId && (
                <p className="form-tip dept-root-tip">将挂在根组织下，不影响使用</p>
              )}
            </FormField>

            <FormField label="角色" required error={errors.roleNames} full hint="支持一人多角色">
              <span data-ann-target="member.form.role">
                <MultiSelect
                  value={form.roleNames}
                  options={roleOptions}
                  placeholder="请选择角色（可多选）"
                  onChange={(roleNames) => update({ roleNames })}
                />
              </span>
            </FormField>
          </div>
        </>
      )}
    </Modal>
      {phoneConfirm && (
        <Modal
          open={!!phoneConfirm}
          title="确认修改手机号"
          size="sm"
          onClose={() => setPhoneConfirm(null)}
          footer={
            <>
              <Button onClick={() => setPhoneConfirm(null)}>取消</Button>
              <Button variant="primary" onClick={() => void doUpdate(phoneConfirm.newMobile)}>
                确认修改
              </Button>
            </>
          }
        >
          <p className="confirm-text">
            确认将成员【{phoneConfirm.name}】的登录手机号修改为【{phoneConfirm.newMobile}】吗？修改后请通知成员使用新号码登录。
          </p>
        </Modal>
      )}
    </>
  )
}
