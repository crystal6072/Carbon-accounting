import type { ReactNode } from 'react'

export type TagTone = 'default' | 'success' | 'warning' | 'info' | 'error'

interface TagProps {
  tone?: TagTone
  children: ReactNode
}

export default function Tag({ tone = 'default', children }: TagProps) {
  return <span className={['tag', tone === 'default' ? '' : `tag-${tone}`].filter(Boolean).join(' ')}>{children}</span>
}
