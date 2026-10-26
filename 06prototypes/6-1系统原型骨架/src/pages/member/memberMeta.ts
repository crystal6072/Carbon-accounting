import type { MemberJoinVia, TenantMemberStatus } from '@/types'
import type { TagTone } from '@/shared/components'

/**
 * 成员状态文案。
 * 业务口径为两态：正常（ACTIVE）/ 已禁用（DISABLED）；已移出为隐藏的高权限终态，
 * 移出操作从常规 UI 收敛为隐藏操作（§成员状态管理：不提供物理删除，仅保留隐藏的移出能力）。
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
}

/**
 * 成员状态可执行的操作矩阵（成员状态管理规则）。
 * - 正常：可禁用（离岗，切断登录但保留数据 / 日志）、编辑、重置密码、查看有效权限。
 * - 已禁用：仅可启用（复岗，弹窗允许重新选择部门应对调岗）与查看详情；其余操作收敛。
 * - 已移出：终态，常规 UI 不提供任何操作（移出为隐藏的高权限操作）。
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
  enabled: { edit: true, disable: true, enable: false, remove: false, reset: true, permission: true },
  disabled: { edit: false, disable: false, enable: true, remove: false, reset: false, permission: false },
  removed: { edit: false, disable: false, enable: false, remove: false, reset: false, permission: false },
}

/** 角色数量约束（§5.1-8：1 至 5 个，至少 1 个） */
export const ROLE_MIN = 1
export const ROLE_MAX = 5

/** 密码复杂度提示（与平台账号口径一致） */
export const PASSWORD_HINT = '不少于 8 位，且包含大写字母、小写字母、数字、特殊字符中的三类'
