import type {
  BambooCarbonAttachment,
  BambooCarbonCategory,
  BambooCarbonTopic,
  BambooCarbonTopicStatus,
  BambooCarbonTopicPayload,
} from '@/types'
import { getMockSession, request } from './index'
import * as XLSX from 'xlsx'

/**
 * 木竹碳专题库（平台统一维护）Mock 服务
 *
 * 规则：木竹碳专题 / 标准规范 / 典型案例三类知识内容**仅平台运营维护**，
 * 企业管理员不维护企业侧内容，也不存在企业私有文章；发布后企业在业务端只读查阅。
 * - 数据归属恒为平台公共（`tenantId = '0'`），不做租户隔离；
 * - 新增 / 编辑 / 删除仅平台会话可用（写操作强制校验）；
 * - 业务前端仅返回「已发布」文章，草稿不对企业展示。
 * 状态(status)为系统自动流转：保存即发布，前端无状态编辑控件。
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
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#0f5132"/><text x="50%" y="50%" fill="#9be7c4" font-size="20" text-anchor="middle" dominant-baseline="middle">木竹碳专题</text></svg>`,
  )

/** 一张模拟 Excel 表格截图的 SVG（演示用，代表核算模板界面） */
const EXCEL_SHOT =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="260">
      <rect width="520" height="260" fill="#ffffff" stroke="#d0d5dd"/>
      <rect x="0" y="0" width="520" height="34" fill="#1f6f43"/>
      <text x="12" y="22" fill="#fff" font-size="14">木竹产品碳足迹核算模板.xlsx</text>
      <g font-size="13" fill="#333">
        <rect x="0" y="34" width="520" height="28" fill="#eef2f0"/>
        <text x="10" y="53">产品名称</text><text x="200" y="53">单位</text><text x="360" y="53">碳足迹(kgCO2e)</text>
        <line x1="0" y1="62" x2="520" y2="62" stroke="#d0d5dd"/>
        <text x="10" y="85">重竹地板</text><text x="200" y="85">m²</text><text x="360" y="85">12.5</text>
        <text x="10" y="115">竹集成材</text><text x="200" y="115">m³</text><text x="360" y="115">340</text>
        <text x="10" y="145">合计</text><text x="360" y="145">=SUM(C3:C4)</text>
      </g>
      <line x1="190" y1="34" x2="190" y2="260" stroke="#e3e8e6"/>
      <line x1="350" y1="34" x2="350" y2="260" stroke="#e3e8e6"/>
    </svg>`,
  )

/** 生成一份真实可下载的 .xlsx 模板（SheetJS 在浏览器端实时构建） */
function buildSampleXlsx(): BambooCarbonAttachment {
  const ws = XLSX.utils.aoa_to_sheet([
    ['木竹产品碳足迹核算模板'],
    ['产品名称', '单位', '碳足迹(kgCO2e)'],
    ['重竹地板', 'm²', 12.5],
    ['竹集成材', 'm³', 340],
    ['合计', '', { f: 'SUM(C3:C4)' }],
  ])
  ws['!cols'] = [{ wch: 16 }, { wch: 8 }, { wch: 18 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '核算模板')
  const b64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' })
  const url = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${b64}`
  return {
    id: 'att-xlsx-template',
    name: '木竹产品碳足迹核算模板.xlsx',
    url,
    size: Math.round((b64.length * 3) / 4),
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }
}

const WECHAT_URL = 'https://mp.weixin.qq.com/s/zROa6rXdL4vgFPjG5FgxsA'

