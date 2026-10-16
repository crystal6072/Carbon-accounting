import type {
  SensitivityAnalysis,
  SensitivityBaselineItem,
  SensitivityCalibers,
  SensitivityProjectOption,
  SensitivityScenario,
  SensitivityScenarioItem,
  SensitivityScenarioResult,
  SensitivityStatus,
} from '@/types/sensitivity'
import type { PcfCaliberValues } from '@/types'

/**
 * 敏感性分析 Mock（报告管理）。
 *
 * 口径说明（与《敏感性分析业务PRD》§6 对齐）：
 * - 基准清单在创建分析时**复制**核算项目阶段数据项（引用即复制），与主链解耦；
 * - 情景重算沿用核算引擎默认口径（行级 `数量 × 排放因子` → 全局 SUM），
 *   变更项取「情景数量」、其余取基准数量；单位换算系数按 1 简化（原型口径）；
 * - 四口径：因子带 GWP 分项时分项求值，否则化石 = 总量、生物源 / 土地利用 = 0。
 *
 * 演示数据为**自包含快照**（不依赖核算主链 store），保证基准清单、基准结果与情景重算三者自洽。
 */

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/* ============ 来源核算项目快照（仅「已核算」项目可作为候选） ============ */

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
  items: SensitivityBaselineItem[]
}

const boundaryText = (code: string) =>
  code === 'grave' ? '摇篮到坟墓' : code === 'gate_to_gate' ? '大门到大门' : '摇篮到大门'

