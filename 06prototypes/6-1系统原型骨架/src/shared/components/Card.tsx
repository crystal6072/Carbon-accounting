import type { ReactNode } from 'react'

interface CardProps {
  title?: ReactNode
  extra?: ReactNode
  /** 内容区自带 padding，默认 true；分栏工作台等场景可关闭 */
  padded?: boolean
  className?: string
  children: ReactNode
}

export default function Card({ title, extra, padded = true, className = '', children }: CardProps) {
  return (
    <div className={['card', className].filter(Boolean).join(' ')}>
      {title && (
        <div className="card-title flex-between">
          <span>{title}</span>
          {extra}
        </div>
      )}
      {padded ? <div className="card-body">{children}</div> : children}
    </div>
  )
}
