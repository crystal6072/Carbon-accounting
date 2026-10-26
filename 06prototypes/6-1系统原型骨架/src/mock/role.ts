import type { Role, MenuGrant, RolePayload, RoleScope, DataScope } from '@/types'
import { fetchMenu, MENU_IDS } from './menu'
import { fetchOrgNodes } from './org'

const NOW = '2026-10-21 09:30'
const OPERATOR = '平台超管 · 林澈'
const CURRENT_TENANT = '熊宝家居科技有限公司'
/** 演示租户 id：租户角色只在租户内生效 */
const CURRENT_TENANT_ID = 'T001'

/**
 * 租户内置角色「租户管理员」（租户管理 PRD V0.9 §4.17）：
 * 平台管理员创建租户并关联主管理员后，系统在该租户内自动创建本角色并分配给该账号，
 * 默认勾选租户端全部功能点（默认拥有租户全部功能权限），实际生效仍受模块授权约束。
 */
export const TENANT_ADMIN_ROLE_NAME = '租户管理员'
export const TENANT_ADMIN_ROLE_CODE = 'TENANT_ADMIN'
const TENANT_ADMIN_CREATOR = '系统（开户初始化）'

/** 模拟网络延迟，保持与既有 mock 的交互手感一致 */
function request<T>(data: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), 180))
}

/** 角色标识格式：大写字母开头，大写字母 / 数字 / 下划线 */
const CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/

/** 单一菜单引用：平台角色只配功能菜单，不配数据范围（§1.3 / §5.2-7） */
function grant(menuId: string): MenuGrant {
  return { menuId }
}

/** 带数据范围的菜单引用（仅租户角色：读写各一档；指定部门另存部门 id 列表，§5.5-10） */
function grantScope(menuId: string, read: DataScope, write: DataScope, deptIds: string[] = []): MenuGrant {
  return { menuId, readScope: read, writeScope: write, scopeDeptIds: deptIds }
}

/**
 * 租户端功能菜单 id（产品碳足迹业务域 + 系统管理租户端）。
 * 用于区分「平台侧功能」与「租户端功能」：租户角色只授权下面这些，平台侧功能不向租户开放。
 * 系统管理租户端 4 项（租户信息 / 组织架构 / 成员管理 / 角色管理）与平台侧功能同处一级「系统管理」下，
 * 靠这里的白名单区分，而不是靠菜单层级。
 */
const TENANT_FRONTEND_IDS = [
  'M101', 'M102', 'M103', 'M104', 'M105', 'M106', 'M107', 'M108',
  'M109', 'M110', 'M121', 'M122', 'M135', 'M136', 'M137', 'M138',
]
/**
 * 租户端角色可勾选的功能菜单范围（业务 PRD §5.4-3：勾选树只出现适用端为租户端的功能）。
 * 含分组节点，供租户端授权树过滤使用；平台支撑类菜单不出现在租户端。
 */
export const TENANT_MENU_IDS: string[] = [...TENANT_FRONTEND_IDS]

/** 核算主链：项目 / 填报 / 核算 / 报告 / 我的库（不含系统管理租户端） */
const TENANT_PCF_CORE_IDS = [
  'M101', 'M102', 'M103', 'M104', 'M105', 'M106', 'M107', 'M108',
  'M109', 'M110', 'M121', 'M122',
]

/**
 * 适用数据范围的租户端功能点（功能目录「是否适用数据范围」标记，业务 PRD §5.5-11）。
 * 业务功能按部门 / 责任人隔离，故适用；系统管理类（组织架构 / 成员管理 / 角色管理）不适用。
 */
export const DATA_SCOPE_MENU_IDS: string[] = [...TENANT_PCF_CORE_IDS]

/** 数据范围由宽到窄（§5.5-1）：写范围不得宽于读范围（§5.5-2），多角色取最宽（§5.5-3） */
const SCOPE_RANK: Record<DataScope, number> = {
  all: 4,
  dept_below: 3,
  dept: 2,
  specified: 1,
  self: 0,
}

/**
 * 角色存储（字段清单 §1 `role`）：按归属类型分平台 / 租户两类。
 * 只预置最小角色集：平台内置 2 个（超级管理员、平台运营人员），租户内置 1 个（租户管理员）；
 * 其余岗位角色不预置，由超级管理员 / 租户管理员按需新增。
 * 各角色默认勾选全部菜单（统一数据源；不再区分平台 / 租户端、系统管理锁定）。
 */
