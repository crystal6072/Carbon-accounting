import type { FlowFormulaDisposal, FlowItemType } from '@/types'

/**
 * 「排放项 → 标准公式」默认带出展示规则（与 mock 侧 `FLOW_FORMULA_RULES` 对齐）。
 * 用于工序查看详情时，在公式尚未落库（如产品新建时工序副本公式为空）的情况下，
 * 仍按流类型 / 名称关键词给出「系统默认」公式名。
 */
const DEFAULT_FORMULA_RULES: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /运输|货运|物流/, name: '运输 t·km 法' },
  { pattern: /蒸汽|热力|热水|采暖/, name: '净外购热力法' },
  { pattern: /天然气|柴油|汽油|燃煤|燃料|燃气|液化气/, name: '燃料燃烧（碳平衡）法' },
  { pattern: /制冷剂|冷媒|R\d{3}/i, name: '制冷剂泄漏法' },
  { pattern: /回收|再生|回用/, name: '回收信用法（负项）' },
  { pattern: /末期|废弃|填埋|焚烧|处置/, name: '末期处理法' },
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
