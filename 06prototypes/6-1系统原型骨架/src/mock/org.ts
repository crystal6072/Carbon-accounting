import type {
  EnableStatus,
  OrgNode,
  OrgNodePayload,
  TenantType,
} from '@/types'
import { deptMemberCount } from './tenant'

const NOW = '2026-10-22 10:00'
const CREATED_AT = '2026-09-02 09:30'
const UPDATED_AT = '2026-10-15 16:40'

/** 模拟网络延迟，保持与既有 mock 的交互手感一致 */
function request<T>(data: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), 180))
}

/** 组织架构层级上限（组织架构 PRD §5.1-3） */
export const ORG_MAX_LEVEL = 5

/** 节点名称长度上限 */
const NAME_MAX = 50

/** 组织类型字典预置（按租户类型初始化，租户可自行增删改；原型用只读预置集） */
export const ORG_TYPE_PRESETS: Record<TenantType, string[]> = {
  enterprise: ['集团', '子公司', '工厂', '车间', '部门'],
  government: ['委办局', '处室', '科室'],
  org: ['总部', '分支机构', '部门'],
  park: ['园区', '片区', '企业', '部门'],
}

/** 租户根组织的组织类型：取该租户类型预置字典的首项（如企业 → 集团、政府 → 委办局） */
export function rootOrgTypeName(tenantType: TenantType): string {
  return ORG_TYPE_PRESETS[tenantType][0]
}

/** 取某租户类型可用的组织类型（预置 + 存量节点已用类型） */
export function orgTypesOf(tenantId: string, tenantType: TenantType): string[] {
  const used = Array.from(new Set(nodeStore.filter((item) => item.orgId === tenantId).map((item) => item.typeName)))
  return Array.from(new Set([...ORG_TYPE_PRESETS[tenantType], ...used]))
}

/* ===================== 种子数据 ===================== */

interface SeedNode {
  name: string
  typeName?: string
  leader?: string
  status?: EnableStatus
  children?: SeedNode[]
}

let nodeSeq = 0
let nodeStore: OrgNode[] = []

/** 按「树 → 平铺」写入种子：先建租户根组织（名称 = 租户名称），再挂业务节点；id / 编码 / 层级 / 路径 / 排序由系统生成 */
function seedTree(tenantId: string, rootName: string, tenantType: TenantType, tree: SeedNode[]): OrgNode {
  nodeSeq += 1
  const rootId = `ON${String(nodeSeq).padStart(3, '0')}`
  const root: OrgNode = {
    id: rootId,
    orgId: tenantId,
    code: `ORG${String(nodeSeq).padStart(4, '0')}`,
    name: rootName,
    typeName: rootOrgTypeName(tenantType),
    parentId: null,
    level: 1,
    path: `/${rootId}/`,
    leader: '',
    sort: 1,
    status: 'enabled',
    isRoot: true,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
  }
  nodeStore.push(root)

  const walk = (list: SeedNode[], parent: OrgNode, level: number) => {
    list.forEach((item, index) => {
      nodeSeq += 1
      const id = `ON${String(nodeSeq).padStart(3, '0')}`
      const node: OrgNode = {
        id,
        orgId: tenantId,
        code: `ORG${String(nodeSeq).padStart(4, '0')}`,
        name: item.name,
        typeName: item.typeName ?? '部门',
        parentId: parent.id,
        level,
        path: `${parent.path}${id}/`,
        leader: item.leader ?? '',
        sort: index + 1,
        status: item.status ?? 'enabled',
        isRoot: false,
        createdAt: CREATED_AT,
        updatedAt: UPDATED_AT,
      }
      nodeStore.push(node)
      if (item.children) walk(item.children, node, level + 1)
    })
  }
  walk(tree, root, 2)
  return root
}

