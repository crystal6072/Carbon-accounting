import type { PcfCaliberKey } from '@/types'
import type {
  PedigreeScore,
  QualityAssessment,
  QualityAssessmentItem,
  QualityProjectOption,
  QualityResult,
  QualityStatus,
  QualitativeTexts,
  ScoreSource,
} from '@/types/quality'
import {
  PEDIGREE_KEYS,
  computeResult,
  defaultDims,
  dqrLevelOf,
  dqrOf,
  formatDateOnly,
  formatNow,
  uncertaintyOf,
} from '@/pages/report/qualityMeta'

/**
 * 数据质量评价 Mock（报告管理）。
 *
 * 口径说明（与《数据质量评价业务PRD》§6 对齐）：
 * - 创建评价时**复制**核算项目阶段数据项（引用即复制），与主链解耦；
 * - DQR = 四项（TiR/TeR/GeR/C）算术平均；整体 DQR 按贡献率加权（总贡献为 0 时退化为算术平均）；
 * - 不确定度 = 四项平方和开方（单项）→ 贡献率平方和传播（整体）；
 * - 等级映射见 qualityMeta.dqrLevelOf；谱系系数见 qualityMeta.UNCERTAINTY_BY_SCORE。
 *
 * 演示数据为**自包含快照**（不依赖核算主链 store），保证来源项目、数据清单与评价结果三者自洽。
 */

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/* ============ 来源核算项目快照（仅「已核算」项目可作为候选） ============ */

interface SourceItemSeed {
  dataItemId: string
  name: string
  itemType: QualityAssessmentItem['itemType']
  emissionType: QualityAssessmentItem['emissionType']
  direction: QualityAssessmentItem['direction']
  quantity: number | null
  unit: string
  stage: string
  stagePath: string
  factorName: string
  factorValue: number | null
  factorUnit: string
  factorSource: string
  hasVoucher: boolean
  dataSource: string
  emission: number
  contribution: number
}

interface SourceProjectSnapshot {
  id: string
  name: string
  code: string
  productName: string
  productSpec: string
  boundary: string
  functionalUnit: string
  statisticalPeriod: string
  baselineEmission: number
  baselineVersion: number
  baselineCalculatedAt: string
  hasGwpSplit: boolean
  items: SourceItemSeed[]
}

const boundaryText = (code: string) =>
  code === 'grave' ? '摇篮到坟墓' : code === 'gate_to_gate' ? '大门到大门' : '摇篮到大门'