const sourceProjects: SourceProjectSnapshot[] = [
  {
    id: 'PJ04',
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
        dataItemId: 'D04-01',
        name: '原竹',
        itemType: 'natural',
        emissionType: null,
        direction: 'input',
        baselineQty: 1.846,
        unit: 'kg',
        stageId: 'S-RAW',
        stageName: '原材料获取',
        stagePath: '原材料获取-原材料运输',
        nodeId: 'N-01',
        nodeName: '竹秆',
        listName: '产品分配系数 1',
        upstreamProcess: '竹林可持续管理',
        factorId: 'F-BAMBOO',
        factorName: '毛竹（竹秆）碳汇因子',
        factorValue: -1.83,
        factorUnit: 'kgCO₂e/kg',
        factorCalibers: { gwpFossil: 0, gwpBiogenic: -1.83, gwpLuluc: 0 },
        factorSource: '中国官方排放因子库 V1.0 数据库：毛竹固碳',
      },
      {
        dataItemId: 'D04-02',
        name: '脲醛树脂胶',
        itemType: 'material',
        emissionType: null,
        direction: 'input',
        baselineQty: 0.216,
        unit: 'kg',
        stageId: 'S-RAW',
        stageName: '原材料获取',
        stagePath: '原材料获取-原材料运输',
        nodeId: 'N-02',
        nodeName: '脲醛树脂',
        listName: '产品分配系数 1',
        upstreamProcess: '脲醛树脂生产',
        factorId: 'F-GLUE',
        factorName: '脲醛树脂胶',
        factorValue: 3.12,
        factorUnit: 'kgCO₂e/kg',
        factorCalibers: { gwpFossil: 3.12, gwpBiogenic: 0, gwpLuluc: 0 },
        factorSource: '中国官方排放因子库 V1.0 数据库：脲醛树脂胶',
      },
      {
        dataItemId: 'D04-03',
        name: '成品运输（福州-厦门）',
        itemType: 'material',
        emissionType: null,
        direction: 'input',
        baselineQty: 260,
        unit: 'km',
        stageId: 'S-RAW',
        stageName: '原材料获取',
        stagePath: '原材料获取-原材料运输',
        nodeId: null,
        nodeName: null,
        listName: '产品分配系数 1',
        upstreamProcess: '',
        factorId: 'F-TRANS',
        factorName: '公路货运（柴油，12t 以上）',
        factorValue: 0.104,
        factorUnit: 'kgCO₂e/(t·km)',
        factorCalibers: { gwpFossil: 0.104, gwpBiogenic: 0, gwpLuluc: 0 },
        factorSource: '中国官方排放因子库 V1.0 数据库：公路货运',
      },
      {
        dataItemId: 'D04-04',
        name: '电力（外购）',
        itemType: 'energy',
        emissionType: null,
        direction: 'input',
        baselineQty: 12.5,
        unit: 'kWh',
        stageId: 'S-PROD',
        stageName: '生产',
        stagePath: '生产',
        nodeId: null,
        nodeName: null,
        listName: '产品分配系数 1',
        upstreamProcess: '',
        factorId: 'F-ELEC',
        factorName: '福建省电网平均排放因子',
        factorValue: 0.581,
        factorUnit: 'kgCO₂e/kWh',
        factorCalibers: { gwpFossil: 0.581, gwpBiogenic: 0, gwpLuluc: 0 },
        factorSource: '中国官方排放因子库 V1.0 数据库：电力排放因子',
      },
      {
        dataItemId: 'D04-05',
        name: '竹屑（副产物）',
        itemType: 'byproduct',
        emissionType: null,
        direction: 'output',
        baselineQty: 0.183,
        unit: 'kg',
        stageId: 'S-PROD',
        stageName: '生产',
        stagePath: '生产',
        nodeId: null,
        nodeName: null,
        listName: '产品分配系数 1',
        upstreamProcess: '',
        factorId: null,
        factorName: '',
        factorValue: null,
        factorUnit: '',
        factorCalibers: null,
        factorSource: '',
      },
    ],
  },
  {
    id: 'PJ05',
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
        dataItemId: 'D05-01',
        name: '原竹',
        itemType: 'natural',
        emissionType: null,
        direction: 'input',
        baselineQty: 18.46,
        unit: 'kg',
        stageId: 'S-RAW',
        stageName: '原材料获取',
        stagePath: '原材料获取',
        nodeId: null,
        nodeName: null,
        listName: '产品分配系数 1',
        upstreamProcess: '',
        factorId: 'F-BAMBOO',
        factorName: '毛竹（竹秆）碳汇因子',
        factorValue: -1.83,
        factorUnit: 'kgCO₂e/kg',
        factorCalibers: null,
        factorSource: '中国官方排放因子库 V1.0 数据库：毛竹固碳',
      },
      {
        dataItemId: 'D05-02',
        name: '脲醛树脂胶',
        itemType: 'material',
        emissionType: null,
        direction: 'input',
        baselineQty: 2.16,
        unit: 'kg',
        stageId: 'S-RAW',
        stageName: '原材料获取',
        stagePath: '原材料获取',
        nodeId: null,
        nodeName: null,
        listName: '产品分配系数 1',
        upstreamProcess: '',
        factorId: 'F-GLUE',
        factorName: '脲醛树脂胶',
        factorValue: 3.12,
        factorUnit: 'kgCO₂e/kg',
        factorCalibers: null,
        factorSource: '中国官方排放因子库 V1.0 数据库：脲醛树脂胶',
      },
      {
        dataItemId: 'D05-03',
        name: '电力（外购）',
        itemType: 'energy',
        emissionType: null,
        direction: 'input',
        baselineQty: 260,
        unit: 'kWh',
        stageId: 'S-PROD',
        stageName: '生产',
        stagePath: '生产',
        nodeId: null,
        nodeName: null,
        listName: '产品分配系数 1',
        upstreamProcess: '',
        factorId: 'F-ELEC',
        factorName: '福建省电网平均排放因子',
        factorValue: 0.581,
        factorUnit: 'kgCO₂e/kWh',
        factorCalibers: null,
        factorSource: '中国官方排放因子库 V1.0 数据库：电力排放因子',
      },
      {
        dataItemId: 'D05-04',
        name: '竹粉（边角料）',
        itemType: 'byproduct',
        emissionType: null,
        direction: 'output',
        baselineQty: 1.2,
        unit: 'kg',
        stageId: 'S-PROD',
        stageName: '生产',
        stagePath: '生产',
        nodeId: null,
        nodeName: null,
        listName: '产品分配系数 1',
        upstreamProcess: '',
        factorId: null,
        factorName: '',
        factorValue: null,
        factorUnit: '',
        factorCalibers: null,
        factorSource: '',
      },
    ],
  },
  {
    id: 'PJ06',
    name: '整竹砧板 · 摇篮到大门',
    code: 'PCF-20260923-006',
    productName: 'ZB13002 整竹砧板',
    productSpec: '38×26×2.2cm',
    boundary: 'gate',
    functionalUnit: '块',
    statisticalPeriod: '2026-01-01 ~ 2026-12-31',
    baselineEmission: 1.586,
    baselineVersion: 3,
    baselineCalculatedAt: '2026-10-08 09:30',
    hasGwpSplit: false,
    items: [
      {
        dataItemId: 'D06-01',
        name: '原竹',
        itemType: 'natural',
        emissionType: null,
        direction: 'input',
        baselineQty: 4.6,
        unit: 'kg',
        stageId: 'S-RAW',
        stageName: '原材料获取',
        stagePath: '原材料获取',
        nodeId: null,
        nodeName: null,
        listName: '产品分配系数 1',
        upstreamProcess: '',
        factorId: 'F-BAMBOO',
        factorName: '毛竹（竹秆）碳汇因子',
        factorValue: -1.83,
        factorUnit: 'kgCO₂e/kg',
        factorCalibers: null,
        factorSource: '中国官方排放因子库 V1.0 数据库：毛竹固碳',
      },
      {
        dataItemId: 'D06-02',
        name: '电力（外购）',
        itemType: 'energy',
        emissionType: null,
        direction: 'input',
        baselineQty: 36.4,
        unit: 'kWh',
        stageId: 'S-PROD',
        stageName: '生产',
        stagePath: '生产',
        nodeId: null,
        nodeName: null,
        listName: '产品分配系数 1',
        upstreamProcess: '',
        factorId: 'F-ELEC',
        factorName: '福建省电网平均排放因子',
        factorValue: 0.581,
        factorUnit: 'kgCO₂e/kWh',
        factorCalibers: null,
        factorSource: '中国官方排放因子库 V1.0 数据库：电力排放因子',
      },
      {
        dataItemId: 'D06-03',
        name: '食品级植物油',
        itemType: 'material',
        emissionType: null,
        direction: 'input',
        baselineQty: 0.12,
        unit: 'kg',
        stageId: 'S-PROD',
        stageName: '生产',
        stagePath: '生产',
        nodeId: null,
        nodeName: null,
        listName: '产品分配系数 1',
        upstreamProcess: '',
        factorId: 'F-OIL',
        factorName: '食品级植物油',
        factorValue: 2.31,
        factorUnit: 'kgCO₂e/kg',
        factorCalibers: null,
        factorSource: '中国官方排放因子库 V1.0 数据库：食品级植物油',
      },
    ],
  },
  {
    id: 'PJ07',
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
        dataItemId: 'D07-01',
        name: '竹纤维浆',
        itemType: 'material',
        emissionType: null,
        direction: 'input',
        baselineQty: 8.4,
        unit: 'kg',
        stageId: 'S-RAW',
        stageName: '原材料获取',
        stagePath: '原材料获取',
        nodeId: null,
        nodeName: null,
        listName: '产品分配系数 1',
        upstreamProcess: '',
        factorId: null,
        factorName: '',
        factorValue: null,
        factorUnit: '',
        factorCalibers: null,
        factorSource: '',
      },
      {
        dataItemId: 'D07-02',
        name: '电力（外购）',
        itemType: 'energy',
        emissionType: null,
        direction: 'input',
        baselineQty: 42,
        unit: 'kWh',
        stageId: 'S-PROD',
        stageName: '生产',
        stagePath: '生产',
        nodeId: null,
        nodeName: null,
        listName: '产品分配系数 1',
        upstreamProcess: '',
        factorId: 'F-ELEC',
        factorName: '福建省电网平均排放因子',
        factorValue: 0.581,
        factorUnit: 'kgCO₂e/kWh',
        factorCalibers: null,
        factorSource: '中国官方排放因子库 V1.0 数据库：电力排放因子',
      },
    ],
  },
]

