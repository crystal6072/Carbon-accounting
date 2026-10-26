import type { EnableStatus, MenuFunction, MenuPayload, MenuScope } from '@/types'

const NOW = '2026-10-21 09:30'
const OPERATOR = '平台超管 · 林澈'
const INIT_AT = '2026-09-01 10:00'

/** 模拟网络延迟，保持与既有 mock 的交互手感一致 */
function request<T>(data: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), 180))
}

/**
 * 初始化菜单（系统内置）：由系统初始化写入。
 * scope 为功能「适用端」（用户体系 §5.3）：平台运营端 / 租户端，默认租户端业务功能。
 */
function seed(
  id: string,
  name: string,
  route: string,
  sort: number,
  parentId: string | null,
  status: EnableStatus = 'enabled',
  scope: MenuScope = 'tenant',
): MenuFunction {
  return {
    id,
    name,
    route,
    sort,
    parentId,
    status,
    scope,
    createdBy: '系统初始化',
    createdAt: INIT_AT,
    updatedBy: '系统初始化',
    updatedAt: INIT_AT,
  }
}

/**
 * 菜单（功能）目录 mock：统一的功能 / 菜单数据源，层级对齐侧边栏菜单（router/menu.ts）。
 *
 * 层级口径：
 * - **一级功能**（parentId = null）：产品碳足迹 / 系统管理，承载整块业务；
 * - **二级功能**：一级下的功能分组，如「产品库」「报告管理」「组织与权限」，route 为空、仅作分组；
 * - **三级 / 末级功能**：真正可进入的页面（带路由），如「我的产品库」「成员管理」。
 *
 * 分组（route 为空）与其下级菜单共同构成菜单树；角色管理的功能菜单权限、租户的模块授权均以本树为数据源。
 * **菜单树不按端拆分**：租户的系统管理功能（租户信息 / 组织架构 / 成员管理 / 角色管理）与平台侧功能
 * 同处一级「系统管理」下，端的差异由 `scope`（适用端）+ 角色勾选表达——租户成员只看到被授权的节点。
 */
let menuStore: MenuFunction[] = [
  /* ==================== 一级功能：产品碳足迹（租户端业务应用） ==================== */
  seed('M100', '产品碳足迹', '', 1, null),

  // 二级功能：直接可进入的页面
  seed('M101', '工作台', '/dashboard', 1, 'M100'),
  seed('M102', '碳足迹核算', '/pcf/project', 2, 'M100'),

  // 二级功能：报告管理
  seed('M120', '报告管理', '', 3, 'M100'),
  seed('M109', '报告编制', '/report/prepare', 1, 'M120'),
  seed('M110', '企业信息维护', '/report/enterprise', 2, 'M120'),
  seed('M121', '敏感性分析', '/report/sensitivity', 3, 'M120'),
  seed('M122', '数据质量评价', '/report/quality', 4, 'M120'),

  // 二级功能：产品库
  seed('M130', '产品库', '', 4, 'M100'),
  seed('M103', '我的产品库', '/pcf/my-product', 1, 'M130'),

  // 二级功能：工艺库
  seed('M131', '工艺库', '', 5, 'M100'),
  seed('M104', '我的工艺库', '/pcf/my-process', 1, 'M131'),

  // 二级功能：因子管理
  seed('M132', '因子管理', '', 6, 'M100'),
  seed('M106', '背景数据库', '/pcf/factor-libraries', 1, 'M132'),
  seed('M105', '我的因子库', '/pcf/my-factor', 2, 'M132'),

  // 二级功能：模型管理（前台）
  seed('M133', '模型管理', '', 7, 'M100'),
  seed('M107', '模型库', '/pcf/model-libraries', 1, 'M133'),
  seed('M108', '我的模型', '/pcf/my-model', 2, 'M133'),

  /* ==================== 一级功能：系统管理 ==================== */
  // 菜单树不按端拆分：平台侧与租户侧系统管理功能同处一棵树，端的差异由「scope 适用端 + 角色勾选」表达
  seed('M200', '系统管理', '', 2, null),

  // 二级功能：产品库（后台）
  seed('M230', '产品库', '', 1, 'M200'),
  seed('M201', '产品分类', '/basic/category', 1, 'M230', 'enabled', 'platform'),
  seed('M202', '产品信息库', '/basic/product', 2, 'M230', 'enabled', 'platform'),

  // 二级功能：工艺流程管理
  seed('M231', '工艺流程管理', '', 2, 'M200'),
  seed('M203', '工艺流程', '/basic/process', 1, 'M231', 'enabled', 'platform'),
  seed('M204', '工序', '/basic/operation', 2, 'M231', 'enabled', 'platform'),

  // 二级功能：基础库
  seed('M232', '基础库', '', 3, 'M200'),
  seed('M205', '物料库', '/basic/material', 1, 'M232', 'enabled', 'platform'),
  seed('M206', '能源库', '/basic/energy', 2, 'M232', 'enabled', 'platform'),
  seed('M207', '计量单位库', '/basic/unit', 3, 'M232', 'enabled', 'platform'),
  seed('M208', '生命周期阶段', '/basic/lifecycle', 4, 'M232', 'enabled', 'platform'),
  seed('M209', '标准文件库', '/basic/standard', 5, 'M232', 'enabled', 'platform'),
  seed('M210', '行业库', '/basic/industry', 6, 'M232', 'enabled', 'platform'),

  // 二级功能：模型管理（后台）——原「核算配置」分组已下线，因子库管理并入本组
  seed('M234', '模型管理', '', 5, 'M200'),
  seed('M214', '核算模型', '/model/library', 1, 'M234', 'enabled', 'platform'),
  seed('M213', '因子库管理', '/model/factor-lib', 2, 'M234', 'enabled', 'platform'),

  // 二级功能：组织与权限（原「平台支撑」；对租户管理员可见，故改中性名）
  seed('M235', '组织与权限', '', 6, 'M200'),

  // 三级功能：平台运营端（scope = platform，只出现在平台角色勾选清单）
  seed('M216', '租户管理', '/system/tenant', 2, 'M235', 'enabled', 'platform'),
  seed('M217', '平台账号', '/system/account', 3, 'M235', 'enabled', 'platform'),
  seed('M221', '账号查询', '/system/account-query', 4, 'M235', 'enabled', 'platform'),
  seed('M218', '平台角色管理', '/system/role', 5, 'M235', 'enabled', 'platform'),
  seed('M219', '菜单管理', '/system/menu', 6, 'M235', 'enabled', 'platform'),
  seed('M220', '数据字典', '/system/dict', 7, 'M235', 'enabled', 'platform'),

  // 三级功能：租户端（scope = tenant，只出现在租户角色勾选与租户模块授权清单）
  seed('M137', '租户信息', '/system/unit-info', 8, 'M235'),
  seed('M136', '组织架构', '/system/org', 9, 'M235'),
  seed('M135', '成员管理', '/system/member', 10, 'M235'),
  seed('M138', '角色管理', '/system/tenant-role', 11, 'M235'),
]

