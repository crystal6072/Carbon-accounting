import type { TagTone } from '@/shared/components'
import type { LibraryBizType, LibraryFileCategory, LibraryFileStatus } from '@/types'

/** 分类展示顺序（左侧导航，字段清单 §2.1） */
export const categoryOrder: LibraryFileCategory[] = [
  'detect_report',
  'purchase_invoice',
  'transport_doc',
  'qualification',
  'contract',
  'other',
]

export const categoryText: Record<LibraryFileCategory, string> = {
  detect_report: '检测报告',
  purchase_invoice: '发票',
  transport_doc: '运输单据',
  qualification: '资质证件',
  contract: '合同协议',
  other: '其他',
}

export const categoryTone: Record<LibraryFileCategory, TagTone> = {
  detect_report: 'info',
  purchase_invoice: 'success',
  transport_doc: 'default',
  qualification: 'success',
  contract: 'default',
  other: 'default',
}

export const statusText: Record<LibraryFileStatus, string> = {
  normal: '正常',
  disabled: '已停用',
}

export const statusTone: Record<LibraryFileStatus, TagTone> = {
  normal: 'success',
  disabled: 'default',
}

export const bizTypeText: Record<LibraryBizType, string> = {
  carbon_detection: '含碳量检测库',
  energy_ledger: '加工能耗台账',
  transport_ledger: '运输台账',
  pcf_project: '碳足迹核算项目',
  report: '报告编制',
  product: '我的产品库',
  model: '我的模型',
}

/** 上传控件 accept（字段清单 §2.7） */
export const FILE_ACCEPT = 'image/*,.pdf,.doc,.docx,.xls,.xlsx'

/** 允许的扩展名白名单（小写、不含点） */
export const FILE_EXT_WHITELIST = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'bmp', 'xls', 'xlsx', 'doc', 'docx']

/** 单文件上限 20MB */
export const MAX_FILE_SIZE = 20 * 1024 * 1024

/** 文件大小展示：B / KB / MB */
export function formatSize(size: number): string {
  if (!size) return '—'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

/** 校验扩展名与大小（D13）；返回错误文案，合法返回空串 */
export function validateFile(file: { name: string; size: number }): string {
  const ext = (file.name.toLowerCase().split('.').pop() ?? '').trim()
  if (!FILE_EXT_WHITELIST.includes(ext)) return `${file.name}：不支持的格式（仅支持 PDF / 图片 / Word / Excel）`
  if (file.size > MAX_FILE_SIZE) return `${file.name}：超过 20MB 上限`
  return ''
}

/** 引用次数（仅统计有效引用，D09） */
export function activeRefCountOf(item: { references: Array<{ active: boolean }> }): number {
  return item.references.filter((ref) => ref.active).length
}