let roleStore: Role[] = [
  {
    id: 'R01',
    scope: 'platform',
    code: 'SUPER_ADMIN',
    name: '超级管理员',
    description: '系统根账户，仅 root 持有，菜单固定',
    builtin: true,
    superAdmin: true,
    status: 'enabled',
    menuGrants: MENU_IDS.map(grant),
    members: [
      { id: 'A001', name: '林澈', sub: 'admin', status: 'active' },
      { id: 'A002', name: '陈墨', sub: 'chenmo', status: 'active' },
    ],
    createdBy: '系统初始化',
    createdAt: '2026-08-26 15:23',
    updatedBy: '系统初始化',
    updatedAt: '2026-09-01 10:00',
  },
  {
    id: 'R02',
    scope: 'platform',
    code: 'PLATFORM_OPERATOR',
    name: '平台运营人员',
    description: '内置角色：负责日常租户开通、模块授权与平台基础库维护',
    builtin: true,
    superAdmin: false,
    status: 'enabled',
    menuGrants: MENU_IDS.map(grant),
    members: [
      { id: 'A002', name: '陈墨', sub: 'chenmo', status: 'active' },
      { id: 'A003', name: '苏岐', sub: 'suqi', status: 'active' },
      { id: 'A004', name: '何屿', sub: 'heyu', status: 'active' },
      { id: 'A005', name: '周予安', sub: 'ops01', status: 'active' },
      { id: 'A006', name: '郑棠', sub: 'ops_zheng', status: 'disabled' },
      { id: 'A007', name: '陆见微', sub: 'ops_lu', status: 'active' },
      { id: 'A008', name: '祁夜', sub: 'ops_qi', status: 'disabled' },
    ],
    createdBy: '系统初始化',
    createdAt: '2026-08-26 15:23',
    updatedBy: '系统初始化',
    updatedAt: '2026-09-01 10:00',
  },
  {
    id: 'T01',
    scope: 'tenant',
    tenantId: 'T001',
    tenantName: CURRENT_TENANT,
    code: 'TENANT_ADMIN',
    name: '租户管理员',
    description: '开户自动创建：租户内最高权限，默认拥有租户全部功能权限',
    builtin: true,
    superAdmin: false,
    protectedRole: true,
    status: 'enabled',
    // 租户管理员默认勾选租户端全部功能点，数据范围读写均「全部」（§5.1-11）
    menuGrants: TENANT_FRONTEND_IDS.map((id) => grantScope(id, 'all', 'all')),
    members: [
      { id: 'TM001', name: '苏岐', sub: '总经办', status: 'active' },
      { id: 'TM002', name: '温朔', sub: '核算部', status: 'active' },
      { id: 'TM003', name: '江舸', sub: '核算部', status: 'active' },
      { id: 'TM004', name: '路柠', sub: '录入组', status: 'disabled' },
    ],
    createdBy: '系统（开户初始化）',
    createdAt: '2026-09-02 09:00',
    updatedBy: '系统（开户初始化）',
    updatedAt: '2026-09-02 09:00',
  },
]

/* ===================== 校验 ===================== */

/**
 * 归属范围判定：平台切片平台内唯一；租户切片按租户内唯一，不跨租户判重（§5.1-5）。
 */
function inScope(item: Role, scope: RoleScope, tenantId?: string): boolean {
  if (item.scope !== scope) return false
  if (scope === 'tenant' && tenantId) return item.tenantId === tenantId
  return true
}

/** 角色标识校验：格式 + 归属范围内唯一（不含已删除） */
function assertCode(scope: RoleScope, code: string, excludeId?: string, tenantId?: string): void {
  const trimmed = code.trim()
  if (!trimmed) throw new Error('保存失败：角色标识必填')
  if (!CODE_PATTERN.test(trimmed)) {
    throw new Error('保存失败：角色标识仅支持大写字母、数字与下划线，且以字母开头')
  }
  const duplicated = roleStore.some(
    (item) => inScope(item, scope, tenantId) && item.id !== excludeId && item.status !== 'deleted' && item.code === trimmed,
  )
  if (duplicated) throw new Error('保存失败：归属范围内已存在相同角色标识')
}

