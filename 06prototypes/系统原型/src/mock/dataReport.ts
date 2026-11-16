import type { Boundary, CarbonRecord } from '@/types/dataset'
import type {
  DataReport,
  DatasetAuditLog,
  DatasetVersion,
  IndustryDatasetSnapshot,
  NormalizedReportFields,
  PublicDatabaseRow,
  PublicDatabaseSnapshot,
  ReportStageValue,
  ReportStatus,
  ReportTrace,
} from '@/types/dataReport'
import { buildStages } from './baselines'
import { archiveReportRecord, fetchRecords, supersedeRecord } from './dataset'
import { CURRENT_TENANT_ID } from './member'
import { peekTenant, regionTextOfValue } from './tenant'

/**
 * 企业数据上报 / 平台数据审核 / 公共数据库 Mock 服务。
 *
 * 设计要点：
 * 1. 上报单只承载「脱敏后的核算结果」——活动数据（耗电量 / 钢材用量等）在生成上报单时即被丢弃；
 * 2. 平台不做自动异常判定、不提供标准化编辑：审核仅能通过入库或驳回退回企业；
 * 3. 审核通过 → 按企业上报原值写入行业数据集；同一上报单重报通过时更新原记录；
 * 4. 入库统一脱敏：企业名 / 联系人 / 项目号不落库，只保留「某华东地区企业」这类区域标签；
 * 5. 版本为全局快照（不是单条数据版本），操作日志记录入库 / 驳回 / 发布等关键动作。
 */

const OPERATOR_ENTERPRISE = '林舟'
const OPERATOR_PLATFORM = '平台审核员'
const ORG_ID = '福建竹业集团'
/** 核算标准默认快照（核算项目「目标与范围」带出） */
const STANDARD_DEFAULT = { no: 'GB/T 24067-2024', name: '产品碳足迹 量化要求和指南' }

/**
 * 当前登录企业档案：直接读取「系统管理 → 租户信息」中本租户的档案。
 *
 * - 企业名称取租户名称；
 * - 所属区域取扩展档案「所在地区」region_code（省,市,区 编码），转为「省 / 市 / 区」路径；
 * - 详细地址取扩展档案 address。
 *
 * 租户信息页保存后立即生效，企业上报打开表单时按最新档案带出；
 * 企业可在本次上报中修改区域，修改只影响上报单，不回写租户档案。
 */
export interface CurrentEnterprise {
  orgId: string
  orgName: string
  /** 所在地址区划：省 / 市 / 区（与 REGION_TREE 的 value 口径一致） */
  regionName: string
  /** 详细地址 */
  address: string
}

export function currentEnterpriseProfile(): CurrentEnterprise {
  const tenant = peekTenant(CURRENT_TENANT_ID)
  return {
    orgId: tenant?.id ?? CURRENT_TENANT_ID,
    orgName: tenant?.name ?? ORG_ID,
    regionName: regionTextOfValue(tenant?.profile.region_code ?? ''),
    address: tenant?.profile.address ?? '',
  }
}

/** 当前企业默认区域（上报表单初始值 / 服务端兜底共用） */
export function currentEnterpriseRegion(): string {
  return currentEnterpriseProfile().regionName
}

/* ============================ 工具 ============================ */

const delay = (ms = 200) => new Promise<void>((resolve) => setTimeout(resolve, ms))
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

function pad(value: number, len = 2): string {
  return String(value).padStart(len, '0')
}

