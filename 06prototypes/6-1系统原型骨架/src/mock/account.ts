import type {
  AccountOperationLog,
  AccountPayload,
  AccountStatus,
  PasswordResetLog,
  PasswordResetMode,
  PasswordResetType,
  PlatformAccount,
  TenantMembership,
} from '@/types'
import { applyAccountRoleChange, fetchPlatformRoles, isSuperAdminRole } from './role'

const NOW = '2026-10-21 09:30'

/** 模拟网络延迟，保持与既有 mock 的交互手感一致 */
function request<T>(data: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), 180))
}

/** 当前登录者（原型固定为超级管理员 A001，用于「不可停用 / 重置自己」校验） */
export const CURRENT_ACCOUNT_ID = 'A001'
export const CURRENT_ACCOUNT_NAME = '平台超管 · 林澈'

/** 平台角色统一定义在角色管理（role.ts），此处只引用不重写 */
export { fetchPlatformRoles }

let accountStore: PlatformAccount[] = [
  {
    id: 'A001',
    loginName: 'admin',
    mobile: '13800000001',
    displayName: '林澈',
    email: 'linche@caronacount.com',
    passwordMask: '••••••••',
    roleIds: ['R01'],
    status: 'enabled',
    mustChangePassword: false,
    tenantMemberships: [],
    createdBy: '系统初始化',
    createdAt: '2026-09-01 10:00',
    updatedBy: '系统初始化',
    updatedAt: '2026-10-18 14:20',
    lastLoginAt: '2026-10-22 09:12',
  },
  {
    id: 'A002',
    loginName: 'chenmo',
    mobile: '13800000002',
    displayName: '陈墨',
    passwordMask: '••••••••',
    roleIds: ['R01', 'R02'],
    status: 'enabled',
    mustChangePassword: false,
    tenantMemberships: [],
    createdBy: '平台超管 · 林澈',
    createdAt: '2026-09-02 09:15',
    updatedBy: '平台超管 · 林澈',
    updatedAt: '2026-10-15 11:02',
    lastLoginAt: '2026-10-21 18:40',
  },
  {
    id: 'A003',
    loginName: 'suqi',
    mobile: '13800000003',
    displayName: '苏岐',
    email: 'suqi@caronacount.com',
    passwordMask: '••••••••',
    roleIds: ['R02'],
    status: 'enabled',
    mustChangePassword: false,
    // 单租户模式：一个账号只绑定一个租户（其余租户身份已置为失效，保留记录可追溯）
    tenantMemberships: [
      { id: 'M01', tenantId: 'T001', tenantName: '熊宝家居科技有限公司', primary: true, status: 'active' },
      { id: 'M02', tenantId: 'T002', tenantName: '青山竹木制品有限公司', primary: false, status: 'removed' },
      { id: 'M03', tenantId: 'T003', tenantName: '中检西部检测机构', primary: false, status: 'removed' },
    ],
    createdBy: '平台超管 · 林澈',
    createdAt: '2026-09-05 08:40',
    updatedBy: '平台超管 · 林澈',
    updatedAt: '2026-10-12 16:33',
    lastLoginAt: '2026-10-20 08:15',
  },
  {
    id: 'A004',
    loginName: 'heyu',
    mobile: '13800000004',
    displayName: '何屿',
    passwordMask: '••••••••',
    roleIds: ['R02'],
    status: 'enabled',
    mustChangePassword: true,
    tenantMemberships: [{ id: 'M0601', tenantId: 'T006', tenantName: '新汇竹纤维科技有限公司', primary: true, status: 'active' }],
    createdBy: '平台超管 · 林澈',
    createdAt: '2026-10-20 10:05',
    updatedBy: '平台超管 · 林澈',
    updatedAt: '2026-10-20 10:05',
    lastLoginAt: '2026-10-23 07:50',
  },
  {
    id: 'A005',
    loginName: 'ops01',
    mobile: '13800000005',
    displayName: '周予安',
    email: 'zhouya@caronacount.com',
    passwordMask: '••••••••',
    roleIds: ['R02'],
    status: 'enabled',
    mustChangePassword: false,
    tenantMemberships: [],
    createdBy: '平台超管 · 林澈',
    createdAt: '2026-09-12 13:20',
    updatedBy: '平台超管 · 林澈',
    updatedAt: '2026-09-12 13:20',
    lastLoginAt: '2026-10-19 14:02',
  },
  {
    id: 'A006',
    loginName: 'ops_zheng',
    mobile: '13800000006',
    displayName: '郑棠',
    passwordMask: '••••••••',
    roleIds: ['R02'],
    status: 'disabled',
    mustChangePassword: false,
    tenantMemberships: [],
    createdBy: '平台超管 · 林澈',
    createdAt: '2026-09-18 09:00',
    updatedBy: '平台超管 · 林澈',
    updatedAt: '2026-10-09 17:45',
    lastLoginAt: '2026-10-09 17:40',
  },
  {
    id: 'A007',
    loginName: 'ops_lu',
    mobile: '13800000007',
    displayName: '陆见微',
    passwordMask: '••••••••',
    roleIds: ['R02'],
    status: 'enabled',
    mustChangePassword: false,
    tenantMemberships: [{ id: 'M04', tenantId: 'T004', tenantName: '绿源新能源科技有限公司', primary: true, status: 'active' }],
    createdBy: '平台超管 · 陈墨',
    createdAt: '2026-09-25 15:10',
    updatedBy: '平台超管 · 陈墨',
    updatedAt: '2026-10-16 09:26',
    lastLoginAt: '2026-10-22 11:30',
  },
  {
    id: 'A008',
    loginName: 'ops_qi',
    mobile: '13800000008',
    displayName: '祁夜',
    passwordMask: '••••••••',
    roleIds: ['R02'],
    status: 'canceled',
    mustChangePassword: false,
    tenantMemberships: [{ id: 'M05', tenantId: 'T006', tenantName: '云岭食品有限公司', primary: false, status: 'removed' }],
    createdBy: '平台超管 · 林澈',
    createdAt: '2026-08-30 11:11',
    updatedBy: '平台超管 · 林澈',
    updatedAt: '2026-10-01 10:00',
    lastLoginAt: '2026-10-01 09:55',
  },
]

