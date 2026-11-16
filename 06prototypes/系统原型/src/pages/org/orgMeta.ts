import type { TenantType } from '@/types'

/**
 * 组织架构口径（组织架构 PRD V0.1）：
 * - 组织树归租户端维护，平台侧不提供跨租户组织树只读查看（原「组织架构全景」已移除）；
 * - 模块码 `org`，与用户体系 PRD 的「部门」是同一实体；
 * - 组织节点只有「存在 / 已删除」两态，不提供停用 / 启用（MVP 口径）。
 */

/** 租户类型称谓（组织侧沿用租户口径） */
export const orgTypeText: Record<TenantType, string> = {
  enterprise: '企业',
  government: '政府单位',
  park: '园区',
  org: '机构',
}