/* ============ 重算引擎（业务 PRD §6） ============ */

function round(value: number, digits = 6): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function emptyCalibers(): PcfCaliberValues {
  return { total: 0, fossil: 0, biogenic: 0, luluc: 0 }
}

/** 单行四口径排放：变更项取情景数量，其余取基准数量 */
function rowEmission(item: SensitivityBaselineItem, qty: number) {
  const factorValue = item.factorValue ?? 0
  const total = round(qty * factorValue)
  if (item.factorCalibers) {
    const fossil = round(qty * (item.factorCalibers.gwpFossil ?? factorValue))
    const biogenic = round(qty * (item.factorCalibers.gwpBiogenic ?? 0))
    const luluc = round(qty * (item.factorCalibers.gwpLuluc ?? 0))
    return { total, fossil, biogenic, luluc }
  }
  return { total, fossil: total, biogenic: 0, luluc: 0 }
}

/** 情景重算：行级 → 全局 SUM；输出四口径 + 变化率 */
function recalcScenario(
  baselineEmission: number,
  baselineItems: SensitivityBaselineItem[],
  items: SensitivityScenarioItem[],
): SensitivityScenarioResult {
  const override = new Map(items.map((item) => [item.dataItemId, item.scenarioQty]))
  const totals = emptyCalibers()

  baselineItems.forEach((item) => {
    const raw = override.has(item.dataItemId) ? (override.get(item.dataItemId) ?? null) : item.baselineQty
    const qty = raw ?? 0
    const row = rowEmission(item, qty)
    totals.total += row.total
    totals.fossil += row.fossil
    totals.biogenic += row.biogenic
    totals.luluc += row.luluc
  })

  const emission = round(totals.total)
  const caliberEmission = {
    total: emission,
    fossil: round(totals.fossil),
    biogenic: round(totals.biogenic),
    luluc: round(totals.luluc),
  }

  const deltaRate =
    baselineEmission === 0 ? null : round(((emission - baselineEmission) / baselineEmission) * 100, 1)
  const deltaRateText = deltaRate === null ? '-' : `${deltaRate > 0 ? '+' : ''}${deltaRate.toFixed(1)}%`

  return {
    emission,
    caliberEmission,
    deltaRate,
    deltaRateText,
    calculatedAt: formatNow(),
  }
}