/**
 * 租户成员账号（账号表全局唯一一份：租户成员的登录凭证也落在 account 表，
 * 由租户端「成员管理」维护；不持平台角色，故不出现在平台账号列表）。
 * 与 mock/tenant.ts 的成员种子一一对应（accountId 即此处主键）。
 */
const TENANT_MEMBER_ACCOUNTS: Array<{ id: string; loginName: string; displayName: string; mobile: string; email?: string }> = [
  { id: 'A101', loginName: 'wenshuo', displayName: '温朔', mobile: '13800001002' },
  { id: 'A102', loginName: 'luoping', displayName: '罗凭', mobile: '13800001003' },
  { id: 'A103', loginName: 'shenque', displayName: '沈确', mobile: '13800001005' },
  { id: 'A104', loginName: 'hejin', displayName: '贺今', mobile: '13800001006' },
  { id: 'A105', loginName: 'cuiyu', displayName: '崔聿', mobile: '13800001007' },
  { id: 'A106', loginName: 'fangjin', displayName: '方槿', mobile: '13800001008' },
  { id: 'A111', loginName: 'jiangge', displayName: '江舸', mobile: '13800001011' },
  { id: 'A112', loginName: 'luning', displayName: '路柠', mobile: '13800001012' },
  { id: 'A113', loginName: 'mengshu', displayName: '孟舒', mobile: '13800001013' },
  { id: 'A122', loginName: 'fulin', displayName: '付霖', mobile: '13800001022' },
  { id: 'A123', loginName: 'nieran', displayName: '聂然', mobile: '13800001023' },
  { id: 'A124', loginName: 'youmin', displayName: '尤敏', mobile: '13800001024' },
  { id: 'A132', loginName: 'zhanyan', displayName: '展颜', mobile: '13800001032' },
  { id: 'A133', loginName: 'siqing', displayName: '俟清', mobile: '13800001033' },
  { id: 'A134', loginName: 'quemian', displayName: '阙眠', mobile: '13800001034' },
  { id: 'A135', loginName: 'youer', displayName: '游迩', mobile: '13800001035' },
  { id: 'A142', loginName: 'xibei', displayName: '席北', mobile: '13800001041' },
  { id: 'A143', loginName: 'jiangting', displayName: '蒋汀', mobile: '13800001042' },
  { id: 'A144', loginName: 'mirui', displayName: '糜芮', mobile: '13800001043' },
  { id: 'A145', loginName: 'boyu', displayName: '柏聿', mobile: '13800001044' },
  { id: 'A146', loginName: 'tuyou', displayName: '屠柚', mobile: '13800001045' },
  { id: 'A152', loginName: 'jiming', displayName: '稽明', mobile: '13800001051' },
  { id: 'A153', loginName: 'fuchun', displayName: '富春', mobile: '13800001052' },
  { id: 'A162', loginName: 'songmo', displayName: '松墨', mobile: '13800001061' },
  { id: 'A163', loginName: 'ruzheng', displayName: '阮筝', mobile: '13800001062' },
  { id: 'A164', loginName: 'fenglin', displayName: '丰临', mobile: '13800001063' },
  { id: 'A165', loginName: 'huyun', displayName: '扈芸', mobile: '13800001064' },
  { id: 'A172', loginName: 'yulan', displayName: '於岚', mobile: '13800001071' },
  { id: 'A173', loginName: 'sheheng', displayName: '厍衡', mobile: '13800001072' },
  { id: 'A174', loginName: 'mize', displayName: '糜泽', mobile: '13800001073' },
  { id: 'A182', loginName: 'biezhi', displayName: '别枝', mobile: '13800001081' },
  { id: 'A183', loginName: 'jinyue', displayName: '靳跃', mobile: '13800001082' },
  { id: 'A184', loginName: 'chiwei', displayName: '池苇', mobile: '13800001083' },
  { id: 'A191', loginName: 'manxi', displayName: '满惜', mobile: '13800001091' },
  { id: 'A192', loginName: 'nongbin', displayName: '农玢', mobile: '13800001092' },
  { id: 'A201', loginName: 'luokeyu', displayName: '骆可与', mobile: '13800001101' },
  { id: 'A202', loginName: 'wensheng', displayName: '闻笙', mobile: '13800001102' },
  { id: 'A203', loginName: 'shuning', displayName: '束宁', mobile: '13800001103' },
]

