import type { SelectOption, TagTone } from '@/shared/components'
import type {
  EnergyLedgerItem,
  EnergyLedgerPayload,
  LedgerElectricitySource,
  LedgerEnergyType,
  LedgerWaterSource,
} from '@/types'

/** 能源类型中文映射 */
export const energyTypeText: Record<LedgerEnergyType, string> = {
  electricity: '电',
  steam: '蒸汽',
  natural_gas: '天然气',
  water: '水',
  diesel: '柴油',
}

/** 能源类型标签色调 */
export const energyTypeTone: Record<LedgerEnergyType, TagTone> = {
  electricity: 'info',
  steam: 'warning',
  natural_gas: 'success',
  water: 'default',
  diesel: 'error',
}

/** 能源类型下拉选项（动态表单触发字段） */
export const ENERGY_TYPE_OPTIONS: SelectOption[] = [
  { label: '电', value: 'electricity' },
  { label: '蒸汽', value: 'steam' },
  { label: '天然气', value: 'natural_gas' },
  { label: '水', value: 'water' },
  { label: '柴油', value: 'diesel' },
]

/** 所属工序 / 车间下拉选项（竹木加工典型工序） */
export const PROCESS_OPTIONS: SelectOption[] = [
  { label: '备料', value: '备料' },
  { label: '干燥', value: '干燥' },
  { label: '裁切', value: '裁切' },
  { label: '砂光', value: '砂光' },
  { label: '热压', value: '热压' },
  { label: '涂装', value: '涂装' },
  { label: '组装', value: '组装' },
  { label: '锅炉房', value: '锅炉房' },
  { label: '全厂辅助', value: '全厂辅助' },
]

/** 用电类型（energy_type = 电 时展示） */
export const electricitySourceText: Record<LedgerElectricitySource, string> = {
  purchased: '外购电',
  self_generated: '自备电厂',
}

export const ELECTRICITY_SOURCE_OPTIONS: SelectOption[] = [
  { label: '外购电', value: 'purchased' },
  { label: '自备电厂', value: 'self_generated' },
]

/** 水源类型（energy_type = 水 时展示） */
export const waterSourceText: Record<LedgerWaterSource, string> = {
  tap: '自来水',
  surface: '地表水',
  groundwater: '地下水',
}

export const WATER_SOURCE_OPTIONS: SelectOption[] = [
  { label: '自来水', value: 'tap' },
  { label: '地表水', value: 'surface' },
  { label: '地下水', value: 'groundwater' },
]

/** 单位候选（原型层常用能源计量单位） */
export const ENERGY_UNIT_OPTIONS: SelectOption[] = [
  { label: 'kWh', value: 'kWh' },
  { label: 'MWh', value: 'MWh' },
  { label: 't', value: 't' },
  { label: 'kt', value: 'kt' },
  { label: 'm³', value: 'm³' },
  { label: 'L', value: 'L' },
  { label: 'GJ', value: 'GJ' },
  { label: 'kgce', value: 'kgce' },
]

/** 各能源类型的允许单位集（未选择能源类型时给出全量） */
const ENERGY_UNIT_MAP: Record<LedgerEnergyType, SelectOption[]> = {
  electricity: [
    { label: 'kWh', value: 'kWh' },
    { label: 'MWh', value: 'MWh' },
  ],
  steam: [
    { label: 't', value: 't' },
    { label: 'GJ', value: 'GJ' },
  ],
  natural_gas: [{ label: 'm³', value: 'm³' }],
  water: [
    { label: 't', value: 't' },
    { label: 'm³', value: 'm³' },
  ],
  diesel: [
    { label: 'L', value: 'L' },
    { label: 't', value: 't' },
  ],
}

/** 按能源类型取单位下拉选项；未选类型时返回全量单位 */
export function energyUnitOptions(energyType?: '' | LedgerEnergyType): SelectOption[] {
  if (!energyType) return ENERGY_UNIT_OPTIONS
  return ENERGY_UNIT_MAP[energyType]
}

/** 所属周期展示文本：起 ~ 止 */
export function ledgerPeriodText(item: Pick<EnergyLedgerItem, 'recordStartDate' | 'recordEndDate'>): string {
  return `${item.recordStartDate} ~ ${item.recordEndDate}`
}

/** 联动字段展示文本：电 → 用电类型；水 → 水源类型；其他 → '-' */
export function ledgerSourceText(item: Pick<EnergyLedgerItem, 'energyType' | 'electricitySource' | 'waterSource'>): string {
  if (item.energyType === 'electricity') return item.electricitySource ? electricitySourceText[item.electricitySource] : '-'
  if (item.energyType === 'water') return item.waterSource ? waterSourceText[item.waterSource] : '-'
  return '-'
}

