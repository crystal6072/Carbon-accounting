import type { TagTone, TreeNodeData } from '@/shared/components'
import type {
  FactorCategory,
  FactorItem,
  FactorLibrary,
  FactorLibraryType,
  FactorLibraryVersionStatus,
  FactorSource,
  MyFactorOrigin,
} from '@/types'

/** 因子库作用域：backend = 系统管理 → 核算模型 → 排放因子库；frontend = 产品碳足迹 → 我的因子库 */
export type FactorScope = 'backend' | 'frontend'

/**
 * 因子分类（**系统内置枚举，共 6 类**，方案 §4.4），不开放维护。
 */
export const factorCategoryOrder: FactorCategory[] = ['material', 'energy', 'transport', 'waste', 'eol', 'biocarbon']

export const factorCategoryText: Record<FactorCategory, string> = {
  material: '材料因子',
  energy: '能源因子',
  transport: '运输因子',
  waste: '废弃物处理因子',
  eol: '末期处理因子',
  biocarbon: '生物碳因子',
}

export const factorCategoryTone: Record<FactorCategory, TagTone> = {
  material: 'info',
  energy: 'info',
  transport: 'default',
  waste: 'default',
  eol: 'default',
  biocarbon: 'success',
}

/* ============ 来源（数据来源，仅用于权限判定） ============ */

export const factorSourceText: Record<FactorSource, string> = {
  preset: 'environment 库',
  custom: '自定义因子库',
}

/** 数据来源口径说明（与基础库 / 方案 §3.3.3 一致：系统预置 / 组织自建） */
export const factorSourceSubText: Record<FactorSource, string> = {
  preset: '系统预置 · 全平台只读',
  custom: '组织自建 · 本组织可编辑',
}

export const factorSourceTone: Record<FactorSource, TagTone> = {
  preset: 'info',
  custom: 'success',
}

/** 维护方（列表「维护方」列口径）：后台维护 = 前台只读；组织自建 = 本组织可维护 */
export const factorMaintainerText: Record<FactorSource, string> = {
  preset: '后台维护',
  custom: '组织自建',
}

export const factorMaintainerTone: Record<FactorSource, TagTone> = {
  preset: 'info',
  custom: 'success',
}

/* ============ 展示格式化 ============ */

/** 因子复合单位：单位（分子，碳排放量类）/ 活动数据单位（分母） */
export const factorUnitText = (item: Pick<FactorItem, 'numeratorUnit' | 'denominatorUnit'>) =>
  `${item.numeratorUnit}/${item.denominatorUnit}`

/** 因子值 + 复合单位，如 `0.5703 kgCO₂e/kWh`、`-1.83 kgCO₂e/kg` */
export const factorValueText = (item: Pick<FactorItem, 'value' | 'numeratorUnit' | 'denominatorUnit'>) =>
  `${item.value} ${item.numeratorUnit}/${item.denominatorUnit}`

/* ============ 多库模型（V0.2）：库 / 库版本 / 我的因子 ============ */

/** 库来源 */
export const libraryTypeText: Record<FactorLibraryType, string> = {
  external: '商业数据库',
  builtin: '自建库',
}

export const libraryTypeTone: Record<FactorLibraryType, TagTone> = {
  external: 'info',
  builtin: 'success',
}

/** 库来源说明 */
export const libraryTypeSubText: Record<FactorLibraryType, string> = {
  external: '整库导入 · 库内只读',
  builtin: '可新增 / 编辑 / 导入',
}

/** 库版本状态（软件发版模型：同一库同时只有一个「生效中」版本） */
export const libraryVersionStatusText: Record<FactorLibraryVersionStatus, string> = {
  draft: '草稿',
  published: '生效中',
  history: '历史版本',
}

export const libraryVersionStatusTone: Record<FactorLibraryVersionStatus, TagTone> = {
  draft: 'default',
  published: 'success',
  history: 'default',
}

/** 库级状态（由「当前发布版本 + 是否整库下架」推导） */
export type FactorLibraryStatus = 'unpublished' | 'published' | 'offline'

export const libraryStatusText: Record<FactorLibraryStatus, string> = {
  unpublished: '未发布',
  published: '已发布',
  offline: '已下架',
}

export const libraryStatusTone: Record<FactorLibraryStatus, TagTone> = {
  unpublished: 'default',
  published: 'success',
  offline: 'warning',
}

/** 推导库级状态：未发布（无已发布版本）/ 已发布 / 已下架（整库下架） */
export function resolveLibraryStatus(
  library: Pick<FactorLibrary, 'currentVersionId' | 'offline'>,
): FactorLibraryStatus {
  if (!library.currentVersionId) return 'unpublished'
  return library.offline ? 'offline' : 'published'
}

