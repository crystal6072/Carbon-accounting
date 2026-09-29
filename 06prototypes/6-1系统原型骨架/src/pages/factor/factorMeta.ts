import type { TagTone } from '@/shared/components'
import type { EnableStatus, FactorCategory, FactorItem, FactorSource } from '@/types'

/** 因子库作用域：backend = 后台管理 → 核算模型 → 排放因子库；frontend = 前台业务平台 → 我的因子库 */
export type FactorScope = 'backend' | 'frontend'

/**
 * 因子分类（**系统内置枚举，共 6 类**，方案 §4.4），不开放维护。
 */
export const factorCategoryOrder: FactorCategory[] = ['material', 'energy', 'transport', 'waste', 'eol', 'biocarbon']

export const factorCategoryText: Record<FactorCategory, string> = {
  material: '材料因子',
  energy: '能源因子',
  transport: '运输因子',
  waste: '废弃物处理因子',
  eol: '末期处理因子',
  biocarbon: '生物碳因子',
}

export const factorCategoryTone: Record<FactorCategory, TagTone> = {
  material: 'info',
  energy: 'info',
  transport: 'default',
  waste: 'default',
  eol: 'default',
  biocarbon: 'success',
}

/* ============ 来源（数据来源，仅用于权限判定） ============ */

export const factorSourceText: Record<FactorSource, string> = {
  preset: 'environment 库',
  custom: '自定义因子库',
}

/** 数据来源口径说明（与基础库 / 方案 §3.3.3 一致：系统预置 / 组织自建） */
export const factorSourceSubText: Record<FactorSource, string> = {
  preset: '系统预置 · 全平台只读',
  custom: '组织自建 · 本组织可编辑',
}

export const factorSourceTone: Record<FactorSource, TagTone> = {
  preset: 'info',
  custom: 'success',
}

/** 维护方（列表「维护方」列口径）：后台维护 = 前台只读；组织自建 = 本组织可维护 */
export const factorMaintainerText: Record<FactorSource, string> = {
  preset: '后台维护',
  custom: '组织自建',
}

export const factorMaintainerTone: Record<FactorSource, TagTone> = {
  preset: 'info',
  custom: 'success',
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

/* ============ 行操作可用性（不做版本化，规则对齐物料库 / 能源库） ============ */

type FactorFlag = Pick<FactorItem, 'source' | 'status'>

/** 可编辑：不做版本化，因子均可编辑（变更不追溯已参与计算的历史结果） */
export const canEditFactor = (_item: Pick<FactorItem, 'source'>) => true

/** 可禁用：仅组织自建且启用中（系统预置因子只读，不可禁用） */
export const canDisableFactor = (item: FactorFlag) => item.source === 'custom' && item.status === 'enabled'

/** 可启用：已禁用的组织自建因子 */
export const canEnableFactor = (item: FactorFlag) => item.source === 'custom' && item.status === 'disabled'

/** 可删除：**仅「已禁用」的组织自建因子可删除**（系统预置不可删） */
export const canDeleteFactor = (item: FactorFlag) => item.source === 'custom' && item.status === 'disabled'

/**
 * 可由本组织维护（编辑 / 启用 / 禁用 / 删除）：
 * **后台维护因子在前台「我的因子库」只读**（引入仅建立引用，不复制为自建因子）。
 */
export const canMaintainFactor = (item: Pick<FactorItem, 'source'>) => item.source === 'custom'

/* ============ 展示格式化 ============ */

/** 因子复合单位：单位（分子，碳排放量类）/ 活动数据单位（分母） */
export const factorUnitText = (item: Pick<FactorItem, 'numeratorUnit' | 'denominatorUnit'>) =>
  `${item.numeratorUnit}/${item.denominatorUnit}`

/** 因子值 + 复合单位，如 `0.5703 kgCO₂e/kWh`、`-1.83 kgCO₂e/kg` */
export const factorValueText = (item: Pick<FactorItem, 'value' | 'numeratorUnit' | 'denominatorUnit'>) =>
  `${item.value} ${item.numeratorUnit}/${item.denominatorUnit}`

/** 适用行业（多选） */
export const industryText = (item: Pick<FactorItem, 'industries'>) =>
  item.industries.length > 0 ? item.industries.join('、') : '-'

/** 来源机构展示：有简称时 `全称（简称）` */
export const publisherText = (item: Pick<FactorItem, 'publisherFullName' | 'publisherShortName'>) =>
  item.publisherShortName ? `${item.publisherFullName}（${item.publisherShortName}）` : item.publisherFullName
