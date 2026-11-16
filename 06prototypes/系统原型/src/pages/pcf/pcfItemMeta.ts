import type { SelectOption } from '@/shared/components'
import type { PcfDataItemDirection, PcfDataItemType, PcfEmissionType } from '@/types'
import { accountingDataItems } from '@/mock'

/**
 * 步骤②「产品建模」数据项字典（PCF 工作台与模型「产品建模」共用，口径唯一来源）。
 * 数据项类型的**取值来源：「数据字典 · 核算数据类型」**。
 */

/** 字典项编码 → `PcfDataItemType`（resource→natural、semi→intermediate 为历史编码差异映射） */
const DICT_CODE_TO_ITEM_TYPE: Record<string, PcfDataItemType> = {
  material: 'material',
  energy: 'energy',
  resource: 'natural',
  semi: 'intermediate',
  product: 'product',
  byproduct: 'byproduct',
  emission: 'emission',
}

/** 兜底选项（字典不可用时使用，与字典口径保持一致） */
const FALLBACK_TYPE_OPTIONS: SelectOption[] = [
  { label: '原辅料', value: 'material' },
  { label: '能源', value: 'energy' },
  { label: '自然资源', value: 'natural' },
  { label: '中间产品', value: 'intermediate' },
  { label: '产品', value: 'product' },
  { label: '副产品', value: 'byproduct' },
  { label: '废弃物/排放物', value: 'emission' },
]

/**
 * 数据项类型下拉（**取自「数据字典 · 核算数据类型」**）：
 * 顺序与文案完全由字典维护，7 类 —— 原辅料 / 能源 / 自然资源 / 中间产品 / 产品 / 副产品 / 废弃物/排放物。
 */
export const ALL_TYPE_OPTIONS: SelectOption[] = (() => {
  const options: SelectOption[] = accountingDataItems()
    .map((item): SelectOption | null => {
      const value = DICT_CODE_TO_ITEM_TYPE[item.code]
      return value ? { label: item.label, value } : null
    })
    .filter((item): item is SelectOption => item !== null)
  return options.length > 0 ? options : FALLBACK_TYPE_OPTIONS
})()

/** 排放物子类：废水 / 废渣 / 废气 */
export const EMISSION_TYPE_OPTIONS: SelectOption[] = [
  { label: '废水', value: 'wastewater' },
  { label: '废渣', value: 'wasteSolid' },
  { label: '废气', value: 'wasteGas' },
]

export const PCF_ITEM_TYPE_TEXT: Record<PcfDataItemType, string> = {
  material: '原辅料',
  energy: '能源',
  natural: '自然资源',
  intermediate: '中间产品',
  product: '产品',
  byproduct: '副产品',
  emission: '废弃物/排放物',
}

export const PCF_EMISSION_TYPE_TEXT: Record<PcfEmissionType, string> = {
  wastewater: '废水',
  wasteSolid: '废渣',
  wasteGas: '废气',
}

/** 输入类数据项类型 */
export const PCF_INPUT_TYPES: PcfDataItemType[] = ['material', 'natural', 'energy']

/** 由数据项类型推导输入 / 输出方向 */
export const pcfDirectionOf = (itemType: PcfDataItemType): PcfDataItemDirection =>
  PCF_INPUT_TYPES.includes(itemType) ? 'input' : 'output'

/* 导入模板中文枚举映射（含旧模板文案兼容） */
export const PCF_TYPE_BY_TEXT: Record<string, PcfDataItemType> = {
  原辅料: 'material',
  能源: 'energy',
  能源及能源介质: 'energy',
  自然资源: 'natural',
  中间产品: 'intermediate',
  产品: 'product',
  副产品: 'byproduct',
  '废弃物/排放物': 'emission',
  排放物: 'emission',
}

export const PCF_EMISSION_BY_TEXT: Record<string, PcfEmissionType> = {
  废水: 'wastewater',
  废渣: 'wasteSolid',
  废气: 'wasteGas',
}