const seed: BambooCarbonTopic[] = [
  {
    id: 'BC-PUB-001',
    tenantId: '0',
    title: '竹材碳固存机理与计量方法',
    category: '1',
    summary: '系统梳理毛竹等竹种在生长周期内的碳固存路径与生物量计量口径。',
    coverUrl: COVER,
    content:
      '<h3>一、竹材碳固存机理</h3><p>竹类植物生长迅速，幼龄期即进入高速固碳阶段，单位面积年固碳量常高于多数乔木。其碳流主要包括<strong>地上生物量固碳</strong>、<strong>地下根系与土壤有机碳</strong>两部分。</p><table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse"><thead><tr><th>碳库</th><th>说明</th><th>典型计量口径</th></tr></thead><tbody><tr><td>地上生物量</td><td>秆、枝、叶</td><td>生物量 × 含碳率（约 0.47）</td></tr><tr><td>地下部分</td><td>竹鞭、根系</td><td>根系生物量系数法</td></tr></tbody></table><h3>二、计量要点</h3><p>建议以「收获法 + 材积转换」为主，结合样地监测进行交叉校验。</p>',
    attachments: [],
    link: '',
    status: 'published',
    publishedAt: '2026-09-10 09:30',
    creatorName: '平台运营',
    isDeleted: 0,
    createdAt: '2026-09-10 09:30',
    updatedAt: '2026-09-10 09:30',
  },
  {
    id: 'BC-PUB-002',
    tenantId: '0',
    title: '竹木产品碳循环与生命周期评价',
    category: '2',
    summary: '从摇篮到大门视角，解析竹木制品在加工、使用、废弃阶段的碳循环。',
    coverUrl: COVER,
    content:
      '<h3>碳循环视角</h3><p>竹木制品在「使用阶段」持续替代高碳材料（如钢材、塑料），形成<em>延迟排放</em>与<em>替代减排</em>双重效益。</p><ul><li>加工阶段：干燥、胶合能耗是主要排放源</li><li>使用阶段：长寿命产品碳封存效益显著</li><li>废弃阶段：可降解 / 可能源化利用</li></ul>',
    attachments: [],
    link: '',
    status: 'published',
    publishedAt: '2026-09-12 14:00',
    creatorName: '平台运营',
    isDeleted: 0,
    createdAt: '2026-09-12 14:00',
    updatedAt: '2026-09-12 14:00',
  },
  {
    id: 'BC-PUB-003',
    tenantId: '0',
    title: '生物质碳排放因子选用指南',
    category: '3',
    summary: '针对竹木加工余热、边角料能源化等场景的排放因子选取建议。',
    coverUrl: COVER,
    content:
      '<h3>关键排放源</h3><p>竹木加工过程的主要生物质碳排放来自边角料焚烧 / 能源化利用，应优先采用本地实测缺省值，缺省时引用背景数据库。</p>',
    attachments: [],
    link: '',
    status: 'published',
    publishedAt: '2026-09-15 10:00',
    creatorName: '平台运营',
    isDeleted: 0,
    createdAt: '2026-09-15 10:00',
    updatedAt: '2026-09-15 10:00',
  },
  {
    id: 'BC-PUB-DRAFT-001',
    tenantId: '0',
    title: '竹材含水率对固碳量影响的试验综述（待发布）',
    category: '1',
    summary: '【草稿】平台侧整理中，发布后企业方可在业务端查阅。',
    coverUrl: COVER,
    content: '<p>试验数据整理中，待平台审核后发布。</p>',
    attachments: [],
    link: '',
    status: 'draft',
    publishedAt: '',
    creatorName: '平台运营',
    isDeleted: 0,
    createdAt: '2026-09-20 16:20',
    updatedAt: '2026-09-20 16:20',
  },
  /* ===== 验收演示「有分量」的两篇 ===== */
  {
    id: 'BC-PUB-004',
    tenantId: '0',
    title: '木竹产品碳足迹核算Excel模板及使用说明',
    category: '4',
    summary: '附真实可下载的核算 Excel 模板：先讲清核算边界设定，再给工具。',
    coverUrl: COVER,
    content:
      '<h3>一、核算边界如何设定</h3><p>竹木产品碳足迹（从摇篮到大门）建议按以下边界设定：</p><ol><li><strong>原料获取</strong>：竹材种植、采伐、运输至初加工；</li><li><strong>生产加工</strong>：干燥、胶合 / 热压、砂光、饰面；</li><li><strong>废弃物</strong>：边角料能源化利用的减排抵扣。</li></ol><p>边界确定后，将各工序的物料、能耗、运输数据填入下列模板，碳足迹即自动汇总。</p><h3>二、模板截图</h3><p><img src="' +
      EXCEL_SHOT +
      '" alt="核算模板截图" style="max-width:100%;border:1px solid #d0d5dd;border-radius:6px" /></p><h3>三、下载工具</h3><p>文章底部已挂 <strong>木竹产品碳足迹核算模板.xlsx</strong>，含「产品名称 / 单位 / 碳足迹」三列与合计公式，可直接套用。这就叫「工具」。</p>',
    attachments: [buildSampleXlsx()],
    link: '',
    status: 'published',
    publishedAt: '2026-09-22 10:00',
    creatorName: '平台运营',
    isDeleted: 0,
    createdAt: '2026-09-22 10:00',
    updatedAt: '2026-09-22 10:00',
  },
  {
    id: 'BC-PUB-005',
    tenantId: '0',
    title: '重磅！发改委发布“以竹代塑”最新减碳鼓励政策',
    category: '5',
    summary: '政策明确将竹缠绕复合材、竹质包装等纳入绿色低碳产品推广目录，利好竹木碳业务。',
    coverUrl: COVER,
    content:
      '<h3>核心观点</h3><p>近期发布的「以竹代塑」鼓励政策，从<strong>替代场景</strong>、<strong>财政激励</strong>、<strong>标准体系建设</strong>三方面推动竹制品规模化应用：</p><ul><li>明确竹缠绕复合管、竹质一次性餐具等为重点替代产品；</li><li>对竹材综合利用项目给予绿色信贷与税收优惠；</li><li>加快制定竹制品碳足迹核算与标签标准。</li></ul><p>对竹木碳业务而言，这意味着下游需求扩容与碳减排量可量化、可交易，是明显的政策利好。</p><blockquote>原文链接见文末【点击查看原文】。</blockquote><p><a href="' +
      WECHAT_URL +
      '" target="_blank" rel="noreferrer">👉 点击查看原文</a></p>',
    attachments: [],
    link: WECHAT_URL,
    status: 'published',
    publishedAt: '2026-09-23 18:30',
    creatorName: '平台运营',
    isDeleted: 0,
    createdAt: '2026-09-23 18:30',
    updatedAt: '2026-09-23 18:30',
  },
]