/** 我的因子来源 */
export const myFactorOriginText: Record<MyFactorOrigin, string> = {
  manual: '手工新增',
  collected: '收藏副本',
}

export const myFactorOriginTone: Record<MyFactorOrigin, TagTone> = {
  manual: 'success',
  collected: 'info',
}

/* ============ GWP 分指标（化石 / 生物碳 / 土地利用 + 总量） ============ */

/** 分指标行定义：`gwpTotal` 为总指标，其余为分指标 */
export interface CaliberRow {
  key: 'gwpFossil' | 'gwpBiogenic' | 'gwpLuluc' | 'gwpTotal'
  /** 短标签（列表副行用） */
  label: string
  /** 完整标签（明细表用） */
  fullLabel: string
  hint: string
}

/** 分指标（不含总量）：化石 / 生物碳 / 土地利用 */
export const CALIBER_ROWS: CaliberRow[] = [
  { key: 'gwpFossil', label: '化石', fullLabel: '温室气体（化石）', hint: '不含生物碳口径' },
  { key: 'gwpBiogenic', label: '生物碳', fullLabel: '温室气体（生物碳）', hint: '吸收为负、释放为正' },
  { key: 'gwpLuluc', label: '土地利用', fullLabel: '温室气体（土地利用）', hint: '土地利用变化' },
]

/** 总指标行（合计） */
export const CALIBER_TOTAL_ROW: CaliberRow = {
  key: 'gwpTotal',
  label: '合计',
  fullLabel: '温室气体（总体 / 总指标）',
  hint: '= 化石 + 生物碳 + 土地利用',
}

/** 是否为分指标因子：存在任一 GWP 分项值 */
export function hasSplitCalibers(item: Pick<FactorItem, 'calibers'>): boolean {
  const cal = item.calibers
  if (!cal) return false
  return [cal.gwpFossil, cal.gwpBiogenic, cal.gwpLuluc].some((value) => value != null && Number.isFinite(value))
}

/** 取分指标值（未填返回 null） */
export function caliberValue(item: Pick<FactorItem, 'calibers'>, key: CaliberRow['key']): number | null {
  const value = item.calibers?.[key]
  return value != null && Number.isFinite(value) ? value : null
}

/** 分指标概要文案，如「化石 6.0972 · 生物碳 0.3418 · 土地利用 -」 */
export function caliberSummaryText(item: Pick<FactorItem, 'calibers'>): string {
  return CALIBER_ROWS.map((row) => `${row.label} ${caliberValue(item, row.key) ?? '-'}`).join(' · ')
}

/* ============ 商业数据库分类（ISIC 门类 → 类，两级） ============ */

/** ISIC 类（二级分类，两位编码） */
export interface IsicDivision {
  code: string
  name: string
}

/** ISIC 门类（一级分类，A~S）+ 其下的「类」（二级分类） */
export interface IsicSection extends IsicDivision {
  divisions: IsicDivision[]
}

/**
 * 商业数据库分类体系（对齐 Ecoinvent / CPCD 等库的 ISIC 分类，A~S 门类 → 类）：
 * 库详情左侧分类树按此两级展开，因子通过 `ext.isicCode`（门类）+ `ext.isicDivisionCode`（类）归集。
 */
