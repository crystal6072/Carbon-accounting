import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon'

interface ModalProps {
  open: boolean
  /** 弹窗标题：文案或节点（如带批注锚点的标题） */
  title: ReactNode
  /** 尺寸：sm 420 / default 560 / lg 720 / xl 1080 */
  size?: 'sm' | 'default' | 'lg' | 'xl'
  onClose: () => void
  footer?: ReactNode
  /** 弹窗 / 内容区 / 底栏附加类名：长表单可固定头尾、内容区独立滚动 */
  className?: string
  bodyClassName?: string
  footerClassName?: string
  children: ReactNode
  /**
   * 是否允许关闭（× / 遮罩 / Esc）。默认 true。
   * 新建成员的结果反馈页需强制管理员看完并主动点「完成并关闭」，故传 false。
   */
  closable?: boolean
}

/**
 * 轻量配置弹窗壳：标题 + × + 标题下分割线 + 内容区 + 底栏上分割线。
 * 点击遮罩或按 Esc 关闭（closable = false 时禁用）。
 */
export default function Modal({
  open,
  title,
  size = 'default',
  onClose,
  footer,
  className,
  bodyClassName,
  footerClassName,
  children,
  closable = true,
}: ModalProps) {
  useEffect(() => {
    if (!open || !closable) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose, closable])

  if (!open) return null

  const sizeCls =
    size === 'sm' ? 'modal-sm' : size === 'lg' ? 'modal-lg' : size === 'xl' ? 'modal-xl' : ''

  return createPortal(
    <div className="modal-mask" onMouseDown={(e) => e.target === e.currentTarget && closable && onClose()}>
      <div className={['modal', sizeCls, className].filter(Boolean).join(' ')} role="dialog" aria-modal="true">
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          {closable && (
            <button className="modal-close" type="button" aria-label="关闭" onClick={onClose}>
              <Icon name="close" size={16} />
            </button>
          )}
        </div>
        <div className={['modal-body', bodyClassName].filter(Boolean).join(' ')}>{children}</div>
        {footer && <div className={['modal-footer', footerClassName].filter(Boolean).join(' ')}>{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
