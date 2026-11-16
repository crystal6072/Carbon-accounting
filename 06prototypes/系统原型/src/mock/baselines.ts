/**
 * 行业基线（产品碳基线库）原型 Mock 数据源。
 * 字段口径以《行业基线字段清单》为唯一真相源；本文件为前端原型的内存实现，不接后端。
 *
 * 行业 / 产品分类 / 系统边界均引用对应基础库（行业库 / 产品分类树 / 系统边界字典），
 * 不在本文件内硬编码下拉项，保证下拉口径与各基础库一致、后台维护即时生效。
 */

/* ============================ 类型 ============================ */

export type DataSource = 'system' | 'org'
export type Boundary = 'gate' | 'grave'

export interface BaselineStage {
  stageCode: string
  stageName: string
  stageLevel: 1 | 2
  parentStageCode?: string
  stageEmission: number
  advancedValue?: number
  sampleSize?: number
  stageShare: number
}

export interface BaselineAttachment {
  name: string
}

export interface IndustryBaseline {
  id: string
  baselineCode: string
  baselineName: string
  dataSource: DataSource
  orgName?: string
  industryCode: string
  industryName: string
  industryPath: string
  productCategoryCodes: string[]
  productCategoryNames: string[]
  boundary: Boundary
  baseYear: number
  periodStart?: string
  periodEnd?: string
  unitValue: number
  unitCode: string
  gwpVersion: string
  sourceType: string
  issuer: string
  attachments: BaselineAttachment[]
  totalEmission: number
  totalDiffReason?: string
  remark?: string
  /** 被报告引用记录（只读快照，不受主数据变更影响） */
  references: string[]
  /** 分阶段基准值（一级必填 + 二级展示） */
  stages: BaselineStage[]
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
}

/** 新增 / 编辑提交体（不含系统写入字段） */
export interface BaselineDraft {
  baselineName: string
  industryCode: string
  industryName: string
  industryPath: string
  productCategoryCodes: string[]
  productCategoryNames: string[]
  boundary: Boundary
  baseYear: number
  periodStart?: string
  periodEnd?: string
  unitValue: number
  unitCode: string
  gwpVersion: string
  sourceType: string
  issuer: string
  totalEmission: number
  totalDiffReason?: string
  remark?: string
  stages: BaselineStage[]
}

/* ============================ 选项（引用基础库，本文件不再硬编码） ============================ */

export const SOURCE_TYPE_OPTIONS = [
  '行业统计',
  '文献研究',
  '第三方数据库',
  '企业实测汇总',
  '标准限值',
] as const

export const GWP_OPTIONS = [
  'IPCC AR6 GWP100',
  'IPCC AR5 GWP100',
  'IPCC AR4 GWP100',
] as const

export const UNIT_OPTIONS = ['m³', 'kg', 't', 'm²'] as const

/* ============================ 阶段库（按边界带出） ============================ */

interface StageTemplate {
  code: string
  name: string
  level: 1 | 2
  parent?: string
}

const STAGE_TEMPLATES: Record<Boundary, StageTemplate[]> = {
  gate: [
    { code: 'g1', name: '采伐阶段', level: 1 },
    { code: 'g2', name: '加工阶段', level: 1 },
  ],
  grave: [
    { code: 'g1', name: '采伐阶段', level: 1 },
    { code: 'g2', name: '加工阶段', level: 1 },
    { code: 'g3', name: '运输阶段', level: 1 },
    { code: 'g4', name: '使用阶段', level: 1 },
    { code: 'g5', name: '废弃与循环', level: 1 },
  ],
}

/** 按边界带出阶段（数值默认 0，占比 0）；一级阶段为必填项。字典未覆盖的边界回退到大门模板 */
export function buildStages(boundary: Boundary): BaselineStage[] {
  const templates = STAGE_TEMPLATES[boundary] ?? STAGE_TEMPLATES.gate
  return templates.map((t) => ({
    stageCode: t.code,
    stageName: t.name,
    stageLevel: t.level,
    parentStageCode: t.parent,
    stageEmission: 0,
    stageShare: 0,
  }))
}

/* ============================ 内存数据 ============================ */

