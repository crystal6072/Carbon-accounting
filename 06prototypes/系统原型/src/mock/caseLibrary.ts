import type { CarbonCase, CarbonCasePayload, CarbonCaseType, CarbonCaseStatus } from '@/types'
import { getMockSession, request } from './index'

/**
 * 典型案例库（平台统一维护）Mock 服务
 *
 * 规则：木竹碳专题 / 标准规范 / 典型案例三类知识内容**仅平台运营维护**，
 * 企业管理员不维护企业侧内容，也不存在企业私有案例；发布后企业在业务端只读查阅。
 * - 数据归属恒为平台公共（`tenantId = '0'`），不做租户隔离；
 * - 新增 / 编辑 / 删除仅平台会话可用（写操作强制校验）；
 * - 业务前端仅返回「已发布」案例，草稿不对企业展示。
 * 原型数据在内存态，刷新回到种子值（与其余模块一致）。
 */

let idSeed = 0
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${idSeed++}`

const pad = (n: number) => String(n).padStart(2, '0')
function nowStamp(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 写操作护栏：非平台会话一律拒绝 */
function assertPlatformMaintain(): void {
  if (!getMockSession().platform) throw new Error('仅平台运营可维护知识库内容，企业端只读')
}

const COVER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#0f5132"/><text x="50%" y="50%" fill="#9be7c4" font-size="20" text-anchor="middle" dominant-baseline="middle">典型案例</text></svg>`,
  )

const seed: CarbonCase[] = [
  {
    id: 'CASE-PUB-001',
    tenantId: '0',
    caseCode: 'CASE-0001',
    caseName: '竹制品行业减排标杆案例',
    caseType: 'reduction',
    industry: '木材加工和木、竹、藤、棕、草制品业',
    subjectName: '中国竹产业协会',
    reductionAmount: 12500.5,
    coverUrl: COVER,
    summary: '面向竹制品行业的典型减排路径与成效汇总，作为行业标杆供全平台参考。',
    content:
      '<h3>一、项目背景</h3><p>以毛竹资源替代原生木材，构建从原料到成品的低碳链条，降低对高碳材料的依赖。</p><h3>二、核算边界</h3><p>摇篮到大门：原料采伐、初级加工、干燥热压、砂光。</p><h3>三、减排成效</h3><p>相较基准情景，年减排约 <strong>1.25 万 tCO2e</strong>，其中原料替代贡献约 62%。</p>',
    attachmentUrl: '',
    attachmentName: '竹制品行业减排标杆案例报告.pdf',
    linkUrl: 'https://www.cnbamboo.org.cn/cases/reduction-benchmark',
    status: 'published',
    publishedAt: '2026-09-10 09:30',
    creatorName: '平台运营',
    isDeleted: 0,
    createdAt: '2026-09-10 09:30',
    updatedAt: '2026-09-10 09:30',
  },
  {
    id: 'CASE-PUB-002',
    tenantId: '0',
    caseCode: 'CASE-0002',
    caseName: '木结构建筑碳足迹核算示范案例',
    caseType: 'accounting',
    industry: '木材加工和木、竹、藤、棕、草制品业',
    subjectName: '国家木材节约发展中心',
    reductionAmount: null,
    coverUrl: COVER,
    summary: '基于 GB/T 24067 的木结构建筑全生命周期碳足迹核算示范，统一口径供行业对标。',
    content:
      '<h3>核算边界</h3><p>摇篮到坟墓：采伐 → 加工 → 运输 → 施工 → 使用 → 废弃处置。</p><h3>关键结果</h3><ul><li>单位面积碳足迹：X kgCO2e/m²</li><li>使用阶段碳封存效益显著</li></ul><p>详细方法学见附件报告。</p>',
    attachmentUrl: '',
    attachmentName: '木结构建筑碳足迹核算示范报告.pdf',
    linkUrl: 'https://www.timber-structure.org.cn/cases/accounting-demo',
    status: 'published',
    publishedAt: '2026-09-12 14:00',
    creatorName: '平台运营',
    isDeleted: 0,
    createdAt: '2026-09-12 14:00',
    updatedAt: '2026-09-12 14:00',
  },
  {
    id: 'CASE-PUB-003',
    tenantId: '0',
    caseCode: 'CASE-0003',
    caseName: '重竹地板工艺优化示范案例',
    caseType: 'optimization',
    industry: '木材加工和木、竹、藤、棕、草制品业',
    subjectName: '竹木制品行业示范产线',
    reductionAmount: 860.0,
    coverUrl: COVER,
    summary: '平台发布的重竹地板产线工艺优化示范，单位产品能耗下降 18%，供行业参考。',
    content:
      '<h3>优化措施</h3><p>引入余热回收 + 低温干燥工艺，替换原有高能耗热压环节。</p><h3>成效</h3><p>单位产品综合能耗下降 18%，年减排约 <strong>860 tCO2e</strong>，可作为同类型产线改造的参考路径。</p>',
    attachmentUrl: '',
    attachmentName: '重竹地板工艺优化示范报告.pdf',
    linkUrl: '',
    status: 'published',
    publishedAt: '2026-09-18 11:00',
    creatorName: '平台运营',
    isDeleted: 0,
    createdAt: '2026-09-18 11:00',
    updatedAt: '2026-09-18 11:00',
  },
  {
    id: 'CASE-PUB-004',
    tenantId: '0',
    caseCode: 'CASE-0004',
    caseName: '竹浆造纸减排实践案例',
    caseType: 'reduction',
    industry: '造纸和纸制品业',
    subjectName: '竹浆造纸行业示范产线',
    reductionAmount: 2300.0,
    coverUrl: COVER,
    summary: '平台发布的竹浆替代木浆减排实践，配合碱回收改造，供全平台查阅。',
    content: '<p>以竹浆替代木浆，配合碱回收改造，年减排约 2300 tCO2e，适用于同类型造纸产线对标参考。</p>',
    attachmentUrl: '',
    attachmentName: '',
    linkUrl: '',
    status: 'published',
    publishedAt: '2026-09-19 15:00',
    creatorName: '平台运营',
    isDeleted: 0,
    createdAt: '2026-09-19 15:00',
    updatedAt: '2026-09-19 15:00',
  },
]

