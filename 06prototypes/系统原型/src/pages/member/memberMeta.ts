import type { MemberJoinVia, TenantMemberStatus } from '@/types'
import type { TagTone } from '@/shared/components'

/**
 * 成员状态文案。
 * 三态：正常 / 已禁用 / 已移出；移出为离职终态，本期以简化版提供（状态 + 收回角色 + 审计），
 * 不删成员记录、不注销账号、不影响其他租户。
 */
export const memberStatusText: Record<TenantMemberStatus, string> = {
  enabled: '正常',
  disabled: '已禁用',
  removed: '已移出',
}

/** 成员状态色调 */
export const memberStatusTone: Record<TenantMemberStatus, TagTone> = {
  enabled: 'success',
  disabled: 'warning',
  removed: 'default',
}

/** 加入方式文案（字段清单 §1 joined_via） */
export const joinedViaText: Record<MemberJoinVia, string> = {
  manual: '手工新建',
  linked: '关联已有账号',
}

/**
 * 成员状态可执行的操作矩阵（成员状态管理规则）。
 * - 正常：可禁用（离岗）、编辑、移出（离职）、重置密码、查看有效权限。
 * - 已禁用：可启用（复岗，弹窗允许重新选择部门）与移出；编辑 / 重置 / 有效权限收敛。
 * - 已移出：终态，不提供任何操作。
 * 主管理员 / 唯一管理员的禁用限制由页面与后端按 primaryAdmin、唯一管理员再收敛。
 */
export const memberActions: Record<
  TenantMemberStatus,
  {
    edit: boolean
    disable: boolean
    enable: boolean
    remove: boolean
    reset: boolean
    permission: boolean
  }
> = {
  enabled: { edit: true, disable: true, enable: false, remove: true, reset: true, permission: true },
  disabled: { edit: true, disable: false, enable: true, remove: true, reset: false, permission: false },
  removed: { edit: false, disable: false, enable: false, remove: false, reset: false, permission: false },
}

/** 角色数量约束（§5.1-8：1 至 5 个，至少 1 个） */
export const ROLE_MIN = 1
export const ROLE_MAX = 5

/** 密码复杂度提示（与平台账号口径一致） */
export const PASSWORD_HINT = '不少于 8 位，且包含大写字母、小写字母、数字、特殊字符中的三类'
