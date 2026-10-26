import type {
  PcfCalcResult,
  PcfResultDetail,
  PcfStageSummary,
  PcfCaliberValues,
  PcfUnitEmission,
} from '@/types'
import type {
  PcfFootprintReport,
  ReportCover,
  ReportSection,
  ReportTable,
  ReportTableType,
  ReportFigure,
  ReportSnapshot,
  EnterpriseInfo,
  ReportProjectOption,
  ReportTemplate,
  SensitivitySnapshotSummary,
  QualitySnapshotSummary,
} from '@/types/report'
import {
  REPORT_TABLE_TITLE,
  REPORT_FIGURE_TITLE,
  boundaryText,
  formatEmission,
  formatPercent,
  makeReportNo,
  makeReportFileName,
  formatNow,
  formatDateOnly,
} from '@/pages/report/reportMeta'
import { noteEnterpriseReportRef, resolveEnterpriseInfo } from './enterprise'

/**
 * 报告生成 Mock（报告管理 · 报告编制）。
 * 自包含上游快照数据（不依赖核算主链 store），装配逻辑在 generate/regenerate 时执行。
 * 上游结构参考《核算项目字段清单》《碳足迹核算字段清单》《敏感性分析字段清单》《数据质量评价字段清单》。
 */

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/* ============ 上游数据结构 ============ */

interface UpstreamItem {
  id: string
  /** 一级过程名称（表 2 列 1） */
  flowName: string
  /** 二级过程名称（表 2 列 2），空 → `-` */
  factorName: string
  /** 活动数据单位 */
  unit: string
  /** 数量 */
  activity: number
  /** 因子值 kgCO₂e/单位 */
  factorValue: number
  /** 次级数据来源说明 */
  factorSource: string
  /** 最末级阶段路径（决定所属表 T02~T08） */
  stagePath: string
  /** 是否生物源（竹碳汇，排放为负） */
  biogenic?: boolean
}

interface ReportSourceProject {
  id: string
  code: string
  name: string
  productName: string
  productSpec: string
  productSpecModel: string
  productImageUrl: string
  boundary: string
  functionalUnit: string
  conversionFactor: number
  conversionUnit: string
  startDate: string
  endDate: string
  method: string
  /** 生命周期阶段（含勾选） */
  lifecycleStages: Array<{ name: string; included: boolean }>
  /** 引用的企业信息库记录 id（报告管理 · 企业信息维护；null = 企业信息缺失，报告内待补录） */
  enterpriseId: string | null
  items: UpstreamItem[]
  hasSensitivity: boolean
  hasQuality: boolean
  baselineVersion: number
  baselineCalculatedAt: string
}

/* 阶段路径 → 表格编码映射（模板 §3 / §6） */
const STAGE_TABLES: Array<{ stagePath: string; tableNo: ReportTableType }> = [
  { stagePath: '原材料获取-原材料获取', tableNo: 'T02' },
  { stagePath: '原材料获取-原材料运输', tableNo: 'T03' },
  { stagePath: '生产-生产', tableNo: 'T04' },
  { stagePath: '生产-生产过程的废弃物处理', tableNo: 'T05' },
  { stagePath: '运输/交付', tableNo: 'T06' },
  { stagePath: '生命末期-生命末期产品的收集、包装和运输', tableNo: 'T07' },
  { stagePath: '生命末期-焚烧和底渣分选，填埋和促进分解的排放', tableNo: 'T08' },
]

const emptyEnterprise: EnterpriseInfo = {
  companyName: '',
  companyAddress: '',
  unifiedSocialCreditCode: '',
  legalPerson: '',
  contactPhone: '',
  issuer: '',
  reportDate: '',
}

/* ============ 上游快照数据（4 个「已核算」项目） ============ */

