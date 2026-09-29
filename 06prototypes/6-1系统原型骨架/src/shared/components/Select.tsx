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
}

export default function Select({
  options,
  placeholder,
  invalid,
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
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
