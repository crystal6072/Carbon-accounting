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
  deleteAccount,
  detachTenantMembership,
  getAccountById,
  getAccountByMobile,
  resetPassword,
  setMemberInitialPassword,
  updateAccountBasic,
} from './account'
import { fetchMenus } from './menu'
import { fetchOrgNodes } from './org'
import { applyMemberRoleChange, fetchRoles, TENANT_ADMIN_ROLE_NAME } from './role'
import {
  CURRENT_OPERATOR_NAME as PLATFORM_OPERATOR_NAME,
  fetchTenant,
  fetchTenantMembers,
  findMember,
  findMemberByMobile,
  insertMember,
  memberUsage,
  patchMember,
  recordAudit,
} from './tenant'

const NOW = '2026-10-22 10:00'
const CLIENT_IP = '10.20.5.31'
/** 平台后台操作来源 IP（与租户管理 mock 的演示值一致） */
const PLATFORM_OPERATOR_IP = '10.20.3.41'

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

/**
 * 手机号脱敏（§成员管理 · 手机号专项 / 后端防坑指南）：
 * GET 列表、详情直接返回带星号的假数据（138****1002），前端不持有明文，杜绝 F12 抓包泄露。
 * 已是脱敏串则原样返回（幂等）。
 */
export function maskMobile(mobile: string): string {
  if (!mobile || mobile.includes('*')) return mobile
  if (mobile.length === 11) return `${mobile.slice(0, 3)}****${mobile.slice(7)}`
  return mobile
}

/** 列表查询条件（由后端过滤后返回脱敏结果；前端只传条件，不传明文手机号） */
export interface MemberQuery {
  keyword?: string
  roleFilter?: string[]
  statusFilter?: string
  deptFilter?: string
}

/** 账号归一化：去空格、转半角、转小写（全局唯一不区分大小写判重） */
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
  /** 操作人（默认租户端操作者；平台超管发起的操作需显式传入） */
  operator?: { name: string; clientIp?: string },
): void {
  operationStore = [
    {
      id: `MO${Date.now().toString().slice(-6)}`,
      memberId,
      memberName,
      action,
      actionText,
      summary,
      operatorName: operator?.name ?? CURRENT_OPERATOR_NAME,
      clientIp: operator?.clientIp ?? CLIENT_IP,
      createdAt: NOW,
    },
    ...operationStore,
  ]
}

/* ===================== 查询 ===================== */

/** 成员列表（本租户全部成员关系，含停用与已移出） */
export async function fetchMembers(tenantId: string, query: MemberQuery = {}): Promise<TenantMemberItem[]> {
  // 后端按真实手机号做匹配，但只返回脱敏后的展示数据，绝不返回明文（§防坑指南）
  const kw = (query.keyword ?? '').trim().toLowerCase()
  const all = await fetchTenantMembers(tenantId)
  const list = all
    .filter((m) => m.status !== 'removed')
    .filter((m) => {
      if (kw) {
        const hitName = m.name.toLowerCase().includes(kw)
        const hitLogin = m.loginName.toLowerCase().includes(kw)
        // 支持完整手机号 / 手机尾号模糊匹配（对真实号码匹配，返回脱敏结果）
        const hitMobile = m.mobile.includes(kw)
        if (!hitName && !hitLogin && !hitMobile) return false
      }
      if (query.roleFilter && query.roleFilter.length > 0) {
        if (!m.roleNames.some((r) => query.roleFilter!.includes(r))) return false
      }
      if (query.statusFilter && m.status !== query.statusFilter) return false
      if (query.deptFilter && m.deptId !== query.deptFilter) return false
      return true
    })
    .map((m) => ({ ...m, mobile: maskMobile(m.mobile) }))
  return request(list)
}

