import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '@/shared/components/Icon'
import { Button, FormField, Input, Modal, Tag, useToast } from '@/shared/components'
import { useAuth } from '@/context/AuthContext'
import { CURRENT_ACCOUNT_ID, fetchAccountDetail, updateAccountBasic } from '@/mock/account'
import { fetchPlatformRoles } from '@/mock/role'
import type { AccountStatus, PlatformAccount } from '@/types'
import './UserMenu.css'

/** 演示当前登录者加载失败时的兜底展示（固定为平台超管 A001） */
const FALLBACK_NAME = '林澈'
const FALLBACK_ROLE = '平台超管'

const ACCOUNT_STATUS_TEXT: Record<AccountStatus, string> = {
  enabled: '正常',
  disabled: '已禁用',
  canceled: '已注销',
}

const ACCOUNT_STATUS_TONE: Record<AccountStatus, 'success' | 'warning' | 'default'> = {
  enabled: 'success',
  disabled: 'warning',
  canceled: 'default',
}

const MOBILE_PATTERN = /^1\d{10}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** 可自助变更的字段 */
type EditingKind = 'mobile' | 'email' | 'password'

const EDITING_TITLE: Record<EditingKind, string> = {
  mobile: '更换手机号',
  email: '更换邮箱',
  password: '更换密码',
}

/** 密码强度：按长度与字符类别（大写 / 小写 / 数字 / 特殊字符）评定 */
function passwordStrength(pwd: string): { level: 'weak' | 'medium' | 'strong'; text: string } {
  if (pwd.length < 8) return { level: 'weak', text: '强度：弱（不少于 8 位）' }
  const categories = [/[a-z]/, /[A-Z]/, /\d/, /[^\da-zA-Z]/].filter((re) => re.test(pwd)).length
  if (categories >= 3) return { level: 'strong', text: '强度：强' }
  if (categories === 2) return { level: 'medium', text: '强度：中（建议再混合一类字符）' }
  return { level: 'weak', text: '强度：弱（建议混合大小写、数字与特殊字符）' }
}

/**
 * 顶栏右侧用户区：头像 + 姓名 + 角色，点击下拉展示标准功能
 * （个人账户信息 / 退出系统），不再提供演示用的「切换视角」。
 */
export default function UserMenu() {
  const toast = useToast()
  const navigate = useNavigate()
  const { session, logout } = useAuth()
  /** 登录后以会话账号为准；会话未恢复时退回演示账号 */
  const currentAccountId = session?.accountId ?? CURRENT_ACCOUNT_ID
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [account, setAccount] = useState<PlatformAccount | null>(null)
  const [roleNames, setRoleNames] = useState<Record<string, string>>({})

  useEffect(() => {
    let alive = true
    void fetchAccountDetail(currentAccountId)
      .then((item) => {
        if (alive) setAccount(item)
      })
      .catch(() => {
        /* 顶栏降级为固定演示用户展示 */
      })
    return () => {
      alive = false
    }
  }, [currentAccountId])

  useEffect(() => {
    let alive = true
    void fetchPlatformRoles()
      .then((list) => {
        if (alive) setRoleNames(Object.fromEntries(list.map((role) => [role.id, role.name])))
      })
      .catch(() => {
        /* 角色名解析失败时降级展示角色 id */
      })
    return () => {
      alive = false
    }
  }, [])

  const refresh = useCallback(() => {
    void fetchAccountDetail(CURRENT_ACCOUNT_ID)
      .then(setAccount)
      .catch(() => {
        /* 忽略：保持上一次已加载的账户信息 */
      })
  }, [])

  const displayName = account?.displayName ?? FALLBACK_NAME
  const roleText = useMemo(() => {
    const ids = account?.roleIds ?? []
    if (ids.length === 0) return FALLBACK_ROLE
    const names = ids.map((id) => roleNames[id] ?? id)
    return names.join('、')
  }, [account, roleNames])

  return (
    <div className="user-menu">
      <button
        className="app-user"
        onClick={() => setMenuOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        <span className="app-avatar">{displayName.slice(0, 1)}</span>
        <span className="user-menu-name">
          <span>{displayName}</span>
          <span className="user-menu-role">{roleText}</span>
        </span>
        <Icon name="chevronDown" size={14} />
      </button>

      {menuOpen && (
        <>
          <div className="user-menu-mask" onClick={() => setMenuOpen(false)} />
          <div className="user-menu-dropdown" role="menu">
            <button
              className="user-menu-item"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false)
                setAccountOpen(true)
              }}
            >
              <Icon name="user" size={14} />
              <span>个人账户信息</span>
            </button>
            <div className="user-menu-divider" />
            <button
              className="user-menu-item is-danger"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false)
                setLogoutOpen(true)
              }}
            >
              <Icon name="logout" size={14} />
              <span>退出系统</span>
            </button>
          </div>
        </>
      )}

      <AccountModal
        open={accountOpen}
        account={account}
        roleText={roleText}
        onClose={() => setAccountOpen(false)}
        onSaved={refresh}
      />

      <Modal
        open={logoutOpen}
        title="退出系统"
        size="sm"
        onClose={() => setLogoutOpen(false)}
        footer={
          <>
            <Button onClick={() => setLogoutOpen(false)}>取消</Button>
            <Button
              variant="danger"
              onClick={() => {
                logout()
                toast('已退出系统')
                setLogoutOpen(false)
                navigate('/login', { replace: true })
              }}
            >
              确认退出
            </Button>
          </>
        }
      >
        <p className="form-tip" style={{ marginTop: 0 }}>
          确认退出当前账号「{displayName}」？退出后将返回登录页，需重新登录后才能继续使用。
        </p>
      </Modal>
    </div>
  )
}