// T001 熊宝家居（企业）
seedTree('T001', '熊宝家居科技有限公司', 'enterprise', [
  { name: '总经办', typeName: '部门', leader: '苏岐' },
  {
    name: '核算部',
    typeName: '部门',
    leader: '温朔',
    children: [
      { name: '核算一组', typeName: '部门', leader: '江舸' },
      { name: '核算二组', typeName: '部门', leader: '温朔' },
    ],
  },
  { name: '录入组', typeName: '部门', leader: '路柠' },
  {
    name: '供应链部',
    typeName: '部门',
    leader: '孟舒',
    children: [
      { name: '采购组', typeName: '部门', leader: '孟舒' },
      { name: '仓储组', typeName: '部门', leader: '路柠' },
    ],
  },
  { name: '财务部', typeName: '部门', leader: '江舸' },
])

// T002 青山竹木（企业；含停用节点样本）
seedTree('T002', '青山竹木制品有限公司', 'enterprise', [
  { name: '总经办', typeName: '部门', leader: '温朔' },
  { name: '技术部', typeName: '部门', leader: '付霖' },
  {
    name: '生产部',
    typeName: '部门',
    leader: '聂然',
    children: [
      { name: '竹材车间', typeName: '车间', leader: '聂然' },
      { name: '涂装车间', typeName: '车间', leader: '付霖', status: 'disabled' },
    ],
  },
  { name: '品控部', typeName: '部门', leader: '尤敏' },
])

// T003 中检西部检测（机构）
seedTree('T003', '中检西部检测机构', 'org', [
  { name: '综合部', typeName: '部门', leader: '俟清' },
  {
    name: '检测一部',
    typeName: '部门',
    leader: '罗凭',
    children: [
      { name: '竹制品检测组', typeName: '部门', leader: '罗凭' },
      { name: '理化检测组', typeName: '部门', leader: '阙眠' },
    ],
  },
  { name: '检测二部', typeName: '部门', leader: '展颜' },
])

// T004 绿源新能源（企业）
seedTree('T004', '绿源新能源科技有限公司', 'enterprise', [
  {
    name: '碳管理部',
    typeName: '部门',
    leader: '陆见微',
    children: [
      { name: '核算组', typeName: '部门', leader: '席北' },
      { name: '数据组', typeName: '部门', leader: '屠柚' },
    ],
  },
  { name: '采购部', typeName: '部门', leader: '蒋汀' },
  { name: '生产部', typeName: '部门', leader: '柏聿' },
  { name: '财务部', typeName: '部门', leader: '糜芮' },
])

// T005 临江省生态环境厅（政府单位）
seedTree('T005', '临江省生态环境厅', 'government', [
  { name: '办公室', typeName: '处室', leader: '沈确' },
  {
    name: '监测处',
    typeName: '处室',
    leader: '稽明',
    children: [
      { name: '水质监测室', typeName: '科室', leader: '稽明' },
      { name: '大气监测室', typeName: '科室', leader: '富春' },
    ],
  },
  { name: '综合处', typeName: '处室', leader: '富春' },
])

// T006 云岭食品（企业）
seedTree('T006', '云岭食品有限公司', 'enterprise', [
  { name: '品控部', typeName: '部门', leader: '贺今' },
  { name: '生产部', typeName: '部门', leader: '阮筝' },
  { name: '采购部', typeName: '部门', leader: '丰临' },
  { name: '财务部', typeName: '部门', leader: '扈芸' },
])

// T007 西南产品质量监督检测中心（机构）
seedTree('T007', '西南产品质量监督检测中心', 'org', [
  {
    name: '质量部',
    typeName: '部门',
    leader: '崔聿',
    children: [
      { name: '检测组', typeName: '部门', leader: '於岚' },
      { name: '认证组', typeName: '部门', leader: '糜泽' },
    ],
  },
  { name: '综合部', typeName: '部门', leader: '厍衡' },
])

// T008 安溪县林业局（政府单位）
seedTree('T008', '安溪县林业局', 'government', [
  { name: '林业股', typeName: '科室', leader: '方槿' },
  { name: '办公室', typeName: '科室', leader: '靳跃' },
  { name: '资源保护股', typeName: '科室', leader: '别枝' },
])

