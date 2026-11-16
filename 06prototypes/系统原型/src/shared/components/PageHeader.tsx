import type { ReactNode } from 'react'
import Button from './Button'
import Icon from './Icon'

interface PageHeaderProps {
  breadcrumb: string[]
  /** 页面标题：文案或节点（如带批注锚点的标题） */
  title: ReactNode
  /** 页面副标题说明（已按需求全局下线，不再渲染；保留入参兼容既有调用） */
  description?: string
  actions?: ReactNode
  /** 返回动作：以按钮形式渲染在页头操作区最左侧 */
  onBack?: () => void
}

export default function PageHeader({ breadcrumb, title, actions, onBack }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div>
        <div className="breadcrumb">
          {breadcrumb.map((item, index) => (
            <span key={item} className="flex gap-xs">
              {index > 0 && <span className="breadcrumb-sep">/</span>}
              <span className={index === breadcrumb.length - 1 ? 'breadcrumb-current' : undefined}>{item}</span>
            </span>
          ))}
        </div>
        <div className="page-title">{title}</div>
      </div>
      {(onBack || actions) && (
        <div className="page-actions">
          {onBack && (
            <Button onClick={onBack}>
              <Icon name="arrowLeft" size={14} />
              返回
            </Button>
          )}
          {actions}
        </div>
      )}
    </div>
  )
}