let store: CarbonCase[] = seed.map((item) => ({ ...item }))
let codeSeq = seed.length

export interface CarbonCaseQuery {
  caseType?: CarbonCaseType | ''
  industry?: string
  caseName?: string
  status?: CarbonCaseStatus | ''
}

/** 管理端列表：平台统一维护的全量案例（按类型 / 行业 / 名称 / 状态筛选） */
export function fetchCases(query: CarbonCaseQuery = {}): Promise<CarbonCase[]> {
  let data = store.filter((item) => item.isDeleted === 0)
  if (query.caseType) data = data.filter((item) => item.caseType === query.caseType)
  if (query.industry?.trim()) {
    const kw = query.industry.trim().toLowerCase()
    data = data.filter((item) => item.industry.toLowerCase().includes(kw))
  }
  if (query.caseName?.trim()) {
    const kw = query.caseName.trim().toLowerCase()
    data = data.filter((item) => item.caseName.toLowerCase().includes(kw))
  }
  if (query.status) data = data.filter((item) => item.status === query.status)
  const sorted = [...data].sort((a, b) => (b.publishedAt || b.updatedAt).localeCompare(a.publishedAt || a.updatedAt))
  return request(sorted)
}

export function fetchCase(id: string): Promise<CarbonCase> {
  const found = store.find((item) => item.id === id && item.isDeleted === 0)
  if (!found) return Promise.reject(new Error('案例不存在或已被删除'))
  return request(found)
}