const sourceProjects: ReportSourceProject[] = [
  {
    id: 'PJ-RP01',
    code: 'PCF-20261013-001',
    name: 'ZB13002 整竹砧板 · 摇篮到大门',
    productName: 'ZB13002 整竹砧板',
    productSpec: '38×26×2.2cm',
    productSpecModel: '300*200*15mm',
    productImageUrl: 'https://picsum.photos/seed/chopping/320/240',
    boundary: 'gate',
    functionalUnit: '块',
    conversionFactor: 1,
    conversionUnit: '块',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    method: 'ISO 14067:2018《产品碳足迹——量化要求和指南》；GB/T 24067-2024《温室气体 产品碳足迹 量化要求和指南》',
    lifecycleStages: [
      { name: '原材料获取', included: true },
      { name: '生产', included: true },
      { name: '运输/交付', included: true },
      { name: '生命末期', included: true },
    ],
    /** 引用企业信息库 ENT-001（福建味家竹科技集团有限公司） */
    enterpriseId: 'ENT-001',
    hasSensitivity: true,
    hasQuality: true,
    baselineVersion: 3,
    baselineCalculatedAt: '2026-10-08 09:30',
    items: [
      {
        id: 'R1-01',
        flowName: '原竹',
        factorName: '毛竹（竹秆）碳汇因子',
        unit: 'kg',
        activity: 4.6,
        factorValue: -1.83,
        factorSource: '中国官方排放因子库 V1.0 数据库：毛竹固碳',
        stagePath: '原材料获取-原材料获取',
        biogenic: true,
      },
      {
        id: 'R1-02',
        flowName: '脲醛树脂胶',
        factorName: '脲醛树脂胶',
        unit: 'kg',
        activity: 0.12,
        factorValue: 3.12,
        factorSource: '中国官方排放因子库 V1.0 数据库：脲醛树脂胶',
        stagePath: '原材料获取-原材料获取',
      },
      {
        id: 'R1-03',
        flowName: '成品运输',
        factorName: '公路货运（柴油，12t 以上）',
        unit: 't·km',
        activity: 0.6,
        factorValue: 0.104,
        factorSource: '中国官方排放因子库 V1.0 数据库：公路货运',
        stagePath: '原材料获取-原材料运输',
      },
      {
        id: 'R1-04',
        flowName: '电力（外购）',
        factorName: '福建省电网平均排放因子',
        unit: 'kWh',
        activity: 36.4,
        factorValue: 0.581,
        factorSource: '中国官方排放因子库 V1.0 数据库：电力排放因子',
        stagePath: '生产-生产',
      },
      {
        id: 'R1-05',
        flowName: '食品级植物油',
        factorName: '食品级植物油',
        unit: 'kg',
        activity: 0.12,
        factorValue: 2.31,
        factorSource: '中国官方排放因子库 V1.0 数据库：食品级植物油',
        stagePath: '生产-生产',
      },
      {
        id: 'R1-06',
        flowName: '竹屑（边角料）',
        factorName: '',
        unit: 'kg',
        activity: 0.18,
        factorValue: 0,
        factorSource: '',
        stagePath: '生产-生产过程的废弃物处理',
      },
      {
        id: 'R1-07',
        flowName: '成品运输（至客户）',
        factorName: '公路货运（柴油，12t 以上）',
        unit: 't·km',
        activity: 0.8,
        factorValue: 0.104,
        factorSource: '中国官方排放因子库 V1.0 数据库：公路货运',
        stagePath: '运输/交付',
      },
    ],
  },
  {
    id: 'PJ-RP02',
    code: 'PCF-20260923-004',
    name: '240mm 全竹碳化筷 · 摇篮到大门',
    productName: '240mm 全竹碳化筷',
    productSpec: '240mm·100 双/盒',
    productSpecModel: '240mm',
    productImageUrl: 'https://picsum.photos/seed/chopsticks/320/240',
    boundary: 'gate',
    functionalUnit: '双',
    conversionFactor: 1,
    conversionUnit: '双',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    method: 'ISO 14067:2018；GB/T 24067-2024',
    lifecycleStages: [
      { name: '原材料获取', included: true },
      { name: '生产', included: true },
      { name: '运输/交付', included: true },
      { name: '生命末期', included: false },
    ],
    /** 引用企业信息库 ENT-002（邵武市竹韵餐具有限公司） */
    enterpriseId: 'ENT-002',
    hasSensitivity: false,
    hasQuality: false,
    baselineVersion: 2,
    baselineCalculatedAt: '2026-10-12 16:11',
    items: [
      {
        id: 'R2-01',
        flowName: '原竹',
        factorName: '毛竹（竹秆）碳汇因子',
        unit: 'kg',
        activity: 1.846,
        factorValue: -1.83,
        factorSource: '中国官方排放因子库 V1.0 数据库：毛竹固碳',
        stagePath: '原材料获取-原材料获取',
        biogenic: true,
      },
      {
        id: 'R2-02',
        flowName: '脲醛树脂胶',
        factorName: '脲醛树脂胶',
        unit: 'kg',
        activity: 0.216,
        factorValue: 3.12,
        factorSource: '中国官方排放因子库 V1.0 数据库：脲醛树脂胶',
        stagePath: '原材料获取-原材料获取',
      },
      {
        id: 'R2-03',
        flowName: '成品运输',
        factorName: '公路货运（柴油，12t 以上）',
        unit: 't·km',
        activity: 0.05,
        factorValue: 0.104,
        factorSource: '中国官方排放因子库 V1.0 数据库：公路货运',
        stagePath: '原材料获取-原材料运输',
      },
      {
        id: 'R2-04',
        flowName: '电力（外购）',
        factorName: '福建省电网平均排放因子',
        unit: 'kWh',
        activity: 12.5,
        factorValue: 0.581,
        factorSource: '中国官方排放因子库 V1.0 数据库：电力排放因子',
        stagePath: '生产-生产',
      },
    ],
  },
  {
    id: 'PJ-RP03',
    code: 'PCF-20260923-005',
    name: '竹板坯 · 摇篮到大门',
    productName: '竹板坯',
    productSpec: '2440×1220×18mm',
    productSpecModel: '2440*1220*18mm',
    productImageUrl: 'https://picsum.photos/seed/board/320/240',
    boundary: 'gate',
    functionalUnit: '张',
    conversionFactor: 1,
    conversionUnit: '张',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    method: 'ISO 14067:2018；GB/T 24067-2024',
    lifecycleStages: [
      { name: '原材料获取', included: true },
      { name: '生产', included: true },
      { name: '运输/交付', included: true },
      { name: '生命末期', included: false },
    ],
    /** 引用企业信息库 ENT-003（福建竹材科技股份有限公司） */
    enterpriseId: 'ENT-003',
    hasSensitivity: true,
    hasQuality: true,
    baselineVersion: 1,
    baselineCalculatedAt: '2026-09-28 19:00',
    items: [
      {
        id: 'R3-01',
        flowName: '原竹',
        factorName: '毛竹（竹秆）碳汇因子',
        unit: 'kg',
        activity: 18.46,
        factorValue: -1.83,
        factorSource: '中国官方排放因子库 V1.0 数据库：毛竹固碳',
        stagePath: '原材料获取-原材料获取',
        biogenic: true,
      },
      {
        id: 'R3-02',
        flowName: '脲醛树脂胶',
        factorName: '脲醛树脂胶',
        unit: 'kg',
        activity: 2.16,
        factorValue: 3.12,
        factorSource: '中国官方排放因子库 V1.0 数据库：脲醛树脂胶',
        stagePath: '原材料获取-原材料获取',
      },
      {
        id: 'R3-03',
        flowName: '电力（外购）',
        factorName: '福建省电网平均排放因子',
        unit: 'kWh',
        activity: 260,
        factorValue: 0.581,
        factorSource: '中国官方排放因子库 V1.0 数据库：电力排放因子',
        stagePath: '生产-生产',
      },
    ],
  },
  {
    id: 'PJ-RP04',
    code: 'PCF-20260923-007',
    name: '竹纤维模塑餐盒 · 摇篮到坟墓',
    productName: '竹纤维模塑餐盒',
    productSpec: '750ml·50 只/箱',
    productSpecModel: '750ml',
    productImageUrl: 'https://picsum.photos/seed/fiberbox/320/240',
    boundary: 'grave',
    functionalUnit: '只',
    conversionFactor: 1,
    conversionUnit: '只',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    method: 'ISO 14067:2018；GB/T 24067-2024',
    lifecycleStages: [
      { name: '原材料获取', included: true },
      { name: '生产', included: true },
      { name: '运输/交付', included: true },
      { name: '生命末期', included: true },
    ],
    /** 演示「企业信息未引用，可现场补录」 */
    enterpriseId: null,
    hasSensitivity: true,
    hasQuality: true,
    baselineVersion: 1,
    baselineCalculatedAt: '2026-09-23 14:05',
    items: [
      {
        id: 'R4-01',
        flowName: '竹纤维浆',
        factorName: '竹纤维浆',
        unit: 'kg',
        activity: 8.4,
        factorValue: 0.5,
        factorSource: '中国官方排放因子库 V1.0 数据库：竹纤维浆',
        stagePath: '原材料获取-原材料获取',
      },
      {
        id: 'R4-02',
        flowName: '电力（外购）',
        factorName: '福建省电网平均排放因子',
        unit: 'kWh',
        activity: 42,
        factorValue: 0.581,
        factorSource: '中国官方排放因子库 V1.0 数据库：电力排放因子',
        stagePath: '生产-生产',
      },
      {
        id: 'R4-03',
        flowName: '成品运输',
        factorName: '公路货运（柴油，12t 以上）',
        unit: 't·km',
        activity: 0.3,
        factorValue: 0.104,
        factorSource: '中国官方排放因子库 V1.0 数据库：公路货运',
        stagePath: '运输/交付',
      },
    ],
  },
]

