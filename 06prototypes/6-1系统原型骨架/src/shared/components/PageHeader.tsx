import type { ReactNode } from 'react'

interface PageHeaderProps {
  breadcrumb: string[]
  title: string
  description?: string
  actions?: ReactNode
  /** 返回动作：渲染在面包屑左侧（页面左上角） */
  onBack?: () => void
}

export default function PageHeader({ breadcrumb, title, description, actions, onBack }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div>
        <div className="breadcrumb">
          {onBack && (
            <button type="button" className="page-back" onClick={onBack}>
              ‹ 返回
            </button>
          )}
          {breadcrumb.map((item, index) => (
            <span key={item} className="flex gap-xs">
              {(index > 0 || onBack) && <span className="breadcrumb-sep">/</span>}
              <span className={index === breadcrumb.length - 1 ? 'breadcrumb-current' : undefined}>{item}</span>
            </span>
          ))}
        </div>
        <div className="page-title">{title}</div>
        {description && <div className="page-desc">{description}</div>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}