const sourceProjects: SourceProjectSnapshot[] = [
  {
    id: 'PJ-Q1',
    name: '240mm 全竹碳化筷 · 摇篮到大门',
    code: 'PCF-20260923-004',
    productName: '240mm 全竹碳化筷',
    productSpec: '240mm·100 双/盒',
    boundary: 'gate',
    functionalUnit: '双',
    statisticalPeriod: '2026-01-01 ~ 2026-12-31',
    baselineEmission: 0.369,
    baselineVersion: 2,
    baselineCalculatedAt: '2026-10-12 16:11',
    hasGwpSplit: true,
    items: [
      {
        dataItemId: 'Q1-01',
        name: '原竹',
        itemType: 'natural',
        emissionType: null,
        direction: 'input',
        quantity: 1.846,
        unit: 'kg',
        stage: '原材料获取',
        stagePath: '原材料获取-原材料运输',
        factorName: '毛竹（竹秆）碳汇因子',
        factorValue: -1.83,
        factorUnit: 'kgCO₂e/kg',
        factorSource: '中国官方排放因子库 V1.0 数据库：毛竹固碳',
        hasVoucher: true,
        dataSource: 'measured',
        emission: 0.18,
        contribution: 48,
      },
      {
        dataItemId: 'Q1-02',
        name: '脲醛树脂胶',
        itemType: 'material',
        emissionType: null,
        direction: 'input',
        quantity: 0.216,
        unit: 'kg',
        stage: '原材料获取',
        stagePath: '原材料获取-原材料运输',
        factorName: '脲醛树脂胶',
        factorValue: 3.12,
        factorUnit: 'kgCO₂e/kg',
        factorSource: '中国官方排放因子库 V1.0 数据库：脲醛树脂胶',
        hasVoucher: true,
        dataSource: 'supplier',
        emission: 0.12,
        contribution: 33,
      },
      {
        dataItemId: 'Q1-03',
        name: '电力（外购）',
        itemType: 'energy',
        emissionType: null,
        direction: 'input',
        quantity: 12.5,
        unit: 'kWh',
        stage: '生产',
        stagePath: '生产',
        factorName: '福建省电网平均排放因子',
        factorValue: 0.581,
        factorUnit: 'kgCO₂e/kWh',
        factorSource: '中国官方排放因子库 V1.0 数据库：电力排放因子',
        hasVoucher: true,
        dataSource: 'measured',
        emission: 0.05,
        contribution: 14,
      },
      {
        dataItemId: 'Q1-04',
        name: '公路运输（原竹）',
        itemType: 'material',
        emissionType: null,
        direction: 'input',
        quantity: 260,
        unit: 'km',
        stage: '原材料获取',
        stagePath: '原材料获取-原材料运输',
        factorName: '公路货运（柴油，12t 以上）',
        factorValue: 0.104,
        factorUnit: 'kgCO₂e/(t·km)',
        factorSource: '中国官方排放因子库 V1.0 数据库：公路货运',
        hasVoucher: false,
        dataSource: 'statistics',
        emission: 0.02,
        contribution: 5,
      },
    ],
  },
  {
    id: 'PJ-Q2',
    name: '竹板坯 · 摇篮到大门',
    code: 'PCF-20260923-005',
    productName: '竹板坯',
    productSpec: '2440×1220×18mm',
    boundary: 'gate',
    functionalUnit: '张',
    statisticalPeriod: '2026-01-01 ~ 2026-12-31',
    baselineEmission: 2.124,
    baselineVersion: 1,
    baselineCalculatedAt: '2026-09-28 19:00',
    hasGwpSplit: false,
    items: [
      {
        dataItemId: 'Q2-01',
        name: '原竹',
        itemType: 'natural',
        emissionType: null,
        direction: 'input',
        quantity: 18.46,
        unit: 'kg',
        stage: '原材料获取',
        stagePath: '原材料获取',
        factorName: '毛竹（竹秆）碳汇因子',
        factorValue: -1.83,
        factorUnit: 'kgCO₂e/kg',
        factorSource: '中国官方排放因子库 V1.0 数据库：毛竹固碳',
        hasVoucher: true,
        dataSource: 'measured',
        emission: 1.2,
        contribution: 56,
      },
      {
        dataItemId: 'Q2-02',
        name: '脲醛树脂胶',
        itemType: 'material',
        emissionType: null,
        direction: 'input',
        quantity: 2.16,
        unit: 'kg',
        stage: '原材料获取',
        stagePath: '原材料获取',
        factorName: '脲醛树脂胶',
        factorValue: 3.12,
        factorUnit: 'kgCO₂e/kg',
        factorSource: '中国官方排放因子库 V1.0 数据库：脲醛树脂胶',
        hasVoucher: true,
        dataSource: 'supplier',
        emission: 0.6,
        contribution: 28,
      },
      {
        dataItemId: 'Q2-03',
        name: '电力（外购）',
        itemType: 'energy',
        emissionType: null,
        direction: 'input',
        quantity: 260,
        unit: 'kWh',
        stage: '生产',
        stagePath: '生产',
        factorName: '福建省电网平均排放因子',
        factorValue: 0.581,
        factorUnit: 'kgCO₂e/kWh',
        factorSource: '中国官方排放因子库 V1.0 数据库：电力排放因子',
        hasVoucher: true,
        dataSource: 'measured',
        emission: 0.32,
        contribution: 15,
      },
      {
        dataItemId: 'Q2-04',
        name: '竹粉（边角料）',
        itemType: 'byproduct',
        emissionType: null,
        direction: 'output',
        quantity: 1.2,
        unit: 'kg',
        stage: '生产',
        stagePath: '生产',
        factorName: '',
        factorValue: null,
        factorUnit: '',
        factorSource: '',
        hasVoucher: false,
        dataSource: '',
        emission: 0,
        contribution: 1,
      },
    ],
  },
  {
    id: 'PJ-Q3',
    name: '竹纤维餐盒 · 摇篮到坟墓',
    code: 'PCF-20260923-007',
    productName: '竹纤维模塑餐盒',
    productSpec: '750ml·50 只/箱',
    boundary: 'grave',
    functionalUnit: '只',
    statisticalPeriod: '2026-01-01 ~ 2026-12-31',
    baselineEmission: 0,
    baselineVersion: 1,
    baselineCalculatedAt: '2026-09-23 14:05',
    hasGwpSplit: false,
    items: [
      {
        dataItemId: 'Q3-01',
        name: '竹纤维浆',
        itemType: 'material',
        emissionType: null,
        direction: 'input',
        quantity: 8.4,
        unit: 'kg',
        stage: '原材料获取',
        stagePath: '原材料获取',
        factorName: '',
        factorValue: null,
        factorUnit: '',
        factorSource: '',
        hasVoucher: false,
        dataSource: '',
        emission: 0,
        contribution: 0,
      },
      {
        dataItemId: 'Q3-02',
        name: '电力（外购）',
        itemType: 'energy',
        emissionType: null,
        direction: 'input',
        quantity: 42,
        unit: 'kWh',
        stage: '生产',
        stagePath: '生产',
        factorName: '福建省电网平均排放因子',
        factorValue: 0.581,
        factorUnit: 'kgCO₂e/kWh',
        factorSource: '中国官方排放因子库 V1.0 数据库：电力排放因子',
        hasVoucher: true,
        dataSource: 'measured',
        emission: 0,
        contribution: 0,
      },
    ],
  },
]

