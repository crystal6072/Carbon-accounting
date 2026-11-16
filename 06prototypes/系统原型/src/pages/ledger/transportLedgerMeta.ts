import type { SelectOption, TagTone } from '@/shared/components'
import type { TransportLedgerPayload, TransportMode, TransportSegment, TransportType } from '@/types'

/** 运输类型中文映射 */
export const transportTypeText: Record<TransportType, string> = {
  material: '原料运输',
  product: '成品运输',
  transfer: '调拨运输',
  other: '其他',
}

/** 运输类型标签色调 */
export const transportTypeTone: Record<TransportType, TagTone> = {
  material: 'info',
  product: 'success',
  transfer: 'warning',
  other: 'default',
}

/** 运输类型下拉选项（含「其他」，用于不在标准分类内的运输业务） */
export const TRANSPORT_TYPE_OPTIONS: SelectOption[] = [
  { label: '原料运输', value: 'material' },
  { label: '成品运输', value: 'product' },
  { label: '调拨运输', value: 'transfer' },
  { label: '其他', value: 'other' },
]

/** 运输方式中文映射（water 覆盖海运 / 内河航运） */
export const transportModeText: Record<TransportMode, string> = {
  road: '公路',
  rail: '铁路',
  water: '水路',
  air: '航空',
  other: '其他',
}

/** 运输方式标签色调 */
export const transportModeTone: Record<TransportMode, TagTone> = {
  road: 'info',
  rail: 'default',
  water: 'success',
  air: 'warning',
  other: 'default',
}

/** 运输方式下拉选项（含「其他」） */
export const TRANSPORT_MODE_OPTIONS: SelectOption[] = [
  { label: '公路', value: 'road' },
  { label: '铁路', value: 'rail' },
  { label: '水路（海运）', value: 'water' },
  { label: '航空', value: 'air' },
  { label: '其他', value: 'other' },
]

/** 装载率自动计算：实际载重 ÷ 核定载重，保留 1 位小数；无法计算时返回 null */
export function calcLoadingRate(loadWeight: string, ratedWeight: string): number | null {
  const load = Number(loadWeight)
  const rated = Number(ratedWeight)
  if (!loadWeight.trim() || !ratedWeight.trim()) return null
  if (Number.isNaN(load) || Number.isNaN(rated) || rated <= 0) return null
  return Math.round((load / rated) * 1000) / 10
}

/** 运输日期区间文本 */
export function transportDateText(item: { transportDateStart: string; transportDateEnd: string }): string {
  if (!item.transportDateStart && !item.transportDateEnd) return '-'
  if (!item.transportDateEnd || item.transportDateStart === item.transportDateEnd) return item.transportDateStart || item.transportDateEnd
  return `${item.transportDateStart} ~ ${item.transportDateEnd}`
}

/** 记录级顶层字段（由分段汇总推导，兼容未细分段的旧数据 / 导入数据） */
type TransportSegmentSummary = Pick<
  TransportLedgerPayload,
  | 'transportMode'
  | 'startPoint'
  | 'endPoint'
  | 'distance'
  | 'loadWeight'
  | 'ratedWeight'
  | 'loadingRate'
  | 'fuelConsumption'
  | 'carrier'
  | 'licensePlate'
  | 'relatedOrder'
>

/**
 * 取一趟运输的分段明细；未保存 segments 的旧记录 / 导入数据按顶层字段视为单段。
 * 保证列表、查看弹窗与表单编辑对单段 / 多段使用同一套读取口径。
 */
export function transportSegments(item: TransportSegmentSummary & { segments?: TransportSegment[] }): TransportSegment[] {
  if (item.segments && item.segments.length > 0) return item.segments
  return [
    {
      id: 'single',
      transportMode: item.transportMode,
      startPoint: item.startPoint,
      endPoint: item.endPoint,
      distance: item.distance,
      loadWeight: item.loadWeight,
      ratedWeight: item.ratedWeight,
      loadingRate: item.loadingRate,
      fuelConsumption: item.fuelConsumption,
      carrier: item.carrier,
      licensePlate: item.licensePlate,
      relatedOrder: item.relatedOrder,
    },
  ]
}

/** 由分段明细汇总出记录级字段：起点取首段、终点取末段、距离与能耗求和 */
export function summarizeTransportSegments(segments: TransportSegment[]): TransportSegmentSummary {
  const first = segments[0]
  const last = segments[segments.length - 1]
  const sum = (key: 'distance' | 'fuelConsumption') =>
    Math.round(segments.reduce((total, seg) => total + seg[key], 0) * 1000) / 1000
  return {
    transportMode: first.transportMode,
    startPoint: first.startPoint,
    endPoint: last.endPoint,
    distance: sum('distance'),
    loadWeight: first.loadWeight,
    ratedWeight: first.ratedWeight,
    loadingRate: first.loadingRate,
    fuelConsumption: sum('fuelConsumption'),
    carrier: first.carrier,
    licensePlate: first.licensePlate,
    relatedOrder: first.relatedOrder,
  }
}

/** 运输方式链路文本，如 公路 → 水路 → 航空 */
export function transportModeChain(segments: TransportSegment[]): string {
  return segments.map((seg) => transportModeText[seg.transportMode]).join(' → ')
}

/** 分段明细文本（导出用）：段序 + 方式 + 起终点 + 距离 + 能耗 */
export function transportSegmentDetail(segments: TransportSegment[]): string {
  return segments
    .map(
      (seg, index) =>
        `${index + 1}.${transportModeText[seg.transportMode]} ${seg.startPoint || '-'}→${seg.endPoint || '-'} ${seg.distance}km/能耗${seg.fuelConsumption}L`,
    )
    .join('；')
}

