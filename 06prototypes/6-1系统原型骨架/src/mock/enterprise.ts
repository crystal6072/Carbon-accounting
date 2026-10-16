import type { EnterpriseInfo } from '@/types/report'
import type { EnterprisePayload, EnterpriseQuery, EnterpriseRecord } from '@/types/enterprise'
import { formatNow } from '@/pages/report/reportMeta'

/**
 * 企业信息维护 Mock（报告管理）。
 *
 * 本库是报告编制（报告管理 · 报告编制）的企业信息来源（PRD R-104 例外）：
 * - 报告装配时按 `enterpriseId` 引用本库记录（封面 / 基本信息表 / 表 1）；
 * - 报告内允许继续编辑（仅影响该报告，不回写本库）；
 * - 被报告引用的记录禁止删除；本库记录更新后，引用该记录的报告转「待更新」（R-114）。
 *
 * 原型口径：内存 store，刷新页面即重置为种子数据。
 */

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

let enterpriseSeq = 0
let enterpriseStore: EnterpriseRecord[] = []

function nextId(): string {
  enterpriseSeq += 1
  return `ENT-${String(enterpriseSeq).padStart(3, '0')}`
}

/** 种子数据（对齐报告来源核算项目对应的企业；另备 1 条未被引用的记录） */
function seed(): EnterpriseRecord[] {
  enterpriseSeq = 0
  const now = formatNow()
  const build = (
    reportCount: number,
    companyName: string,
    unifiedSocialCreditCode: string,
    legalPerson: string,
    companyAddress: string,
    contactPhone: string,
    contactPerson: string,
    industry: string,
  ): EnterpriseRecord => ({
    id: nextId(),
    companyName,
    unifiedSocialCreditCode,
    legalPerson,
    companyAddress,
    contactPhone,
    contactPerson,
    industry,
    remark: '',
    reportCount,
    createdBy: '张核算',
    createdAt: now,
    updatedBy: '张核算',
    updatedAt: now,
  })
  return [
    build(1, '福建味家竹科技集团有限公司', '91350781MA32XXXXXX', '钭祖军', '福建省邵武市城郊工业园区', '188XXXX8888', '陈经理', '竹木制品制造'),
    build(1, '邵武市竹韵餐具有限公司', '91350781MA33YYYYYY', '李竹青', '福建省邵武市竹循环产业园', '0599-6XXXXX', '吴主管', '竹木餐具制造'),
    build(1, '福建竹材科技股份有限公司', '91350700MA34ZZZZZZ', '王林', '福建省南平市工业园区', '0599-8XXXXX', '郑专员', '人造板制造'),
    build(0, '建瓯市绿竹新材料有限公司', '91350783MA35WWWWWW', '叶青竹', '福建省建瓯市徐墩镇工业园', '0599-3XXXXX', '冯助理', '竹纤维材料'),
  ]
}

enterpriseStore = seed()

function clone(record: EnterpriseRecord): EnterpriseRecord {
  return { ...record }
}

/** 列表查询（企业名称 / 信用代码模糊匹配，按更新时间倒序） */
export function fetchEnterprises(query?: EnterpriseQuery): Promise<EnterpriseRecord[]> {
  const kw = (query?.keyword ?? '').trim().toLowerCase()
  const list = enterpriseStore
    .filter((item) => {
      if (!kw) return true
      return item.companyName.toLowerCase().includes(kw) || item.unifiedSocialCreditCode.toLowerCase().includes(kw)
    })
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  return delay(160).then(() => list.map(clone))
}

/** 详情 */
export function fetchEnterpriseDetail(id: string): Promise<EnterpriseRecord> {
  const target = enterpriseStore.find((item) => item.id === id)
  if (!target) return delay(120).then(() => Promise.reject(new Error('企业不存在或已被删除')))
  return delay(140).then(() => clone(target))
}

/** 新增（企业名称必填、不可重名） */
export async function createEnterprise(payload: EnterprisePayload): Promise<EnterpriseRecord> {
  const name = payload.companyName.trim()
  if (!name) throw new Error('请填写企业名称')
  if (enterpriseStore.some((item) => item.companyName === name)) {
    throw new Error('已存在同名企业，请检查后重试或直接编辑原记录')
  }
  await delay(200)
  const now = formatNow()
  const record: EnterpriseRecord = {
    ...payload,
    companyName: name,
    id: nextId(),
    reportCount: 0,
    createdBy: '张核算',
    createdAt: now,
    updatedBy: '张核算',
    updatedAt: now,
  }
  enterpriseStore = [record, ...enterpriseStore]
  return clone(record)
}

/** 编辑（企业名称必填、不可与其它记录重名；被报告引用也允许编辑） */
export async function updateEnterprise(id: string, payload: EnterprisePayload): Promise<EnterpriseRecord> {
  const target = enterpriseStore.find((item) => item.id === id)
  if (!target) throw new Error('企业不存在或已被删除')
  const name = payload.companyName.trim()
  if (!name) throw new Error('请填写企业名称')
  if (enterpriseStore.some((item) => item.companyName === name && item.id !== id)) {
    throw new Error('已存在同名企业，请检查后重试')
  }
  await delay(200)
  Object.assign(target, payload, { companyName: name, updatedBy: '张核算', updatedAt: formatNow() })
  return clone(target)
}

/** 删除（被报告引用时禁止删除） */
export async function deleteEnterprise(id: string): Promise<void> {
  const target = enterpriseStore.find((item) => item.id === id)
  if (!target) throw new Error('企业不存在或已被删除')
  if (target.reportCount > 0) {
    throw new Error(`该企业已被 ${target.reportCount} 份报告引用，不能删除`)
  }
  await delay(200)
  enterpriseStore = enterpriseStore.filter((item) => item.id !== id)
}

/** 报告装配取数：按 id 解析为企业信息（报告封面口径；找不到返回 null → 报告内「待补录」） */
export function resolveEnterpriseInfo(id: string | null): EnterpriseInfo | null {
  if (!id) return null
  const target = enterpriseStore.find((item) => item.id === id)
  if (!target) return null
  return {
    companyName: target.companyName,
    companyAddress: target.companyAddress,
    unifiedSocialCreditCode: target.unifiedSocialCreditCode,
    legalPerson: target.legalPerson,
    contactPhone: target.contactPhone,
    issuer: '',
    reportDate: '',
  }
}

/** 报告引用计数维护（生成报告 +1 / 删除报告 -1 / 引用切换时先减后加） */
export function noteEnterpriseReportRef(id: string | null, delta: number): void {
  if (!id) return
  const target = enterpriseStore.find((item) => item.id === id)
  if (!target) return
  target.reportCount = Math.max(0, target.reportCount + delta)
}
