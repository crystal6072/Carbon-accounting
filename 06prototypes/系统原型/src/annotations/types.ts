/** 批注系统类型定义（对齐《计算公式功能批注》解析结果） */

export type AnnotationMatchStatus = 'matched' | 'unmatched'

export type AnnotationMatchType = 'exact' | 'fuzzy' | 'region' | 'none'

export type AnnotationPriority = 'high' | 'medium' | 'low'

export interface AnnotationMatchTarget {
  /** 匹配锚点（data-ann-target 值） */
  selector: string
  /** 锚点上的按钮 / 操作项文本 */
  label: string
  /** 匹配依据 */
  reason: string
}

/**
 * 批注结构化内容块：用于「小标题 + 分条说明」式的排版。
 * - heading：小标题，独占一行，与正文之间保留间距；
 * - paragraph：正文段落（支持 **加粗** 与 `行内代码`）；
 * - list：分条列表（ordered=true 时为有序列表）；
 * - steps：纵向编号步骤，每一步单独一行；
 * - table：简短对比/说明表格（columns 为表头，rows 为数据行）；
 * - flow：流程图（Mermaid 源码，原样渲染为图形，不用文字代替）；
 * - callout：辅助信息（待确认、提示、备注等），弱化展示。
 * 文本中的 **关键词** 渲染为加粗，仅用于突出关键条件 / 限制 / 结果。
 */
export type AnnotationBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered?: boolean; items: string[] }
  | { type: 'steps'; items: string[] }
  | { type: 'table'; columns: string[]; rows: string[][] }
  | { type: 'flow'; chart: string; caption?: string }
  | { type: 'callout'; text: string }

export interface Annotation {
  id: string
  /** 业务主题（作为批注主标题） */
  title: string
  /** 批注编号（如 B01-01，作为辅助信息展示，不混入主标题） */
  code?: string
  /** 遗留纯文本正文；当存在 blocks 时优先使用 blocks */
  content?: string
  /** 结构化内容块；存在时覆盖 content 的展示方式 */
  blocks?: AnnotationBlock[]
  /** 来源（批注文档章节） */
  source?: string
  /** 涉及公式 / 计算项 */
  formula?: string
  /** 涉及操作名称 */
  operation?: string
  /** 期望对应按钮文本 */
  buttonText?: string
  /** 匹配锚点（matched 时必填） */
  selector?: string
  matchStatus: AnnotationMatchStatus
  matchType: AnnotationMatchType
  matchTargets?: AnnotationMatchTarget[]
  /** 是否进入全局标注（unmatched 恒为 true） */
  global: boolean
  priority?: AnnotationPriority
  /** 未匹配原因（unmatched 时说明） */
  unmatchedReason?: string
  /** 批注类别：用于研发视图过滤（能力 / 待确认事项 / 演示数据 不展示） */
  category?: AnnotationCategory
}

/** 批注类别 */
export type AnnotationCategory =
  | '整体流程'
  | '全局规则说明'
  | '业务状态说明'
  | '操作功能'
  | '对应业务规则'
  | '字段说明'
  | '能力'
  | '待确认事项'
  | '演示数据'

/** 研发不关心、在批注展示层中隐藏的类别 */
export const RD_HIDDEN_CATEGORIES: AnnotationCategory[] = ['能力', '待确认事项', '演示数据']

/** 该条批注是否对研发可见（不属于隐藏类别才展示） */
export function isRdVisible(annotation: Annotation): boolean {
  return !annotation.category || !RD_HIDDEN_CATEGORIES.includes(annotation.category)
}

/** 批注锚点属性名：挂到操作按钮 / 操作项上，供批注层定位 */
export const ANNOTATION_TARGET_ATTR = 'data-ann-target'