function nowText(): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`
}

let seq = 100

function makeStagesWithValues(boundary: Boundary, values: Record<string, Partial<BaselineStage>>): BaselineStage[] {
  const stages = buildStages(boundary)
  return stages.map((s) => ({ ...s, ...(values[s.stageCode] ?? {}) }))
}

const seed: IndustryBaseline[] = [
  {
    id: 'IB-001',
    baselineCode: 'IB-2025-C2021-001',
    stages: [],
    baselineName: '2025 纤维板行业碳足迹基准·大门',
    dataSource: 'system',
    industryCode: 'C2021',
    industryName: 'C2021 纤维板制造',
    industryPath: '木材加工 / 人造板 / 纤维板制造',
    productCategoryCodes: ['DEMO-CAT-BAM'],
    productCategoryNames: ['竹制品'],
    boundary: 'gate',
    baseYear: 2025,
    periodStart: '2025-01-01',
    periodEnd: '2025-12-31',
    unitValue: 1,
    unitCode: 'm³',
    gwpVersion: 'IPCC AR6 GWP100',
    sourceType: '行业统计',
    issuer: '中国林产工业协会',
    attachments: [{ name: '纤维板行业碳足迹白皮书.pdf' }],
    totalEmission: 2.18,
    remark: '基于 2025 年行业统计与典型企业实测汇总',
    references: ['P26-0007', 'SA-0021', 'P26-0112', 'P26-0153', 'P26-0188', 'SA-0044', 'P26-0210'],
    createdBy: '平台运营',
    createdAt: '2026-10-25 09:00',
    updatedBy: '平台运营',
    updatedAt: '2026-10-25 09:30',
  },
  {
    id: 'IB-002',
    baselineCode: 'IB-2025-C2021-002',
    stages: [],
    baselineName: '2025 纤维板行业碳足迹基准·坟墓',
    dataSource: 'system',
    industryCode: 'C2021',
    industryName: 'C2021 纤维板制造',
    industryPath: '木材加工 / 人造板 / 纤维板制造',
    productCategoryCodes: ['DEMO-CAT-BAM'],
    productCategoryNames: ['竹制品'],
    boundary: 'grave',
    baseYear: 2025,
    unitValue: 1,
    unitCode: 'm³',
    gwpVersion: 'IPCC AR6 GWP100',
    sourceType: '行业统计',
    issuer: '中国林产工业协会',
    attachments: [],
    totalEmission: 2.53,
    references: ['P26-0033'],
    createdBy: '平台运营',
    createdAt: '2026-10-25 09:38',
    updatedBy: '平台运营',
    updatedAt: '2026-10-25 09:42',
  },
  {
    id: 'IB-003',
    baselineCode: 'IB-2025-C2021-003',
    stages: [],
    baselineName: '2025 纤维板(本集团实测)·大门',
    dataSource: 'org',
    orgName: '某竹木集团',
    industryCode: 'C2021',
    industryName: 'C2021 纤维板制造',
    industryPath: '木材加工 / 人造板 / 纤维板制造',
    productCategoryCodes: ['DEMO-CAT-BAM'],
    productCategoryNames: ['竹制品'],
    boundary: 'gate',
    baseYear: 2025,
    unitValue: 1,
    unitCode: 'm³',
    gwpVersion: 'IPCC AR6 GWP100',
    sourceType: '企业实测汇总',
    issuer: '某竹木集团',
    attachments: [],
    totalEmission: 2.05,
    references: [],
    createdBy: '租户管理员',
    createdAt: '2026-10-26 16:10',
    updatedBy: '租户管理员',
    updatedAt: '2026-10-26 16:20',
  },
  {
    id: 'IB-004',
    baselineCode: 'IB-2024-A1021-010',
    stages: [],
    baselineName: '2024 通用制造业碳足迹基准·大门',
    dataSource: 'system',
    industryCode: 'A1021',
    industryName: 'A1021 通用设备制造',
    industryPath: '设备制造 / 通用设备制造',
    productCategoryCodes: [],
    productCategoryNames: [],
    boundary: 'gate',
    baseYear: 2024,
    unitValue: 1,
    unitCode: 'kg',
    gwpVersion: 'IPCC AR5 GWP100',
    sourceType: '文献研究',
    issuer: '行业研究院',
    attachments: [],
    totalEmission: 3.4,
    references: [],
    createdBy: '平台运营',
    createdAt: '2026-09-12 13:50',
    updatedBy: '平台运营',
    updatedAt: '2026-09-12 14:10',
  },
  {
    id: 'IB-005',
    baselineCode: 'IB-2023-C2021-001',
    stages: [],
    baselineName: '2023 纤维板行业碳足迹基准·大门',
    dataSource: 'system',
    industryCode: 'C2021',
    industryName: 'C2021 纤维板制造',
    industryPath: '木材加工 / 人造板 / 纤维板制造',
    productCategoryCodes: ['DEMO-CAT-BAM'],
    productCategoryNames: ['竹制品'],
    boundary: 'gate',
    baseYear: 2023,
    unitValue: 1,
    unitCode: 'm³',
    gwpVersion: 'IPCC AR5 GWP100',
    sourceType: '行业统计',
    issuer: '中国林产工业协会',
    attachments: [],
    totalEmission: 2.31,
    references: [],
    createdBy: '平台运营',
    createdAt: '2026-10-20 10:55',
    updatedBy: '平台运营',
    updatedAt: '2026-10-20 11:05',
  },
]

/** 为 IB-001 预置阶段值（其余以空阶段呈现） */
seed[0].stages = makeStagesWithValues('gate', {
  'g1': { stageEmission: 0.83, advancedValue: 0.63, sampleSize: 30 },
  'g2': { stageEmission: 1.35, advancedValue: 1.02, sampleSize: 30 },
})
seed[1].stages = makeStagesWithValues('grave', {
  'g1': { stageEmission: 0.83, sampleSize: 30 },
  'g2': { stageEmission: 1.35, sampleSize: 30 },
  'g3': { stageEmission: 0.21, sampleSize: 30 },
  'g4': { stageEmission: 0.08, sampleSize: 30 },
  'g5': { stageEmission: 0.06, sampleSize: 30 },
})
seed[2].stages = buildStages('gate')
seed[3].stages = buildStages('gate')
seed[4].stages = buildStages('gate')

let store: IndustryBaseline[] = seed.map((item) => ({ ...item, stages: item.stages ? item.stages.map((s) => ({ ...s })) : buildStages(item.boundary) }))

const delay = (ms = 200) => new Promise<void>((resolve) => setTimeout(resolve, ms))
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

/* ============================ API ============================ */

export async function fetchBaselines(): Promise<IndustryBaseline[]> {
  await delay()
  return clone(store)
}

export async function fetchBaseline(id: string): Promise<IndustryBaseline> {
  await delay()
  const found = store.find((item) => item.id === id)
  if (!found) throw new Error('基线不存在或已被删除')
  return clone(found)
}

function nextCode(baseYear: number, industryCode: string): string {
  seq += 1
  return `IB-${baseYear}-${industryCode}-${String(seq).padStart(3, '0')}`
}

export async function createBaseline(draft: BaselineDraft): Promise<IndustryBaseline> {
  await delay()
  const now = nowText()
  const record: IndustryBaseline = {
    id: `IB-NEW-${seq}`,
    baselineCode: nextCode(draft.baseYear, draft.industryCode),
    baselineName: draft.baselineName,
    dataSource: 'system',
    industryCode: draft.industryCode,
    industryName: draft.industryName,
    industryPath: draft.industryPath,
    productCategoryCodes: draft.productCategoryCodes,
    productCategoryNames: draft.productCategoryNames,
    boundary: draft.boundary,
    baseYear: draft.baseYear,
    periodStart: draft.periodStart,
    periodEnd: draft.periodEnd,
    unitValue: draft.unitValue,
    unitCode: draft.unitCode,
    gwpVersion: draft.gwpVersion,
    sourceType: draft.sourceType,
    issuer: draft.issuer,
    attachments: [],
    totalEmission: draft.totalEmission,
    totalDiffReason: draft.totalDiffReason,
    remark: draft.remark,
    references: [],
    createdBy: '平台运营',
    createdAt: now,
    updatedBy: '平台运营',
    updatedAt: now,
    stages: draft.stages,
  }
  store = [record, ...store]
  return clone(record)
}

export async function updateBaseline(id: string, draft: BaselineDraft): Promise<IndustryBaseline> {
  await delay()
  const idx = store.findIndex((item) => item.id === id)
  if (idx < 0) throw new Error('基线不存在或已被删除')
  const prev = store[idx]
  const updated: IndustryBaseline = {
    ...prev,
    baselineName: draft.baselineName,
    industryCode: draft.industryCode,
    industryName: draft.industryName,
    industryPath: draft.industryPath,
    productCategoryCodes: draft.productCategoryCodes,
    productCategoryNames: draft.productCategoryNames,
    boundary: draft.boundary,
    baseYear: draft.baseYear,
    periodStart: draft.periodStart,
    periodEnd: draft.periodEnd,
    unitValue: draft.unitValue,
    unitCode: draft.unitCode,
    gwpVersion: draft.gwpVersion,
    sourceType: draft.sourceType,
    issuer: draft.issuer,
    totalEmission: draft.totalEmission,
    totalDiffReason: draft.totalDiffReason,
    remark: draft.remark,
    updatedBy: prev.updatedBy,
    updatedAt: nowText(),
    stages: draft.stages,
  }
  store[idx] = updated
  return clone(updated)
}

export async function deleteBaseline(id: string): Promise<void> {
  await delay()
  store = store.filter((item) => item.id !== id)
}

export async function copyBaseline(id: string): Promise<IndustryBaseline> {
  await delay()
  const found = store.find((item) => item.id === id)
  if (!found) throw new Error('基线不存在或已被删除')
  const now = nowText()
  const copied: IndustryBaseline = {
    ...clone(found),
    id: `IB-COPY-${seq}`,
    baselineCode: nextCode(found.baseYear, found.industryCode),
    references: [],
    createdBy: '平台运营',
    createdAt: now,
    updatedBy: '平台运营',
    updatedAt: now,
  }
  store = [copied, ...store]
  return clone(copied)
}