// T009 新汇竹纤维（企业；仅根组织，下级待租户管理员自建）
seedTree('T009', '新汇竹纤维科技有限公司', 'enterprise', [])

// T010 青白江竹木产业园区（园区）
seedTree('T010', '青白江竹木产业园区', 'park', [
  {
    name: '园区管委会',
    typeName: '园区',
    leader: '崔聿',
    children: [
      { name: '招商服务部', typeName: '部门', leader: '骆可与' },
      { name: '企业服务部', typeName: '部门', leader: '闻笙' },
      { name: '综合办公室', typeName: '部门', leader: '束宁' },
    ],
  },
  { name: '安全环保部', typeName: '部门', leader: '骆可与' },
])

/* ===================== 查询 ===================== */

/** 某租户的组织架构节点（按层级 + 排序返回） */
export function fetchOrgNodes(orgId: string): Promise<OrgNode[]> {
  return request(
    nodeStore
      .filter((item) => item.orgId === orgId)
      .sort((a, b) => a.level - b.level || a.sort - b.sort || a.name.localeCompare(b.name)),
  )
}

/** 单个节点详情 */
export async function fetchOrgNode(id: string): Promise<OrgNode> {
  const target = nodeStore.find((item) => item.id === id)
  if (!target) throw new Error('组织节点不存在或已被删除')
  return request(target)
}

/** 直属下级数量（同步读取，供按钮禁用态判断） */
export function orgChildCount(orgId: string, parentId: string | null): number {
  return nodeStore.filter((item) => item.orgId === orgId && item.parentId === parentId).length
}

/** 子树节点数（含自身） */
export function orgSubtreeCount(id: string): number {
  const target = nodeStore.find((item) => item.id === id)
  if (!target) return 0
  return nodeStore.filter((item) => item.orgId === target.orgId && item.path.startsWith(target.path)).length
}

/* ===================== 维护 ===================== */

function siblingsOf(orgId: string, parentId: string | null): OrgNode[] {
  return nodeStore.filter((item) => item.orgId === orgId && item.parentId === parentId)
}

function assertPayload(payload: OrgNodePayload): { name: string; code: string } {
  const name = payload.name.trim()
  if (!name) throw new Error('保存失败：节点名称必填（E01）')
  if (name.length > NAME_MAX) throw new Error(`保存失败：节点名称最长 ${NAME_MAX} 字符（E02）`)
  if (!payload.typeName.trim()) throw new Error('保存失败：组织类型必选（E01）')
  if (!Number.isInteger(payload.sort) || payload.sort < 0) throw new Error('保存失败：排序须为不小于 0 的整数（E03）')
  return { name, code: payload.code.trim().toUpperCase() }
}

/** 组织编码：为空则系统生成，租户内唯一 */
function resolveCode(orgId: string, code: string, excludeId?: string): string {
  const final = code || `ORG${Date.now().toString().slice(-4)}`
  if (nodeStore.some((item) => item.orgId === orgId && item.id !== excludeId && item.code.toUpperCase() === final.toUpperCase())) {
    throw new Error('保存失败：组织编码在租户内已存在（E03）')
  }
  return final
}

/** 重算本节点与全部子孙的层级与路径（移动后调用） */
function recalcSubtree(root: OrgNode): void {
  const parent = root.parentId ? nodeStore.find((item) => item.id === root.parentId) : null
  root.level = parent ? parent.level + 1 : 1
  root.path = `${parent?.path ?? '/'}${root.id}/`
  root.updatedAt = NOW
  nodeStore
    .filter((item) => item.orgId === root.orgId && item.parentId === root.id)
    .forEach((child) => recalcSubtree(child))
}

/**
 * 新增节点：同级名称不可重复；层级上限 5 层；上级须为启用状态。
 * 租户根组织由系统随租户创建自动生成，故不再支持新建顶级节点，parentId 必填（挂到根组织或其下级）。
 */