function nowText(): string {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`
}

let traceSeq = 0
function makeTrace(
  action: ReportTrace['action'],
  operator: string,
  at: string,
  extra: Partial<ReportTrace> = {},
): ReportTrace {
  traceSeq += 1
  return { id: `TR-${pad(traceSeq, 4)}`, at, operator, action, ...extra }
}

let logSeq = 0
function makeLog(
  action: DatasetAuditLog['action'],
  operator: string,
  target: string,
  at: string,
  extra: Partial<DatasetAuditLog> = {},
): DatasetAuditLog {
  logSeq += 1
  return { id: `LOG-${pad(logSeq, 4)}`, at, operator, action, target, ...extra }
}

/** 阶段结果（仅数值，不含任何活动数据） */
function stagesOf(boundary: Boundary, values: Record<string, number>): ReportStageValue[] {
  const total = Object.values(values).reduce((sum, v) => sum + v, 0)
  return buildStages(boundary).map((stage) => {
    const emission = values[stage.stageCode] ?? 0
    return {
      stageCode: stage.stageCode,
      stageName: stage.stageName,
      stageLevel: stage.stageLevel,
      parentStageCode: stage.parentStageCode,
      stageEmission: emission,
      stageShare: total > 0 ? Math.round((emission / total) * 1000) / 10 : 0,
    }
  })
}

/** 区域 → 大区（入库脱敏标签用） */
const REGION_GROUP: Record<string, string> = {
  福建省: '华东',
  浙江省: '华东',
  江西省: '华东',
  江苏省: '华东',
  安徽省: '华东',
  上海市: '华东',
  山东省: '华东',
  广东省: '华南',
  广西壮族自治区: '华南',
  海南省: '华南',
  北京市: '华北',
  天津市: '华北',
  河北省: '华北',
  河南省: '华中',
  湖北省: '华中',
  湖南省: '华中',
  四川省: '西南',
  重庆市: '西南',
  云南省: '西南',
  陕西省: '西北',
  辽宁省: '东北',
}

export function regionGroupOf(regionName: string): string {
  // 区域可能为「省 / 市 / 区」三级路径，按省级判断大区
  const province = regionName.split(/\s*\/\s*/)[0]
  return REGION_GROUP[province] ?? '其他'
}

/** 脱敏标签：某华东地区企业 */
export function maskedOrgLabel(regionName: string): string {
  return `某${regionGroupOf(regionName)}地区企业`
}

/* 平台审核不做自动异常数据判定，也不提供标准化编辑。 */

/* ============================ 种子数据 ============================ */

interface SeedSpec {
  id: string
  reportNo: string
  sourceRecordId: string
  sourceRecordNo: string
  sourceProjectNo?: string
  resultVersion: number
  productName: string
  productCode: string
  categoryName: string
  categoryPath: string
  industryCode: string
  industryName: string
  industryPath: string
  processes: string[]
  boundary: Boundary
  period: [string, string]
  unitCode: string
  standardNo?: string
  standardName?: string
  total: number
  stages: Record<string, number>
  hidden: number
  region: string
  qualityNote: string
  status: ReportStatus
  created: string
  updated: string
  submittedAt?: string
  reviewedAt?: string
  reviewer?: string
  rejectReason?: string
  archivedRecordId?: string
  datasetVersion?: string
  archivedAt?: string
  traces: ReportTrace[]
}

const GWP_DEFAULT = 'IPCC AR6 GWP100'

const SEEDS: SeedSpec[] = [
  {
    id: 'RPT-0001',
    reportNo: 'RPT-2026-0001',
    sourceRecordId: 'DS-008',
    sourceRecordNo: 'CR-2025-0008',
    sourceProjectNo: 'PCF-2025-008',
    resultVersion: 2,
    productName: '重竹地板 900×120',
    productCode: 'P-DB-001',
    categoryName: '竹地板',
    categoryPath: '林产加工 / 竹质板材 / 竹地板',
    industryCode: 'C2021',
    industryName: '纤维板制造',
    industryPath: '制造业 / 人造板制造 / 纤维板制造',
    processes: ['竹材热压', '涂装'],
    boundary: 'gate',
    period: ['2025-01-01', '2025-12-31'],
    unitCode: 'm²',
    total: 2.1043,
    stages: { g1: 0.821, g2: 1.2833 },
    hidden: 6,
    region: '福建省',
    qualityNote: '实测计量，电表与蒸汽流量计读数，数据质量等级 DQR 2 级',
    status: 'archived',
    created: '2026-10-08 09:20',
    updated: '2026-10-10 15:40',
    submittedAt: '2026-10-09 10:05',
    reviewedAt: '2026-10-10 15:40',
    reviewer: OPERATOR_PLATFORM,
    archivedRecordId: 'DS-RPT-01',
    archivedAt: '2026-10-10 15:40',
    traces: [
      makeTrace('submit', OPERATOR_ENTERPRISE, '2026-10-09 10:05', { note: '提交平台审核' }),
      makeTrace('review', OPERATOR_PLATFORM, '2026-10-10 09:30', { note: '开始审核' }),
      makeTrace('archive', OPERATOR_PLATFORM, '2026-10-10 15:40', { note: '通过并入库（待发版），脱敏为「某华东地区企业」' }),
    ],
  },
  {
    id: 'RPT-0002',
    reportNo: 'RPT-2026-0002',
    sourceRecordId: 'DS-004',
    sourceRecordNo: 'CR-2025-0004',
    sourceProjectNo: 'PCF-2025-004',
    resultVersion: 2,
    productName: '碳化竹筷 240mm',
    productCode: 'P-ZK-002',
    categoryName: '竹制品',
    categoryPath: '林业产品 / 竹制品',
    industryCode: 'C2031',
    industryName: '竹制品制造',
    industryPath: '制造业 / 木材加工 / 竹制品制造',
    processes: ['碳化处理'],
    boundary: 'gate',
    period: ['2024-01-01', '2024-12-31'],
    unitCode: '双',
    total: 6.821,
    stages: { g1: 2.4103, g2: 4.4107 },
    hidden: 4,
    region: '福建省',
    qualityNote: '估算',
    status: 'rejected',
    created: '2026-10-11 14:02',
    updated: '2026-10-12 11:20',
    submittedAt: '2026-10-11 14:30',
    reviewedAt: '2026-10-12 11:20',
    reviewer: OPERATOR_PLATFORM,
    rejectReason: '数据质量说明过于笼统，未说明计量方式与数据来源；请补充计量器具 / 台账出处后重新上报。',
    traces: [
      makeTrace('submit', OPERATOR_ENTERPRISE, '2026-10-11 14:30'),
      makeTrace('reject', OPERATOR_PLATFORM, '2026-10-12 11:20', { note: '数据质量说明不充分' }),
    ],
  },
  {
    id: 'RPT-0003',
    reportNo: 'RPT-2026-0003',
    sourceRecordId: 'DS-013',
    sourceRecordNo: 'CR-2025-0013',
    sourceProjectNo: 'PCF-2025-013',
    resultVersion: 2,
    productName: '竹纤维餐盒 800ml',
    productCode: 'P-CC-001',
    categoryName: '竹纤维制品',
    categoryPath: '林业产品 / 竹制品 / 竹纤维制品',
    industryCode: 'C2031',
    industryName: '竹制品制造',
    industryPath: '制造业 / 木材加工 / 竹制品制造',
    processes: ['竹材冷压'],
    boundary: 'gate',
    period: ['2024-01-01', '2024-12-31'],
    unitCode: '个',
    total: 0.421,
    stages: { g1: 0.1502, g2: 0.2708 },
    hidden: 5,
    region: '江西省',
    qualityNote: '依据 2024 年生产台账与电费单据，分摊系数按产量法计算',
    status: 'reviewing',
    created: '2026-10-26 09:10',
    updated: '2026-10-26 09:12',
    submittedAt: '2026-10-26 09:12',
    traces: [makeTrace('submit', OPERATOR_ENTERPRISE, '2026-10-26 09:12', { note: '提交平台审核' })],
  },
  {
    id: 'RPT-0004',
    reportNo: 'RPT-2026-0004',
    sourceRecordId: 'DS-018',
    sourceRecordNo: 'CR-2025-0018',
    sourceProjectNo: 'PCF-2025-018',
    resultVersion: 2,
    productName: '薄型竹面板 6mm',
    productCode: 'P-JC-003',
    categoryName: '竹集成材',
    categoryPath: '林产加工 / 竹质板材 / 竹集成材',
    industryCode: 'C2021',
    industryName: '纤维板制造',
    industryPath: '制造业 / 人造板制造 / 纤维板制造',
    processes: ['竹材热压', '涂装'],
    boundary: 'gate',
    period: ['2025-01-01', '2025-12-31'],
    unitCode: 'm³',
    total: 14.2104,
    stages: { g1: 5.4021, g2: 8.8083 },
    hidden: 7,
    region: '浙江省',
    qualityNote: '热压工序蒸汽由流量计计量，涂装工序按涂料采购量折算',
    status: 'reviewing',
    created: '2026-10-24 16:40',
    updated: '2026-10-27 09:15',
    submittedAt: '2026-10-24 16:45',
    traces: [
      makeTrace('submit', OPERATOR_ENTERPRISE, '2026-10-24 16:45'),
      makeTrace('review', OPERATOR_PLATFORM, '2026-10-27 09:15', { note: '开始审核' }),
    ],
  },
  {
    id: 'RPT-0005',
    reportNo: 'RPT-2026-0005',
    sourceRecordId: 'DS-016',
    sourceRecordNo: 'CR-2025-0016',
    sourceProjectNo: 'PCF-2025-016',
    resultVersion: 2,
    productName: '竹集成材 18mm',
    productCode: 'P-JC-001',
    categoryName: '竹集成材',
    categoryPath: '林产加工 / 竹质板材 / 竹集成材',
    industryCode: 'C2021',
    industryName: '纤维板制造',
    industryPath: '制造业 / 人造板制造 / 纤维板制造',
    processes: ['竹材热压'],
    boundary: 'gate',
    period: ['2025-01-01', '2025-12-31'],
    unitCode: 'm³',
    total: 24.521,
    stages: { g1: 9.2104, g2: 15.3106 },
    hidden: 6,
    region: '',
    qualityNote: '',
    status: 'draft',
    created: '2026-10-28 10:02',
    updated: '2026-10-28 10:02',
    traces: [makeTrace('create', OPERATOR_ENTERPRISE, '2026-10-28 10:02', { note: '从核算记录自动提取，暂存草稿' })],
  },
  {
    id: 'RPT-0006',
    reportNo: 'RPT-2026-0006',
    sourceRecordId: 'DS-010',
    sourceRecordNo: 'CR-2025-0010',
    sourceProjectNo: 'PCF-2025-010',
    resultVersion: 1,
    productName: '重竹地板 1218×195',
    productCode: 'P-DB-002',
    categoryName: '竹地板',
    categoryPath: '林产加工 / 竹质板材 / 竹地板',
    industryCode: 'C2021',
    industryName: '纤维板制造',
    industryPath: '制造业 / 人造板制造 / 纤维板制造',
    processes: ['竹材热压', '涂装'],
    boundary: 'gate',
    period: ['2025-01-01', '2025-12-31'],
    unitCode: 'm²',
    total: 2.5502,
    stages: { g1: 0.981, g2: 1.5692 },
    hidden: 6,
    region: '浙江省',
    qualityNote: '按生产工单归集能耗，电表分表计量，数据质量等级 DQR 2 级',
    status: 'archived',
    created: '2026-09-18 13:20',
    updated: '2026-09-20 10:00',
    submittedAt: '2026-09-18 13:40',
    reviewedAt: '2026-09-20 10:00',
    reviewer: OPERATOR_PLATFORM,
    archivedRecordId: 'DS-RPT-02',
    archivedAt: '2026-09-20 10:00',
    traces: [
      makeTrace('submit', OPERATOR_ENTERPRISE, '2026-09-18 13:40'),
      makeTrace('archive', OPERATOR_PLATFORM, '2026-09-20 10:00', { note: '通过并入库（待发版）' }),
    ],
  },
  {
    id: 'RPT-0007',
    reportNo: 'RPT-2026-0007',
    sourceRecordId: 'DS-017',
    sourceRecordNo: 'CR-2025-0017',
    sourceProjectNo: 'PCF-2025-017',
    resultVersion: 2,
    productName: '竹集成材 30mm',
    productCode: 'P-JC-002',
    categoryName: '竹集成材',
    categoryPath: '林产加工 / 竹质板材 / 竹集成材',
    industryCode: 'C2021',
    industryName: '纤维板制造',
    industryPath: '制造业 / 人造板制造 / 纤维板制造',
    processes: ['竹材热压'],
    boundary: 'gate',
    period: ['2025-01-01', '2025-12-31'],
    unitCode: 'm³',
    total: 86.4,
    stages: { g1: 31.2, g2: 55.2 },
    hidden: 6,
    region: '福建省',
    qualityNote: '能耗按车间总表分摊，未装分表，分摊系数为估算值',
    status: 'reviewing',
    created: '2026-10-29 08:40',
    updated: '2026-10-29 08:45',
    submittedAt: '2026-10-29 08:45',
    traces: [makeTrace('submit', OPERATOR_ENTERPRISE, '2026-10-29 08:45', { note: '提交平台审核' })],
  },
  {
    id: 'RPT-0008',
    reportNo: 'RPT-2026-0008',
    sourceRecordId: 'DS-009',
    sourceRecordNo: 'CR-2025-0009',
    sourceProjectNo: 'PCF-2025-009',
    resultVersion: 2,
    productName: '重竹地板 900×120（深碳化）',
    productCode: 'P-DB-001',
    categoryName: '竹地板',
    categoryPath: '林产加工 / 竹质板材 / 竹地板',
    industryCode: 'C2021',
    industryName: '纤维板制造',
    industryPath: '制造业 / 人造板制造 / 纤维板制造',
    processes: ['碳化处理', '涂装'],
    boundary: 'gate',
    period: ['2025-01-01', '2025-12-31'],
    unitCode: 'm²',
    total: 2.331,
    stages: { g1: 0.9012, g2: 1.4298 },
    hidden: 6,
    region: '福建省',
    qualityNote: '碳化工序天然气由流量计计量，涂装按涂料用量折算，DQR 2 级',
    status: 'archived',
    created: '2026-09-25 09:05',
    updated: '2026-09-27 16:20',
    submittedAt: '2026-09-25 09:30',
    reviewedAt: '2026-09-27 16:20',
    reviewer: OPERATOR_PLATFORM,
    archivedRecordId: 'DS-RPT-03',
    archivedAt: '2026-09-27 16:20',
    traces: [
      makeTrace('submit', OPERATOR_ENTERPRISE, '2026-09-25 09:30'),
      makeTrace('archive', OPERATOR_PLATFORM, '2026-09-27 16:20', { note: '通过并入库（待发版）' }),
    ],
  },
]

function buildReport(spec: SeedSpec): DataReport {
  const stageValues = stagesOf(spec.boundary, spec.stages)
  const processes = spec.processes
  const report: DataReport = {
    id: spec.id,
    reportNo: spec.reportNo,
    sourceRecordId: spec.sourceRecordId,
    sourceRecordNo: spec.sourceRecordNo,
    sourceProjectNo: spec.sourceProjectNo,
    resultVersion: spec.resultVersion,
    productName: spec.productName,
    productCode: spec.productCode,
    categoryName: spec.categoryName,
    categoryPath: spec.categoryPath,
    industryCode: spec.industryCode,
    industryName: spec.industryName,
    industryPath: spec.industryPath,
    processes,
    boundary: spec.boundary,
    periodStart: spec.period[0],
    periodEnd: spec.period[1],
    unitValue: 1,
    unitCode: spec.unitCode,
    gwpVersion: GWP_DEFAULT,
    standardNo: spec.standardNo ?? STANDARD_DEFAULT.no,
    standardName: spec.standardName ?? STANDARD_DEFAULT.name,
    emissionUnit: 'kgCO₂e',
    totalEmission: spec.total,
    stageValues,
    hiddenActivityCount: spec.hidden,
    regionName: spec.region,
    regionGroup: regionGroupOf(spec.region),
    dataQualityNote: spec.qualityNote,
    orgId: currentEnterpriseProfile().orgId,
    orgName: currentEnterpriseProfile().orgName,
    contactName: OPERATOR_ENTERPRISE,
    status: spec.status,
    createdAt: spec.created,
    updatedAt: spec.updated,
    submittedAt: spec.submittedAt,
    reviewedAt: spec.reviewedAt,
    reviewer: spec.reviewer,
    rejectReason: spec.rejectReason,
    archivedRecordId: spec.archivedRecordId,
    archivedAt: spec.archivedAt,
    datasetVersion: spec.datasetVersion,
    stale: false,
    auditFlags: [],
    normalized: {
      productName: spec.productName,
      categoryName: spec.categoryName,
      industryName: spec.industryName,
      boundary: spec.boundary,
      unitCode: spec.unitCode,
      regionName: spec.region,
      totalEmission: spec.total,
      stageValues: stageValues.map((s) => ({
        stageCode: s.stageCode,
        stageName: s.stageName,
        stageEmission: s.stageEmission,
      })),
      dataQualityNote: spec.qualityNote,
    },
    traces: spec.traces,
  }
  return report
}

let store: DataReport[] = SEEDS.map(buildReport)

/* ============================ 版本与日志种子 ============================ */

let versionStore: DatasetVersion[] = [
  {
    id: 'VER-003',
    version: 'V1.0',
    recordCount: 42,
    reportCount: 3,
    industryCount: 2,
    publishedAt: '2026-09-15 10:00',
    publishedBy: OPERATOR_PLATFORM,
    remark: '2026 Q3 季度快照：清洗后全量定格，供行业对标与报告引用',
    status: 'current',
  },
  {
    id: 'VER-002',
    version: 'V0.9',
    recordCount: 18,
    reportCount: 2,
    industryCount: 2,
    publishedAt: '2026-07-01 10:00',
    publishedBy: OPERATOR_PLATFORM,
    remark: '2026 Q2 季度快照',
    status: 'history',
  },
  {
    id: 'VER-001',
    version: 'V0.8',
    recordCount: 11,
    reportCount: 1,
    industryCount: 2,
    publishedAt: '2026-04-01 10:00',
    publishedBy: OPERATOR_PLATFORM,
    remark: '首次发布（试运行）',
    status: 'history',
  },
]

/** 操作日志：最新的在最前（列表直接按数组顺序展示） */
let logStore: DatasetAuditLog[] = [
  makeLog('reject', OPERATOR_PLATFORM, 'RPT-2026-0002', '2026-10-12 11:20', { note: '数据质量说明不充分' }),
  makeLog('archive', OPERATOR_PLATFORM, 'RPT-2026-0001', '2026-10-10 15:40', { note: '通过入库，企业标识脱敏为「某华东地区企业」' }),
  makeLog('publish', OPERATOR_PLATFORM, 'V1.0', '2026-09-15 10:00', { note: '发布全局版本快照，清洗后有效记录定格' }),
  makeLog('archive', OPERATOR_PLATFORM, 'RPT-2026-0008', '2026-09-27 16:20', { note: '通过入库' }),
]

/* ============================ 运行时校验刷新 ============================ */

interface CtxRecord {
  id: string
  recordNo: string
  categoryName: string
  boundary: Boundary
  unitCode: string
  emissionUnit?: string
  totalEmission: number
  status: string
  periodStart: string
  periodEnd: string
  resultVersion?: number
  sourceProjectId?: string
  sourceReportId?: string
  hiddenActivityCount?: number
  processes: { name: string }[]
  stageValues: ReportStageValue[]
}

async function loadContext(): Promise<CtxRecord[]> {
  return (await fetchRecords()) as unknown as CtxRecord[]
}

/** 刷新单条上报单的「数据已更新」标记；平台审核不做自动异常判定 */
function refreshReport(report: DataReport, records: CtxRecord[]): void {
  const linked = records.find((r) => r.id === report.sourceRecordId)
  // 源记录被重算置「已替代」时，自动改绑同项目的最新有效记录，避免重报被 active 校验拦住
  const source =
    linked && linked.status !== 'active' && linked.sourceProjectId
      ? records
          .filter((r) => r.status === 'active' && r.sourceProjectId === linked.sourceProjectId)
          .sort((a, b) => (b.resultVersion ?? 1) - (a.resultVersion ?? 1))[0] ?? linked
      : linked
  if (source && source.id !== report.sourceRecordId) {
    report.sourceRecordId = source.id
    report.sourceRecordNo = source.recordNo
  }
  if (source) {
    // 「数据已更新」以核算结果版本为准：重算产生新版本才提示重新上报
    const versionAhead = (source.resultVersion ?? 1) > report.resultVersion
    report.stale = versionAhead
    if (report.stale) {
      report.staleHint = `源核算记录已重算（第 ${source.resultVersion ?? 1} 次核算，总碳足迹 ${source.totalEmission} ${source.emissionUnit ?? 'kgCO₂e'}），请重新上报`
    } else {
      report.staleHint = undefined
    }
  } else {
    report.stale = false
    report.staleHint = undefined
  }
  // 审核环节不做异常数据判定，校验标记恒为空
  report.auditFlags = []
}

/* ============================ 查询 API ============================ */

export async function fetchReports(): Promise<DataReport[]> {
  await delay()
  const ctx = await loadContext()
  store.forEach((report) => refreshReport(report, ctx))
  return clone(store)
}

export async function fetchReport(id: string): Promise<DataReport> {
  await delay(120)
  const ctx = await loadContext()
  const found = store.find((item) => item.id === id)
  if (!found) throw new Error('上报单不存在或已被删除')
  refreshReport(found, ctx)
  return clone(found)
}

/** 某核算记录当前绑定的上报单（列表按钮展示「一键上报 / 重新上报」用） */
export async function fetchReportByRecord(recordId: string): Promise<DataReport | null> {
  await delay(80)
  const found = store
    .filter((item) => item.sourceRecordId === recordId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
  return found ? clone(found) : null
}

/* ============================ 上报写操作 ============================ */

/** 从核算记录提取上报数据（活动数据在此步丢弃，只留结果与分类标签） */
function extractFromRecord(record: {
  id: string
  recordNo: string
  sourceProjectNo?: string
  resultVersion?: number
  productName: string
  productCode?: string
  categoryName: string
  categoryCode?: string
  categoryPath: string
  industryCode: string
  industryName: string
  industryPath: string
  processes: { name: string }[]
  boundary: Boundary
  periodStart: string
  periodEnd: string
  unitValue: number
  unitCode: string
  gwpVersion: string
  standardNo?: string
  standardName?: string
  emissionUnit?: string
  totalEmission: number
  stageValues: ReportStageValue[]
  hiddenActivityCount?: number
}): Omit<DataReport, 'id' | 'reportNo' | 'status' | 'createdAt' | 'updatedAt' | 'stale' | 'auditFlags' | 'normalized' | 'traces'> {
  return {
    sourceRecordId: record.id,
    sourceRecordNo: record.recordNo,
    sourceProjectNo: record.sourceProjectNo,
    resultVersion: record.resultVersion ?? 1,
    productName: record.productName,
    productCode: record.productCode,
    categoryName: record.categoryName,
    categoryCode: record.categoryCode,
    categoryPath: record.categoryPath,
    industryCode: record.industryCode,
    industryName: record.industryName,
    industryPath: record.industryPath,
    processes: record.processes.map((p) => p.name),
    boundary: record.boundary,
    periodStart: record.periodStart,
    periodEnd: record.periodEnd,
    unitValue: record.unitValue,
    unitCode: record.unitCode,
    gwpVersion: record.gwpVersion,
    standardNo: record.standardNo ?? STANDARD_DEFAULT.no,
    standardName: record.standardName ?? STANDARD_DEFAULT.name,
    emissionUnit: record.emissionUnit,
    totalEmission: record.totalEmission,
    stageValues: record.stageValues.map((s) => ({ ...s })),
    hiddenActivityCount: record.hiddenActivityCount ?? 0,
    regionName: '',
    regionGroup: '',
    dataQualityNote: '',
    orgId: currentEnterpriseProfile().orgId,
    orgName: currentEnterpriseProfile().orgName,
    contactName: OPERATOR_ENTERPRISE,
  }
}

export interface ReportDraftInput {
  recordId: string
  regionName: string
  dataQualityNote: string
  /** 工艺类型：核算记录已有时带出，缺失时由企业在上报环节补充 */
  processes?: string[]
  /** true = 直接提交平台；false = 暂存草稿 */
  submit: boolean
}

/**
 * 一键上报：从已核算记录生成上报单。
 * 同一核算记录已有草稿 / 已驳回 → 覆盖重用；已入库 / 审核中 / 已提交 → 新建「重新上报」单。
 */
export async function createReportFromRecord(input: ReportDraftInput): Promise<DataReport> {
  await delay(260)
  const records = await fetchRecords()
  const linked = records.find((r) => r.id === input.recordId)
  if (!linked) throw new Error('核算记录不存在或已被删除')
  // 源记录已被重算替代时，自动改绑同项目最新有效记录，保证「数据已更新，请重新上报」可走通
  const record =
    linked.status !== 'active' && linked.sourceProjectId
      ? records
          .filter((r) => r.status === 'active' && r.sourceProjectId === linked.sourceProjectId)
          .sort((a, b) => (b.resultVersion ?? 1) - (a.resultVersion ?? 1))[0] ?? linked
      : linked
  if (record.status !== 'active') throw new Error('仅有效状态的核算记录可上报')
  const report = await fetchReportByRecord(record.id)

  const now = nowText()
  const base = extractFromRecord(record)
  // 工艺以核算记录为准；记录未填写时采用企业本次上报补充的工艺
  const processes = base.processes.length > 0 ? base.processes : input.processes ?? []
  if (input.submit && processes.length === 0) {
    throw new Error('核算记录未填写工艺类型，请补充后再提交')
  }
  // 所属区域以企业档案区划为默认：表单可修改；未传 / 清空时按档案兜底，保证入库必填
  const regionName = input.regionName.trim() || currentEnterpriseRegion()
  const extras = {
    regionName,
    regionGroup: regionGroupOf(regionName),
    dataQualityNote: input.dataQualityNote,
    processes,
  }
  const normalized: NormalizedReportFields = {
    productName: base.productName,
    categoryName: base.categoryName,
    categoryCode: base.categoryCode,
    categoryPath: base.categoryPath,
    industryName: base.industryName,
    industryCode: base.industryCode,
    industryPath: base.industryPath,
    boundary: base.boundary,
    unitCode: base.unitCode,
    regionName: extras.regionName,
    totalEmission: base.totalEmission,
    stageValues: base.stageValues.map((s) => ({
      stageCode: s.stageCode,
      stageName: s.stageName,
      stageEmission: s.stageEmission,
    })),
    dataQualityNote: extras.dataQualityNote,
  }
  // 提交即进入审核中（不再有「已提交」中间态）
  const status: ReportStatus = input.submit ? 'reviewing' : 'draft'

  // 可复用的上报单：草稿 / 已驳回（同一核算记录）
  const reusable = report && (report.status === 'draft' || report.status === 'rejected') ? report : null
  if (reusable) {
    const found = store.find((item) => item.id === reusable.id)
    if (found) {
      Object.assign(found, base, extras, {
        status,
        updatedAt: now,
        submittedAt: input.submit ? now : found.submittedAt,
        rejectReason: undefined,
        resultVersion: record.resultVersion ?? 1,
        normalized,
      })
      found.traces.push(
        makeTrace(input.submit ? 'resubmit' : 'create', OPERATOR_ENTERPRISE, now, {
          note: input.submit ? '修改后重新提交' : '更新草稿',
        }),
      )
      return clone(found)
    }
  }

  const seq = store.length + 1
  const created: DataReport = {
    id: `RPT-NEW-${seq}`,
    reportNo: `RPT-2026-${pad(seq + 8, 4)}`,
    ...base,
    ...extras,
    status,
    createdAt: now,
    updatedAt: now,
    submittedAt: input.submit ? now : undefined,
    stale: false,
    auditFlags: [],
    /** 已入库记录再次上报：沿用首次入库单 id，审核通过更新原记录 */
    originReportId: report?.status === 'archived' ? report.originReportId ?? report.id : undefined,
    normalized,
    traces: [
      makeTrace(input.submit ? 'submit' : 'create', OPERATOR_ENTERPRISE, now, {
        note: '从核算记录一键上报，活动数据已隐藏',
      }),
    ],
  }
  store = [created, ...store]
  return clone(created)
}

/** 草稿：保存补充信息（不改数值快照） */
export async function saveReportDraft(
  id: string,
  extras: { regionName: string; dataQualityNote: string; processes?: string[] },
): Promise<DataReport> {
  await delay(180)
  const found = store.find((item) => item.id === id)
  if (!found) throw new Error('上报单不存在')
  if (found.status !== 'draft') throw new Error('仅草稿状态可编辑')
  const now = nowText()
  found.regionName = extras.regionName
  found.regionGroup = regionGroupOf(extras.regionName)
  found.dataQualityNote = extras.dataQualityNote
  if (extras.processes && extras.processes.length > 0) found.processes = [...extras.processes]
  found.normalized.regionName = extras.regionName
  found.normalized.dataQualityNote = extras.dataQualityNote
  found.updatedAt = now
  found.traces.push(makeTrace('edit', OPERATOR_ENTERPRISE, now, { note: '保存草稿' }))
  return clone(found)
}

/** 提交草稿 / 驳回后重新提交（重新提交时刷新数值快照，保证与最新核算结果一致） */
export async function submitReport(
  id: string,
  extras?: { regionName: string; dataQualityNote: string; processes?: string[] },
): Promise<DataReport> {
  await delay(240)
  const found = store.find((item) => item.id === id)
  if (!found) throw new Error('上报单不存在')
  if (!['draft', 'rejected'].includes(found.status)) throw new Error('当前状态不可提交')

  const now = nowText()
  if (extras) {
    found.regionName = extras.regionName
    found.regionGroup = regionGroupOf(extras.regionName)
    found.dataQualityNote = extras.dataQualityNote
    if (extras.processes && extras.processes.length > 0) found.processes = [...extras.processes]
    found.normalized.regionName = extras.regionName
    found.normalized.dataQualityNote = extras.dataQualityNote
  }
  if (!found.regionName) throw new Error('请补充所属区域（入库必填）')
  if (found.processes.length === 0) {
    throw new Error('缺少工艺类型：核算记录未填写，请在企业上报中补充后再提交')
  }

  const ctx = await loadContext()
  const source = ctx.find((r) => r.id === found.sourceRecordId)
  if (source) {
    // 提交即与最新核算结果对齐：重算后的数值 / 阶段 / 结果版本一并刷新
    found.totalEmission = source.totalEmission
    found.stageValues = source.stageValues.map((s) => ({ ...s }))
    found.normalized.totalEmission = source.totalEmission
    found.normalized.stageValues = source.stageValues.map((s) => ({
      stageCode: s.stageCode,
      stageName: s.stageName,
      stageEmission: s.stageEmission,
    }))
    // 工艺仍以核算记录为准；记录没有工艺时保留上报环节补充的值
    if (source.processes.length > 0) found.processes = source.processes.map((p) => p.name)
    found.resultVersion = source.resultVersion ?? found.resultVersion
    found.stale = false
  }

  found.status = 'reviewing'
  found.submittedAt = now
  found.updatedAt = now
  found.rejectReason = undefined
  found.traces.push(makeTrace('submit', OPERATOR_ENTERPRISE, now, { note: '提交平台审核，进入审核中' }))
  refreshReport(found, ctx)
  return clone(found)
}

/**
 * 是否可撤回：已提交（审核中）且平台尚未开始审核。
 * 平台一旦受理 / 驳回 / 入库，轨迹中会留下对应动作，企业端不再提供撤回入口。
 */
export function canWithdrawReport(report: DataReport): boolean {
  if (report.status !== 'reviewing') return false
  return !report.traces.some((trace) => ['review', 'reject', 'archive'].includes(trace.action))
}

/** 企业撤回上报：平台审核开始前的「审核中」→ 草稿，可继续修改或重新提交 */
export async function withdrawReport(id: string): Promise<DataReport> {
  await delay(200)
  const found = store.find((item) => item.id === id)
  if (!found) throw new Error('上报单不存在')
  if (found.status !== 'reviewing') throw new Error('仅审核中的上报单可撤回')
  if (!canWithdrawReport(found)) throw new Error('平台已开始审核，无法撤回')

  const now = nowText()
  found.status = 'draft'
  found.submittedAt = undefined
  found.updatedAt = now
  found.rejectReason = undefined
  found.reviewer = undefined
  found.reviewedAt = undefined
  found.traces.push(
    makeTrace('withdraw', OPERATOR_ENTERPRISE, now, { note: '平台尚未开始审核，企业撤回上报，转为草稿' }),
  )
  refreshReport(found, await loadContext())
  return clone(found)
}

/** 已入库后再上报：新建一条「重新上报」草稿，入库记录保留到审核通过再更新 */
export async function createResubmitDraft(id: string): Promise<DataReport> {
  await delay(220)
  const found = store.find((item) => item.id === id)
  if (!found) throw new Error('上报单不存在')
  const records = await fetchRecords()
  const record = records.find((r) => r.id === found.sourceRecordId)
  if (!record) throw new Error('源核算记录不存在，无法重新上报')

  const now = nowText()
  const base = extractFromRecord(record)
  // 核算记录没有工艺时，沿用原上报单中企业补充的工艺
  const processes = base.processes.length > 0 ? base.processes : found.processes
  const seq = store.length + 1
  const draft: DataReport = {
    id: `RPT-NEW-${seq}`,
    reportNo: `RPT-2026-${pad(seq + 8, 4)}`,
    ...base,
    processes,
    regionName: found.regionName,
    regionGroup: found.regionGroup,
    dataQualityNote: found.dataQualityNote,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    stale: false,
    auditFlags: [],
    /** 沿用首次入库单 id：审核通过更新原记录 */
    originReportId: found.originReportId ?? found.id,
    normalized: {
      productName: base.productName,
      categoryName: base.categoryName,
      industryName: base.industryName,
      boundary: base.boundary,
      unitCode: base.unitCode,
      regionName: found.regionName,
      totalEmission: base.totalEmission,
      stageValues: base.stageValues.map((s) => ({
        stageCode: s.stageCode,
        stageName: s.stageName,
        stageEmission: s.stageEmission,
      })),
      dataQualityNote: found.dataQualityNote,
    },
    traces: [
      makeTrace('resubmit', OPERATOR_ENTERPRISE, now, {
        note: `重算后重新上报（原上报单 ${found.reportNo} 已入库，审核通过后更新原记录）`,
      }),
    ],
  }
  store = [draft, ...store]
  return clone(draft)
}

/* ============================ 审核写操作 ============================ */

/** 删除草稿（草稿为企业暂存态，可直接删除；已提交 / 已入库不可删） */
export async function deleteReportDraft(id: string): Promise<void> {
  await delay(180)
  const found = store.find((item) => item.id === id)
  if (!found) throw new Error('上报单不存在')
  if (found.status !== 'draft') throw new Error('仅草稿状态可删除')
  store = store.filter((item) => item.id !== id)
}

/** 驳回：待审核 → 已驳回（必填原因） */
export async function rejectReport(id: string, reason: string): Promise<void> {
  await delay(200)
  const found = store.find((item) => item.id === id)
  if (!found) throw new Error('上报单不存在')
  if (found.status !== 'reviewing') throw new Error('仅待审核状态可驳回')
  if (!reason.trim()) throw new Error('驳回必须填写原因')
  const now = nowText()
  found.status = 'rejected'
  found.rejectReason = reason.trim()
  found.reviewedAt = now
  found.reviewer = OPERATOR_PLATFORM
  found.updatedAt = now
  found.traces.push(makeTrace('reject', OPERATOR_PLATFORM, now, { note: reason.trim() }))
  logStore = [
    makeLog('reject', OPERATOR_PLATFORM, found.reportNo, now, { note: reason.trim() }),
    ...logStore,
  ]
}

/**
 * 通过并入库：按企业上报原值写入行业数据集（脱敏），状态 → 已入库。
 * 审核不提供标准化编辑，管理员只能选择通过入库或驳回退回企业；
 * 同一上报单此前已入库（重算后重报）→ 更新原记录；否则新增。
 */
export async function approveReport(
  id: string,
  options: { operator?: string; version?: string } = {},
): Promise<{ report: DataReport; recordId: string; updated: boolean }> {
  await delay(300)
  const found = store.find((item) => item.id === id)
  if (!found) throw new Error('上报单不存在')
  if (found.status !== 'reviewing') throw new Error('仅待审核状态可入库')

  const operator = options.operator ?? OPERATOR_PLATFORM
  const now = nowText()
  // 审核不修改上报数据：入库字段直接取企业提交时的原值
  const normalized = found.normalized
  const regionName = normalized.regionName
  const hadArchived = !!found.archivedRecordId || !!found.originReportId
  const recordKey = found.originReportId ?? found.id

  const record = await archiveReportRecord({
    reportId: found.id,
    recordKey,
    reportNo: found.reportNo,
    productName: normalized.productName,
    productCode: found.productCode,
    categoryCode: normalized.categoryCode ?? found.categoryCode ?? found.categoryName,
    categoryName: normalized.categoryName,
    categoryPath: normalized.categoryPath ?? found.categoryPath,
    industryCode: normalized.industryCode ?? found.industryCode,
    industryName: normalized.industryName,
    industryPath: normalized.industryPath ?? found.industryPath,
    processes: found.processes,
    boundary: normalized.boundary,
    periodStart: found.periodStart,
    periodEnd: found.periodEnd,
    unitValue: found.unitValue,
    unitCode: normalized.unitCode,
    gwpVersion: found.gwpVersion,
    standardNo: found.standardNo,
    standardName: found.standardName,
    emissionUnit: found.emissionUnit,
    resultVersion: found.resultVersion,
    sourceProjectNo: found.sourceProjectNo,
    totalEmission: normalized.totalEmission,
    stageValues: normalized.stageValues,
    orgId: found.orgId,
    orgLabel: maskedOrgLabel(regionName),
    regionName,
    dataQualityNote: normalized.dataQualityNote,
    datasetVersion: options.version,
    operator,
  })

  found.regionName = regionName
  found.regionGroup = regionGroupOf(regionName)
  found.dataQualityNote = normalized.dataQualityNote
  found.status = 'archived'
  found.reviewedAt = now
  found.updatedAt = now
  found.reviewer = operator
  found.archivedRecordId = record.id
  found.archivedRecordNo = record.recordNo
  found.archivedAt = now
  // 仅「重算后重新上报」才标记来源单；首次入库不写，避免误挂「重算后重新上报」标签
  if (recordKey !== found.id) found.originReportId = recordKey
  // 源核算记录置「已替代」：同一处核算结果在行业数据集只保留一条有效记录
  await supersedeRecord(found.sourceRecordId)
  // 新入库 / 数值变更的数据回到「未发版」：需下一次发布版本才定格
  await ensurePublicDatabaseSeed()
  delete recordVersionMap[record.id]
  found.datasetVersion = options.version
  if (options.version) recordVersionMap[record.id] = options.version
  found.stale = false
  found.traces.push(
    makeTrace('archive', operator, now, {
      note: `通过并入库（${record.recordNo}），企业标识脱敏为「${maskedOrgLabel(regionName)}」`,
    }),
  )

  logStore = [
    makeLog('archive', operator, found.reportNo, now, {
      note: `入库 ${record.recordNo}；脱敏标签「${maskedOrgLabel(regionName)}」`,
    }),
    ...logStore,
  ]

  return { report: clone(found), recordId: record.id, updated: hadArchived }
}

/* ============================ 版本管理 / 公共数据库 ============================ */

function currentVersion(): DatasetVersion | undefined {
  return versionStore.find((v) => v.status === 'current')
}

function parseVersion(version: string): [number, number] {
  const [major, minor] = version.replace('V', '').split('.').map(Number)
  return [major || 0, minor || 0]
}

/**
 * 下一个发布版本号：接续「已存在的最高版本」。
 * 回滚会让当前版本号变低（如当前回到 V0.9），若按 current +1 会与既有 V1.0 重号。
 */
function nextVersionOf(versions: DatasetVersion[]): string {
  if (versions.length === 0) return 'V1.0'
  const [major, minor] = versions
    .map((v) => parseVersion(v.version))
    .sort((a, b) => b[0] - a[0] || b[1] - a[1])[0]
  return `V${major}.${minor + 1}`
}

/**
 * 公共数据库：记录 → 所属发布版本；每个发布版本保留一份定格快照。
 * 未写入 map = 未发版（审核入库后尚未纳入任何版本快照）。
 */
let recordVersionMap: Record<string, string> = {}
/** 版本号 → 发布时的数据快照（表格行 + 完整记录，保证历史版本只读可追溯） */
let versionSnapshots: Record<string, { rows: PublicDatabaseRow[]; records: CarbonRecord[] }> = {}
let publicDatabaseReady = false

function toPublicRow(record: CarbonRecord, version?: string): PublicDatabaseRow {
  return {
    recordId: record.id,
    recordNo: record.recordNo,
    industryCode: record.industryCode,
    industryName: record.industryName,
    productName: record.productName,
    productCode: record.productCode,
    totalEmission: record.totalEmission,
    unitCode: record.unitCode,
    emissionUnit: record.emissionUnit,
    regionName: record.regionName,
    version,
    archivedAt: record.createdAt,
  }
}

/** 待发版在前（待处理），其余按入库时间倒序 */
function sortPublicRows(rows: PublicDatabaseRow[]): PublicDatabaseRow[] {
  return [...rows].sort((a, b) => {
    if (Boolean(a.version) !== Boolean(b.version)) return a.version ? 1 : -1
    return b.archivedAt.localeCompare(a.archivedAt)
  })
}

function makeVersionSnapshot(
  version: string,
  records: CarbonRecord[],
): { rows: PublicDatabaseRow[]; records: CarbonRecord[] } {
  return {
    rows: sortPublicRows(records.map((record) => toPublicRow(record, version))),
    records: records.map((record) => clone(record)),
  }
}

/** 首次访问时用种子数据补齐「记录 → 版本」映射与历史版本快照 */
async function ensurePublicDatabaseSeed(): Promise<void> {
  if (publicDatabaseReady) return
  const records = await fetchRecords()
  // 种子口径：企业上报审核入库（DS-RPT-*）与手工补录（DS-NEW-*）晚于 V1.0，属于待发版数据
  const published = records.filter(
    (record) =>
      record.status === 'active' && !record.id.startsWith('DS-RPT') && !record.id.startsWith('DS-NEW'),
  )
  recordVersionMap = Object.fromEntries(published.map((record) => [record.id, 'V1.0']))
  // 版本记录条数由快照派生，避免与「库内有效数据 / 企业端行业数据集」条数打架
  const current = versionStore.find((item) => item.status === 'current')
  if (current) current.recordCount = published.length
  // 原型口径：历史版本按入库先后截取，V1.0 = 当时全量已发布数据
  versionSnapshots = {
    'V1.0': makeVersionSnapshot('V1.0', published),
    'V0.9': makeVersionSnapshot('V0.9', published.slice(0, 18)),
    'V0.8': makeVersionSnapshot('V0.8', published.slice(0, 11)),
  }
  publicDatabaseReady = true
}

export async function fetchVersions(): Promise<DatasetVersion[]> {
  await delay(180)
  return clone(versionStore)
}

/**
 * 公共数据库总览。
 * - 不传版本 / 传当前版本 → 实时全量数据（含未发版）；
 * - 传历史版本 → 该版本发布时的定格快照（只读）。
 */
export async function fetchPublicDatabase(viewVersion?: string): Promise<PublicDatabaseSnapshot> {
  await delay(220)
  const records = await fetchRecords()
  await ensurePublicDatabaseSeed()
  const current = currentVersion() ?? null
  const liveRows = sortPublicRows(
    records
      .filter((record) => record.status === 'active')
      .map((record) => toPublicRow(record, recordVersionMap[record.id])),
  )
  const readOnly = !!viewVersion && viewVersion !== current?.version
  const rows = readOnly ? versionSnapshots[viewVersion!]?.rows ?? [] : liveRows
  return {
    current,
    versions: clone(versionStore),
    rows: clone(rows),
    pendingCount: liveRows.filter((row) => !row.version).length,
    viewingVersion: readOnly ? viewVersion! : current?.version ?? null,
    readOnly,
  }
}

/**
 * 前台「行业数据集」：企业只读查看平台「当前已发布版本」的行业数据集。
 * 与 fetchPublicDatabase 的差异：
 * - 只返回当前发布版本，不返回待发版数据，也不提供历史版本（企业侧不感知版本管理）；
 * - 数据口径 = 平台已发布版本，而非平台内部实时库。
 */
export async function fetchIndustryDataset(): Promise<IndustryDatasetSnapshot> {
  await delay(220)
  await ensurePublicDatabaseSeed()
  const current = currentVersion() ?? null
  if (!current) return { current: null, records: [] }
  return {
    current,
    records: clone(versionSnapshots[current.version]?.records ?? []),
  }
}

/** 查看单条入库数据详情：历史版本取发布时快照，最新版本取实时记录 */
export async function fetchPublicRecord(recordId: string, version?: string): Promise<CarbonRecord | null> {
  await delay(160)
  await ensurePublicDatabaseSeed()
  if (version) {
    const found = versionSnapshots[version]?.records.find((record) => record.id === recordId)
    if (found) return clone(found)
  }
  const records = await fetchRecords()
  const found = records.find((record) => record.id === recordId)
  return found ? clone(found) : null
}

/** 发布新版本：把「待发版」数据一次性定格为全局快照（不做单条版本） */
export async function publishVersion(remark: string, operator = OPERATOR_PLATFORM): Promise<DatasetVersion> {
  await delay(320)
  const records = await fetchRecords()
  await ensurePublicDatabaseSeed()
  const current = currentVersion()
  if (!current) throw new Error('当前没有可续接的版本')

  const activeRecords = records.filter((record) => record.status === 'active')
  const pending = activeRecords.filter((record) => !recordVersionMap[record.id])
  if (pending.length === 0) throw new Error('当前没有待发版数据')

  const nextVersion = nextVersionOf(versionStore)
  const now = nowText()

  // 先定格全量快照（所属版本沿用各记录首次纳入的版本），再更新映射
  versionSnapshots[nextVersion] = {
    rows: sortPublicRows(
      activeRecords.map((record) => toPublicRow(record, recordVersionMap[record.id] ?? nextVersion)),
    ),
    records: activeRecords.map((record) => clone(record)),
  }

  const created: DatasetVersion = {
    id: `VER-${pad(versionStore.length + 1, 3)}`,
    version: nextVersion,
    recordCount: activeRecords.length,
    reportCount: pending.filter((record) => record.recordSource === 'report').length,
    industryCount: new Set(activeRecords.map((record) => record.industryCode)).size,
    publishedAt: now,
    publishedBy: operator,
    remark: remark.trim() || undefined,
    status: 'current',
  }

  // 定格：待发版记录归属新版本；已发布记录保持原版本归属不变
  pending.forEach((record) => {
    recordVersionMap[record.id] = nextVersion
  })
  // 上报单同步所属版本
  store.forEach((report) => {
    if (
      report.status === 'archived' &&
      report.archivedRecordId &&
      recordVersionMap[report.archivedRecordId] === nextVersion
    ) {
      report.datasetVersion = nextVersion
    }
  })

  versionStore = [created, ...versionStore.map((v) => ({ ...v, status: 'history' as const }))]
  logStore = [
    makeLog('publish', operator, nextVersion, now, {
      note: `发布全局快照：${created.recordCount} 条记录定格，本次新增 ${pending.length} 条`,
    }),
    ...logStore,
  ]
  return clone(created)
}

/**
 * 回滚发布：把某个历史版本重新设为「当前发布版本」。
 *
 * 语义（对齐因子库回滚）：
 * - **内容不变、版本号不新增**：目标历史版本直接回到 current，原当前版本自动转 history；
 * - `publishedAt`（首次发布时间）保留，只更新 `lastActivatedAt`（最近一次生效时间）；
 * - 归属重置：目标快照内的记录归该版本，快照之外的记录退回「待发版」；
 * - 不删除数据，所有版本保持只读可追溯。
 */
export async function rollbackVersion(
  targetVersion: string,
  remark: string,
  operator = OPERATOR_PLATFORM,
): Promise<DatasetVersion> {
  await delay(320)
  const records = await fetchRecords()
  await ensurePublicDatabaseSeed()
  const current = currentVersion()
  if (!current) throw new Error('当前没有可回滚的版本')
  if (targetVersion === current.version) throw new Error('目标版本已是当前发布版本')
  const target = versionStore.find((v) => v.version === targetVersion)
  if (!target) throw new Error('历史版本不存在')
  if (target.status !== 'history') throw new Error('仅历史版本可回滚')
  const targetSnapshot = versionSnapshots[targetVersion]
  if (!targetSnapshot) throw new Error('历史版本快照缺失，无法回滚')

  const activeRecords = records.filter((record) => record.status === 'active')
  const targetIds = new Set(targetSnapshot.records.map((record) => record.id))
  const restored = activeRecords.filter((record) => targetIds.has(record.id))
  const restoredIds = new Set(restored.map((record) => record.id))
  if (restored.length === 0) throw new Error('该版本的快照数据已全部失效，无法回滚发布')

  const now = nowText()
  const excluded = activeRecords.length - restored.length

  // 目标版本原样回到当前（版本号 / 首次发布时间 / 内容均不变，仅刷新最近生效时间）
  const activated: DatasetVersion = {
    ...target,
    recordCount: restored.length,
    reportCount: restored.filter((record) => record.recordSource === 'report').length,
    industryCount: new Set(restored.map((record) => record.industryCode)).size,
    status: 'current',
    lastActivatedAt: now,
  }

  // 归属重置：快照内记录归回滚版本，快照外记录退回待发版（可后续重新发布）
  activeRecords.forEach((record) => {
    if (restoredIds.has(record.id)) recordVersionMap[record.id] = targetVersion
    else delete recordVersionMap[record.id]
  })
  store.forEach((report) => {
    if (report.status !== 'archived' || !report.archivedRecordId) return
    report.datasetVersion = restoredIds.has(report.archivedRecordId) ? targetVersion : undefined
  })

  versionStore = versionStore.map((version) => {
    if (version.version === targetVersion) return activated
    if (version.version === current.version) return { ...version, status: 'history' as const }
    return version
  })
  logStore = [
    makeLog('publish', operator, targetVersion, now, {
      note: `回滚：${targetVersion} 重新设为当前发布版本（内容不变、版本号不新增）；${excluded} 条快照外数据退回待发版${
        remark.trim() ? `；原因：${remark.trim()}` : ''
      }`,
    }),
    ...logStore,
  ]
  return clone(activated)
}

export async function fetchAuditLogs(): Promise<DatasetAuditLog[]> {
  await delay(140)
  return clone(logStore)
}