/** 初始菜单 id 清单（供角色默认授权引用） */
export const MENU_IDS: string[] = menuStore.map((item) => item.id)

/** 末级功能菜单 id（带路由、可进入的页面；含平台侧与租户侧） */
export const LEAF_MENU_IDS: string[] = menuStore.filter((item) => !!item.route).map((item) => item.id)

/**
 * 租户端末级功能菜单 id（scope = tenant）：
 * 租户模块授权与租户角色勾选只在此基础上取交集，平台侧功能（基础库 / 模型管理 / 平台账号等）不进此清单。
 */
export const TENANT_LEAF_MENU_IDS: string[] = menuStore
  .filter((item) => !!item.route && item.scope === 'tenant')
  .map((item) => item.id)

/** 路由 → 菜单 id（供「用户切换」按当前成员有效权限过滤菜单） */
export const ROUTE_TO_MENU_ID: Record<string, string> = (() => {
  const map: Record<string, string> = {}
  menuStore.forEach((item) => {
    if (item.route) map[item.route] = item.id
  })
  return map
})()

/** 菜单名称（id → 功能名称；未知 id 原样返回） */
export function menuNameOf(id: string): string {
  return menuStore.find((item) => item.id === id)?.name ?? id
}

/* ===================== 查询 ===================== */

/** 菜单目录全量（按排序） */
export function fetchMenus(): Promise<MenuFunction[]> {
  return request([...menuStore].sort((a, b) => a.sort - b.sort))
}

/** 菜单详情 */
export async function fetchMenu(id: string): Promise<MenuFunction> {
  const target = menuStore.find((item) => item.id === id)
  if (!target) throw new Error('菜单不存在或已被删除')
  return request(target)
}

/** 上级菜单候选项（新增 / 编辑时选择父级；排除自身与自身子孙，避免成环） */
export function fetchMenuOptions(excludeId?: string): Promise<Array<{ id: string; name: string; parentId: string | null }>> {
  const list = excludeId ? menuStore.filter((item) => item.id !== excludeId) : menuStore
  return request(list.map((item) => ({ id: item.id, name: item.name, parentId: item.parentId })))
}

/** 租户模块授权的分组节点：一级功能 → 其下全部末级功能菜单 */
export interface TenantModuleGroupNode {
  id: string
  name: string
  children: Array<{ id: string; name: string }>
}