export function createCase(payload: CarbonCasePayload): Promise<CarbonCase> {
  assertPlatformMaintain()
  const now = nowStamp()
  const id = uid('CASE')
  const caseCode = `CASE-${String(++codeSeq).padStart(4, '0')}`
  const item: CarbonCase = {
    id,
    // 平台统一维护：归属恒为平台公共，前端不可指定租户
    tenantId: '0',
    caseCode,
    caseName: payload.caseName.trim(),
    caseType: payload.caseType,
    industry: payload.industry.trim(),
    subjectName: payload.subjectName?.trim() ?? '',
    reductionAmount: payload.reductionAmount ?? null,
    coverUrl: payload.coverUrl ?? '',
    summary: payload.summary?.trim() ?? '',
    content: payload.content,
    attachmentUrl: payload.attachmentUrl ?? '',
    attachmentName: payload.attachmentName?.trim() ?? '',
    linkUrl: payload.linkUrl ?? '',
    status: payload.status ?? 'published',
    publishedAt: (payload.status ?? 'published') === 'published' ? now : '',
    creatorName: '平台运营',
    isDeleted: 0,
    createdAt: now,
    updatedAt: now,
  }
  store = [item, ...store]
  return request(item)
}

export function updateCase(id: string, payload: CarbonCasePayload): Promise<CarbonCase> {
  assertPlatformMaintain()
  const idx = store.findIndex((item) => item.id === id && item.isDeleted === 0)
  if (idx < 0) return Promise.reject(new Error('案例不存在或已被删除'))
  const prev = store[idx]
  const now = nowStamp()
  const next: CarbonCase = {
    ...prev,
    caseName: payload.caseName.trim(),
    caseType: payload.caseType,
    industry: payload.industry.trim(),
    subjectName: payload.subjectName?.trim() ?? '',
    reductionAmount: payload.reductionAmount ?? null,
    coverUrl: payload.coverUrl ?? '',
    summary: payload.summary?.trim() ?? '',
    content: payload.content,
    attachmentUrl: payload.attachmentUrl ?? '',
    attachmentName: payload.attachmentName?.trim() ?? '',
    linkUrl: payload.linkUrl ?? prev.linkUrl,
    status: payload.status ?? prev.status,
    publishedAt: (payload.status ?? prev.status) === 'published' ? prev.publishedAt || now : '',
    updatedAt: now,
  }
  store = store.map((item, i) => (i === idx ? next : item))
  return request(next)
}

export function deleteCase(id: string): Promise<void> {
  assertPlatformMaintain()
  const idx = store.findIndex((item) => item.id === id && item.isDeleted === 0)
  if (idx < 0) return Promise.reject(new Error('案例不存在或已被删除'))
  store = store.map((item, i) => (i === idx ? { ...item, isDeleted: 1 } : item))
  return request(undefined)
}

/* ===================== 业务前端（企业只读查阅） ===================== */

/** 业务端列表：仅平台「已发布」内容，草稿不对企业展示 */
export function fetchPortalCases(query: CarbonCaseQuery = {}): Promise<CarbonCase[]> {
  let data = store.filter((item) => item.isDeleted === 0 && item.status === 'published')
  if (query.caseType) data = data.filter((item) => item.caseType === query.caseType)
  if (query.industry?.trim()) {
    const kw = query.industry.trim().toLowerCase()
    data = data.filter((item) => item.industry.toLowerCase().includes(kw))
  }
  if (query.caseName?.trim()) {
    const kw = query.caseName.trim().toLowerCase()
    data = data.filter((item) => item.caseName.toLowerCase().includes(kw))
  }
  const sorted = [...data].sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''))
  return request(sorted)
}

/** 业务端详情：仅可查看已发布内容 */
export function fetchPortalCase(id: string): Promise<CarbonCase> {
  const found = store.find((item) => item.id === id && item.isDeleted === 0 && item.status === 'published')
  if (!found) return Promise.reject(new Error('案例不存在或尚未发布'))
  return request(found)
}
