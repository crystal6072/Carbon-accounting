import type { CSSProperties, ReactNode } from 'react'

export type TagTone = 'default' | 'primary' | 'success' | 'warning' | 'info' | 'error'

interface TagProps {
  tone?: TagTone
  className?: string
  style?: CSSProperties
  children: ReactNode
}

export default function Tag({ tone = 'default', className = '', style, children }: TagProps) {
  return (
    <span className={['tag', tone === 'default' ? '' : `tag-${tone}`, className].filter(Boolean).join(' ')} style={style}>
      {children}
    </span>
  )
}
