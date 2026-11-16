import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Icon from '@/shared/components/Icon'
import { Select, useToast } from '@/shared/components'
import { findFirstLeaf, isNodeActive, menuConfig } from '@/router/menu'
import { SITE_MESSAGES, type SiteMessage } from '@/mock/config'
import { useAuth } from '@/context/AuthContext'
import UserMenu from './UserMenu'
import './AppHeader.css'

/** 新页签入口要拼上部署基址（BrowserRouter basename 不会作用于原生 a[href]） */
const NAV_BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

export default function AppHeader() {
  const location = useLocation()
  const { session, tenants, switchTenant } = useAuth()
  const toast = useToast()

  return (
    <header className="app-header">
      <div className="app-brand">
        <span className="app-brand-logo">碳</span>
        <span>竹木碳核算全生命周期系统</span>
      </div>
      <nav className="app-header-nav">
        {menuConfig.map((node) => {
          const target = findFirstLeaf(node) ?? '/dashboard'
          const active = isNodeActive(node, location.pathname)
          /* 大屏类入口（数据驾驶舱）：新页签打开，不打断当前业务页签。
             保留 opener，让新页签继承 sessionStorage；Chrome 89+ 默认 target="_blank" 为 noopener，
             若再显式写 noopener/noreferrer 会导致会话丢失并被登录守卫重定向。 */
          if (node.openInNewTab) {
            return (
              <a
                key={node.key}
                href={`${NAV_BASE}${target}`}
                target="_blank"
                rel="opener"
                className={active ? 'active' : undefined}
              >
                {node.icon && <Icon name={node.icon} size={16} />}
                <span>{node.label}</span>
              </a>
            )
          }
          return (
            <Link key={node.key} to={target} className={active ? 'active' : undefined}>
              {node.icon && <Icon name={node.icon} size={16} />}
              <span>{node.label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="app-header-right">
        {/* 多租户：账号可属多个租户，顶栏展示当前租户；多于 1 个时提供切换器 */}
        {session && !session.platform && tenants.length > 1 ? (
          <Select
            aria-label="切换租户"
            value={session.tenantId}
            options={tenants.map((item) => ({
              label: item.primary ? `${item.tenantName}（主管理员）` : item.tenantName,
              value: item.tenantId,
            }))}
            style={{ width: 200 }}
            onChange={(e) => {
              const target = e.target.value
              if (!target || target === session.tenantId) return
              void switchTenant(target).catch((err) => {
                toast(err instanceof Error ? err.message : '切换租户失败', 'error')
              })
            }}
          />
        ) : (
          session && (
            <span className="text-tertiary" style={{ fontSize: 13 }}>
              {session.tenantName}
            </span>
          )
        )}
        <span className="text-tertiary" style={{ display: 'flex' }}>
          <Icon name="search" size={16} />
        </span>
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  )
}

/* ============ 站内信消息通知铃铛 ============ */
function NotificationBell() {
  const toast = useToast()
  const [items, setItems] = useState<SiteMessage[]>(() =>
    SITE_MESSAGES.slice(0, 6).map((m) => ({ ...m })),
  )
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const unread = items.filter((i) => i.readAt === '未读').length

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const markRead = (id: string) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, readAt: new Date().toLocaleString('zh-CN').slice(0, 16) } : i)))
  const markAll = () => {
    setItems((prev) => prev.map((i) => (i.readAt === '未读' ? { ...i, readAt: new Date().toLocaleString('zh-CN').slice(0, 16) } : i)))
    toast('已全部标记为已读')
  }

  return (
    <div className="notif" ref={ref}>
      <button type="button" className="notif-trigger" onClick={() => setOpen((o) => !o)} aria-label="消息通知">
        <Icon name="bell" size={18} />
        {unread > 0 && <span className="notif-badge">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <div className="notif-panel">
          <div className="notif-head">
            <span className="notif-head-title">消息通知</span>
            <button className="link" onClick={markAll} disabled={unread === 0}>
              全部已读
            </button>
          </div>
          <div className="notif-list">
            {items.length === 0 ? (
              <div className="notif-empty">暂无消息</div>
            ) : (
              items.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  className={`notif-item${i.readAt === '未读' ? ' unread' : ''}`}
                  onClick={() => markRead(i.id)}
                >
                  <div className="notif-item-title">{i.title}</div>
                  <div className="notif-item-meta">
                    <span className="cell-ellipsis">{i.eventName} · {i.receiver}</span>
                    <span>{i.readAt === '未读' ? '未读' : i.time}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