/** 明文反查（受控权限接口）：仅授权时返回完整手机号，供「👁️」小眼睛 Hover 展示，绝不常驻前端 */
export async function revealMemberMobile(tenantId: string, id: string): Promise<string> {
  const m = findMember(id)
  if (!m || m.tenantId !== tenantId || m.status === 'removed') throw new Error('成员不存在')
  // 模拟后端权限校验后返回明文（并发防重由后端唯一索引 / 加锁保证，前端仅做演示）
  return request(m.mobile)
}

/** 成员详情：成员关系投影 + 派生标识（主管理员 / 本人 / 账号状态） */
export async function fetchMemberDetail(tenantId: string, id: string): Promise<MemberDetail> {
  const member = findMember(id)
  if (!member || member.tenantId !== tenantId) throw new Error('成员不存在或已被移出')
  const tenant = await fetchTenant(tenantId)
  const account = getAccountById(member.accountId)
  return request({
    ...member,
    // GET 详情同样返回脱敏手机号（§防坑指南）：前端只持有 138****1002，明文需经 reveal 接口授权回查
    mobile: maskMobile(member.mobile),
    primaryAdmin: isPrimaryAdmin(tenant, member),
    self: member.id === CURRENT_MEMBER_ID,
    // 两层闸门：账号状态管全系统。平台账号 mock 只建模平台侧账号，
    // 租户种子成员的账号投影（账号 / 手机号 / 姓名）已冗余在成员记录上，未登记账号按启用处理。
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
  if (!loginName) throw new Error('保存失败：账号必填')
  const mobile = payload.mobile.trim()
  // 新建成员支持「手机号即登录账号」：账号与手机号一致时，放开 11 位纯数字限制（E03 例外）
  if (ELEVEN_DIGITS.test(loginName) && loginName !== mobile) {
    throw new Error('保存失败：账号不能为 11 位纯数字（E03）')
  }
  if (!MOBILE_PATTERN.test(mobile)) throw new Error('保存失败：手机号格式不正确（E12）')
  assertRoleCount(payload.roleNames)
  await assertRolesUsable(payload.roleNames)
  await assertDeptUsable(tenantId, payload.deptId)

  // 建账号（账号 / 手机号全局唯一在 createMemberAccount 内校验：E01 / E02）
  const account = await createMemberAccount({ loginName, displayName, mobile, email: payload.email })
  // 密码智能兜底：管理员自填 / 留空自动生成强随机密码；底层强制「首登改密」
  const password = await setMemberInitialPassword(
    account.id,
    payload.passwordMode === 'custom' ? payload.customPassword : undefined,
  )
  // 底层强校验：无论自定义还是随机生成，员工首次登录必须强制修改初始密码
  if (!getAccountById(account.id)?.mustChangePassword) {
    throw new Error('保存失败：未强制设置「首次登录修改密码」，已中止创建')
  }

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

/** 手机号探测结果（新建成员前置判定，三个分支） */
export interface MobileProbeResult {
  /** free 未注册（走新建）/ registered 已注册可关联 / member 已是本租户成员（阻断） */
  state: 'free' | 'registered' | 'member'
  /** state = member 时命中的本租户成员 id，供「查看成员」跳转 */
  memberId: string
  /** state = registered 时的账号姓名，点「关联该账号」后只读带出用于核对，不可编辑 */
  displayName: string
  /** state = member 时该成员在本租户的所在部门，供「请勿重复添加」防呆提示 */
  memberDeptName: string
}

/**
 * 手机号探测（新建成员前置判定）：按手机号判断是否已有平台账号、是否已是本租户成员。
 * 成员判定只在本租户成员范围内进行（租户隔离：探测仅回「是否已注册 / 是否已是本租户成员」，
 * 不回传账号 id、账号、邮箱，避免被当作「手机号 → 账号」反查接口）。
 */
export async function probeMemberMobile(tenantId: string, mobile: string): Promise<MobileProbeResult> {
  const value = mobile.trim()
  if (!MOBILE_PATTERN.test(value)) return { state: 'free', memberId: '', displayName: '', memberDeptName: '' }
  const account = getAccountByMobile(value)
  if (!account) return { state: 'free', memberId: '', displayName: '', memberDeptName: '' }
  const members = await fetchTenantMembers(tenantId)
  const existing = members.find((item) => item.accountId === account.id && item.status !== 'removed')
  if (existing) {
    return { state: 'member', memberId: existing.id, displayName: '', memberDeptName: existing.deptName }
  }
  return { state: 'registered', memberId: '', displayName: account.displayName, memberDeptName: '' }
}

/**
 * 关联已有账号（新建成员的第二分支）：
 * 按手机号命中平台已有账号 → 只建成员关系 + 写角色，不建账号、不设密码、不改账号任何字段，立即生效。
 * 手机号未注册则提示改走「新建成员」；命中账号已是本租户生效成员则阻断（E06）。
 */
export async function linkMember(
  tenantId: string,
  payload: { mobile: string; roleNames: string[]; deptId: string | null },
): Promise<TenantMemberItem> {
  const tenant = await fetchTenant(tenantId)
  assertMemberLimit(tenant)

  const mobile = payload.mobile.trim()
  if (!MOBILE_PATTERN.test(mobile)) throw new Error('保存失败：手机号格式不正确（E12）')
  assertRoleCount(payload.roleNames)
  await assertRolesUsable(payload.roleNames)
  await assertDeptUsable(tenantId, payload.deptId)

  const account = getAccountByMobile(mobile)
  if (!account) throw new Error('保存失败：该手机号未注册平台账号，请改用「新建成员」（E02）')
  // 平台角色与租户成员互斥（D5）：持平台角色的账号不得加入租户
  if (account.roleIds.length > 0) throw new Error('保存失败：该账号是平台账号，平台角色与租户成员互斥（E18）')

  const members = await fetchTenantMembers(tenantId)
  if (members.some((item) => item.accountId === account.id && item.status !== 'removed')) {
    throw new Error('保存失败：该账号已是本租户成员（E06）')
  }

  const member: TenantMemberItem = {
    id: `TM${Date.now().toString().slice(-6)}`,
    tenantId,
    accountId: account.id,
    // 账号级字段一律取自账号，成员侧只做投影，不写入新值
    loginName: account.loginName,
    name: account.displayName,
    mobile: account.mobile,
    email: account.email ?? '',
    passwordMask: account.passwordMask,
    deptId: payload.deptId,
    deptName: await deptNameOf(tenantId, payload.deptId),
    roleNames: [...payload.roleNames],
    status: 'enabled',
    joinedVia: 'linked',
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
  recordOperation(
    member.id,
    member.name,
    'link',
    '关联成员',
    `关联已有账号 · 角色：${member.roleNames.join('、')}；不新建账号、不设密码，立即生效`,
  )
  return request(member)
}

/**
 * 编辑成员（§5.3）：姓名 / 手机号 / 邮箱改账号级字段（全局生效），
 * 部门（调岗）与角色改租户域字段；账号不可改；手机号须全局唯一（E02 / E12）。
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
  // 脱敏假数据（138****1002）识别：前端未改手机号时回传的是脱敏串，必须忽略更新（§5.2 防坑）
  const mobileMasked = mobile.includes('*')
  if (!mobileMasked && !MOBILE_PATTERN.test(mobile)) throw new Error('保存失败：手机号格式不正确（E12）')
  assertRoleCount(payload.roleNames)
  await assertRolesUsable(payload.roleNames)
  await assertDeptUsable(tenantId, payload.deptId)

  const mobileChanged = !mobileMasked && mobile !== member.mobile
  // 手机号改到其他账号时，阻断该账号已是本租户成员（E06 口径）
  if (mobileChanged) {
    const other = findMemberByMobile(tenantId, mobile)
    if (other && other.id !== id) throw new Error('保存失败：该手机号对应的账号已是本租户成员（E06）')
  }

  const changes: string[] = []
  if (displayName !== member.name || mobileChanged || (payload.email ?? '') !== member.email) {
    await updateAccountBasic(member.accountId, {
      displayName,
      // 并发防重：仅当真实号码变化才写库；脱敏假数据一律不写入（§5.2 / §5.3）
      mobile: mobileChanged ? mobile : member.mobile,
      email: payload.email,
    })
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
    // 未改手机号（脱敏或原值）时保持库内真实号码不变，绝不允许星号落库（§5.2）
    mobile: mobileChanged ? mobile : member.mobile,
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
      (item) =>
        item.status === 'enabled' &&
        item.roleNames.includes(TENANT_ADMIN_ROLE_NAME) &&
        getAccountById(item.accountId)?.status === 'enabled',
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
 * 移出（离职，§5.6 简化版）：置已移出、收回本租户角色、写审计；
 * 不删账号、不影响其他租户、不删成员记录（计入成员数）。
 * 主管理员不可移出（E09）；唯一在任管理员不可移出（E09）。
 *
 * `alsoDeleteAccount`（仅平台代管入口使用）：当该账号已无其他生效租户身份、且不持任何平台角色时，
 * 移出的同时注销账号（物理删除，账号与手机号释放）。租户端成员管理不传该参数。
 */
export async function removeMember(
  tenantId: string,
  id: string,
  options: { alsoDeleteAccount?: boolean } = {},
): Promise<TenantMemberItem> {
  const member = findMember(id)
  if (!member || member.tenantId !== tenantId) throw new Error('操作失败：成员不存在或已被移出')
  if (member.status === 'removed') throw new Error('操作失败：该成员已移出（E09）')
  const tenant = await fetchTenant(tenantId)
  if (isPrimaryAdmin(tenant, member)) throw new Error('操作失败：主管理员不可移出，须先更换主管理员（E09）')

  const tenantMembers = await fetchTenantMembers(tenantId)
  const activeAdmins = tenantMembers.filter(
    (item) =>
      item.status === 'enabled' &&
      item.roleNames.includes(TENANT_ADMIN_ROLE_NAME) &&
      getAccountById(item.accountId)?.status === 'enabled',
  )
  if (activeAdmins.length <= 1 && activeAdmins.some((item) => item.id === member.id)) {
    throw new Error('操作失败：当前租户仅剩 1 名管理员，移出后租户将无任何管理员，请先添加其他管理员（E09）')
  }

  patchMember(id, {
    status: 'removed',
    removedType: 'admin',
    removedBy: CURRENT_OPERATOR_NAME,
    removedAt: NOW,
    updatedBy: CURRENT_OPERATOR_NAME,
    updatedAt: NOW,
  })
  // 收回本租户全部角色关联（其他租户的角色不受影响）
  applyMemberRoleChange(id, member.name, member.deptName, member.roleNames, [], false)
  detachTenantMembership(member.accountId, tenantId)
  recordOperation(
    id,
    member.name,
    'remove',
    '移出',
    `移出本租户，收回角色：${member.roleNames.join('、') || '无'}；账号与其他租户不受影响，记录保留`,
  )
  // 平台代管：账号已无其他归属时「移出并注销」，账号与手机号一并释放（物理删除，不可恢复）
  if (options.alsoDeleteAccount) {
    await deleteAccount(member.accountId)
    recordOperation(
      id,
      member.name,
      'remove',
      '移出并注销',
      '账号已无其他租户身份与平台角色，随移出一并注销，账号与手机号已释放',
    )
  }
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

/**
 * 平台超管在租户管理重置主管理员密码（E10 的对向入口）：
 * - 入口为**单点**：租户详情「主管理员」区块，不进列表操作列；
 * - 复用账号管理的密码重置服务（`resetPassword`，reset_type = admin），**不新增功能码 / 功能点**；
 * - 旧密码与全部会话立即失效，并置首登改密；密码是账号级凭证，故该账号在其他租户的会话同样失效；
 * - 双写审计：平台审计（租户详情「操作记录」）+ 租户侧审计（成员操作记录）。
 */
export async function resetTenantAdminPassword(
  tenantId: string,
  mode: PasswordResetMode = 'random',
  customPassword?: string,
  reason = '',
): Promise<string> {
  const tenant = await fetchTenant(tenantId)
  if (!tenant.adminAccountId) throw new Error('操作失败：该租户尚未指定主管理员（E35）')
  const account = getAccountById(tenant.adminAccountId)
  if (!account) throw new Error('操作失败：主管理员账号不存在或已被删除')
  if (account.status !== 'enabled') throw new Error('操作失败：主管理员账号已停用，请先启用后重试（E37）')

  const members = await fetchTenantMembers(tenantId)
  const member = members.find((item) => item.accountId === tenant.adminAccountId)
  const modeText = mode === 'random' ? '随机生成' : '自定义'
  const tenantCount = account.tenantMemberships.filter((item) => item.status === 'active').length

  // reset_type = tenant_member（4）：超管兜底重置租户成员，与平台账号内部重置区分统计口径
  const password = await resetPassword(tenant.adminAccountId, mode, customPassword, 'tenant_member', reason.trim(), {
    channel: 1,
    tenantId,
  })

  // 租户侧审计（成员操作记录）：操作人记为平台超管
  if (member) {
    recordOperation(
      member.id,
      member.name,
      'reset_password',
      '重置密码',
      `平台超管重置主管理员密码 · ${modeText} · 原因：${reason.trim() || '—'} · 该账号 ${tenantCount} 个租户的全部会话失效 · 已置首登改密`,
      { name: PLATFORM_OPERATOR_NAME, clientIp: PLATFORM_OPERATOR_IP },
    )
  }

  // 平台审计（租户详情「操作记录」）
  recordAudit(
    tenantId,
    tenant.name,
    '重置主管理员密码',
    `${account.displayName}（${account.loginName}）· ${modeText} · 原因：${reason.trim() || '—'} · 旧密码与全部会话立即失效（涉及 ${tenantCount} 个租户）· 已置首登改密`,
    PLATFORM_OPERATOR_NAME,
  )

  return password
}

/** 成员操作记录（审计日志，按目标成员 + 时间倒序） */
export function fetchMemberOperations(memberId?: string): Promise<MemberOperationLog[]> {
  const list = memberId ? operationStore.filter((item) => item.memberId === memberId) : operationStore
  return request([...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
}

/**
 * 批量调整所属组织（组织管理 / 成员列表共用）：
 * 一次将多名成员移动到同一目标组织节点；目标组织须为启用状态。
 * 逐条校验（目标组织存在且启用），整体失败则抛出并回滚（mock 同步写，命中异常不落库）。
 */
export async function moveMembersToDept(
  tenantId: string,
  memberIds: string[],
  deptId: string,
): Promise<number> {
  const tenant = await fetchTenant(tenantId)
  await assertDeptUsable(tenantId, deptId)
  const targetName = await deptNameOf(tenantId, deptId)
  let moved = 0
  memberIds.forEach((id) => {
    const member = findMember(id)
    if (!member || member.tenantId !== tenantId) return
    if (member.status === 'removed') return
    const prevDept = member.deptName || '未挂组织'
    patchMember(id, { deptId, deptName: targetName, updatedBy: CURRENT_OPERATOR_NAME, updatedAt: NOW })
    applyMemberRoleChange(id, member.name, targetName, [prevDept], [targetName], member.status === 'enabled')
    recordOperation(id, member.name, 'update', '调整所属组织', `所属组织「${prevDept}」→「${targetName}」`)
    moved += 1
  })
  return request(moved)
}
