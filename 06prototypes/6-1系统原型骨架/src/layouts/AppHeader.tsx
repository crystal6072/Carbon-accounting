import { Link, useLocation } from 'react-router-dom'
import Icon from '@/shared/components/Icon'
import { findFirstLeaf, isNodeActive, menuConfig } from '@/router/menu'
import { useAuth } from '@/context/AuthContext'
import UserMenu from './UserMenu'

export default function AppHeader() {
  const location = useLocation()
  const { session } = useAuth()

  return (
    <header className="app-header">
      <div className="app-brand">
        <span className="app-brand-logo">碳</span>
        <span>产品碳足迹核算系统</span>
      </div>
      <nav className="app-header-nav">
        {menuConfig.map((node) => {
          const target = findFirstLeaf(node) ?? '/dashboard'
          const active = isNodeActive(node, location.pathname)
          return (
            <Link key={node.key} to={target} className={active ? 'active' : undefined}>
              {node.icon && <Icon name={node.icon} size={16} />}
              <span>{node.label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="app-header-right">
        {/* 单租户模式：一个账号只绑定一个租户，顶栏仅展示当前租户，不提供切换入口 */}
        {session && (
          <span className="text-tertiary" style={{ fontSize: 13 }}>
            {session.tenantName}
          </span>
        )}
        <Link
          to="/panorama"
          className={['app-header-entry', location.pathname.startsWith('/panorama') ? 'active' : '']
            .filter(Boolean)
            .join(' ')}
        >
          <Icon name="layers" size={16} />
          <span>功能全景</span>
        </Link>
        <span className="text-tertiary" style={{ display: 'flex' }}>
          <Icon name="search" size={16} />
        </span>
        <UserMenu />
      </div>
    </header>
  )
}
