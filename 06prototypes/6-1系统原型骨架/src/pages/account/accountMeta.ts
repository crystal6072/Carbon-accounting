import type { AccountStatus } from '@/types'
import type { TagTone } from '@/shared/components'

/** 账号状态文案（字段清单 §1 status） */
export const accountStatusText: Record<AccountStatus, string> = {
  enabled: '启用',
  disabled: '停用',
  canceled: '注销',
}

/** 账号状态色调 */
export const accountStatusTone: Record<AccountStatus, TagTone> = {
  enabled: 'success',
  disabled: 'warning',
  canceled: 'default',
}

/** 账号状态可执行的操作矩阵（业务 PRD §8 状态与操作矩阵） */
export const accountActions: Record<
  AccountStatus,
  { edit: boolean; assign: boolean; reset: boolean; disable: boolean; enable: boolean; cancel: boolean }
> = {
  enabled: { edit: true, assign: true, reset: true, disable: true, enable: false, cancel: true },
  disabled: { edit: true, assign: true, reset: true, disable: false, enable: true, cancel: true },
  canceled: { edit: false, assign: false, reset: false, disable: false, enable: false, cancel: false },
}

/** 列表与详情的密码展示值（只呈现掩码，不回显明文，D09） */
export const PASSWORD_MASK = '••••••••'

/**
 * 手机号脱敏（列表与详情展示用）。
 * 表单内编辑时仍展示明文，否则无法修改。
 */
export function maskMobile(mobile: string): string {
  if (!mobile) return '—'
  if (mobile.length !== 11) return mobile
  return `${mobile.slice(0, 3)}****${mobile.slice(7)}`
}
