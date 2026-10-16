import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { TreeOption } from '@/types'
import Icon from './Icon'

/** 拍平后的节点：携带「根 → 自身」的完整路径，供搜索与回显使用 */
export interface FlatTreeOption {
  node: TreeOption
  /** 从根节点到自身的节点链 */
  path: TreeOption[]
  /** 完整路径文案，如「制造业 / 木材加工和木、竹、藤、棕、草制品业 / 竹制品制造」 */
  pathText: string
}

/** 将多级选项拍平：保留层级路径，用于关键词搜索（可按名称、路径、编码命中） */
export function flattenTreeOptions(options: TreeOption[], parents: TreeOption[] = []): FlatTreeOption[] {
  const result: FlatTreeOption[] = []
  options.forEach((node) => {
    const path = [...parents, node]
    result.push({ node, path, pathText: path.map((item) => item.label).join(' / ') })
    if (node.children && node.children.length > 0) {
      result.push(...flattenTreeOptions(node.children, path))
    }
  })
  return result
}

/**
 * 按 value 反查节点（回显完整路径用）。
 * 同名（同 value）节点优先返回**末级节点**，避免「其他农业」这类父子同名导致回显错级。
 */
export function findTreeOption(flat: FlatTreeOption[], value: string): FlatTreeOption | null {
  if (!value) return null
  const matched = flat.filter((item) => item.node.value === value)
  if (matched.length === 0) return null
  return matched.find((item) => !item.node.children || item.node.children.length === 0) ?? matched[0]
}

/** 收集某节点及其全部后代的 value（列表筛选「父级命中其下所有子级」用） */
export function collectTreeValues(options: TreeOption[], value: string): string[] {
  const flat = flattenTreeOptions(options)
  const target = findTreeOption(flat, value)
  if (!target) return []
  const values: string[] = []
  const walk = (node: TreeOption) => {
    values.push(node.value)
    node.children?.forEach(walk)
  }
  walk(target.node)
  return values
}

/** 搜索结果最大展示条数，避免超大数据量下拉卡顿 */
const MAX_RESULT = 80

interface CascaderSelectProps {
  value: string
  /** 多级选项：行业四级 / 分类三级 / 单位按类型分组 */
  options: TreeOption[]
  /** 选中回调：返回 value 与命中的选项节点（引用方按需取 label / path） */
  onChange: (value: string, option: TreeOption | null) => void
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  /** 是否允许选中非末级节点；默认 false——父级仅用于逐级下钻 */
  allowParent?: boolean
  /** 是否显示清空按钮，默认 true */
  allowClear?: boolean
  searchPlaceholder?: string
  emptyText?: string
  className?: string
}

/**
 * 多级分类下拉单选（自研组件）：
 * - 逐级下钻：点击父级进入下一级，面包屑可回退；点击末级完成选择；
 * - 关键词搜索：命中「完整路径 / 名称 / 编码」，结果直接展示所属层级；
 * - 收起态回显完整路径（悬停 title 可看全）；点击外部或 Esc 关闭。
 * **面板经 Portal 挂载到 body 并固定定位**：避免被表格滚动容器（overflow）裁剪，
 * 支持在表格单元格内正常展开；空间不足时自动向上翻转。
 */