/** 角色名称校验：必填 + 归属范围内唯一（不含已删除） */
function assertName(scope: RoleScope, name: string, excludeId?: string, tenantId?: string): void {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('保存失败：角色名称必填')
  if (trimmed.length > 50) throw new Error('保存失败：角色名称最长 50 字符')
  const duplicated = roleStore.some(
    (item) => inScope(item, scope, tenantId) && item.id !== excludeId && item.status !== 'deleted' && item.name === trimmed,
  )
  if (duplicated) throw new Error('保存失败：归属范围内已存在同名角色')
}

function assertCustomCap(scope: RoleScope, excludeId?: string, tenantId?: string): void {
  const customCount = roleStore.filter(
    (item) =>
      inScope(item, scope, tenantId) && !item.builtin && item.status !== 'deleted' && item.id !== excludeId,
  ).length
  if (customCount >= 20) throw new Error('保存失败：自定义角色上限 20 个')
}

/** 菜单勾选校验（「分配权限」保存时）：至少 1 个；存在、启用 */
async function assertGrants(role: Role, grants: MenuGrant[]): Promise<void> {
  if (grants.length === 0) throw new Error('保存失败：至少勾选 1 个菜单')
  const seen = new Set<string>()
  for (const grant of grants) {
    if (seen.has(grant.menuId)) throw new Error('保存失败：同一菜单不可重复勾选')
    seen.add(grant.menuId)
    const fn = await fetchMenu(grant.menuId)
    if (fn.status !== 'enabled') throw new Error(`保存失败：「${fn.name}」已停用，不可勾选`)
  }
}

/**
 * 数据范围校验（仅租户角色，§5.5）：
 * 读写各配一档、写不宽于读、指定部门必选且部门存在；不适用数据范围的功能点不配范围。
 */
async function assertScopes(role: Role, grants: MenuGrant[]): Promise<void> {
  if (role.scope !== 'tenant') return
  const deptIds = new Set((await fetchDeptScopeOptions(role.tenantId)).map((item) => item.value))
  for (const item of grants) {
    if (!DATA_SCOPE_MENU_IDS.includes(item.menuId)) continue
    const fn = await fetchMenu(item.menuId)
    const { readScope, writeScope, scopeDeptIds } = item
    if ((readScope && !writeScope) || (!readScope && writeScope)) {
      throw new Error(`保存失败：「${fn.name}」数据范围读写各配一档（§5.5-2）`)
    }
    if (!readScope || !writeScope) continue
    if (SCOPE_RANK[writeScope] > SCOPE_RANK[readScope]) {
      throw new Error(`保存失败：「${fn.name}」写范围不得宽于读范围（§5.5-2）`)
    }
    if ((readScope === 'specified' || writeScope === 'specified') && (scopeDeptIds ?? []).length === 0) {
      throw new Error(`保存失败：「${fn.name}」数据范围为「指定部门」时必须选择部门（§5.5-10）`)
    }
    const invalid = (scopeDeptIds ?? []).filter((id) => !deptIds.has(id))
    if (invalid.length > 0) {
      throw new Error(`保存失败：「${fn.name}」包含已删除或已停用的部门，请重新选择`)
    }
  }
}

/** 生效成员数（原型中以 members 是否含该成员表达） */
export function countActiveMembers(role: Role): number {
  return role.members.filter((item) => item.status === 'active').length
}

/* ===================== 查询 ===================== */

/** 角色列表：默认不含已删除；平台 / 租户按归属类型分开查 */
export function fetchRoles(scope: RoleScope, withDeleted = false): Promise<Role[]> {
  const list = roleStore.filter(
    (item) => item.scope === scope && (withDeleted || item.status !== 'deleted'),
  )
  return request([...list])
}

/**
 * 租户端「角色管理」列表：只返回本租户角色（§1.6 R4：租户角色只在所属租户可见、不跨租户复用）。
 * 平台侧入口只返回平台角色，两侧各看各的（§1.6 R6）。
 */
export function fetchTenantRoles(tenantId: string = CURRENT_TENANT_ID): Promise<Role[]> {
  const list = roleStore.filter(
    (item) => item.scope === 'tenant' && item.tenantId === tenantId && item.status !== 'deleted',
  )
  return request([...list])
}

/** 数据范围「指定部门」候选项：本租户启用状态的组织节点（部门删除后自动移除，§5.5-10） */
export async function fetchDeptScopeOptions(
  tenantId: string = CURRENT_TENANT_ID,
): Promise<{ label: string; value: string }[]> {
  const nodes = await fetchOrgNodes(tenantId)
  return nodes.filter((node) => node.status === 'enabled').map((node) => ({ label: node.name, value: node.id }))
}

