import type { DataScope, MenuGrant, RoleScope, RoleStatus } from '@/types'
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

/* ===================== 数据范围（租户切片专属，业务 PRD §5.5） ===================== */

/** 数据范围五档文案（§5.5-1） */
export const dataScopeText: Record<DataScope, string> = {
  all: '全部',
  dept_below: '本部门及下级',
  dept: '本部门',
  self: '仅本人',
  specified: '指定部门',
}

/**
 * 下拉展示顺序（视觉上由宽到窄）。
 * **注意：这不是可比较的宽窄序** ——「指定部门」与「本部门 / 本部门及下级」之间不存在包含关系，
 * 不能用同一个数字刻度判定谁更宽。
 */
const DATA_SCOPE_DISPLAY_ORDER: DataScope[] = ['all', 'dept_below', 'dept', 'specified', 'self']

/** 数据范围下拉选项（按展示顺序） */
export const dataScopeOptions: { label: string; value: DataScope }[] = DATA_SCOPE_DISPLAY_ORDER.map(
  (value) => ({ label: dataScopeText[value], value }),
)

/** 仅「部门档位」之间存在全序：all > dept_below > dept > self */
const DEPT_SCOPE_ORDER: Record<Exclude<DataScope, 'specified'>, number> = {
  all: 3,
  dept_below: 2,
  dept: 1,
  self: 0,
}

/** 读写范围比较结果：合法 / 写更宽 / 不可比较（需人工确认） */
export type ScopeComparison = 'ok' | 'wider' | 'incomparable'

/**
 * 判定「写范围是否宽于读范围」（§5.5-2）。
 *
 * - 两侧同为「指定部门」→ 按**部门集合**判定：写集合 ⊆ 读集合 才合法；
 * - 一侧为「指定部门」、另一侧为部门档位 → **不可比较**（集合可能互相包含，档位大小说明不了什么），
 *   由调用方提示「无法自动判定，请两侧都选指定部门或都选部门档」；
 * - 其余按 all > dept_below > dept > self 比较。
 */
export function compareScope(
  read: DataScope,
  write: DataScope,
  readDeptIds: string[] = [],
  writeDeptIds: string[] = [],
): ScopeComparison {
  if (read === write) {
    if (read !== 'specified') return 'ok'
    return writeDeptIds.every((id) => readDeptIds.includes(id)) ? 'ok' : 'wider'
  }
  if (write === 'all') return 'wider'
  if (read === 'all') return 'ok'
  if (read === 'specified' || write === 'specified') return 'incomparable'
  return DEPT_SCOPE_ORDER[write] > DEPT_SCOPE_ORDER[read] ? 'wider' : 'ok'
}

/** 功能点读 / 写范围文案：未配置或不适用数据范围时返回 — */
export function scopeTextOf(grant: MenuGrant | undefined, kind: 'read' | 'write'): string {
  if (!grant) return '—'
  const scope = kind === 'read' ? grant.readScope : grant.writeScope
  return scope ? dataScopeText[scope] : '—'
}

/**
 * 角色数据范围概览：**仅用于列表展示**。
 * 多角色合并的真实语义是集合并集，无法用一个档位表达；
 * 此处按「包含度从高到低」取首个出现的档位做近似展示，不参与任何权限判定。
 */
export function roleScopeSummary(grants: MenuGrant[]): { read: string; write: string } {
  const withScope = grants.filter((grant) => grant.readScope || grant.writeScope)
  if (withScope.length === 0) return { read: '—', write: '—' }
  const widest = (kind: 'read' | 'write'): string => {
    const scopes = withScope
      .map((grant) => (kind === 'read' ? grant.readScope : grant.writeScope))
      .filter((item): item is DataScope => !!item)
    if (scopes.length === 0) return '—'
    const top = DATA_SCOPE_DISPLAY_ORDER.find((scope) => scopes.includes(scope)) ?? scopes[0]
    return dataScopeText[top]
  }
  return { read: widest('read'), write: widest('write') }
}
