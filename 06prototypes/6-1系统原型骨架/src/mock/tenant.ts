import type {
  AdminRelievedReason,
  MemberJoinVia,
  Tenant,
  TenantAdminHistory,
  TenantAuditEntry,
  TenantChangeType,
  TenantMemberItem,
  TenantMemberStatus,
  TenantPayload,
  TenantProfileFieldDef,
  TenantProfileScope,
  TenantStatus,
  TenantStatusLog,
  TenantType,
} from '@/types'
import type { TreeOption } from '@/types'
import { getAccountById } from './account'
import { menuNameOf, TENANT_LEAF_MENU_IDS } from './menu'
import { clearTenantOrgTree } from './org'
import { ensureTenantAdminRole, isSuperAdminRole, TENANT_ADMIN_ROLE_NAME } from './role'

const NOW = '2026-10-21 09:30'

/** 模拟网络延迟，保持与既有 mock 的交互手感一致 */
function request<T>(data: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), 180))
}

/** 当前登录者（原型固定为超级管理员 A001，与平台账号模块同一当前用户） */
export const CURRENT_OPERATOR_ID = 'A001'
export const CURRENT_OPERATOR_NAME = '平台超管 · 林澈'

/** 持有「租户管理」功能码的平台角色（用户体系 PRD §5.3） */
export const TENANT_MGMT_ROLE_IDS = ['R01', 'R02']

/**
 * 平台侧操作权限（C-08 已确认）：
 * - 菜单可见：需持有「租户管理」功能码的平台角色（E23；原型不建模菜单渲染权限，菜单常显）；
 * - 超管专属动作：**删除租户、进入租户**（列表「更多」与详情页对应按钮按此判定是否渲染）；
 * - 其余按钮：按「租户管理」功能码（原型当前登录者恒具备）。
 * 原型当前登录者固定为超管 A001（林澈 · 角色 R01「超级管理员」），故判定恒为真；
 * 接入真实用户体系时只需替换本函数实现，页面判定点不变。
 */
export function isPlatformSuperAdmin(): boolean {
  const operator = getAccountById(CURRENT_OPERATOR_ID)
  return (operator?.roleIds ?? []).some((roleId) => isSuperAdminRole(roleId))
}

/**
 * 租户模块授权范围：**适用端为租户端**的末级功能菜单（不含平台侧的基础库 / 模型管理 / 平台账号等）。
 * 菜单树不按端拆分（租户系统管理与平台功能同处「系统管理」下），故此处必须用 TENANT_LEAF_MENU_IDS，
 * 否则平台功能会被写进租户的 moduleCodes。树形勾选交互见 TenantModuleModal。
 */
export const ALL_MODULE_CODES = TENANT_LEAF_MENU_IDS

/**
 * 角色与模块的功能点覆盖（§5.7.2：有效功能 = 已开通模块 ∩ 角色勾选）。
 * 原型用角色粗粒度映射，用于「取消授权影响人数」提示（H03 口径）。
 * 取值必须是 TENANT_LEAF_MENU_IDS 内真实存在的**末级**功能（分组节点无路由，不能授权）。
 */
const ROLE_MODULE_MAP: Record<string, string[]> = {
  租户管理员: ALL_MODULE_CODES,
}

/** 内置省市区三级静态数据（§5.1.1-2：本期不可增删改；原型取子集） */
export const REGION_TREE: TreeOption[] = [
  {
    value: '51',
    label: '四川省',
    extra: '510000',
    children: [
      {
        value: '5101',
        label: '成都市',
        extra: '510100',
        children: [
          { value: '510107', label: '武侯区', extra: '510107' },
          { value: '510109', label: '高新区', extra: '510109' },
        ],
      },
      {
        value: '5107',
        label: '绵阳市',
        extra: '510700',
        children: [
          { value: '510703', label: '涪城区', extra: '510703' },
          { value: '510704', label: '游仙区', extra: '510704' },
        ],
      },
    ],
  },
  {
    value: '33',
    label: '浙江省',
    extra: '330000',
    children: [
      {
        value: '3301',
        label: '杭州市',
        extra: '330100',
        children: [
          { value: '330110', label: '余杭区', extra: '330110' },
          { value: '330105', label: '拱墅区', extra: '330105' },
        ],
      },
      {
        value: '3302',
        label: '宁波市',
        extra: '330200',
        children: [
          { value: '330206', label: '北仑区', extra: '330206' },
          { value: '330212', label: '鄞州区', extra: '330212' },
        ],
      },
    ],
  },
  {
    value: '44',
    label: '广东省',
    extra: '440000',
    children: [
      {
        value: '4403',
        label: '深圳市',
        extra: '440300',
        children: [
          { value: '440305', label: '南山区', extra: '440305' },
          { value: '440304', label: '福田区', extra: '440304' },
        ],
      },
      {
        value: '4401',
        label: '广州市',
        extra: '440100',
        children: [
          { value: '440106', label: '天河区', extra: '440106' },
          { value: '440111', label: '白云区', extra: '440111' },
        ],
      },
    ],
  },
  {
    value: '11',
    label: '北京市',
    extra: '110000',
    children: [
      {
        value: '1101',
        label: '北京市',
        extra: '110100',
        children: [
          { value: '110105', label: '朝阳区', extra: '110105' },
          { value: '110108', label: '海淀区', extra: '110108' },
        ],
      },
    ],
  },
]

/** 属地三级文案（详情展示用） */
export function regionTextOf(provinceCode: string, cityCode: string, districtCode: string): string {
  const province = REGION_TREE.find((item) => item.value === provinceCode)
  const city = province?.children?.find((item) => item.value === cityCode)
  const district = city?.children?.find((item) => item.value === districtCode)
  return [province?.label, city?.label, district?.label].filter(Boolean).join(' / ')
}

/** 扩展档案 region 字段值（`省,市,区`）→ 展示文案 */
export function regionTextOfValue(value: string): string {
  if (!value) return ''
  const [province, city, district] = value.split(',')
  return regionTextOf(province ?? '', city ?? '', district ?? '')
}

/* ===================== 扩展档案字段定义（按租户类型的预置扩展信息表） ===================== */

/**
 * 四类租户的扩展档案字段定义（原型预置，不支持页面增删字段）。
 * 主档只管统一字段，类型差异全部收敛在这里。
 * editableScope：platform = 平台独占（平台可编辑，租户只读 + 变更申请）；
 * both = 平台与租户均可编辑；tenant = 租户自维护（平台侧开户表单中只读预览）。
 * tenantEditable（MVP极简版，业务 PRD V0.10 §4.14）：false = 法定资质类，租户端「租户信息」纯只读（灰底），
 * 提示「如需修改请联系平台」；true（缺省）= 业务属性类，租户管理员可直接编辑（白底），保存立即生效。
 * 前端按平台端扩展表单模板的该属性决定渲染输入框还是只读文本。
 */
export const PROFILE_FIELDS: Record<TenantType, TenantProfileFieldDef[]> = {
  enterprise: [
    {
      code: 'credit_code',
      name: '统一社会信用代码',
      type: 'text',
      required: true,
      editableScope: 'platform',
      needReview: true,
      tenantEditable: false,
      maxLength: 18,
      placeholder: '18 位大写字母与数字，如 91510107MA6C1A2B3X',
    },
    {
      code: 'industry_code',
      name: '行业',
      type: 'select',
      required: true,
      editableScope: 'both',
      tenantEditable: true,
      options: [
        { label: '制造业', value: 'manufacturing' },
        { label: '互联网与软件', value: 'internet' },
        { label: '金融业', value: 'finance' },
        { label: '农林牧渔', value: 'agriculture' },
        { label: '能源与环保', value: 'energy' },
        { label: '建筑业', value: 'construction' },
        { label: '批发零售', value: 'retail' },
        { label: '其他', value: 'other' },
      ],
    },
    {
      code: 'enterprise_scale',
      name: '企业规模',
      type: 'select',
      required: false,
      editableScope: 'both',
      tenantEditable: true,
      options: [
        { label: '1-50 人', value: 'lt50' },
        { label: '50-200 人', value: '50-200' },
        { label: '200-500 人', value: '200-500' },
        { label: '500-1000 人', value: '500-1000' },
        { label: '1000 人以上', value: 'gt1000' },
      ],
    },
    { code: 'registered_capital', name: '注册资本（万元）', type: 'number', required: false, editableScope: 'both', tenantEditable: true },
    { code: 'website', name: '官网地址', type: 'text', required: false, editableScope: 'both', tenantEditable: true, maxLength: 200, placeholder: '如 https://www.example.com' },
  ],
  government: [
    { code: 'org_code', name: '机关编码', type: 'text', required: true, editableScope: 'platform', needReview: true, tenantEditable: false, maxLength: 64, placeholder: '机关赋码 / 统一社会信用代码' },
    {
      code: 'admin_level',
      name: '机关层级',
      type: 'select',
      required: true,
      editableScope: 'both',
      tenantEditable: true,
      options: [
        { label: '省级', value: 'province' },
        { label: '市级', value: 'city' },
        { label: '区县级', value: 'county' },
        { label: '乡镇级', value: 'town' },
      ],
    },
    { code: 'parent_unit', name: '上级主管单位', type: 'text', required: false, editableScope: 'both', tenantEditable: true, maxLength: 100 },
    { code: 'staff_count', name: '编制人数', type: 'number', required: false, editableScope: 'both', tenantEditable: true, placeholder: '本单位核定编制数（人）' },
  ],
  org: [
    {
      code: 'institution_category',
      name: '机构类别',
      type: 'select',
      required: true,
      editableScope: 'both',
      tenantEditable: true,
      options: [
        { label: '认证机构', value: 'certification' },
        { label: '培训机构', value: 'training' },
        { label: '检测机构', value: 'testing' },
        { label: '医疗机构', value: 'medical' },
        { label: '其他', value: 'other' },
      ],
    },
    { code: 'qualification_no', name: '资质证书编号', type: 'text', required: true, editableScope: 'platform', needReview: true, tenantEditable: false, maxLength: 64 },
    { code: 'qualification_issued_by', name: '发证机关', type: 'text', required: false, editableScope: 'platform', needReview: true, tenantEditable: false, maxLength: 100 },
    { code: 'qualification_valid_to', name: '资质有效期', type: 'date', required: false, editableScope: 'platform', needReview: true, tenantEditable: false },
    { code: 'staff_count', name: '编制人数', type: 'number', required: false, editableScope: 'both', tenantEditable: true, placeholder: '本单位核定编制数（人）' },
  ],
  park: [
    {
      code: 'park_category',
      name: '园区类型',
      type: 'select',
      required: true,
      editableScope: 'both',
      tenantEditable: true,
      options: [
        { label: '产业园', value: 'industry_park' },
        { label: '写字楼', value: 'office' },
        { label: '孵化器', value: 'incubator' },
        { label: '物流园', value: 'logistics' },
        { label: '其他', value: 'other' },
      ],
    },
    { code: 'park_area', name: '园区面积（平方米）', type: 'number', required: true, editableScope: 'both', tenantEditable: true },
    { code: 'building_count', name: '楼宇数量', type: 'number', required: false, editableScope: 'both', tenantEditable: true },
    { code: 'resident_enterprise_count', name: '入驻企业数', type: 'number', required: false, editableScope: 'both', tenantEditable: true },
    { code: 'geo_location', name: '地理位置区划', type: 'region', required: true, editableScope: 'both', tenantEditable: false, placeholder: '省 / 市 / 区（园区物理所在区）' },
    { code: 'admin_region', name: '行政归属区划', type: 'region', required: true, editableScope: 'both', tenantEditable: false, placeholder: '省 / 市 / 区（统计数据归属区）' },
    { code: 'address', name: '详细地址', type: 'text', required: true, editableScope: 'both', tenantEditable: true, maxLength: 200 },
  ],
}