export default function CascaderSelect({
  value,
  options,
  onChange,
  placeholder = '请选择',
  disabled = false,
  invalid = false,
  allowParent = false,
  allowClear = true,
  searchPlaceholder = '搜索名称 / 编码',
  emptyText = '暂无可选项',
  className = '',
}: CascaderSelectProps) {
  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  /** 当前下钻路径（面包屑） */
  const [stack, setStack] = useState<TreeOption[]>([])
  const rootRef = useRef<HTMLDivElement>(null)
  const controlRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  /** 面板固定定位坐标（测量后写入；null = 尚未测量，先隐藏避免闪烁） */
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null)

  const flat = useMemo(() => flattenTreeOptions(options), [options])
  const selected = useMemo(() => findTreeOption(flat, value), [flat, value])

  useEffect(() => {
    if (!open) return
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node
      // 面板已 Portal 到 body，需同时放过面板内部的点击
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpen(false)
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

  /** 面板定位：贴附控件下方，空间不足向上翻转，横向不超出视口 */
  const updatePosition = useCallback(() => {
    const control = controlRef.current
    const panel = panelRef.current
    if (!control || !panel) return
    const cRect = control.getBoundingClientRect()
    const pRect = panel.getBoundingClientRect()
    const margin = 4
    const width = Math.max(280, cRect.width)
    let top = cRect.bottom + margin
    if (top + pRect.height > window.innerHeight - 8) {
      const above = cRect.top - pRect.height - margin
      top = above >= 8 ? above : Math.max(8, window.innerHeight - pRect.height - 8)
    }
    let left = cRect.left
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - width - 8)
    }
    setCoords({ top, left, width })
  }, [])

  /** 打开 / 内容变化（搜索、下钻会改变面板高度）后重新定位 */
  useLayoutEffect(() => {
    if (!open) {
      setCoords(null)
      return
    }
    updatePosition()
  }, [open, keyword, stack, updatePosition])

  /** 滚动 / 缩放窗口时跟随定位（捕获阶段覆盖表格容器内部滚动） */
  useEffect(() => {
    if (!open) return
    const onScrollOrResize = () => updatePosition()
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [open, updatePosition])

  /** 关闭后重置搜索与下钻层级，下次打开回到一级 */
  useEffect(() => {
    if (open) return
    setKeyword('')
    setStack([])
  }, [open])

  const currentNodes = stack.length > 0 ? stack[stack.length - 1].children ?? [] : options

  const results = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    if (!kw) return []
    return flat.filter(
      (item) =>
        item.pathText.toLowerCase().includes(kw) || (item.node.extra ?? '').toLowerCase().includes(kw),
    )
  }, [flat, keyword])

  const isSelectable = (node: TreeOption) =>
    !node.disabled && (allowParent || !node.children || node.children.length === 0)

  const select = (node: TreeOption) => {
    if (!isSelectable(node)) return
    onChange(node.value, node)
    setOpen(false)
  }

  const drill = (node: TreeOption) => setStack((prev) => [...prev, node])

  /** 浏览态点击：父级下钻、末级选中 */
  const handleBrowseClick = (node: TreeOption) => {
    if (node.disabled) return
    if (!isSelectable(node)) {
      drill(node)
      return
    }
    select(node)
  }

  /** 搜索态点击：可选即选中；不可选（父级）则定位到其所在层级 */
  const handleResultClick = (item: FlatTreeOption) => {
    if (item.node.disabled) return
    if (!isSelectable(item.node)) {
      setStack(item.path.slice(0, -1))
      setKeyword('')
      return
    }
    select(item.node)
  }

  const renderRow = (item: FlatTreeOption, searching: boolean) => {
    const node = item.node
    const hasChildren = !!node.children && node.children.length > 0
    const active = selected?.node.value === node.value
    const disabledRow = !!node.disabled || (!allowParent && hasChildren && searching)
    return (
      <div
        key={item.path.map((n) => n.value).join('/')}
        className={[
          'cascader-option',
          active ? 'cascader-option-active' : '',
          disabledRow ? 'cascader-option-disabled' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        title={item.pathText}
        onClick={() => (searching ? handleResultClick(item) : handleBrowseClick(node))}
      >
        {searching && item.path.length > 1 && (
          <span className="cascader-option-path">{item.path.slice(0, -1).map((n) => n.label).join(' / ')}</span>
        )}
        <span className="cascader-option-label">{node.label}</span>
        {node.extra && <span className="cascader-option-extra">{node.extra}</span>}
        {hasChildren && !searching && (
          <span
            className="cascader-option-caret"
            role="presentation"
            onClick={(e) => {
              e.stopPropagation()
              drill(node)
            }}
          >
            <Icon name="chevronRight" size={14} />
          </span>
        )}
      </div>
    )
  }

  const searching = keyword.trim().length > 0

  const panel = (
    <div
      ref={panelRef}
      className="cascader-panel"
      style={{
        position: 'fixed',
        top: coords?.top ?? 0,
        left: coords?.left ?? 0,
        width: coords?.width ?? 280,
        zIndex: 1050,
        visibility: coords ? 'visible' : 'hidden',
      }}
    >
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
          {results.slice(0, MAX_RESULT).map((item) => renderRow(item, true))}
          {results.length > MAX_RESULT && (
            <div className="cascader-empty">仅显示前 {MAX_RESULT} 条，请细化关键词</div>
          )}
        </div>
      ) : (
        <>
          {stack.length > 0 && (
            <div className="cascader-crumbs">
              <button type="button" className="cascader-crumb" onClick={() => setStack([])}>
                全部
              </button>
              {stack.map((node, index) => (
                <span className="cascader-crumb-item" key={`${node.value}-${index}`}>
                  <Icon name="chevronRight" size={12} />
                  <button
                    type="button"
                    className="cascader-crumb"
                    onClick={() => setStack(stack.slice(0, index + 1))}
                  >
                    {node.label}
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="cascader-list">
            {currentNodes.length === 0 && <div className="cascader-empty">{emptyText}</div>}
            {currentNodes.map((node) =>
              renderRow({ node, path: [...stack, node], pathText: [...stack, node].map((n) => n.label).join(' / ') }, false),
            )}
          </div>
        </>
      )}
    </div>
  )

  return (
    <div
      className={['cascader-select', disabled ? 'cascader-select-disabled' : '', className].filter(Boolean).join(' ')}
      ref={rootRef}
    >
      {/* 回显只展示末级名称，完整路径作为 title 悬浮提示 */}
      <button
        ref={controlRef}
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
                onChange('', null)
              }}
            >
              <Icon name="close" size={12} />
            </span>
          )}
          <Icon name="chevronDown" size={14} />
        </span>
      </button>
      {/* 面板 Portal 到 body：避开滚动容器裁剪，空间不足自动翻转 */}
      {open && createPortal(panel, document.body)}
    </div>
  )
}
