/**
 * 产品碳标签模板（产品碳基线库）原型 Mock 数据源。
 *
 * 与《行业基线业务 PRD》一致：产品碳标签模板是「产品碳基线库」下的独立模块，
 * 负责可视化配置产品碳标签 H5 模板（模块开关 / 主色调 / 二维码规则），并实时预览手机端效果。
 *
 * 本文件为前端原型的内存实现，不接后端；接真实接口时把下方 API 函数替换为 fetch 调用即可
 * （搜索关键字：【接真实接口】）。
 */

/* ============================ 类型 ============================ */

export type TemplateStatus = 'draft' | 'published'

/** 头部区：开关 + Logo 显示 + 主/副标题 */
export interface HeaderModule {
  enabled: boolean
  showLogo: boolean
  title: string
  subtitle: string
}

/** 通用「多选字段」模块：主开关 + 各字段显隐 */
export interface FieldToggleModule {
  enabled: boolean
  items: Record<string, boolean>
}

/** 认证详情：主开关 + 多选（机构/标准/时间）+ 在线报告图标开关 */
export interface CertModule {
  enabled: boolean
  items: { org: boolean; standard: boolean; time: boolean }
  showReportIcon: boolean
}

/** 排放构成：主开关 + 边界文字显隐 + 阶段范围 + 图表类型 */
export interface EmissionModule {
  enabled: boolean
  showBoundaryText: boolean
  stageLevel: 'first' | 'all'
  chartType: 'bar' | 'table'
}

/** 二维码规则 */
export interface QrRule {
  /** 域名前缀（平台统一配置，只读） */
  prefix: string
  /** 附加参数 */
  extra: string
  /** 权限：公开 / 内部 */
  permission: 'public' | 'internal'
}

export interface TemplateModules {
  header: HeaderModule
  coreMetrics: FieldToggleModule
  cert: CertModule
  emission: EmissionModule
  productInfo: FieldToggleModule
  scene: FieldToggleModule
}

export interface CarbonLabelTemplate {
  id: string
  name: string
  category: string
  primaryColor: string
  status: TemplateStatus
  modules: TemplateModules
  qrRule: QrRule
  createdAt: string
  updatedAt: string
}

/** 新增 / 编辑提交体（不含系统写入字段） */
export type CarbonLabelTemplateDraft = Omit<CarbonLabelTemplate, 'id' | 'createdAt' | 'updatedAt'>

/* ============================ 选项与默认配置 ============================ */

export const TEMPLATE_CATEGORIES = ['竹木', '建材', '钢铁', '化工', '纺织', '电子', '食品', '其他'] as const

/** 模块内多选字段的中文标签映射（用于在配置区与预览区复用） */
export const CORE_LABELS: Record<string, string> = { productName: '产品名', carbonValue: '碳排值', unit: '单位' }
export const CERT_LABELS: Record<string, string> = { org: '机构', standard: '标准', time: '时间' }
export const PRODUCT_INFO_LABELS: Record<string, string> = {
  image: '图片占位',
  name: '名称',
  company: '公司',
  origin: '产地',
  spec: '规格',
  sceneText: '场景文本',
  density: '密度',
  moisture: '含水率',
  biocarbon: '生物碳',
}
export const SCENE_LABELS: Record<string, string> = {
  title: '标题',
  g1: '四宫格图片1',
  g2: '四宫格图片2',
  g3: '四宫格图片3',
  g4: '四宫格图片4',
}

/** 排放构成示例阶段（占位 + 占比 + 进度条宽度） */
export const FIRST_STAGES = [
  { name: '采伐阶段', value: 83, percent: '38.1%', width: 62 },
  { name: '加工阶段', value: 135, percent: '61.9%', width: 100 },
]
export const ALL_STAGES = [
  ...FIRST_STAGES,
  { name: '运输阶段', value: 18, percent: '7.1%', width: 13 },
  { name: '使用阶段', value: 5, percent: '2.0%', width: 4 },
  { name: '废弃与循环', value: 12, percent: '4.7%', width: 9 },
]