interface AccountModalProps {
  open: boolean
  account: PlatformAccount | null
  roleText: string
  onClose: () => void
  /** 保存成功后刷新顶栏与弹窗内的账户信息 */
  onSaved: () => void
}

/**
 * 个人账户信息：账户信息只读展示，手机号 / 邮箱 / 密码在对应字段旁提供「修改」入口，
 * 点击后原地切换为对应变更表单（不叠弹窗、不拉长窗口）。
 * 手机号与邮箱为直接修改（无需验证码）；密码仍需原密码验证。
 */
function AccountModal({ open, account, roleText, onClose, onSaved }: AccountModalProps) {
  const [editing, setEditing] = useState<EditingKind | null>(null)

  // 关闭弹窗时复位到信息视图
  useEffect(() => {
    if (!open) setEditing(null)
  }, [open])

  const handleSaved = useCallback(() => {
    setEditing(null)
    onSaved()
  }, [onSaved])

  if (!account) {
    return (
      <Modal open={open} title="个人账户信息" size="default" onClose={onClose} footer={<Button onClick={onClose}>关闭</Button>}>
        <div className="empty">加载中…</div>
      </Modal>
    )
  }

  return (
    <Modal
      open={open}
      title={editing ? EDITING_TITLE[editing] : '个人账户信息'}
      size="default"
      onClose={onClose}
      // 变更表单自带「取消 / 确认更换」操作，不额外渲染返回按钮
      footer={editing ? undefined : <Button onClick={onClose}>关闭</Button>}
    >
      {editing === null && <AccountInfoPanel account={account} roleText={roleText} onEdit={setEditing} />}
      {editing === 'mobile' && (
        <MobileChangeForm account={account} onBack={() => setEditing(null)} onSaved={handleSaved} />
      )}
      {editing === 'email' && <EmailChangeForm account={account} onBack={() => setEditing(null)} onSaved={handleSaved} />}
      {editing === 'password' && (
        <PasswordChangeForm account={account} onBack={() => setEditing(null)} onSaved={handleSaved} />
      )}
    </Modal>
  )
}

