import { useEffect, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon'

export interface TreeNodeData {
  id: string
  name: string
  /** 右侧附加计数等次要信息（旧用法；统计信息建议改走 tooltip） */
  extra?: string
  /** 鼠标悬浮时展示的 Tooltip 气泡内容（如人数统计） */
  tooltip?: ReactNode
  children?: TreeNodeData[]
}

interface TreeProps {
  data: TreeNodeData[]
  selectedId: string
  onSelect: (node: TreeNodeData) => void
  /** 初始展开的节点 id */
  defaultExpandedIds?: string[]
  /** 受控展开节点 id（传入即受控，用于搜索自动展开）；不传则组件内部维护 */
  expandedIds?: string[]
  onExpandedChange?: (ids: string[]) => void
  /** 行右侧悬浮快捷操作 */
  renderActions?: (node: TreeNodeData) => ReactNode
}

/** 递归收集所有含子节点的 id，用于默认展开。 */
function collectExpandable(nodes: TreeNodeData[]): string[] {
  const ids: string[] = []
  const walk = (list: TreeNodeData[]) => {
    list.forEach((n) => {
      if (n.children && n.children.length > 0) {
        ids.push(n.id)
        walk(n.children)
      }
    })
  }
  walk(nodes)
  return ids
}

export default function Tree({
  data,
  selectedId,
  onSelect,
  defaultExpandedIds,
  expandedIds,
  onExpandedChange,
  renderActions,
}: TreeProps) {
  const controlled = expandedIds !== undefined
  const [innerExpanded, setInnerExpanded] = useState<string[]>(defaultExpandedIds ?? [])
  const [tip, setTip] = useState<{ content: ReactNode; top: number; left: number } | null>(null)

  useEffect(() => {
    if (controlled || !defaultExpandedIds) return
    setInnerExpanded((prev) => Array.from(new Set([...prev, ...defaultExpandedIds])))
  }, [defaultExpandedIds, controlled])

  const expanded = controlled ? (expandedIds as string[]) : innerExpanded

  const toggle = (id: string) => {
    const next = expanded.includes(id) ? expanded.filter((x) => x !== id) : [...expanded, id]
    if (controlled) onExpandedChange?.(next)
    else setInnerExpanded(next)
  }

  const showTip = (e: MouseEvent<HTMLDivElement>, content?: ReactNode) => {
    if (!content) return
    const rect = e.currentTarget.getBoundingClientRect()
    setTip({ content, top: rect.top, left: Math.min(rect.right + 8, window.innerWidth - 240) })
  }

  const renderNodes = (nodes: TreeNodeData[], depth: number) =>
    nodes.map((node) => {
      const hasChildren = !!node.children && node.children.length > 0
      const isExpanded = expanded.includes(node.id)
      const isActive = selectedId === node.id

      return (
        <div key={node.id}>
          <div
            className={['tree-row', isActive ? 'active' : ''].filter(Boolean).join(' ')}
            style={{ paddingLeft: 8 + depth * 16 }}
            onClick={() => onSelect(node)}
            onMouseEnter={(e) => showTip(e, node.tooltip)}
            onMouseLeave={() => setTip(null)}
          >
            <span
              className={['tree-caret', isExpanded ? 'expanded' : '', hasChildren ? '' : 'leaf']
                .filter(Boolean)
                .join(' ')}
              onClick={(e) => {
                if (!hasChildren) return
                e.stopPropagation()
                toggle(node.id)
              }}
            >
              <Icon name="chevronRight" size={14} />
            </span>
            <span className="tree-label" title={node.name}>{node.name}</span>
            {node.extra && <span className="tree-count">{node.extra}</span>}
            {renderActions && (
              <span className="tree-actions" onClick={(e) => e.stopPropagation()}>
                {renderActions(node)}
              </span>
            )}
          </div>
          {hasChildren && isExpanded && <div>{renderNodes(node.children as TreeNodeData[], depth + 1)}</div>}
        </div>
      )
    })

  return (
    <>
      <div className="tree" onMouseLeave={() => setTip(null)}>
        {renderNodes(data, 0)}
      </div>
      {tip &&
        createPortal(
          <div className="tree-tooltip-float" style={{ top: tip.top, left: tip.left }}>
            {tip.content}
          </div>,
          document.body,
        )}
    </>
  )
}

export { collectExpandable }
