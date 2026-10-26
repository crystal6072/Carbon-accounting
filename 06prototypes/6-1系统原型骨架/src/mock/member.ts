import type {
  MemberCreatePayload,
  MemberDetail,
  MemberOperationLog,
  MemberPermissions,
  MemberPermissionRow,
  MemberUpdatePayload,
  OrgNode,
  PasswordResetMode,
  Role,
  Tenant,
  TenantMemberItem,
  TenantMemberStatus,
  TreeOption,
} from '@/types'
import {
  attachTenantMembership,
  createMemberAccount,
  detachTenantMembership,
  getAccountById,
  resetPassword,
  updateAccountBasic,
} from './account'
import { fetchMenus } from './menu'
import { fetchOrgNodes } from './org'
import { applyMemberRoleChange, fetchRoles, TENANT_ADMIN_ROLE_NAME } from './role'
import {
  fetchTenant,
  fetchTenantMembers,
  findMember,
  findMemberByMobile,
  insertMember,
  memberUsage,
  patchMember,
} from './tenant'

const NOW = '2026-10-22 10:00'
const CLIENT_IP = '10.20.5.31'

/** 模拟网络延迟，保持与既有 mock 的交互手感一致 */
function request<T>(data: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), 180))
}

/**
 * 当前租户端上下文（原型固定为「熊宝家居科技有限公司」T001）。
 * 成员管理是租户端功能：只维护本租户的成员关系，账号本身由平台账号模块维护。
 */
export const CURRENT_TENANT_ID = 'T001'
/** 当前登录的租户端操作者（T001 主管理员苏岐） */
export const CURRENT_MEMBER_ID = 'TM001'
export const CURRENT_OPERATOR_NAME = '租户管理员 · 苏岐'

/* ===================== 校验 ===================== */

const MOBILE_PATTERN = /^1[3-9]\d{9}$/
const ELEVEN_DIGITS = /^\d{11}$/

/** 登录名归一化：去空格、转半角、转小写（全局唯一不区分大小写判重） */
function normalizeLoginName(value: string): string {
  return value
    .replace(/\s+/g, '')
    .replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .toLowerCase()
}

/** 是否在任主管理员（按 tenant_admin_relation 派生，不建标记字段，D02） */
function isPrimaryAdmin(tenant: Tenant, member: TenantMemberItem): boolean {
  return !!tenant.adminAccountId && tenant.adminAccountId === member.accountId
}

/** 成员数闸门：含主管理员、含停用、含已移出（§5.10-4 / D10） */
function assertMemberLimit(tenant: Tenant): void {
  if (memberUsage(tenant.id) >= tenant.memberLimit) {
    throw new Error(`操作失败：已达成员数上限（当前用量 ${memberUsage(tenant.id)}/${tenant.memberLimit}，E05）`)
  }
}

/** 角色数 1 至 5（E04） */
function assertRoleCount(roleNames: string[]): void {
  if (roleNames.length < 1 || roleNames.length > 5) {
    throw new Error('操作失败：角色数须为 1 至 5 个（E04）')
  }
}

/** 所选角色均为归属类型为租户且状态为启用的角色（§5.1-9 / §5.3-10） */
async function assertRolesUsable(roleNames: string[]): Promise<void> {
  const roles = await fetchRoles('tenant')
  const usable = new Set(roles.filter((role) => role.status === 'enabled').map((role) => role.name))
  const invalid = roleNames.filter((name) => !usable.has(name))
  if (invalid.length > 0) {
    throw new Error(`操作失败：角色「${invalid.join('、')}」不存在或已停用，不可指派`)
  }
}

/** 部门为空，或存在且为启用状态（E13） */
async function assertDeptUsable(tenantId: string, deptId: string | null): Promise<void> {
  if (!deptId) return
  const nodes = await fetchOrgNodes(tenantId)
  const node = nodes.find((item) => item.id === deptId)
  if (!node) throw new Error('操作失败：所选部门不存在（E13）')
  if (node.status === 'disabled') throw new Error(`操作失败：部门「${node.name}」已停用，不可挂新成员（E13）`)
}

/* ===================== 审计 ===================== */

