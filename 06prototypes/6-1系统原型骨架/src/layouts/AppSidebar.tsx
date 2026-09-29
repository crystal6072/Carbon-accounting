import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Icon from '@/shared/components/Icon'
import { findAncestorKeys, isNodeActive, menuConfig } from '@/router/menu'
import type { MenuNode } from '@/router/menu'

export default function AppSidebar() {
  const location = useLocation()
  const [expanded, setExpanded] = useState<string[]>([])

  // 路由变化时自动展开当前路径的祖先分组
  useEffect(() => {
    const ancestors = findAncestorKeys(menuConfig, location.pathname) ?? []
    setExpanded((prev) => Array.from(new Set([...prev, ...ancestors])))
  }, [location.pathname])

  const toggle = (key: string) => {
    setExpanded((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  const renderNodes = (nodes: MenuNode[], depth: number) =>
    nodes.map((node) => {
      const hasChildren = !!node.children && node.children.length > 0
      const isOpen = expanded.includes(node.key)
      const paddingLeft = 16 + depth * 16

      if (hasChildren) {
        return (
          <div key={node.key}>
            <div
              className={['sidebar-item', depth > 0 ? 'nested' : ''].filter(Boolean).join(' ')}
              style={{ paddingLeft }}
              onClick={() => toggle(node.key)}
            >
              {node.icon && <Icon name={node.icon} className="sidebar-icon" />}
              <span className="sidebar-label">{node.label}</span>
              <Icon name="chevronDown" size={14} className={['sidebar-caret', isOpen ? 'expanded' : ''].filter(Boolean).join(' ')} />
            </div>
            {isOpen && <div>{renderNodes(node.children as MenuNode[], depth + 1)}</div>}
          </div>
        )
      }

      // 子路由（如 /basic/product/:id）同样高亮所属菜单项
      const active = isNodeActive(node, location.pathname)
      return (
        <Link
          key={node.key}
          to={node.key}
          className={['sidebar-item', depth > 0 ? 'nested' : '', active ? 'active' : ''].filter(Boolean).join(' ')}
          style={{ paddingLeft }}
        >
          {node.icon && <Icon name={node.icon} className="sidebar-icon" />}
          <span className="sidebar-label">{node.label}</span>
        </Link>
      )
    })

  // 顶栏已承载一级导航，侧栏只渲染当前一级分组下的内容
  const activeTopGroup = menuConfig.find(
    (node) => node.children && isNodeActive(node, location.pathname),
  )
  const group = activeTopGroup?.children ? activeTopGroup : undefined
  const sidebarNodes = group ? (group.children as MenuNode[]) : menuConfig.filter((n) => !n.children)

  return <aside className="app-sidebar">{renderNodes(sidebarNodes, 0)}</aside>
}
