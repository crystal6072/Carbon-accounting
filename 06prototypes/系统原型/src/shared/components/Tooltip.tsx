import { useState, type ReactNode } from 'react'

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  placement?: 'top' | 'bottom'
}

/**
 * 轻量悬浮提示（Hover Tooltip）。用于按钮防错、字段说明等。
 * 内容始终通过 children 所在容器定位，气泡用 fixed 避免被 overflow 裁剪。
 */
export default function Tooltip({ content, children, placement = 'top' }: TooltipProps) {
  const [show, setShow] = useState(false)
  if (!content) return <>{children}</>
  return (
    <span className="tooltip-wrap" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && <span className={`tooltip-bubble tooltip-${placement}`}>{content}</span>}
    </span>
  )
}