let operationStore: MemberOperationLog[] = [
  { id: 'MO001', memberId: 'TM001', memberName: '苏岐', action: 'create', actionText: '新建成员', summary: '开户指定主管理员，角色：租户管理员', operatorName: '平台超管 · 林澈', clientIp: '10.20.3.41', createdAt: '2026-09-02 09:30' },
  { id: 'MO002', memberId: 'TM002', memberName: '温朔', action: 'create', actionText: '新建成员', summary: '手工新建，角色：租户管理员', operatorName: '租户管理员 · 苏岐', clientIp: CLIENT_IP, createdAt: '2026-09-03 10:12' },
  { id: 'MO003', memberId: 'TM003', memberName: '江舸', action: 'create', actionText: '新建成员', summary: '手工新建，角色：租户管理员', operatorName: '租户管理员 · 苏岐', clientIp: CLIENT_IP, createdAt: '2026-09-05 14:20' },
  { id: 'MO004', memberId: 'TM004', memberName: '路柠', action: 'disable', actionText: '停用', summary: '离岗停用，角色关联保留', operatorName: '租户管理员 · 苏岐', clientIp: CLIENT_IP, createdAt: '2026-09-08 09:05' },
]

function recordOperation(
  memberId: string,
  memberName: string,
  action: MemberOperationLog['action'],
  actionText: string,
  summary: string,
): void {
  operationStore = [
    {
      id: `MO${Date.now().toString().slice(-6)}`,
      memberId,
      memberName,
      action,
      actionText,
      summary,
      operatorName: CURRENT_OPERATOR_NAME,
      clientIp: CLIENT_IP,
      createdAt: NOW,
    },
    ...operationStore,
  ]
}

/* ===================== 查询 ===================== */

/** 成员列表（本租户全部成员关系，含停用与已移出） */
export function fetchMembers(tenantId: string): Promise<TenantMemberItem[]> {
  return fetchTenantMembers(tenantId)
}

/** 成员详情：成员关系投影 + 派生标识（主管理员 / 本人 / 账号状态） */
export async function fetchMemberDetail(tenantId: string, id: string): Promise<MemberDetail> {
  const member = findMember(id)
  if (!member || member.tenantId !== tenantId) throw new Error('成员不存在或已被移出')
  const tenant = await fetchTenant(tenantId)
  const account = getAccountById(member.accountId)
  return request({
    ...member,
    primaryAdmin: isPrimaryAdmin(tenant, member),
    self: member.id === CURRENT_MEMBER_ID,
    // 两层闸门：账号状态管全系统。平台账号 mock 只建模平台侧账号，
    // 租户种子成员的账号投影（登录名 / 手机号 / 姓名）已冗余在成员记录上，未登记账号按启用处理。
    accountStatus: account?.status ?? 'enabled',
  })
}

/**
 * 租户角色候选项（只返回归属类型为租户、属本租户且状态为启用的角色）。
 * 平台角色完全隔离、不下发给租户成员；租户角色只在所属租户内生效，不跨租户可见。
 */
export async function fetchTenantRoleOptions(tenantId?: string): Promise<Role[]> {
  const roles = await fetchRoles('tenant')
  return roles.filter(
    (role) => role.status === 'enabled' && (!tenantId || !role.tenantId || role.tenantId === tenantId),
  )
}

/** 组织架构候选项（部门树：停用节点不可挂新成员，置灰保留） */
export async function fetchDeptOptions(tenantId: string): Promise<TreeOption[]> {
  const nodes = await fetchOrgNodes(tenantId)
  return buildDeptTree(nodes)
}

/** 平铺节点 → 树形选项 */
function buildDeptTree(nodes: OrgNode[]): TreeOption[] {
  const toOption = (node: OrgNode): TreeOption => ({
    value: node.id,
    label: node.name,
    extra: node.leader ? `负责人 ${node.leader}` : undefined,
    disabled: node.status === 'disabled',
    children: nodes.filter((item) => item.parentId === node.id).map(toOption),
  })
  return nodes.filter((item) => item.parentId === null).map(toOption)
}

/** 按 id 取部门名称（空 = 未挂组织） */
export async function deptNameOf(tenantId: string, deptId: string | null): Promise<string> {
  if (!deptId) return ''
  const nodes = await fetchOrgNodes(tenantId)
  return nodes.find((item) => item.id === deptId)?.name ?? ''
}

/* ===================== 有效权限 ===================== */

/** 展开某菜单（分组）下的全部末级功能 id */
function collectLeafIds(menus: Awaited<ReturnType<typeof fetchMenus>>, menuId: string): string[] {
  const menu = menus.find((item) => item.id === menuId)
  if (!menu) return []
  if (menu.route) return [menu.id]
  return menus.filter((item) => item.parentId === menuId).flatMap((child) => collectLeafIds(menus, child.id))
}