/** 导入模板列（顺序即 Excel 列顺序）；一行 = 一趟单段运输，多段请在表单内自行增删 */
export const TRANSPORT_LEDGER_IMPORT_HEADERS = [
  '运输类型',
  '运输方式',
  '起点',
  '终点',
  '运输距离(km)',
  '实际载重(t)',
  '核定载重(t)',
  '装载率(%)',
  '能耗(L)',
  '承运商',
  '车牌号',
  '运输开始日期',
  '运输结束日期',
  '关联单据号',
]

/** 解析数值并校验（非负） */
function nonNegativeNumber(value: string, name: string, rowIndex: number): number | string {
  if (!value) return `第 ${rowIndex} 行：${name}不能为空`
  const num = Number(value)
  if (Number.isNaN(num) || num < 0) return `第 ${rowIndex} 行：${name}应为非负数值`
  return num
}

/** 校验日期格式 */
function isDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

/**
 * 将一行单元格转为录入载荷并校验。
 * @param cells 单元格数组（按 TRANSPORT_LEDGER_IMPORT_HEADERS 顺序）
 * @param rowIndex 数据行序号（从 1 开始，不含表头），用于错误定位
 */
export function buildTransportLedgerRow(cells: string[], rowIndex: number): { payload: TransportLedgerPayload; error?: string } {
  const [
    typeRaw,
    modeRaw,
    startPointRaw,
    endPointRaw,
    distanceRaw,
    loadWeightRaw,
    ratedWeightRaw,
    loadingRateRaw,
    fuelRaw,
    carrierRaw,
    plateRaw,
    startDateRaw,
    endDateRaw,
    relatedRaw,
  ] = TRANSPORT_LEDGER_IMPORT_HEADERS.map((_, index) => (cells[index] ?? '').trim())

  const fail = (error: string) => ({ payload: {} as TransportLedgerPayload, error })

  const transportType = (TRANSPORT_TYPE_OPTIONS.find((opt) => opt.label === typeRaw || opt.value === typeRaw)?.value ??
    '') as TransportType
  if (!transportType) return fail(`第 ${rowIndex} 行：运输类型应为 原料运输/成品运输/调拨运输/其他 之一`)

  // 兼容「水路」「海运」「water」三种写法，海运按水路口径匹配因子
  const modeAlias: Record<string, TransportMode> = { 水路: 'water', 海运: 'water' }
  const transportMode = (TRANSPORT_MODE_OPTIONS.find((opt) => opt.label === modeRaw || opt.value === modeRaw)?.value ??
    modeAlias[modeRaw] ??
    '') as TransportMode
  if (!transportMode) return fail(`第 ${rowIndex} 行：运输方式应为 公路/铁路/水路（海运）/航空/其他 之一`)

  const distance = nonNegativeNumber(distanceRaw, '运输距离', rowIndex)
  if (typeof distance === 'string') return fail(distance)

  const loadWeight = nonNegativeNumber(loadWeightRaw, '实际载重', rowIndex)
  if (typeof loadWeight === 'string') return fail(loadWeight)

  const fuel = nonNegativeNumber(fuelRaw, '能耗', rowIndex)
  if (typeof fuel === 'string') return fail(fuel)

  let ratedWeight: number | undefined
  if (ratedWeightRaw) {
    const rated = Number(ratedWeightRaw)
    if (Number.isNaN(rated) || rated <= 0) return fail(`第 ${rowIndex} 行：核定载重应为大于 0 的数值`)
    ratedWeight = rated
  }

  let loadingRate: number | undefined
  const autoRate = calcLoadingRate(String(loadWeight), ratedWeightRaw)
  const rateSource = loadingRateRaw || (autoRate != null ? String(autoRate) : '')
  if (rateSource) {
    const rate = Number(rateSource)
    if (Number.isNaN(rate) || rate < 0 || rate > 100) return fail(`第 ${rowIndex} 行：装载率应为 0~100 的数值`)
    loadingRate = rate
  }

  if (!startDateRaw) return fail(`第 ${rowIndex} 行：运输开始日期不能为空`)
  if (!isDate(startDateRaw)) return fail(`第 ${rowIndex} 行：运输开始日期格式应为 YYYY-MM-DD`)
  if (!endDateRaw) return fail(`第 ${rowIndex} 行：运输结束日期不能为空`)
  if (!isDate(endDateRaw)) return fail(`第 ${rowIndex} 行：运输结束日期格式应为 YYYY-MM-DD`)
  if (startDateRaw > endDateRaw) return fail(`第 ${rowIndex} 行：运输开始日期不能晚于结束日期`)

  return {
    payload: {
      transportType,
      transportMode,
      startPoint: startPointRaw,
      endPoint: endPointRaw,
      distance,
      loadWeight,
      ratedWeight,
      loadingRate,
      fuelConsumption: fuel,
      carrier: carrierRaw,
      licensePlate: plateRaw,
      transportDateStart: startDateRaw,
      transportDateEnd: endDateRaw,
      relatedOrder: relatedRaw,
      segments: [
        {
          id: `IMP-${rowIndex}-1`,
          transportMode,
          startPoint: startPointRaw,
          endPoint: endPointRaw,
          distance,
          loadWeight,
          ratedWeight,
          loadingRate,
          fuelConsumption: fuel,
          carrier: carrierRaw,
          licensePlate: plateRaw,
          relatedOrder: relatedRaw,
        },
      ],
      vouchers: [],
    },
  }
}