/** 基准四口径值（由基准清单按基准数量汇总） */
function baselineCaliberOf(items: SensitivityBaselineItem[]): PcfCaliberValues {
  const totals = emptyCalibers()
  items.forEach((item) => {
    const row = rowEmission(item, item.baselineQty ?? 0)
    totals.total += row.total
    totals.fossil += row.fossil
    totals.biogenic += row.biogenic
    totals.luluc += row.luluc
  })
  return {
    total: round(totals.total),
    fossil: round(totals.fossil),
    biogenic: round(totals.biogenic),
    luluc: round(totals.luluc),
  }
}

function formatNow(): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(
    now.getMinutes(),
  )}:${pad(now.getSeconds())}`
}

function formatDateOnly(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
}

function makeAnalysisNo(seq: number): string {
  return `PCF-SA-${formatDateOnly(new Date())}${String(seq).padStart(3, '0')}`
}

/** 变更项数 = 与基准数量不一致的项 */
function changedCountOf(baselineItems: SensitivityBaselineItem[], items: SensitivityScenarioItem[]): number {
  return items.filter((item) => {
    const base = baselineItems.find((row) => row.dataItemId === item.dataItemId)
    return !!base && (item.scenarioQty ?? null) !== (base.baselineQty ?? null)
  }).length
}

/** 重新计算分析状态（业务 PRD R-076 / R-077） */
function refreshStatus(analysis: SensitivityAnalysis): void {
  const allCalc = analysis.scenarios.every((item) => item.calcStatus === 'calculated')
  const baseReady = analysis.baselineDescription.trim().length > 0
  if (analysis.scenarios.length === 0) {
    analysis.status = baseReady ? 'completed' : 'unfinished'
    return
  }
  analysis.status = allCalc ? 'completed' : 'unfinished'
}

/** 标记关键敏感项：|Δ| 最大的变更情景（阈值见业务 PRD §9 Q7，本期按最大值取 1 个） */
function refreshKeySensitive(analysis: SensitivityAnalysis): void {
  const ranked = analysis.scenarios
    .filter((item) => item.result?.deltaRate != null)
    .sort((a, b) => Math.abs(b.result!.deltaRate as number) - Math.abs(a.result!.deltaRate as number))
  analysis.scenarios.forEach((item) => {
    item.keySensitive = ranked[0]?.id === item.id
  })
}

/* ============ 演示数据（4 条，覆盖 3 状态 + 基准为 0 边界） ============ */

function buildSeedAnalyses(): SensitivityAnalysis[] {
  const seeds: Array<{
    source: SourceProjectSnapshot
    baselineDescription: string
    scenarios: Array<{ description: string; items: SensitivityScenarioItem[]; calc: boolean }>
    statusOverride?: SensitivityStatus
    resultUpdatedAt: string
  }> = [
    {
      source: sourceProjects[0],
      baselineDescription: '以核算项目 V2 结果为基准，评估原竹用量、用胶量与运输距离对碳足迹的影响。',
      resultUpdatedAt: '2026-10-12 16:11:09',
      scenarios: [
        {
          description: '原竹用量 +10%（竹林可持续管理改善，单位产品耗竹下降）',
          items: [{ dataItemId: 'D04-01', baselineQty: 1.846, scenarioQty: 1.6614 }],
          calc: true,
        },
        {
          description: '用胶量 -10%（改性胶替代，减少脲醛树脂胶单耗）',
          items: [{ dataItemId: 'D04-02', baselineQty: 0.216, scenarioQty: 0.1944 }],
          calc: true,
        },
        {
          description: '运输距离改为省内短途（260km → 120km）',
          items: [{ dataItemId: 'D04-03', baselineQty: 260, scenarioQty: 120 }],
          calc: true,
        },
      ],
    },
    {
      source: sourceProjects[1],
      baselineDescription: '以竹板坯 V1 结果为基准，评估用胶量与生产用电对碳足迹的影响。',
      resultUpdatedAt: '2026-09-28 19:00:05',
      scenarios: [
        {
          description: '用胶量 -15%（胶线工艺优化）',
          items: [{ dataItemId: 'D05-02', baselineQty: 2.16, scenarioQty: 1.836 }],
          calc: true,
        },
        {
          description: '生产用电 +20%（新增烘干工序）',
          items: [{ dataItemId: 'D05-03', baselineQty: 260, scenarioQty: 312 }],
          calc: false,
        },
      ],
    },
    {
      source: sourceProjects[2],
      baselineDescription: '以整竹砧板 V1 结果为基准，评估电力与植物油用量对碳足迹的影响。',
      resultUpdatedAt: '2026-10-08 09:30:22',
      scenarios: [
        {
          description: '生产用电 -10%（空压机变频改造）',
          items: [{ dataItemId: 'D06-02', baselineQty: 36.4, scenarioQty: 32.76 }],
          calc: true,
        },
      ],
      /** 来源项目已产出 V3 结果，本分析仍锁定 V1 → 待更新 */
      statusOverride: 'stale',
    },
    {
      source: sourceProjects[3],
      baselineDescription: '以竹纤维餐盒 V1 结果为基准（基准结果暂为 0，演示变化率兜底）。',
      resultUpdatedAt: '2026-09-23 14:05:47',
      scenarios: [
        {
          description: '补充竹纤维浆因子后重新推演（基准为 0，变化率显示「-」）',
          items: [],
          calc: true,
        },
      ],
    },
  ]

  return seeds.map((seed, index) => {
    const baselineItems = seed.source.items.map((item) => ({ ...item }))
    const baselineCaliber = baselineCaliberOf(baselineItems)
    const scenarios: SensitivityScenario[] = seed.scenarios.map((item, seqIndex) => {
      const changedCount = changedCountOf(baselineItems, item.items)
      const result = item.calc
        ? recalcScenario(seed.source.baselineEmission, baselineItems, item.items)
        : null
      return {
        id: `${sourceProjects[index].id}-SC${seqIndex + 1}`,
        seq: seqIndex + 1,
        description: item.description,
        changedCount,
        calcStatus: item.calc ? 'calculated' : 'notCalc',
        keySensitive: false,
        calculatedAt: result?.calculatedAt ?? '',
        result,
        items: item.items.map((row) => ({ ...row })),
      }
    })

    const analysis: SensitivityAnalysis = {
      id: `SA0${index + 1}`,
      analysisNo: makeAnalysisNo(index + 1),
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
      baselineCaliberEmission: baselineCaliber as PcfCaliberValues,
      baselineCalculatedAt: seed.source.baselineCalculatedAt,
      baselineDescription: seed.baselineDescription,
      status: 'unfinished',
      scenarios,
      baselineItems,
      resultUpdatedAt: seed.resultUpdatedAt,
      createdAt: seed.resultUpdatedAt,
      createdBy: '张核算',
    }

    refreshStatus(analysis)
    if (seed.statusOverride) analysis.status = seed.statusOverride
    refreshKeySensitive(analysis)
    return analysis
  })
}

let sensitivityStore: SensitivityAnalysis[] = buildSeedAnalyses()
let analysisSeq = sensitivityStore.length + 1

/* ============ 服务 ============ */

/** 列表 + 查询（业务 PRD §3） */
export function fetchSensitivityAnalyses(query?: {
  keywordProject?: string
  keywordProduct?: string
  status?: SensitivityStatus | ''
}): Promise<SensitivityAnalysis[]> {
  const kwProject = (query?.keywordProject ?? '').trim().toLowerCase()
  const kwProduct = (query?.keywordProduct ?? '').trim().toLowerCase()
  const status = query?.status ?? ''
  const list = sensitivityStore
    .filter((item) => {
      if (kwProject && !item.sourceProjectName.toLowerCase().includes(kwProject)) return false
      if (kwProduct && !item.productName.toLowerCase().includes(kwProduct)) return false
      if (status && item.status !== status) return false
      return true
    })
    .slice()
    .sort((a, b) => b.resultUpdatedAt.localeCompare(a.resultUpdatedAt))
  return delay(160).then(() => list.map((item) => cloneAnalysis(item)))
}

/** 详情 */
export function fetchSensitivityDetail(id: string): Promise<SensitivityAnalysis> {
  const target = sensitivityStore.find((item) => item.id === id)
  if (!target) return delay(120).then(() => Promise.reject(new Error('分析不存在或已被删除')))
  return delay(160).then(() => cloneAnalysis(target))
}

/** 新增弹窗候选（仅「已核算」项目） */
export function fetchCalculatedProjects(): Promise<SensitivityProjectOption[]> {
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
  }))
  return delay(140).then(() => list)
}

/** 创建分析：复制基准清单 + 锁定基准结果版本（业务 PRD R-068） */
export async function createSensitivityAnalysis(projectId: string): Promise<SensitivityAnalysis> {
  const source = sourceProjects.find((item) => item.id === projectId)
  if (!source) throw new Error('核算项目不存在或未完成核算')
  await delay(320)

  const baselineItems = source.items.map((item) => ({ ...item }))
  const baselineCaliber = baselineCaliberOf(baselineItems)
  const analysis: SensitivityAnalysis = {
    id: `SA${String(analysisSeq).padStart(2, '0')}`,
    analysisNo: makeAnalysisNo(analysisSeq),
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
    baselineCaliberEmission: baselineCaliber as PcfCaliberValues,
    baselineCalculatedAt: source.baselineCalculatedAt,
    baselineDescription: '',
    status: 'unfinished',
    scenarios: [],
    baselineItems,
    resultUpdatedAt: formatNow(),
    createdAt: formatNow(),
    createdBy: '张核算',
  }
  analysisSeq += 1
  sensitivityStore = [analysis, ...sensitivityStore]
  return cloneAnalysis(analysis)
}

/** 保存基准 / 情景描述 */
export async function updateScenarioDescription(
  analysisId: string,
  scenarioId: string | null,
  description: string,
): Promise<void> {
  const analysis = sensitivityStore.find((item) => item.id === analysisId)
  if (!analysis) throw new Error('分析不存在或已被删除')
  await delay(120)
  if (scenarioId === null) {
    analysis.baselineDescription = description
  } else {
    const scenario = analysis.scenarios.find((item) => item.id === scenarioId)
    if (!scenario) throw new Error('情景不存在')
    scenario.description = description
  }
  refreshStatus(analysis)
}

/** 新增情景 */
export async function addScenario(analysisId: string): Promise<SensitivityScenario> {
  const analysis = sensitivityStore.find((item) => item.id === analysisId)
  if (!analysis) throw new Error('分析不存在或已被删除')
  if (analysis.status === 'stale') throw new Error('来源核算数据已更新，请先更新基准')
  await delay(160)
  const scenario: SensitivityScenario = {
    id: `${analysis.id}-SC${analysis.scenarios.length + 1}`,
    seq: analysis.scenarios.length + 1,
    description: '',
    changedCount: 0,
    calcStatus: 'notCalc',
    keySensitive: false,
    calculatedAt: '',
    result: null,
    items: [],
  }
  analysis.scenarios = [...analysis.scenarios, scenario]
  analysis.status = 'unfinished'
  return { ...scenario, items: [] }
}

/** 删除情景（seq 重排） */
export async function deleteScenario(analysisId: string, scenarioId: string): Promise<void> {
  const analysis = sensitivityStore.find((item) => item.id === analysisId)
  if (!analysis) throw new Error('分析不存在或已被删除')
  if (analysis.status === 'stale') throw new Error('来源核算数据已更新，请先更新基准')
  await delay(160)
  analysis.scenarios = analysis.scenarios
    .filter((item) => item.id !== scenarioId)
    .map((item, index) => ({ ...item, seq: index + 1 }))
  refreshStatus(analysis)
  refreshKeySensitive(analysis)
}

/** 情景核算：保存变更集 → 重算 → 回填结果（业务 PRD R-072 / R-075） */
export async function calcScenario(
  analysisId: string,
  scenarioId: string,
  items: SensitivityScenarioItem[],
): Promise<SensitivityScenarioResult> {
  const analysis = sensitivityStore.find((item) => item.id === analysisId)
  if (!analysis) throw new Error('分析不存在或已被删除')
  const scenario = analysis.scenarios.find((item) => item.id === scenarioId)
  if (!scenario) throw new Error('情景不存在')
  if (!scenario.description.trim()) throw new Error('请填写情景描述')
  if (analysis.status === 'stale') throw new Error('来源核算数据已更新，请先更新基准')

  await delay(900)

  const validItems = items.filter((item) => {
    const base = analysis.baselineItems.find((row) => row.dataItemId === item.dataItemId)
    return !!base && item.scenarioQty !== null && item.scenarioQty !== base.baselineQty
  })
  const result = recalcScenario(analysis.baselineEmission, analysis.baselineItems, validItems)

  scenario.items = validItems
  scenario.changedCount = validItems.length
  scenario.result = result
  scenario.calcStatus = 'calculated'
  scenario.calculatedAt = result.calculatedAt
  analysis.resultUpdatedAt = result.calculatedAt

  refreshStatus(analysis)
  refreshKeySensitive(analysis)
  return result
}

/** 更新基准：同步新核算版本 + 清空情景结果（业务 PRD R-078 / 联动 C10） */
export async function updateBaseline(analysisId: string): Promise<SensitivityAnalysis> {
  const analysis = sensitivityStore.find((item) => item.id === analysisId)
  if (!analysis) throw new Error('分析不存在或已被删除')
  if (analysis.sourceDeleted) throw new Error('来源核算项目已删除，无法更新基准')
  await delay(420)

  const source = sourceProjects.find((item) => item.id === analysis.sourceProjectId)
  if (source) {
    analysis.baselineVersion = source.baselineVersion
    analysis.baselineEmission = source.baselineEmission
    analysis.baselineCalculatedAt = source.baselineCalculatedAt
    analysis.baselineItems = source.items.map((item) => ({ ...item }))
    analysis.baselineCaliberEmission = baselineCaliberOf(analysis.baselineItems) as PcfCaliberValues
  }
  analysis.scenarios = analysis.scenarios.map((item) => ({
    ...item,
    calcStatus: 'notCalc' as const,
    keySensitive: false,
    calculatedAt: '',
    result: null,
    items: [],
  }))
  analysis.status = 'unfinished'
  return cloneAnalysis(analysis)
}

/** 删除分析单 */
export async function deleteSensitivityAnalysis(id: string): Promise<void> {
  const analysis = sensitivityStore.find((item) => item.id === id)
  if (!analysis) throw new Error('分析不存在或已被删除')
  await delay(260)
  sensitivityStore = sensitivityStore.filter((item) => item.id !== id)
}

/** 深拷贝（避免页面直接改 store） */
function cloneAnalysis(analysis: SensitivityAnalysis): SensitivityAnalysis {
  return {
    ...analysis,
    baselineItems: analysis.baselineItems.map((item) => ({ ...item })),
    scenarios: analysis.scenarios.map((item) => ({
      ...item,
      items: item.items.map((row) => ({ ...row })),
      result: item.result ? { ...item.result } : null,
    })),
  }
}
