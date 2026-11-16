import type { TagTone } from '@/shared/components'
import type { BaselineStage, Boundary, DataSource } from '@/mock/baselines'
import { boundaryLabelOf } from '@/mock'

/* ============================ 数据来源 ============================ */

export const DATA_SOURCE_TEXT: Record<DataSource, string> = {
  system: '系统内置',
  org: '组织自建',
}

export const DATA_SOURCE_TONE: Record<DataSource, TagTone> = {
  system: 'info',
  org: 'default',
}

/* ============================ 系统边界（来自系统边界字典） ============================ */

/** 边界编码 → 字典名称 */
export const boundaryText = (code: string): string => boundaryLabelOf(code)
/** 边界标签统一用中性色调（字典项无状态含义） */
export const boundaryTone = (_code: string): TagTone => 'default'

/* ============================ 列表筛选下拉 ============================ */

export const DATA_SOURCE_SELECT_OPTIONS = [
  { value: '', label: '全部' },
  { value: 'system', label: '系统内置' },
  { value: 'org', label: '组织自建' },
]

/* ============================ 数值格式化 ============================ */

/** 保留 n 位小数，缺失显示 - */
export function numText(value: number | undefined, digits = 2): string {
  if (value === undefined || Number.isNaN(value)) return '-'
  return value.toFixed(digits)
}

export function pctText(value: number | undefined, digits = 1): string {
  if (value === undefined || Number.isNaN(value)) return '-'
  return `${(value * 100).toFixed(digits)}%`
}

export function dateText(value: string | undefined): string {
  return value || '-'
}

/* ============================ 阶段聚合计算 ============================ */

/** 求和一级阶段排放 */
export function sumStageEmission(stages: BaselineStage[]): number {
  return stages.filter((s) => s.stageLevel === 1).reduce((acc, s) => acc + (s.stageEmission || 0), 0)
}

/** 计算各阶段占比（基于传入的基线总值口径） */
export function computeShares(stages: BaselineStage[], total: number): BaselineStage[] {
  return stages.map((s) => ({
    ...s,
    stageShare: total > 0 ? (s.stageEmission || 0) / total : 0,
  }))
}

/** 覆盖率：已填一级阶段数 / 应填一级阶段数 */
export function coverage(stages: BaselineStage[]): { filled: number; total: number } {
  const level1 = stages.filter((s) => s.stageLevel === 1)
  const filled = level1.filter((s) => (s.stageEmission || 0) > 0).length
  return { filled, total: level1.length }
}

/**
 * 超差提示（F-09 / D09）：以一级阶段权重为口径，先进值缺失或
 * (先进值-阶段排放)/阶段排放 绝对值 > 10% 即提示。返回提示文案数组。
 */
export function overDiffHints(stages: BaselineStage[]): string[] {
  const hints: string[] = []
  stages
    .filter((s) => s.stageLevel === 1 && (s.stageEmission || 0) > 0 && s.advancedValue !== undefined)
    .forEach((s) => {
      if (s.advancedValue === undefined || s.stageEmission === 0) return
      if (s.advancedValue === 0) {
        hints.push(`${s.stageName}：已填阶段排放但先进值缺失`)
        return
      }
      const diff = Math.abs(s.advancedValue - s.stageEmission) / s.stageEmission
      if (diff > 0.1) hints.push(`${s.stageName}：与先进值偏差 ${(diff * 100).toFixed(0)}%（阈值 10%）`)
    })
  return hints
}
