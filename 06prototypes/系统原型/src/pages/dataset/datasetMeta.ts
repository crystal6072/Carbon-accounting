import type { Boundary, CarbonRecord, DatasetStats, HistogramBin, RecordSource, RecordStatus } from '@/types/dataset'
import { stageCompleteOf } from '@/mock/dataset'

/**
 * 行业数据集 · 文案 / 格式化 / 统计口径工具。
 * 统计口径对齐《行业数据集字段清单》§6.2（S01–S10）：
 * - 百分位 = 线性插值；标准差 = 样本标准差（n-1）；CV = 标准差/均值；
 * - 直方图分箱 = ceil(√n)（最少 5 箱）；离群值 = 1.5×IQR（仅标记不剔除）；
 * - n < 5 不出离散度与分布（stdDev/cv 为 undefined，页面据此降级）。
 */

/* ============================ 文案与色调 ============================ */

export const BOUNDARY_TEXT: Record<Boundary, string> = { gate: '摇篮到大门', grave: '摇篮到坟墓' }
export const BOUNDARY_TONE: Record<Boundary, 'info' | 'primary'> = { gate: 'info', grave: 'primary' }

export const SOURCE_TEXT: Record<RecordSource, string> = {
  project: '平台核算',
  manual: '手工补录',
  report: '企业上报',
}
export const SOURCE_TONE: Record<RecordSource, 'default' | 'warning' | 'info'> = {
  project: 'default',
  manual: 'warning',
  report: 'info',
}

export const STATUS_TEXT: Record<RecordStatus, string> = { active: '有效', superseded: '已替代', void: '作废' }
export const STATUS_TONE: Record<RecordStatus, 'success' | 'default' | 'error'> = {
  active: 'success',
  superseded: 'default',
  void: 'error',
}

/**
 * 区域选项（Q01 前置：数据字典「区域」类型未建，先在本模块内置；落地后替换为字典接口）。
 * 取值 = 省级（大区作分组提示）。
 */
export const REGION_OPTIONS = [
  { value: '福建省', label: '福建省（华东）' },
  { value: '浙江省', label: '浙江省（华东）' },
  { value: '江西省', label: '江西省（华东）' },
  { value: '广东省', label: '广东省（华南）' },
]

export function regionText(record: CarbonRecord): string {
  return record.regionName || ''
}

/**
 * 区域省级口径。
 * 企业上报登记的是「省 / 市 / 区」三级路径，而列表筛选与统计分析统一按省级聚合，
 * 避免同一省份因路径粒度不同被拆成多个分组 / 筛选不中。
 */
export function provinceOf(regionName: string): string {
  if (!regionName) return ''
  return regionName.split(/\s*\/\s*/).filter(Boolean)[0] ?? regionName
}

/** 排放分子单位：沿用核算结果（gCO₂e / kgCO₂e），缺省按 kgCO₂e 兼容既有数据，不换算 */
export function emissionUnitText(unit?: string): string {
  return unit || 'kgCO₂e'
}

/** 完整数值口径：排放单位 / 声明单位 */
export function emissionUnitLabel(unit?: string, unitCode?: string): string {
  return `${emissionUnitText(unit)}${unitCode ? ` / ${unitCode}` : ''}`
}

/** 工艺流程库选项（Q04：库外名称视为自定义标签，与 ManualEntryModal / 筛选共用） */
export const PROCESS_LIBRARY_NAMES = ['竹材热压', '竹材冷压', '碳化处理', '涂装']
export const PROCESS_LIBRARY_OPTIONS = PROCESS_LIBRARY_NAMES.map((name) => ({ value: name, label: name }))

export function isLibraryProcess(name: string): boolean {
  return PROCESS_LIBRARY_NAMES.includes(name)
}

/** 阶段覆盖 / 标签完整性的列表徽标 */
export interface RecordBadge {
  key: string
  text: string
  tone: 'warning' | 'default' | 'error' | 'success' | 'info'
  tip?: string
}

export function badgesOf(record: CarbonRecord): RecordBadge[] {
  const badges: RecordBadge[] = []
  if (!record.categoryCode || !record.industryCode || record.processes.length === 0) {
    badges.push({ key: 'tag-missing', text: '标签不全', tone: 'warning', tip: '产品类别 / 行业 / 工艺缺失，不参与统计' })
  }
  const stage = stageCompleteOf(record)
  if (stage === 'missing') badges.push({ key: 'stage-missing', text: '阶段缺失', tone: 'default', tip: '无阶段数值，仅参与总值统计' })
  if (record.stageValues.length > 0) {
    const firstSum = record.stageValues.filter((s) => s.stageLevel === 1).reduce((sum, s) => sum + s.stageEmission, 0)
    if (record.totalEmission > 0 && Math.abs(firstSum - record.totalEmission) / record.totalEmission > 0.005) {
      badges.push({
        key: 'stage-gap',
        text: '阶段不闭合',
        tone: 'error',
        tip: `Σ一级阶段 ${firstSum.toFixed(4)} 与总值 ${record.totalEmission.toFixed(4)} 相差超过 0.5%`,
      })
    }
  }
  return badges
}

