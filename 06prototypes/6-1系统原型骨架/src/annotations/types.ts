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

export interface Annotation {
  id: string
  title: string
  content: string
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
}

/** 批注锚点属性名：挂到操作按钮 / 操作项上，供批注层定位 */
export const ANNOTATION_TARGET_ATTR = 'data-ann-target'

/** 批注作用域：仅核算引擎（计算公式）路由下展示 */
export const ANNOTATION_SCOPE_PREFIX = '/model/calc-engine'