export async function createOrgNode(orgId: string, parentId: string | null, payload: OrgNodePayload): Promise<OrgNode> {
  const { name, code } = assertPayload(payload)

  let level = 1
  let path = '/'
  if (parentId) {
    const parent = nodeStore.find((item) => item.id === parentId && item.orgId === orgId)
    if (!parent) throw new Error('保存失败：上级节点不存在（E04）')
    if (parent.status === 'disabled') throw new Error('保存失败：上级节点已停用，不可新增下级（E05）')
    level = parent.level + 1
    path = parent.path
  } else {
    throw new Error('保存失败：租户根组织由系统自动创建，新增组织须挂到根组织或其下级（E04）')
  }
  if (level > ORG_MAX_LEVEL) throw new Error(`保存失败：组织架构最多 ${ORG_MAX_LEVEL} 层（E06）`)

  const siblings = siblingsOf(orgId, parentId)
  if (siblings.some((item) => item.name === name)) throw new Error('保存失败：同一上级下节点名称不可重复（E07）')

  nodeSeq += 1
  const id = `ON${String(nodeSeq).padStart(3, '0')}`
  const node: OrgNode = {
    id,
    orgId,
    code: resolveCode(orgId, code),
    name,
    typeName: payload.typeName,
    parentId,
    level,
    path: `${path}${id}/`,
    leader: payload.leader.trim(),
    sort: payload.sort,
    status: 'enabled',
    isRoot: false,
    createdAt: NOW,
    updatedAt: NOW,
  }
  nodeStore = [...nodeStore, node]
  return request(node)
}

/**
 * 租户根组织初始化（创建租户时必做，§租户开户初始化）：
 * 组织名称 = 租户名称，层级 1、无上级，租户内唯一；已存在则直接返回，保证幂等。
 */
export async function ensureTenantRootOrg(tenantId: string, tenantName: string, tenantType: TenantType): Promise<OrgNode> {
  const exists = nodeStore.find((item) => item.orgId === tenantId && item.isRoot)
  if (exists) {
    exists.updatedAt = NOW
    return request(exists)
  }

  nodeSeq += 1
  const id = `ON${String(nodeSeq).padStart(3, '0')}`
  const node: OrgNode = {
    id,
    orgId: tenantId,
    code: resolveCode(tenantId, `ORG${String(nodeSeq).padStart(4, '0')}`),
    name: tenantName,
    typeName: rootOrgTypeName(tenantType),
    parentId: null,
    level: 1,
    path: `/${id}/`,
    leader: '',
    sort: 1,
    status: 'enabled',
    isRoot: true,
    createdAt: NOW,
    updatedAt: NOW,
  }
  nodeStore = [...nodeStore, node]
  return request(node)
}

/** 取租户根组织（同步读取，供页面判断与选中） */
export function getRootOrg(tenantId: string): OrgNode | undefined {
  return nodeStore.find((item) => item.orgId === tenantId && item.isRoot)
}

/** 编辑节点：名称 / 类型 / 负责人 / 排序可改；改挂上级走 moveOrgNode */
export async function updateOrgNode(id: string, payload: OrgNodePayload): Promise<OrgNode> {
  const target = nodeStore.find((item) => item.id === id)
  if (!target) throw new Error('组织节点不存在或已被删除')
  const { name, code } = assertPayload(payload)

  const siblings = siblingsOf(target.orgId, target.parentId)
  if (siblings.some((item) => item.id !== id && item.name === name)) {
    throw new Error('保存失败：同一上级下节点名称不可重复（E07）')
  }

  target.code = resolveCode(target.orgId, code, id)
  target.name = name
  target.typeName = payload.typeName
  target.leader = payload.leader.trim()
  target.sort = payload.sort
  target.updatedAt = NOW
  return request(target)
}

/**
 * 移动节点：不可移动到自身或自身子孙；移动后层级不超 5 层；
 * 成功后重算本节点与全部子孙的 level / path（业务 PRD §5.3）。
 */
