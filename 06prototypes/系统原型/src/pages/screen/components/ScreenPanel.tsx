import type { ReactNode } from 'react'

interface ScreenPanelProps {
  title: string
  subtitle?: string
  extra?: ReactNode
  className?: string
  /** 批注锚点（data-ann-target），仅用于原型批注定位 */
  annTarget?: string
  children: ReactNode
}

/** 大屏统一面板：标题 + 口径副标题 + 内容区 */
export default function ScreenPanel({ title, subtitle, extra, className, annTarget, children }: ScreenPanelProps) {
  return (
    <section className={`scr-panel${className ? ` ${className}` : ''}`}>
      <header className="scr-panel-head">
        <div className="scr-panel-title-wrap">
          <span className="scr-panel-title" data-ann-target={annTarget}>
            {title}
          </span>
          {subtitle && <span className="scr-panel-sub">{subtitle}</span>}
        </div>
        {extra && <div className="scr-panel-extra">{extra}</div>}
      </header>
      <div className="scr-panel-body">{children}</div>
    </section>
  )
}
