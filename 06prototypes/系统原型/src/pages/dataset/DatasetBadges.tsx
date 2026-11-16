import { Tooltip } from '@/shared/components'
import type { RecordBadge } from './datasetMeta'

/** 列表 / 详情通用的记录标注徽标（标签不全 / 阶段缺失 / 阶段不闭合等） */
export function Badge({ badge }: { badge: RecordBadge }) {
  const toneCls =
    badge.tone === 'warning' ? 'ds-badge-warn' : badge.tone === 'error' ? 'ds-badge-error' : 'ds-badge-muted'
  const node = <span className={['ds-badge', toneCls].filter(Boolean).join(' ')}>{badge.text}</span>
  if (!badge.tip) return node
  return (
    <Tooltip content={badge.tip}>
      {node}
    </Tooltip>
  )
}
