import { useEffect, useMemo, useState } from 'react'
import type { MenuFunction, MenuGrant } from '@/types'

interface MenuTreePickerProps {
  /** 全部菜单目录（来自菜单管理，含平台端与租户端全部菜单，统一数据源） */
  menus: MenuFunction[]
  /** 已勾选的菜单配置 */
  value: MenuGrant[]
  onChange: (grants: MenuGrant[]) => void
  /** 内置角色只读 */
  disabled?: boolean
  /** 展开 / 折叠令牌：每次变化都在「全部展开」与「全部折叠」间切换 */
  expandAllToken?: number
}

/**
 * 角色表单 · 菜单勾选树（统一数据源）。
 * 角色管理只做「功能菜单配置」，不做数据权限配置；功能菜单取菜单管理中全部菜单。
 * 不再区分平台 / 租户端、系统管理锁定等逻辑，统一成菜单树授权。
 */
export default function MenuTreePicker({
  menus,
  value,
  onChange,
  disabled = false,
  expandAllToken = 0,
}: MenuTreePickerProps) {
  const grantOf = (menuId: string) => value.find((grant) => grant.menuId === menuId)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  // 树形结构：按 parentId 归组
  const tree = useMemo(() => {
    const childrenMap = new Map<string | null, MenuFunction[]>()
    menus.forEach((menu) => {
      const key = menu.parentId
      if (!childrenMap.has(key)) childrenMap.set(key, [])
      childrenMap.get(key)!.push(menu)
    })
    const sortNodes = (list: MenuFunction[]) => [...list].sort((a, b) => a.sort - b.sort)
    const build = (parentId: string | null): MenuFunction[] => sortNodes(childrenMap.get(parentId) ?? [])
    return build(null)
  }, [menus])

  // 展开 / 折叠全部：令牌变化时在两种状态间切换
  useEffect(() => {
    if (expandAllToken === 0) return
    setCollapsedGroups((prev) => {
      if (prev.size === 0) {
        const allGroups = new Set(menus.filter((menu) => menu.parentId === null).map((menu) => menu.id))
        return allGroups
      }
      return new Set()
    })
  }, [expandAllToken, menus])

  const toggle = (menu: MenuFunction) => {
    const existing = grantOf(menu.id)
    if (existing) {
      onChange(value.filter((grant) => grant.menuId !== menu.id))
      return
    }
    onChange([...value, { menuId: menu.id }])
  }

  const checkedCount = value.length

  const renderNode = (node: MenuFunction, depth = 0): JSX.Element => {
    const children = menus
      .filter((menu) => menu.parentId === node.id)
      .sort((a, b) => a.sort - b.sort)
    const isGroup = children.length > 0 || node.route === ''
    const collapsed = collapsedGroups.has(node.id) && isGroup
    const checked = !!grantOf(node.id)
    return (
      <div key={node.id}>
        <div
          className={['role-fn-row', checked ? 'checked' : '', disabled ? 'locked' : ''].filter(Boolean).join(' ')}
          style={{ paddingLeft: 12 + depth * 20 }}
        >
          <label className="role-fn-name">
            {isGroup && (
              <button
                type="button"
                className="role-fn-collapse"
                onClick={() =>
                  setCollapsedGroups((prev) => {
                    const next = new Set(prev)
                    if (next.has(node.id)) next.delete(node.id)
                    else next.add(node.id)
                    return next
                  })
                }
              >
                {collapsed ? '展开' : '折叠'}
              </button>
            )}
            <input
              type="checkbox"
              checked={checked}
              disabled={disabled}
              onChange={() => {
                if (!disabled) toggle(node)
              }}
            />
            <span>{node.name}</span>
            {node.route && <span className="role-fn-code mono">{node.route}</span>}
          </label>
        </div>
        {!collapsed && children.map((child) => renderNode(child, depth + 1))}
      </div>
    )
  }

  return (
    <div className="role-fn-tree">
      <div className="role-fn-module">
        <span>功能菜单配置（来自菜单管理，展示全部启用菜单）</span>
        <span className="toolbar-tip">已选 {checkedCount} 个 · 勾选树只出现启用状态的菜单</span>
      </div>

      {tree.length === 0 && <div className="empty">暂无可用菜单</div>}

      {tree.map((node) => renderNode(node))}

      <div className="role-section-tip">
        有效功能 = 角色勾选菜单；多角色按菜单取并集。菜单由菜单管理统一维护，停用或删除的菜单不出现在勾选树中。
      </div>
    </div>
  )
}

/** 当前可勾选的菜单（仅启用状态），供「全选 / 不全选」使用 */
export function getSelectableFunctions(menus: MenuFunction[]): MenuFunction[] {
  return menus.filter((menu) => menu.status === 'enabled')
}

/** 按菜单列表生成默认全选配置（仅菜单引用，无数据范围） */
export function buildDefaultGrants(menus: MenuFunction[]): MenuGrant[] {
  return menus.map((menu) => ({ menuId: menu.id }))
}
