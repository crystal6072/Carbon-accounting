import { useEffect, useMemo, useRef, useState } from 'react'
import type { TreeOption } from '@/types'
import Icon from './Icon'
import { findTreeOption, flattenTreeOptions } from './CascaderSelect'

/** 搜索结果最大展示条数 */
const MAX_RESULT = 80

interface MultiCascaderSelectProps {
  value: string[]
  /** 多级选项：行业四级 / 分类三级 / 单位按类型分组 */
  options: TreeOption[]
  onChange: (value: string[]) => void
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  /** 是否允许勾选非末级节点；默认 false——父级仅用于逐级下钻 */
  allowParent?: boolean
  searchPlaceholder?: string
  emptyText?: string
  className?: string
}

/**
 * 多级分类下拉多选（自研组件，与 `CascaderSelect` 同交互口径）：
 * 逐级下钻 + 关键词搜索（命中完整路径 / 名称 / 编码），勾选结果以标签回显。
 */
export default function MultiCascaderSelect({
  value,
  options,
  onChange,
  placeholder = '请选择',
  disabled = false,
  invalid = false,
  allowParent = false,
  searchPlaceholder = '搜索名称 / 编码',
  emptyText = '暂无可选项',
  className = '',
}: MultiCascaderSelectProps) {
  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [stack, setStack] = useState<TreeOption[]>([])
  const rootRef = useRef<HTMLDivElement>(null)

  const flat = useMemo(() => flattenTreeOptions(options), [options])
  const selectedItems = useMemo(
    () => value.map((item) => findTreeOption(flat, item)).filter((item): item is NonNullable<typeof item> => !!item),
    [flat, value],
  )

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

  const toggle = (node: TreeOption) => {
    if (!isSelectable(node)) return
    onChange(value.includes(node.value) ? value.filter((item) => item !== node.value) : [...value, node.value])
  }

  const drill = (node: TreeOption) => setStack((prev) => [...prev, node])

  /** 搜索态点击父级：定位到其所在层级 */
  const locate = (path: TreeOption[]) => {
    setStack(path.slice(0, -1))
    setKeyword('')
  }

  const renderRow = (node: TreeOption, path: TreeOption[], searching: boolean) => {
    const hasChildren = !!node.children && node.children.length > 0
    const checked = value.includes(node.value)
    const disabledRow = !!node.disabled || (!allowParent && hasChildren && searching)
    return (
      <div
        key={path.map((n) => n.value).join('/')}
        className={[
          'cascader-option',
          checked ? 'cascader-option-active' : '',
          disabledRow ? 'cascader-option-disabled' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        title={path.map((n) => n.label).join(' / ')}
        onClick={() => {
          if (node.disabled) return
          if (searching && !isSelectable(node)) {
            locate(path)
            return
          }
          toggle(node)
        }}
      >
        <input
          type="checkbox"
          className="cascader-option-check"
          checked={checked}
          disabled={!!node.disabled}
          onChange={() => toggle(node)}
          onClick={(e) => e.stopPropagation()}
        />
        {searching && path.length > 1 && (
          <span className="cascader-option-path">{path.slice(0, -1).map((n) => n.label).join(' / ')}</span>
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

  return (
    <div
      className={['cascader-select', disabled ? 'cascader-select-disabled' : '', className].filter(Boolean).join(' ')}
      ref={rootRef}
    >
      <button
        type="button"
        className={['cascader-control', 'cascader-control-multi', open ? 'cascader-open' : '', invalid ? 'cascader-invalid' : '']
          .filter(Boolean)
          .join(' ')}
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="cascader-values">
          {selectedItems.length === 0 ? (
            <span className="cascader-placeholder">{placeholder}</span>
          ) : (
            selectedItems.map((item) => (
              <span className="cascader-tag" key={item.node.value} title={item.pathText}>
                {item.node.label}
              </span>
            ))
          )}
        </span>
        <span className="cascader-suffix">
          {selectedItems.length > 0 && !disabled && (
            <span
              className="cascader-clear"
              role="presentation"
              onClick={(e) => {
                e.stopPropagation()
                onChange([])
              }}
            >
              清空
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
              {results.slice(0, MAX_RESULT).map((item) => renderRow(item.node, item.path, true))}
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
                {currentNodes.map((node) => renderRow(node, [...stack, node], false))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
