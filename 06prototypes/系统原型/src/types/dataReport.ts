import type { Boundary, CarbonRecord, RecordStageValue } from './dataset'

/**
 * 企业数据上报 / 平台数据审核 / 公共数据库 类型定义。
 *
 * 业务链路：已核算记录 →（自动脱敏提取结果）→ 企业补充区域 + 数据质量说明
 * → 提交平台 → 只读核对 → 通过入库（按上报原值脱敏落库）/ 驳回退回企业。
 *
 * 状态流转：草稿 draft（暂存，可删除）→ 审核中 reviewing（提交即进入）→ 已驳回 rejected / 已入库 archived。
 * 平台端展示口径：待审核 reviewing / 已驳回 rejected / 已入库 archived（草稿不进入平台队列）。
 */

export type ReportStatus = 'draft' | 'reviewing' | 'rejected' | 'archived'

/** 上报单里保留的阶段结果（活动数据一律不进入上报单） */
export type ReportStageValue = RecordStageValue

/** 兼容保留的校验标记类型：平台审核不做自动异常判定，恒为空数组 */
export interface ReportAuditFlag {
  code: string
  level: 'error' | 'warning'
  /** 命中的字段（用于左右对比时定位高亮） */
  field?: string
  message: string
}

/** 单条操作轨迹：谁 / 什么时间 / 做了什么 / 哪个数值从 A 改成 B */
export interface ReportTrace {
  id: string
  at: string
  operator: string
  action: 'create' | 'submit' | 'resubmit' | 'withdraw' | 'review' | 'reject' | 'archive' | 'edit'
  /** 字段中文名（编辑类动作） */
  field?: string
  before?: string
  after?: string
  note?: string
}

/** 企业上报值快照：审核不可编辑，通过入库时按此原值落库 */
export interface NormalizedReportFields {
  productName: string
  categoryName: string
  /** 类别编码 / 完整路径：名称调整时同步联动，避免名称与编码错位 */
  categoryCode?: string
  categoryPath?: string
  industryName: string
  /** 行业编码 / 完整路径：名称调整时同步联动 */
  industryCode?: string
  industryPath?: string
  boundary: Boundary
  unitCode: string
  regionName: string
  totalEmission: number
  stageValues: { stageCode: string; stageName: string; stageEmission: number }[]
  dataQualityNote: string
}

/** 企业数据上报单 */
export interface DataReport {
  id: string
  /** 上报编号 RPT-{年度}-{4位流水} */
  reportNo: string
  /** 来源核算记录（自动提取的唯一入口） */
  sourceRecordId: string
  sourceRecordNo: string
  /** 来源核算项目号：平台审核可见，入库时脱敏丢弃 */
  sourceProjectNo?: string
  /** 来源核算结果版本 */
  resultVersion: number

  /* ---------- 自动提取的非敏感结果 ---------- */
  productName: string
  productCode?: string
  categoryName: string
  categoryCode?: string
  categoryPath: string
  industryCode: string
  industryName: string
  industryPath: string
  /** 工艺类型（标签）：取自核算记录；记录未填写时由企业在上报环节补充 */
  processes: string[]
  boundary: Boundary
  periodStart: string
  periodEnd: string
  unitValue: number
  unitCode: string
  gwpVersion: string
  /** 核算标准（标准号 + 名称），随核算结果一并上报 */
  standardNo: string
  standardName: string
  /** 排放分子单位：沿用核算结果（gCO₂e / kgCO₂e），不换算 */
  emissionUnit?: string
  totalEmission: number
  stageValues: ReportStageValue[]
  /** 被隐藏的活动数据条数（如耗电量 / 钢材用量），仅作展示说明 */
  hiddenActivityCount: number

  /* ---------- 企业补充 ---------- */
  regionName: string
  /** 大区（入库脱敏用：「某华东地区企业」） */
  regionGroup: string
  dataQualityNote: string

  /* ---------- 企业标识：仅平台审核可见，入库前脱敏 ---------- */
  orgId: string
  orgName: string
  contactName: string

