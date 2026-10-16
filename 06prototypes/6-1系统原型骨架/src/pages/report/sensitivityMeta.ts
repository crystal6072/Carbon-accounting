import type { PcfCaliberKey, PcfCaliberValues } from '@/types'
import type { ScenarioCalcStatus, SensitivityStatus } from '@/types/sensitivity'

/** 分析状态文案（字段清单 §8.1） */
export const SA_STATUS_TEXT: Record<SensitivityStatus, string> = {
  unfinished: '未完成',
  stale: '待更新',
  completed: '已完成',
}

/** 分析状态 Tag 主题色 */
export const SA_STATUS_THEME: Record<SensitivityStatus, 'default' | 'warning' | 'success'> = {
  unfinished: 'default',
  stale: 'warning',
  completed: 'success',
}

/** 情景核算状态文案（字段清单 §8.3） */
export const SA_CALC_STATUS_TEXT: Record<ScenarioCalcStatus, string> = {
  notCalc: '未核算',
  calculated: '已核算',
}

/** 数据项类型文案（引用核算项目字段清单 §6.1） */
export const SA_ITEM_TYPE_TEXT: Record<string, string> = {
  material: '原辅料',
  natural: '自然资源',
  energy: '能源及能源介质',
  product: '产品',
  intermediate: '中间产品',
  byproduct: '副产品',
  emission: '排放物',
}

/**
 * 排放量格式化：
 * - 0 / null → `0` / `-`；
 * - 极小 / 极大值用科学计数法（对齐竞品 `6.726E-7` 表达）；
 * - 其余按量级保留 3~4 位小数并去掉尾部 0。
 */
export function formatEmission(value?: number | null): string {
  if (value === null || value === undefined) return '-'
  if (value === 0) return '0'
  const abs = Math.abs(value)
  if (abs >= 1000 || abs < 0.001) return value.toExponential(3).replace('e', 'E')
  return String(Number(value.toFixed(4)))
}

/** 取某个口径的排放值 */
export function caliberValueOf(values: PcfCaliberValues | undefined, key: PcfCaliberKey): number {
  return values?.[key] ?? 0
}

/** 变化率样式：正增长红字 / 负增长绿字 / 0 灰字 */
export function deltaRateTone(deltaRate: number | null): 'up' | 'down' | 'flat' {
  if (deltaRate === null || deltaRate === 0) return 'flat'
  return deltaRate > 0 ? 'up' : 'down'
}

/** 情景对比强度：|Δ| 归一化到 0~100（相对最大敏感度） */
export function deltaStrength(deltaRate: number | null, maxAbs: number): number {
  if (deltaRate === null || maxAbs <= 0) return 0
  return Math.round((Math.abs(deltaRate) / maxAbs) * 100)
}