/* ============================ 格式化 ============================ */

/** 4 位小数存储、展示去尾零（D09） */
export function numText(value: number, digits = 4): string {
  if (!Number.isFinite(value)) return '-'
  return Number(value.toFixed(digits)).toString()
}

export function unitText(record: CarbonRecord): string {
  return `${record.unitValue} ${record.unitCode}`
}

export function periodText(record: CarbonRecord): string {
  return `${record.periodStart} ~ ${record.periodEnd}`
}

/** 统计期间结束年（参考线匹配用） */
export function periodYear(record: CarbonRecord): number {
  return Number(record.periodEnd.slice(0, 4)) || 0
}

/* ============================ 统计口径（S01–S10） ============================ */

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN
  if (sorted.length === 1) return sorted[0]
  const rank = (sorted.length - 1) * p
  const lower = Math.floor(rank)
  const upper = Math.ceil(rank)
  if (lower === upper) return sorted[lower]
  const frac = rank - lower
  return sorted[lower] + (sorted[upper] - sorted[lower]) * frac
}

/** 直方图分箱：ceil(√n)，最少 5 箱（S06） */
export function buildHistogram(values: number[]): HistogramBin[] {
  if (values.length === 0) return []
  const min = Math.min(...values)
  const max = Math.max(...values)
  const bins = Math.max(5, Math.ceil(Math.sqrt(values.length)))
  if (max === min) return [{ start: min, end: min, count: values.length }]
  const width = (max - min) / bins
  const result: HistogramBin[] = Array.from({ length: bins }, (_, i) => ({
    start: min + i * width,
    end: min + (i + 1) * width,
    count: 0,
  }))
  for (const value of values) {
    let idx = Math.floor((value - min) / width)
    if (idx >= bins) idx = bins - 1
    result[idx].count += 1
  }
  return result
}

/** 描述统计（对当前筛选命中的有效记录总值） */
export function computeStats(values: number[]): DatasetStats {
  const n = values.length
  if (n === 0) {
    return { n: 0, mean: NaN, median: NaN, p25: NaN, p75: NaN, p90: NaN, min: NaN, max: NaN, iqr: NaN, outliers: [], histogram: [] }
  }
  const sorted = [...values].sort((a, b) => a - b)
  const mean = sorted.reduce((sum, v) => sum + v, 0) / n
  const median = percentile(sorted, 0.5)
  const p25 = percentile(sorted, 0.25)
  const p75 = percentile(sorted, 0.75)
  const p90 = percentile(sorted, 0.9)
  const min = sorted[0]
  const max = sorted[n - 1]
  const iqr = p75 - p25
  const outliers =
    n >= 5 && Number.isFinite(iqr)
      ? sorted.filter((v) => v < p25 - 1.5 * iqr || v > p75 + 1.5 * iqr)
      : []
  let stdDev: number | undefined
  let cv: number | undefined
  if (n >= 5) {
    const variance = sorted.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n - 1)
    stdDev = Math.sqrt(variance)
    cv = mean > 0 ? (stdDev / mean) * 100 : undefined
  }
  return { n, mean, median, p25, p75, p90, min, max, stdDev, cv, iqr, outliers, histogram: buildHistogram(sorted) }
}

/* ============================ 导出 ============================ */

/** 行业数据集导出：按当前筛选导出 CSV */
export function exportRecordsCsv(records: CarbonRecord[]): void {
  const header = [
    '记录编号',
    '产品名称',
    '产品编码',
    '产品类别',
    '所属行业',
    '区域',
    '工艺',
    '系统边界',
    '声明单位',
    '总碳足迹',
    '排放单位',
    '统计期间',
    '来源',
    '状态',
    '入库时间',
  ]
  const rows = records.map((r) => [
    r.recordNo,
    r.productName,
    r.productCode ?? '',
    r.categoryPath || r.categoryName,
    r.industryName,
    r.regionName || '未填',
    r.processes.map((p) => p.name).join('；'),
    BOUNDARY_TEXT[r.boundary],
    unitText(r),
    r.totalEmission.toFixed(4),
    emissionUnitText(r.emissionUnit),
    periodText(r),
    SOURCE_TEXT[r.recordSource],
    STATUS_TEXT[r.status],
    r.createdAt,
  ])
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\r\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `行业数据集_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