/** 角色详情 */
export async function fetchRole(id: string): Promise<Role> {
  const target = roleStore.find((item) => item.id === id)
  if (!target) throw new Error('角色不存在或已被删除')
  return request(target)
}

/** 平台账号分配角色用：只返回启用状态的平台角色（指派列表只展示启用角色） */
export function fetchPlatformRoles(): Promise<Role[]> {
  return request(roleStore.filter((item) => item.scope === 'platform' && item.status === 'enabled'))
}

/** 是否超级管理员角色（保护角色） */
export function isSuperAdminRole(roleId: string): boolean {
  return roleStore.some((item) => item.id === roleId && item.superAdmin)
}

/* ===================== 维护 ===================== */

/**
 * 新建角色：只建角色档案（名称 / 标识 / 描述），功能通过「分配权限」单独授权。
 * 自定义角色计入 20 上限；新角色默认启用、无菜单勾选。
 */
export async function createRole(
  scope: RoleScope,
  payload: RolePayload,
  tenant?: { tenantId: string; tenantName: string },
): Promise<Role> {
  assertName(scope, payload.name, undefined, tenant?.tenantId)
  if (payload.code) assertCode(scope, payload.code, undefined, tenant?.tenantId)
  assertCustomCap(scope, undefined, tenant?.tenantId)

  const item: Role = {
    id: `R${Date.now().toString().slice(-6)}`,
    scope,
    tenantId: scope === 'tenant' ? tenant?.tenantId : undefined,
    tenantName: scope === 'tenant' ? tenant?.tenantName : undefined,
    code: (payload.code ?? '').trim(),
    name: payload.name.trim(),
    description: payload.description.trim(),
    builtin: false,
    superAdmin: false,
    status: 'enabled',
    menuGrants: [],
    members: [],
    createdBy: OPERATOR,
    createdAt: NOW,
    updatedBy: OPERATOR,
    updatedAt: NOW,
  }
  roleStore = [item, ...roleStore]
  return request(item)
}

/** 修改角色：内置只读；角色标识创建后不可改 */
export async function updateRole(id: string, payload: RolePayload): Promise<Role> {
  const target = roleStore.find((item) => item.id === id)
  if (!target) throw new Error('角色不存在或已被删除')
  if (target.builtin) throw new Error('操作失败：内置角色不可修改，请走复制')
  if (payload.code && payload.code.trim() !== target.code) {
    throw new Error('操作失败：角色标识创建后不可修改')
  }

  assertName(target.scope, payload.name, id, target.tenantId)

  target.name = payload.name.trim()
  target.description = payload.description.trim()
  target.updatedBy = OPERATOR
  target.updatedAt = NOW
  return request(target)
}

/**
 * 分配权限：保存角色的功能菜单勾选，立即生效。
 * 租户角色同时保存每个功能点的读 / 写数据范围（§5.4 / §5.5）；平台角色不落数据范围（§1.3）。
 */
export async function assignRoleFunctions(id: string, grants: MenuGrant[]): Promise<Role> {
  const target = roleStore.find((item) => item.id === id)
  if (!target) throw new Error('角色不存在或已被删除')
  // 租户管理员（租户内置保护角色）允许被租户管理员收窄功能与范围；其余内置角色只读
  if (target.builtin && !target.protectedRole) throw new Error('操作失败：内置角色不可修改，请走复制')

  await assertGrants(target, grants)
  await assertScopes(target, grants)

  target.menuGrants = grants.map((grant) =>
    target.scope === 'tenant' ? { ...grant } : { menuId: grant.menuId },
  )
  target.updatedBy = OPERATOR
  target.updatedAt = NOW
  return request(target)
}

