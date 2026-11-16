import type { TenantModuleGroupNode } from '@/mock/menu'

interface TenantModuleTreeProps {
  groups: TenantModuleGroupNode[]
  codes: string[]
  onChange: (codes: string[]) => void
  /** 折叠状态由父级受控（抽屉 / 分步表单需与外层滚动隔离时） */
  collapsed?: Record<string, boolean>
  onToggleCollapse?: (id: string) => void
  /** 增加内滚动区域（max-height: 400px），用于分步表单最后一步 */
  scrollable?: boolean
  /** 显示全选 / 反选工具条（分步表单、编辑模块 Tab 使用） */
  toolbar?: boolean
  onSelectAll?: () => void
  onInvert?: () => void
}

/**
 * 租户模块授权树（按应用分组的复选树，纯展示 + 勾选回调）。
 * 复用于：列表页授权弹窗、详情页授权抽屉、新建分步表单 Step3、编辑页模块授权 Tab。
 * 逻辑（分组全选 / 单节点勾选）由本组件内部维护，父级只持有 codes 切片。
 */
export default function TenantModuleTree({
  groups,
  codes,
  onChange,
  collapsed,
  onToggleCollapse,
  scrollable,
  toolbar,
  onSelectAll,
  onInvert,
}: TenantModuleTreeProps) {
  const isCollapsed = (id: string) => (collapsed ? !!collapsed[id] : false)
  const toggleCollapse = (id: string) => onToggleCollapse?.(id)

  const toggle = (code: string) =>
    onChange(codes.includes(code) ? codes.filter((item) => item !== code) : [...codes, code])

  const groupChecked = (group: TenantModuleGroupNode) =>
    group.children.length > 0 && group.children.every((item) => codes.includes(item.id))

  const groupIndeterminate = (group: TenantModuleGroupNode) =>
    group.children.some((item) => codes.includes(item.id)) && !groupChecked(group)

  const toggleGroup = (group: TenantModuleGroupNode) => {
    const ids = group.children.map((item) => item.id)
    onChange(groupChecked(group) ? codes.filter((code) => !ids.includes(code)) : Array.from(new Set([...codes, ...ids])))
  }

  const totalMenus = groups.reduce((sum, group) => sum + group.children.length, 0)

  return (
    <div className="tenant-moduletree">
      {toolbar && (
        <div className="tenant-moduletree-toolbar">
          <span className="tenant-moduletree-count">
            已选 {codes.length}/{totalMenus}
          </span>
          <span className="tenant-moduletree-actions">
            <button type="button" className="link" onClick={onSelectAll}>
              全选
            </button>
            <button type="button" className="link" onClick={onInvert}>
              反选
            </button>
          </span>
        </div>
      )}

      <div className={scrollable ? 'tenant-tree tenant-tree-scroll' : 'tenant-tree'}>
        {groups.map((group) => {
          const collapsedNow = isCollapsed(group.id)
          const selected = group.children.filter((item) => codes.includes(item.id)).length
          return (
            <div key={group.id} className="tenant-tree-group">
              <div className="tenant-tree-head">
                <span
                  className={`tenant-tree-caret${collapsedNow ? ' is-collapsed' : ''}`}
                  onClick={() => toggleCollapse(group.id)}
                  aria-label={collapsedNow ? '展开' : '折叠'}
                >
                  ▾
                </span>
                <label className="tenant-tree-head-label">
                  <input
                    type="checkbox"
                    checked={groupChecked(group)}
                    ref={(el) => {
                      if (el) el.indeterminate = groupIndeterminate(group)
                    }}
                    onChange={() => toggleGroup(group)}
                  />
                  <span className="tenant-tree-name">{group.name}</span>
                </label>
                <span className={`tenant-tree-count${groupChecked(group) ? ' is-full' : ''}`}>
                  {selected}/{group.children.length}
                </span>
              </div>
              {!collapsedNow && (
                <div className="tenant-tree-children">
                  {group.children.map((item) => (
                    <label key={item.id} className={`tenant-tree-item${codes.includes(item.id) ? ' is-checked' : ''}`}>
                      <input type="checkbox" checked={codes.includes(item.id)} onChange={() => toggle(item.id)} />
                      <span>{item.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