/** 默认模板配置（含全部默认项） */
export function blankCarbonLabelTemplate(): CarbonLabelTemplate {
  return {
    id: '',
    name: '竹木产品碳标签模板',
    category: '竹木',
    primaryColor: '#1a8924',
    status: 'draft',
    modules: {
      header: { enabled: true, showLogo: true, title: '产品碳标签', subtitle: '绿色产品 · 低碳认证' },
      coreMetrics: { enabled: true, items: { productName: true, carbonValue: true, unit: true } },
      cert: { enabled: true, items: { org: true, standard: true, time: true }, showReportIcon: true },
      emission: { enabled: true, showBoundaryText: true, stageLevel: 'first', chartType: 'bar' },
      productInfo: {
        enabled: true,
        items: {
          image: true,
          name: true,
          company: true,
          origin: true,
          spec: true,
          sceneText: true,
          density: true,
          moisture: true,
          biocarbon: true,
        },
      },
      scene: { enabled: true, items: { title: true, g1: true, g2: true, g3: true, g4: true } },
    },
    qrRule: { prefix: 'https://cert.your-domain.com/label?batchId=', extra: '', permission: 'public' },
    createdAt: '',
    updatedAt: '',
  }
}

/* ============================ 内存数据 ============================ */

function nowText(): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`
}

const seed: CarbonLabelTemplate[] = [
  {
    ...blankCarbonLabelTemplate(),
    id: 'CLT-001',
    name: '竹木产品碳标签模板',
    category: '竹木',
    primaryColor: '#1a8924',
    status: 'published',
    createdAt: '2026-10-25 09:00',
    updatedAt: '2026-10-25 09:30',
  },
  {
    ...blankCarbonLabelTemplate(),
    id: 'CLT-002',
    name: '建材碳标签模板',
    category: '建材',
    primaryColor: '#1890ff',
    status: 'draft',
    modules: {
      ...blankCarbonLabelTemplate().modules,
      emission: { enabled: true, showBoundaryText: true, stageLevel: 'all', chartType: 'table' },
    },
    createdAt: '2026-10-26 16:10',
    updatedAt: '2026-10-26 16:20',
  },
]

let store: CarbonLabelTemplate[] = seed.map((item) => ({ ...item, modules: JSON.parse(JSON.stringify(item.modules)), qrRule: { ...item.qrRule } }))

const delay = (ms = 200) => new Promise<void>((resolve) => setTimeout(resolve, ms))
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

/* ============================ API（【接真实接口】替换为 fetch） ============================ */

export async function fetchCarbonLabelTemplates(): Promise<CarbonLabelTemplate[]> {
  await delay()
  return clone(store)
}

export async function fetchCarbonLabelTemplate(id: string): Promise<CarbonLabelTemplate> {
  await delay()
  const found = store.find((item) => item.id === id)
  if (!found) throw new Error('模板不存在或已被删除')
  return clone(found)
}

export async function createCarbonLabelTemplate(draft: CarbonLabelTemplateDraft): Promise<CarbonLabelTemplate> {
  await delay()
  const now = nowText()
  const record: CarbonLabelTemplate = {
    ...clone(draft),
    id: `CLT-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  }
  store = [record, ...store]
  return clone(record)
}

export async function updateCarbonLabelTemplate(id: string, draft: CarbonLabelTemplateDraft): Promise<CarbonLabelTemplate> {
  await delay()
  const idx = store.findIndex((item) => item.id === id)
  if (idx < 0) throw new Error('模板不存在或已被删除')
  const updated: CarbonLabelTemplate = {
    ...store[idx],
    ...clone(draft),
    id,
    updatedAt: nowText(),
  }
  store[idx] = updated
  return clone(updated)
}

export async function deleteCarbonLabelTemplate(id: string): Promise<void> {
  await delay()
  store = store.filter((item) => item.id !== id)
}
