import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './RowActions.css'

export interface RowAction {
  key: string
  label: ReactNode
  onClick: () => void
  /** 破坏性操作（停用 / 移出 / 注销等）标红 */
  danger?: boolean
  disabled?: boolean
  title?: string
  /** 批注锚点（data-ann-target）；未显式给且传了 annPrefix 时按 annPrefix + key 生成 */
  annTarget?: string
}

interface RowActionsProps {
  actions: RowAction[]
  /** 直接展示的操作数，其余收进「更多」下拉；默认 3 */
  maxVisible?: number
  moreText?: string
  /** 批注锚点前缀，如 `account.row.` */
  annPrefix?: string
}

const PANEL_MIN_WIDTH = 128
const ITEM_HEIGHT = 34
const PANEL_PADDING = 8

/**
 * 列表行操作：前 maxVisible 个直出，其余收进「更多」下拉。
 *
 * 交互约定（各列表共用，避免逐页各写一套导致口径漂移）：
 * - 高频操作直出（查看 / 编辑 / 停用·启用），低频与破坏性操作收进「更多」（权限 / 重置密码 / 移出）；
 * - 菜单面板 Portal 到 body 并用 fixed 定位，避免被表格容器的 overflow 裁剪；
 * - 贴近视口底部时自动向上展开，点击外部 / Esc / 滚动即收起。
 */
export default function RowActions({ actions, maxVisible = 3, moreText = '更多', annPrefix }: RowActionsProps) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!pos) return
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      // 触发按钮自身不算「外部点击」：否则先关后开会导致二次点击无法收起
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      setPos(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPos(null)
    }
    const onDismiss = () => setPos(null)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onDismiss, true)
    window.addEventListener('resize', onDismiss)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onDismiss, true)
      window.removeEventListener('resize', onDismiss)
    }
  }, [pos])

  const visible = actions.slice(0, maxVisible)
  const overflow = actions.slice(maxVisible)
  const targetOf = (action: RowAction) => action.annTarget ?? (annPrefix ? `${annPrefix}${action.key}` : undefined)

  const toggle = () => {
    if (pos) {
      setPos(null)
      return
    }
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const panelHeight = overflow.length * ITEM_HEIGHT + PANEL_PADDING
    const openUp = rect.bottom + 4 + panelHeight > window.innerHeight
    setPos({
      top: openUp ? Math.max(8, rect.top - panelHeight - 4) : rect.bottom + 4,
      left: Math.max(8, Math.min(rect.right - PANEL_MIN_WIDTH, window.innerWidth - PANEL_MIN_WIDTH - 8)),
    })
  }

  const itemProps = (action: RowAction) => ({
    ...(targetOf(action) ? { 'data-ann-target': targetOf(action) } : {}),
  })

  return (
    <span className="row-actions">
      {visible.map((action) => (
        <button
          key={action.key}
          type="button"
          className={`link${action.danger ? ' link-danger' : ''}`}
          disabled={action.disabled}
          title={action.title}
          {...itemProps(action)}
          onClick={action.onClick}
        >
          {action.label}
        </button>
      ))}
      {overflow.length > 0 && (
        <span className="row-actions-more">
          <button
            ref={triggerRef}
            type="button"
            className={`link row-actions-more-trigger${pos ? ' is-open' : ''}`}
            onClick={toggle}
          >
            {moreText} ▾
          </button>
          {pos &&
            createPortal(
              <div
                ref={menuRef}
                className="row-actions-menu"
                style={{ top: pos.top, left: pos.left, minWidth: PANEL_MIN_WIDTH }}
              >
                {overflow.map((action) => (
                  <button
                    key={action.key}
                    type="button"
                    className={`row-actions-menu-item${action.danger ? ' is-danger' : ''}`}
                    disabled={action.disabled}
                    title={action.title}
                    {...itemProps(action)}
                    onClick={() => {
                      setPos(null)
                      action.onClick()
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>,
              document.body,
            )}
        </span>
      )}
    </span>
  )
}
