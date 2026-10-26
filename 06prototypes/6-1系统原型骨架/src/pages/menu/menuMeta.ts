import type { EnableStatus } from '@/types'
import type { TagTone } from '@/shared/components'

/** 菜单状态文案 */
export const menuStatusText: Record<EnableStatus, string> = {
  enabled: '启用',
  disabled: '停用',
}

/** 菜单状态色调 */
export const menuStatusTone: Record<EnableStatus, TagTone> = {
  enabled: 'success',
  disabled: 'warning',
}
