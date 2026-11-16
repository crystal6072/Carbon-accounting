import type { TagTone } from '@/shared/components'
import type { DataReport, ReportStatus } from '@/types/dataReport'

/** 企业端状态文案（提交即「审核中」） */
export const REPORT_STATUS_TEXT: Record<ReportStatus, string> = {
  draft: '草稿',
  reviewing: '审核中',
  rejected: '已驳回',
  archived: '已入库',
}

/** 平台端状态口径：待审核 / 已驳回 / 已入库（草稿只在企业侧） */
export const PLATFORM_STATUS_TEXT: Record<ReportStatus, string> = {
  draft: '草稿',
  reviewing: '待审核',
  rejected: '已驳回',
  archived: '已入库',
}

/**
 * 上报单状态展示口径：统一取状态字典（草稿 / 审核中 / 已驳回 / 已入库）。
 * 是否已随版本公示属于发布说明，不作为上报状态展示，避免出现「待公示 / 已公示」等状态。
 */
export function reportStatusText(
  report: DataReport,
  scope: 'enterprise' | 'platform' = 'enterprise',
): string {
  return (scope === 'platform' ? PLATFORM_STATUS_TEXT : REPORT_STATUS_TEXT)[report.status]
}

export const REPORT_STATUS_TONE: Record<ReportStatus, TagTone> = {
  draft: 'default',
  reviewing: 'warning',
  rejected: 'error',
  archived: 'success',
}

/** 状态流转展示顺序：草稿 → 审核中 → 已入库（已驳回为分支） */
export const REPORT_FLOW: ReportStatus[] = ['draft', 'reviewing', 'archived']

export function flowIndex(status: ReportStatus): number {
  if (status === 'rejected') return 1
  return REPORT_FLOW.indexOf(status)
}

/** 企业视角可读的「重新上报」提示 */
export function staleTextOf(report: DataReport): string {
  return report.staleHint || '核算记录已重算，请重新上报最新结果'
}

export function reportPeriodText(report: DataReport): string {
  return `${report.periodStart} ~ ${report.periodEnd}`
}

export function numFmt(value: number, digits = 4): string {
  if (!Number.isFinite(value)) return '-'
  return Number(value.toFixed(digits)).toString()
}

/** 一级阶段合计（审核对比用） */
export function firstStageSum(stages: { stageLevel: 1 | 2; stageEmission: number }[]): number {
  return stages.filter((s) => s.stageLevel === 1).reduce((sum, s) => sum + s.stageEmission, 0)
}

/** 企业标识脱敏预览（与 mock 的 maskedOrgLabel 同口径；页面展示用，避免直接引 mock） */
const REGION_GROUP: Record<string, string> = {
  福建省: '华东',
  浙江省: '华东',
  江西省: '华东',
  江苏省: '华东',
  安徽省: '华东',
  上海市: '华东',
  山东省: '华东',
  广东省: '华南',
  广西壮族自治区: '华南',
  海南省: '华南',
  北京市: '华北',
  天津市: '华北',
  河北省: '华北',
  河南省: '华中',
  湖北省: '华中',
  湖南省: '华中',
  四川省: '西南',
  重庆市: '西南',
  云南省: '西南',
  陕西省: '西北',
  辽宁省: '东北',
}

export function regionGroupText(regionName: string): string {
  const province = regionName.split(/\s*\/\s*/)[0]
  return REGION_GROUP[province] ?? '其他'
}

export function maskedOrgPreview(regionName: string): string {
  return `某${regionGroupText(regionName)}地区企业`
}

/** 列表区域列：只显示末级区县，完整路径放 title */
export function regionShortText(regionName: string): string {
  if (!regionName) return ''
  const parts = regionName.split(/\s*\/\s*/).filter(Boolean)
  return parts[parts.length - 1] ?? regionName
}
