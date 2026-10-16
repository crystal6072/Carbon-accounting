import type { ReportStatus, ReportTableType, ReportFigureType, SectionType } from '@/types/report'

/** 报告状态 → 标签 / Tag 配色（Demo §3.5） */
export const REPORT_STATUS_TEXT: Record<ReportStatus, string> = {
  reportGenerating: '生成中',
  reportEditing: '编制中',
  reportReady: '已生成',
  reportStale: '待更新',
}

export const REPORT_STATUS_TAG: Record<ReportStatus, { theme: 'default' | 'primary' | 'success' | 'warning'; variant: 'light' }> = {
  reportGenerating: { theme: 'primary', variant: 'light' },
  reportEditing: { theme: 'warning', variant: 'light' },
  reportReady: { theme: 'success', variant: 'light' },
  reportStale: { theme: 'warning', variant: 'light' },
}

export const REPORT_STATUS_DOT: Record<ReportStatus, string> = {
  reportGenerating: 't-report-dot t-report-dot--primary',
  reportEditing: 't-report-dot t-report-dot--warning',
  reportReady: 't-report-dot t-report-dot--success',
  reportStale: 't-report-dot t-report-dot--warning',
}

/** 表格编码 → 标题（模板定义 §3） */
export const REPORT_TABLE_TITLE: Record<ReportTableType, string> = {
  T01: '表 1 报告主体基本信息表',
  T02: '表 2 原材料获取',
  T03: '表 3 原材料运输',
  T04: '表 4 生产过程',
  T05: '表 5 生产过程的废弃物处理',
  T06: '表 6 运输/交付',
  T07: '表 7 生命末期产品的收集、包装和运输',
  T08: '表 8 焚烧和底渣分选，填埋和促进分解的排放',
  T09: '表 9 生命周期功能单位细分指标',
  T10: '表 10 生命周期各阶段',
  T11: '表 11 各情景基于基准情景的变化率',
  T12: '附表 12 数据质量评分依据',
}

export const REPORT_FIGURE_TITLE: Record<ReportFigureType, string> = {
  F1: '图 1 产品图片',
  F2: '图 2 各生命周期阶段碳排放分布图',
}

export const SECTION_TYPE_TEXT: Record<SectionType, string> = {
  auto: '自动装配',
  fixed: '固定文案',
  autoBlank: '有则装配 / 无则留白',
}

/** 生命周期阶段 → 系统边界中文（来自 PcfBoundary 字典编码） */
export function boundaryText(code: string): string {
  if (code === 'grave') return '摇篮到坟墓'
  if (code === 'gate_to_gate') return '大门到大门'
  return '摇篮到大门'
}

/** 数值格式化（保留 3 位小数；0 显示 0.000） */
export function formatEmission(value: number): string {
  if (!Number.isFinite(value)) return '0.000'
  return value.toFixed(3)
}

/** 科学计数法 4 位有效数字（模板 §6.2） */
export function formatSci(value: number): string {
  if (value === 0) return '0.000E0'
  return value.toExponential(3)
}

/** 百分比（保留 1 位） */
export function formatPercent(ratio: number): string {
  return `${ratio.toFixed(1)}%`
}

/** 金额 / 编号前缀 */
export function makeReportNo(seq: number): string {
  const now = new Date()
  const pad = (v: number) => String(v).padStart(2, '0')
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  return `PCF-R-${date}${String(seq).padStart(3, '0')}`
}

export function formatNow(): string {
  const now = new Date()
  const pad = (v: number) => String(v).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(
    now.getMinutes(),
  )}:${pad(now.getSeconds())}`
}

export function formatDateOnly(date: Date): string {
  const pad = (v: number) => String(v).padStart(2, '0')
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
}

/** 报告下载文件名（PRD R-117） */
export function makeReportFileName(productName: string): string {
  return `${productName}_产品碳足迹报告_${formatDateOnly(new Date())}.docx`
}
