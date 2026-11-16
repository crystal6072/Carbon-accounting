import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@/shared/components'

interface TenantDrawerProps {
  open: boolean
  title: ReactNode
  onClose: () => void
  /** 抽屉宽度（px），默认 520 */
  width?: number
  /** 底部操作区 */
  footer?: ReactNode
  children: ReactNode
  /** 是否显示遮罩（默认 true） */
  mask?: boolean
}

/**
 * 右侧滑出抽屉（模块授权等主入口使用）。
 * 通过 Portal 挂载到 body，遮罩点击 / Esc 关闭，滚动隔离在抽屉内部。
 */
export default function TenantDrawer({ open, title, onClose, width = 520, footer, children, mask = true }: TenantDrawerProps) {
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
    <div className={`tenant-drawer-root${mask ? '' : ' no-mask'}`}>
      {mask && <div className="tenant-drawer-mask" onMouseDown={onClose} />}
      <aside className="tenant-drawer" style={{ width }} role="dialog" aria-modal="true">
        <header className="tenant-drawer-header">
          <div className="tenant-drawer-title">{title}</div>
          <button type="button" className="tenant-drawer-close" aria-label="关闭" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        </header>
        <div className="tenant-drawer-body">{children}</div>
        {footer && <footer className="tenant-drawer-footer">{footer}</footer>}
      </aside>
    </div>,
    document.body,
  )
}