/* ============ 计算引擎 ============ */

function round(value: number, digits = 6): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

/** 由上游清单项计算核算结果（PcfCalcResult） */
function computeCalcResult(source: ReportSourceProject): PcfCalcResult {
  const details: PcfResultDetail[] = []
  let total = 0
  let biogenic = 0

  source.items.forEach((item) => {
    const emission = round(item.activity * item.factorValue)
    const isBio = !!item.biogenic
    total += emission
    if (isBio) biogenic += emission
    details.push({
      id: item.id,
      operationId: item.stagePath,
      processName: item.stagePath.split('-')[0],
      opName: item.stagePath,
      stage: item.stagePath.split('-')[0],
      flowName: item.flowName,
      flowType: 'material',
      direction: 'input',
      activityText: `${item.activity} ${item.unit}`,
      factorName: item.factorName || '—',
      factorValue: item.factorValue,
      stagePath: item.stagePath,
      factorSource: item.factorSource,
      formulaName: '数量×排放因子',
      emission,
      fossilEmission: isBio ? 0 : emission,
      biogenicEmission: isBio ? emission : 0,
      lulucEmission: 0,
      emissionBreakdown: {
        total: emission,
        fossil: isBio ? 0 : emission,
        biogenic: isBio ? emission : 0,
        luluc: 0,
      },
    })
  })

  total = round(total)
  biogenic = round(biogenic)
  const fossil = round(total - biogenic)
  const caliberEmission: PcfCaliberValues = {
    total,
    fossil,
    biogenic,
    luluc: 0,
  }

  // 阶段汇总（按一级阶段）
  const stageMap = new Map<string, number>()
  details.forEach((d) => {
    stageMap.set(d.stage, (stageMap.get(d.stage) ?? 0) + d.emission)
  })
  const stageSummary: PcfStageSummary[] = Array.from(stageMap.entries())
    .map(([stage, emission]) => ({ stage, emission: round(emission), ratio: 0 }))
    .sort((a, b) => Math.abs(b.emission) - Math.abs(a.emission))
  const absTotal = stageSummary.reduce((sum, s) => sum + Math.abs(s.emission), 0) || 1
  stageSummary.forEach((s) => {
    s.ratio = round((Math.abs(s.emission) / absTotal) * 100, 1)
  })

  const unitEmissionBreakdown: PcfUnitEmission[] = [
    { unit: source.functionalUnit, value: total },
  ]

  return {
    projectId: source.id,
    version: source.baselineVersion,
    calculatedAt: source.baselineCalculatedAt,
    totalEmission: total,
    fossilEmission: fossil,
    biogenicEmission: biogenic,
    lulucEmission: 0,
    caliberEmission,
    unit: source.functionalUnit,
    unitEmission: total,
    unitEmissionBreakdown,
    stageSummary,
    operationSummary: [],
    details,
  }
}

/* ============ 摘要构造（敏感性 / 数据质量） ============ */

function buildSensitivitySummary(source: ReportSourceProject, calc: PcfCalcResult): SensitivitySnapshotSummary | null {
  if (!source.hasSensitivity) return null
  const scenarios =
    source.id === 'PJ-RP01'
      ? [
          { description: '原竹用量 -10%（竹林可持续管理改善，单位产品耗竹下降）', emission: round(calc.totalEmission * 0.895), deltaRateText: '-10.5%' },
          { description: '用胶量 -15%（改性胶替代，减少脲醛树脂胶单耗）', emission: round(calc.totalEmission * 0.961), deltaRateText: '-3.9%' },
        ]
      : source.id === 'PJ-RP03'
        ? [{ description: '生产用电 +20%（新增烘干工序）', emission: round(calc.totalEmission * 1.2), deltaRateText: '+20.0%' }]
        : [{ description: '竹纤维浆因子优化（实测替代缺省值）', emission: round(calc.totalEmission * 0.92), deltaRateText: '-8.0%' }]
  return {
    analysisNo: `PCF-SA-${formatDateOnly(new Date())}001`,
    baselineEmission: calc.totalEmission,
    scenarios,
  }
}

