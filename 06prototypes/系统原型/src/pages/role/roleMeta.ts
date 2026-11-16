import type { MenuGrant, RoleScope, RoleStatus } from '@/types'
import type { TagTone } from '@/shared/components'

/** 角色状态文案（字段清单 §1 status） */
export const roleStatusText: Record<RoleStatus, string> = {
  enabled: '启用',
  disabled: '停用',
  deleted: '已删除',
}

/** 角色状态色调 */
export const roleStatusTone: Record<RoleStatus, TagTone> = {
  enabled: 'success',
  disabled: 'warning',
  deleted: 'default',
}

/** 归属类型文案（字段清单 §1 scope_type） */
export const roleScopeText: Record<RoleScope, string> = {
  platform: '平台',
  tenant: '租户',
}

/** 角色状态可执行的操作矩阵（业务 PRD §8.1） */
export const roleActions: Record<
  RoleStatus,
  { edit: boolean; copy: boolean; disable: boolean; enable: boolean; delete: boolean; members: boolean }
> = {
  enabled: { edit: true, copy: true, disable: true, enable: false, delete: true, members: true },
  disabled: { edit: true, copy: true, disable: false, enable: true, delete: true, members: true },
  deleted: { edit: false, copy: false, disable: false, enable: false, delete: false, members: false },
}

/** 租户类型文案（沿用既有口径） */
export const tenantTypeText: Record<string, string> = {
  enterprise: '企业',
  government: '政府单位',
  org: '机构',
}

