import { useMemo, useState } from 'react'
import { AnnotationCard, PRIORITY_TEXT } from './AnnotationCard'
import type { SystemAnnotationChapter } from './systemAnnotations'

interface SystemAnnotationDrawerProps {
  chapters: SystemAnnotationChapter[]
  onClose: () => void
}

/**
 * 系统批注抽屉（独立于模块「全局批注」）：
 * - 左：章节导航（按评审文档章节组织）；
 * - 右：本章条目的可折叠列表，展开即看完整口径；
 * - 数据全部来自 systemAnnotations.ts，不读取任何模块的 globalAnnotations。
 */
export default function SystemAnnotationDrawer({ chapters, onClose }: SystemAnnotationDrawerProps) {
  const [activeId, setActiveId] = useState<string>(chapters[0]?.id ?? '')
  const [expandedIds, setExpandedIds] = useState<string[]>(() => {
    const first = chapters[0]?.annotations[0]?.id
    return first ? [first] : []
  })

  const active = useMemo(
    () => chapters.find((chapter) => chapter.id === activeId) ?? chapters[0],
    [chapters, activeId],
  )

  const total = useMemo(
    () => chapters.reduce((sum, chapter) => sum + chapter.annotations.length, 0),
    [chapters],
  )

  const switchChapter = (chapter: SystemAnnotationChapter) => {
    setActiveId(chapter.id)
    const first = chapter.annotations[0]?.id
    setExpandedIds(first ? [first] : [])
  }

  const toggle = (id: string) =>
    setExpandedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))

  if (!active) return null

  return (
    <aside className="ann-drawer ann-drawer-wide ann-sys-drawer">
      <header className="ann-drawer-head">
        <div className="ann-sys-head-text">
          <span className="ann-drawer-title">系统批注（{total}）</span>
          <span className="ann-sys-head-sub">源自《原型评审标注文档 v1.1》· 与各模块「全局批注」相互独立</span>
        </div>
        <div className="ann-drawer-actions">
          <button type="button" onClick={() => setExpandedIds(active.annotations.map((item) => item.id))}>
            全部展开
          </button>
          <button type="button" onClick={() => setExpandedIds([])}>
            全部收起
          </button>
          <button type="button" onClick={onClose}>
            关闭
          </button>
        </div>
      </header>

      <div className="ann-sys-body">
        <nav className="ann-sys-nav" aria-label="系统批注章节">
          {chapters.map((chapter) => (
            <button
              key={chapter.id}
              type="button"
              className={`ann-sys-nav-item${chapter.id === active.id ? ' is-active' : ''}`}
              onClick={() => switchChapter(chapter)}
              aria-current={chapter.id === active.id}
            >
              <span className="ann-sys-nav-label">{chapter.title}</span>
              <span className="ann-sys-nav-count">{chapter.annotations.length}</span>
            </button>
          ))}
        </nav>

        <div className="ann-sys-content">
          <div className="ann-sys-summary">
            <div className="ann-sys-summary-title">{active.title}</div>
            <p className="ann-sys-summary-text">{active.summary}</p>
          </div>

          {active.annotations.map((item) => {
            const open = expandedIds.includes(item.id)
            return (
              <div key={item.id} className="ann-drawer-item">
                <button
                  type="button"
                  className="ann-drawer-item-head"
                  onClick={() => toggle(item.id)}
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
      </div>

      <footer className="ann-sys-foot">
        本抽屉只放系统级口径（账号 / 租户 / 权限 / 三条业务链），页面级字段与操作说明请看元素旁的「注」标记。
      </footer>
    </aside>
  )
}
