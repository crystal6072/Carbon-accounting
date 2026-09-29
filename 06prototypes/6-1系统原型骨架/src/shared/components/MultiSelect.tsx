import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'

export interface MultiSelectOption {
  label: string
  value: string
}

interface MultiSelectProps {
  value: string[]
  options: MultiSelectOption[]
  placeholder?: string
  disabled?: boolean
  onChange: (value: string[]) => void
}

/**
 * 下拉多选（自研轻量组件）：收起时以标签展示已选，点击展开勾选面板，支持一键清空。
 * 本期不做搜索与全选；点击外部或按 Esc 关闭。
 */
export default function MultiSelect({
  value,
  options,
  placeholder = '请选择',
  disabled = false,
  onChange,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

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

  const selectedOptions = options.filter((option) => value.includes(option.value))

  const toggle = (optionValue: string) => {
    onChange(value.includes(optionValue) ? value.filter((item) => item !== optionValue) : [...value, optionValue])
  }

  return (
    <div className={['multi-select', disabled ? 'multi-select-disabled' : ''].filter(Boolean).join(' ')} ref={rootRef}>
      <button
        type="button"
        className={['multi-select-control', open ? 'multi-select-open' : ''].filter(Boolean).join(' ')}
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="multi-select-values">
          {selectedOptions.length === 0 ? (
            <span className="multi-select-placeholder">{placeholder}</span>
          ) : (
            selectedOptions.map((option) => (
              <span className="multi-select-tag" key={option.value}>
                {option.label}
              </span>
            ))
          )}
        </span>
        <span className="multi-select-suffix">
          {selectedOptions.length > 0 && !disabled && (
            <span
              className="multi-select-clear"
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
        <div className="multi-select-panel">
          {options.length === 0 && <div className="multi-select-empty">暂无可选项</div>}
          {options.map((option) => (
            <label className="multi-select-option" key={option.value}>
              <input type="checkbox" checked={value.includes(option.value)} onChange={() => toggle(option.value)} />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