function buildQualitySummary(source: ReportSourceProject): QualitySnapshotSummary | null {
  if (!source.hasQuality) return null
  return {
    assessmentNo: `PCF-DQ-${formatDateOnly(new Date())}001`,
    overallDqr: 2.6,
    overallLevel: 'good',
    qualitative: {
      temporal: '数据年份为 2026 年，与所收集数据的最小时间长度一致，符合代表性要求。',
      geographical: '单元过程数据位于中国福建省，与产品制造地一致。',
      technological: '具体技术为竹制品加工工艺，与所评估产品技术组合一致。',
    },
    conclusion: '数据质量总体良好（DQR≈2.6），关键不确定度来源为电力排放因子与竹材碳汇参数，建议持续更新背景数据。',
  }
}

/* ============ 表格 / 章节构造 ============ */

function buildTables(
  source: ReportSourceProject,
  calc: PcfCalcResult,
  cover: ReportCover,
  sens: SensitivitySnapshotSummary | null,
  qual: QualitySnapshotSummary | null,
  reportId: string,
): ReportTable[] {
  const tables: ReportTable[] = []

  // T01 报告主体基本信息表
  tables.push({
    id: `${reportId}-T01`,
    reportId,
    sectionCode: 'SB',
    tableNo: 'T01',
    title: REPORT_TABLE_TITLE.T01,
    sourceRef: 'enterprise',
    columns: ['单位名称', '统一社会信用代码', '法定代表人', '联系方式', '地址'],
    rows: [
      {
        单位名称: cover.companyName || '（待补录）',
        统一社会信用代码: cover.unifiedSocialCreditCode || '（待补录）',
        法定代表人: cover.legalPerson || '（待补录）',
        联系方式: cover.contactPhone || '（待补录）',
        地址: cover.companyAddress || '（待补录）',
      },
    ],
  })

  // T02~T08 清单结果
  STAGE_TABLES.forEach(({ stagePath, tableNo }) => {
    const rows = calc.details
      .filter((d) => d.stagePath === stagePath)
      .map((d) => ({
        一级过程名称: d.flowName,
        二级过程名称: d.factorName,
        功能单位活动数据: d.activityText,
        次级数据来源说明: d.factorSource || '—',
        '结果 (kgCO₂eq.)': formatEmission(d.emission),
      }))
    if (rows.length === 0) return
    tables.push({
      id: `${reportId}-${tableNo}`,
      reportId,
      sectionCode: 'S3',
      tableNo,
      title: REPORT_TABLE_TITLE[tableNo],
      sourceRef: 'details',
      columns: ['一级过程名称', '二级过程名称', '功能单位活动数据', '次级数据来源说明', '结果 (kgCO₂eq.)'],
      rows,
      emptyText: '本阶段无核算数据',
    })
  })

  // T09 细分指标
  tables.push({
    id: `${reportId}-T09`,
    reportId,
    sectionCode: 'S4',
    tableNo: 'T09',
    title: REPORT_TABLE_TITLE.T09,
    sourceRef: 'caliberEmission',
    columns: ['气候变化指标', 'kgCO₂eq.'],
    rows: [
      { 气候变化指标: '气候变化：总计（不含生物源CO₂）– GWP100', 'kgCO₂eq.': formatEmission(calc.caliberEmission!.total) },
      { 气候变化指标: '气候变化：生物（不含CO₂）– GWP100', 'kgCO₂eq.': formatEmission(calc.caliberEmission!.biogenic) },
      { 气候变化指标: '气候变化，直接土地利用变化 – GWP100', 'kgCO₂eq.': formatEmission(calc.caliberEmission!.luluc) },
    ],
  })

  // T10 生命周期各阶段
  tables.push({
    id: `${reportId}-T10`,
    reportId,
    sectionCode: 'S4',
    tableNo: 'T10',
    title: REPORT_TABLE_TITLE.T10,
    sourceRef: 'stageSummary',
    columns: ['生命周期阶段', '功能单位碳足迹结果 (kgCO₂eq.)', '百分比', '细分项'],
    rows: calc.stageSummary.map((s) => ({
      生命周期阶段: s.stage,
      '功能单位碳足迹结果 (kgCO₂eq.)': formatEmission(s.emission),
      百分比: formatPercent(s.ratio),
      细分项: '',
    })),
    totalRow: {
      生命周期阶段: '总计',
      '功能单位碳足迹结果 (kgCO₂eq.)': formatEmission(calc.totalEmission),
      百分比: '100.0%',
      细分项: '',
    },
  })

  // T11 敏感性分析
  if (sens) {
    const rows = [
      { '敏感性分析（情景）': '基准情景', '碳足迹结果 kgCO₂eq.': formatEmission(sens.baselineEmission), 变化率: '--' },
      ...sens.scenarios.map((s) => ({
        '敏感性分析（情景）': s.description,
        '碳足迹结果 kgCO₂eq.': formatEmission(s.emission),
        变化率: s.deltaRateText,
      })),
    ]
    tables.push({
      id: `${reportId}-T11`,
      reportId,
      sectionCode: 'S5',
      tableNo: 'T11',
      title: REPORT_TABLE_TITLE.T11,
      sourceRef: 'sensitivity',
      columns: ['敏感性分析（情景）', '碳足迹结果 kgCO₂eq.', '变化率'],
      rows,
    })
  }

  // T12 数据质量评分依据（固定文案）
  tables.push({
    id: `${reportId}-T12`,
    reportId,
    sectionCode: 'SA',
    tableNo: 'T12',
    title: REPORT_TABLE_TITLE.T12,
    sourceRef: 'fixed',
    columns: ['评分', '时间代表性（TiR）', '技术代表性（TeR）', '地理代表性（GeR）'],
    rows: [
      { 评分: '1', '时间代表性（TiR）': '基准年在数据集有效期内；与最新发布年相差 ≤3 年', '技术代表性（TeR）': '核算过程技术与数据集代表技术一致', '地理代表性（GeR）': '在数据集代表的国家省市或区域内' },
      { 评分: '2', '时间代表性（TiR）': '与有效期相差 ≤2 年；与最新发布年相差 ≤4 年', '技术代表性（TeR）': '包含在数据集组合技术中，工艺存在一定差异', '地理代表性（GeR）': '在数据集代表的国家' },
      { 评分: '3', '时间代表性（TiR）': '与有效期相差 ≤3 年；与最新发布年相差 ≤5 年', '技术代表性（TeR）': '包含在数据集组合技术中，工艺差异显著', '地理代表性（GeR）': '在数据集代表的地理区域之一' },
      { 评分: '4', '时间代表性（TiR）': '与有效期相差 ≤4 年；与最新发布年相差 ≤6 年', '技术代表性（TeR）': '技术与数据集代表技术相似', '地理代表性（GeR）': '与数据集代表地理区域能源结构相似' },
      { 评分: '5', '时间代表性（TiR）': '与有效期相差 >4 年；与最新发布年相差 >6 年', '技术代表性（TeR）': '技术与数据集代表技术不同', '地理代表性（GeR）': '不满足上述情况' },
    ],
  })

  return tables
}