/** 一级功能名（所属分组） */
function topGroupName(menus: Awaited<ReturnType<typeof fetchMenus>>, menuId: string): string {
  let cursor = menus.find((item) => item.id === menuId)
  while (cursor?.parentId) {
    const parent = menus.find((item) => item.id === cursor?.parentId)
    if (!parent) break
    cursor = parent
  }
  return cursor?.name ?? '—'
}

/**
 * 查看有效权限（§5.8）：所持角色 + 合并功能点 + 按功能点分列读 / 写范围。
 * 有效功能 = 已开通模块内功能点（tenant.moduleCodes）∩ 角色勾选功能点（多角色并集）。
 * 页面只读；每次打开写审计（§5.8-9）。
 */
export async function fetchMemberPermissions(tenantId: string, id: string): Promise<MemberPermissions> {
  const member = findMember(id)
  if (!member || member.tenantId !== tenantId) throw new Error('成员不存在或已被移出')

  const [tenant, roles, menus] = await Promise.all([fetchTenant(tenantId), fetchRoles('tenant'), fetchMenus()])
  const held = roles.filter((role) => member.roleNames.includes(role.name))

  // 角色勾选功能点（展开分组到末级后取并集）
  const roleLeafIds = new Set<string>()
  held.forEach((role) => role.menuGrants.forEach((grant) => collectLeafIds(menus, grant.menuId).forEach((mid) => roleLeafIds.add(mid))))

  // 生效功能点：已开通模块 ∩ 角色勾选
  const granted = new Set(tenant.moduleCodes)
  const effectiveIds = [...roleLeafIds].filter((mid) => granted.has(mid)).sort()

  const rows: MemberPermissionRow[] = effectiveIds.map((mid) => ({
    menuId: mid,
    menuName: menus.find((item) => item.id === mid)?.name ?? mid,
    groupName: topGroupName(menus, mid),
    read: true,
    write: true,
  }))

  recordOperation(id, member.name, 'view_permission', '查看有效权限', `合并生效功能点 ${effectiveIds.length} 个`)

  return request({
    roleNames: [...member.roleNames],
    roleGrantedCount: roleLeafIds.size,
    effectiveCount: effectiveIds.length,
    rows,
  })
}

/**
 * 演示用：取某成员的有效菜单 id（租户已开通模块 ∩ 角色授权），供「用户切换」过滤菜单。
 * 不做审计；与 fetchMemberPermissions 的计算口径一致。
 */
export async function fetchEffectiveMenuIds(tenantId: string, memberId: string): Promise<string[]> {
  const [tenant, member, roles] = await Promise.all([
    fetchTenant(tenantId),
    fetchMemberDetail(tenantId, memberId),
    fetchRoles('tenant'),
  ])
  if (!tenant || !member) return []
  const granted = new Set<string>()
  member.roleNames.forEach((name) => {
    const role = roles.find((item) => item.name === name)
    if (role) role.menuGrants.forEach((g) => granted.add(g.menuId))
  })
  return Array.from(granted).filter((id) => tenant.moduleCodes.includes(id))
}

/* ===================== 维护 ===================== */

/**
 * 新建成员（§5.1）：建账号 + 建成员关系 + 写角色关联。
 * 密码可随机生成或由操作人自填，一次性展示明文并置首登改密；不返回二次可查的明文。
 */
