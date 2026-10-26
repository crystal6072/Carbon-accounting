import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, FormField, Icon, Input, Modal, MultiSelect, PageHeader, useToast } from '@/shared/components'
import type { MultiSelectOption } from '@/shared/components'
import { createAccount, fetchAccount, fetchPlatformRoles, updateAccount } from '@/mock/account'
import type { AccountPayload, PasswordResetMode } from '@/types'
import type { PlatformRole } from '@/types'
import AccountAvatar from './AccountAvatar'
import './AccountPage.css'

interface FormState {
  loginName: string
  displayName: string
  mobile: string
  email: string
  avatarUrl: string
  roleIds: string[]
}

const EMPTY_FORM: FormState = { loginName: '', displayName: '', mobile: '', email: '', avatarUrl: '', roleIds: [] }

const MOBILE_PATTERN = /^1[3-9]\d{9}$/

export default function AccountFormPage() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const toast = useToast()

  const [roles, setRoles] = useState<PlatformRole[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [oneTimePassword, setOneTimePassword] = useState('')
  const [createdLogin, setCreatedLogin] = useState('')
  const [pwdMode, setPwdMode] = useState<PasswordResetMode>('random')
  const [customPassword, setCustomPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const roleList = await fetchPlatformRoles()
      setRoles(roleList)
      if (isEdit && id) {
        const account = await fetchAccount(id)
        setForm({
          loginName: account.loginName,
          displayName: account.displayName,
          mobile: account.mobile,
          email: account.email ?? '',
          avatarUrl: account.avatarUrl ?? '',
          roleIds: account.roleIds,
        })
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [id, isEdit, toast])

  useEffect(() => {
    void load()
  }, [load])

  const roleOptions: MultiSelectOption[] = useMemo(() => roles.map((role) => ({ label: role.name, value: role.id })), [roles])

  const update = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }))

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    if (!isEdit) {
      const loginName = form.loginName.trim()
      if (!loginName) next.loginName = '登录名必填'
      else if (/^\d{11}$/.test(loginName)) next.loginName = '登录名不得为 11 位纯数字'
      else if (/[\u4e00-\u9fa5]/.test(loginName)) next.loginName = '登录名仅支持字母、数字与下划线'
      if (pwdMode === 'custom') {
        if (customPassword.length < 8 || customPassword.length > 20) next.customPassword = '初始密码须为 8-20 位'
        else if (!(/[A-Za-z]/.test(customPassword) && /\d/.test(customPassword))) next.customPassword = '须同时包含字母和数字'
        else if (customPassword !== confirmPassword) next.confirmPassword = '两次输入的密码不一致'
      }
    }
    if (!form.displayName.trim()) next.displayName = '姓名必填'
    else if (form.displayName.trim().length > 50) next.displayName = '姓名最长 50 字符'
    if (!form.mobile.trim()) next.mobile = '手机号必填'
    else if (!MOBILE_PATTERN.test(form.mobile.trim())) next.mobile = '手机号格式不正确'
    if (form.roleIds.length === 0) next.roleIds = '至少分配 1 个平台角色'
    else if (form.roleIds.length > 5) next.roleIds = '平台角色最多 5 个'

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    const payload: AccountPayload = {
      displayName: form.displayName.trim(),
      mobile: form.mobile.trim(),
      email: form.email.trim(),
      avatarUrl: form.avatarUrl,
      roleIds: form.roleIds,
    }
    setSubmitting(true)
    try {
      if (isEdit && id) {
        await updateAccount(id, payload)
        toast('保存成功')
        navigate(`/system/account/${id}`)
      } else {
        const loginName = form.loginName.trim()
        const created = await createAccount({
          ...payload,
          loginName,
          passwordMode: pwdMode,
          customPassword: pwdMode === 'custom' ? customPassword : undefined,
        })
        setOneTimePassword(created.password)
        setCreatedLogin(loginName)
        setCopied(false)
        toast('账号已创建')
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader breadcrumb={['系统管理', '组织与权限', '平台账号']} title={isEdit ? '编辑平台账号' : '新建平台账号'} />
        <div className="card">
          <div className="empty">加载中…</div>
        </div>
      </>
    )
  }

  // 新建成功：弹出强提示框，一次性展示初始密码（D09：关闭后不可再查）
  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(oneTimePassword)
      } else {
        const ta = document.createElement('textarea')
        ta.value = oneTimePassword
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

  if (oneTimePassword) {
    return (
      <>
        <PageHeader breadcrumb={['系统管理', '组织与权限', '平台账号', '新建完成']} title="账号已创建" />
        <Modal
          open
          title={<span data-ann-target="account.onetime.modal">账号创建成功！</span>}
          size="lg"
          onClose={() => navigate('/system/account')}
          footer={
            <Button variant="primary" onClick={() => navigate('/system/account')}>
              我已复制并关闭
            </Button>
          }
        >
          <div className="modal-confirm-text">
            <span style={{ color: 'var(--color-warning)', display: 'flex' }}>
              <Icon name="warning" size={16} />
            </span>
            <div>
              <div>
                登录名为：<b className="mono">{createdLogin}</b>，初始密码为：<b className="mono">{oneTimePassword}</b>。
              </div>
              <div className="modal-confirm-tip">请立即复制并线下告知用户。关闭后将无法再次查看密码。</div>
            </div>
          </div>
          <div className="account-onetime">
            <span className="account-onetime-code">{oneTimePassword}</span>
            <Button size="small" variant="default" onClick={() => void handleCopy()}>
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
        breadcrumb={['系统管理', '组织与权限', '平台账号', isEdit ? form.displayName : '新建']}
        title={
          <span data-ann-target="account.form.global">
            {isEdit ? `编辑平台账号 · ${form.displayName}` : '新建平台账号'}
          </span>
        }
        description="登录名与手机号全局唯一；建号必须至少分配 1 个平台角色，新账号首次登录强制改密。"
        actions={
          <>
            <Button onClick={() => navigate(isEdit && id ? `/system/account/${id}` : '/system/account')}>取消</Button>
            <Button variant="primary" disabled={submitting} onClick={() => void handleSubmit()}>
              保存
            </Button>
          </>
        }
      />

      <div className="card">
        <div className="account-section-header">
          <span className="account-section-title">账号信息</span>
          <span className="toolbar-tip">{isEdit ? '登录名创建后不可修改' : '登录名创建后不可修改，不支持自助找回密码'}</span>
        </div>
        <div className="account-section-body">
          <div className="form-grid">
            <FormField label="头像" full hint="非必填；未上传时以姓名首字占位" annTarget="account.form.avatar">
              <AccountAvatar
                value={form.avatarUrl}
                name={form.displayName}
                size="md"
                editable
                onChange={(avatarUrl) => update({ avatarUrl })}
              />
            </FormField>

            <FormField
              label="登录名"
              required
              error={errors.loginName}
              hint={isEdit ? '创建后不可改' : '不区分大小写判重，不得为 11 位纯数字'}
              annTarget="account.form.loginName"
            >
              <Input
                value={form.loginName}
                readOnly={isEdit}
                placeholder="请输入登录名"
                invalid={!!errors.loginName}
                onChange={(e) => update({ loginName: e.target.value })}
              />
            </FormField>

            <FormField label="手机号" required error={errors.mobile} hint="登录凭证之一，全局唯一" annTarget="account.form.mobile">
              <Input
                value={form.mobile}
                placeholder="请输入手机号"
                invalid={!!errors.mobile}
                onChange={(e) => update({ mobile: e.target.value })}
              />
            </FormField>

            <FormField label="邮箱" hint="非必填，用于登录凭证与通知" annTarget="account.form.email">
              <Input
                value={form.email}
                placeholder="请输入邮箱"
                onChange={(e) => update({ email: e.target.value })}
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
              label="平台角色"
              required
              error={errors.roleIds}
              full
              hint="1 至 5 个，至少 1 个；超级管理员为保护角色"
              annTarget="account.form.roles"
            >
              <MultiSelect
                value={form.roleIds}
                options={roleOptions}
                placeholder="请选择平台角色"
                onChange={(roleIds) => update({ roleIds })}
              />
            </FormField>

            {!isEdit && (
              <FormField
                label="初始密码设置"
                required
                full
                error={errors.customPassword || errors.confirmPassword}
                hint="默认系统随机生成（8 位大小写字母 + 数字）；也可自定义，须 8-20 位且同时包含字母和数字"
                annTarget="account.form.password"
              >
                <div className="account-reset-modes">
                  <label className="account-reset-mode">
                    <input type="radio" name="pwd-mode" checked={pwdMode === 'random'} onChange={() => setPwdMode('random')} />
                    <span>系统随机生成（推荐）</span>
                  </label>
                  <label className="account-reset-mode">
                    <input type="radio" name="pwd-mode" checked={pwdMode === 'custom'} onChange={() => setPwdMode('custom')} />
                    <span>自定义密码</span>
                  </label>
                </div>
                {pwdMode === 'random' ? (
                  <p className="form-tip" style={{ marginTop: 8 }}>
                    生成规则：8 位大小写字母 + 数字，提交后弹窗展示一次（关闭后不可再查）。
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                    <Input
                      type="password"
                      value={customPassword}
                      placeholder="请输入8-20位包含字母和数字的密码"
                      invalid={!!errors.customPassword}
                      onChange={(e) => setCustomPassword(e.target.value)}
                    />
                    <Input
                      type="password"
                      value={confirmPassword}
                      placeholder="再次输入密码"
                      invalid={!!errors.confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                )}
              </FormField>
            )}

            {!isEdit && (
              <FormField label="首次登录强制修改密码" full annTarget="account.form.firstLogin">
                <label className="account-ack">
                  <input type="checkbox" checked disabled />
                  <span>默认开启（不可关闭）；用户首次登录将被强制要求修改密码。</span>
                </label>
              </FormField>
            )}
          </div>
        </div>
        <div className="account-section-tip">
          保存后系统生成一次性密码并展示一次，同时标记首登改密；密码遗失只能由超管再次重置，不提供明文查询入口。
        </div>
        <div className="account-form-footer">
          <Button data-ann-target="account.form.cancel" onClick={() => navigate(isEdit && id ? `/system/account/${id}` : '/system/account')}>
            取消
          </Button>
          <Button variant="primary" disabled={submitting} data-ann-target="account.form.save" onClick={() => void handleSubmit()}>
            保存
          </Button>
        </div>
      </div>
    </>
  )
}
