import type { FlowFormulaDisposal, FlowItemType } from '@/types'

/**
 * 「排放项 → 标准公式」默认带出展示规则（与 mock 侧 `FLOW_FORMULA_RULES` 对齐）。
 * 用于工序查看详情时，在公式尚未落库（如产品新建时工序副本公式为空）的情况下，
 * 仍按流类型 / 名称关键词给出「系统默认」公式名。
 */
const DEFAULT_FORMULA_RULES: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /运输|货运|物流/, name: '运输 t·km 法' },
  { pattern: /电力|用电/, name: '因子法（电力口径）' },
  { pattern: /废水|污水|废液/, name: '因子法（废水口径）' },
  { pattern: /回收|再生|回用/, name: '回收信用法（负项）' },
]

/** 默认不计入的流类型：中间品 / 产品（其排放已计入上游工序，避免重复计算） */
const EXCLUDED_TYPES: FlowItemType[] = ['semi', 'product']

/**
 * 排放项公式展示文案（工序查看详情用）。
 * 返回 `excluded = true` 表示「不参与计算」；否则返回公式名（优先已绑定的，其次系统默认）。
 */
export function resolveFormulaText(
  flowType: FlowItemType,
  name: string,
  formulaName: string,
  formulaCode: string,
  disposal: FlowFormulaDisposal,
): { text: string; excluded: boolean } {
  if (EXCLUDED_TYPES.includes(flowType) || disposal === 'excluded') {
    return { text: '不参与计算', excluded: true }
  }
  if (formulaName) {
    return { text: formulaCode ? `${formulaName}（${formulaCode}）` : formulaName, excluded: false }
  }
  const rule = DEFAULT_FORMULA_RULES.find((item) => item.pattern.test(name))
  return { text: rule ? rule.name : '因子法', excluded: false }
}

/**
 * 「计算公式」列行文案：每个**参与计算**的流一行「流名：公式名」，
 * 不参与计算（中间品 / 产品 / 手工标记不计入）的流不展示。
 */
export function buildFormulaLines(
  flows: Array<{
    name: string
    flowType: FlowItemType
    formulaName: string
    formulaCode: string
    disposal: FlowFormulaDisposal
  }>,
): string[] {
  return flows
    .map((item) => ({
      name: item.name,
      ...resolveFormulaText(item.flowType, item.name, item.formulaName, item.formulaCode, item.disposal),
    }))
    .filter((item) => !item.excluded)
    .map((item) => `${item.name}：${item.text}`)
}

/* ============================================================================
 * 核算引擎内置公式口径（原后台「核算配置 · 公式管理」三层受控表达式，
 * 2026-10-23 该管理功能下线后，引擎改由内置代码层级按以下默认口径求值）
 * ---------------------------------------------------------------------------
 * 作用域：行级公式（row）/ 阶段汇总公式（stage）/ 全局公式（global）
 * 变量占位统一写作 [作用域.字段]，如 [当前行.活动数据]、[当前阶段.总碳排]
 * 默认口径：行级 = 活动数据 × 单位换算系数 × 排放因子；阶段 = SUM(各行碳排)；全局 = SUM(各阶段碳排)
 *          （阶段汇总时 [当前阶段.总碳排] = 该阶段各行碳排集合；全局汇总时 = 各阶段碳排集合）
 * ==========================================================================*/

/** 公式作用域 */
export type FormulaScope = 'row' | 'stage' | 'global'

/** 公式定义（引擎内置，不开放维护） */
export interface FormulaDef {
  key: string
  name: string
  scope: FormulaScope
  /** 公式标识（展示用） */
  code: string
  defaultExpression: string
}

const ROW_DEFAULT = '[当前行.活动数据] × [当前行.单位换算系数] × [当前行.排放因子]'
const STAGE_DEFAULT = 'SUM([当前阶段.总碳排])'
const GLOBAL_DEFAULT = 'SUM([当前阶段.总碳排])'

export const FORMULA_DEFS: FormulaDef[] = [
  { key: 'row-formula', name: '行级公式', scope: 'row', code: 'row', defaultExpression: ROW_DEFAULT },
  { key: 'stage-sum', name: '阶段汇总公式', scope: 'stage', code: 'stage.sum', defaultExpression: STAGE_DEFAULT },
  { key: 'global-footprint', name: '产品碳足迹公式', scope: 'global', code: 'global.footprint', defaultExpression: GLOBAL_DEFAULT },
]

/** 各作用域默认表达式（公式 key → 表达式） */
export function defaultFormulas(): Record<string, string> {
  const result: Record<string, string> = {}
  FORMULA_DEFS.forEach((item) => {
    result[item.key] = item.defaultExpression
  })
  return result
}

/** 集合型变量：阶段汇总时 = 该阶段各行碳排；全局汇总时 = 各阶段碳排 */
export const STAGE_ROWS_VAR = '当前阶段.总碳排'
/** 行级变量（核算引擎按行取值） */
export const ROW_ACTIVITY_VAR = '当前行.活动数据'
/** 行级单位换算系数：活动数据单位 → 因子分母单位（默认 1 = 同口径，无需换算） */
export const ROW_CONV_VAR = '当前行.单位换算系数'
export const ROW_FACTOR_VAR = '当前行.排放因子'

/** 变量占位替换为数值字面量（数组按求和展开），并归一化运算符 / SUM / 全角括号 */
function normalize(expression: string, values: Record<string, number | number[]>): string {
  let text = expression
  const keys = Object.keys(values).sort((a, b) => b.length - a.length)
  for (const key of keys) {
    const value = values[key]
    const literal = Array.isArray(value)
      ? value.length > 0
        ? `(${value.map((num) => `(${num})`).join('+')})`
        : '(0)'
      : `(${Number.isFinite(value) ? value : 0})`
    text = text.split(`[${key}]`).join(literal)
  }
  return text
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/[−–—]/g, '-')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/SUM\s*\(/gi, '(')
}

/** 受控表达式求值：仅支持 数字 / 变量占位 / `+ - * / ( )` 与 SUM() */
export function evaluateExpression(expression: string, values: Record<string, number | number[]>): number {
  const prepared = normalize(expression, values)
  let pos = 0

  const skip = () => {
    while (pos < prepared.length && /\s/.test(prepared[pos])) pos += 1
  }

  const parseExpr = (): number => {
    let value = parseTerm()
    for (;;) {
      skip()
      const char = prepared[pos]
      if (char === '+') {
        pos += 1
        value += parseTerm()
      } else if (char === '-') {
        pos += 1
        value -= parseTerm()
      } else return value
    }
  }

  const parseTerm = (): number => {
    let value = parseFactor()
    for (;;) {
      skip()
      const char = prepared[pos]
      if (char === '*') {
        pos += 1
        value *= parseFactor()
      } else if (char === '/') {
        pos += 1
        value /= parseFactor()
      } else return value
    }
  }

  const parseFactor = (): number => {
    skip()
    const char = prepared[pos]
    if (char === '-') {
      pos += 1
      return -parseFactor()
    }
    if (char === '+') {
      pos += 1
      return parseFactor()
    }
    if (char === '(') {
      pos += 1
      const value = parseExpr()
      skip()
      if (prepared[pos] === ')') pos += 1
      return value
    }
    const start = pos
    while (pos < prepared.length && /[0-9.]/.test(prepared[pos])) pos += 1
    if (start === pos) throw new Error('表达式解析失败')
    return Number(prepared.slice(start, pos))
  }

  const result = parseExpr()
  skip()
  if (pos !== prepared.length) throw new Error('表达式解析失败')
  if (!Number.isFinite(result)) throw new Error('表达式结果无效')
  return result
}