/** 字段归属（缺省 tenant） */
export function profileScopeOf(field: TenantProfileFieldDef): TenantProfileScope {
  return field.editableScope ?? 'tenant'
}

/** 字段是否允许租户在「租户信息」页直接修改（缺省 true：业务属性类） */
export function isTenantEditableField(field: TenantProfileFieldDef): boolean {
  return field.tenantEditable !== false
}

/** 取某租户类型的扩展档案字段定义 */
export function profileFieldsOf(type: TenantType): TenantProfileFieldDef[] {
  return PROFILE_FIELDS[type]
}

/** 租户端可维护字段（tenant / both 档；平台侧开户表单口径） */
export function tenantEditableFields(type: TenantType): TenantProfileFieldDef[] {
  return PROFILE_FIELDS[type].filter((field) => profileScopeOf(field) !== 'platform')
}

/** 平台独占字段（platform 档；平台侧开户表单口径） */
export function platformOnlyFields(type: TenantType): TenantProfileFieldDef[] {
  return PROFILE_FIELDS[type].filter((field) => profileScopeOf(field) === 'platform')
}

/**
 * 租户端「租户信息」业务属性类字段（tenant_editable = true）：白底输入框，保存立即生效。
 */
export function tenantSelfEditFields(type: TenantType): TenantProfileFieldDef[] {
  return PROFILE_FIELDS[type].filter(isTenantEditableField)
}

/**
 * 法定资质类字段（tenant_editable = false）：纯只读（灰底），提示「如需修改请联系平台」。
 */
export function qualificationFields(type: TenantType): TenantProfileFieldDef[] {
  return PROFILE_FIELDS[type].filter((field) => field.tenantEditable === false)
}

/** 平台侧开户 / 保存时需强校验的必填字段（platform + both 档；纯 tenant 档只驱动租户端待完善清单） */
export function platformRequiredFields(type: TenantType): TenantProfileFieldDef[] {
  return PROFILE_FIELDS[type].filter((field) => profileScopeOf(field) !== 'tenant' && field.required)
}

/** 档案完整度：只统计 platform 档必填字段（业务 PRD V0.8 §1.3-4） */
export function profileCompleteness(tenant: Tenant): {
  filled: number
  required: number
  percent: number
  missing: string[]
} {
  const requiredFields = platformRequiredFields(tenant.type)
  const missing = requiredFields.filter((item) => !(tenant.profile[item.code] ?? '').trim()).map((item) => item.name)
  const filled = requiredFields.length - missing.length
  return {
    filled,
    required: requiredFields.length,
    percent: requiredFields.length === 0 ? 100 : Math.round((filled / requiredFields.length) * 100),
    missing,
  }
}

/** 租户端待完善清单：tenant / both 档必填且未填的字段（不阻断登录与业务） */
export function missingTenantProfileFields(tenant: Tenant): TenantProfileFieldDef[] {
  // 只列租户可自编辑的必填字段：法定资质类（只读）缺口由平台侧「档案待完善」呈现
  return tenantSelfEditFields(tenant.type).filter(
    (field) => field.required && !(tenant.profile[field.code] ?? '').trim(),
  )
}

/** 租户端档案完整度（租户可编辑必填口径，用于引导与待完善清单） */
export function tenantProfileCompleteness(tenant: Tenant): { filled: number; required: number; percent: number } {
  const requiredFields = tenantSelfEditFields(tenant.type).filter((field) => field.required)
  const filled = requiredFields.filter((field) => !!(tenant.profile[field.code] ?? '').trim()).length
  return {
    filled,
    required: requiredFields.length,
    percent: requiredFields.length === 0 ? 100 : Math.round((filled / requiredFields.length) * 100),
  }
}

/** 联系人是否需成对填写（都空或都非空） */
export function contactPairValid(contactName: string, contactPhone: string): boolean {
  const hasName = !!contactName.trim()
  const hasPhone = !!contactPhone.trim()
  return hasName === hasPhone
}

/* ===================== 种子数据 ===================== */

let tenantSeq = 100

/**
 * 种子只为「主档统一字段」提供值；扩展档案在下方映射为 profile。
 * 保留旧三列（省 / 市 / 区）仅用于拼 region 值，不进入 Tenant 类型。
 */
type TenantSeed = Omit<
  Tenant,
  'contactName' | 'contactPhone' | 'validFrom' | 'validTo' | 'profile'
> & {
  provinceCode?: string
  cityCode?: string
  districtCode?: string
}

const TENANT_SEED: TenantSeed[] = [
  {
    id: 'T001',
    name: '熊宝家居科技有限公司',
    type: 'enterprise',
    unifiedCode: 'TC20260902001',
    provinceCode: '51',
    cityCode: '5101',
    districtCode: '510107',
    memberLimit: 50,
    status: 'enabled',
    adminAccountId: 'A003',
    adminName: '苏岐',
    adminMobile: '13800000003',
    moduleCodes: [...ALL_MODULE_CODES],
    createdBy: '平台超管 · 林澈',
    createdAt: '2026-09-02 09:30',
    updatedBy: '平台超管 · 林澈',
    updatedAt: '2026-10-15 16:40',
  },
  {
    id: 'T002',
    name: '青山竹木制品有限公司',
    type: 'enterprise',
    unifiedCode: 'TC20260906002',
    provinceCode: '51',
    cityCode: '5107',
    districtCode: '510703',
    memberLimit: 8,
    status: 'enabled',
    adminAccountId: 'A101',
    adminName: '温朔',
    adminMobile: '13800001002',
    moduleCodes: ['M101', 'M102', 'M103', 'M104', 'M109', 'M121'],
    createdBy: '平台超管 · 林澈',
    createdAt: '2026-09-06 11:02',
    updatedBy: '平台超管 · 林澈',
    updatedAt: '2026-10-11 09:58',
  },
  {
    id: 'T003',
    name: '中检西部检测机构',
    type: 'org',
    unifiedCode: 'TC20260910003',
    provinceCode: '51',
    cityCode: '5101',
    districtCode: '510109',
    memberLimit: 10,
    status: 'enabled',
    adminAccountId: 'A102',
    adminName: '罗凭',
    adminMobile: '13800001003',
    moduleCodes: ['M101', 'M102', 'M109'],
    createdBy: '平台超管 · 陈墨',
    createdAt: '2026-09-10 14:20',
    updatedBy: '平台超管 · 陈墨',
    updatedAt: '2026-10-09 10:12',
  },
  {
    id: 'T004',
    name: '绿源新能源科技有限公司',
    type: 'enterprise',
    unifiedCode: 'TC20260811004',
    provinceCode: '44',
    cityCode: '4403',
    districtCode: '440305',
    memberLimit: 6,
    status: 'enabled',
    adminAccountId: 'A007',
    adminName: '陆见微',
    adminMobile: '13800000007',
    moduleCodes: [...ALL_MODULE_CODES],
    createdBy: '平台超管 · 林澈',
    createdAt: '2026-08-11 08:30',
    updatedBy: '平台超管 · 陈墨',
    updatedAt: '2026-10-18 17:05',
  },
  {
    id: 'T005',
    name: '临江省生态环境厅',
    type: 'government',
    unifiedCode: 'TC20260915005',
    provinceCode: '51',
    cityCode: '5101',
    districtCode: '510109',
    memberLimit: 20,
    status: 'disabled',
    adminAccountId: 'A103',
    adminName: '沈确',
    adminMobile: '13800001005',
    moduleCodes: ['M101', 'M102', 'M109'],
    createdBy: '平台超管 · 林澈',
    createdAt: '2026-09-15 10:00',
    updatedBy: '平台超管 · 林澈',
    updatedAt: '2026-10-20 15:26',
  },
  {
    id: 'T006',
    name: '云岭食品有限公司',
    type: 'enterprise',
    unifiedCode: 'TC20260920006',
    provinceCode: '33',
    cityCode: '3301',
    districtCode: '330110',
    memberLimit: 5,
    status: 'enabled',
    adminAccountId: 'A104',
    adminName: '贺今',
    adminMobile: '13800001006',
    moduleCodes: ['M101', 'M102', 'M121'],
    createdBy: '平台超管 · 林澈',
    createdAt: '2026-09-20 09:12',
    updatedBy: '平台超管 · 林澈',
    updatedAt: '2026-09-20 09:12',
  },
  {
    id: 'T007',
    name: '西南产品质量监督检测中心',
    type: 'org',
    unifiedCode: 'TC20260928007',
    provinceCode: '51',
    cityCode: '5101',
    districtCode: '510107',
    memberLimit: 12,
    status: 'enabled',
    adminAccountId: 'A105',
    adminName: '崔聿',
    adminMobile: '13800001007',
    moduleCodes: ['M101', 'M102', 'M109', 'M121'],
    createdBy: '平台超管 · 陈墨',
    createdAt: '2026-09-28 16:45',
    updatedBy: '平台超管 · 陈墨',
    updatedAt: '2026-10-14 11:31',
  },
  {
    id: 'T008',
    name: '安溪县林业局',
    type: 'government',
    unifiedCode: 'TC20261008008',
    provinceCode: '33',
    cityCode: '3302',
    districtCode: '330206',
    memberLimit: 15,
    status: 'enabled',
    adminAccountId: 'A106',
    adminName: '方槿',
    adminMobile: '13800001008',
    moduleCodes: ['M101', 'M102', 'M109'],
    createdBy: '平台超管 · 林澈',
    createdAt: '2026-10-08 13:50',
    updatedBy: '平台超管 · 林澈',
    updatedAt: '2026-10-08 13:50',
  },
  {
    id: 'T009',
    name: '新汇竹纤维科技有限公司',
    type: 'enterprise',
    unifiedCode: 'TC20261021009',
    provinceCode: '',
    cityCode: '',
    districtCode: '',
    memberLimit: 1000,
    status: 'enabled',
    // 演示样本：开户后尚未指定主管理员（原种子误用 T006 的在任主管理员 A004，单租户绑定下不合法，D-04 已修正）
    adminAccountId: '',
    adminName: '',
    adminMobile: '',
    moduleCodes: [],
    createdBy: '平台超管 · 林澈',
    createdAt: '2026-10-21 08:12',
    updatedBy: '平台超管 · 林澈',
    updatedAt: '2026-10-21 08:12',
  },
  {
    id: 'T010',
    name: '青白江竹木产业园区',
    type: 'park',
    unifiedCode: 'TC20261012010',
    provinceCode: '51',
    cityCode: '5101',
    districtCode: '510109',
    memberLimit: 30,
    status: 'enabled',
    adminAccountId: 'A105',
    adminName: '崔聿',
    adminMobile: '13800001007',
    moduleCodes: ['M101', 'M102', 'M103', 'M104', 'M105', 'M106', 'M109', 'M110', 'M121', 'M122'],
    createdBy: '平台超管 · 陈墨',
    createdAt: '2026-10-12 10:20',
    updatedBy: '平台超管 · 陈墨',
    updatedAt: '2026-10-19 14:36',
  },
]