export async function createMember(
  tenantId: string,
  payload: MemberCreatePayload,
): Promise<{ member: TenantMemberItem; password: string }> {
  const tenant = await fetchTenant(tenantId)
  assertMemberLimit(tenant)

  const displayName = payload.displayName.trim()
  if (!displayName) throw new Error('保存失败：姓名必填')
  if (displayName.length > 50) throw new Error('保存失败：姓名最长 50 字符')
  const loginName = normalizeLoginName(payload.loginName)
  if (!loginName) throw new Error('保存失败：登录名必填')
  if (ELEVEN_DIGITS.test(loginName)) throw new Error('保存失败：登录名不能为 11 位纯数字（E03）')
  const mobile = payload.mobile.trim()
  if (!MOBILE_PATTERN.test(mobile)) throw new Error('保存失败：手机号格式不正确（E12）')
  assertRoleCount(payload.roleNames)
  await assertRolesUsable(payload.roleNames)
  await assertDeptUsable(tenantId, payload.deptId)

  // 建账号（登录名 / 手机号全局唯一在 createMemberAccount 内校验：E01 / E02）
  const account = await createMemberAccount({ loginName, displayName, mobile, email: payload.email })
  const password = await resetPassword(account.id, payload.passwordMode, payload.customPassword, 'member')

  const member: TenantMemberItem = {
    id: `TM${Date.now().toString().slice(-6)}`,
    tenantId,
    accountId: account.id,
    loginName,
    name: displayName,
    mobile,
    email: payload.email?.trim() ?? '',
    passwordMask: '••••••••',
    deptId: payload.deptId,
    deptName: await deptNameOf(tenantId, payload.deptId),
    roleNames: [...payload.roleNames],
    status: 'enabled',
    joinedVia: 'manual',
    joinedAt: NOW,
    removedType: null,
    removedBy: '',
    removedAt: '',
    createdBy: CURRENT_OPERATOR_NAME,
    createdAt: NOW,
    updatedBy: CURRENT_OPERATOR_NAME,
    updatedAt: NOW,
  }
  insertMember(member)
  attachTenantMembership(account.id, tenantId, tenant.name)
  applyMemberRoleChange(member.id, member.name, member.deptName, [], member.roleNames, true)
  recordOperation(member.id, member.name, 'create', '新建成员', `手工新建 · 角色：${member.roleNames.join('、')}`)
  return request({ member, password })
}

/**
 * 编辑成员（§5.3）：姓名 / 手机号 / 邮箱改账号级字段（全局生效），
 * 部门（调岗）与角色改租户域字段；登录名不可改；手机号须全局唯一（E02 / E12）。
 */
export async function updateMember(
  tenantId: string,
  id: string,
  payload: MemberUpdatePayload,
): Promise<TenantMemberItem> {
  const member = findMember(id)
  if (!member || member.tenantId !== tenantId) throw new Error('操作失败：成员不存在或已被删除')
  if (member.status === 'removed') throw new Error('操作失败：已移出成员不可编辑')

  const displayName = payload.displayName.trim()
  if (!displayName) throw new Error('保存失败：姓名必填')
  const mobile = payload.mobile.trim()
  if (!MOBILE_PATTERN.test(mobile)) throw new Error('保存失败：手机号格式不正确（E12）')
  assertRoleCount(payload.roleNames)
  await assertRolesUsable(payload.roleNames)
  await assertDeptUsable(tenantId, payload.deptId)

  // 手机号改到其他账号时，阻断该账号已是本租户成员（E06 口径）
  if (mobile !== member.mobile) {
    const other = findMemberByMobile(tenantId, mobile)
    if (other && other.id !== id) throw new Error('保存失败：该手机号对应的账号已是本租户成员（E06）')
  }

  const changes: string[] = []
  if (displayName !== member.name || mobile !== member.mobile || (payload.email ?? '') !== member.email) {
    await updateAccountBasic(member.accountId, { displayName, mobile, email: payload.email })
    changes.push('更新账号级字段（姓名 / 手机号 / 邮箱）')
  }
  const prevRoleNames = [...member.roleNames]
  const deptName = await deptNameOf(tenantId, payload.deptId)
  if (payload.deptId !== member.deptId) changes.push(`部门「${member.deptName || '未挂组织'}」→「${deptName || '未挂组织'}」`)
  if (prevRoleNames.join('、') !== [...payload.roleNames].join('、')) {
    changes.push(`角色「${prevRoleNames.join('、')}」→「${payload.roleNames.join('、')}」`)
  }

  patchMember(id, {
    name: displayName,
    mobile,
    email: payload.email?.trim() ?? '',
    deptId: payload.deptId,
    deptName,
    roleNames: [...payload.roleNames],
    updatedBy: CURRENT_OPERATOR_NAME,
    updatedAt: NOW,
  })
  applyMemberRoleChange(id, displayName, deptName, prevRoleNames, payload.roleNames, member.status === 'enabled')
  recordOperation(id, displayName, 'update', '编辑成员', changes.join('；') || '无变化')
  return request(findMember(id) as TenantMemberItem)
}