/** 账户信息只读面板：手机号 / 邮箱 / 密码行尾提供「修改」入口 */
function AccountInfoPanel({
  account,
  roleText,
  onEdit,
}: {
  account: PlatformAccount
  roleText: string
  onEdit: (kind: EditingKind) => void
}) {
  // 所属组织：账号名下有效（未移除）的租户成员关系，多个时以「、」连接
  const orgNames = account.tenantMemberships
    .filter((item) => item.status === 'active')
    .map((item) => item.tenantName)
  return (
    <div className="user-account">
      <div className="user-account-summary">
        <span className="user-account-avatar">{account.displayName.slice(0, 1)}</span>
        <div className="user-account-summary-main">
          <span className="user-account-summary-name">{account.displayName}</span>
          <span className="user-account-summary-sub">
            {account.loginName} · {roleText}
          </span>
        </div>
        <Tag tone={ACCOUNT_STATUS_TONE[account.status]}>{ACCOUNT_STATUS_TEXT[account.status]}</Tag>
      </div>

      <div className="card">
        <div className="card-title">账户信息</div>
        <div className="card-body">
          <div className="user-account-list">
            <div className="user-account-pair">
              <div className="user-account-field">
                <span className="user-account-label">登录账号</span>
                <span className="user-account-value">{account.loginName}</span>
              </div>
              <div className="user-account-field">
                <span className="user-account-label">姓名</span>
                <span className="user-account-value">{account.displayName}</span>
              </div>
            </div>
            <div className="user-account-field">
              <span className="user-account-label">手机号</span>
              <span className="user-account-value">{account.mobile}</span>
              <button type="button" className="user-account-edit" onClick={() => onEdit('mobile')}>
                修改
              </button>
            </div>
            <div className="user-account-field">
              <span className="user-account-label">邮箱</span>
              <span className="user-account-value">{account.email || '未设置'}</span>
              <button type="button" className="user-account-edit" onClick={() => onEdit('email')}>
                修改
              </button>
            </div>
            <div className="user-account-field">
              <span className="user-account-label">密码</span>
              <span className="user-account-value user-account-mask">{account.passwordMask}</span>
              <button type="button" className="user-account-edit" onClick={() => onEdit('password')}>
                修改
              </button>
            </div>
            {orgNames.length > 0 && (
              <div className="user-account-field">
                <span className="user-account-label">所属组织</span>
                <span className="user-account-value">{orgNames.join('、')}</span>
              </div>
            )}
            <div className="user-account-pair">
              <div className="user-account-field">
                <span className="user-account-label">角色</span>
                <span className="user-account-value">{roleText}</span>
              </div>
              <div className="user-account-field">
                <span className="user-account-label">最近登录</span>
                <span className="user-account-value">{account.lastLoginAt || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 更换手机号：直接修改（无需验证码），仅做格式与「不能与原手机号相同」校验，
 * 保存后写入账号并刷新展示。
 */
function MobileChangeForm({
  account,
  onBack,
  onSaved,
}: {
  account: PlatformAccount
  onBack: () => void
  onSaved: () => void
}) {
  const toast = useToast()
  const [mobile, setMobile] = useState('')
  const [mobileError, setMobileError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    setMobileError('')
    if (!MOBILE_PATTERN.test(mobile)) {
      setMobileError('请输入正确的 11 位手机号')
      return
    }
    if (mobile === account.mobile) {
      setMobileError('新手机号不能与当前手机号相同')
      return
    }
    setSaving(true)
    try {
      await updateAccountBasic(account.id, {
        displayName: account.displayName,
        mobile,
        email: account.email ?? '',
      })
      onSaved()
      toast('手机号更换成功，可使用新手机号登录')
    } catch (error) {
      toast(error instanceof Error ? error.message : '手机号更换失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="user-account">
      <div className="card">
        <div className="card-body">
          <p className="form-tip" style={{ marginTop: 0 }}>
            更换成功后可使用新手机号登录，原手机号即时失效。
          </p>
          <div className="user-account-static">
            <span className="user-account-label">当前手机号</span>
            <span className="user-account-static-value">{account.mobile}</span>
          </div>
          <FormField label="新手机号" required error={mobileError}>
            <Input
              value={mobile}
              maxLength={11}
              placeholder="请输入新的 11 位手机号"
              invalid={!!mobileError}
              onChange={(e) => {
                setMobile(e.target.value.replace(/\D/g, ''))
                setMobileError('')
              }}
            />
          </FormField>
          <div className="user-account-actions">
            <Button onClick={onBack}>取消</Button>
            <Button variant="primary" disabled={saving} onClick={() => void handleSubmit()}>
              确认更换
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 更换邮箱：直接修改（无需验证码）；留空保存可清除已绑定邮箱。
 */
function EmailChangeForm({
  account,
  onBack,
  onSaved,
}: {
  account: PlatformAccount
  onBack: () => void
  onSaved: () => void
}) {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [saving, setSaving] = useState(false)

  const next = email.trim()
  const clearing = next === ''
  const changed = next !== (account.email ?? '')

  const handleSubmit = async () => {
    setEmailError('')
    if (!changed) {
      setEmailError('新邮箱不能与当前邮箱相同')
      return
    }
    if (!clearing && !EMAIL_PATTERN.test(next)) {
      setEmailError('邮箱格式不正确')
      return
    }
    setSaving(true)
    try {
      await updateAccountBasic(account.id, {
        displayName: account.displayName,
        mobile: account.mobile,
        email: next,
      })
      onSaved()
      toast(clearing ? '邮箱已清除' : '邮箱更换成功')
    } catch (error) {
      toast(error instanceof Error ? error.message : '邮箱更换失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="user-account">
      <div className="card">
        <div className="card-body">
          <p className="form-tip" style={{ marginTop: 0 }}>
            邮箱用于接收系统通知与找回凭证；留空保存则清除已绑定的邮箱。
          </p>
          <div className="user-account-static">
            <span className="user-account-label">当前邮箱</span>
            <span className="user-account-static-value">{account.email || '未设置'}</span>
          </div>
          <FormField label="新邮箱" error={emailError}>
            <Input
              value={email}
              placeholder="请输入新的邮箱地址"
              invalid={!!emailError}
              onChange={(e) => {
                setEmail(e.target.value)
                setEmailError('')
              }}
            />
          </FormField>
          <div className="user-account-actions">
            <Button onClick={onBack}>取消</Button>
            <Button variant="primary" disabled={saving} onClick={() => void handleSubmit()}>
              确认更换
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 更换密码：原密码验证 + 新密码（长度 / 强度校验）+ 二次确认；
 * 密码为账号级凭证，更换后其他端的登录状态将失效。
 */
function PasswordChangeForm({
  account,
  onBack,
  onSaved,
}: {
  account: PlatformAccount
  onBack: () => void
  onSaved: () => void
}) {
  const toast = useToast()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const strength = passwordStrength(newPassword)

  const handleSubmit = () => {
    setError('')
    if (!oldPassword) {
      setError('请输入原密码')
      return
    }
    if (newPassword.length < 8) {
      setError('新密码长度不少于 8 位')
      return
    }
    if (newPassword === oldPassword) {
      setError('新密码不能与原密码相同')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致')
      return
    }
    setSaving(true)
    // 演示原型：密码为账号级凭证，此处仅模拟自助更换流程
    window.setTimeout(() => {
      setSaving(false)
      onSaved()
      toast('密码更换成功，请使用新密码重新登录')
    }, 400)
  }

  return (
    <div className="user-account">
      <div className="card">
        <div className="card-body">
          <p className="form-tip" style={{ marginTop: 0 }}>
            更换密码需验证原密码；密码为账号级凭证，更换后其他端的登录状态将失效。
          </p>
          <div className="form-grid">
            <FormField label="原密码" required full>
              <Input
                type="password"
                value={oldPassword}
                placeholder="请输入原密码"
                onChange={(e) => {
                  setOldPassword(e.target.value)
                  setError('')
                }}
              />
            </FormField>
            <FormField label="新密码" required hint="不少于 8 位，建议混合大小写、数字与特殊字符">
              <Input
                type="password"
                value={newPassword}
                placeholder="请输入新密码"
                onChange={(e) => {
                  setNewPassword(e.target.value)
                  setError('')
                }}
              />
            </FormField>
            <FormField label="确认新密码" required>
              <Input
                type="password"
                value={confirmPassword}
                placeholder="请再次输入新密码"
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  setError('')
                }}
              />
            </FormField>
            {newPassword && <span className={`user-account-strength is-${strength.level}`}>{strength.text}</span>}
            {error && <span className="form-error user-account-error">{error}</span>}
          </div>
          <div className="user-account-actions">
            <Button onClick={onBack}>取消</Button>
            <Button variant="primary" disabled={saving} onClick={handleSubmit}>
              确认更换
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
