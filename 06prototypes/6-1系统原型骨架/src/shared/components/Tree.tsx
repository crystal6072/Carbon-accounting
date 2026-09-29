import { useEffect, useState } from 'react'
import Icon from './Icon'

export interface TreeNodeData {
  id: string
  name: string
  /** 右侧附加计数等次要信息 */
  extra?: string
  children?: TreeNodeData[]
}

interface TreeProps {
  data: TreeNodeData[]
  selectedId: string
  onSelect: (node: TreeNodeData) => void
  /** 初始展开的节点 id */
  defaultExpandedIds?: string[]
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

export default function Tree({ data, selectedId, onSelect, defaultExpandedIds }: TreeProps) {
  const [expanded, setExpanded] = useState<string[]>(defaultExpandedIds ?? [])

  useEffect(() => {
    if (!defaultExpandedIds) return
    setExpanded((prev) => Array.from(new Set([...prev, ...defaultExpandedIds])))
  }, [defaultExpandedIds])

  const toggle = (id: string) => {
    setExpanded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
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
            <span className="tree-label">{node.name}</span>
            {node.extra && <span className="tree-count">{node.extra}</span>}
          </div>
          {hasChildren && isExpanded && <div>{renderNodes(node.children as TreeNodeData[], depth + 1)}</div>}
        </div>
      )
    })

  return <div className="tree">{renderNodes(data, 0)}</div>
}

export { collectExpandable }
