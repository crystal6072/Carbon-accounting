import type { SelectHTMLAttributes } from 'react'

export interface SelectOption {
  label: string
  value: string
  disabled?: boolean
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[]
  placeholder?: string
  invalid?: boolean
  /**
   * 选填下拉：渲染一个无文字的空占位项。
   * 下拉中不再出现「可不填 / 请选择」这类非业务选项，同时保留清空选择的能力。
   */
  emptyOption?: boolean
}

export default function Select({
  options,
  placeholder,
  invalid,
  emptyOption = false,
  className = '',
  value,
  ...rest
}: SelectProps) {
  return (
    <select
      className={['select', invalid ? 'select-error' : '', className].filter(Boolean).join(' ')}
      value={value ?? ''}
      {...rest}
    >
      {emptyOption && <option value="" />}
      {!emptyOption && placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