/* ============ 评分 / 结果派生 ============ */

/**
 * 构造谱系评分。`values` 顺序须与 `PEDIGREE_DIMS`（qualityMeta）一致：
 * [时间代表性 TiR, 技术代表性 TeR, 地理代表性 GeR, 完整性 C]
 */
function makeScore(values: number[], source: ScoreSource): PedigreeScore {
  const dims = defaultDims()
  PEDIGREE_KEYS.forEach((key, index) => {
    dims[key] = values[index] ?? 3
  })
  return { ...dims, scoreSource: source }
}

function applyScoreToItem(item: QualityAssessmentItem, score: PedigreeScore | null): void {
  if (!score) {
    item.score = null
    item.dqr = null
    item.level = null
    item.uncertainty = null
    return
  }
  item.score = { ...score }
  item.dqr = dqrOf(score)
  item.level = dqrLevelOf(item.dqr)
  item.uncertainty = uncertaintyOf(score)
}

/** 由评价数据项重算整体结果（业务 PRD §6） */
function recompute(assessment: QualityAssessment): void {
  assessment.items.forEach((item) => applyScoreToItem(item, item.score))
  const result: QualityResult = computeResult(assessment.items)
  assessment.result = result
  assessment.overallDqr = result.overallDqr
  assessment.overallLevel = result.overallLevel
  if (result.generatedAt) assessment.resultUpdatedAt = result.generatedAt
}

/** 重新计算评价状态（业务 PRD R-095 / R-096；stale 保持直到更新基准） */
function refreshStatus(assessment: QualityAssessment): void {
  if (assessment.status === 'stale') return
  const allScored = assessment.items.every((item) => item.score)
  assessment.status = assessment.qualitative.confirmed && allScored ? 'completed' : 'unfinished'
}

/** 批量评估默认口径（竞品四项 TiR/TeR/GeR/C 口径） */
function defaultScore(item: QualityAssessmentItem): PedigreeScore {
  const hasBackgroundFactor = Boolean(item.factorSource)
  const isPrimary = item.dataSource === 'measured' || item.dataSource === 'supplier'
  return makeScore(
    [
      isPrimary ? 1 : 3, // a 时间代表性：一次数据默认与核算期一致，次级数据默认 3 分
      hasBackgroundFactor ? 2 : 3, // b 技术代表性
      hasBackgroundFactor ? 1 : 3, // c 地理代表性
      item.hasVoucher ? 2 : 3, // d 完整性
    ],
    'batch',
  )
}

