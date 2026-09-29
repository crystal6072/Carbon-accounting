import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon'

interface ModalProps {
  open: boolean
  title: string
  /** 尺寸：sm 420 / default 560 / lg 720 */
  size?: 'sm' | 'default' | 'lg'
  onClose: () => void
  footer?: ReactNode
  children: ReactNode
}

/**
 * 轻量配置弹窗壳：标题 + × + 标题下分割线 + 内容区 + 底栏上分割线。
 * 点击遮罩或按 Esc 关闭。
 */
export default function Modal({ open, title, size = 'default', onClose, footer, children }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const sizeCls = size === 'sm' ? 'modal-sm' : size === 'lg' ? 'modal-lg' : ''

  return createPortal(
    <div className="modal-mask" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={['modal', sizeCls].filter(Boolean).join(' ')} role="dialog" aria-modal="true">
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close" type="button" aria-label="关闭" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
