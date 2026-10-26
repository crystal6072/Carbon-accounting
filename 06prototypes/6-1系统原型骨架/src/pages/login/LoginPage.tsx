import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button, Icon, useToast } from '@/shared/components'
import { useAuth } from '@/context/AuthContext'
import './LoginPage.css'

/** 演示账户：对应 mock/account.ts 与 mock/tenant.ts 中的种子账号（原型不校验密码，点击即可进入） */
const DEMO_ACCOUNTS = [
  {
    loginName: 'admin',
    displayName: '林澈',
    role: '超级管理员',
    scope: 'platform',
    desc: '平台后台 · 全部功能权限',
    icon: 'dashboard',
  },
  {
    loginName: 'suqi',
    displayName: '苏岐',
    role: '租户管理员',
    scope: 'tenant',
    desc: '熊宝家居 · 租户全权限',
    icon: 'factory',
  },
  {
    loginName: 'ops01',
    displayName: '周予安',
    role: '平台运营人员',
    scope: 'platform',
    desc: '平台后台 · 租户开通与基础库维护',
    icon: 'user',
  },
] as const

export default function LoginPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { login, session } = useAuth()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [activeDemo, setActiveDemo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 已登录：需强制改密的账号一律先去改密页，不允许进入业务页面
  if (session) {
    return <Navigate to={session.mustChangePassword ? '/change-password' : '/dashboard'} replace />
  }

  const doLogin = async (loginName: string, pwd: string) => {
    setError(null)
    setLoading(true)
    try {
      // 真实走会话解析：账号启用 → 成员启用 → 租户启用，任一不满足即拒绝
      const next = await login(loginName, pwd)
      if (next.mustChangePassword) {
        // 首登 / 重置密码后：拦截到全屏改密页，不允许进入首页
        toast('请先修改初始密码')
        navigate('/change-password', { replace: true })
      } else {
        toast('登录成功')
        navigate('/dashboard', { replace: true })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
      return false
    } finally {
      setLoading(false)
    }
    return true
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) {
      setError('请输入账号和密码')
      return
    }
    void doLogin(username, password)
  }

  const handleDemoLogin = (loginName: string) => {
    if (loading) return
    setActiveDemo(loginName)
    setUsername(loginName)
    setPassword('demo')
    void doLogin(loginName, 'demo').finally(() => setActiveDemo(null))
  }

  return (
    <div className="login-page">
      <aside className="login-hero">
        <div className="login-hero-brand">
          <span className="login-hero-logo">碳</span>
          <span>产品碳足迹核算系统</span>
        </div>

        <div className="login-hero-body">
          <h2 className="login-hero-title">一站式产品碳足迹核算与报告平台</h2>
          <p className="login-hero-sub">
            从目标与范围、产品建模到核算与报告，覆盖产品碳足迹全链路能力。
          </p>
          <ul className="login-hero-feats">
            <li>
              <span className="dot" />
              核算流程：目标与范围 → 产品建模 → 核算 → 结果
            </li>
            <li>
              <span className="dot" />
              基础库与核算模型：物料 / 能源 / 单位 / 因子 / 模型统一管理
            </li>
            <li>
              <span className="dot" />
              组织与权限：多租户、成员、角色与菜单分级授权
            </li>
          </ul>
        </div>

        <p className="login-hero-copy">国家碳计量中心 · 碳足迹公共服务平台原型</p>
      </aside>

      <main className="login-main">
        <div className="login-card">
          <div className="login-card-head">
            <h1>欢迎登录</h1>
            <p>请输入账号信息以访问系统</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="login-field">
              <label className="login-field-label" htmlFor="login-username">
                账号
              </label>
              <div className={`login-input${error && !username.trim() ? ' is-error' : ''}`}>
                <Icon name="user" size={16} className="field-icon" />
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  placeholder="请输入账号"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value)
                    if (error) setError(null)
                  }}
                />
              </div>
            </div>

            <div className="login-field">
              <label className="login-field-label" htmlFor="login-password">
                密码
              </label>
              <div className={`login-input${error && !password ? ' is-error' : ''}`}>
                <Icon name="lock" size={16} className="field-icon" />
                <input
                  id="login-password"
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (error) setError(null)
                  }}
                />
                <button
                  type="button"
                  className="toggle-pwd"
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label={showPwd ? '隐藏密码' : '显示密码'}
                >
                  <Icon name={showPwd ? 'eyeOff' : 'eye'} size={16} />
                </button>
              </div>
            </div>

            {error && (
              <div className="login-error">
                <Icon name="warning" size={14} />
                <span>{error}</span>
              </div>
            )}

            <div className="login-options">
              <label className="login-remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                记住我
              </label>
            </div>

            <Button type="submit" variant="primary" block className="login-btn" disabled={loading}>
              {loading ? '登录中…' : '登 录'}
            </Button>
          </form>

          <div className="login-demo">
            <div className="login-demo-head">
              <span className="login-demo-title">演示账户 · 点击即可一键进入</span>
              <span className="login-demo-tip">原型环境不校验密码</span>
            </div>
            <div className="login-demo-list">
              {DEMO_ACCOUNTS.map((item) => (
                <button
                  key={item.loginName}
                  type="button"
                  className={`login-demo-item login-demo-item--${item.scope}${activeDemo === item.loginName ? ' is-active' : ''}`}
                  onClick={() => handleDemoLogin(item.loginName)}
                  disabled={loading}
                >
                  <span className="login-demo-icon">
                    <Icon name={item.icon} size={18} />
                  </span>
                  <span className="login-demo-meta">
                    <span className="login-demo-row">
                      <span className="login-demo-name">{item.displayName}</span>
                      <span className={`login-demo-role login-demo-role--${item.scope}`}>{item.role}</span>
                    </span>
                    <span className="login-demo-desc">{item.desc}</span>
                  </span>
                  <span className="login-demo-login">@{item.loginName}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="login-foot">
            演示环境：使用原型账号登录（如 suqi，密码任意）；单租户模式，一个账号只绑定一个租户
          </p>
        </div>
      </main>
    </div>
  )
}