function makeAssessmentNo(seq: number): string {
  return `PCF-DQ-${formatDateOnly(Date.now())}${String(seq).padStart(3, '0')}`
}

/** 定性覆盖初稿（字段清单 §3 / 业务 PRD R-086），共 9 个定性维度 */
function buildQualitativeInitial(source: SourceProjectSnapshot): QualityAssessment['qualitative'] {
  const regions = Array.from(new Set(source.items.map((item) => item.factorSource).filter(Boolean))).join('、')
  return {
    temporalCoverage: `初级数据来自 ${source.productName} 企业的 ${source.statisticalPeriod} 生产数据。次级数据采用 ${regions || '背景数据库'}。`,
    geographicalCoverage: `特定数据采集自 国内制造商。次级数据的地理位置包括 ${regions || '全球'}。`,
    technologicalCoverage: '采集数据均代表当前技术水平。',
    completeness: '生命周期范围内所有单元过程均已涵盖，排除的数据低于5%。',
    representativeness: '参见上述时间、地理及技术覆盖范围。',
    consistency: '研究方法在分析的各个部分均统一应用。',
    reproducibility: '基于相同方法可复现研究结果。',
    dataSource: '原材料消耗、运输及能源数据均来自特定数据。',
    informationUncertainty: '所有数据及假设均通过提供的证据进行确认。',
    confirmed: false,
    confirmedBy: null,
    confirmedAt: null,
  }
}

function buildItems(source: SourceProjectSnapshot): QualityAssessmentItem[] {
  return source.items.map((seed) => ({
    dataItemId: seed.dataItemId,
    name: seed.name,
    itemType: seed.itemType,
    emissionType: seed.emissionType,
    direction: seed.direction,
    quantity: seed.quantity,
    unit: seed.unit,
    stage: seed.stage,
    stagePath: seed.stagePath,
    factorName: seed.factorName,
    factorValue: seed.factorValue,
    factorUnit: seed.factorUnit,
    factorSource: seed.factorSource,
    hasVoucher: seed.hasVoucher,
    dataSource: seed.dataSource,
    emission: seed.emission,
    contribution: seed.contribution,
    score: null,
    dqr: null,
    level: null,
    uncertainty: null,
  }))
}

/* ============ 演示数据（4 条，覆盖 3 状态 + 总排放为 0 边界） ============ */

