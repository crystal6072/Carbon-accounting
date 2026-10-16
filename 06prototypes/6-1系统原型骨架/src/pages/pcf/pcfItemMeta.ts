import type { SelectOption } from '@/shared/components'
import type { PcfDataItemDirection, PcfDataItemType, PcfEmissionType } from '@/types'

/**
 * 步骤②「产品建模」数据项字典（PCF 工作台与模型「产品建模」共用，口径唯一来源）。
 */

/** 数据项类型：输入（原辅料 / 自然资源 / 能源及能源介质）+ 输出（产品 / 中间产品 / 副产品 / 排放物） */
export const ALL_TYPE_OPTIONS: SelectOption[] = [
  { label: '原辅料', value: 'material' },
  { label: '自然资源', value: 'natural' },
  { label: '能源及能源介质', value: 'energy' },
  { label: '产品', value: 'product' },
  { label: '中间产品', value: 'intermediate' },
  { label: '副产品', value: 'byproduct' },
  { label: '排放物', value: 'emission' },
]

/** 排放物子类：废水 / 废渣 / 废气 */
export const EMISSION_TYPE_OPTIONS: SelectOption[] = [
  { label: '废水', value: 'wastewater' },
  { label: '废渣', value: 'wasteSolid' },
  { label: '废气', value: 'wasteGas' },
]

export const PCF_ITEM_TYPE_TEXT: Record<PcfDataItemType, string> = {
  material: '原辅料',
  natural: '自然资源',
  energy: '能源及能源介质',
  product: '产品',
  intermediate: '中间产品',
  byproduct: '副产品',
  emission: '排放物',
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

/* 导入模板中文枚举映射 */
export const PCF_TYPE_BY_TEXT: Record<string, PcfDataItemType> = {
  原辅料: 'material',
  自然资源: 'natural',
  能源及能源介质: 'energy',
  产品: 'product',
  中间产品: 'intermediate',
  副产品: 'byproduct',
  排放物: 'emission',
}

export const PCF_EMISSION_BY_TEXT: Record<string, PcfEmissionType> = {
  废水: 'wastewater',
  废渣: 'wasteSolid',
  废气: 'wasteGas',
}
