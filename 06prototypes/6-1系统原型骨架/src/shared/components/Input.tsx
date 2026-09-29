import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export default function Input({ invalid, className = '', ...rest }: InputProps) {
  return <input className={['input', invalid ? 'input-error' : '', className].filter(Boolean).join(' ')} {...rest} />
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export function Textarea({ invalid, className = '', ...rest }: TextareaProps) {
  return (
    <textarea
      className={['textarea', invalid ? 'input-error' : '', className].filter(Boolean).join(' ')}
      {...rest}
    />
  )
}
