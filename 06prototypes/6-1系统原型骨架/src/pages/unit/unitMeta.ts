import type { TagTone } from '@/shared/components'
import type { EnableStatus, UnitItem, UnitType } from '@/types'

/**
 * 单位类型（**系统内置枚举，共 8 类**，不开放维护）：
 * 「数量」无基准单位且不可换算，其余类型各有且仅有 1 个基准单位（§4.1 / B1 / B4）。
 */
export const unitTypeOrder: UnitType[] = [
  'weight',
  'energy',
  'distance',
  'volume',
  'area',
  'time',
  'quantity',
  'carbon',
]

export const unitTypeText: Record<UnitType, string> = {
  weight: '重量',
  energy: '能量',
  distance: '距离',
  volume: '体积',
  area: '面积',
  time: '时间',
  quantity: '数量',
  carbon: '碳排放量',
}

export const unitTypeTone: Record<UnitType, TagTone> = {
  weight: 'info',
  energy: 'info',
  distance: 'default',
  volume: 'default',
  area: 'default',
  time: 'default',
  quantity: 'warning',
  carbon: 'success',
}

/** 该类型是否可换算（系统内置规则，不设字段）：数量类不可换算（D06 / U4） */
export const unitTypeConvertible: Record<UnitType, boolean> = {
  weight: true,
  energy: true,
  distance: true,
  volume: true,
  area: true,
  time: true,
  quantity: false,
  carbon: true,
}

/** 类型基准口径提示（用于列表 / 详情说明，实际基准单位以单位字典为准） */
export const unitTypeBaseHint: Record<UnitType, string> = {
  weight: 'kg 千克',
  energy: 'kWh 千瓦时',
  distance: 'km 千米',
  volume: 'm³ 立方米',
  area: 'm² 平方米',
  time: 'h 小时',
  quantity: '无基准单位',
  carbon: 'kgCO₂e',
}

/* ============ 使用状态 ============ */

export const useStatusText: Record<EnableStatus, string> = {
  enabled: '启用',
  disabled: '禁用',
}

export const useStatusTone: Record<EnableStatus, TagTone> = {
  enabled: 'success',
  disabled: 'default',
}

/* ============ 行操作可用性（与物料库 / 能源库口径一致） ============ */

type UnitFlag = Pick<UnitItem, 'isBase' | 'status'>

/** 可禁用：**非基准单位**双向可达；基准单位受保护不可禁用（R-003 / B2） */
export const canDisableUnit = (item: UnitFlag) => !item.isBase

/** 可启用：基准单位不会被禁用，故已禁用单位均可启用（双向可达） */
export const canEnableUnit = (item: UnitFlag) => !item.isBase

/** 可删除：**仅「已禁用」的非基准单位可删除**（与物料库 / 能源库一致；基准单位受保护 R-003） */
export const canDeleteUnit = (item: UnitFlag) => !item.isBase && item.status === 'disabled'

/* ============ 展示格式化 ============ */

/** 基准标记文案 */
export const baseFlagText = (item: Pick<UnitItem, 'isBase'>) => (item.isBase ? '基准单位' : '非基准单位')

/** 关联基准单位展示：基准单位不适用（-），「数量」类无基准单位亦为 - */
export const baseUnitText = (item: Pick<UnitItem, 'isBase' | 'baseUnitSymbol'>) =>
  item.isBase ? '-' : item.baseUnitSymbol ?? '-'

/** 换算系数展示：基准单位恒为 1；「数量」类无基准单位不适用（-） */
export const factorText = (item: Pick<UnitItem, 'isBase' | 'baseUnitId' | 'factor'>) => {
  if (item.isBase) return '1'
  if (!item.baseUnitId) return '-'
  return String(item.factor)
}

/** 换算关系一句话描述：`1 t = 1000 kg`；基准单位 / 数量类不适用 */
export const conversionText = (
  item: Pick<UnitItem, 'isBase' | 'baseUnitId' | 'baseUnitSymbol' | 'factor' | 'symbol'>,
) => {
  if (item.isBase) return `基准单位，换算系数恒为 1（${item.symbol}）`
  if (!item.baseUnitId || !item.baseUnitSymbol) return '数量类无基准单位，不可换算'
  return `1 ${item.symbol} = ${item.factor} ${item.baseUnitSymbol}`
}