export const ISIC_TREE: IsicSection[] = [
  {
    code: 'A', name: '农业、林业和渔业',
    divisions: [
      { code: '01', name: '作物种植、畜牧与狩猎' },
      { code: '02', name: '林业与伐木' },
      { code: '03', name: '渔业与水产养殖' },
    ],
  },
  {
    code: 'B', name: '采矿和采石',
    divisions: [
      { code: '05', name: '煤炭和褐煤开采' },
      { code: '06', name: '石油和天然气开采' },
      { code: '07', name: '金属矿开采' },
      { code: '08', name: '其他采矿和采石' },
    ],
  },
  {
    code: 'C', name: '制造业',
    divisions: [
      { code: '10', name: '食品制造' },
      { code: '13', name: '纺织品制造' },
      { code: '17', name: '纸和纸制品制造' },
      { code: '20', name: '化学品及化学制品制造' },
      { code: '23', name: '非金属矿物制品制造' },
      { code: '24', name: '基本金属制造' },
      { code: '25', name: '金属制品制造（机械除外）' },
      { code: '26', name: '计算机、电子和光学产品制造' },
      { code: '29', name: '汽车、挂车和半挂车制造' },
    ],
  },
  {
    code: 'D', name: '电力、燃气、蒸汽和空调供应',
    divisions: [{ code: '35', name: '电力、燃气、蒸汽和空调供应' }],
  },
  {
    code: 'E', name: '供水；污水处理、废物管理和治理',
    divisions: [
      { code: '36', name: '集水、净化与供水' },
      { code: '37', name: '污水处理' },
      { code: '38', name: '废物收集、处理与处置；材料回收' },
    ],
  },
  {
    code: 'F', name: '施工',
    divisions: [
      { code: '41', name: '建筑施工' },
      { code: '42', name: '土木工程施工' },
    ],
  },
  {
    code: 'G', name: '批发和零售贸易；机动车及摩托车修理',
    divisions: [
      { code: '46', name: '批发贸易（汽车和摩托车除外）' },
      { code: '47', name: '零售贸易（汽车和摩托车除外）' },
    ],
  },
  {
    code: 'H', name: '运输与储存',
    divisions: [
      { code: '49', name: '陆路运输与管道运输' },
      { code: '50', name: '水上运输' },
      { code: '51', name: '航空运输' },
      { code: '52', name: '仓储与运输辅助活动' },
    ],
  },
  {
    code: 'I', name: '住宿和餐饮服务活动',
    divisions: [
      { code: '55', name: '住宿' },
      { code: '56', name: '餐饮服务活动' },
    ],
  },
  {
    code: 'J', name: '信息与通讯',
    divisions: [
      { code: '61', name: '电信' },
      { code: '62', name: '计算机程序设计、咨询及相关活动' },
    ],
  },
  {
    code: 'M', name: '专业、科学和技术活动',
    divisions: [
      { code: '71', name: '建筑和工程活动；技术检测和分析' },
      { code: '72', name: '科学研究与开发' },
    ],
  },
  {
    code: 'N', name: '行政和支持服务活动',
    divisions: [
      { code: '77', name: '租赁和出租活动' },
      { code: '78', name: '就业活动' },
    ],
  },
  {
    code: 'S', name: '其他服务活动',
    divisions: [
      { code: '94', name: '会员组织活动' },
      { code: '95', name: '计算机及个人和家庭用品修理' },
    ],
  },
]

/** 门类中文名（按门类编码 A~S） */
export const isicSectionName = (code?: string): string =>
  ISIC_TREE.find((item) => item.code === code)?.name ?? ''

/** 类中文名（按类编码，如 24 → 基本金属制造） */
export const isicDivisionName = (code?: string): string => {
  if (!code) return ''
  for (const section of ISIC_TREE) {
    const hit = section.divisions.find((item) => item.code === code)
    if (hit) return hit.name
  }
  return ''
}

/** 因子分类全路径文案，如「C 制造业 / 24 基本金属制造」 */
export const isicPathText = (factor: Pick<FactorItem, 'ext'>): string => {
  const sectionCode = factor.ext?.isicCode
  const divisionCode = factor.ext?.isicDivisionCode
  if (!sectionCode) return '-'
  const section = `${sectionCode} ${isicSectionName(sectionCode)}`
  return divisionCode ? `${section} / ${divisionCode} ${isicDivisionName(divisionCode)}` : section
}

/** 商业数据库左侧分类树：全部分类 → 门类（一级）→ 类（二级），节点右侧为该类下因子数 */
export function buildIsicTree(factors: Pick<FactorItem, 'ext'>[]): TreeNodeData[] {
  return [
    { id: '', name: '全部分类', extra: String(factors.length) },
    ...ISIC_TREE.map((section) => ({
      id: section.code,
      name: `${section.code}：${section.name}`,
      extra: String(factors.filter((item) => item.ext?.isicCode === section.code).length),
      children: section.divisions.map((division) => ({
        id: division.code,
        name: `${division.code}：${division.name}`,
        extra: String(factors.filter((item) => item.ext?.isicDivisionCode === division.code).length),
      })),
    })),
  ]
}

/** 判断是否命中分类树节点：空 = 全部；门类编码 = 按门类过滤；类编码 = 按类过滤 */
export function matchIsicNode(factor: Pick<FactorItem, 'ext'>, nodeId: string): boolean {
  if (!nodeId) return true
  if (ISIC_TREE.some((section) => section.code === nodeId)) return factor.ext?.isicCode === nodeId
  return factor.ext?.isicDivisionCode === nodeId
}

/** 默认展开的树节点：有因子的门类，便于一眼看到分类明细 */
export function defaultIsicExpandedIds(factors: Pick<FactorItem, 'ext'>[]): string[] {
  return ISIC_TREE.filter((section) => factors.some((item) => item.ext?.isicCode === section.code)).map(
    (section) => section.code,
  )
}
