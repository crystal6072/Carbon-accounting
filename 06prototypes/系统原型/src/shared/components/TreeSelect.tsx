import { useEffect, useMemo, useRef, useState } from 'react'
import type { TreeOption } from '@/types'
import Icon from './Icon'
import { findTreeOption, flattenTreeOptions } from './CascaderSelect'

/** 搜索结果最大展示条数，避免超大数据量下拉卡顿 */
const MAX_RESULT = 80

interface TreeSelectProps {
  value: string
  /** 分级选项（如产品分类树）；允许选中任意层级节点 */
  options: TreeOption[]
  onChange: (value: string, option: TreeOption | null) => void
  placeholder?: string
  /** 空值选项文案（如「无上级（一级分类）」）；不传则不提供空值选项 */
  noneLabel?: string
  disabled?: boolean
  invalid?: boolean
  /** 是否显示清空按钮，默认 false（空值统一走 noneLabel 选项） */
  allowClear?: boolean
  searchPlaceholder?: string
  emptyText?: string
  /** 批注锚点：供研发标注层定位 */
  annTarget?: string
  className?: string
}

/**
 * 分级树下拉（自研组件）：
 * - **可搜索**：命中「完整路径 / 名称 / 编码」，结果直接展示所属层级；
 * - **可按层级展开与收起**：每个节点用箭头逐级展开 / 收起，可选中任意层级节点；
 * - **默认收起**：打开时全部折叠，关闭后重置搜索词与展开状态；
 * - 点外部或 Esc 关闭；不改变原有点击行为。
 */
export default function TreeSelect({
  value,
  options,
  onChange,
  placeholder = '请选择',
  noneLabel,
  disabled = false,
  invalid = false,
  allowClear = false,
  searchPlaceholder = '搜索名称 / 编码',
  emptyText = '暂无可选项',
  annTarget,
  className = '',
}: TreeSelectProps) {
  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  /** 已展开的节点；打开时为空 = 全部收起 */
  const [expanded, setExpanded] = useState<string[]>([])
  const rootRef = useRef<HTMLDivElement>(null)

  const flat = useMemo(() => flattenTreeOptions(options), [options])
  const selected = useMemo(() => findTreeOption(flat, value), [flat, value])

  useEffect(() => {
    if (!open) return
    const onMouseDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  /* 关闭后重置搜索与展开状态：下次打开回到「全部收起」 */
  useEffect(() => {
    if (open) return
    setKeyword('')
    setExpanded([])
  }, [open])

  const searching = keyword.trim().length > 0

  const results = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    if (!kw) return []
    return flat.filter(
      (item) =>
        item.pathText.toLowerCase().includes(kw) || (item.node.extra ?? '').toLowerCase().includes(kw),
    )
  }, [flat, keyword])

  const toggle = (id: string) =>
    setExpanded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const select = (node: TreeOption | null) => {
    onChange(node ? node.value : '', node)
    setOpen(false)
  }

  const renderNodes = (nodes: TreeOption[], depth: number) =>
    nodes.map((node) => {
      const hasChildren = !!node.children && node.children.length > 0
      const isExpanded = expanded.includes(node.value)
      const active = value === node.value
      return (
        <div key={node.value}>
          <div
            className={['tree-row', active ? 'active' : ''].filter(Boolean).join(' ')}
            style={{ paddingLeft: 8 + depth * 16 }}
            onClick={() => select(node)}
          >
            <span
              className={['tree-caret', isExpanded ? 'expanded' : '', hasChildren ? '' : 'leaf']
                .filter(Boolean)
                .join(' ')}
              title={hasChildren ? (isExpanded ? '收起下级分类' : '展开下级分类') : undefined}
              onClick={(e) => {
                if (!hasChildren) return
                e.stopPropagation()
                toggle(node.value)
              }}
            >
              <Icon name="chevronRight" size={14} />
            </span>
            <span className="tree-label">{node.label}</span>
            {node.extra && <span className="tree-count">{node.extra}</span>}
          </div>
          {hasChildren && isExpanded && <div>{renderNodes(node.children as TreeOption[], depth + 1)}</div>}
        </div>
      )
    })

  return (
    <div
      className={['cascader-select', className].filter(Boolean).join(' ')}
      ref={rootRef}
      data-ann-target={annTarget}
    >
      <button
        type="button"
        className={['cascader-control', open ? 'cascader-open' : '', invalid ? 'cascader-invalid' : '']
          .filter(Boolean)
          .join(' ')}
        disabled={disabled}
        title={selected?.pathText}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={['cascader-value', selected ? '' : 'cascader-placeholder'].filter(Boolean).join(' ')}>
          {selected ? selected.node.label : placeholder}
        </span>
        <span className="cascader-suffix">
          {allowClear && !!value && !disabled && (
            <span
              className="cascader-clear"
              role="presentation"
              onClick={(e) => {
                e.stopPropagation()
                select(null)
              }}
            >
              <Icon name="close" size={12} />
            </span>
          )}
          <Icon name="chevronDown" size={14} />
        </span>
      </button>

      {open && (
        <div className="cascader-panel">
          <div className="cascader-search">
            <Icon name="search" size={14} />
            <input
              className="cascader-search-input"
              value={keyword}
              placeholder={searchPlaceholder}
              autoFocus
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
          {searching ? (
            <div className="cascader-list">
              {results.length === 0 && <div className="cascader-empty">未找到匹配项</div>}
              {results.slice(0, MAX_RESULT).map((item) => (
                <div
                  key={item.path.map((n) => n.value).join('/')}
                  className={['cascader-option', value === item.node.value ? 'cascader-option-active' : '']
                    .filter(Boolean)
                    .join(' ')}
                  title={item.pathText}
                  onClick={() => select(item.node)}
                >
                  {item.path.length > 1 && (
                    <span className="cascader-option-path">
                      {item.path.slice(0, -1).map((n) => n.label).join(' / ')}
                    </span>
                  )}
                  <span className="cascader-option-label">{item.node.label}</span>
                  {item.node.extra && <span className="cascader-option-extra">{item.node.extra}</span>}
                </div>
              ))}
              {results.length > MAX_RESULT && (
                <div className="cascader-empty">仅显示前 {MAX_RESULT} 条，请细化关键词</div>
              )}
            </div>
          ) : (
            <div className="cascader-list">
              {noneLabel && (
                <div
                  className={['cascader-option', value === '' ? 'cascader-option-active' : '']
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => select(null)}
                >
                  <span className="cascader-option-label">{noneLabel}</span>
                </div>
              )}
              {options.length === 0 && <div className="cascader-empty">{emptyText}</div>}
              {renderNodes(options, 0)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
