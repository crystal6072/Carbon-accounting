import type { PcfCalcResult } from '@/types'

/**
 * 上游快照采用**轻量摘要**类型：报告仅需展示关键数据（情景结果 / DQR 结论等），
 * 不重建敏感性分析 / 数据质量评价完整对象，保持与上游模块解耦。
 */
export interface SensitivitySnapshotSummary {
  analysisNo: string
  baselineEmission: number
  scenarios: Array<{ description: string; emission: number; deltaRateText: string }>
}

export interface QualitySnapshotSummary {
  assessmentNo: string
  overallDqr: number | null
  overallLevel: string | null
  qualitative: { temporal: string; geographical: string; technological: string }
  conclusion: string
}

/**
 * 报告生成（报告管理 · 报告编制）类型定义。
 * 字段口径见《报告生成字段清单》（`06报告管理/06-3报告生成/报告生成字段清单.md`），
 * 业务规则见《报告生成业务PRD》（V0.3），章节 / 表格见《报告模板定义（ZB13002 整竹砧板 V1）》。
 *
 * 设计要点（PRD 核心口径）：报告正文**零人工编辑**，唯一例外 = 企业信息（可编辑 / 可补录）。
 */

/** 报告状态（字段清单 §8.1）
 * - reportGenerating: 系统正在装配（保留，实际新增流程不经过）
 * - reportEditing: 编制中 / 待补录封面信息（新增）
 * - reportReady: 已生成正式报告
 * - reportStale: 上游变更，待重新生成
 */
export type ReportStatus = 'reportGenerating' | 'reportEditing' | 'reportReady' | 'reportStale'

/** 章节类型（字段清单 §8.3） */
export type SectionType = 'auto' | 'fixed' | 'autoBlank'

/** 表格编码（字段清单 §8.4） */
export type ReportTableType =
  | 'T01'
  | 'T02'
  | 'T03'
  | 'T04'
  | 'T05'
  | 'T06'
  | 'T07'
  | 'T08'
  | 'T09'
  | 'T10'
  | 'T11'
  | 'T12'

/** 图编码（字段清单 §8.5） */
export type ReportFigureType = 'F1' | 'F2'

/** 企业信息（封面 / 基本信息表 / 表 1；R-104 例外可编辑） */
export interface EnterpriseInfo {
  /** 报告主体（单位名称 / 生产者名称） */
  companyName: string
  /** 企业地址 */
  companyAddress: string
  /** 统一社会信用代码 */
  unifiedSocialCreditCode: string
  /** 法定代表人 */
  legalPerson: string
  /** 联系方式 */
  contactPhone: string
  /** 出具报告机构（若有） */
  issuer: string
  /** 报告日期（YYYY-MM-DD） */
  reportDate: string
}

/** 封面与基本信息（字段清单 §3） */
export interface ReportCover {
  companyName: string
  companyAddress: string
  unifiedSocialCreditCode: string
  legalPerson: string
  contactPhone: string
  /** 出具报告机构（若有） */
  issuer: string
  /** 报告日期（YYYY-MM-DD） */
  reportDate: string
  productName: string
  productSpecModel: string
  /** 报告生成 = `{产品名称}产品碳足迹报告`（不显示平台名，PRD Q6/R-106） */
  generatedLabel: string
  statisticalPeriod: string
  systemBoundary: string
  lifecycleBoundary: string
  reportUnit: string
  standardBasis: string
  reportWriteDate: string
  /** 报告编号（封面展示，与 report.reportNo 一致） */
  reportNo: string
  /** 结论自动句式（不含碳储量，PRD R-113） */
  conclusion: string
}

/** 报告表格（字段清单 §5） */
export interface ReportTable {
  id: string
  reportId: string
  sectionCode: string
  tableNo: ReportTableType
  title: string
  /** 数据来源对象（details / stageSummary / 敏感性 / 数据质量 / 企业信息） */
  sourceRef: string
  columns: string[]
  rows: Array<Record<string, string>>
  /** 合计行（表 10 等） */
  totalRow?: Record<string, string>
  /** 无数据时提示 */
  emptyText?: string
}

/** 报告图（字段清单 §6） */
export interface ReportFigure {
  id: string
  reportId: string
  figureNo: ReportFigureType
  caption: string
  figureKind: 'image' | 'chartPlaceholder'
  /** 图片地址 / 占位标记 */
  content: string
  /** 是否占位（图 2 本期占位） */
  placeholder: boolean
}

/** 报告正文章节（字段清单 §4） */
export interface ReportSection {
  id: string
  reportId: string
  sectionCode: string
  sectionTitle: string
  sectionType: SectionType
  /** 序列化正文（段落 / 富文本），只读 */
  content: string
  order: number
  tables: ReportTable[]
  figures: ReportFigure[]
  /** 留白标记（敏感性 / 数据质量缺失时为 true） */
  blankFlag: boolean
}

/** 装配快照（字段清单 §7） */
export interface ReportSnapshot {
  id: string
  reportId: string
  projectSnapshot: Record<string, unknown>
  productSnapshot: {
    productName: string
    productSpec: string
    productImageUrl: string
    processes: string[]
  }
  calcResultSnapshot: PcfCalcResult
  sensitivitySnapshot: SensitivitySnapshotSummary | null
  qualitySnapshot: QualitySnapshotSummary | null
  enterpriseSnapshot: EnterpriseInfo
  snapshotAt: string
}

/** 报告（主对象，字段清单 §2） */
export interface PcfFootprintReport {
  id: string
  /** 报告编号 `PCF-R-YYYYMMDDNNN`（仅系统内部标识，不正文打印，R-106/Q1） */
  reportNo: string
  sourceProjectId: string
  sourceProjectName: string
  sourceProjectNo: string
  productName: string
  productSpec: string
  templateId: string
  templateName: string
  templateVersion: string
  status: ReportStatus
  /** 来源核算结果版本 */
  sourceCalcVersion: number
  sourceSensitivityId: string | null
  sourceQualityId: string | null
  /** 报告生成时间 `YYYY-MM-DD HH:mm` */
  generatedAt: string
  /** 待更新原因（上游变更） */
  staleReason: string
  fileName: string
  previewUrl: string
  downloadUrl: string
  /** 来源核算项目是否已删除 */
  sourceDeleted: boolean
  /** 来源企业信息库记录 id（报告管理 · 企业信息维护；R-104 引用，null = 未引用，报告内现场补录） */
  sourceEnterpriseId: string | null
  cover: ReportCover
  sections: ReportSection[]
  snapshot: ReportSnapshot
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
}

/** 新增弹窗候选项目（仅「已核算」项目） */
export interface ReportProjectOption {
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
  /** 来源企业信息库记录 id（null = 企业信息待补录） */
  enterpriseId: string | null
  /** 报告主体（企业名称）；空 = 待补录 */
  enterpriseName: string
}

/** 系统预置报告模板（本期 1 个） */
export interface ReportTemplate {
  templateId: string
  templateName: string
  applicableBoundary: string
  templateVersion: string
  isPreset: boolean
}
