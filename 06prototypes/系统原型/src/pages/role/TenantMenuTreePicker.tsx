import { useEffect, useMemo, useState } from 'react'
import type { MenuFunction, MenuGrant } from '@/types'

interface TenantMenuTreePickerProps {
  /** 可勾选的菜单目录（租户端：已按适用端过滤，含分组节点） */
  menus: MenuFunction[]
  /** 已勾选的菜单配置（仅功能菜单引用，不配数据范围） */
  value: MenuGrant[]
  onChange: (grants: MenuGrant[]) => void
  /** 内置非保护角色只读 */
  disabled?: boolean
  /** 展开折叠令牌：奇数=全部展开、偶数（>0）=全部折叠（由弹窗「全部展开 / 全部折叠」触发） */
  expandAllToken?: number
  /** 菜单 / 路径搜索关键词（仅过滤展示，不影响已勾选数据） */
  keyword?: string
}

/**
 * 租户角色表单 · 菜单勾选树（业务 PRD §5.4）。
 * 角色管理授权只配「功能菜单」，不配置读 / 写数据范围；
 * 按适用端过滤后的租户端功能点，分组节点不可勾选、只承载层级。
 */
export default function TenantMenuTreePicker({
  menus,
  value,
  onChange,
  disabled = false,
  expandAllToken = 0,
  keyword = '',
}: TenantMenuTreePickerProps) {
  const grantOf = (menuId: string) => value.find((grant) => grant.menuId === menuId)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const tree = useMemo(() => {
    const childrenMap = new Map<string | null, MenuFunction[]>()
    menus.forEach((menu) => {
      const key = menu.parentId
      if (!childrenMap.has(key)) childrenMap.set(key, [])
      childrenMap.get(key)!.push(menu)
    })
    const sortNodes = (list: MenuFunction[]) => [...list].sort((a, b) => a.sort - b.sort)
    return sortNodes(childrenMap.get(null) ?? [])
  }, [menus])

  useEffect(() => {
    if (expandAllToken === 0) return
    if (expandAllToken % 2 === 1) {
      setCollapsedGroups(new Set())
    } else {
      setCollapsedGroups(new Set(menus.filter((menu) => menu.parentId === null).map((menu) => menu.id)))
    }
  }, [expandAllToken, menus])

  const toggle = (menu: MenuFunction) => {
    const existing = grantOf(menu.id)
    if (existing) {
      onChange(value.filter((grant) => grant.menuId !== menu.id))
      return
    }
    onChange([...value, { menuId: menu.id }])
  }

  /** 搜索命中：名称或路径包含关键词（不区分大小写）；关键词为空视为全部命中 */
  const matchKeyword = (node: MenuFunction): boolean => {
    const kw = keyword.trim().toLowerCase()
    if (!kw) return true
    return node.name.toLowerCase().includes(kw) || (node.route ?? '').toLowerCase().includes(kw)
  }

  /** 子树内任一节点命中即保留该分支 */
  const subtreeMatch = (node: MenuFunction): boolean => {
    if (matchKeyword(node)) return true
    return menus.filter((menu) => menu.parentId === node.id).some(subtreeMatch)
  }

  const renderNode = (node: MenuFunction, depth = 0): JSX.Element => {
    const children = menus.filter((menu) => menu.parentId === node.id).sort((a, b) => a.sort - b.sort)
    if (!subtreeMatch(node)) return <div key={node.id} />
    const isGroup = children.length > 0 || node.route === ''
    const collapsed = collapsedGroups.has(node.id) && isGroup
    const checked = !!grantOf(node.id)
    return (
      <div key={node.id}>
        <div
          className={['role-fn-row', checked ? 'checked' : '', isGroup ? 'group' : '', disabled ? 'locked' : '']
            .filter(Boolean)
            .join(' ')}
          style={{ paddingLeft: 12 + depth * 20 }}
        >
          <label className="role-fn-name">
            {isGroup && (
              <button
                type="button"
                className="role-fn-caret"
                aria-label={collapsed ? '展开' : '折叠'}
                onClick={() =>
                  setCollapsedGroups((prev) => {
                    const next = new Set(prev)
                    if (next.has(node.id)) next.delete(node.id)
                    else next.add(node.id)
                    return next
                  })
                }
              >
                {collapsed ? '▸' : '▾'}
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
            <span className={isGroup ? 'role-fn-title' : ''}>{node.name}</span>
            {node.route && <span className="role-fn-code mono">{node.route}</span>}
          </label>
        </div>
        {!collapsed && children.map((child) => renderNode(child, depth + 1))}
      </div>
    )
  }

  return (
    <div className="role-fn-tree role-fn-tree-tenant">
      {tree.length === 0 && <div className="empty">暂无可用菜单</div>}

      {tree.map((node) => renderNode(node))}
    </div>
  )
}
