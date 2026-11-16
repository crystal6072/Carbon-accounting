import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import Icon from '@/shared/components/Icon'

interface DrawerShellProps {
  open: boolean
  title: ReactNode
  subtitle?: ReactNode
  /** 抽屉宽度（px） */
  width?: number
  onClose: () => void
  footer?: ReactNode
  children: ReactNode
}

/**
 * 右侧抽屉壳（本模块自用）：遮罩 + 右滑面板 + 标题条 + 可滚动内容区 + 可选底栏。
 * Esc / 点击遮罩关闭。
 */
export default function DrawerShell({ open, title, subtitle, width = 560, onClose, footer, children }: DrawerShellProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="ds-drawer-mask" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ds-drawer" style={{ width }} role="dialog" aria-modal="true">
        <div className="ds-drawer-header">
          <div className="ds-drawer-title-wrap">
            <span className="ds-drawer-title">{title}</span>
            {subtitle ? <span className="ds-drawer-subtitle">{subtitle}</span> : null}
          </div>
          <button className="ds-drawer-close" type="button" aria-label="关闭" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className="ds-drawer-body">{children}</div>
        {footer ? <div className="ds-drawer-footer">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}