/** 种子主档补充：联系人 / 有效期（有效期覆盖「长期有效 / 已过期 / 即将到期」三种展示态） */
const TENANT_MASTER_SEED: Record<
  string,
  Pick<Tenant, 'contactName' | 'contactPhone' | 'validFrom' | 'validTo'>
> = {
  T001: { contactName: '苏岐', contactPhone: '13800000003', validFrom: '2026-01-01', validTo: '2027-12-31' },
  T002: { contactName: '温朔', contactPhone: '13800001002', validFrom: '2026-03-01', validTo: '2027-02-28' },
  T003: { contactName: '罗凭', contactPhone: '13800001003', validFrom: '2026-01-15', validTo: '2027-01-14' },
  T004: { contactName: '陆见微', contactPhone: '13800000007', validFrom: '2025-08-11', validTo: '2026-08-10' },
  T005: { contactName: '沈确', contactPhone: '13800001005', validFrom: '2026-01-01', validTo: '2027-12-31' },
  T006: { contactName: '贺今', contactPhone: '13800001006', validFrom: '2025-09-20', validTo: '2026-09-30' },
  T007: { contactName: '崔聿', contactPhone: '13800001007', validFrom: '2026-01-01', validTo: '2027-12-31' },
  T008: { contactName: '方槿', contactPhone: '13800001008', validFrom: '2026-10-08', validTo: '2026-11-15' },
  T009: { contactName: '', contactPhone: '', validFrom: '', validTo: '' },
  T010: { contactName: '崔聿', contactPhone: '13800001007', validFrom: '2026-10-12', validTo: '2027-10-11' },
}

/** 种子扩展档案（key = 字段编码；园区省市区由省市区分列拼出；T009 刻意缺必填字段用于展示「档案待完善」） */
const TENANT_PROFILE_SEED: Record<string, Record<string, string>> = {
  T001: {
    credit_code: '91510107MA6C1A2B3X',
    industry_code: 'manufacturing',
    enterprise_scale: '50-200',
    registered_capital: '5000',
    website: 'https://www.xiongbao-home.com',
  },
  T002: {
    credit_code: '91510703MA6C2D4E5Y',
    industry_code: 'manufacturing',
    enterprise_scale: 'lt50',
    registered_capital: '1200',
  },
  T003: {
    institution_category: 'testing',
    qualification_no: 'CMA-2024-0518',
    qualification_issued_by: '四川省市场监督管理局',
    qualification_valid_to: '2028-05-17',
  },
  T004: {
    credit_code: '91440305MA6C4H8J9K',
    industry_code: 'energy',
    enterprise_scale: 'gt1000',
    registered_capital: '80000',
    website: 'https://www.lvsource-newenergy.com',
  },
  T005: {
    org_code: '11510000MB0K1L2M',
    admin_level: 'province',
    parent_unit: '临江省人民政府',
  },
  T006: {
    credit_code: '91330110MA6C5P1Q2R',
    industry_code: 'manufacturing',
    enterprise_scale: 'lt50',
    registered_capital: '800',
  },
  T007: {
    institution_category: 'certification',
    qualification_no: 'CCAA-C-2023-0912',
    qualification_issued_by: '中国认证认可协会',
    qualification_valid_to: '2027-09-30',
  },
  T008: {
    org_code: '11330200MB1N2P3Q',
    admin_level: 'county',
    parent_unit: '安溪县人民政府',
  },
  T009: {
    credit_code: '91510109MA6C7T5U6V',
    enterprise_scale: 'lt50',
  },
  T010: {
    park_category: 'industry_park',
    park_area: '1260000',
    building_count: '36',
    resident_enterprise_count: '86',
    address: '成都市青白江区竹木产业园管委会',
  },
}

/** 种子 → 运行时数据：补主档字段、园区把省市区拼进地理位置 / 行政归属区划、挂上类型专属字段 */
let tenantStore: Tenant[] = TENANT_SEED.map((seed) => {
  const { provinceCode, cityCode, districtCode, ...rest } = seed
  const region = [provinceCode, cityCode, districtCode].filter(Boolean).join(',')
  const master = TENANT_MASTER_SEED[seed.id]
  const profile: Record<string, string> = { ...(TENANT_PROFILE_SEED[seed.id] ?? {}) }
  if (region && seed.type === 'park') {
    profile.geo_location = region
    profile.admin_region = region
  }
  return { ...rest, ...master, profile }
})

let memberSeq = 0

/** 成员种子：账号字段（loginName / email）冗余投影自 account 表，租户域字段由本表维护 */
interface MemberSeed {
  tenantId: string
  accountId: string
  loginName: string
  name: string
  mobile: string
  email?: string
  deptName: string
  roleNames: string[]
  status: TenantMemberStatus
  joinedVia?: MemberJoinVia
  joinedAt: string
}

function seedMember(seed: MemberSeed): TenantMemberItem {
  memberSeq += 1
  return {
    id: `TM${String(memberSeq).padStart(3, '0')}`,
    tenantId: seed.tenantId,
    accountId: seed.accountId,
    loginName: seed.loginName,
    name: seed.name,
    mobile: seed.mobile,
    email: seed.email ?? '',
    passwordMask: '••••••••',
    deptId: null,
    deptName: seed.deptName,
    roleNames: seed.roleNames,
    status: seed.status,
    joinedVia: seed.joinedVia ?? 'manual',
    joinedAt: seed.joinedAt,
    removedType: seed.status === 'removed' ? 'admin' : null,
    removedBy: seed.status === 'removed' ? '租户管理员' : '',
    removedAt: seed.status === 'removed' ? '2026-10-10 18:00' : '',
    createdBy: seed.status === 'removed' ? '租户管理员' : '租户管理员',
    createdAt: seed.joinedAt,
    updatedBy: '租户管理员',
    updatedAt: seed.status === 'removed' ? '2026-10-10 18:00' : seed.joinedAt,
  }
}

