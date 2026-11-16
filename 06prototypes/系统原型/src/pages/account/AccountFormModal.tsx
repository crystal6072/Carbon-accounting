import { useEffect, useMemo, useState } from 'react'
import { Button, FormField, Icon, Input, Modal, MultiSelect, useToast } from '@/shared/components'
import type { MultiSelectOption } from '@/shared/components'
import {
  createAccount,
  fetchPlatformRoles,
  generateStrongPassword,
  isBuiltinRootAccount,
  probeAccountMobile,
  updateAccount,
  updateAccountBasic,
} from '@/mock/account'
import type { AccountPayload, PlatformAccount, PlatformRole } from '@/types'
import { membershipsOfAccount } from '@/mock/tenant'
import AccountAvatar from './AccountAvatar'
import { maskMobile } from './accountMeta'
import './AccountPage.css'

export type AccountFormMode = 'create' | 'edit'

interface AccountFormModalProps {
  open: boolean
  mode: AccountFormMode
  /** 编辑模式的目标账号；新建为 null */
  account: PlatformAccount | null
  onClose: () => void
  onDone: () => void
}

interface FormState {
  avatarUrl: string
  displayName: string
  mobile: string
  /** 登录账号：默认与手机号一致，可修改；创建后不可改 */
  loginName: string
  email: string
  roleIds: string[]
  /** 初始密码：单个输入框，留空 = 系统兜底生成强随机密码 */
  password: string
}

const EMPTY_FORM: FormState = {
  avatarUrl: '',
  displayName: '',
  mobile: '',
  loginName: '',
  email: '',
  roleIds: [],
  password: '',
}

const MOBILE_PATTERN = /^1[3-9]\d{9}$/

/** 手机号占用探测态 */
const IDLE_PROBE = { state: 'idle' as const, displayName: '' }

interface CreateResult {
  name: string
  account: string
  password: string
}

/**
 * 账号管理 · 新建 / 编辑（弹窗）。
 * - 字段顺序：头像 → 姓名 → 手机号 → 账号 → 邮箱 → 平台角色 → 初始密码；
 * - 账号默认取手机号，管理员改过之后不再跟随手机号联动；
 * - 初始密码交互与「成员管理」一致：单输入框 + 明文切换 + 随机生成 + 强度实时校验，
 *   留空由系统生成，建号后弹窗内一次性展示并可一键复制；
 * - 手机号交互与「成员管理」一致：新建失焦探测占用；编辑默认脱敏只读，
 *   点「修改」后才可录入新号码，保存前二次确认。
 */
