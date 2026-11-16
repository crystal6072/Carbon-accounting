import type { DataScope, OrgNode, PcfProject, Role } from '@/types'
import { fetchRoles } from './role'
import { findMemberByAccount } from './tenant'
import { fetchOrgNodes } from './org'

/**
 * 数据权限运行时解析（原型模拟服务端行为）。
 *
 * 三条口径：
 * 1. **租户边界先于行级范围**：`row.tenantId !== ctx.tenantId` 一律拒绝，租户标识不接受前端传值；
 * 2. **多角色是集合并集**：同功能点取所有角色的范围谓词做 OR，不能收敛成单一档位
 *    （「指定部门」与「本部门」之间没有包含关系，取"最宽"会吞掉授权）；
 * 3. **部门空值兜底**：成员未挂部门时，`dept / dept_below` 降级为「仅本人」。
 */

/** 单个功能点上的一条读范围授权 */
export interface ScopeGrant {
  scope: DataScope
  /** scope = specified 时的部门 id 集合 */
  deptIds: string[]
}

/** 行级数据必须具备的三列（租户 / 部门 / 责任人） */
export type ScopeRow = Pick<PcfProject, 'tenantId' | 'deptId' | 'ownerId'>

export interface ScopeContext {
  accountId: string
  tenantId: string
  deptId: string
  /** 本部门及全部下级 id（含自身），由组织树实时计算 */
  deptWithDescendants: string[]
}

/**
 * 解析某成员在某功能点上的**全部**读范围授权（按所持角色取并集）。
 * 返回数组而非单一档位：调用方用 `inAnyScope` 做 OR 判定。
 */
export async function effectiveReadScopes(
  tenantId: string,
  accountId: string,
  menuId: string,
): Promise<ScopeGrant[]> {
  const member = findMemberByAccount(tenantId, accountId)
  if (!member || member.status !== 'enabled') return []

  const roles: Role[] = await fetchRoles('tenant')
  const held = roles.filter(
    (role) =>
      role.tenantId === tenantId && role.status === 'enabled' && member.roleNames.includes(role.name),
  )

  const grants: ScopeGrant[] = []
  held.forEach((role) => {
    role.menuGrants
      .filter((grant) => grant.menuId === menuId && grant.readScope)
      .forEach((grant) => {
        const scope = grant.readScope as DataScope
        const deptIds = scope === 'specified' ? [...(grant.scopeDeptIds ?? [])] : []
        const key = `${scope}|${deptIds.slice().sort().join(',')}`
        if (!grants.some((item) => `${item.scope}|${item.deptIds.slice().sort().join(',')}` === key)) {
          grants.push({ scope, deptIds })
        }
      })
  })
  return grants
}

/** 某部门的全部下级部门 id（含自身），按组织树的 path 前缀实时计算，不用快照 */
export async function deptIdsWithDescendants(tenantId: string, deptId: string): Promise<string[]> {
  if (!deptId) return []
  const nodes: OrgNode[] = await fetchOrgNodes(tenantId)
  const target = nodes.find((node) => node.id === deptId)
  if (!target || !target.path) return [deptId]
  return nodes
    .filter((node) => node.id === target.id || node.path.startsWith(target.path))
    .map((node) => node.id)
}

/** 单条授权的行级判定（租户边界永远先判） */
export function inScope(row: ScopeRow, grant: ScopeGrant, ctx: ScopeContext): boolean {
  if (row.tenantId !== ctx.tenantId) return false
  switch (grant.scope) {
    case 'all':
      return true
    case 'dept_below':
      if (!ctx.deptId) return row.ownerId === ctx.accountId
      return ctx.deptWithDescendants.includes(row.deptId)
    case 'dept':
      if (!ctx.deptId) return row.ownerId === ctx.accountId
      return row.deptId === ctx.deptId
    case 'specified':
      return grant.deptIds.includes(row.deptId)
    case 'self':
      return row.ownerId === ctx.accountId
    default:
      return false
  }
}

/** 多角色并集判定：任一条授权命中即可见 */
export function inAnyScope(row: ScopeRow, grants: ScopeGrant[], ctx: ScopeContext): boolean {
  if (grants.length === 0) return false
  return grants.some((grant) => inScope(row, grant, ctx))
}