let memberStore: TenantMemberItem[] = [
  // T001 熊宝家居：主管理员 + 租户管理员 + 停用样本（租户内置角色仅保留「租户管理员」）
  seedMember({ tenantId: 'T001', accountId: 'A003', loginName: 'suqi', name: '苏岐', mobile: '13800000003', email: 'suqi@caronacount.com', deptName: '总经办', roleNames: ['租户管理员'], status: 'enabled', joinedAt: '2026-09-02 09:30' }),
  seedMember({ tenantId: 'T001', accountId: 'A101', loginName: 'wenshuo', name: '温朔', mobile: '13800001002', deptName: '核算部', roleNames: ['租户管理员'], status: 'enabled', joinedAt: '2026-09-03 10:12' }),
  seedMember({ tenantId: 'T001', accountId: 'A111', loginName: 'jiangge', name: '江舸', mobile: '13800001011', deptName: '核算部', roleNames: ['租户管理员'], status: 'enabled', joinedAt: '2026-09-05 14:20' }),
  seedMember({ tenantId: 'T001', accountId: 'A112', loginName: 'luning', name: '路柠', mobile: '13800001012', deptName: '录入组', roleNames: ['租户管理员'], status: 'disabled', joinedAt: '2026-09-08 09:05' }),
  // T002 青山竹木
  seedMember({ tenantId: 'T002', accountId: 'A101', loginName: 'wenshuo', name: '温朔', mobile: '13800001002', deptName: '技术部', roleNames: ['租户管理员'], status: 'enabled', joinedAt: '2026-09-06 11:02' }),
  seedMember({ tenantId: 'T002', accountId: 'A122', loginName: 'fulin', name: '付霖', mobile: '13800001022', deptName: '生产部', roleNames: ['租户管理员'], status: 'enabled', joinedAt: '2026-09-07 15:30' }),
  seedMember({ tenantId: 'T002', accountId: 'A123', loginName: 'nieran', name: '聂然', mobile: '13800001023', deptName: '生产部', roleNames: ['租户管理员'], status: 'disabled', joinedAt: '2026-09-09 08:50' }),
  // T003 中检西部
  seedMember({ tenantId: 'T003', accountId: 'A102', loginName: 'luoping', name: '罗凭', mobile: '13800001003', deptName: '检测一部', roleNames: ['租户管理员'], status: 'enabled', joinedAt: '2026-09-10 14:20' }),
  seedMember({ tenantId: 'T003', accountId: 'A132', loginName: 'zhanyan', name: '展颜', mobile: '13800001032', deptName: '检测二部', roleNames: ['租户管理员'], status: 'enabled', joinedAt: '2026-09-12 09:40' }),
  seedMember({ tenantId: 'T003', accountId: 'A133', loginName: 'siqing', name: '俟清', mobile: '13800001033', deptName: '综合部', roleNames: ['租户管理员'], status: 'enabled', joinedAt: '2026-09-12 09:45' }),
  seedMember({ tenantId: 'T003', accountId: 'A134', loginName: 'quemian', name: '阙眠', mobile: '13800001034', deptName: '检测一部', roleNames: ['租户管理员'], status: 'disabled', joinedAt: '2026-09-15 11:20' }),
  // T004 绿源新能源：用量 6 = 上限 6（达上限样本）
  seedMember({ tenantId: 'T004', accountId: 'A007', loginName: 'ops_lu', name: '陆见微', mobile: '13800000007', deptName: '碳管理部', roleNames: ['租户管理员'], status: 'enabled', joinedAt: '2026-08-11 08:30' }),
  seedMember({ tenantId: 'T004', accountId: 'A142', loginName: 'xibei', name: '席北', mobile: '13800001041', deptName: '碳管理部', roleNames: ['租户管理员'], status: 'enabled', joinedAt: '2026-08-12 09:10' }),
  seedMember({ tenantId: 'T004', accountId: 'A143', loginName: 'jiangting', name: '蒋汀', mobile: '13800001042', deptName: '采购部', roleNames: ['租户管理员'], status: 'enabled', joinedAt: '2026-08-15 14:00' }),
  seedMember({ tenantId: 'T004', accountId: 'A144', loginName: 'mirui', name: '糜芮', mobile: '13800001043', deptName: '财务部', roleNames: ['租户管理员'], status: 'enabled', joinedAt: '2026-08-18 10:30' }),
  seedMember({ tenantId: 'T004', accountId: 'A145', loginName: 'boyu', name: '柏聿', mobile: '13800001044', deptName: '生产部', roleNames: ['租户管理员'], status: 'enabled', joinedAt: '2026-09-01 16:20' }),
  seedMember({ tenantId: 'T004', accountId: 'A146', loginName: 'tuyou', name: '屠柚', mobile: '13800001045', deptName: '碳管理部', roleNames: ['租户管理员'], status: 'enabled', joinedAt: '2026-09-05 11:11' }),
  // T005 临江省生态环境厅（停用样本）
  seedMember({ tenantId: 'T005', accountId: 'A103', loginName: 'shenque', name: '沈确', mobile: '13800001005', deptName: '办公室', roleNames: ['租户管理员'], status: 'enabled', joinedAt: '2026-09-15 10:00' }),
  // T006 新汇竹纤维：补正种子（此前缺主管理员，与「新增必校验主管理员」的约束不一致）
  seedMember({ tenantId: 'T006', accountId: 'A004', loginName: 'heyu', name: '何屿', mobile: '13800000004', deptName: '总经办', roleNames: ['租户管理员'], status: 'enabled', joinedAt: '2026-09-20 09:12' }),
  seedMember({ tenantId: 'T005', accountId: 'A152', loginName: 'jiming', name: '稽明', mobile: '13800001051', deptName: '监测处', roleNames: ['租户管理员'], status: 'enabled', joinedAt: '2026-09-16 09:25' }),
  seedMember({ tenantId: 'T005', accountId: 'A153', loginName: 'fuchun', name: '富春', mobile: '13800001052', deptName: '监测处', roleNames: ['租户管理员'], status: 'enabled', joinedAt: '2026-09-16 09:30' }),
  // T006 云岭食品
  seedMember({ tenantId: 'T006', accountId: 'A104', loginName: 'hejin', name: '贺今', mobile: '13800001006', deptName: '品控部', roleNames: ['租户管理员'], status: 'enabled', joinedAt: '2026-09-20 09:12' }),
  seedMember({ tenantId: 'T006', accountId: 'A162', loginName: 'songmo', name: '松墨', mobile: '13800001061', deptName: '品控部', roleNames: ['租户管理员'], status: 'enabled', joinedAt: '2026-09-21 10:40' }),
  seedMember({ tenantId: 'T006', accountId: 'A163', loginName: 'ruzheng', name: '阮筝', mobile: '13800001062', deptName: '生产部', roleNames: ['租户管理员'], status: 'enabled', joinedAt: '2026-09-22 15:15' }),
  seedMember({ tenantId: 'T006', accountId: 'A164', loginName: 'fenglin', name: '丰临', mobile: '13800001063', deptName: '采购部', roleNames: ['租户管理员'], status: 'enabled', joinedAt: '2026-09-23 08:35' }),
  seedMember({ tenantId: 'T006', accountId: 'A165', loginName: 'huyun', name: '扈芸', mobile: '13800001064', deptName: '财务部', roleNames: ['租户管理员'], status: 'disabled', joinedAt: '2026-09-25 14:50' }),
  // T007 西南质检中心
  seedMember({ tenantId: 'T007', accountId: 'A105', loginName: 'cuiyu', name: '崔聿', mobile: '13800001007', deptName: '质量部', roleNames: ['租户管理员'], status: 'enabled', joinedAt: '2026-09-28 16:45' }),
  seedMember({ tenantId: 'T007', accountId: 'A172', loginName: 'yulan', name: '於岚', mobile: '13800001071', deptName: '质量部', roleNames: ['租户管理员'], status: 'enabled', joinedAt: '2026-09-29 09:20' }),
  seedMember({ tenantId: 'T007', accountId: 'A173', loginName: 'sheheng', name: '厍衡', mobile: '13800001072', deptName: '综合部', roleNames: ['租户管理员'], status: 'enabled', joinedAt: '2026-09-30 11:05' }),
  // T008 安溪县林业局
  seedMember({ tenantId: 'T008', accountId: 'A106', loginName: 'fangjin', name: '方槿', mobile: '13800001008', deptName: '林业股', roleNames: ['租户管理员'], status: 'enabled', joinedAt: '2026-10-08 13:50' }),
  seedMember({ tenantId: 'T008', accountId: 'A182', loginName: 'biezhi', name: '别枝', mobile: '13800001081', deptName: '林业股', roleNames: ['租户管理员'], status: 'enabled', joinedAt: '2026-10-09 09:15' }),
  seedMember({ tenantId: 'T008', accountId: 'A183', loginName: 'jinyue', name: '靳跃', mobile: '13800001082', deptName: '办公室', roleNames: ['租户管理员'], status: 'enabled', joinedAt: '2026-10-09 09:20' }),
  seedMember({ tenantId: 'T008', accountId: 'A184', loginName: 'chiwei', name: '池苇', mobile: '13800001083', deptName: '林业股', roleNames: ['租户管理员'], status: 'disabled', joinedAt: '2026-10-10 14:40' }),
  // T009 新汇竹纤维（新建未配置样本：无主管理员、无模块授权；用于演示「指定主管理员」与「档案待完善」）
  seedMember({ tenantId: 'T009', accountId: 'A191', loginName: 'manxi', name: '满惜', mobile: '13800001091', deptName: '总经办', roleNames: ['租户管理员'], status: 'enabled', joinedAt: '2026-10-21 08:20' }),
  seedMember({ tenantId: 'T009', accountId: 'A192', loginName: 'nongbin', name: '农玢', mobile: '13800001092', deptName: '生产部', roleNames: ['租户管理员'], status: 'enabled', joinedAt: '2026-10-21 08:25' }),
  // T010 青白江竹木产业园区（园区类型样本）
  seedMember({ tenantId: 'T010', accountId: 'A105', loginName: 'cuiyu', name: '崔聿', mobile: '13800001007', deptName: '园区管委会', roleNames: ['租户管理员'], status: 'enabled', joinedAt: '2026-10-12 10:20' }),
  seedMember({ tenantId: 'T010', accountId: 'A201', loginName: 'luokeyu', name: '骆可与', mobile: '13800001101', deptName: '招商服务部', roleNames: ['租户管理员'], status: 'enabled', joinedAt: '2026-10-13 09:30' }),
  seedMember({ tenantId: 'T010', accountId: 'A202', loginName: 'wensheng', name: '闻笙', mobile: '13800001102', deptName: '企业服务部', roleNames: ['租户管理员'], status: 'enabled', joinedAt: '2026-10-14 11:10' }),
  seedMember({ tenantId: 'T010', accountId: 'A203', loginName: 'shuning', name: '束宁', mobile: '13800001103', deptName: '综合办公室', roleNames: ['租户管理员'], status: 'enabled', joinedAt: '2026-10-15 15:45' }),
]

