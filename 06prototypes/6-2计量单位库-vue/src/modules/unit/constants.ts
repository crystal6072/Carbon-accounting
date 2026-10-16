import type { TagType, UnitStatus, UnitTypeCode, YesNo } from './types'

/* ============ 单位类型（系统内置枚举，不开放维护） ============ */

export interface UnitTypeOption {
  value: UnitTypeCode
  label: string
  /** 该类型的基准单位口径 */
  baseHint: string
  /** 是否可换算：数量类不可换算（D06） */
  convertible: boolean
}

export const UNIT_TYPE_OPTIONS: UnitTypeOption[] = [
  { value: 'weight', label: '重量', baseHint: 'kg 千克', convertible: true },
  { value: 'energy', label: '能量', baseHint: 'kWh 千瓦时', convertible: true },
  { value: 'distance', label: '距离', baseHint: 'km 千米', convertible: true },
  { value: 'volume', label: '体积', baseHint: 'm³ 立方米', convertible: true },
  { value: 'area', label: '面积', baseHint: 'm² 平方米', convertible: true },
  { value: 'time', label: '时间', baseHint: 'h 小时', convertible: true },
  { value: 'quantity', label: '数量', baseHint: '无基准单位', convertible: false },
  { value: 'carbon', label: '碳排放量', baseHint: 'kgCO₂e', convertible: true },
]

export const UNIT_TYPE_ORDER: UnitTypeCode[] = UNIT_TYPE_OPTIONS.map((item) => item.value)

export const UNIT_TYPE_TEXT: Record<UnitTypeCode, string> = {
  weight: '重量',
  energy: '能量',
  distance: '距离',
  volume: '体积',
  area: '面积',
  time: '时间',
  quantity: '数量',
  carbon: '碳排放量',
}

export const UNIT_TYPE_TAG: Record<UnitTypeCode, TagType> = {
  weight: 'primary',
  energy: 'warning',
  distance: 'info',
  volume: 'success',
  area: 'success',
  time: 'warning',
  quantity: 'info',
  carbon: 'danger',
}

/** 单位类型的 Tag 类型可否换算说明（用于表单提示） */
export const UNIT_TYPE_CONVERTIBLE: Record<UnitTypeCode, boolean> = {
  weight: true,
  energy: true,
  distance: true,
  volume: true,
  area: true,
  time: true,
  quantity: false,
  carbon: true,
}

/** 单位类型下拉的辅助说明文案 */
export const unitTypeHint = (type: UnitTypeCode | ''): string => {
  if (!type) return '单位类型为系统内置枚举，不开放维护'
  const option = UNIT_TYPE_OPTIONS.find((item) => item.value === type)
  if (!option) return ''
  return option.convertible
    ? `该类型基准单位为「${option.baseHint}」，可换算`
    : '「数量」类无基准单位，不可换算'
}

/* ============ 使用状态 ============ */

export const STATUS_OPTIONS: Array<{ value: UnitStatus; label: string }> = [
  { value: 'enabled', label: '启用' },
  { value: 'disabled', label: '禁用' },
]

export const STATUS_TEXT: Record<UnitStatus, string> = {
  enabled: '启用',
  disabled: '禁用',
}

export const STATUS_TAG: Record<UnitStatus, TagType> = {
  enabled: 'success',
  disabled: 'danger',
}

/* ============ 是否基准单位 ============ */

export const YES_NO_OPTIONS: Array<{ value: YesNo; label: string }> = [
  { value: 'Y', label: '是' },
  { value: 'N', label: '否' },
]