/** 导入模板列（顺序即 Excel 列顺序；数据凭证以附件形式在表单内上传，故不纳入表格导入） */
export const ENERGY_LEDGER_IMPORT_HEADERS = [
  '所属工序/车间',
  '所属周期起',
  '所属周期止',
  '能源类型',
  '消耗数量',
  '单位',
  '用电类型',
  '水源类型',
  '备注',
]

/** 校验日期（YYYY-MM-DD） */
function isValidDate(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value.trim())
}

/** 在选项集中查找值（兼容中文标签与英文枚举） */
function resolveOption(options: SelectOption[], raw: string): string {
  if (!raw) return ''
  return options.find((opt) => opt.label === raw || opt.value === raw)?.value ?? ''
}

/**
 * 将一行单元格转为录入载荷并校验。
 * 用电类型 / 水源类型 / 备注均为选填：留空不写入，填写了非法枚举值则阻断该行。
 * @param cells 单元格数组（按 ENERGY_LEDGER_IMPORT_HEADERS 顺序）
 * @param rowIndex 数据行序号（从 1 开始，不含表头），用于错误定位
 */
export function buildEnergyLedgerRow(cells: string[], rowIndex: number): { payload: EnergyLedgerPayload; error?: string } {
  const [processRaw, startRaw, endRaw, energyTypeRaw, amountRaw, unitRaw, electricityRaw, waterRaw, remarkRaw] = cells.map(
    (cell) => (cell ?? '').trim(),
  )
  const empty = {} as EnergyLedgerPayload

  if (!processRaw) return { payload: empty, error: `第 ${rowIndex} 行：所属工序/车间不能为空` }
  if (!startRaw) return { payload: empty, error: `第 ${rowIndex} 行：所属周期起不能为空` }
  if (!isValidDate(startRaw)) return { payload: empty, error: `第 ${rowIndex} 行：所属周期起格式应为 YYYY-MM-DD（如 2026-08-01）` }
  if (!endRaw) return { payload: empty, error: `第 ${rowIndex} 行：所属周期止不能为空` }
  if (!isValidDate(endRaw)) return { payload: empty, error: `第 ${rowIndex} 行：所属周期止格式应为 YYYY-MM-DD（如 2026-08-31）` }
  if (endRaw < startRaw) return { payload: empty, error: `第 ${rowIndex} 行：所属周期止不得早于所属周期起` }

  const energyType = resolveOption(ENERGY_TYPE_OPTIONS, energyTypeRaw) as LedgerEnergyType
  if (!energyType) return { payload: empty, error: `第 ${rowIndex} 行：能源类型应为 电/蒸汽/天然气/水/柴油 之一` }

  if (!amountRaw) return { payload: empty, error: `第 ${rowIndex} 行：消耗数量不能为空` }
  const consumptionAmount = Number(amountRaw)
  if (Number.isNaN(consumptionAmount) || consumptionAmount <= 0)
    return { payload: empty, error: `第 ${rowIndex} 行：消耗数量应为正数` }

  const unit = resolveOption(ENERGY_UNIT_OPTIONS, unitRaw)
  if (!unit) return { payload: empty, error: `第 ${rowIndex} 行：单位不能为空，且应为 ${ENERGY_UNIT_OPTIONS.map((o) => o.label).join('/')} 之一` }
  if (!ENERGY_UNIT_MAP[energyType].some((opt) => opt.value === unit))
    return {
      payload: empty,
      error: `第 ${rowIndex} 行：${energyTypeText[energyType]} 的计量单位应为 ${ENERGY_UNIT_MAP[energyType].map((o) => o.label).join('/')} 之一`,
    }

  let electricitySource: LedgerElectricitySource | undefined
  let waterSource: LedgerWaterSource | undefined
  if (energyType === 'electricity' && electricityRaw) {
    electricitySource = resolveOption(ELECTRICITY_SOURCE_OPTIONS, electricityRaw) as LedgerElectricitySource
    if (!electricitySource)
      return { payload: empty, error: `第 ${rowIndex} 行：用电类型应为 外购电/自备电厂 之一，或留空` }
  }
  if (energyType === 'water' && waterRaw) {
    waterSource = resolveOption(WATER_SOURCE_OPTIONS, waterRaw) as LedgerWaterSource
    if (!waterSource)
      return { payload: empty, error: `第 ${rowIndex} 行：水源类型应为 自来水/地表水/地下水 之一，或留空` }
  }

  return {
    payload: {
      processName: processRaw,
      recordStartDate: startRaw,
      recordEndDate: endRaw,
      energyType,
      consumptionAmount,
      unit,
      electricitySource,
      waterSource,
      remark: remarkRaw || undefined,
      vouchers: [],
    },
  }
}