/** 按富化结构新建成员记录（主管理员开户 / 交接时复用；租户端成员管理走 member.ts） */
function buildMemberRecord(params: {
  tenantId: string
  accountId: string
  loginName: string
  name: string
  mobile: string
  deptName?: string
  roleNames: string[]
}): TenantMemberItem {
  return {
    id: `TM${Date.now().toString().slice(-6)}`,
    tenantId: params.tenantId,
    accountId: params.accountId,
    loginName: params.loginName,
    name: params.name,
    mobile: params.mobile,
    email: '',
    passwordMask: '••••••••',
    deptId: null,
    deptName: params.deptName ?? '总经办',
    roleNames: params.roleNames,
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
}

let adminHistoryStore: TenantAdminHistory[] = [
  {
    id: 'AH001',
    tenantId: 'T004',
    accountId: 'A200',
    accountName: '蒲望',
    accountMobile: '13800002001',
    status: 'relieved',
    relievedReason: 'demote',
    appointedBy: '平台超管 · 林澈',
    appointedAt: '2026-08-11 08:30',
    relievedBy: '平台超管 · 陈墨',
    relievedAt: '2026-09-25 15:10',
  },
  {
    id: 'AH006',
    tenantId: 'T006',
    accountId: 'A004',
    accountName: '何屿',
    accountMobile: '13800000004',
    status: 'active',
    relievedReason: '',
    appointedBy: '平台超管 · 林澈',
    appointedAt: '2026-09-20 09:12',
    relievedBy: '',
    relievedAt: '',
  },
]

let statusLogStore: TenantStatusLog[] = [
  { id: 'SL001', tenantId: 'T001', changeType: 'create', beforeStatus: '', afterStatus: 'enabled', reason: '', operatorName: '平台超管 · 林澈', operatedAt: '2026-09-02 09:30' },
  { id: 'SL002', tenantId: 'T002', changeType: 'create', beforeStatus: '', afterStatus: 'enabled', reason: '', operatorName: '平台超管 · 林澈', operatedAt: '2026-09-06 11:02' },
  { id: 'SL003', tenantId: 'T003', changeType: 'create', beforeStatus: '', afterStatus: 'enabled', reason: '', operatorName: '平台超管 · 陈墨', operatedAt: '2026-09-10 14:20' },
  { id: 'SL004', tenantId: 'T004', changeType: 'create', beforeStatus: '', afterStatus: 'enabled', reason: '', operatorName: '平台超管 · 林澈', operatedAt: '2026-08-11 08:30' },
  { id: 'SL005', tenantId: 'T005', changeType: 'create', beforeStatus: '', afterStatus: 'enabled', reason: '', operatorName: '平台超管 · 林澈', operatedAt: '2026-09-15 10:00' },
  { id: 'SL006', tenantId: 'T005', changeType: 'disable', beforeStatus: 'enabled', afterStatus: 'disabled', reason: '客户申请暂停服务，数据冻结待恢复', operatorName: '平台超管 · 林澈', operatedAt: '2026-10-20 15:26' },
  { id: 'SL007', tenantId: 'T006', changeType: 'create', beforeStatus: '', afterStatus: 'enabled', reason: '', operatorName: '平台超管 · 林澈', operatedAt: '2026-09-20 09:12' },
  { id: 'SL008', tenantId: 'T007', changeType: 'create', beforeStatus: '', afterStatus: 'enabled', reason: '', operatorName: '平台超管 · 陈墨', operatedAt: '2026-09-28 16:45' },
  { id: 'SL009', tenantId: 'T008', changeType: 'create', beforeStatus: '', afterStatus: 'enabled', reason: '', operatorName: '平台超管 · 林澈', operatedAt: '2026-10-08 13:50' },
  { id: 'SL010', tenantId: 'T009', changeType: 'create', beforeStatus: '', afterStatus: 'enabled', reason: '', operatorName: '平台超管 · 林澈', operatedAt: '2026-10-21 08:12' },
]

let auditStore: TenantAuditEntry[] = [
  { id: 'AU001', tenantId: 'T005', tenantName: '临江省生态环境厅', action: '停用', detail: '停用即全员掉线，3 名成员会话失效', operatorName: '平台超管 · 林澈', createdAt: '2026-10-20 15:26' },
  { id: 'AU002', tenantId: 'T004', tenantName: '绿源新能源科技有限公司', action: '更换主管理员', detail: '蒲望 移出租户 → 陆见微 接任', operatorName: '平台超管 · 陈墨', createdAt: '2026-09-25 15:10' },
  { id: 'AU003', tenantId: 'T003', tenantName: '中检西部检测机构', action: '取消模块授权', detail: '取消「模型管理」，影响 3 名成员', operatorName: '平台超管 · 陈墨', createdAt: '2026-10-09 10:12' },
]

/* ===================== 统计 ===================== */

/** 成员用量：含主管理员、含停用、含移出（D12；账号已注销的关系不计入，原型不建模注销） */
export function memberUsage(tenantId: string): number {
  return memberStore.filter((item) => item.tenantId === tenantId).length
}

/** 启用状态成员数（停用影响提示与恢复提示用） */
export function enabledMemberCount(tenantId: string): number {
  return memberStore.filter((item) => item.tenantId === tenantId && item.status === 'enabled').length
}

/** 组织管理跳转用：组织（租户）id → 类型（同步读取 mock 存储，供平台账号「所属组织」拼跳转路径） */
export function tenantTypeOf(id: string): TenantType | undefined {
  return tenantStore.find((item) => item.id === id)?.type
}

/** 某部门下的成员数（组织架构节点删除校验用；原型按部门名称匹配节点） */
export function deptMemberCount(tenantId: string, deptName: string): number {
  return memberStore.filter((item) => item.tenantId === tenantId && item.deptName === deptName).length
}

/** 组织内各部门直属成员数（组织架构树右侧展示用） */
export function deptMemberCounts(tenantId: string): Record<string, number> {
  return memberStore
    .filter((item) => item.tenantId === tenantId)
    .reduce<Record<string, number>>((acc, item) => {
      acc[item.deptName] = (acc[item.deptName] ?? 0) + 1
      return acc
    }, {})
}

/** 取消某模块授权的影响人数：启用成员中持覆盖该模块角色的人数（H03 口径） */
export function moduleImpactCount(tenantId: string, moduleCode: string): number {
  return memberStore.filter(
    (item) =>
      item.tenantId === tenantId &&
      item.status === 'enabled' &&
      item.roleNames.some((role) => (ROLE_MODULE_MAP[role] ?? []).includes(moduleCode)),
  ).length
}

/* ===================== 查询 ===================== */

export function fetchTenants(): Promise<Tenant[]> {
  return request([...tenantStore])
}

export async function fetchTenant(id: string): Promise<Tenant> {
  const target = tenantStore.find((item) => item.id === id)
  if (!target) throw new Error('租户不存在或已被删除')
  return request(target)
}

export function fetchTenantMembers(tenantId: string): Promise<TenantMemberItem[]> {
  return request(memberStore.filter((item) => item.tenantId === tenantId))
}

export function fetchTenantStatusLogs(tenantId: string): Promise<TenantStatusLog[]> {
  return request(
    statusLogStore.filter((item) => item.tenantId === tenantId).sort((a, b) => b.operatedAt.localeCompare(a.operatedAt)),
  )
}

export function fetchTenantAdminHistory(tenantId: string): Promise<TenantAdminHistory[]> {
  return request(
    adminHistoryStore.filter((item) => item.tenantId === tenantId).sort((a, b) => b.appointedAt.localeCompare(a.appointedAt)),
  )
}

export function fetchTenantAudit(tenantId: string): Promise<TenantAuditEntry[]> {
  return request(
    auditStore.filter((item) => item.tenantId === tenantId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  )
}

/* ===================== 维护 ===================== */

/** 企业统一社会信用代码（扩展档案 credit_code）：18 位大写字母与数字 */
const USCC_RE = /^[0-9A-Z]{18}$/

function assertPayload(payload: TenantPayload, excludeId?: string): Record<string, string> {
  const name = payload.name.trim()
  if (!name) throw new Error('保存失败：租户名称必填（E02）')
  if (name.length > 100) throw new Error('保存失败：租户名称最长 100 字符（E02）')

  const profile: Record<string, string> = { ...payload.profile }
  // 统一社会信用代码仅企业类型在扩展档案中维护，平台开户必填、全平台唯一
  if (payload.type === 'enterprise') {
    const creditCode = (profile.credit_code ?? '').trim().toUpperCase()
    if (!creditCode) throw new Error('保存失败：统一社会信用代码必填（E04）')
    if (!USCC_RE.test(creditCode)) {
      throw new Error('保存失败：统一社会信用代码须为 18 位大写字母与数字（E04）')
    }
    if (tenantStore.some((item) => item.id !== excludeId && (item.profile.credit_code ?? '').toUpperCase() === creditCode)) {
      throw new Error('保存失败：该统一社会信用代码已被其他租户占用（E05）')
    }
    profile.credit_code = creditCode
  }

  if (!['enterprise', 'government', 'org', 'park'].includes(payload.type)) {
    throw new Error('保存失败：租户类型必选（E02）')
  }

  const contactName = payload.contactName.trim()
  const contactPhone = payload.contactPhone.trim()
  if (!!contactName !== !!contactPhone) throw new Error('保存失败：联系人姓名与手机号须同时填写（E06）')
  if (contactPhone && !/^1\d{10}$/.test(contactPhone)) throw new Error('保存失败：联系人手机号须为 11 位（E07）')

  if (payload.validFrom && payload.validTo && payload.validTo < payload.validFrom) {
    throw new Error('保存失败：有效期结束日期不得早于开始日期（E08）')
  }

  // 开户强校验 platform / both 档必填扩展字段；纯 tenant 档必填项由租户端「租户信息」补录（E09）
  const missing = platformRequiredFields(payload.type)
    .filter((field) => !(payload.profile[field.code] ?? '').trim())
    .map((field) => field.name)
  if (missing.length > 0) throw new Error(`保存失败：扩展档案必填项未填 —— ${missing.join('、')}（E09）`)

  if (!Number.isInteger(payload.memberLimit) || payload.memberLimit < 1 || payload.memberLimit > 1000) {
    throw new Error('保存失败：成员数上限取值 1 至 1000（E03）')
  }
  return profile
}

function recordAudit(tenantId: string, tenantName: string, action: string, detail: string, operatorName = CURRENT_OPERATOR_NAME): void {
  auditStore = [
    { id: `AU${Date.now().toString().slice(-6)}`, tenantId, tenantName, action, detail, operatorName, createdAt: NOW },
    ...auditStore,
  ]
}

/**
 * 新建租户（开户即指定主管理员）：收主档统一字段 + 该类型必填扩展档案 + 成员数上限 + 主管理员账号 id。
 * 租户编号系统自动生成；主管理员关系、成员记录、账号侧租户身份同步写入；
 * 模块授权默认不勾选，建后于详情页配置。
 */
export async function createTenant(payload: TenantPayload): Promise<Tenant> {
  const profile = assertPayload(payload)

  const account = assertTenantAdminEligible(payload.adminAccountId)

  tenantSeq += 1
  const id = `T${tenantSeq}`
  const name = payload.name.trim()
  const tenant: Tenant = {
    id,
    name,
    type: payload.type,
    contactName: payload.contactName.trim(),
    contactPhone: payload.contactPhone.trim(),
    validFrom: payload.validFrom,
    validTo: payload.validTo,
    profile: { ...profile },
    memberLimit: payload.memberLimit,
    status: 'enabled',
    adminAccountId: account.id,
    adminName: account.displayName,
    adminMobile: account.mobile,
    moduleCodes: [],
    unifiedCode: `TC${Date.now().toString().slice(-8)}`,
    createdBy: CURRENT_OPERATOR_NAME,
    createdAt: NOW,
    updatedBy: CURRENT_OPERATOR_NAME,
    updatedAt: NOW,
  }
  tenantStore = [tenant, ...tenantStore]

  // 账号侧租户身份（主管理员，生效中）
  account.tenantMemberships = [
    ...account.tenantMemberships,
    { id: `M${Date.now().toString().slice(-6)}`, tenantId: id, tenantName: name, primary: true, status: 'active' },
  ]
  // 主管理员关系（每租户同时仅 1 条生效，历史保留）
  adminHistoryStore = [
    {
      id: `AH${Date.now().toString().slice(-6)}`,
      tenantId: id,
      accountId: account.id,
      accountName: account.displayName,
      accountMobile: account.mobile,
      status: 'active',
      relievedReason: '',
      appointedBy: CURRENT_OPERATOR_NAME,
      appointedAt: NOW,
      relievedBy: '',
      relievedAt: '',
    },
    ...adminHistoryStore,
  ]
  // 成员记录（主管理员，启用）
  const adminMember = buildMemberRecord({
    tenantId: id,
    accountId: account.id,
    loginName: account.loginName,
    name: account.displayName,
    mobile: account.mobile,
    roleNames: [TENANT_ADMIN_ROLE_NAME],
  })
  memberStore = [...memberStore, adminMember]

  // 租户角色初始化：租户内自动创建「租户管理员」角色并分配给主管理员，默认授予租户全部功能权限
  const adminRole = ensureTenantAdminRole({
    tenantId: id,
    tenantName: name,
    memberId: adminMember.id,
    memberName: adminMember.name,
    deptName: adminMember.deptName,
  })

  statusLogStore = [
    ...statusLogStore,
    { id: `SL${Date.now().toString().slice(-6)}`, tenantId: id, changeType: 'create', beforeStatus: '', afterStatus: 'enabled', reason: '', operatorName: CURRENT_OPERATOR_NAME, operatedAt: NOW },
  ]
  recordAudit(id, name, '新建租户', `类型 ${tenant.type} · 成员数上限 ${tenant.memberLimit} · 主管理员 ${account.displayName}（${account.mobile}） · 模块授权待配置`)
  recordAudit(
    id,
    name,
    '初始化租户管理员角色',
    `自动创建「${TENANT_ADMIN_ROLE_NAME}」并分配给 ${account.displayName}，默认授予 ${adminRole.menuGrants.length} 个租户端功能点（实际生效取已开通模块 ∩ 角色勾选）`,
  )
  return request(tenant)
}

/** 编辑：名称与成员数上限可改；类型创建后不可改；主管理员可重指定（与新建一致，从全局 account 中选择） */
export async function updateTenant(id: string, payload: TenantPayload): Promise<Tenant> {
  const target = tenantStore.find((item) => item.id === id)
  if (!target) throw new Error('租户不存在或已被删除')
  const profile = assertPayload(payload, id)
  const name = payload.name.trim()

  const before = {
    name: target.name,
    contactName: target.contactName,
    contactPhone: target.contactPhone,
    validFrom: target.validFrom,
    validTo: target.validTo,
    profile: { ...target.profile },
    memberLimit: target.memberLimit,
  }

  target.name = name
  target.contactName = payload.contactName.trim()
  target.contactPhone = payload.contactPhone.trim()
  target.validFrom = payload.validFrom
  target.validTo = payload.validTo
  target.profile = { ...profile }
  target.memberLimit = payload.memberLimit

  const parts = [`名称「${before.name}」→「${name}」`]
  if (before.contactName !== target.contactName || before.contactPhone !== target.contactPhone) {
    parts.push(`联系人 → ${target.contactName || '未填'}${target.contactPhone ? `（${target.contactPhone}）` : ''}`)
  }
  if (before.validFrom !== target.validFrom || before.validTo !== target.validTo) {
    parts.push(`有效期 ${before.validFrom || '—'} 至 ${before.validTo || '—'}`)
  }
  const changedProfile = Object.keys({ ...before.profile, ...target.profile }).filter(
    (code) => (before.profile[code] ?? '') !== (target.profile[code] ?? ''),
  )
  if (changedProfile.length > 0) parts.push(`扩展档案变更 ${changedProfile.length} 项`)
  if (before.memberLimit !== payload.memberLimit) parts.push(`成员数上限 ${before.memberLimit} → ${payload.memberLimit}`)

  // 主管理员变更统一走 changeTenantAdmin：
  // 校验（平台账号 / 兼任上限 / 名额）、角色兜底、关系表与账号身份同步只维护一处，避免两条路径规则不一致。
  // 编辑页更换默认按「降级为普通成员」处理原管理员。
  const newAdminId = payload.adminAccountId
  if (newAdminId && newAdminId !== target.adminAccountId) {
    const nextAdmin = assertTenantAdminEligible(newAdminId, id)
    await changeTenantAdmin(id, newAdminId, 'demote')
    parts.push(`主管理员 → ${nextAdmin?.displayName ?? newAdminId}`)
  }

  target.updatedBy = CURRENT_OPERATOR_NAME
  target.updatedAt = NOW
  recordAudit(id, target.name, '编辑租户', parts.join('；'))
  return request(target)
}

/** 调整成员数上限：允许下调至低于当前用量，只禁新增、不强制移出（§4.3） */
export async function updateMemberLimit(id: string, memberLimit: number): Promise<Tenant> {
  const target = tenantStore.find((item) => item.id === id)
  if (!target) throw new Error('租户不存在或已被删除')
  if (!Number.isInteger(memberLimit) || memberLimit < 1 || memberLimit > 1000) {
    throw new Error('操作失败：成员数上限取值 1 至 1000（E03）')
  }
  const before = target.memberLimit
  target.memberLimit = memberLimit
  target.updatedBy = CURRENT_OPERATOR_NAME
  target.updatedAt = NOW
  recordAudit(id, target.name, '调整成员数上限', `${before} → ${memberLimit}（当前用量 ${memberUsage(id)}）`)
  return request(target)
}

/** 停用 / 启用：状态须与操作匹配（E11 / E12） */
export async function updateTenantStatus(id: string, status: TenantStatus, reason = ''): Promise<Tenant> {
  const target = tenantStore.find((item) => item.id === id)
  if (!target) throw new Error('租户不存在或已被删除')
  if (status === target.status) {
    throw new Error(`操作失败：租户已是${status === 'enabled' ? '启用' : '停用'}状态（E11 / E12）`)
  }
  const changeType: TenantChangeType = status === 'enabled' ? 'enable' : 'disable'
  target.status = status
  target.updatedBy = CURRENT_OPERATOR_NAME
  target.updatedAt = NOW
  statusLogStore = [
    ...statusLogStore,
    {
      id: `SL${Date.now().toString().slice(-6)}`,
      tenantId: id,
      changeType,
      beforeStatus: status === 'enabled' ? 'disabled' : 'enabled',
      afterStatus: status,
      reason: reason.trim(),
      operatorName: CURRENT_OPERATOR_NAME,
      operatedAt: NOW,
    },
  ]
  recordAudit(id, target.name, changeType === 'disable' ? '停用' : '启用', changeType === 'disable' ? '全员掉线，数据冻结' : '恢复登录，不启用此前单独停用的成员')
  return request(target)
}

/**
 * 删除：二次确认 + 输入租户当前全名后物理删除（本期不设双人复核，见交付说明偏离项）。
 *
 * 级联清理（PRD §4.8-7～11 / AC28；C-05 裁决 A「一并物理清除」）：
 * - 租户记录与内嵌其上的扩展档案字段值：物理删除；
 * - 模块授权、状态变更记录：物理删除；
 * - 组织树：该租户全部组织节点（含根组织）物理清除，见 clearTenantOrgTree；
 * - 租户内业务数据（产品库 / 工艺库 / 核算项目 / 报告等）：正式实现随租户清除；原型中该批业务数据为单租户演示库、不按租户存储，故此处只落口径，不建清理链路；
 * - 成员关系保留用于追溯，统一置「已移出」并记录移出人与时间，不再参与登录与名额统计；
 * - 账号侧 `tenantMemberships` 对应记录置 `status = removed`、`primary = false`；
 * - 主管理员关系中的 active 记录置「已卸任（移出租户）」。
 * 账号本身保留（D03）。
 *
 * 注：租户为物理删除，成员记录上的 tenantId 仍指向已删 id（历史追溯用），
 * 运行时应以「租户是否仍存在」为准，不得仅凭成员记录判定可登录租户。
 */
export async function deleteTenant(id: string, fullName: string): Promise<void> {
  const target = tenantStore.find((item) => item.id === id)
  if (!target) throw new Error('租户不存在或已被删除')
  if (fullName.trim() !== target.name) throw new Error('操作失败：输入的租户全名与当前名称不一致（E07）')

  const affected = memberStore.filter((item) => item.tenantId === id)
  affected.forEach((member) => {
    member.status = 'removed'
    member.removedType = 'admin'
    member.removedBy = CURRENT_OPERATOR_NAME
    member.removedAt = NOW
    member.updatedBy = CURRENT_OPERATOR_NAME
    member.updatedAt = NOW
    const account = getAccountById(member.accountId)
    if (account) {
      account.tenantMemberships = account.tenantMemberships.map((m) =>
        isMembershipOf(m, target) ? { ...m, primary: false, status: 'removed' as const } : m,
      )
    }
  })

  adminHistoryStore = adminHistoryStore.map((item) =>
    item.tenantId === id && item.status === 'active'
      ? {
          ...item,
          status: 'relieved' as const,
          relievedReason: 'remove' as const,
          relievedBy: CURRENT_OPERATOR_NAME,
          relievedAt: NOW,
        }
      : item,
  )

  // 组织树随租户一并物理清除（C-05 裁决 A / PRD §4.8-11）
  const removedOrgNodes = clearTenantOrgTree(id)

  tenantStore = tenantStore.filter((item) => item.id !== id)
  statusLogStore = statusLogStore.filter((item) => item.tenantId !== id)
  recordAudit(
    id,
    target.name,
    '删除',
    `物理删除；清除组织树 ${removedOrgNodes} 个节点，扩展档案值、模块授权与状态变更记录一并删除，租户内业务数据随租户清除；${affected.length} 条成员关系置「已移出」，主管理员关系置「已卸任」，账号本身保留`,
  )
  return request(undefined)
}

/** 模块授权：取消只置失效，角色勾选保留（§4.7，V0.3 起不强制至少 1 个） */
export async function saveTenantModules(id: string, moduleCodes: string[]): Promise<Tenant> {
  const target = tenantStore.find((item) => item.id === id)
  if (!target) throw new Error('租户不存在或已被删除')
  if (moduleCodes.some((code) => !ALL_MODULE_CODES.includes(code))) throw new Error('操作失败：包含未登记的功能菜单')

  const before = target.moduleCodes
  const granted = moduleCodes.filter((code) => !before.includes(code))
  const revoked = before.filter((code) => !moduleCodes.includes(code))
  target.moduleCodes = [...moduleCodes]
  target.updatedBy = CURRENT_OPERATOR_NAME
  target.updatedAt = NOW
  const parts: string[] = []
  if (granted.length > 0) parts.push(`新增 ${granted.map(menuNameOf).join('、')}`)
  if (revoked.length > 0) parts.push(`取消 ${revoked.map(menuNameOf).join('、')}（功能点下次请求即失效）`)
  recordAudit(id, target.name, '模块授权', parts.join('；') || '无变化')
  return request(target)
}

/**
 * 主管理员唯一真相源：`tenant_admin_relation`（adminHistoryStore）中 status = active 的记录。
 * `Tenant` 上的 adminAccountId / adminName / adminMobile 只是投影，统一由本函数回写，
 * 页面读取投影用于展示，权限判定与交接一律走关系表 + accountId。
 */
export function syncTenantAdminProjection(tenant: Tenant): void {
  const active = adminHistoryStore.find((item) => item.tenantId === tenant.id && item.status === 'active')
  const account = active ? getAccountById(active.accountId) : undefined
  tenant.adminAccountId = active?.accountId ?? ''
  tenant.adminName = account?.displayName ?? active?.accountName ?? ''
  tenant.adminMobile = account?.mobile ?? active?.accountMobile ?? ''
}

/** 某账号在任（active）的主管理员席位数：用于「一人最多兼任 N 个租户」校验 */
export function activeTenantAdminSeats(accountId: string): number {
  return adminHistoryStore.filter((item) => item.accountId === accountId && item.status === 'active').length
}

/** 账号侧的租户身份匹配：优先 tenantId，历史数据缺 tenantId 时回退名称（禁止仅按名称判定） */
function isMembershipOf(
  membership: { tenantId?: string; tenantName: string },
  tenant: Tenant,
): boolean {
  return membership.tenantId ? membership.tenantId === tenant.id : membership.tenantName === tenant.name
}

const RELIEVED_TEXT: Record<AdminRelievedReason, string> = {
  demote: '降级为普通成员',
  disable: '禁用',
  remove: '移出租户',
}

/**
 * 一人最多可同时担任几个租户的主管理员。
 * **本期单租户模式**：一个账号只能绑定一个租户，故上限为 1（多人多租户需求后置）。
 */
export const MAX_TENANT_ADMIN_SEATS = 1

/**
 * 开户 / 编辑时的主管理员资格校验（与交接共用同一套规则）：
 * 账号存在且启用、不得为平台账号、不得超出兼任上限。
 */
function assertTenantAdminEligible(accountId: string, currentTenantId?: string) {
  const account = getAccountById(accountId)
  if (!account) throw new Error('保存失败：所选主管理员账号不存在')
  if (account.status !== 'enabled') throw new Error('保存失败：主管理员须为启用状态账号')
  if (account.roleIds.length > 0) {
    throw new Error('保存失败：平台账号不得兼任租户主管理员，请选择租户自有账号')
  }
  // 单租户模式：一个账号只能绑定一个租户（已有其他租户的有效成员关系即拒绝）
  const boundElsewhere = membershipsOfAccount(account.id).filter(
    (item) => !!item.tenantId && item.tenantId !== currentTenantId,
  )
  if (boundElsewhere.length > 0) {
    throw new Error(
      `保存失败：该账号已绑定租户「${boundElsewhere[0].tenantName}」，单租户模式下不能同时绑定多个租户`,
    )
  }
  const holdsCurrent =
    !!currentTenantId &&
    adminHistoryStore.some(
      (item) => item.tenantId === currentTenantId && item.accountId === account.id && item.status === 'active',
    )
  if (!holdsCurrent && activeTenantAdminSeats(account.id) >= MAX_TENANT_ADMIN_SEATS) {
    throw new Error(`保存失败：该账号已担任 ${MAX_TENANT_ADMIN_SEATS} 个租户的主管理员，超出兼任上限`)
  }
  return account
}

/**
 * 更换 / 指定主管理员（§4.8）。
 *
 * 硬约束（全部在变更前校验，避免半更新）：
 * 1. 接任者须为启用状态账号，且不是现任主管理员；
 * 2. **平台账号不得兼任租户主管理员**（否则等于绕过「进入租户」的只读与审计）；
 * 3. 一人最多同时担任 `MAX_TENANT_ADMIN_SEATS` 个租户的主管理员；
 * 4. 非本租户成员接任时，须校验成员数上限（名额满则拒绝，不允许自动建成员绕过配额）；
 * 5. 卸任去向为「降级」时，原成员须至少保留 1 个其他角色（不允许出现 0 角色，否则登录即空菜单且无法自愈）。
 */
export async function changeTenantAdmin(
  id: string,
  successorAccountId: string,
  relievedReason: AdminRelievedReason,
): Promise<Tenant> {
  const target = tenantStore.find((item) => item.id === id)
  if (!target) throw new Error('租户不存在或已被删除')
  const account = getAccountById(successorAccountId)
  if (!account) throw new Error('操作失败：所选账号不存在（E15）')
  if (account.status !== 'enabled') throw new Error('操作失败：接任者须为启用状态账号（E15）')
  if (account.id === target.adminAccountId) throw new Error('操作失败：接任者不可为现任主管理员（E15）')
  if (account.roleIds.length > 0) {
    throw new Error('操作失败：平台账号不得兼任租户主管理员（E15）；如需处理租户事务请使用「进入租户」并填写原因留痕')
  }
  if (activeTenantAdminSeats(account.id) >= MAX_TENANT_ADMIN_SEATS) {
    throw new Error(
      `操作失败：该账号已担任 ${MAX_TENANT_ADMIN_SEATS} 个租户的主管理员，超出兼任上限（E15），请先解除其他租户的任命`,
    )
  }

  // 历史数据自愈：关系表缺 active 记录时按 Tenant 投影补齐，
  // 否则交接会变成"新增一个主管理员"而原管理员不被收回（出现两个主管理员）。
  if (target.adminAccountId && !adminHistoryStore.some((item) => item.tenantId === id && item.status === 'active')) {
    adminHistoryStore = [
      ...adminHistoryStore,
      {
        id: `AH-MIG-${id}`,
        tenantId: id,
        accountId: target.adminAccountId,
        accountName: target.adminName,
        accountMobile: target.adminMobile,
        status: 'active',
        relievedReason: '',
        appointedBy: '系统（历史数据迁移）',
        appointedAt: NOW,
        relievedBy: '',
        relievedAt: '',
      },
    ]
  }

  const previous = adminHistoryStore.find((item) => item.tenantId === id && item.status === 'active')
  const previousName = previous?.accountName ?? ''
  const prevMember = previous
    ? memberStore.find((item) => item.tenantId === id && item.accountId === previous.accountId)
    : undefined

  // 兜底：降级后不允许 0 角色（0 角色成员登录后无任何菜单，且「启用」校验会拒绝修复）
  if (previous && prevMember && relievedReason === 'demote') {
    const remaining = prevMember.roleNames.filter((name) => name !== TENANT_ADMIN_ROLE_NAME)
    if (remaining.length === 0) {
      throw new Error(
        '操作失败：原主管理员仅持有「租户管理员」一个角色，降级后将无任何权限（E15）。请先为其指派至少 1 个其他角色，或改选「禁用 / 移出租户」',
      )
    }
  }

  const existingSuccessor = memberStore.find((item) => item.tenantId === id && item.accountId === account.id)
  if (!existingSuccessor) {
    if (memberUsage(id) >= target.memberLimit) {
      throw new Error(`操作失败：已达成员数上限（当前用量 ${memberUsage(id)}/${target.memberLimit}，E05），无法为新任主管理员建立成员关系`)
    }
  }

  // ===== 以下为变更区：校验已全部通过 =====
  if (previous) {
    previous.status = 'relieved'
    previous.relievedReason = relievedReason
    previous.relievedBy = CURRENT_OPERATOR_NAME
    previous.relievedAt = NOW

    const prevAccount = getAccountById(previous.accountId)
    if (prevAccount) {
      prevAccount.tenantMemberships = prevAccount.tenantMemberships.map((m) =>
        isMembershipOf(m, target)
          ? {
              ...m,
              primary: false,
              ...(relievedReason === 'remove' ? { status: 'removed' as const } : {}),
            }
          : m,
      )
    }

    if (prevMember) {
      prevMember.roleNames = prevMember.roleNames.filter((name) => name !== TENANT_ADMIN_ROLE_NAME)
      if (relievedReason === 'disable') {
        prevMember.status = 'disabled'
      } else if (relievedReason === 'remove') {
        prevMember.status = 'removed'
        prevMember.removedType = 'admin'
        prevMember.removedBy = CURRENT_OPERATOR_NAME
        prevMember.removedAt = NOW
      }
      prevMember.updatedBy = CURRENT_OPERATOR_NAME
      prevMember.updatedAt = NOW
    }
  }

  adminHistoryStore = [
    ...adminHistoryStore,
    {
      id: `AH${Date.now().toString().slice(-6)}`,
      tenantId: id,
      accountId: account.id,
      accountName: account.displayName,
      accountMobile: account.mobile,
      status: 'active',
      relievedReason: '',
      appointedBy: CURRENT_OPERATOR_NAME,
      appointedAt: NOW,
      relievedBy: '',
      relievedAt: '',
    },
  ]

  // 接任者成员记录：无则新建；已是本租户成员（含已移出）则复用并恢复启用
  let successorMember = existingSuccessor
  if (!successorMember) {
    successorMember = buildMemberRecord({
      tenantId: id,
      accountId: account.id,
      loginName: account.loginName,
      name: account.displayName,
      mobile: account.mobile,
      roleNames: [TENANT_ADMIN_ROLE_NAME],
    })
    memberStore = [...memberStore, successorMember]
  } else {
    successorMember.status = 'enabled'
    successorMember.removedType = null
    successorMember.removedBy = ''
    successorMember.removedAt = ''
    successorMember.roleNames = Array.from(new Set([...successorMember.roleNames, TENANT_ADMIN_ROLE_NAME]))
  }
  // 租户角色接力：租户内无「租户管理员」角色时自动创建，并分配给接任者
  ensureTenantAdminRole({
    tenantId: target.id,
    tenantName: target.name,
    memberId: successorMember.id,
    memberName: successorMember.name,
    deptName: successorMember.deptName,
  })

  // 接任者账号侧租户身份（主管理员，生效中）：已有该租户记录则更新，不重复追加
  const hasMembership = account.tenantMemberships.some((m) => isMembershipOf(m, target))
  account.tenantMemberships = hasMembership
    ? account.tenantMemberships.map((m) =>
        isMembershipOf(m, target) ? { ...m, tenantId: target.id, primary: true, status: 'active' as const } : m,
      )
    : [
        ...account.tenantMemberships,
        {
          id: `M${Date.now().toString().slice(-6)}`,
          tenantId: target.id,
          tenantName: target.name,
          primary: true,
          status: 'active' as const,
        },
      ]

  syncTenantAdminProjection(target)
  target.updatedBy = CURRENT_OPERATOR_NAME
  target.updatedAt = NOW
  recordAudit(
    id,
    target.name,
    previousName ? '更换主管理员' : '指定主管理员',
    previousName
      ? `${previousName} ${RELIEVED_TEXT[relievedReason]} → ${account.displayName} 接任，原账号「租户管理员」角色已收回`
      : `${account.displayName} 被指定为该租户主管理员`,
  )
  return request(target)
}

/** 进入租户：仅启用与停用状态可进入，原因必填，进出写审计（§4.10） */
export async function enterTenant(id: string, reason: string): Promise<void> {
  const target = tenantStore.find((item) => item.id === id)
  if (!target) throw new Error('操作失败：租户不存在或已被删除（E21）')
  if (!['enabled', 'disabled'].includes(target.status)) throw new Error('操作失败：租户状态不允许进入（E21）')
  if (!reason.trim()) throw new Error('操作失败：进入原因必填（E20）')
  recordAudit(id, target.name, '进入租户', `原因：${reason.trim()}；只读模式，写操作全禁`)
  return request(undefined)
}

/* ===================== 成员存储访问（供租户端成员管理读写，单一数据源） ===================== */

/** 按 id 查成员（同步读取，供存在性校验） */
export function findMember(id: string): TenantMemberItem | undefined {
  return memberStore.find((item) => item.id === id)
}

/** 按手机号查本租户生效成员关系（status 为启用 / 停用；已移出不占生效唯一约束） */
export function findMemberByMobile(tenantId: string, mobile: string): TenantMemberItem | undefined {
  return memberStore.find((item) => item.tenantId === tenantId && item.mobile === mobile && item.status !== 'removed')
}

/**
 * 按「租户 + 账号」查成员关系（数据权限判定入口）。
 * **一律用 accountId 匹配**，不得用手机号 / 姓名 / 登录名 —— 三者都可改或可重复。
 */
export function findMemberByAccount(tenantId: string, accountId: string): TenantMemberItem | undefined {
  return memberStore.find((item) => item.tenantId === tenantId && item.accountId === accountId)
}

/**
 * 按账号反查其有效租户身份（登录用）。
 * **以成员关系为唯一真相源**：账号侧 `tenantMemberships` 只是投影，
 * 投影缺失 / 滞后时不得导致账号无法登录（两处不一致时以本函数结果为准）。
 */
export function membershipsOfAccount(
  accountId: string,
): Array<{ tenantId: string; tenantName: string; primary: boolean }> {
  return memberStore
    .filter((item) => item.accountId === accountId && item.status !== 'removed')
    .map((item) => {
      const tenant = tenantStore.find((row) => row.id === item.tenantId)
      return {
        tenantId: item.tenantId,
        tenantName: tenant?.name ?? '',
        primary: tenant?.adminAccountId === accountId,
      }
    })
}

/** 写入成员记录（新建 / 关联） */
export function insertMember(record: TenantMemberItem): void {
  memberStore = [...memberStore, record]
}

/** 局部更新成员记录（编辑 / 停用 / 启用 / 移出 / 重置密码） */
export function patchMember(id: string, patch: Partial<TenantMemberItem>): TenantMemberItem {
  const target = memberStore.find((item) => item.id === id)
  if (!target) throw new Error('操作失败：成员不存在或已被删除')
  Object.assign(target, patch)
  return target
}

/* ===================== 租户端「租户信息」（业务 PRD V0.10 §4.14） ===================== */

/**
 * 主档身份字段（平台独占）：租户端「租户信息」只读。
 * 日常联络展示信息（联系人姓名 / 手机号）不在此列——MVP极简版起由租户管理员自助编辑（§4.14）。
 */
export const TENANT_MASTER_FIELDS: Array<{ field: keyof Tenant; label: string }> = [
  { field: 'name', label: '租户名称' },
  { field: 'validFrom', label: '有效期开始' },
  { field: 'validTo', label: '有效期结束' },
]

/** 日常联络展示信息（租户可编辑）：报告等对外场景展示的联络人与联络电话，成对填写 */
export const TENANT_CONTACT_FIELDS: Array<{ field: 'contactName' | 'contactPhone'; label: string }> = [
  { field: 'contactName', label: '联络人姓名' },
  { field: 'contactPhone', label: '联络电话' },
]

/**
 * 租户端「租户信息」统一保存（MVP极简版，业务 PRD V0.10 §4.14）：
 * - 区块二「日常联络展示信息」（联络人 / 联络电话）与区块三「业务属性信息」共用一个保存入口，保存后立即生效；
 * - 只接受业务属性类字段（tenant_editable = true）与联络展示字段，法定资质类字段即使页面带出也不允许直写；
 * - 有实际变化时写一条租户侧操作审计日志（记变更字段前后值、提交人、时间），平台可在详情页「操作记录」查看。
 */
export async function saveTenantInfo(
  tenantId: string,
  params: {
    /** 区块三业务属性字段值（key = 字段编码） */
    profileValues: Record<string, string>
    /** 区块二日常联络展示信息 */
    contact: { contactName: string; contactPhone: string }
    /** 提交人（租户管理员 / 持功能点成员） */
    operatorName: string
  },
): Promise<Tenant> {
  const target = tenantStore.find((item) => item.id === tenantId)
  if (!target) throw new Error('保存失败：租户不存在或已被删除')

  const editable = new Set(tenantSelfEditFields(target.type).map((field) => field.code))
  const rejected = Object.keys(params.profileValues).filter((code) => !editable.has(code))
  if (rejected.length > 0) {
    throw new Error(`保存失败：以下字段为法定资质类（只读），如需修改请联系平台 —— ${rejected.join('、')}`)
  }

  if (!contactPairValid(params.contact.contactName, params.contact.contactPhone)) {
    throw new Error('保存失败：联络人姓名与联络电话须同时填写（E06）')
  }
  if (params.contact.contactPhone && !/^1\d{10}$/.test(params.contact.contactPhone.trim())) {
    throw new Error('保存失败：联络电话须为 11 位手机号（E07）')
  }

  // 汇总变更明细（前后值），无变化则不写审计
  const changes: string[] = []
  const nameOf = (code: string) => PROFILE_FIELDS[target.type].find((field) => field.code === code)?.name ?? code

  Object.entries(params.profileValues).forEach(([code, value]) => {
    const before = target.profile[code] ?? ''
    const after = value.trim()
    if (before === after) return
    if (after) target.profile[code] = after
    else delete target.profile[code]
    changes.push(`${nameOf(code)}：${before || '空'} → ${after || '空'}`)
  })

  const contactBefore = { name: target.contactName, phone: target.contactPhone }
  if (
    params.contact.contactName.trim() !== contactBefore.name ||
    params.contact.contactPhone.trim() !== contactBefore.phone
  ) {
    changes.push(
      `日常联络展示信息：${contactBefore.name || '空'} / ${contactBefore.phone || '空'} → ${params.contact.contactName.trim() || '空'} / ${params.contact.contactPhone.trim() || '空'}`,
    )
  }
  target.contactName = params.contact.contactName.trim()
  target.contactPhone = params.contact.contactPhone.trim()

  if (changes.length > 0) {
    target.updatedBy = params.operatorName
    target.updatedAt = NOW
    recordAudit(tenantId, target.name, '租户端维护租户信息', changes.join('；'), params.operatorName)
  }
  return request(target)
}