accountStore = [
  ...accountStore,
  ...TENANT_MEMBER_ACCOUNTS.map((item) => ({
    id: item.id,
    loginName: item.loginName,
    mobile: item.mobile,
    displayName: item.displayName,
    email: item.email ?? '',
    passwordMask: '••••••••',
    roleIds: [] as string[],
    status: 'enabled' as AccountStatus,
    mustChangePassword: false,
    tenantMemberships: [] as TenantMembership[],
    createdBy: '租户管理员',
    createdAt: '2026-09-02 09:30',
    updatedBy: '租户管理员',
    updatedAt: '2026-09-02 09:30',
  })),
]

/* ===== 改密结果本地留存 =====
 * Mock 数据在内存态，刷新会回到种子值；这里用 localStorage 记住「已完成强制改密」的账号，
 * 使「改密成功后刷新 / 重新登录不再被拦截」的表现与服务端一致。
 * 重置密码时会把该记录移除，使强制改密重新生效。
 */
const MUST_CHANGE_CLEARED_KEY = 'pcf.must_change_cleared'

function readClearedAccountIds(): Set<string> {
  try {
    const raw = window.localStorage.getItem(MUST_CHANGE_CLEARED_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function writeClearedAccountIds(ids: Set<string>): void {
  try {
    window.localStorage.setItem(MUST_CHANGE_CLEARED_KEY, JSON.stringify([...ids]))
  } catch {
    /* 隐私模式忽略持久化失败 */
  }
}

readClearedAccountIds().forEach((accountId) => {
  const target = accountStore.find((item) => item.id === accountId)
  if (target) target.mustChangePassword = false
})

let resetLogStore: PasswordResetLog[] = [
  {
    id: 'L001',
    targetAccountId: 'A006',
    targetName: '郑棠',
    resetType: 'admin',
    passwordMode: 'random',
    operatorName: '平台超管 · 林澈',
    reason: '账号密码连续输入错误，平台运营岗需重新登录处理事项',
    result: 'success',
    failReason: '',
    clientIp: '10.20.3.41',
    createdAt: '2026-10-09 17:50',
  },
  {
    id: 'L002',
    targetAccountId: 'A004',
    targetName: '何屿',
    resetType: 'initial',
    passwordMode: 'random',
    operatorName: '平台超管 · 林澈',
    reason: '',
    result: 'success',
    failReason: '',
    clientIp: '10.20.3.41',
    createdAt: '2026-10-20 10:05',
  },
  {
    id: 'L003',
    targetAccountId: 'A007',
    targetName: '陆见微',
    resetType: 'admin',
    passwordMode: 'custom',
    operatorName: '平台超管 · 陈墨',
    reason: '',
    result: 'failed',
    failReason: '不可重置自己的密码',
    clientIp: '10.20.8.12',
    createdAt: '2026-10-16 09:30',
  },
]

/** 账号操作记录（审计日志，详情页「操作记录」展示；不包含密码重置明细） */
let operationStore: AccountOperationLog[] = [
  { id: 'O001', accountId: 'A001', action: 'create', actionText: '创建账号', operatorName: '系统初始化', summary: '初始化超级管理员账号', clientIp: '10.20.0.1', createdAt: '2026-09-01 10:00' },
  { id: 'O002', accountId: 'A001', action: 'assign_role', actionText: '分配平台角色', operatorName: '系统初始化', summary: '授予超级管理员', clientIp: '10.20.0.1', createdAt: '2026-09-01 10:00' },
  { id: 'O003', accountId: 'A002', action: 'create', actionText: '创建账号', operatorName: '平台超管 · 林澈', summary: '新建运营岗账号', clientIp: '10.20.3.41', createdAt: '2026-09-02 09:15' },
  { id: 'O004', accountId: 'A002', action: 'assign_role', actionText: '分配平台角色', operatorName: '平台超管 · 林澈', summary: '授予超级管理员、平台运营人员', clientIp: '10.20.3.41', createdAt: '2026-09-02 09:16' },
  { id: 'O005', accountId: 'A002', action: 'update', actionText: '编辑账号', operatorName: '平台超管 · 林澈', summary: '修改手机号', clientIp: '10.20.3.41', createdAt: '2026-10-15 11:02' },
  { id: 'O006', accountId: 'A003', action: 'create', actionText: '创建账号', operatorName: '平台超管 · 林澈', summary: '新建核算岗账号', clientIp: '10.20.3.41', createdAt: '2026-09-05 08:40' },
  { id: 'O007', accountId: 'A003', action: 'assign_role', actionText: '分配平台角色', operatorName: '平台超管 · 林澈', summary: '授予平台运营人员', clientIp: '10.20.3.41', createdAt: '2026-09-05 08:41' },
  { id: 'O008', accountId: 'A003', action: 'reset_password', actionText: '重置密码', operatorName: '平台超管 · 林澈', summary: '超管重置 · 随机生成', clientIp: '10.20.3.41', createdAt: '2026-10-12 16:33' },
  { id: 'O009', accountId: 'A004', action: 'create', actionText: '创建账号', operatorName: '平台超管 · 林澈', summary: '新建平台运营岗账号 · 建号初始密码', clientIp: '10.20.3.41', createdAt: '2026-10-20 10:05' },
  { id: 'O010', accountId: 'A005', action: 'create', actionText: '创建账号', operatorName: '平台超管 · 林澈', summary: '新建平台运营岗账号', clientIp: '10.20.3.41', createdAt: '2026-09-12 13:20' },
  { id: 'O011', accountId: 'A006', action: 'create', actionText: '创建账号', operatorName: '平台超管 · 林澈', summary: '新建平台运营岗账号', clientIp: '10.20.3.41', createdAt: '2026-09-18 09:00' },
  { id: 'O012', accountId: 'A006', action: 'disable', actionText: '停用账号', operatorName: '平台超管 · 林澈', summary: '账号停用，名下租户身份同步失效', clientIp: '10.20.3.41', createdAt: '2026-10-09 17:45' },
  { id: 'O013', accountId: 'A007', action: 'create', actionText: '创建账号', operatorName: '平台超管 · 陈墨', summary: '新建运营岗账号', clientIp: '10.20.8.12', createdAt: '2026-09-25 15:10' },
  { id: 'O014', accountId: 'A007', action: 'assign_role', actionText: '分配平台角色', operatorName: '平台超管 · 陈墨', summary: '授予平台运营人员', clientIp: '10.20.8.12', createdAt: '2026-09-25 15:11' },
  { id: 'O015', accountId: 'A007', action: 'reset_password', actionText: '重置密码', operatorName: '平台超管 · 陈墨', summary: '超管重置失败：不可重置自己的密码', clientIp: '10.20.8.12', createdAt: '2026-10-16 09:30' },
  { id: 'O016', accountId: 'A008', action: 'create', actionText: '创建账号', operatorName: '平台超管 · 林澈', summary: '新建平台运营岗账号', clientIp: '10.20.3.41', createdAt: '2026-08-30 11:11' },
  { id: 'O017', accountId: 'A008', action: 'cancel', actionText: '注销账号', operatorName: '平台超管 · 林澈', summary: '账号注销，保留档案备审计', clientIp: '10.20.3.41', createdAt: '2026-10-01 10:00' },
]

/* ===================== 校验 ===================== */

const MOBILE_PATTERN = /^1[3-9]\d{9}$/
const ELEVEN_DIGITS = /^\d{11}$/

/** 登录名归一化：去空格、转半角、转小写（§5.2.1 全局唯一不区分大小写判重） */
function normalizeLoginName(value: string): string {
  return value
    .replace(/\s+/g, '')
    .replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .toLowerCase()
}

function assertPayload(payload: AccountPayload, id: string | null): void {
  const name = payload.displayName.trim()
  const mobile = payload.mobile.trim()

  if (!name) throw new Error('保存失败：姓名必填')
  if (name.length > 50) throw new Error('保存失败：姓名最长 50 字符')
  if (!mobile) throw new Error('保存失败：手机号必填')
  if (!MOBILE_PATTERN.test(mobile)) throw new Error('保存失败：手机号格式不正确')

  if (accountStore.some((item) => item.id !== id && item.mobile === mobile)) {
    throw new Error('保存失败：手机号已存在（E02）')
  }
  if (payload.roleIds.length < 1) throw new Error('保存失败：至少分配 1 个平台角色（E04）')
  if (payload.roleIds.length > 5) throw new Error('保存失败：平台角色最多 5 个（E05）')
}

/** 有效启用超管数：账号启用 且 持有超级管理员角色 */
function countEnabledSuperAdmins(excludeId?: string): number {
  return accountStore.filter(
    (item) => item.id !== excludeId && item.status === 'enabled' && item.roleIds.some((roleId) => isSuperAdminRole(roleId)),
  ).length
}

function assertStatusChange(target: PlatformAccount, next: AccountStatus): void {
  if (target.id === CURRENT_ACCOUNT_ID) {
    throw new Error('操作失败：不可对自己执行该操作（E06）')
  }
  if (next === 'disabled' || next === 'canceled') {
    if (countEnabledSuperAdmins(target.id) === 0 && target.roleIds.some((roleId) => isSuperAdminRole(roleId))) {
      throw new Error('操作失败：系统至少保留 1 个启用状态超管（E07 / E08）')
    }
  }
  if (next === 'enabled' && target.roleIds.length === 0) {
    throw new Error('操作失败：该账号暂无平台角色，请先分配角色（E12）')
  }
}

/** 随机密码：12 位，含大写、小写、数字、特殊字符 */
function randomPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnopqrstuvwxyz'
  const digit = '23456789'
  const special = '@#$%&*'
  const pick = (pool: string) => pool[Math.floor(Math.random() * pool.length)]
  const body = Array.from({ length: 8 }, () => pick(upper + lower + digit)).join('')
  return `${pick(upper)}${pick(lower)}${pick(digit)}${pick(special)}${body}`
}

/** 新建账号随机初始密码：8 位「大小写字母 + 数字」，至少含大写、小写、数字各一 */
function generateInitialPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnopqrstuvwxyz'
  const digit = '23456789'
  const pool = upper + lower + digit
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)]
  const rest = Array.from({ length: 5 }, () => pick(pool)).join('')
  return `${pick(upper)}${pick(lower)}${pick(digit)}${rest}`
}

