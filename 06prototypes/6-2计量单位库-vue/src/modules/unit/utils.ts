import type { UnitItem, UnitTypeCode } from './types'

/** 列表 / 详情展示格式化 */

/** 基准标记：基准单位绿色标签 */
export const baseFlagTag = (isBase: boolean) =>
  isBase
    ? { text: '基准单位', type: 'success' as const }
    : { text: '非基准单位', type: 'info' as const }

/** 关联基准单位：基准单位与数量类均展示 - */
export const baseUnitText = (item: Pick<UnitItem, 'isBase' | 'baseUnitSymbol'>) =>
  item.isBase || !item.baseUnitSymbol ? '-' : item.baseUnitSymbol

/** 换算系数：基准单位恒为 1；数量类无基准单位为 - */
export const factorText = (item: Pick<UnitItem, 'isBase' | 'factor'>) => {
  if (item.isBase) return '1'
  return item.factor === null ? '-' : String(item.factor)
}

/** 换算关系一句话：`1 t = 1000 kg` */
export const conversionText = (item: UnitItem) => {
  if (item.isBase) return `基准单位，换算系数恒为 1（${item.symbol}）`
  if (item.baseUnitId === null || item.factor === null) return '「数量」类无基准单位，不可换算'
  return `1 ${item.symbol} = ${item.factor} ${item.baseUnitSymbol}`
}

/** 单位选项标签：`kg（千克）` */
export const unitOptionLabel = (item: Pick<UnitItem, 'symbol' | 'name'>) =>
  `${item.symbol}（${item.name}）`

/** 基准单位保护规则（D02） */
export const canToggleStatus = (item: Pick<UnitItem, 'isBase'>) => !item.isBase
export const canDelete = (item: Pick<UnitItem, 'isBase'>) => !item.isBase

/** 按单位类型枚举顺序排序（用于分组展示） */
export const typeRank = (type: UnitTypeCode) => {
  const order: UnitTypeCode[] = [
    'weight',
    'energy',
    'distance',
    'volume',
    'area',
    'time',
    'quantity',
    'carbon',
  ]
  return order.indexOf(type)
}