function buildSections(
  source: ReportSourceProject,
  calc: PcfCalcResult,
  cover: ReportCover,
  sens: SensitivitySnapshotSummary | null,
  qual: QualitySnapshotSummary | null,
  tables: ReportTable[],
  reportId: string,
): ReportSection[] {
  const findTables = (code: string) => tables.filter((t) => t.sectionCode === code)
  const hotStage = calc.stageSummary[0]
  const sections: ReportSection[] = []

  sections.push({
    id: `${reportId}-S00`,
    reportId,
    sectionCode: 'S00',
    sectionTitle: '封面',
    sectionType: 'auto',
    content: '',
    order: 0,
    tables: [],
    figures: [],
    blankFlag: false,
  })

  sections.push({
    id: `${reportId}-SB`,
    reportId,
    sectionCode: 'SB',
    sectionTitle: '产品碳足迹基本信息表',
    sectionType: 'auto',
    content: `结论：${cover.conclusion}`,
    order: 1,
    tables: findTables('SB'),
    figures: [],
    blankFlag: false,
  })

  sections.push({
    id: `${reportId}-ST`,
    reportId,
    sectionCode: 'ST',
    sectionTitle: '目录',
    sectionType: 'auto',
    content: '一、报告概括\n二、报告主体基本情况\n三、清单结果及计算\n四、碳足迹计算结果\n五、敏感性分析\n六、数据质量评价\n七、结论\n附录 数据质量评价',
    order: 2,
    tables: [],
    figures: [],
    blankFlag: false,
  })

  sections.push({
    id: `${reportId}-S1`,
    reportId,
    sectionCode: 'S1',
    sectionTitle: '一、报告概括',
    sectionType: 'fixed',
    content:
      '产品碳足迹（Product Carbon Footprint，PCF）是指某个产品在其生命周期过程中所释放的直接和间接的温室气体总量。开展碳足迹评价能够最大限度实现资源节约和温室气体减排。本次评价主要目的：① 评估产品在现有生命周期内的温室气体排放；② 确定对碳足迹有显著影响的工序环节并加以改进。',
    order: 3,
    tables: [],
    figures: [],
    blankFlag: false,
  })

  sections.push({
    id: `${reportId}-S2`,
    reportId,
    sectionCode: 'S2',
    sectionTitle: '二、报告主体基本情况',
    sectionType: 'auto',
    content:
      '（一）生产者信息见基本信息表（表 1）。\n（二）产品信息：产品功能单位按声明选取，工艺流程见下图。\n（三）系统边界：本报告采用「' +
      cover.systemBoundary +
      '」原则，纳入阶段包括 ' +
      source.lifecycleStages.filter((s) => s.included).map((s) => s.name).join('、') +
      '。\n（四）取舍准则：可舍弃产品碳足迹影响小于 5% 的环节，但舍弃环节总环境影响不应超过总量 5%。\n（五）局限性说明：本报告结果仅体现温室气体影响，其他类型环境影响未开展。',
    order: 4,
    tables: [],
    figures: [
      {
        id: `${reportId}-F1`,
        reportId,
        figureNo: 'F1',
        caption: REPORT_FIGURE_TITLE.F1,
        figureKind: 'image',
        content: source.productImageUrl,
        placeholder: false,
      },
    ],
    blankFlag: false,
  })

  sections.push({
    id: `${reportId}-S3`,
    reportId,
    sectionCode: 'S3',
    sectionTitle: '三、清单结果及计算',
    sectionType: 'auto',
    content:
      '数据来源采用 Ecoinvent 3.11 / CPCD 等数据库，特征化方法 IPCC 2021 GWP100；活动数据与排放系数以科学计数法 4 位有效数字呈现。下表按生命周期阶段列示清单结果。',
    order: 5,
    tables: findTables('S3'),
    figures: [],
    blankFlag: false,
  })

  sections.push({
    id: `${reportId}-S4`,
    reportId,
    sectionCode: 'S4',
    sectionTitle: '四、碳足迹计算结果',
    sectionType: 'auto',
    content: `根据表 9 计算结果，得到每功能单位产品产生碳足迹 ${formatEmission(calc.totalEmission)}kgCO₂eq.。`,
    order: 6,
    tables: findTables('S4'),
    figures: [
      {
        id: `${reportId}-F2`,
        reportId,
        figureNo: 'F2',
        caption: REPORT_FIGURE_TITLE.F2,
        figureKind: 'chartPlaceholder',
        content: '',
        placeholder: true,
      },
    ],
    blankFlag: false,
  })

  sections.push({
    id: `${reportId}-S5`,
    reportId,
    sectionCode: 'S5',
    sectionTitle: '五、敏感性分析',
    sectionType: 'autoBlank',
    content: sens ? '下表列示各情景基于基准情景的碳足迹变化率。' : '本项目未开展敏感性分析。',
    order: 7,
    tables: findTables('S5'),
    figures: [],
    blankFlag: !sens,
  })

  sections.push({
    id: `${reportId}-S6`,
    reportId,
    sectionCode: 'S6',
    sectionTitle: '六、数据质量评价',
    sectionType: 'autoBlank',
    content: qual
      ? `数据质量评价结果：整体 DQR ≈ ${qual.overallDqr}（${qual.overallLevel}）。${qual.conclusion}`
      : '本项目未开展数据质量评价。',
    order: 8,
    tables: [],
    figures: [],
    blankFlag: !qual,
  })

  sections.push({
    id: `${reportId}-S7`,
    reportId,
    sectionCode: 'S7',
    sectionTitle: '七、结论',
    sectionType: 'auto',
    content: cover.conclusion,
    order: 9,
    tables: [],
    figures: [],
    blankFlag: false,
  })

  sections.push({
    id: `${reportId}-SA`,
    reportId,
    sectionCode: 'SA',
    sectionTitle: '附录 数据质量评价',
    sectionType: 'fixed',
    content:
      '数据质量评价采用时间序列代表性（TiR）、技术代表性（TeR）、地理代表性（GeR）三维度评分（1~5），加权计算得到数据质量指数 DQR；DQR ≤ 3.0 表示数据质量良好。附表 12 为评分依据。',
    order: 10,
    tables: findTables('SA'),
    figures: [],
    blankFlag: false,
  })

  return sections
}