function buildSeedAssessments(): QualityAssessment[] {
  const seeds: Array<{
    source: SourceProjectSnapshot
    scores: Record<string, PedigreeScore>
    statusOverride?: QualityStatus
    resultUpdatedAt: string
  }> = [
    {
      // 已完成：全部评分，整体「良」
      source: sourceProjects[0],
      resultUpdatedAt: '2026-10-12 16:11:09',
      // 顺序：[时间代表性 TiR, 技术代表性 TeR, 地理代表性 GeR, 完整性 C]
      scores: {
        'Q1-01': makeScore([1, 1, 1, 1], 'manual'),
        'Q1-02': makeScore([2, 3, 2, 2], 'manual'),
        'Q1-03': makeScore([1, 1, 1, 1], 'manual'),
        'Q1-04': makeScore([2, 2, 2, 3], 'batch'),
      },
    },
    {
      // 未完成：竹粉未评分（贡献 1%，但演示前置阻断）
      source: sourceProjects[1],
      resultUpdatedAt: '2026-09-28 19:00:05',
      scores: {
        'Q2-01': makeScore([1, 1, 1, 1], 'manual'),
        'Q2-02': makeScore([2, 3, 2, 2], 'manual'),
        'Q2-03': makeScore([1, 1, 1, 1], 'manual'),
      },
    },
    {
      // 待更新：来源项目已产出新版本（演示 Alert + 更新基准）
      source: sourceProjects[0],
      statusOverride: 'stale',
      resultUpdatedAt: '2026-10-08 09:30:22',
      scores: {
        'Q1-01': makeScore([1, 1, 1, 1], 'manual'),
        'Q1-02': makeScore([2, 3, 2, 2], 'manual'),
        'Q1-03': makeScore([1, 1, 1, 1], 'manual'),
        'Q1-04': makeScore([2, 2, 2, 3], 'batch'),
      },
    },
    {
      // 已完成：总排放为 0，整体 DQR 退化为算术平均（演示兜底）
      source: sourceProjects[2],
      resultUpdatedAt: '2026-09-23 14:05:47',
      scores: {
        'Q3-01': makeScore([3, 3, 3, 3], 'manual'),
        'Q3-02': makeScore([1, 1, 1, 1], 'manual'),
      },
    },
  ]

  return seeds.map((seed, index) => {
    const items = buildItems(seed.source)
    items.forEach((item) => {
      const s = seed.scores[item.dataItemId]
      if (s) applyScoreToItem(item, s)
    })
    const qualitative = buildQualitativeInitial(seed.source)
    qualitative.confirmed = true
    qualitative.confirmedBy = '张核算'
    qualitative.confirmedAt = seed.resultUpdatedAt

    const assessment: QualityAssessment = {
      id: `DQ0${index + 1}`,
      assessmentNo: makeAssessmentNo(index + 1),
      sourceProjectId: seed.source.id,
      sourceProjectName: seed.source.name,
      sourceProjectNo: seed.source.code,
      sourceDeleted: false,
      productName: seed.source.productName,
      productSpec: seed.source.productSpec,
      systemBoundary: boundaryText(seed.source.boundary),
      functionalUnit: seed.source.functionalUnit,
      statisticalPeriod: seed.source.statisticalPeriod,
      lciaMethod: 'IPCC 2021',
      hasGwpSplit: seed.source.hasGwpSplit,
      baselineVersion: seed.source.baselineVersion,
      baselineEmission: seed.source.baselineEmission,
      baselineCalculatedAt: seed.source.baselineCalculatedAt,
      caliber: 'total',
      status: 'unfinished',
      itemCount: items.length,
      overallDqr: null,
      overallLevel: null,
      overallUncertainty: null,
      resultUpdatedAt: seed.resultUpdatedAt,
      qualitative,
      items,
      result: computeResult(items),
      createdAt: seed.resultUpdatedAt,
      createdBy: '张核算',
    }
    refreshStatus(assessment)
    if (seed.statusOverride) assessment.status = seed.statusOverride
    return assessment
  })
}

let qualityStore: QualityAssessment[] = buildSeedAssessments()
let assessmentSeq = qualityStore.length + 1

/* ============ 服务 ============ */

/** 列表 + 查询（业务 PRD §3） */
export function fetchQualityAssessments(query?: {
  keywordProject?: string
  keywordProduct?: string
  status?: QualityStatus | ''
}): Promise<QualityAssessment[]> {
  const kwProject = (query?.keywordProject ?? '').trim().toLowerCase()
  const kwProduct = (query?.keywordProduct ?? '').trim().toLowerCase()
  const status = query?.status ?? ''
  const list = qualityStore
    .filter((item) => {
      if (kwProject && !item.sourceProjectName.toLowerCase().includes(kwProject)) return false
      if (kwProduct && !item.productName.toLowerCase().includes(kwProduct)) return false
      if (status && item.status !== status) return false
      return true
    })
    .slice()
    .sort((a, b) => b.resultUpdatedAt.localeCompare(a.resultUpdatedAt))
  return delay(160).then(() => list.map((item) => cloneAssessment(item)))
}

/** 详情 */
export function fetchQualityDetail(id: string): Promise<QualityAssessment> {
  const target = qualityStore.find((item) => item.id === id)
  if (!target) return delay(120).then(() => Promise.reject(new Error('数据质量评价不存在或已被删除')))
  return delay(160).then(() => cloneAssessment(target))
}

/** 新增弹窗候选（仅「已核算」项目） */
export function fetchCalculatedProjects(): Promise<QualityProjectOption[]> {
  const list = sourceProjects.map((item) => ({
    id: item.id,
    name: item.name,
    code: item.code,
    productName: item.productName,
    productSpec: item.productSpec,
    boundary: boundaryText(item.boundary),
    functionalUnit: item.functionalUnit,
    statisticalPeriod: item.statisticalPeriod,
    baselineEmission: item.baselineEmission,
    baselineVersion: item.baselineVersion,
    baselineCalculatedAt: item.baselineCalculatedAt,
    hasGwpSplit: item.hasGwpSplit,
    items: buildItems(item),
  }))
  return delay(140).then(() => list)
}

