import type { EnableStatus, TenantType } from '@/types'
import type { TagTone } from '@/shared/components'

/**
 * 组织架构口径（组织架构 PRD V0.1）：
 * - 组织树归租户端维护，平台侧不提供跨租户组织树只读查看（原「组织架构全景」已移除），代配置须经「进入租户」；
 * - 模块码 `org`，与用户体系 PRD 的「部门」是同一实体。
 */

/** 租户类型称谓（组织侧沿用租户口径） */
export const orgTypeText: Record<TenantType, string> = {
  enterprise: '企业',
  government: '政府单位',
  park: '园区',
  org: '机构',
}

/** 组织节点状态文案 */
export const orgNodeStatusText: Record<EnableStatus, string> = {
  enabled: '启用',
  disabled: '停用',
}

export const orgNodeStatusTone: Record<EnableStatus, TagTone> = {
  enabled: 'success',
  disabled: 'warning',
}