export async function moveOrgNode(id: string, newParentId: string | null): Promise<OrgNode> {
  const target = nodeStore.find((item) => item.id === id)
  if (!target) throw new Error('组织节点不存在或已被删除')
  if (newParentId === id) throw new Error('移动失败：不可移动到自身（E06）')
  if (target.isRoot) throw new Error('移动失败：租户根组织不可移动（E06）')
  if (!newParentId) throw new Error('移动失败：租户内仅有一个根组织，不可移动到顶级（E06）')

  let level = 1
  let path = '/'
  if (newParentId) {
    const parent = nodeStore.find((item) => item.id === newParentId && item.orgId === target.orgId)
    if (!parent) throw new Error('移动失败：目标上级不存在（E04）')
    if (parent.status === 'disabled') throw new Error('移动失败：目标上级已停用（E04）')
    if (parent.path.startsWith(target.path)) throw new Error('移动失败：不可移动到自身或下级（E07）')
    level = parent.level + 1
    path = parent.path
  }
  if (level > ORG_MAX_LEVEL) throw new Error(`移动失败：最多 ${ORG_MAX_LEVEL} 层（E05）`)

  const siblings = siblingsOf(target.orgId, newParentId)
  if (siblings.some((item) => item.id !== id && item.name === target.name)) {
    throw new Error('移动失败：目标层级下已存在同名节点（E02）')
  }

  target.parentId = newParentId
  target.level = level
  target.path = `${path}${target.id}/`
  target.updatedAt = NOW
  recalcSubtree(target)
  return request(target)
}

/** 停用 / 启用：停用后不可挂新成员，存量成员数据范围不变 */
export async function updateOrgNodeStatus(id: string, status: EnableStatus): Promise<OrgNode> {
  const target = nodeStore.find((item) => item.id === id)
  if (!target) throw new Error('组织节点不存在或已被删除')
  if (target.status === status) throw new Error(status === 'enabled' ? '操作失败：节点已启用' : '操作失败：节点已停用')

  if (status === 'disabled') {
    const hasEnabledChild = nodeStore.some(
      (item) => item.orgId === target.orgId && item.parentId === id && item.status === 'enabled',
    )
    if (hasEnabledChild) throw new Error('停用失败：该节点下仍有启用状态的下级，请先停用下级（E08）')
  } else if (target.parentId) {
    const parent = nodeStore.find((item) => item.id === target.parentId)
    if (parent && parent.status === 'disabled') throw new Error('启用失败：请先启用上级节点（E09）')
  }

  target.status = status
  target.updatedAt = NOW
  return request(target)
}

/** 删除：根组织不可删；有下级或仍有成员挂载时不可删 */
export async function deleteOrgNode(id: string): Promise<void> {
  const target = nodeStore.find((item) => item.id === id)
  if (!target) throw new Error('组织节点不存在或已被删除')
  if (target.isRoot) throw new Error('删除失败：根组织由系统自动创建，不可删除，仅可修改组织名称')
  if (nodeStore.some((item) => item.orgId === target.orgId && item.parentId === id)) {
    throw new Error('删除失败：该节点下仍有下级节点，请先处理下级')
  }
  const members = deptMemberCount(target.orgId, target.name)
  if (members > 0) throw new Error(`删除失败：该节点下仍有 ${members} 名成员，请先调整成员所属部门`)
  nodeStore = nodeStore.filter((item) => item.id !== id)
  return request(undefined)
}

/**
 * 删除租户时的组织树级联清理（租户管理 PRD §4.8-11 / AC28，C-05 裁决 A）：
 * 物理删除该租户的全部组织节点（含根组织），返回被清除的节点数。
 * 调用前该租户成员关系已统一置「已移出」，故不受「节点下有成员不可删」的约束。
 */
export function clearTenantOrgTree(tenantId: string): number {
  const before = nodeStore.length
  nodeStore = nodeStore.filter((item) => item.orgId !== tenantId)
  return before - nodeStore.length
}
