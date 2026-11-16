interface TenantTabItem {
  key: string
  label: string
  /** 右上角提示条数（如成员数量） */
  badge?: string | number
}

interface TenantTabsProps {
  items: TenantTabItem[]
  active: string
  onChange: (key: string) => void
  /** 额外的右侧操作区（如编辑按钮） */
  extra?: React.ReactNode
}

/** 受控顶部分段 Tab（详情页 / 编辑页复用）。 */
export default function TenantTabs({ items, active, onChange, extra }: TenantTabsProps) {
  return (
    <div className="tenant-tabs" role="tablist">
      <div className="tenant-tabs-list">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active === item.key}
            className={`tenant-tab${active === item.key ? ' is-active' : ''}`}
            onClick={() => onChange(item.key)}
          >
            {item.label}
            {item.badge !== undefined && item.badge !== '' && (
              <span className="tenant-tab-badge">{item.badge}</span>
            )}
          </button>
        ))}
      </div>
      {extra && <div className="tenant-tabs-extra">{extra}</div>}
    </div>
  )
}