export default function AccountFormModal({ open, mode, account, onClose, onDone }: AccountFormModalProps) {
  const toast = useToast()

  const [roles, setRoles] = useState<PlatformRole[]>([])
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<CreateResult | null>(null)
  const [copied, setCopied] = useState(false)
  /** 工程内账号是否被手动改过：改过之后不再跟随手机号联动 */
  const [accountTouched, setAccountTouched] = useState(false)
  /** 密码明文 / 密文切换 */
  const [showPassword, setShowPassword] = useState(false)
  /** 手机号占用探测结果 */
  const [probe, setProbe] = useState<{ state: 'idle' | 'checking' | 'free' | 'occupied'; displayName: string }>(IDLE_PROBE)
  /** 编辑态手机号修改开关：默认只读脱敏，点「修改」后才可编辑 */
  const [editingPhone, setEditingPhone] = useState(false)
  /** 手机号变更二次确认 */
  const [phoneConfirm, setPhoneConfirm] = useState<{ name: string; newMobile: string } | null>(null)

  const isEdit = mode === 'edit'
  const target = isEdit ? account : null
  /**
   * 租户成员账号：不持平台角色，编辑时字段与平台账号完全一致（头像 / 姓名 / 手机号 / 账号 / 邮箱），
   * 仅「平台角色」区改为只读——角色不在此分配，租户角色归对应租户的成员管理。
   */
  const isTenantMember = isEdit && (account?.roleIds.length ?? 0) === 0
  /** 租户成员在各租户内的身份（租户名 / 部门 / 租户角色），角色区只读展示 */
  const tenantIdentities = useMemo(
    () => (isTenantMember && account ? membershipsOfAccount(account.id) : []),
    [isTenantMember, account],
  )

  const roleOptions: MultiSelectOption[] = useMemo(
    () => roles.map((role) => ({ label: role.name, value: role.id })),
    [roles],
  )

  /** 密码强度实时校验：8-20 位 + 含字母 + 含数字（与成员管理同口径） */
  const passwordStrength = useMemo(() => {
    const value = form.password
    return {
      length: value.length >= 8 && value.length <= 20,
      letter: /[A-Za-z]/.test(value),
      digit: /\d/.test(value),
    }
  }, [form.password])
  const passwordValid = passwordStrength.length && passwordStrength.letter && passwordStrength.digit

  const resetPhoneState = () => {
    setEditingPhone(false)
    setPhoneConfirm(null)
    setProbe(IDLE_PROBE)
  }

  useEffect(() => {
    if (!open) return
    setErrors({})
    setResult(null)
    setCopied(false)
    setShowPassword(false)
    setAccountTouched(mode === 'edit')
    resetPhoneState()
    setForm(
      mode === 'edit' && account
        ? {
            avatarUrl: account.avatarUrl ?? '',
            displayName: account.displayName,
            mobile: account.mobile,
            loginName: account.loginName,
            email: account.email ?? '',
            roleIds: [...account.roleIds],
            password: '',
          }
        : EMPTY_FORM,
    )
    void fetchPlatformRoles().then(setRoles)
  }, [open, mode, account])

  const update = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }))

  /** 手机号 = 账号：输入手机号时自动带入账号，直到管理员手动改过账号 */
  const handleMobileChange = (value: string) => {
    setProbe(IDLE_PROBE)
    setForm((prev) => ({
      ...prev,
      mobile: value,
      loginName: accountTouched ? prev.loginName : value,
    }))
  }

  /** 手机号占用校验（失焦触发）：编辑态未进入「修改」时不查重 */
  const checkMobile = async () => {
    if (isEdit && !editingPhone) return
    const value = form.mobile.trim()
    if (!MOBILE_PATTERN.test(value)) {
      setProbe(IDLE_PROBE)
      return
    }
    if (isEdit && target && value === target.mobile) {
      setProbe(IDLE_PROBE)
      return
    }
    setProbe({ state: 'checking', displayName: '' })
    const probeResult = await probeAccountMobile(value, isEdit ? target?.id : undefined)
    setProbe(probeResult.registered ? { state: 'occupied', displayName: probeResult.displayName } : { state: 'free', displayName: '' })
  }

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    if (!form.displayName.trim()) next.displayName = '姓名必填'
    else if (form.displayName.trim().length > 50) next.displayName = '姓名最长 50 字符'

    // 编辑态未进入「修改」时手机号为脱敏只读，跳过校验
    if (!(isEdit && !editingPhone)) {
      const mobile = form.mobile.trim()
      if (!mobile) next.mobile = '手机号必填'
      else if (!MOBILE_PATTERN.test(mobile)) next.mobile = '手机号格式不正确'
      else if (probe.state === 'occupied') next.mobile = '该手机号已被其他账号使用'
    }

    if (!isEdit) {
      const loginName = form.loginName.trim()
      if (!loginName) next.loginName = '账号必填'
      else if (/[\u4e00-\u9fa5]/.test(loginName)) next.loginName = '账号仅支持字母、数字与下划线'
      else if (/^\d{11}$/.test(loginName) && loginName !== form.mobile.trim()) next.loginName = '账号不能为 11 位纯数字'
      // 留空由系统兜底生成；填写则必须满足 8-20 位且含字母和数字
      if (form.password && !passwordValid) next.password = '初始密码须为 8-20 位，且同时包含字母和数字'
    }

    // 租户成员本就不持平台角色，不参与角色必填校验
    if (!isTenantMember) {
      if (form.roleIds.length < 1) next.roleIds = '至少分配 1 个平台角色'
      else if (form.roleIds.length > 5) next.roleIds = '平台角色最多 5 个'
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const buildPayload = (mobile: string): AccountPayload => ({
    displayName: form.displayName.trim(),
    mobile,
    email: form.email.trim(),
    avatarUrl: form.avatarUrl,
    roleIds: form.roleIds,
  })

  /** 执行编辑保存（手机号变更经二次确认后调用） */
  const doUpdate = async (mobile: string) => {
    if (!target) return
    setSubmitting(true)
    try {
      if (isTenantMember) {
        // 租户成员：只写账号级字段，不触碰平台角色
        await updateAccountBasic(target.id, {
          displayName: form.displayName.trim(),
          mobile,
          email: form.email.trim(),
          avatarUrl: form.avatarUrl,
        })
      } else {
        await updateAccount(target.id, buildPayload(mobile))
      }
      toast('保存成功')
      setPhoneConfirm(null)
      onDone()
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async () => {
    if (isEdit && target) {
      if (!validate()) return
      const newMobile = form.mobile.trim()
      const phoneChanged = editingPhone && MOBILE_PATTERN.test(newMobile) && newMobile !== target.mobile
      if (phoneChanged) {
        setPhoneConfirm({ name: form.displayName.trim(), newMobile })
        return
      }
      await doUpdate(editingPhone ? newMobile : target.mobile)
      return
    }

    // 新建：提交前再探测一次，避免改动手机号后未失焦直接提交
    const mobile = form.mobile.trim()
    if (MOBILE_PATTERN.test(mobile)) {
      const probeResult = await probeAccountMobile(mobile)
      setProbe(probeResult.registered ? { state: 'occupied', displayName: probeResult.displayName } : { state: 'free', displayName: '' })
      if (probeResult.registered) {
        toast('该手机号已被其他账号使用，请更换手机号', 'error')
        return
      }
    }
    if (!validate()) return

    setSubmitting(true)
    try {
      const custom = form.password.trim()
      const created = await createAccount({
        ...buildPayload(mobile),
        loginName: form.loginName.trim(),
        passwordMode: custom ? 'custom' : 'random',
        customPassword: custom || undefined,
      })
      setResult({
        name: created.account.displayName,
        account: created.account.loginName,
        password: created.password,
      })
      toast('账号已创建')
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  /** 一键复制账号信息（姓名 / 账号 / 初始密码） */
  const copyCredentials = async () => {
    if (!result) return
    const text = `姓名：${result.name}\n账号：${result.account}\n初始密码：${result.password}`
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

  const resetCreateState = () => {
    setForm(EMPTY_FORM)
    setErrors({})
    setResult(null)
    setCopied(false)
    setShowPassword(false)
    setAccountTouched(false)
    resetPhoneState()
  }

  const occupied = probe.state === 'occupied'
  const blockedAsRoot = !!target && isBuiltinRootAccount(target)
  const maskedPhone = target ? maskMobile(target.mobile) : ''

  return (
    <>
      <Modal
        open={open}
        title={
          result
            ? '新建平台账号 · 创建成功'
            : isEdit
              ? `${isTenantMember ? '编辑租户账号' : '编辑平台账号'}${target ? ` · ${target.displayName}` : ''}`
              : '新建平台账号'
        }
        size="lg"
        onClose={onClose}
        // 结果反馈页禁止 × / 遮罩 / Esc 直接关闭，必须由管理员主动确认
        closable={!result}
        footer={
          result ? (
            <>
              <Button onClick={resetCreateState}>继续新增下一位账号</Button>
              <Button variant="primary" onClick={onDone}>
                完成并关闭
              </Button>
            </>
          ) : (
            <>
              <Button onClick={onClose}>取消</Button>
              <Button
                variant="primary"
                disabled={submitting || occupied || blockedAsRoot}
                onClick={() => void handleSubmit()}
              >
                {isEdit ? '保存' : '确认新建'}
              </Button>
            </>
          )
        }
      >
        {result ? (
          <div className="account-result" data-ann-target="account.create.onetime">
            <div className="account-result-head">
              <span className="account-result-icon">
                <Icon name="check" size={18} />
              </span>
              <span>账号已创建，请将以下账号信息线下告知使用人</span>
            </div>

            <div className="account-result-card">
              <div className="account-result-row">
                <span className="account-result-label">姓名</span>
                <strong className="account-result-value">{result.name}</strong>
              </div>
              <div className="account-result-row">
                <span className="account-result-label">账号</span>
                <strong className="account-result-value account-result-code">{result.account}</strong>
              </div>
              <div className="account-result-row">
                <span className="account-result-label">初始密码</span>
                <strong className="account-result-value account-result-code account-result-password">{result.password}</strong>
                <Button size="small" onClick={() => void copyCredentials()}>
                  {copied ? '已复制' : '一键复制'}
                </Button>
              </div>
            </div>

            <p className="account-result-tip">
              <Icon name="warning" size={14} />
              请务必将账号和密码告知使用人。首次登录系统后，将被强制要求修改初始密码。
            </p>
            <p className="form-tip">本页关闭后初始密码不可再次查看，遗失只能通过「重置密码」重新生成。</p>
          </div>
        ) : (
          <>
            {blockedAsRoot && (
              <p className="form-tip" style={{ marginTop: 0 }}>
                系统内置根账号只读，仅支持查看与本人重置密码。
              </p>
            )}

            <div className="form-grid">
              <FormField label="头像" full annTarget="account.form.avatar">
                <AccountAvatar
                  value={form.avatarUrl}
                  name={form.displayName}
                  size="md"
                  editable
                  onChange={(avatarUrl) => update({ avatarUrl })}
                />
              </FormField>

              <FormField label="姓名" required error={errors.displayName} annTarget="account.form.displayName">
                <Input
                  value={form.displayName}
                  placeholder="请输入姓名"
                  invalid={!!errors.displayName}
                  onChange={(e) => update({ displayName: e.target.value })}
                />
              </FormField>

              <FormField
                label="手机号"
                required={!isEdit || editingPhone}
                error={errors.mobile}
                annTarget="account.form.mobile"
              >
                {isEdit && !editingPhone ? (
                  <div className="account-phone-readonly">
                    <span className="mono account-phone-mask">{maskedPhone}</span>
                    <button
                      type="button"
                      className="link account-phone-edit"
                      onClick={() => {
                        setForm((prev) => ({ ...prev, mobile: '' }))
                        setEditingPhone(true)
                        setProbe(IDLE_PROBE)
                      }}
                    >
                      修改
                    </button>
                  </div>
                ) : (
                  <div className="account-phone-edit-wrap">
                    <Input
                      value={form.mobile}
                      placeholder={isEdit ? '请输入新的 11 位手机号' : '请输入手机号'}
                      invalid={!!errors.mobile}
                      autoFocus={isEdit && editingPhone}
                      onChange={(e) => handleMobileChange(e.target.value)}
                      onBlur={() => void checkMobile()}
                    />
                    {isEdit && editingPhone && (
                      <button
                        type="button"
                        className="account-phone-cancel"
                        onClick={() => {
                          setForm((prev) => ({ ...prev, mobile: target?.mobile ?? '' }))
                          setEditingPhone(false)
                          setProbe(IDLE_PROBE)
                        }}
                      >
                        取消
                      </button>
                    )}
                  </div>
                )}
              </FormField>

              {occupied && (
                <div className="account-probe account-probe-danger" style={{ gridColumn: '1 / -1' }}>
                  <span className="account-probe-text">
                    该手机号已被账号【{probe.displayName}】使用，请更换手机号。
                  </span>
                </div>
              )}

              <FormField
                label="账号"
                required={!isEdit}
                error={errors.loginName}
                annTarget="account.form.loginName"
              >
                <Input
                  value={form.loginName}
                  readOnly={isEdit}
                  placeholder="默认与手机号一致，可修改"
                  invalid={!!errors.loginName}
                  onChange={(e) => {
                    setAccountTouched(true)
                    update({ loginName: e.target.value })
                  }}
                />
                <p className="form-tip account-field-tip">
                  {isEdit ? '账号创建后不可修改' : '默认取手机号，可修改；创建后不可更改'}
                </p>
              </FormField>

              <FormField label="邮箱" annTarget="account.form.email">
                <Input
                  value={form.email}
                  placeholder="请输入邮箱（选填）"
                  onChange={(e) => update({ email: e.target.value })}
                />
              </FormField>

              {isTenantMember ? (
                <FormField
                  label="角色"
                  full
                  annTarget="account.form.roles"
                  hint="只读；显示该成员在各租户内被分配的租户角色，平台不在此调整"
                >
                  {tenantIdentities.length === 0 ? (
                    <Input value="未加入任何租户" readOnly />
                  ) : (
                    <div className="account-role-readonly">
                      {tenantIdentities.map((item) => (
                        <div key={item.tenantId} className="account-role-readonly-row">
                          <span className="account-role-readonly-tenant">{item.tenantName}</span>
                          <span className="account-role-readonly-roles">
                            {item.roleNames.length > 0 ? item.roleNames.join('、') : '未分配角色'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </FormField>
              ) : (
                <FormField
                  label="角色"
                  required
                  error={errors.roleIds}
                  full
                  annTarget="account.form.roles"
                >
                  <MultiSelect
                    value={form.roleIds}
                    options={roleOptions}
                    placeholder="请选择平台角色（可多选，1 至 5 个）"
                    onChange={(roleIds) => update({ roleIds })}
                  />
                </FormField>
              )}

              {!isEdit && (
                <FormField label="初始密码" full error={errors.password} annTarget="account.form.password">
                  <div className="account-password-field">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      placeholder="留空由系统自动生成强随机密码"
                      invalid={!!errors.password}
                      autoComplete="new-password"
                      onChange={(e) => update({ password: e.target.value })}
                    />
                    <button
                      type="button"
                      className="account-password-eye"
                      aria-label={showPassword ? '隐藏密码' : '显示密码'}
                      title={showPassword ? '隐藏密码' : '显示密码'}
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      <Icon name={showPassword ? 'eyeOff' : 'eye'} size={16} />
                    </button>
                    <button
                      type="button"
                      className="account-password-random"
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
                    <div className="account-strength">
                      <span className={passwordStrength.length ? 'ok' : ''}>8-20 位</span>
                      <span className={passwordStrength.letter ? 'ok' : ''}>包含字母</span>
                      <span className={passwordStrength.digit ? 'ok' : ''}>包含数字</span>
                      <span className={passwordValid ? 'account-strength-valid' : 'account-strength-invalid'}>
                        {passwordValid ? '校验通过' : '请满足以上条件'}
                      </span>
                    </div>
                  ) : (
                    <p className="form-tip account-field-tip">
                      可留空：提交时系统自动生成一串强随机密码；也可手动输入（8-20 位，包含字母和数字）。
                    </p>
                  )}
                  <p className="form-tip account-field-tip">
                    <Icon name="lock" size={12} /> 无论自定义还是随机生成，首次登录均须强制修改初始密码。
                  </p>
                </FormField>
              )}
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
              <Button variant="primary" disabled={submitting} onClick={() => void doUpdate(phoneConfirm.newMobile)}>
                确认修改
              </Button>
            </>
          }
        >
          <p className="confirm-text">
            确认将账号【{phoneConfirm.name}】的登录手机号修改为【{phoneConfirm.newMobile}】吗？修改后请通知使用人改用新号码登录。
          </p>
        </Modal>
      )}
    </>
  )
}
