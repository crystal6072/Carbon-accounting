import type { TagTone } from '@/shared/components'
import type { CarbonDetectionItem, ShelfStatus } from '@/types'

export const shelfStatusText: Record<ShelfStatus, string> = {
  on_shelf: '上架',
  off_shelf: '下架',
}

export const shelfStatusTone: Record<ShelfStatus, TagTone> = {
  on_shelf: 'success',
  off_shelf: 'default',
}

/** 仅「已下架」可删除（R-010，上架态隐藏删除入口） */
export const canDeleteDetection = (item: { status: ShelfStatus }) => item.status === 'off_shelf'
