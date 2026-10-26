import { useEffect, useMemo, useState } from 'react'
import { MultiSelect, Select } from '@/shared/components'
import { DATA_SCOPE_MENU_IDS } from '@/mock/role'
import { compareScope, dataScopeOptions, dataScopeText } from './roleMeta'
import type { DataScope, MenuFunction, MenuGrant } from '@/types'

interface TenantMenuTreePickerProps {
  /** 可勾选的菜单目录（租户端：已按适用端过滤，含分组节点） */
  menus: MenuFunction[]
  /** 已勾选的菜单配置（含每个功能点的读 / 写数据范围） */
  value: MenuGrant[]
  onChange: (grants: MenuGrant[]) => void
  /** 内置非保护角色只读 */
  disabled?: boolean
  /** 展开折叠令牌：奇数=全部展开、偶数（>0）=全部折叠（由弹窗「全部展开 / 全部折叠」触发） */
  expandAllToken?: number
  /** 菜单 / 路径搜索关键词（仅过滤展示，不影响已勾选数据） */
  keyword?: string
  /** 「指定部门」候选项（本租户启用状态的组织节点） */
  deptOptions: { label: string; value: string }[]
}

/** 勾选功能点后的默认数据范围：读「本部门」、写「仅本人」（§5.5-1 五档） */
const DEFAULT_READ: DataScope = 'dept'
const DEFAULT_WRITE: DataScope = 'self'

/**
 * 租户角色表单 · 菜单勾选树 + 数据范围（业务 PRD §5.4 / §5.5）。
 * 按「角色 × 功能点」配置读、写各一档；写范围不得宽于读范围；指定部门另选部门。
 * 不适用数据范围的功能点（系统管理类）不出现范围控件。
 */
export default function TenantMenuTreePicker({
  menus,
  value,
  onChange,
  disabled = false,
  expandAllToken = 0,
  keyword = '',
  deptOptions,
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

  const scopeApplicable = (menuId: string) => DATA_SCOPE_MENU_IDS.includes(menuId)

  const toggle = (menu: MenuFunction) => {
    const existing = grantOf(menu.id)
    if (existing) {
      onChange(value.filter((grant) => grant.menuId !== menu.id))
      return
    }
    const next: MenuGrant = scopeApplicable(menu.id)
      ? { menuId: menu.id, readScope: DEFAULT_READ, writeScope: DEFAULT_WRITE, scopeDeptIds: [] }
      : { menuId: menu.id }
    onChange([...value, next])
  }

  const patchScope = (menuId: string, patch: Partial<MenuGrant>) => {
    onChange(value.map((grant) => (grant.menuId === menuId ? { ...grant, ...patch } : grant)))
  }

  const renderScope = (node: MenuFunction) => {
    const grant = grantOf(node.id)
    if (!scopeApplicable(node.id)) return null

    const read = grant?.readScope
    const write = grant?.writeScope

    if (disabled) {
      if (!grant) return null
      return (
        <span className="role-fn-scope">
          读 {read ? dataScopeText[read] : '—'} · 写 {write ? dataScopeText[write] : '—'}
        </span>
      )
    }

    // 未勾选：灰置占位下拉（仅样式展示，不参与配置）
    if (!read && !write) {
      return (
        <span className="role-fn-scope is-empty">
          <span>读</span>
          <Select value="" options={dataScopeOptions} disabled />
          <span>写</span>
          <Select value="" options={dataScopeOptions} disabled />
        </span>
      )
    }

    const needDept = read === 'specified' || write === 'specified'
    const readDeptIds = grant?.scopeDeptIds ?? []
    const writeDeptIds = grant?.writeDeptIds ?? readDeptIds
    const comparison = read && write ? compareScope(read, write, readDeptIds, writeDeptIds) : 'ok'
    const writeWider = comparison === 'wider'
    const incomparable = comparison === 'incomparable'

    return (
      <span className="role-fn-scope">
        <span>读</span>
        <Select
          value={read ?? ''}
          options={dataScopeOptions}
          onChange={(e) => patchScope(node.id, { readScope: (e.target.value || undefined) as DataScope | undefined })}
        />
        <span>写</span>
        <Select
          value={write ?? ''}
          options={dataScopeOptions}
          onChange={(e) => patchScope(node.id, { writeScope: (e.target.value || undefined) as DataScope | undefined })}
        />
        {needDept && (
          <MultiSelect
            value={grant?.scopeDeptIds ?? []}
            options={deptOptions}
            placeholder="选择指定部门"
            onChange={(ids) => patchScope(node.id, { scopeDeptIds: ids, writeDeptIds: ids })}
          />
        )}
        {writeWider && <span className="role-fn-scope-error">写范围不得宽于读范围</span>}
        {incomparable && (
          <span className="role-fn-scope-error">「指定部门」与其他档位无法比较宽窄，请两侧都选「指定部门」或都选部门档</span>
        )}
      </span>
    )
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
          {renderScope(node)}
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