/** 创建评价：复制数据清单 + 生成定性初稿 + 锁定基准版本（业务 PRD R-085） */
export async function createQualityAssessment(projectId: string): Promise<QualityAssessment> {
  const source = sourceProjects.find((item) => item.id === projectId)
  if (!source) throw new Error('核算项目不存在或未完成核算')
  await delay(320)

  const items = buildItems(source)
  const qualitative = buildQualitativeInitial(source)
  const assessment: QualityAssessment = {
    id: `DQ${String(assessmentSeq).padStart(2, '0')}`,
    assessmentNo: makeAssessmentNo(assessmentSeq),
    sourceProjectId: source.id,
    sourceProjectName: source.name,
    sourceProjectNo: source.code,
    sourceDeleted: false,
    productName: source.productName,
    productSpec: source.productSpec,
    systemBoundary: boundaryText(source.boundary),
    functionalUnit: source.functionalUnit,
    statisticalPeriod: source.statisticalPeriod,
    lciaMethod: 'IPCC 2021',
    hasGwpSplit: source.hasGwpSplit,
    baselineVersion: source.baselineVersion,
    baselineEmission: source.baselineEmission,
    baselineCalculatedAt: source.baselineCalculatedAt,
    caliber: 'total',
    status: 'unfinished',
    itemCount: items.length,
    overallDqr: null,
    overallLevel: null,
    overallUncertainty: null,
    resultUpdatedAt: formatNow(),
    qualitative,
    items,
    result: computeResult(items),
    createdAt: formatNow(),
    createdBy: '张核算',
  }
  assessmentSeq += 1
  qualityStore = [assessment, ...qualityStore]
  return cloneAssessment(assessment)
}

/** 保存定性覆盖（步骤①，9 个定性维度） */
export async function saveQualitative(id: string, coverage: QualitativeTexts): Promise<void> {
  const assessment = qualityStore.find((item) => item.id === id)
  if (!assessment) throw new Error('数据质量评价不存在或已被删除')
  await delay(120)
  Object.assign(assessment.qualitative, coverage)
}

/** 定性确认（步骤① → ②，业务 PRD R-086） */
export async function confirmQualitative(id: string): Promise<void> {
  const assessment = qualityStore.find((item) => item.id === id)
  if (!assessment) throw new Error('数据质量评价不存在或已被删除')
  if (assessment.status === 'stale') throw new Error('来源核算数据已更新，请先更新基准')
  await delay(120)
  assessment.qualitative.confirmed = true
  assessment.qualitative.confirmedBy = '张核算'
  assessment.qualitative.confirmedAt = formatNow()
  refreshStatus(assessment)
}

/** 批量评估（业务 PRD §6.4 / R-091）；`dataItemIds` 为空时评估全部数据项 */
export async function batchAssess(id: string, dataItemIds?: string[]): Promise<QualityAssessmentItem[]> {
  const assessment = qualityStore.find((item) => item.id === id)
  if (!assessment) throw new Error('数据质量评价不存在或已被删除')
  if (assessment.status === 'stale') throw new Error('来源核算数据已更新，请先更新基准')
  await delay(420)
  const ids = dataItemIds?.length ? new Set(dataItemIds) : null
  const targets = ids ? assessment.items.filter((item) => ids.has(item.dataItemId)) : assessment.items
  if (!targets.length) throw new Error('请先勾选需要批量评估的数据项')
  targets.forEach((item) => applyScoreToItem(item, defaultScore(item)))
  recompute(assessment)
  refreshStatus(assessment)
  return assessment.items.map((item) => ({ ...item }))
}

