import type {
  LibraryBizType,
  LibraryFileCategory,
  LibraryFileItem,
  LibraryFileLogItem,
  LibraryFileReference,
  LibraryFileStatus,
  LibraryFileVersion,
  LibraryReferenceMode,
  LibraryUploadPayload,
} from '@/types'

/**
 * 企业文件库（租户级）Mock 服务
 *
 * 口径（对齐《文件库字段清单》V0.1）：
 * - 一条记录 = 一个文件；替换后旧文件转入「文件记录」，只读可查；
 * - 引用默认锁版本，业务侧只存引用关系，不复制文件；
 * - 被有效引用的文件不可删除，只能停用；
 * - 不做行级数据权限（功能级权限），归属部门仅作展示与统计。
 * 原型数据在内存态，刷新回到种子值（与其余模块一致）。
 */

let idSeed = 0
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${idSeed++}`

const pad = (n: number) => String(n).padStart(2, '0')

/** 当前时间 `YYYY-MM-DD HH:mm` */
function nowStamp(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 扩展名小写、不含点 */
export function extOf(fileName: string): string {
  const lower = (fileName || '').toLowerCase()
  return lower.includes('.') ? lower.split('.').pop() ?? '' : ''
}

/** 生成占位图片（演示用）：种子图片类文件可真正预览 */
function demoImage(label: string, bg: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="460"><rect width="100%" height="100%" fill="${bg}"/><rect x="24" y="24" width="672" height="412" fill="none" stroke="#ffffff" stroke-opacity="0.45" stroke-width="2" stroke-dasharray="10 8"/><text x="50%" y="48%" font-family="-apple-system,Segoe UI,Microsoft YaHei,sans-serif" font-size="30" fill="#ffffff" text-anchor="middle">${label}</text><text x="50%" y="58%" font-family="-apple-system,Segoe UI,Microsoft YaHei,sans-serif" font-size="16" fill="#ffffff" fill-opacity="0.85" text-anchor="middle">原型演示占位图 · 非真实文件内容</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function version(
  versionNo: number,
  fileName: string,
  size: number,
  uploadedBy: string,
  uploadedAt: string,
  changeNote = '',
  url?: string,
): LibraryFileVersion {
  return {
    id: `FV-${versionNo}-${fileName.slice(0, 6)}-${idSeed++}`,
    versionNo,
    fileName,
    ext: extOf(fileName),
    size,
    uploadedBy,
    uploadedAt,
    changeNote,
    url,
  }
}

function reference(
  bizType: LibraryBizType,
  bizNo: string,
  bizField: string,
  versionNo: number,
  refBy: string,
  refAt: string,
  mode: LibraryReferenceMode = 'lock',
  active = true,
): LibraryFileReference {
  return { id: uid('FR'), bizType, bizNo, bizField, versionNo, mode, refBy, refAt, active }
}

/* ============================ 种子数据 ============================ */

const SEED: LibraryFileItem[] = [
  {
    id: 'LF-001',
    code: 'EF-000001',
    name: '竹砧板含水率检测报告',
    category: 'detect_report',
    description: '用于台账与核算实测含碳率佐证，第三方检测机构出具。',
    status: 'normal',
    dept: '质量管理部',
    currentVersion: 2,
    versions: [
      version(1, '竹砧板含水率检测报告_初版.pdf', 1_486_320, '苏岐', '2026-09-12 10:24', '首次上传'),
      version(2, '竹砧板含水率检测报告_盖章版.pdf', 1_502_118, '苏岐', '2026-09-18 15:02', '补充检测机构盖章页'),
    ],
    references: [
      reference('carbon_detection', 'JC-20260912-001', '报告文件', 2, '苏岐', '2026-09-18 15:10'),
      reference('energy_ledger', '2026-09 干燥车间电耗', '数据凭证', 2, '王梅', '2026-09-20 09:31'),
    ],
    createdBy: '苏岐',
    createdAt: '2026-09-12 10:24',
    updatedBy: '苏岐',
    updatedAt: '2026-09-18 15:02',
    lastUsedAt: '2026-10-12 14:20',
  },
  {
    id: 'LF-002',
    code: 'EF-000002',
    name: '2026Q1 原木采购发票',
    category: 'purchase_invoice',
    description: '供应商开票凭证，用于原辅料活动数据核对。',
    status: 'normal',
    dept: '采购部',
    currentVersion: 1,
    versions: [version(1, '2026Q1_原木采购发票_南平林业.pdf', 842_331, '王梅', '2026-10-08 09:12')],
    references: [],
    createdBy: '王梅',
    createdAt: '2026-10-08 09:12',
    updatedBy: '王梅',
    updatedAt: '2026-10-08 09:12',
  },
  {
    id: 'LF-003',
    code: 'EF-000003',
    name: '2026-09 原料运输磅单',
    category: 'transport_doc',
    description: '承运方过磅单，运输台账距离与载重佐证。',
    status: 'normal',
    dept: '物流部',
    currentVersion: 1,
    versions: [version(1, '2026-09_原料运输磅单_闽H36288.pdf', 612_004, '陈江河', '2026-10-09 11:40')],
    references: [],
    createdBy: '陈江河',
    createdAt: '2026-10-09 11:40',
    updatedBy: '陈江河',
    updatedAt: '2026-10-09 11:40',
  },
  {
    id: 'LF-004',
    code: 'EF-000004',
    name: '干燥车间 2026-08 电费结算单',
    category: 'other',
    description: '供电局结算单扫描件，含峰谷电量明细。',
    status: 'normal',
    dept: '生产管理部',
    currentVersion: 2,
    versions: [
      version(1, '2026-08_电费结算单.pdf', 388_220, '苏岐', '2026-09-05 16:18', '首次上传'),
      version(2, '2026-08_电费结算单_补峰谷明细.pdf', 402_771, '苏岐', '2026-09-09 10:05', '补充峰谷电量分项'),
    ],
    references: [reference('energy_ledger', '2026-08 干燥车间电耗', '数据凭证', 2, '苏岐', '2026-09-09 10:20')],
    createdBy: '苏岐',
    createdAt: '2026-09-05 16:18',
    updatedBy: '苏岐',
    updatedAt: '2026-09-09 10:05',
    lastUsedAt: '2026-10-10 09:02',
  },
  {
    id: 'LF-005',
    code: 'EF-000005',
    name: '胶粘剂供应商碳足迹声明',
    category: 'qualification',
    description: '供应商提供的产品碳足迹声明书，用于辅料排放因子取值佐证。',
    status: 'normal',
    dept: '采购部',
    currentVersion: 1,
    versions: [version(1, '胶粘剂碳足迹声明_2026.pdf', 1_204_882, '王梅', '2026-10-11 14:36')],
    references: [reference('pcf_project', 'ZB-13002 整竹砧板', '供应商依据', 1, '王梅', '2026-10-12 08:45')],
    createdBy: '王梅',
    createdAt: '2026-10-11 14:36',
    updatedBy: '王梅',
    updatedAt: '2026-10-11 14:36',
    lastUsedAt: '2026-10-12 08:45',
  },
  {
    id: 'LF-006',
    code: 'EF-000006',
    name: '委托检测服务合同（2026年度）',
    category: 'contract',
    description: '与检测机构签订的年度委托检测合同。',
    status: 'normal',
    dept: '质量管理部',
    currentVersion: 1,
    versions: [version(1, '委托检测服务合同_2026年度.pdf', 2_684_115, '苏岐', '2026-10-14 09:50')],
    references: [],
    createdBy: '苏岐',
    createdAt: '2026-10-14 09:50',
    updatedBy: '苏岐',
    updatedAt: '2026-10-14 09:50',
  },
  {
    id: 'LF-007',
    code: 'EF-000007',
    name: '营业执照（副本）',
    category: 'qualification',
    description: '企业主体资格证明，报告编制与核查引用。',
    status: 'normal',
    dept: '综合管理部',
    currentVersion: 1,
    versions: [
      version(
        1,
        '营业执照_副本.jpg',
        386_442,
        '周敏',
        '2026-10-15 08:30',
        '首次上传',
        demoImage('营业执照（副本）', '#3a6ea5'),
      ),
    ],
    references: [reference('report', '2026年度产品碳足迹报告', '资质附件', 1, '周敏', '2026-10-16 11:12')],
    createdBy: '周敏',
    createdAt: '2026-10-15 08:30',
    updatedBy: '周敏',
    updatedAt: '2026-10-15 08:30',
    lastUsedAt: '2026-10-16 11:12',
  },
  {
    id: 'LF-008',
    code: 'EF-000008',
    name: '竹砧板含碳量检测报告（复检）',
    category: 'detect_report',
    description: '复检版本，替代初检结论。',
    status: 'normal',
    dept: '质量管理部',
    currentVersion: 3,
    versions: [
      version(1, '含碳量复检报告_V1.pdf', 1_118_220, '苏岐', '2026-09-28 13:12', '首次上传'),
      version(2, '含碳量复检报告_V2.pdf', 1_132_905, '苏岐', '2026-10-06 09:40', '更正检测批次号'),
      version(3, '含碳量复检报告_V3_终版.pdf', 1_140_332, '苏岐', '2026-10-13 17:22', '补充检测方法说明'),
    ],
    references: [reference('carbon_detection', 'JC-20260928-004', '报告文件', 2, '苏岐', '2026-10-06 10:02')],
    createdBy: '苏岐',
    createdAt: '2026-09-28 13:12',
    updatedBy: '苏岐',
    updatedAt: '2026-10-13 17:22',
    lastUsedAt: '2026-10-13 17:30',
  },
  {
    id: 'LF-009',
    code: 'EF-000009',
    name: '干燥车间现场照片（2026-07）',
    category: 'other',
    description: '现场核查留档，已由新一期照片替代。',
    status: 'disabled',
    dept: '生产管理部',
    currentVersion: 1,
    versions: [
      version(
        1,
        '干燥车间现场_202607.jpg',
        524_118,
        '苏岐',
        '2026-07-22 10:08',
        '',
        demoImage('干燥车间现场（2026-07）', '#6b7f4a'),
      ),
    ],
    references: [reference('pcf_project', 'ZB-13002 整竹砧板', '现场佐证', 1, '苏岐', '2026-07-25 15:40')],
    createdBy: '苏岐',
    createdAt: '2026-07-22 10:08',
    updatedBy: '苏岐',
    updatedAt: '2026-08-02 09:15',
  },
  {
    id: 'LF-010',
    code: 'EF-000010',
    name: '2026-10 蒸汽采购结算单',
    category: 'purchase_invoice',
    description: '热力公司蒸汽结算凭证。',
    status: 'normal',
    dept: '生产管理部',
    currentVersion: 1,
    versions: [version(1, '2026-10_蒸汽结算单.pdf', 296_540, '苏岐', '2026-10-26 16:44')],
    references: [],
    createdBy: '苏岐',
    createdAt: '2026-10-26 16:44',
    updatedBy: '苏岐',
    updatedAt: '2026-10-26 16:44',
  },
]

let files: LibraryFileItem[] = SEED.map((item) => ({
  ...item,
  versions: item.versions.map((v) => ({ ...v })),
  references: item.references.map((r) => ({ ...r })),
}))

let logs: LibraryFileLogItem[] = SEED.flatMap((item) => [
  {
    id: uid('FL'),
    fileId: item.id,
    action: '上传文件',
    operator: item.createdBy,
    at: item.createdAt,
    detail: `生成 V1 · ${item.versions[0]?.fileName ?? ''}`,
  },
  ...(item.currentVersion > 1
    ? [
        {
          id: uid('FL'),
          fileId: item.id,
          action: '上传新版本',
          operator: item.updatedBy,
          at: item.updatedAt,
          detail: `版本号升至 V${item.currentVersion}`,
        },
      ]
    : []),
])

let codeCursor = SEED.length + 1

/** 生成文件编码：EF + 6 位流水，租户内唯一（D01） */
function nextCode(): string {
  const code = `EF-${String(codeCursor).padStart(6, '0')}`
  codeCursor += 1
  return code
}

function writeLog(fileId: string, action: string, operator: string, detail: string) {
  logs = [
    { id: uid('FL'), fileId, action, operator, at: nowStamp(), detail },
    ...logs,
  ]
}

/* ============================ 查询 ============================ */

/** 全部文件（按更新时间倒序，R-006 口径：默认排序） */
export function fetchLibraryFiles(): Promise<LibraryFileItem[]> {
  const data = [...files].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
  return Promise.resolve(data)
}

/** 单个文件 */
export function fetchLibraryFile(id: string): Promise<LibraryFileItem> {
  const item = files.find((f) => f.id === id)
  if (!item) return Promise.reject(new Error('文件不存在或已被删除'))
  return Promise.resolve(item)
}

/** 文件操作日志（倒序） */
export function fetchLibraryFileLogs(fileId: string): Promise<LibraryFileLogItem[]> {
  return Promise.resolve(logs.filter((log) => log.fileId === fileId))
}

/* ============================ 变更 ============================ */

/** 上传新文件：单文件生成一条记录（V1） */
export function uploadLibraryFile(payload: LibraryUploadPayload, operator = '当前用户'): Promise<LibraryFileItem> {
  const stamp = nowStamp()
  const baseName = payload.version.fileName.replace(/\.[^.]+$/, '')
  const name = (payload.name || baseName || '未命名文件').slice(0, 100)
  const item: LibraryFileItem = {
    id: uid('LF'),
    code: nextCode(),
    name,
    category: payload.category,
    description: payload.description ?? '',
    status: 'normal',
    dept: '生产管理部',
    currentVersion: 1,
    versions: [
      {
        id: uid('FV'),
        versionNo: 1,
        fileName: payload.version.fileName,
        ext: payload.version.ext,
        size: payload.version.size,
        uploadedBy: operator,
        uploadedAt: stamp,
        changeNote: payload.version.changeNote ?? '',
        url: payload.version.url,
      },
    ],
    references: [],
    createdBy: operator,
    createdAt: stamp,
    updatedBy: operator,
    updatedAt: stamp,
  }
  files = [item, ...files]
  writeLog(item.id, '上传文件', operator, `生成 V1 · ${payload.version.fileName}`)
  return Promise.resolve(item)
}

/**
 * 替换当前文件：新文件成为当前文件，旧文件转入「文件记录」保留可查。
 * 界面不出现「升版 / V2」等字样，对用户就是「换掉这份文件」。
 */
export function replaceLibraryFile(
  fileId: string,
  payload: { fileName: string; ext: string; size: number; url?: string },
  operator = '当前用户',
): Promise<LibraryFileItem> {
  const item = files.find((f) => f.id === fileId)
  if (!item) return Promise.reject(new Error('文件不存在或已被删除'))
  const versionNo = item.currentVersion + 1
  const stamp = nowStamp()
  const oldName = item.versions.find((v) => v.versionNo === item.currentVersion)?.fileName ?? '原文件'
  item.versions = [
    ...item.versions,
    {
      id: uid('FV'),
      versionNo,
      fileName: payload.fileName,
      ext: payload.ext,
      size: payload.size,
      uploadedBy: operator,
      uploadedAt: stamp,
      changeNote: '替换文件',
      url: payload.url,
    },
  ]
  item.currentVersion = versionNo
  /** 替换即生效：已引用该文件的业务自动指向新文件，避免「换了文件业务里还是旧的」 */
  const syncedRefs = item.references.filter((ref) => ref.active).length
  item.references = item.references.map((ref) => (ref.active ? { ...ref, versionNo } : ref))
  item.updatedBy = operator
  item.updatedAt = stamp
  files = files.map((f) => (f.id === fileId ? item : f))
  writeLog(
    fileId,
    '替换文件',
    operator,
    `由「${oldName}」替换为「${payload.fileName}」${syncedRefs > 0 ? `，已同步 ${syncedRefs} 处引用` : ''}`,
  )
  return Promise.resolve(item)
}

/** 编辑元数据：不产生新版本（R-005） */
export function updateLibraryFileMeta(
  fileId: string,
  patch: Partial<Pick<LibraryFileItem, 'name' | 'category' | 'description'>>,
  operator = '当前用户',
): Promise<LibraryFileItem> {
  const item = files.find((f) => f.id === fileId)
  if (!item) return Promise.reject(new Error('文件不存在或已被删除'))
  const stamp = nowStamp()
  const next: LibraryFileItem = {
    ...item,
    ...patch,
    updatedBy: operator,
    updatedAt: stamp,
  }
  files = files.map((f) => (f.id === fileId ? next : f))
  writeLog(fileId, '编辑信息', operator, '修改文件元数据（版本号不变）')
  return Promise.resolve(next)
}

/** 停用 / 启用（不产生新版本） */
export function updateLibraryFileStatus(
  fileId: string,
  status: LibraryFileStatus,
  operator = '当前用户',
): Promise<LibraryFileItem> {
  const item = files.find((f) => f.id === fileId)
  if (!item) return Promise.reject(new Error('文件不存在或已被删除'))
  item.status = status
  item.updatedBy = operator
  item.updatedAt = nowStamp()
  files = files.map((f) => (f.id === fileId ? item : f))
  writeLog(fileId, status === 'disabled' ? '停用文件' : '启用文件', operator, status === 'disabled' ? '停用后不可被新业务引用' : '恢复可用')
  return Promise.resolve(item)
}

/** 删除文件：仅未引用可删，整条含全部版本（D08 / D12） */
export function deleteLibraryFile(fileId: string, operator = '当前用户'): Promise<void> {
  const item = files.find((f) => f.id === fileId)
  if (!item) return Promise.reject(new Error('文件不存在或已被删除'))
  const activeRefs = item.references.filter((ref) => ref.active).length
  if (activeRefs > 0) {
    return Promise.reject(new Error(`该文件被 ${activeRefs} 处业务引用，无法删除，可先停用`))
  }
  files = files.filter((f) => f.id !== fileId)
  logs = logs.filter((log) => log.fileId !== fileId)
  return Promise.resolve()
}

/**
 * 建立引用（文件选择器 / 业务对接演示用）：
 * 默认锁版本，写一条引用关系，引用次数实时计算（D09 / D10）。
 */
export function addLibraryFileReference(
  fileId: string,
  payload: { bizType: LibraryBizType; bizNo: string; bizField: string; mode?: LibraryReferenceMode },
  operator = '当前用户',
): Promise<LibraryFileItem> {
  const item = files.find((f) => f.id === fileId)
  if (!item) return Promise.reject(new Error('文件不存在或已被删除'))
  if (item.status === 'disabled') return Promise.reject(new Error('该文件已停用，不可被新业务引用'))
  const stamp = nowStamp()
  item.references = [
    ...item.references,
    {
      id: uid('FR'),
      bizType: payload.bizType,
      bizNo: payload.bizNo,
      bizField: payload.bizField,
      versionNo: item.currentVersion,
      mode: payload.mode ?? 'lock',
      refBy: operator,
      refAt: stamp,
      active: true,
    },
  ]
  item.lastUsedAt = stamp
  files = files.map((f) => (f.id === fileId ? item : f))
  writeLog(fileId, '新增引用', operator, `${payload.bizNo} · ${payload.bizField} · 锁定 V${item.currentVersion}`)
  return Promise.resolve(item)
}

/** 演示：上传进度为同步 Mock，无需额外实现 */
export function resetLibraryFiles(): void {
  files = SEED.map((item) => ({
    ...item,
    versions: item.versions.map((v) => ({ ...v })),
    references: item.references.map((r) => ({ ...r })),
  }))
  codeCursor = SEED.length + 1
}

/** 分类计数（左侧导航用） */
export function categoryCounts(list: LibraryFileItem[]): Record<LibraryFileCategory | 'all', number> {
  const counts: Record<string, number> = { all: list.length }
  list.forEach((item) => {
    counts[item.category] = (counts[item.category] ?? 0) + 1
  })
  return counts as Record<LibraryFileCategory | 'all', number>
}

/** 有效引用数（D09） */
export function activeRefCount(item: LibraryFileItem): number {
  return item.references.filter((ref) => ref.active).length
}

/** 引用关系的业务展示名（补全 field 便于扩展） */
export const LIBRARY_BIZ_LABEL: Record<LibraryBizType, string> = {
  carbon_detection: '含碳量检测库',
  energy_ledger: '加工能耗台账',
  transport_ledger: '运输台账',
  pcf_project: '碳足迹核算项目',
  report: '报告编制',
  product: '我的产品库',
  model: '我的模型',
}
