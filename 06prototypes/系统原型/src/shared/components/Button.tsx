import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'default' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'default' | 'small'
  block?: boolean
  loading?: boolean
  children?: ReactNode
}

export default function Button({
  variant = 'default',
  size = 'default',
  block = false,
  loading = false,
  className = '',
  type = 'button',
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const cls = [
    'btn',
    `btn-${variant}`,
    size === 'small' ? 'btn-sm' : '',
    block ? 'btn-block' : '',
    loading ? 'btn-loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button type={type} className={cls} disabled={disabled || loading} {...rest}>
      {children}
    </button>
  )
}
