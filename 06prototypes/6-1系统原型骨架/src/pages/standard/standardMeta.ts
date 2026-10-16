import type { TagTone } from '@/shared/components'

/**
 * 标准文件库（系统管理 → 基础库 → 标准文件库，A1-3 / P05）页面元数据。
 * 字段与枚举口径以《标准文件字段清单》V0.4 为唯一真相源，此处为前端原型投影。
 */

/* ============ 标准状态（录入框 · 自由文本，字段清单 §2.1） ============ */

/** 常用标准状态取值（仅作录入提示，非强制枚举） */
export const STANDARD_STATUS_PRESETS = ['现行', '被替代', '作废'] as const

/** 已知取值的标签色；其余自由录入值回退为默认色 */
const STATUS_TONE: Record<string, TagTone> = {
  现行: 'success',
  被替代: 'warning',
  作废: 'error',
  废止: 'error',
}

export const standardStatusTone = (status: string): TagTone => STATUS_TONE[status] ?? 'default'

/* ============ 展示格式化 ============ */

/** 日期展示：未填写显示 `-` */
export const dateText = (value: string) => value || '-'

/** 附件大小展示：B / KB / MB */
export function attachmentSizeText(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}