/** 递归收集某节点下的全部末级功能（带路由） */
function collectLeaves(parentId: string): MenuFunction[] {
  return menuStore
    .filter((item) => item.parentId === parentId)
    .sort((a, b) => a.sort - b.sort)
    .flatMap((item) => (item.route ? [item] : collectLeaves(item.id)))
}

/**
 * 租户模块授权树：按一级功能分组，分组下平铺**适用端为租户端**的末级功能。
 * 菜单树本身不按端拆分（租户系统管理与平台功能同处「系统管理」下），
 * 因此必须按 scope 过滤，否则平台侧功能会出现在给租户授权的清单里（用户体系 §5.3）。
 */
export function fetchTenantModuleTree(): Promise<TenantModuleGroupNode[]> {
  const groups = menuStore
    .filter((item) => item.parentId === null)
    .sort((a, b) => a.sort - b.sort)
    .map((group) => ({
      id: group.id,
      name: group.name,
      children: collectLeaves(group.id)
        .filter((leaf) => leaf.scope === 'tenant')
        .map((leaf) => ({ id: leaf.id, name: leaf.name })),
    }))
    .filter((group) => group.children.length > 0)
  return request(groups)
}

/* ===================== 维护 ===================== */

let menuSeq = 400

function assertPayload(payload: MenuPayload): void {
  const name = payload.name.trim()
  if (!name) throw new Error('保存失败：功能名称必填')
  if (name.length > 50) throw new Error('保存失败：功能名称最长 50 字符')
  // 路由可留空：留空即视为菜单分组（仅承载下级菜单）
  const route = payload.route.trim()
  if (route && !route.startsWith('/')) throw new Error('保存失败：路由需以 / 开头')
  if (!Number.isInteger(payload.sort) || payload.sort < 0) throw new Error('保存失败：排序须为不小于 0 的整数')
}

/**
 * 新建菜单（菜单管理提供新增入口：配置功能名称 / 路由 / 排序 + 上级菜单 + 启停）。
 * 菜单管理新增的功能默认为租户端业务功能（scope = tenant）；平台侧功能由平台随版本注册。
 */
export async function createMenu(payload: MenuPayload): Promise<MenuFunction> {
  assertPayload(payload)
  const item: MenuFunction = {
    id: `M${++menuSeq}`,
    name: payload.name.trim(),
    route: payload.route.trim(),
    sort: payload.sort,
    parentId: payload.parentId,
    status: payload.status ?? 'enabled',
    scope: 'tenant',
    createdBy: OPERATOR,
    createdAt: NOW,
    updatedBy: OPERATOR,
    updatedAt: NOW,
  }
  menuStore = [...menuStore, item]
  return request(item)
}

/** 编辑菜单：功能名称 / 路由 / 排序 / 上级菜单 / 启停均可改 */
export async function updateMenu(id: string, payload: MenuPayload): Promise<MenuFunction> {
  const target = menuStore.find((item) => item.id === id)
  if (!target) throw new Error('菜单不存在或已被删除')
  assertPayload(payload)
  // 防止把自身设为自己的上级（成环）
  if (payload.parentId && payload.parentId === id) throw new Error('保存失败：上级菜单不能选自己')

  target.name = payload.name.trim()
  target.route = payload.route.trim()
  target.sort = payload.sort
  target.parentId = payload.parentId
  if (payload.status !== undefined) target.status = payload.status
  target.updatedBy = OPERATOR
  target.updatedAt = NOW
  return request(target)
}

/** 启停：停用的菜单不渲染、不出现在角色勾选树中 */
export async function updateMenuStatus(id: string, status: EnableStatus): Promise<MenuFunction> {
  const target = menuStore.find((item) => item.id === id)
  if (!target) throw new Error('菜单不存在或已被删除')
  if (target.status === status) throw new Error(status === 'enabled' ? '操作失败：菜单已启用' : '操作失败：菜单已停用')
  target.status = status
  target.updatedBy = OPERATOR
  target.updatedAt = NOW
  return request(target)
}

/** 删除：软删（从目录移除）；被角色引用的关系由角色侧在下次授权时清理。含下级菜单的分组不可直接删除 */
export async function deleteMenu(id: string): Promise<MenuFunction> {
  const target = menuStore.find((item) => item.id === id)
  if (!target) throw new Error('菜单不存在或已被删除')
  if (menuStore.some((item) => item.parentId === id)) {
    throw new Error('删除失败：请先删除或移出该菜单下的下级菜单')
  }
  menuStore = menuStore.filter((item) => item.id !== id)
  return request(target)
}

export { OPERATOR as MENU_OPERATOR }
