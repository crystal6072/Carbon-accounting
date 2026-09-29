import type { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  required?: boolean
  error?: string
  /** 字段提示（置于控件下方，优先级低于 error） */
  hint?: string
  /** 占满一行（默认跨两列，配合 .form-grid 使用） */
  full?: boolean
  children: ReactNode
}

export default function FormField({ label, required, error, hint, full, children }: FormFieldProps) {
  return (
    <div className={['form-item', full ? 'form-item-full' : ''].filter(Boolean).join(' ')}>
      <label className={['form-label', required ? 'required' : ''].filter(Boolean).join(' ')}>{label}</label>
      {children}
      {error ? <span className="form-error">{error}</span> : hint ? <span className="form-tip">{hint}</span> : null}
    </div>
  )
}