/**
 * 禁用 / 启用（成员状态管理规则）：
 * - 禁用（DISABLED）：切断本租户登录权限，但保留历史业务数据与操作日志记录；仅作用本租户，不改账号状态。
 *   主管理员不可禁用（E07）；若租户仅剩 1 名在任管理员，禁止禁用该唯一管理员（防止误操作，E07）。
 * - 启用（ACTIVE）：恢复本租户登录能力，原角色自动恢复生效；支持重新选择部门（应对调岗）。
 *   须持有生效角色不少于 1 个（E08）。
 */
export async function updateMemberStatus(
  tenantId: string,
  id: string,
  status: TenantMemberStatus,
  deptId?: string | null,
): Promise<TenantMemberItem> {
  const member = findMember(id)
  if (!member || member.tenantId !== tenantId) throw new Error('操作失败：成员不存在或已被删除')
  const tenant = await fetchTenant(tenantId)
  if (member.status === status) {
    throw new Error(`操作失败：成员已是${status === 'enabled' ? '正常' : '已禁用'}状态（E17）`)
  }
  if (status === 'enabled' && member.roleNames.length === 0) {
    throw new Error('操作失败：该成员暂无生效角色，请先指派角色再启用（E08）')
  }
  if (status === 'disabled') {
    if (member.status !== 'enabled') throw new Error('操作失败：仅正常状态成员可禁用（E17）')
    // 唯一管理员保护：禁用后将不再有在任管理员时阻断
    if (isPrimaryAdmin(tenant, member)) throw new Error('操作失败：主管理员不可禁用，须先更换主管理员（E07）')
    const tenantMembers = await fetchTenantMembers(tenantId)
    const enabledAdmins = tenantMembers.filter(
      (item) => item.status === 'enabled' && item.roleNames.includes(TENANT_ADMIN_ROLE_NAME),
    )
    if (enabledAdmins.length <= 1 && enabledAdmins.some((item) => item.id === member.id)) {
      throw new Error('操作失败：当前租户仅剩 1 名管理员，禁用后租户将无任何管理员，请先添加其他管理员（E07）')
    }
  }

  // 启用时允许重新选择部门（调岗场景）
  let deptName = member.deptName
  const nextDeptId = status === 'enabled' ? (deptId === undefined ? member.deptId : deptId) : member.deptId
  if (status === 'enabled' && nextDeptId !== member.deptId) {
    deptName = await deptNameOf(tenantId, nextDeptId)
  }

  patchMember(id, {
    status,
    deptId: nextDeptId,
    deptName,
    updatedBy: CURRENT_OPERATOR_NAME,
    updatedAt: NOW,
  })
  applyMemberRoleChange(id, member.name, deptName, member.roleNames, member.roleNames, status === 'enabled')
  recordOperation(
    id,
    member.name,
    status === 'enabled' ? 'enable' : 'disable',
    status === 'enabled' ? '启用' : '禁用',
    status === 'enabled'
      ? nextDeptId !== member.deptId
        ? `复岗启用，部门调整为「${deptName || '未挂组织'}」，原角色恢复生效`
        : '复岗启用，原角色恢复生效'
      : '禁用，切断本租户登录权限，历史业务数据与操作日志记录保留，角色关联保留',
  )
  return request(findMember(id) as TenantMemberItem)
}

/**
 * 重置密码（§5.7）：生成新密码一次性展示，旧密码立即失效、全部会话失效、置首登改密。
 * 主管理员不可由租户管理员重置（E10，走平台租户管理）；已移出成员不可重置（E11）。
 */
export async function resetMemberPassword(
  tenantId: string,
  id: string,
  mode: PasswordResetMode = 'random',
  customPassword?: string,
): Promise<string> {
  const member = findMember(id)
  if (!member || member.tenantId !== tenantId) throw new Error('操作失败：成员不存在或已被删除')
  const tenant = await fetchTenant(tenantId)
  if (isPrimaryAdmin(tenant, member)) throw new Error('操作失败：主管理员密码由超管在租户管理重置（E10）')
  if (member.status === 'removed') throw new Error('操作失败：已移出成员不可重置密码（E11）')

  const password = await resetPassword(member.accountId, mode, customPassword, 'member')
  recordOperation(id, member.name, 'reset_password', '重置密码', `租户管理员重置 · ${mode === 'random' ? '随机生成' : '自定义'} · 已置首登改密`)
  return password
}

/** 成员操作记录（审计日志，按目标成员 + 时间倒序） */
export function fetchMemberOperations(memberId?: string): Promise<MemberOperationLog[]> {
  const list = memberId ? operationStore.filter((item) => item.memberId === memberId) : operationStore
  return request([...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
}