/** 复制角色：携带功能菜单勾选；复制结果为自定义角色；不可跨归属复制 */
export async function copyRole(id: string, payload: RolePayload): Promise<Role> {
  const source = roleStore.find((item) => item.id === id)
  if (!source) throw new Error('角色不存在或已被删除')
  assertName(source.scope, payload.name, undefined, source.tenantId)
  assertCode(source.scope, payload.code ?? '', undefined, source.tenantId)
  assertCustomCap(source.scope, undefined, source.tenantId)

  // 复制携带功能勾选与数据范围配置（§5.7-2）
  const grants: MenuGrant[] = source.menuGrants.map((grant) => ({ ...grant }))

  const item: Role = {
    id: `R${Date.now().toString().slice(-6)}`,
    scope: source.scope,
    tenantId: source.tenantId,
    tenantName: source.tenantName,
    code: (payload.code ?? '').trim(),
    name: payload.name.trim(),
    description: payload.description.trim() || source.description,
    builtin: false,
    superAdmin: false,
    status: 'enabled',
    menuGrants: grants,
    members: [],
    createdBy: OPERATOR,
    createdAt: NOW,
    updatedBy: OPERATOR,
    updatedAt: NOW,
  }
  roleStore = [item, ...roleStore]
  return request(item)
}

/**
 * 租户开户 / 主管理员交接时调用（租户管理 PRD V0.9 §4.17）：
 * 确保该租户存在「租户管理员」角色，并把主管理员的成员关系挂到该角色上。
 * - 不存在：创建租户内置保护角色，默认勾选租户端全部功能点（默认拥有租户全部功能权限）
 * - 已存在：只补成员引用，不重复创建
 * 平台侧只触发创建与分配，不参与租户角色的后续维护（租户自建自管、只在租户内生效）。
 */
export function ensureTenantAdminRole(params: {
  tenantId: string
  tenantName: string
  memberId: string
  memberName: string
  deptName?: string
}): Role {
  const ref = {
    id: params.memberId,
    name: params.memberName,
    sub: params.deptName || '总经办',
    status: 'active' as const,
  }
  const existing = roleStore.find(
    (item) =>
      item.scope === 'tenant' &&
      item.tenantId === params.tenantId &&
      item.name === TENANT_ADMIN_ROLE_NAME &&
      item.status !== 'deleted',
  )
  if (existing) {
    if (!existing.members.some((item) => item.id === params.memberId)) {
      existing.members = [...existing.members, ref]
    }
    existing.updatedBy = TENANT_ADMIN_CREATOR
    existing.updatedAt = NOW
    return existing
  }

  const item: Role = {
    id: `TR${Date.now().toString().slice(-6)}`,
    scope: 'tenant',
    tenantId: params.tenantId,
    tenantName: params.tenantName,
    code: TENANT_ADMIN_ROLE_CODE,
    name: TENANT_ADMIN_ROLE_NAME,
    description: `开户自动创建：${params.tenantName} 的租户管理员，默认拥有租户全部功能权限`,
    builtin: true,
    superAdmin: false,
    protectedRole: true,
    status: 'enabled',
    menuGrants: TENANT_FRONTEND_IDS.map((id) => grantScope(id, 'all', 'all')),
    members: [ref],
    createdBy: TENANT_ADMIN_CREATOR,
    createdAt: NOW,
    updatedBy: TENANT_ADMIN_CREATOR,
    updatedAt: NOW,
  }
  roleStore = [item, ...roleStore]
  return item
}

/** 停用 / 启用：超级管理员与租户管理员不可停用；停用不删关联，恢复后自动生效 */
export async function updateRoleStatus(id: string, status: Role['status']): Promise<Role> {
  const target = roleStore.find((item) => item.id === id)
  if (!target) throw new Error('角色不存在或已被删除')
  if (status === 'disabled' && target.superAdmin) {
    throw new Error('操作失败：超级管理员为保护角色，不可停用')
  }
  if (status === 'disabled' && target.protectedRole) {
    throw new Error('操作失败：租户管理员为租户内置保护角色，不可停用（E19）')
  }
  if (target.status === status) {
    throw new Error(status === 'disabled' ? '操作失败：角色已停用' : '操作失败：角色已启用')
  }
  target.status = status
  target.updatedBy = OPERATOR
  target.updatedAt = NOW
  return request(target)
}

/** 删除：软删；有生效成员引用时拒绝；名称与标识不释放 */
export async function deleteRole(id: string): Promise<Role> {
  const target = roleStore.find((item) => item.id === id)
  if (!target) throw new Error('角色不存在或已被删除')
  if (target.builtin) throw new Error('操作失败：内置角色不可删除')
  if (countActiveMembers(target) > 0) {
    throw new Error(`操作失败：该角色下仍有 ${countActiveMembers(target)} 个生效成员，请先移除成员`)
  }
  target.status = 'deleted'
  target.updatedBy = OPERATOR
  target.updatedAt = NOW
  return request(target)
}

