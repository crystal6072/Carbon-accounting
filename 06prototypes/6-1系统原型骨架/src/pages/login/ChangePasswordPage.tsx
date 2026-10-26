import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button, Icon, useToast } from '@/shared/components'
import { useAuth } from '@/context/AuthContext'
import { changePassword } from '@/mock/account'
import './ChangePasswordPage.css'

/**
 * 强制改密页（账号表 `must_change_password = true` 时唯一可达页面）。
 *
 * 触发场景（仅这三类）：
 * 1. 管理员新建账号 / 租户开户建主管理员 → 首登强制改密；
 * 2. 管理员重置密码（超管重置 / 租户管理员重置）→ 强制改密；
 * 3. 例外：已有账号直接绑定加入新租户（沿用本人旧密码）→ **不触发**。
 *
 * 交互约束：
 * - 全屏页、无关闭按钮、不可取消，改密前不能进入任何业务页面；
 * - 中途关闭浏览器不影响：标记仍在账号上，下次登录继续拦截；
 * - 新密码不得与旧密码相同，且需满足复杂度（≥ 8 位，含大写 / 小写 / 数字 / 特殊字符中的三类）。
 */
const PASSWORD_RULE = '不少于 8 位，且包含大写字母、小写字母、数字、特殊字符中的至少三类'

/** 复杂度校验：≥ 8 位 + 四类字符命中 ≥ 3 类（与 mock 侧同口径） */
function assertComplexity(value: string): string | null {
  if (value.length < 8) return '新密码长度不少于 8 位'
  const kinds = [/[A-Z]/, /[a-z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(value)).length
  if (kinds < 3) return '新密码需包含大写字母、小写字母、数字、特殊字符中的至少三类'
  return null
}

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { session, completePasswordChange, logout } = useAuth()

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // 未登录 → 登录页；无需改密 → 直接进首页（防止手动输入地址绕过）
  if (!session) return <Navigate to="/login" replace />
  if (!session.mustChangePassword) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (!oldPassword) return setError('请输入原密码（登录时使用的初始密码）')
    const complexity = assertComplexity(newPassword)
    if (complexity) return setError(complexity)
    if (newPassword === oldPassword) return setError('新密码不能与原密码相同')
    if (newPassword !== confirmPassword) return setError('两次输入的新密码不一致')

    setLoading(true)
    try {
      await changePassword(session.accountId, newPassword, session.displayName)
      completePasswordChange()
      toast('密码修改成功')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '密码修改失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="cp-page">
      <div className="cp-card">
        <div className="cp-brand">
          <span className="cp-brand-logo">碳</span>
          <span>产品碳足迹核算系统</span>
        </div>

        <h1 className="cp-title">修改密码</h1>
        <div className="cp-tip">
          <Icon name="lock" size={14} />
          <span>为了您的账号安全，首次登录 / 重置密码后请修改初始密码。</span>
        </div>

        <div className="cp-account">
          当前账号：<strong>{session.displayName}</strong>
          <span className="cp-account-sub">@{session.loginName}</span>
        </div>

        <form className="cp-form" onSubmit={handleSubmit} noValidate>
          <label className="cp-field">
            <span className="cp-label">原密码</span>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="请输入登录时使用的初始密码"
              value={oldPassword}
              onChange={(e) => {
                setOldPassword(e.target.value)
                if (error) setError(null)
              }}
            />
          </label>

          <label className="cp-field">
            <span className="cp-label">新密码</span>
            <input
              type="password"
              autoComplete="new-password"
              placeholder={PASSWORD_RULE}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value)
                if (error) setError(null)
              }}
            />
          </label>

          <label className="cp-field">
            <span className="cp-label">确认新密码</span>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="请再次输入新密码"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                if (error) setError(null)
              }}
            />
          </label>

          <p className="cp-rule">密码规则：{PASSWORD_RULE}；新密码不得与原密码相同。</p>

          {error && (
            <div className="cp-error">
              <Icon name="warning" size={14} />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" variant="primary" block disabled={loading} className="cp-submit">
            {loading ? '保存中…' : '保存并进入系统'}
          </Button>
        </form>

        <p className="cp-foot">
          加密存储由服务端负责，本页仅做拦截与校验。
          <button
            type="button"
            className="cp-logout"
            onClick={() => {
              logout()
              navigate('/login', { replace: true })
            }}
          >
            退出登录
          </button>
        </p>
      </div>
    </div>
  )
}
