import type { SelectOption, TagTone } from '@/shared/components'
import type { BambooCarbonCategory, BambooCarbonTopic, BambooCarbonTopicStatus } from '@/types'

/** 所属分类（Value 1~5，按业务演示顺序排序） */
export const BAMBOO_CATEGORY_OPTIONS: SelectOption[] = [
  { label: '碳固存', value: '1' },
  { label: '碳循环', value: '2' },
  { label: '生物质碳排放', value: '3' },
  { label: '核算指南与工具', value: '4' },
  { label: '行业动态与政策', value: '5' },
]

export const BAMBOO_CATEGORY_LABEL: Record<BambooCarbonCategory, string> = {
  '1': '碳固存',
  '2': '碳循环',
  '3': '生物质碳排放',
  '4': '核算指南与工具',
  '5': '行业动态与政策',
}

export const BAMBOO_STATUS_LABEL: Record<BambooCarbonTopicStatus, string> = {
  published: '已发布',
  draft: '草稿',
}

const STATUS_TONE: Record<BambooCarbonTopicStatus, TagTone> = {
  published: 'success',
  draft: 'default',
}

export const bambooStatusTone = (status: BambooCarbonTopicStatus): TagTone => STATUS_TONE[status] ?? 'default'

/** 来源标注：知识内容统一由平台运营维护发布，不存在企业私有文章 */
export const ownerText = (_topic: Pick<BambooCarbonTopic, 'tenantId'>): string => '平台官方'

export const ownerTone = (_topic: Pick<BambooCarbonTopic, 'tenantId'>): TagTone => 'primary'

/** 业务前端卡片角标：核算指南与工具(4) 有附件则打「📎 附件」，行业动态与政策(5) 打「📰 资讯」 */
export interface CardBadge {
  text: string
  cls: string
}

export const bambooCardBadge = (topic: Pick<BambooCarbonTopic, 'category' | 'attachments' | 'link'>): CardBadge | null => {
  if (topic.category === '5') return { text: '📰 资讯', cls: 'badge-news' }
  if (topic.category === '4' && topic.attachments?.length) return { text: '📎 附件', cls: 'badge-attach' }
  if (topic.link?.trim()) return { text: '🔗 原文', cls: 'badge-link' }
  return null
}
