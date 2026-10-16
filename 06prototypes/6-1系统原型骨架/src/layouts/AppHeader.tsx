import { Link, useLocation } from 'react-router-dom'
import Icon from '@/shared/components/Icon'
import { findFirstLeaf, isNodeActive, menuConfig } from '@/router/menu'

export default function AppHeader() {
  const location = useLocation()

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
        <span className="text-tertiary" style={{ display: 'flex' }}>
          <Icon name="search" size={16} />
        </span>
        <span className="app-user">
          <span className="app-avatar">管</span>
          <span>系统管理员</span>
        </span>
      </div>
    </header>
  )
}
