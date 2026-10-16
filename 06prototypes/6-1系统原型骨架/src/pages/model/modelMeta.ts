import { collectTreeValues } from '@/shared/components'
import type { TagTone } from '@/shared/components'
import type { ModelStatus, MyModelOrigin, TreeOption } from '@/types'

/**
 * 模型管理（前后台）元数据：状态 / 来源文案与配色、两步向导步骤、模型库过滤条件。
 * 界面口径唯一来源，供后台模型管理、前台模型库 / 我的模型、PCF 选模型弹窗共用。
 */

/** 模型状态文案 */
export const MODEL_STATUS_TEXT: Record<ModelStatus, string> = {
  draft: '草稿',
  published: '已发布',
  disabled: '已停用',
}

/** 模型状态 Tag 配色：草稿=灰 / 已发布=绿 / 已停用=蓝 */
export const MODEL_STATUS_TONE: Record<ModelStatus, TagTone> = {
  draft: 'default',
  published: 'success',
  disabled: 'info',
}

/** 我的模型来源文案 */
export const MY_MODEL_ORIGIN_TEXT: Record<MyModelOrigin, string> = {
  manual: '自己新增',
  collected: '收藏副本',
}

/** 我的模型来源 Tag 配色 */
export const MY_MODEL_ORIGIN_TONE: Record<MyModelOrigin, TagTone> = {
  manual: 'info',
  collected: 'warning',
}

/** 两步向导步骤定义（与 PCF 步骤①②同名同款） */
export interface ModelStepDef {
  seq: number
  name: string
  desc: string
}

export const MODEL_STEPS: ModelStepDef[] = [
  { seq: 1, name: '目标与范围', desc: '核算标准、系统边界与生命周期阶段' },
  { seq: 2, name: '产品建模', desc: '各生命周期阶段的数据项与过程节点' },
]

/** 模型库 / 选模型弹窗的过滤条件（产品分类 / 核算标准 / 行业标签） */
export interface ModelFilterValue {
  categoryId: string
  standardId: string
  industries: string[]
}

export const EMPTY_MODEL_FILTER: ModelFilterValue = { categoryId: '', standardId: '', industries: [] }

/** 过滤条件是否为空（用于「重置」按钮禁用态） */
export function isModelFilterEmpty(value: ModelFilterValue): boolean {
  return !value.categoryId && !value.standardId && value.industries.length === 0
}

/** 模型卡片 / 列表分页大小 */
export const MODEL_PAGE_SIZE = 9

/* ===================== 卡片 / 列表展示口径（对齐竞品卡片信息结构） ===================== */

/**
 * 标准号取「代号段」，用于卡片右上角角标（对齐竞品卡片右上角的 `ISO` 角标）。
 * 如 `GB/T 24067-2024` → `GB/T`、`ISO 14067:2018` → `ISO`、`DB35/T 2089-2022` → `DB35/T`。
 */
export function standardBadgeOf(code: string): string {
  const token = code.trim().split(/\s+/)[0] ?? ''
  return token || 'STD'
}

/** 标准层级（对齐竞品卡片的「国际」标签口径）：国际 / 国家 / 行业 / 地方 / 团体 / 其他 */
export function standardLevelOf(code: string): string {
  const upper = code.trim().toUpperCase()
  if (/^(ISO|IEC|EN|BS|DIN|ASTM|PAS)/.test(upper)) return '国际'
  if (/^GB/.test(upper)) return '国家'
  if (/^(HB|JB|QB|SB|SN|YS)/.test(upper)) return '行业'
  if (/^DB/.test(upper)) return '地方'
  if (/^T\//.test(upper)) return '团体'
  return '其他'
}

/** 行业标签展示：为空 = 全行业；多个取首个 + 「等 N 个行业」 */
export function industryLabelOf(industries: string[]): string {
  if (industries.length === 0) return '全行业'
  if (industries.length === 1) return industries[0]
  return `${industries[0]} 等 ${industries.length} 个行业`
}

/** 产品分类 id → 名称（入参为扁平分类表 / 分类树展开结果） */
export function categoryNameOf(list: Array<{ id: string; name: string }>, id: string): string {
  const hit = list.find((item) => item.id === id)
  return hit ? hit.name : '未指定分类'
}

/** 折叠树为扁平节点（取 id / name），用于分类 id → 名称映射 */
export function flattenCategoryTree(tree: TreeOption[]): Array<{ id: string; name: string }> {
  const out: Array<{ id: string; name: string }> = []
  const walk = (nodes: TreeOption[]) => {
    nodes.forEach((node) => {
      out.push({ id: node.value, name: node.label })
      if (node.children && node.children.length > 0) walk(node.children)
    })
  }
  walk(tree)
  return out
}

/** 可被筛选的模型最小结构（平台模型 / 我的模型 / 选模型候选项均满足） */
export interface FilterableModel {
  name: string
  code: string
  categoryId: string
  standardId: string
  industries: string[]
}

/**
 * 模型库 / 选模型弹窗的过滤：关键词（名称 / 编码）+ 产品分类（父级命中其下所有子级）
 * + 核算标准（精确）+ 行业标签（任一命中）。
 */
export function matchesModelFilter(
  model: FilterableModel,
  filter: ModelFilterValue,
  keyword: string,
  categoryTree: TreeOption[],
): boolean {
  const kw = keyword.trim().toLowerCase()
  if (kw && !model.name.toLowerCase().includes(kw) && !model.code.toLowerCase().includes(kw)) return false
  if (filter.categoryId) {
    const scope = collectTreeValues(categoryTree, filter.categoryId)
    // 父级命中其下所有子级；树中查不到该值时退化为精确匹配（防御性）
    const matched = scope.length > 0 ? scope.includes(model.categoryId) : model.categoryId === filter.categoryId
    if (!matched) return false
  }
  if (filter.standardId && model.standardId !== filter.standardId) return false
  if (filter.industries.length > 0 && !model.industries.some((item) => filter.industries.includes(item))) return false
  return true
}
