/**
 * 企业信息（报告管理 · 企业信息维护）。
 *
 * 口径依据《报告生成业务PRD》R-104 / 《报告生成字段清单》§3：
 * 企业信息是报告正文「零人工编辑」的**唯一例外**——报告编制时读取本库并允许编辑、
 * 无记录 / 字段缺失时允许现场补录；本库记录是报告封面、基本信息表与表 1 的数据来源。
 */

/** 企业信息库记录（报告封面 / 基本信息表 / 表 1 的引用来源） */
export interface EnterpriseRecord {
  id: string
  /** 企业名称（报告主体 / 生产者名称） */
  companyName: string
  /** 统一社会信用代码 */
  unifiedSocialCreditCode: string
  /** 法定代表人 */
  legalPerson: string
  /** 企业地址 */
  companyAddress: string
  /** 联系方式 */
  contactPhone: string
  /** 联系人 */
  contactPerson: string
  /** 所属行业 */
  industry: string
  /** 备注 */
  remark: string
  /** 被报告引用次数（派生，只读） */
  reportCount: number
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
}

/** 新增 / 编辑入参（系统字段由服务端补齐） */
export type EnterprisePayload = Omit<
  EnterpriseRecord,
  'id' | 'reportCount' | 'createdBy' | 'createdAt' | 'updatedBy' | 'updatedAt'
>

/** 企业信息查询条件 */
export interface EnterpriseQuery {
  /** 企业名称 / 统一社会信用代码 模糊匹配 */
  keyword?: string
}