/**
 * 移除角色成员：收回该角色，不影响其他角色。
 * 平台切片校验账号至少保留 1 个平台角色；超级管理员角色不可移除最后一个持有人。
 */
export async function removeRoleMember(roleId: string, memberId: string): Promise<Role> {
  const target = roleStore.find((item) => item.id === roleId)
  if (!target) throw new Error('角色不存在或已被删除')
  const member = target.members.find((item) => item.id === memberId)
  if (!member) throw new Error('操作失败：成员不存在')

  const otherActiveRoles =
    target.scope === 'platform'
      ? roleStore.filter(
          (item) =>
            item.scope === 'platform' &&
            item.id !== roleId &&
            item.members.some((m) => m.id === memberId && m.status === 'active'),
        ).length
      : 1
  if (target.scope === 'platform' && otherActiveRoles === 0) {
    throw new Error('操作失败：该账号至少保留 1 个平台角色')
  }
  if (target.superAdmin && countActiveMembers(target) <= 1) {
    throw new Error('操作失败：不可移除最后一个超级管理员')
  }

  target.members = target.members.filter((item) => item.id !== memberId)
  target.updatedBy = OPERATOR
  target.updatedAt = NOW
  return request(target)
}

/**
 * 平台账号侧角色联动：账号新建 / 分配角色后同步角色成员引用，
 * 保证「平台账号 · 分配平台角色」与「角色管理 · 角色成员」两个视角一致。
 */
export function applyAccountRoleChange(
  accountId: string,
  accountName: string,
  loginName: string,
  prevRoleIds: string[],
  nextRoleIds: string[],
  accountActive: boolean,
): void {
  const ref = { id: accountId, name: accountName, sub: loginName, status: accountActive ? 'active' as const : 'disabled' as const }
  roleStore = roleStore.map((role) => {
    if (role.scope !== 'platform') return role
    const had = prevRoleIds.includes(role.id)
    const has = nextRoleIds.includes(role.id)
    if (had && !has) {
      return { ...role, members: role.members.filter((m) => m.id !== accountId) }
    }
    if (!had && has) {
      return { ...role, members: [...role.members.filter((m) => m.id !== accountId), ref] }
    }
    if (has) {
      return { ...role, members: role.members.map((m) => (m.id === accountId ? ref : m)) }
    }
    return role
  })
}

/**
 * 成员管理侧角色联动（role_member，member_type = 2 指向成员关系 id）：
 * 成员新建 / 编辑 / 停用 / 移出后同步租户角色的成员引用，
 * 保证「成员管理 · 配角色」与「角色管理 · 角色成员」两个视角一致。
 * 移出即收回（移除引用，重新加入需重新指派，D05）；停用不收回，仅置引用状态（D06）。
 */
export function applyMemberRoleChange(
  memberId: string,
  memberName: string,
  deptName: string,
  prevRoleNames: string[],
  nextRoleNames: string[],
  memberActive: boolean,
): void {
  const ref = { id: memberId, name: memberName, sub: deptName || '未挂组织', status: memberActive ? ('active' as const) : ('disabled' as const) }
  roleStore = roleStore.map((role) => {
    if (role.scope !== 'tenant') return role
    const had = prevRoleNames.includes(role.name)
    const has = nextRoleNames.includes(role.name)
    if (had && !has) {
      return { ...role, members: role.members.filter((m) => m.id !== memberId) }
    }
    if (!had && has) {
      return { ...role, members: [...role.members.filter((m) => m.id !== memberId), ref] }
    }
    if (has) {
      return { ...role, members: role.members.map((m) => (m.id === memberId ? ref : m)) }
    }
    return role
  })
}

/* ===================== 与菜单管理的联动 ===================== */

/**
 * 引用某菜单的启用角色（停用影响面提示用，平台 / 租户都查）。
 * 由菜单管理页面在停用 / 删除确认前调用。
 */
export function fetchRolesByMenu(menuId: string): Promise<Role[]> {
  const list = roleStore.filter(
    (item) => item.status === 'enabled' && item.menuGrants.some((grant) => grant.menuId === menuId),
  )
  return request([...list])
}

export { CURRENT_TENANT, CURRENT_TENANT_ID, OPERATOR as ROLE_OPERATOR }