/* ============ 装配主函数 ============ */

function assembleReport(source: ReportSourceProject, status: PcfFootprintReport['status']): PcfFootprintReport {
  const calc = computeCalcResult(source)
  // 企业信息：按来源核算项目引用的企业信息库记录装配（R-104）；无引用 → 空值，报告内「待补录」
  const enterprise = resolveEnterpriseInfo(source.enterpriseId)
  const enterpriseInfo: EnterpriseInfo = enterprise ? { ...emptyEnterprise, ...enterprise } : { ...emptyEnterprise }
  const now = formatNow()
  const dateOnly = formatDateOnly(new Date())
  const reportId = `RPT-${source.id}`
  const reportNo = makeReportNo(reportSeq)
  const fileName = makeReportFileName(source.productName)

  const lifecycleBoundary = source.lifecycleStages
    .filter((s) => s.included)
    .map((s) => `${s.name} ☑`)
    .concat(source.lifecycleStages.filter((s) => !s.included).map((s) => `${s.name} ☐`))
    .join('  ')

  const hotStageText = calc.stageSummary[0]
  const conclusion =
    `${enterpriseInfo.companyName || '报告主体'}在 ${source.startDate} - ${source.endDate} 生产的 ` +
    `${source.productName} 产品全生命周期的每功能单位产品产生的碳足迹为 ${formatEmission(calc.totalEmission)}kgCO₂eq.` +
    (hotStageText ? `，其中 ${hotStageText.stage} 贡献占比最大（${formatPercent(hotStageText.ratio)}%）。` : '。')

  const cover: ReportCover = {
    companyName: enterpriseInfo.companyName,
    companyAddress: enterpriseInfo.companyAddress,
    unifiedSocialCreditCode: enterpriseInfo.unifiedSocialCreditCode,
    legalPerson: enterpriseInfo.legalPerson,
    contactPhone: enterpriseInfo.contactPhone,
    issuer: enterpriseInfo.issuer,
    reportDate: enterpriseInfo.reportDate,
    productName: source.productName,
    productSpecModel: source.productSpecModel,
    generatedLabel: `${source.productName}产品碳足迹报告`,
    statisticalPeriod: `${source.startDate} ~ ${source.endDate}`,
    systemBoundary: boundaryText(source.boundary),
    lifecycleBoundary,
    reportUnit: `1 ${source.functionalUnit}`,
    standardBasis: source.method,
    reportWriteDate: dateOnly,
    reportNo,
    conclusion,
  }

  const sens = buildSensitivitySummary(source, calc)
  const qual = buildQualitySummary(source)

  const tables = buildTables(source, calc, cover, sens, qual, reportId)
  const sections = buildSections(source, calc, cover, sens, qual, tables, reportId)

  const snapshot: ReportSnapshot = {
    id: `${reportId}-SNP`,
    reportId,
    projectSnapshot: {
      id: source.id,
      code: source.code,
      name: source.name,
      boundary: source.boundary,
      method: source.method,
    },
    productSnapshot: {
      productName: source.productName,
      productSpec: source.productSpec,
      productImageUrl: source.productImageUrl,
      processes: source.lifecycleStages.filter((s) => s.included).map((s) => s.name),
    },
    calcResultSnapshot: calc,
    sensitivitySnapshot: sens,
    qualitySnapshot: qual,
    enterpriseSnapshot: enterpriseInfo,
    snapshotAt: now,
  }

  return {
    id: reportId,
    reportNo,
    sourceProjectId: source.id,
    sourceProjectName: source.name,
    sourceProjectNo: source.code,
    productName: source.productName,
    productSpec: source.productSpec,
    templateId: 'RPT-PCF-ZB13002-001',
    templateName: '产品碳足迹报告（ZB13002 整竹砧板模板）',
    templateVersion: 'V1.0',
    status,
    sourceCalcVersion: source.baselineVersion,
    sourceSensitivityId: sens ? sens.analysisNo : null,
    sourceQualityId: qual ? qual.assessmentNo : null,
    generatedAt: status === 'reportGenerating' ? '' : now,
    staleReason: '',
    fileName,
    previewUrl: `/report/prepare/${reportId}`,
    downloadUrl: `/report/prepare/${reportId}/download`,
    sourceDeleted: false,
    sourceEnterpriseId: source.enterpriseId,
    cover,
    sections,
    snapshot,
    createdBy: '张核算',
    createdAt: now,
    updatedBy: '张核算',
    updatedAt: now,
  }
}

/* ============ 服务 ============ */

let reportSeq = 1
let reportStore: PcfFootprintReport[] = []

