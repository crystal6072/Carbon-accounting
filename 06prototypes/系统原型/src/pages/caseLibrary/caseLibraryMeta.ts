import type { SelectOption, TagTone } from '@/shared/components'
import type { CarbonCaseType, CarbonCaseStatus } from '@/types'

/** 案例类型：减排 / 核算 / 优化 */
export const CASE_TYPE_OPTIONS: SelectOption[] = [
  { label: '减排案例', value: 'reduction' },
  { label: '核算案例', value: 'accounting' },
  { label: '优化案例', value: 'optimization' },
]

export const CASE_TYPE_LABEL: Record<CarbonCaseType, string> = {
  reduction: '减排案例',
  accounting: '核算案例',
  optimization: '优化案例',
}

export const CASE_TYPE_TAG_TONE: Record<CarbonCaseType, TagTone> = {
  reduction: 'success',
  accounting: 'primary',
  optimization: 'warning',
}

export const CASE_STATUS_LABEL: Record<CarbonCaseStatus, string> = {
  published: '已发布',
  draft: '草稿',
}

const STATUS_TONE: Record<CarbonCaseStatus, TagTone> = {
  published: 'success',
  draft: 'default',
}

export const caseStatusTone = (status: CarbonCaseStatus): TagTone => STATUS_TONE[status] ?? 'default'

/** 来源标注：案例统一由平台运营维护发布，不存在企业私有案例 */
export const ownerText = (_item: { tenantId: string }): string => '平台官方'

export const ownerTone = (_item: { tenantId: string }): TagTone => 'primary'

/** 减排量展示：null → '-' */
export const reductionText = (value: number | null): string =>
  value == null ? '-' : `${value.toLocaleString('zh-CN', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} tCO2e`