let store: BambooCarbonTopic[] = seed.map((item) => ({ ...item }))

export interface BambooCarbonQuery {
  category?: BambooCarbonCategory | ''
  title?: string
  status?: BambooCarbonTopicStatus | ''
}

/** 管理端列表：平台统一维护的全量文章（分类 / 标题 / 状态筛选在内存层完成） */
export function fetchBambooCarbonTopics(query: BambooCarbonQuery = {}): Promise<BambooCarbonTopic[]> {
  let data = store.filter((item) => item.isDeleted === 0)
  if (query.category) data = data.filter((item) => item.category === query.category)
  if (query.title?.trim()) {
    const kw = query.title.trim().toLowerCase()
    data = data.filter((item) => item.title.toLowerCase().includes(kw))
  }
  if (query.status) data = data.filter((item) => item.status === query.status)
  const sorted = [...data].sort((a, b) => (b.publishedAt || b.updatedAt).localeCompare(a.publishedAt || a.updatedAt))
  return request(sorted)
}

export function fetchBambooCarbonTopic(id: string): Promise<BambooCarbonTopic> {
  const found = store.find((item) => item.id === id && item.isDeleted === 0)
  if (!found) return Promise.reject(new Error('文章不存在或已被删除'))
  return request(found)
}

export function createBambooCarbonTopic(payload: BambooCarbonTopicPayload): Promise<BambooCarbonTopic> {
  assertPlatformMaintain()
  const now = nowStamp()
  const topic: BambooCarbonTopic = {
    id: uid('BC'),
    // 平台统一维护：归属恒为平台公共，前端不可指定租户
    tenantId: '0',
    title: payload.title.trim(),
    category: payload.category,
    summary: payload.summary?.trim() ?? '',
    coverUrl: payload.coverUrl ?? '',
    content: payload.content,
    attachments: payload.attachments ?? [],
    link: payload.link ?? '',
    // 状态由系统自动流转：保存即发布
    status: 'published',
    publishedAt: now,
    creatorName: '平台运营',
    isDeleted: 0,
    createdAt: now,
    updatedAt: now,
  }
  store = [topic, ...store]
  return request(topic)
}

export function updateBambooCarbonTopic(id: string, payload: BambooCarbonTopicPayload): Promise<BambooCarbonTopic> {
  assertPlatformMaintain()
  const idx = store.findIndex((item) => item.id === id && item.isDeleted === 0)
  if (idx < 0) return Promise.reject(new Error('文章不存在或已被删除'))
  const prev = store[idx]
  const now = nowStamp()
  const next: BambooCarbonTopic = {
    ...prev,
    title: payload.title.trim(),
    category: payload.category,
    summary: payload.summary?.trim() ?? '',
    coverUrl: payload.coverUrl ?? '',
    content: payload.content,
    attachments: payload.attachments ?? [],
    link: payload.link ?? '',
    // 编辑后同样自动发布（系统流转）
    status: 'published',
    publishedAt: prev.publishedAt || now,
    updatedAt: now,
  }
  store = store.map((item, i) => (i === idx ? next : item))
  return request(next)
}

export function deleteBambooCarbonTopic(id: string): Promise<void> {
  assertPlatformMaintain()
  const idx = store.findIndex((item) => item.id === id && item.isDeleted === 0)
  if (idx < 0) return Promise.reject(new Error('文章不存在或已被删除'))
  store = store.map((item, i) => (i === idx ? { ...item, isDeleted: 1 } : item))
  return request(undefined)
}

/* ===================== 业务前端（企业只读查阅） ===================== */

/** 业务端列表：仅平台「已发布」内容，草稿不对企业展示 */
export function fetchPortalBambooCarbonTopics(query: BambooCarbonQuery = {}): Promise<BambooCarbonTopic[]> {
  let data = store.filter((item) => item.isDeleted === 0 && item.status === 'published')
  if (query.category) data = data.filter((item) => item.category === query.category)
  if (query.title?.trim()) {
    const kw = query.title.trim().toLowerCase()
    data = data.filter((item) => item.title.toLowerCase().includes(kw))
  }
  const sorted = [...data].sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''))
  return request(sorted)
}

/** 业务端详情：仅可查看已发布内容 */
export function fetchPortalBambooCarbonTopic(id: string): Promise<BambooCarbonTopic> {
  const found = store.find((item) => item.id === id && item.isDeleted === 0 && item.status === 'published')
  if (!found) return Promise.reject(new Error('文章不存在或尚未发布'))
  return request(found)
}