function seed(): PcfFootprintReport[] {
  reportSeq = 1
  const built = sourceProjects.map((source) => {
    const status: PcfFootprintReport['status'] = source.id === 'PJ-RP03' ? 'reportStale' : 'reportReady'
    const report = assembleReport(source, status)
    if (status === 'reportStale') report.staleReason = '新核算版本'
    // 已生成样本补一个默认报告日期，使封面更完整
    report.cover.reportDate = '2026-10-15'
    report.cover.issuer = resolveEnterpriseInfo(source.enterpriseId)?.companyName ?? ''
    report.snapshot.enterpriseSnapshot.reportDate = report.cover.reportDate
    report.snapshot.enterpriseSnapshot.issuer = report.cover.issuer
    reportSeq += 1
    return report
  })
  return built
}

reportStore = seed()

function cloneReport(report: PcfFootprintReport): PcfFootprintReport {
  return JSON.parse(JSON.stringify(report))
}

/** 列表 + 查询（Demo §3） */
export function fetchReports(query?: {
  productName?: string
  status?: PcfFootprintReport['status'] | ''
  generatedRange?: [string, string] | null
}): Promise<PcfFootprintReport[]> {
  const kw = (query?.productName ?? '').trim().toLowerCase()
  const status = query?.status ?? ''
  const list = reportStore
    .filter((item) => {
      if (kw && !item.productName.toLowerCase().includes(kw)) return false
      if (status && item.status !== status) return false
      return true
    })
    .slice()
    .sort((a, b) => (b.generatedAt || '').localeCompare(a.generatedAt || ''))
  return delay(160).then(() => list.map(cloneReport))
}

/** 详情 */
export function fetchReportDetail(id: string): Promise<PcfFootprintReport> {
  const target = reportStore.find((item) => item.id === id)
  if (!target) return delay(120).then(() => Promise.reject(new Error('报告不存在或已被删除')))
  return delay(160).then(() => cloneReport(target))
}

/** 新增弹窗候选（仅「已核算」项目） */
export function fetchCalculatedProjectsForReport(): Promise<ReportProjectOption[]> {
  const list = sourceProjects.map((item) => ({
    id: item.id,
    name: item.name,
    code: item.code,
    productName: item.productName,
    productSpec: item.productSpec,
    boundary: boundaryText(item.boundary),
    functionalUnit: item.functionalUnit,
    statisticalPeriod: `${item.startDate} ~ ${item.endDate}`,
    baselineEmission: 0,
    baselineVersion: item.baselineVersion,
    baselineCalculatedAt: item.baselineCalculatedAt,
    enterpriseId: item.enterpriseId,
    enterpriseName: resolveEnterpriseInfo(item.enterpriseId)?.companyName ?? '',
  }))
  return delay(140).then(() => list)
}

/** 系统预置模板（本期 1 个） */
export function fetchReportTemplates(): Promise<ReportTemplate[]> {
  return delay(100).then(() => [
    {
      templateId: 'RPT-PCF-ZB13002-001',
      templateName: '产品碳足迹报告（ZB13002 整竹砧板模板）',
      applicableBoundary: 'all',
      templateVersion: 'V1.0',
      isPreset: true,
    },
  ])
}

/** 新增报告：先创建编制中草稿，补录封面信息后由用户触发「生成正式报告」 */
export async function generateReport(projectId: string): Promise<PcfFootprintReport> {
  const source = sourceProjects.find((item) => item.id === projectId)
  if (!source) throw new Error('核算项目不存在或未完成核算')
  await delay(1200)
  const report = assembleReport(source, 'reportEditing')
  // 报告引用企业信息库记录（计数 +1）
  noteEnterpriseReportRef(source.enterpriseId, 1)
  reportSeq += 1
  reportStore = [report, ...reportStore]
  return cloneReport(report)
}

/** 重新生成（覆盖当前报告并回到编制中，PRD R-105） */
export async function regenerateReport(id: string): Promise<PcfFootprintReport> {
  const target = reportStore.find((item) => item.id === id)
  if (!target) throw new Error('报告不存在或已被删除')
  await delay(1200)
  const source = sourceProjects.find((item) => item.id === target.sourceProjectId)
  if (!source) throw new Error('来源核算项目已删除，无法重新生成')
  const rebuilt = assembleReport(source, 'reportEditing')
  rebuilt.id = target.id
  rebuilt.reportNo = target.reportNo
  rebuilt.createdAt = target.createdAt
  rebuilt.createdBy = target.createdBy
  // 重新生成覆盖正文，但保留用户在现场引用的企业信息库记录与已填报告日期 / 出具机构，避免引用丢失
  const keptEnterpriseId = target.sourceEnterpriseId
  if (keptEnterpriseId !== rebuilt.sourceEnterpriseId) {
    const applied = keptEnterpriseId ? resolveEnterpriseInfo(keptEnterpriseId) : null
    if (applied) {
      rebuilt.sourceEnterpriseId = keptEnterpriseId
      syncEnterpriseToReport(rebuilt, applied)
    } else {
      noteEnterpriseReportRef(keptEnterpriseId, -1)
      noteEnterpriseReportRef(rebuilt.sourceEnterpriseId, 1)
    }
  }
  if (target.cover.reportDate) {
    rebuilt.cover.reportDate = target.cover.reportDate
    rebuilt.snapshot.enterpriseSnapshot.reportDate = target.cover.reportDate
  }
  if (target.cover.issuer) {
    rebuilt.cover.issuer = target.cover.issuer
    rebuilt.snapshot.enterpriseSnapshot.issuer = target.cover.issuer
  }
  reportStore = reportStore.map((item) => (item.id === id ? rebuilt : item))
  return cloneReport(rebuilt)
}

/** 生成正式报告：报告日期自动取生成时间，不再做封面校验，直接置为 reportReady */
export async function finalizeReport(id: string): Promise<PcfFootprintReport> {
  const target = reportStore.find((item) => item.id === id)
  if (!target) throw new Error('报告不存在或已被删除')
  await delay(600)
  const now = formatNow()
  // 报告模板中的报告日期由系统自动取生成时间（R-104：封面概况自动取值）
  target.cover.reportDate = now.slice(0, 10)
  target.status = 'reportReady'
  target.generatedAt = now
  target.updatedAt = now
  target.updatedBy = '张核算'
  return cloneReport(target)
}