/** 新建账号自定义初始密码：8-20 位，且同时包含字母和数字（§5.9 建号初始密码） */
function assertInitialPassword(value: string): string {
  if (value.length < 8 || value.length > 20) throw new Error('操作失败：初始密码须为 8-20 位')
  if (!(/[A-Za-z]/.test(value) && /\d/.test(value))) throw new Error('操作失败：初始密码须同时包含字母和数字')
  return value
}

/** 自定义密码复杂度：不少于 8 位，且含大写 / 小写 / 数字 / 特殊字符中的三类（§5.9-3） */
function assertCustomPassword(value: string): string {
  if (value.length < 8) throw new Error('操作失败：密码长度不少于 8 位')
  const kinds = [/[A-Z]/, /[a-z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(value)).length
  if (kinds < 3) throw new Error('操作失败：密码须包含大写、小写、数字、特殊字符中的三类')
  return value
}

/* ===================== 查询 ===================== */

/** 平台账号列表：只返回持有生效平台角色的账号（即平台人员账号，不含租户成员） */
export function fetchAccounts(): Promise<PlatformAccount[]> {
  return request(accountStore.filter((item) => item.roleIds.length > 0))
}

/**
 * 全局账号查询（平台管理员视角）：返回账号表全部记录，**不过滤平台角色**，
 * 即同时包含「平台账号」与「租户成员账号」，供平台管理员查看全局所有账号信息。
 */
export function fetchAllAccounts(): Promise<PlatformAccount[]> {
  return request([...accountStore])
}

/** 账号归属类型：平台账号（持有平台角色）/ 租户成员（无平台角色，由租户端成员管理维护） */
export function accountKindOf(account: PlatformAccount): 'platform' | 'tenant' {
  return account.roleIds.length > 0 ? 'platform' : 'tenant'
}

export async function fetchAccount(id: string): Promise<PlatformAccount> {
  const target = accountStore.find((item) => item.id === id)
  if (!target) throw new Error('账号不存在或已被删除')
  return request(target)
}

/** 详情：账号信息 + 名下租户身份 */
export async function fetchAccountDetail(id: string): Promise<PlatformAccount> {
  return fetchAccount(id)
}

/** 密码重置记录（按目标账号 + 时间倒序） */
export function fetchResetLogs(accountId?: string): Promise<PasswordResetLog[]> {
  const list = accountId ? resetLogStore.filter((item) => item.targetAccountId === accountId) : resetLogStore
  return request([...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
}

/** 账号操作记录（审计日志，按目标账号 + 时间倒序） */
export function fetchAccountOperations(accountId?: string): Promise<AccountOperationLog[]> {
  const list = accountId ? operationStore.filter((item) => item.accountId === accountId) : operationStore
  return request([...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
}

/** 重置方式文案（超管重置 / 建号初始密码 / 租户管理员重置） */
export function resetTypeText(type: PasswordResetType): string {
  if (type === 'admin') return '超管重置'
  if (type === 'member') return '租户管理员重置'
  return '建号初始密码'
}

/** 密码生成方式文案（随机生成 / 自定义） */
export function passwordModeText(mode: PasswordResetMode): string {
  return mode === 'random' ? '随机生成' : '自定义'
}

/* ===================== 维护 ===================== */

export async function createAccount(
  payload: AccountPayload & { loginName: string; passwordMode?: PasswordResetMode; customPassword?: string },
): Promise<{ account: PlatformAccount; password: string; passwordMode: PasswordResetMode }> {
  const loginName = normalizeLoginName(payload.loginName)
  if (!loginName) throw new Error('保存失败：登录名必填')
  if (ELEVEN_DIGITS.test(loginName)) throw new Error('保存失败：登录名不得为 11 位纯数字（E03）')
  if (accountStore.some((item) => normalizeLoginName(item.loginName) === loginName)) {
    throw new Error('保存失败：登录名已存在（E01）')
  }
  assertPayload(payload, null)
  const mode: PasswordResetMode = payload.passwordMode === 'custom' ? 'custom' : 'random'
  const password = mode === 'custom' ? assertInitialPassword(payload.customPassword ?? '') : generateInitialPassword()
  const item: PlatformAccount = {
    id: `A${Date.now().toString().slice(-6)}`,
    loginName: loginName,
    mobile: payload.mobile.trim(),
    displayName: payload.displayName.trim(),
    email: payload.email?.trim() ?? '',
    avatarUrl: payload.avatarUrl ?? '',
    passwordMask: '••••••••',
    roleIds: [...payload.roleIds],
    status: 'enabled',
    mustChangePassword: true,
    tenantMemberships: [],
    createdBy: CURRENT_ACCOUNT_NAME,
    createdAt: NOW,
    updatedBy: CURRENT_ACCOUNT_NAME,
    updatedAt: NOW,
  }
  accountStore = [item, ...accountStore]
  // 同步角色管理侧的角色成员引用（两个视角保持一致）
  applyAccountRoleChange(item.id, item.displayName, item.loginName, [], item.roleIds, true)
  resetLogStore = [
    {
      id: `L${Date.now().toString().slice(-6)}`,
      targetAccountId: item.id,
      targetName: item.displayName,
      resetType: 'initial',
      passwordMode: mode,
      operatorName: CURRENT_ACCOUNT_NAME,
      reason: '',
      result: 'success',
      failReason: '',
      clientIp: '10.20.3.41',
      createdAt: NOW,
    },
    ...resetLogStore,
  ]
  return request({ account: item, password, passwordMode: mode })
}

/**
 * 租户开户 · 新建主管理员账号（用户体系 §开户初始化）：
 * 账号同样落在全局 account 表（登录名 / 手机号全局唯一），但不分配平台角色（roleIds 为空），
 * 因此不出现在平台账号列表，只作为该租户的主管理员；建后启用并强制首登改密，返回一次性初始密码。
 */
export async function createTenantAdminAccount(payload: {
  loginName: string
  displayName: string
  mobile: string
  email?: string
  passwordMode?: PasswordResetMode
  customPassword?: string
}): Promise<{ account: PlatformAccount; password: string; passwordMode: PasswordResetMode }> {
  const loginName = normalizeLoginName(payload.loginName)
  if (!loginName) throw new Error('保存失败：登录名必填')
  if (ELEVEN_DIGITS.test(loginName)) throw new Error('保存失败：登录名不得为 11 位纯数字（E03）')
  if (accountStore.some((item) => normalizeLoginName(item.loginName) === loginName)) {
    throw new Error('保存失败：登录名已存在（E01）')
  }
  const name = payload.displayName.trim()
  if (!name) throw new Error('保存失败：姓名必填')
  if (name.length > 50) throw new Error('保存失败：姓名最长 50 字符')
  const mobile = payload.mobile.trim()
  if (!MOBILE_PATTERN.test(mobile)) throw new Error('保存失败：手机号格式不正确（E12）')
  if (accountStore.some((item) => item.mobile === mobile)) throw new Error('保存失败：手机号已存在（E02）')

  const mode: PasswordResetMode = payload.passwordMode === 'custom' ? 'custom' : 'random'
  const password = mode === 'custom' ? assertInitialPassword(payload.customPassword ?? '') : generateInitialPassword()
  const item: PlatformAccount = {
    id: `A${Date.now().toString().slice(-6)}`,
    loginName,
    mobile,
    displayName: name,
    email: payload.email?.trim() ?? '',
    passwordMask: '••••••••',
    roleIds: [],
    status: 'enabled',
    mustChangePassword: true,
    tenantMemberships: [],
    createdBy: CURRENT_ACCOUNT_NAME,
    createdAt: NOW,
    updatedBy: CURRENT_ACCOUNT_NAME,
    updatedAt: NOW,
  }
  accountStore = [item, ...accountStore]
  resetLogStore = [
    {
      id: `L${Date.now().toString().slice(-6)}`,
      targetAccountId: item.id,
      targetName: item.displayName,
      resetType: 'initial',
      passwordMode: mode,
      operatorName: CURRENT_ACCOUNT_NAME,
      reason: '租户开户新建主管理员账号',
      result: 'success',
      failReason: '',
      clientIp: '10.20.3.41',
      createdAt: NOW,
    },
    ...resetLogStore,
  ]
  return request({ account: item, password, passwordMode: mode })
}

/** 按 id 查询平台账号（供租户主管理员绑定 / 更换使用） */
export function getAccountById(id: string): PlatformAccount | undefined {
  return accountStore.find((item) => item.id === id)
}

/** 按手机号查询账号（手机号全局唯一；供成员管理「关联已有账号」命中反查） */
export function getAccountByMobile(mobile: string): PlatformAccount | undefined {
  return accountStore.find((item) => item.mobile === mobile)
}

/** 编辑：登录名不可改；姓名与手机号可改，手机号须全局唯一 */
export async function updateAccount(id: string, payload: AccountPayload): Promise<PlatformAccount> {
  const target = accountStore.find((item) => item.id === id)
  if (!target) throw new Error('账号不存在或已被删除')
  assertPayload(payload, id)

  target.displayName = payload.displayName.trim()
  target.mobile = payload.mobile.trim()
  target.email = payload.email?.trim() ?? ''
  target.avatarUrl = payload.avatarUrl ?? ''
  target.updatedBy = CURRENT_ACCOUNT_NAME
  target.updatedAt = NOW
  return request(target)
}

/** 分配平台角色：增减后至少保留 1 个；移除最后一个超管的超管角色时拒绝 */
export async function assignAccountRoles(id: string, roleIds: string[]): Promise<PlatformAccount> {
  const target = accountStore.find((item) => item.id === id)
  if (!target) throw new Error('账号不存在或已被删除')
  if (roleIds.length < 1) throw new Error('操作失败：至少保留 1 个平台角色')
  if (roleIds.length > 5) throw new Error('操作失败：平台角色最多 5 个')

  const losesSuperAdmin = target.roleIds.some((roleId) => isSuperAdminRole(roleId)) && !roleIds.some((roleId) => isSuperAdminRole(roleId))
  if (losesSuperAdmin && countEnabledSuperAdmins(id) === 0) {
    throw new Error('操作失败：不可移除最后一个超管的超级管理员角色（E09）')
  }

  const prevRoleIds = [...target.roleIds]
  target.roleIds = [...roleIds]
  // 同步角色管理侧的角色成员引用（两个视角保持一致）
  applyAccountRoleChange(id, target.displayName, target.loginName, prevRoleIds, target.roleIds, target.status === 'enabled')
  target.updatedBy = CURRENT_ACCOUNT_NAME
  target.updatedAt = NOW
  return request(target)
}

/** 停用 / 启用：账号级状态变更，租户端登录同时失效 */
export async function updateAccountStatus(id: string, status: AccountStatus): Promise<PlatformAccount> {
  const target = accountStore.find((item) => item.id === id)
  if (!target) throw new Error('账号不存在或已被删除')
  assertStatusChange(target, status)
  target.status = status
  target.updatedBy = CURRENT_ACCOUNT_NAME
  target.updatedAt = NOW
  return request(target)
}

/**
 * 注销（物理删除）：从账号表删除账号，并同步回收其平台角色关联（§5.4 注销）。
 * 与停用不同，注销不保留账号记录；删除前校验不删除最后一个启用状态的超管。
 */
export async function deleteAccount(id: string): Promise<void> {
  const target = accountStore.find((item) => item.id === id)
  if (!target) throw new Error('账号不存在或已被删除')
  if (id === CURRENT_ACCOUNT_ID) throw new Error('操作失败：不可对自己执行该操作（E06）')
  if (target.roleIds.some((roleId) => isSuperAdminRole(roleId)) && countEnabledSuperAdmins(id) === 0) {
    throw new Error('操作失败：系统至少保留 1 个启用状态超管（E07 / E08）')
  }
  // 同步回收角色成员引用（两个视角保持一致）
  applyAccountRoleChange(id, target.displayName, target.loginName, target.roleIds, [], true)
  accountStore = accountStore.filter((item) => item.id !== id)
  return request(undefined)
}

/**
 * 重置密码：平台侧仅超管可操作，不可重置自己；租户端成员重置走 resetType = 'member'。
 * 支持随机生成与自定义两种方式；自定义密码按系统参数校验复杂度（不少于 8 位且含三类字符）。
 * 返回一次性明文密码，关闭弹窗后不可再查（§5.9 D09）。
 */
export async function resetPassword(
  id: string,
  mode: PasswordResetMode = 'random',
  customPassword?: string,
  resetType: PasswordResetType = 'admin',
): Promise<string> {
  const target = accountStore.find((item) => item.id === id)
  if (!target) throw new Error('账号不存在或已被删除')
  if (resetType === 'admin' && id === CURRENT_ACCOUNT_ID) throw new Error('操作失败：不可重置自己的密码（E10）')

  const plaintext = mode === 'custom' ? assertCustomPassword(customPassword ?? '') : randomPassword()
  target.passwordMask = '••••••••'
  // 重置密码后一律置强制改密（与新建账号同口径），并清除「已改密」留存
  target.mustChangePassword = true
  const cleared = readClearedAccountIds()
  cleared.delete(id)
  writeClearedAccountIds(cleared)
  target.updatedBy = CURRENT_ACCOUNT_NAME
  target.updatedAt = NOW

  resetLogStore = [
    {
      id: `L${Date.now().toString().slice(-6)}`,
      targetAccountId: id,
      targetName: target.displayName,
      resetType,
      passwordMode: mode,
      operatorName: CURRENT_ACCOUNT_NAME,
      reason: '',
      result: 'success',
      failReason: '',
      clientIp: '10.20.3.41',
      createdAt: NOW,
    },
    ...resetLogStore,
  ]
  return request(plaintext)
}

/**
 * 登录后强制改密（`must_change_password`）：
 * - 仅 `mustChangePassword = true` 的账号可调用；
 * - 新密码按「≥ 8 位且含大写 / 小写 / 数字 / 特殊字符中的三类」校验；
 * - 成功后清标记，旧密码与既有会话立即失效；写入账号操作记录。
 * 说明：「新密码不得与旧密码相同」由调用方（改密页）比对用户输入的旧密码完成，
 * 原型不存储明文密码，因此不在此处比对。
 */
export async function changePassword(accountId: string, plaintext: string, operatorName?: string): Promise<void> {
  const target = accountStore.find((item) => item.id === accountId)
  if (!target) throw new Error('账号不存在或已被删除')
  if (!target.mustChangePassword) throw new Error('当前账号无需强制改密')
  assertCustomPassword(plaintext)

  target.passwordMask = '••••••••'
  target.mustChangePassword = false
  const cleared = readClearedAccountIds()
  cleared.add(accountId)
  writeClearedAccountIds(cleared)
  target.updatedBy = operatorName ?? target.displayName
  target.updatedAt = NOW

  operationStore = [
    {
      id: `O${Date.now().toString().slice(-6)}`,
      accountId,
      action: 'change_password',
      actionText: '修改密码',
      operatorName: operatorName ?? target.displayName,
      summary: '本人修改密码 · 已清除强制改密标记',
      clientIp: '10.20.3.41',
      createdAt: NOW,
    },
    ...operationStore,
  ]
  return request(undefined)
}

/* ===================== 租户端成员管理（账号侧能力） ===================== */
/**
 * 成员管理 · 新建账号（成员管理 §5.1）：账号全局唯一一份，不挂平台角色。
 * 登录名判重（归一化后全局唯一、禁 11 位纯数字），手机号全局唯一；建后置启用与首登改密。
 */
export async function createMemberAccount(payload: {
  loginName: string
  displayName: string
  mobile: string
  email?: string
}): Promise<PlatformAccount> {
  const loginName = normalizeLoginName(payload.loginName)
  if (!loginName) throw new Error('保存失败：登录名必填')
  if (ELEVEN_DIGITS.test(loginName)) throw new Error('保存失败：登录名不能为 11 位纯数字（E03）')
  if (accountStore.some((item) => normalizeLoginName(item.loginName) === loginName)) {
    throw new Error('保存失败：登录名已存在（E01）')
  }
  const mobile = payload.mobile.trim()
  if (!MOBILE_PATTERN.test(mobile)) throw new Error('保存失败：手机号格式不正确（E12）')
  if (accountStore.some((item) => item.mobile === mobile)) throw new Error('保存失败：手机号已存在（E02）')

  const item: PlatformAccount = {
    id: `A${Date.now().toString().slice(-6)}`,
    loginName,
    mobile,
    displayName: payload.displayName.trim(),
    email: payload.email?.trim() ?? '',
    passwordMask: '••••••••',
    roleIds: [],
    status: 'enabled',
    mustChangePassword: true,
    tenantMemberships: [],
    createdBy: CURRENT_ACCOUNT_NAME,
    createdAt: NOW,
    updatedBy: CURRENT_ACCOUNT_NAME,
    updatedAt: NOW,
  }
  accountStore = [item, ...accountStore]
  return request(item)
}

/**
 * 成员管理 · 编辑账号级字段（§5.3）：姓名 / 手机号 / 邮箱可改，登录名不可改。
 * 手机号须格式正确且全局唯一（改名后账号表与成员投影同步，平台后台「平台账号」可见）。
 */
export async function updateAccountBasic(
  id: string,
  payload: { displayName: string; mobile: string; email?: string },
): Promise<PlatformAccount> {
  const target = accountStore.find((item) => item.id === id)
  if (!target) throw new Error('保存失败：账号不存在或已被删除')
  const name = payload.displayName.trim()
  if (!name) throw new Error('保存失败：姓名必填')
  if (name.length > 50) throw new Error('保存失败：姓名最长 50 字符')
  const mobile = payload.mobile.trim()
  if (!MOBILE_PATTERN.test(mobile)) throw new Error('保存失败：手机号格式不正确（E12）')
  if (accountStore.some((item) => item.id !== id && item.mobile === mobile)) {
    throw new Error('保存失败：手机号已存在（E02）')
  }

  target.displayName = name
  target.mobile = mobile
  target.email = payload.email?.trim() ?? ''
  target.updatedBy = CURRENT_ACCOUNT_NAME
  target.updatedAt = NOW
  return request(target)
}

/** 账号侧租户身份登记（新建 / 关联成员时同步，供平台账号「所属组织」展示） */
export function attachTenantMembership(accountId: string, tenantId: string, tenantName: string, primary = false): void {
  const account = accountStore.find((item) => item.id === accountId)
  if (!account) return
  if (account.tenantMemberships.some((m) => m.tenantId === tenantId && m.status === 'active')) return
  account.tenantMemberships = [
    ...account.tenantMemberships,
    { id: `M${Date.now().toString().slice(-6)}`, tenantId, tenantName, primary, status: 'active' as const },
  ]
}

/** 账号侧租户身份置失效（成员移出 / 主动退出时同步） */
export function detachTenantMembership(accountId: string, tenantId: string): void {
  const account = accountStore.find((item) => item.id === accountId)
  if (!account) return
  account.tenantMemberships = account.tenantMemberships.map((m) =>
    m.tenantId === tenantId ? { ...m, status: 'removed' as const } : m,
  )
}

export { countEnabledSuperAdmins, normalizeLoginName }