/** 单项评分（业务 PRD §6.1 / R-087） */
export async function scoreItem(
  id: string,
  dataItemId: string,
  score: Omit<PedigreeScore, 'scoreSource'>,
): Promise<void> {
  const assessment = qualityStore.find((item) => item.id === id)
  if (!assessment) throw new Error('数据质量评价不存在或已被删除')
  if (assessment.status === 'stale') throw new Error('来源核算数据已更新，请先更新基准')
  const item = assessment.items.find((row) => row.dataItemId === dataItemId)
  if (!item) throw new Error('数据项不存在')
  await delay(160)
  applyScoreToItem(item, { ...score, scoreSource: 'manual' })
  recompute(assessment)
  refreshStatus(assessment)
}

/** 保存结论（步骤③，可编辑、选填） */
export async function saveConclusion(id: string, conclusion: string): Promise<void> {
  const assessment = qualityStore.find((item) => item.id === id)
  if (!assessment) throw new Error('数据质量评价不存在或已被删除')
  await delay(120)
  assessment.result.conclusion = conclusion
  assessment.result.generatedAt = formatNow()
  assessment.resultUpdatedAt = formatNow()
}

/** 更新基准：同步新核算版本 + 清空全部评分（业务 PRD R-094 / C10） */
export async function updateBaseline(id: string): Promise<void> {
  const assessment = qualityStore.find((item) => item.id === id)
  if (!assessment) throw new Error('数据质量评价不存在或已被删除')
  if (assessment.sourceDeleted) throw new Error('来源核算项目已删除，无法更新基准')
  await delay(420)
  const source = sourceProjects.find((item) => item.id === assessment.sourceProjectId)
  if (source) {
    assessment.baselineVersion = source.baselineVersion + 1
    assessment.baselineEmission = source.baselineEmission
    assessment.baselineCalculatedAt = source.baselineCalculatedAt
  }
  assessment.items.forEach((item) => applyScoreToItem(item, null))
  assessment.result = computeResult(assessment.items)
  assessment.overallDqr = null
  assessment.overallLevel = null
  assessment.status = 'unfinished'
  assessment.qualitative.confirmed = assessment.qualitative.confirmed && false ? true : assessment.qualitative.confirmed
}

/** 删除评价单（不影响来源核算项目） */
export async function deleteQualityAssessment(id: string): Promise<void> {
  const assessment = qualityStore.find((item) => item.id === id)
  if (!assessment) throw new Error('数据质量评价不存在或已被删除')
  await delay(260)
  qualityStore = qualityStore.filter((item) => item.id !== id)
}

/** 指标口径排放拆分比例（演示口径：化石 70% / 生物源 22% / 直接土地利用变化 8%，工程上应来自核算结果分口径明细） */
function caliberEmissionOf(emission: number, caliber: PcfCaliberKey): number {
  if (caliber === 'total' || !emission) return emission
  const ratio = caliber === 'fossil' ? 0.7 : caliber === 'biogenic' ? 0.22 : 0.08
  return Math.round(emission * ratio * 1000) / 1000
}

/** 切换评价指标口径：同步该指标对应的数据项排放与贡献率，并重算评价结果（评分沿用当前口径结果） */
export async function switchCaliber(id: string, caliber: PcfCaliberKey): Promise<void> {
  const assessment = qualityStore.find((item) => item.id === id)
  if (!assessment) throw new Error('数据质量评价不存在或已被删除')
  await delay(120)
  const source = sourceProjects.find((item) => item.id === assessment.sourceProjectId)
  assessment.caliber = caliber
  assessment.items.forEach((item) => {
    const seed = source?.items.find((row) => row.dataItemId === item.dataItemId)
    const base = seed ? seed.emission : item.emission
    item.emission = caliberEmissionOf(base, caliber)
  })
  const totalEmission = assessment.items.reduce((acc, item) => acc + item.emission, 0)
  assessment.items.forEach((item) => {
    item.contribution = totalEmission > 0 ? Math.round((item.emission / totalEmission) * 1000) / 10 : 0
  })
  recompute(assessment)
}

/** 深拷贝（避免页面直接改 store） */
function cloneAssessment(assessment: QualityAssessment): QualityAssessment {
  return {
    ...assessment,
    qualitative: { ...assessment.qualitative },
    items: assessment.items.map((item) => ({ ...item, score: item.score ? { ...item.score } : null })),
    result: { ...assessment.result, levelDistribution: { ...assessment.result.levelDistribution } },
  }
}
