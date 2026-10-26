import type { AdminRelievedReason, TenantChangeType, TenantMemberStatus, TenantStatus, TenantType } from '@/types'
import type { TagTone } from '@/shared/components'
import { menuNameOf } from '@/mock/menu'

/** 租户状态文案（字段清单 §1 status） */
export const tenantStatusText: Record<TenantStatus, string> = {
  enabled: '启用',
  disabled: '停用',
}

/** 租户状态色调 */
export const tenantStatusTone: Record<TenantStatus, TagTone> = {
  enabled: 'success',
  disabled: 'warning',
}

/** 租户类型文案（字段清单 §1 tenant_type） */
export const tenantTypeText: Record<TenantType, string> = {
  enterprise: '企业',
  government: '政府单位',
  org: '机构',
  park: '园区',
}

/** 状态变更类型文案（字段清单 §4 change_type） */
export const tenantChangeText: Record<TenantChangeType, string> = {
  create: '新建',
  disable: '停用',
  enable: '启用',
}

/** 主管理员卸任去向文案（字段清单 §3 relieved_reason） */
export const relievedReasonText: Record<AdminRelievedReason, string> = {
  demote: '降级为普通成员',
  disable: '禁用',
  remove: '移出租户',
}

/** 成员状态文案（成员关系表投影） */
export const memberStatusText: Record<TenantMemberStatus, string> = {
  enabled: '启用',
  disabled: '停用',
  removed: '已移出',
}

export const memberStatusTone: Record<TenantMemberStatus, TagTone> = {
  enabled: 'success',
  disabled: 'warning',
  removed: 'default',
}

/** 租户状态可执行的操作矩阵（业务 PRD §7 状态与操作矩阵；本期去掉重置密码与主管理员单独指定） */
export const tenantActions: Record<
  TenantStatus,
  {
    edit: boolean
    limit: boolean
    disable: boolean
    enable: boolean
    delete: boolean
    module: boolean
    enter: boolean
  }
> = {
  enabled: { edit: true, limit: true, disable: true, enable: false, delete: false, module: true, enter: true },
  disabled: { edit: true, limit: true, disable: false, enable: true, delete: true, module: true, enter: true },
}

/** 功能菜单 id → 菜单名称（模块授权展示与审计文案用） */
export const moduleNameOf = menuNameOf

/* ===================== 主档：有效期展示态（业务 PRD §4.10） ===================== */

export type TenantValidState = '长期有效' | '有效期内' | '即将到期' | '已过期'

const DAY = 24 * 60 * 60 * 1000
/** 原型固定「今天」，与 mock 数据时间轴一致 */
const TODAY = '2026-10-22'

/** 按有效期算展示态：到期只提示，不自动停用、不拒绝登录 */
export function tenantValidState(tenant: { validFrom: string; validTo: string }): TenantValidState {
  if (!tenant.validFrom && !tenant.validTo) return '长期有效'
  if (!tenant.validTo) return '有效期内'
  if (tenant.validTo < TODAY) return '已过期'
  const remain = (new Date(tenant.validTo).getTime() - new Date(TODAY).getTime()) / DAY
  return remain <= 30 ? '即将到期' : '有效期内'
}

export function tenantValidTone(state: TenantValidState): TagTone {
  if (state === '已过期') return 'error'
  if (state === '即将到期') return 'warning'
  if (state === '长期有效') return 'default'
  return 'success'
}

/** 档案完整度色调：100% 成功、60% 以上警示、以下错误 */
export function profileTone(percent: number): TagTone {
  if (percent >= 100) return 'success'
  if (percent >= 60) return 'warning'
  return 'error'
}