  /* ---------- 状态与审核 ---------- */
  status: ReportStatus
  createdAt: string
  updatedAt: string
  submittedAt?: string
  reviewedAt?: string
  reviewer?: string
  rejectReason?: string
  /** 入库后的行业数据集记录 id（重算重报为同一条，直接更新） */
  archivedRecordId?: string
  /** 入库后的行业数据集记录编号 CR-{年度}-{4位流水}：企业据此对齐行业数据集中的公示数据 */
  archivedRecordNo?: string
  archivedAt?: string
  /** 首次入库的上报单 id：重算后重新上报时沿用，审核通过更新原记录而非新增 */
  originReportId?: string
  /** 入库记录所属公共数据库版本；undefined = 未发版 */
  datasetVersion?: string

  /** 源核算记录已重算：列表提示「数据已更新，请重新上报」 */
  stale: boolean
  staleHint?: string
  /** 平台不做自动异常判定，保留字段恒为空 */
  auditFlags: ReportAuditFlag[]
  /** 企业上报值快照：审核不修改，通过入库时按此原值落库 */
  normalized: NormalizedReportFields
  /** 操作轨迹 */
  traces: ReportTrace[]
}

/** 数据集全局版本快照 */
export interface DatasetVersion {
  id: string
  /** V1.0 / V1.1 */
  version: string
  /** 快照记录数（清洗后有效记录） */
  recordCount: number
  /** 本版本新增入库的上报数 */
  reportCount: number
  /** 覆盖行业数 */
  industryCount: number
  publishedAt: string
  publishedBy: string
  remark?: string
  status: 'current' | 'history'
  /** 最近一次生效时间：回滚重新设为当前版本时更新；普通发布等于发布时间 */
  lastActivatedAt?: string
}

/** 公共数据库数据行：一条已入库记录 + 所属发布版本（未发版为 undefined） */
export interface PublicDatabaseRow {
  recordId: string
  /** 数据编号 CR-{年度}-{4位流水} */
  recordNo: string
  industryCode: string
  industryName: string
  productName: string
  productCode?: string
  /** 总碳足迹（单位取 emissionUnit / unitCode） */
  totalEmission: number
  unitCode: string
  /** 排放分子单位，沿用核算结果，不换算 */
  emissionUnit?: string
  regionName: string
  /** 所属发布版本；undefined = 未发版 */
  version?: string
  /** 入库时间 */
  archivedAt: string
}

/** 公共数据库总览：当前发布版本 + 全量有效数据（含待发版） */
export interface PublicDatabaseSnapshot {
  current: DatasetVersion | null
  versions: DatasetVersion[]
  /** 当前查看的数据行：最新版本 = 实时全量（含待发版）；历史版本 = 发布时定格快照 */
  rows: PublicDatabaseRow[]
  /** 待发版新增数据条数（始终按实时数据统计） */
  pendingCount: number
  /** 当前查看的版本号 */
  viewingVersion: string | null
  /** true = 正在查看历史版本快照（只读） */
  readOnly: boolean
}

/**
 * 前台「行业数据集」数据快照。
 * 与平台端「公共数据库」的区别：
 * - 只含平台**当前已发布版本**的数据，不含待发版数据、也不提供历史版本切换；
 * - 企业侧不感知版本细节，版本号不进入列表与详情；
 * - 只读查看，无补录 / 作废 / 上报入口。
 */
export interface IndustryDatasetSnapshot {
  /** 当前已发布版本；null = 平台尚未发布 */
  current: DatasetVersion | null
  /** 当前发布版本内的数据记录 */
  records: CarbonRecord[]
}

/** 数据集操作日志（审计 / 验收用）：谁、什么时间、把哪个数值从 A 改成 B */
export interface DatasetAuditLog {
  id: string
  at: string
  operator: string
  action: 'archive' | 'reject' | 'edit' | 'publish'
  /** 操作对象（上报编号 / 版本号） */
  target: string
  field?: string
  before?: string
  after?: string
  note?: string
}
