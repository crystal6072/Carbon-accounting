import type { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  required?: boolean
  error?: string
  /** 字段提示（已按需求全局下线，不再渲染；保留入参兼容既有调用） */
  hint?: string
  /** 占满一行（默认跨两列，配合 .form-grid 使用） */
  full?: boolean
  /** 批注锚点（可选，挂到字段根节点，供批注层定位） */
  annTarget?: string
  children: ReactNode
}

export default function FormField({ label, required, error, full, annTarget, children }: FormFieldProps) {
  return (
    <div
      className={['form-item', full ? 'form-item-full' : ''].filter(Boolean).join(' ')}
      {...(annTarget ? { 'data-ann-target': annTarget } : {})}
    >
      <label className={['form-label', required ? 'required' : ''].filter(Boolean).join(' ')}>{label}</label>
      {children}
      {error ? <span className="form-error">{error}</span> : null}
    </div>
  )
}