/** 同步企业信息到报告内嵌位置：封面字段 + 基本信息表（表 1） */
function syncEnterpriseToReport(target: PcfFootprintReport, enterprise: EnterpriseInfo): void {
  target.cover.companyName = enterprise.companyName
  target.cover.companyAddress = enterprise.companyAddress
  target.cover.unifiedSocialCreditCode = enterprise.unifiedSocialCreditCode
  target.cover.legalPerson = enterprise.legalPerson
  target.cover.contactPhone = enterprise.contactPhone
  target.cover.issuer = enterprise.issuer
  target.cover.reportDate = enterprise.reportDate
  target.snapshot.enterpriseSnapshot = { ...enterprise }
  // 同步基本信息表（T01）
  const t01 = target.sections.find((s) => s.sectionCode === 'SB')?.tables.find((t) => t.tableNo === 'T01')
  if (t01) {
    t01.rows = [
      {
        单位名称: enterprise.companyName || '（待补录）',
        统一社会信用代码: enterprise.unifiedSocialCreditCode || '（待补录）',
        法定代表人: enterprise.legalPerson || '（待补录）',
        联系方式: enterprise.contactPhone || '（待补录）',
        地址: enterprise.companyAddress || '（待补录）',
      },
    ]
  }
}

/** 引用企业信息库记录到报告（R-104：读取『企业信息维护』并允许继续编辑） */
export async function applyEnterpriseFromLibrary(id: string, enterpriseId: string): Promise<PcfFootprintReport> {
  const target = reportStore.find((item) => item.id === id)
  if (!target) throw new Error('报告不存在或已被删除')
  const enterprise = resolveEnterpriseInfo(enterpriseId)
  if (!enterprise) throw new Error('企业信息不存在或已被删除')
  await delay(200)
  // 引用切换：先释放原引用、再登记新引用
  if (target.sourceEnterpriseId !== enterpriseId) {
    noteEnterpriseReportRef(target.sourceEnterpriseId, -1)
    noteEnterpriseReportRef(enterpriseId, 1)
    target.sourceEnterpriseId = enterpriseId
  }
  syncEnterpriseToReport(target, enterprise)
  target.updatedAt = formatNow()
  target.updatedBy = '张核算'
  return cloneReport(target)
}

/** 保存 / 补录企业信息（R-104 例外，仅写本报告快照，不回写主链） */
export async function saveReportEnterprise(
  id: string,
  enterprise: EnterpriseInfo,
): Promise<void> {
  const target = reportStore.find((item) => item.id === id)
  if (!target) throw new Error('报告不存在或已被删除')
  await delay(200)
  syncEnterpriseToReport(target, enterprise)
  target.updatedAt = formatNow()
  target.updatedBy = '张核算'
}

/** 保存封面非企业字段（产品名称 / 规格型号等；不回写主链） */
export async function saveReportCover(
  id: string,
  patch: Partial<ReportCover>,
): Promise<void> {
  const target = reportStore.find((item) => item.id === id)
  if (!target) throw new Error('报告不存在或已被删除')
  await delay(200)
  Object.assign(target.cover, patch)
  if (patch.productName !== undefined) {
    target.productName = patch.productName
    target.fileName = makeReportFileName(patch.productName)
  }
  if (patch.productSpecModel !== undefined) {
    target.productSpec = patch.productSpecModel
  }
  // 同步结论中的产品名称（简单替换）
  const conclusionSection = target.sections.find((s) => s.sectionCode === 'S7')
  if (conclusionSection && patch.productName !== undefined) {
    conclusionSection.content = target.cover.conclusion
  }
  target.updatedAt = formatNow()
  target.updatedBy = '张核算'
}

/** 删除报告 */
export async function deleteReport(id: string): Promise<void> {
  const target = reportStore.find((item) => item.id === id)
  if (!target) throw new Error('报告不存在或已被删除')
  await delay(260)
  // 释放企业信息库引用（计数 -1）
  noteEnterpriseReportRef(target.sourceEnterpriseId, -1)
  reportStore = reportStore.filter((item) => item.id !== id)
}

/**
 * 导出报告（原型：以前端拼 HTML → Blob 下载为 .docx，PRD R-117）。
 * 真实环境由后台渲染 docx，此处仅演示下载链路。
 */
export async function exportReport(id: string): Promise<{ fileName: string; blob: Blob }> {
  const target = reportStore.find((item) => item.id === id)
  if (!target) throw new Error('报告不存在或已被删除')
  await delay(400)
  const html = reportToHtml(target)
  const blob = new Blob([html], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
  return { fileName: target.fileName, blob }
}

/** 报告 → HTML（导出 / 预览源共用） */
export function reportToHtml(report: PcfFootprintReport): string {
  const c = report.cover
  const rows = (table: ReportTable) =>
    `<table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%"><thead><tr>${table.columns
      .map((col) => `<th>${col}</th>`)
      .join('')}</tr></thead><tbody>${table.rows
      .map((r) => `<tr>${table.columns.map((col) => `<td>${r[col] ?? ''}</td>`).join('')}</tr>`)
      .join('')}</tbody></table>`
  const sections = report.sections
    .map((s) => {
      const body = s.content ? `<p>${s.content.replace(/\n/g, '<br/>')}</p>` : ''
      const tables = s.tables.map((t) => `<h4>${t.title}</h4>${rows(t)}`).join('')
      return `<section><h3>${s.sectionTitle}</h3>${body}${tables}</section>`
    })
    .join('')
  return `<html><head><meta charset="utf-8"><title>${c.generatedLabel}</title></head><body><h1>${c.companyName} ${c.generatedLabel}</h1><p>报告日期：${c.reportDate}</p>${sections}</body></html>`
}
