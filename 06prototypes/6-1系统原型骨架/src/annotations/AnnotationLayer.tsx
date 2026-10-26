import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAnnotationContext } from './AnnotationContext'
import { ANNOTATION_TARGET_ATTR } from './types'
import type { Annotation } from './types'
import { AnnotationCard, PRIORITY_TEXT } from './AnnotationCard'
import SystemAnnotationDrawer from './SystemAnnotationDrawer'
import './annotations.css'

interface BadgeInstance {
  target: string
  top: number
  left: number
}

interface PopoverState {
  target: string
  top: number
  left: number
}

/**
 * 批注展示层（作用域由 registry 按路由前缀解析）：
 * - 扫描 [data-ann-target] 锚点，在操作按钮旁渲染批注标记，点击查看详情（模块批注）；
 * - 右下角固定入口：
 *   · 统一开关（显示 / 隐藏批注）；
 *   · **系统批注**：全系统一套的跨模块口径，独立抽屉，任何页面可打开；
 *   · **全局批注**：当前模块的未匹配 / 文档级批注，仅在有批注作用域时出现。
 * 两类批注数据源、入口、抽屉完全分离，互不混用；展示层不触碰任何业务逻辑。
 */
export default function AnnotationLayer() {
  const location = useLocation()
  const { visible, toggleVisible, scope, targetMap, globalAnnotations, systemAnnotations, systemChapters } =
    useAnnotationContext()
  const inScope = !!scope

  const [badges, setBadges] = useState<BadgeInstance[]>([])
  const [popover, setPopover] = useState<PopoverState | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [systemOpen, setSystemOpen] = useState(false)
  const [expandedIds, setExpandedIds] = useState<string[]>([])
  const layerRef = useRef<HTMLDivElement>(null)

  const scan = useCallback(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(`[${ANNOTATION_TARGET_ATTR}]`))
    const found = new Map<string, BadgeInstance>()
    nodes.forEach((el) => {
      const target = el.getAttribute(ANNOTATION_TARGET_ATTR)
      if (!target || !targetMap.has(target)) return
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 && rect.height === 0) return
      if (rect.bottom < 0 || rect.top > window.innerHeight) return
      if (!found.has(target)) found.set(target, { target, top: rect.top, left: rect.right })
    })
    setBadges((prev) => {
      const same =
        prev.length === found.size &&
        prev.every((item, index) => {
          const next = found.get(item.target)
          return !!next && Math.abs(next.top - item.top) < 1 && Math.abs(next.left - item.left) < 1
        })
      return same ? prev : Array.from(found.values())
    })
  }, [targetMap])

  /* 可见时：定时扫描 + 滚动 / 尺寸变化重算；路由变化立即重扫 */
  useEffect(() => {
    if (!visible || !inScope) {
      setBadges([])
      setPopover(null)
      return
    }
    scan()
    const timer = window.setInterval(scan, 500)
    const onScrollOrResize = () => scan()
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [visible, inScope, scan])

  /* 路由变化：立即扫描（含渲染后一帧） */
  useEffect(() => {
    if (!visible || !inScope) return
    scan()
    const raf = window.requestAnimationFrame(scan)
    const timer = window.setTimeout(scan, 120)
    return () => {
      window.cancelAnimationFrame(raf)
      window.clearTimeout(timer)
    }
  }, [location.pathname, visible, inScope, scan])

  /* 打开弹窗 / 抽屉时关闭另一个；ESC 关闭 */
  useEffect(() => {
    if (!popover && !drawerOpen && !systemOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPopover(null)
        setDrawerOpen(false)
        setSystemOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [popover, drawerOpen, systemOpen])

  /* 点击批注层之外关闭 Popover */
  useEffect(() => {
    if (!popover) return
    const onMouseDown = (event: MouseEvent) => {
      const node = event.target as HTMLElement
      if (node.closest('.ann-badge') || node.closest('.ann-popover')) return
      setPopover(null)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [popover])

  /* 隐藏批注时收起抽屉，避免残留半开状态 */
  useEffect(() => {
    if (!visible) {
      setDrawerOpen(false)
      setSystemOpen(false)
      setPopover(null)
    }
  }, [visible])

  const openPopover = useCallback((badge: BadgeInstance) => {
    const width = 360
    const left = badge.left + 12 + width > window.innerWidth ? Math.max(8, badge.left - width - 12) : badge.left + 12
    setPopover({ target: badge.target, top: Math.min(badge.top + 8, window.innerHeight - 120), left })
  }, [])

  const popoverItems = useMemo(
    () => (popover ? targetMap.get(popover.target) ?? [] : []),
    [popover, targetMap],
  )

  const allGlobalIds = globalAnnotations.map((item) => item.id)
  const toggleExpand = (id: string) =>
    setExpandedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))

  return (
    <>
      {visible && inScope && (
        <div className="ann-layer" ref={layerRef}>
          {badges.map((badge) => {
            const items = targetMap.get(badge.target)
            if (!items || items.length === 0) return null
            return (
              <button
                key={badge.target}
                type="button"
                className="ann-badge"
                style={{ top: badge.top - 10, left: badge.left - 10 }}
                title={`查看批注（${items.length} 条）`}
                aria-label="查看批注"
                onClick={(event) => {
                  event.stopPropagation()
                  openPopover(badge)
                }}
              >
                注
                {items.length > 1 && <span className="ann-badge-count">{items.length}</span>}
              </button>
            )
          })}
        </div>
      )}

      {visible && popover && popoverItems.length > 0 && (
        <div className="ann-popover" style={{ top: popover.top, left: popover.left }}>
          <div className="ann-popover-head">
            <span>批注详情（{popoverItems.length}）</span>
            <button type="button" className="ann-popover-close" onClick={() => setPopover(null)}>
              ×
            </button>
          </div>
          <div className="ann-popover-body">
            {popoverItems.map((item: Annotation) => (
              <AnnotationCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      <div className="ann-dock">
        <button type="button" className="ann-dock-btn" onClick={toggleVisible}>
          {visible ? '隐藏批注' : '显示批注'}
        </button>
        {visible && (
          <button
            type="button"
            className="ann-dock-btn ann-dock-entry ann-dock-system"
            onClick={() => {
              setSystemOpen((prev) => !prev)
              setDrawerOpen(false)
              setPopover(null)
            }}
            title="跨模块的系统级口径（账号 / 租户 / 权限 / 三条业务链）"
          >
            系统批注({systemAnnotations.length})
          </button>
        )}
        {visible && inScope && (
          <button
            type="button"
            className="ann-dock-btn ann-dock-entry"
            onClick={() => {
              setDrawerOpen((prev) => !prev)
              setSystemOpen(false)
              setPopover(null)
            }}
            title="本模块的未匹配 / 文档级批注"
          >
            全局批注({globalAnnotations.length})
          </button>
        )}
      </div>

      {visible && systemOpen && (
        <SystemAnnotationDrawer chapters={systemChapters} onClose={() => setSystemOpen(false)} />
      )}

      {visible && inScope && drawerOpen && (
        <aside className="ann-drawer">
          <header className="ann-drawer-head">
            <div className="ann-sys-head-text">
              <span className="ann-drawer-title">全局批注（{globalAnnotations.length}）</span>
              <span className="ann-sys-head-sub">当前模块：{scope?.label} · 与「系统批注」相互独立</span>
            </div>
            <div className="ann-drawer-actions">
              <button type="button" onClick={() => setExpandedIds(allGlobalIds)}>
                全部展开
              </button>
              <button type="button" onClick={() => setExpandedIds([])}>
                全部收起
              </button>
              <button type="button" onClick={() => setDrawerOpen(false)}>
                关闭
              </button>
            </div>
          </header>
          <div className="ann-drawer-body">
            {globalAnnotations.length === 0 && <div className="ann-drawer-empty">暂无全局批注</div>}
            {globalAnnotations.map((item) => {
              const open = expandedIds.includes(item.id)
              return (
                <div key={item.id} className="ann-drawer-item">
                  <button
                    type="button"
                    className="ann-drawer-item-head"
                    onClick={() => toggleExpand(item.id)}
                    aria-expanded={open}
                  >
                    <span className="ann-drawer-item-title">{item.title}</span>
                    {item.code && <span className="ann-drawer-item-code">{item.code}</span>}
                    {item.priority && (
                      <span className={`ann-priority ann-priority-${item.priority}`}>
                        {PRIORITY_TEXT[item.priority]}
                      </span>
                    )}
                    <span className="ann-drawer-item-caret">{open ? '▾' : '▸'}</span>
                  </button>
                  {open && <AnnotationCard item={item} compact />}
                </div>
              )
            })}
          </div>
        </aside>
      )}
    </>
  )
}
