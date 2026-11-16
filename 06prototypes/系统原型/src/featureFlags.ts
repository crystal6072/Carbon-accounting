/**
 * 原型功能显隐开关（评审期临时隐藏）。
 * 仅控制导航菜单中的功能入口，不影响组织架构页内的成员维护能力。
 */

/** 是否隐藏一级功能菜单「成员管理」：侧栏 / 顶栏 / 面包屑由 menuConfig 派生，一并隐藏 */
export const HIDE_MEMBER_MANAGEMENT: boolean = true

/** 成员管理菜单路由（菜单树按此 key 过滤） */
export const MEMBER_MANAGEMENT_ROUTE = '/system/member'
