import type { SelectOption, TagTone } from '@/shared/components'
import type {
  CalcFormula,
  CalculationDirection,
  DataOwnerType,
  EmissionSourceType,
  EnableStatus,
  FactorSourceType,
  FormulaType,
  LoopObject,
} from '@/types'

/* ============ 枚举字典（系统内置，不开放维护） ============ */
/* 说明：排放源类型 / 计算方向 / 循环对象 / 绑定对象为产品领域字典，
   当前「计算公式」模块不直接引用，保留供**建模侧绑定配置**使用。 */

export const emissionSourceTypeOrder: EmissionSourceType[] = [
  'material', 'energy', 'electricity', 'heat', 'transport', 'fuel',
  'refrigerant', 'waste', 'eol', 'recycling', 'biocarbon', 'other',
]

export const emissionSourceTypeText: Record<EmissionSourceType, string> = {
  material: '材料',
  energy: '能源',
  electricity: '电力',
  heat: '热力',
  transport: '运输',
  fuel: '燃料燃烧',
  refrigerant: '制冷剂',
  waste: '废弃物',
  eol: '末期处理',
  recycling: '回收信用',
  biocarbon: '生物碳',
  other: '其他',
}

export const emissionSourceTypeTone: Record<EmissionSourceType, TagTone> = {
  material: 'info',
  energy: 'info',
  electricity: 'info',
  heat: 'info',
  transport: 'default',
  fuel: 'warning',
  refrigerant: 'warning',
  waste: 'default',
  eol: 'default',
  recycling: 'success',
  biocarbon: 'success',
  other: 'default',
}

export const calculationDirectionText: Record<CalculationDirection, string> = {
  positive: '正排放',
  negative: '负排放',
  deduction: '扣减',
}

export const calculationDirectionTone: Record<CalculationDirection, TagTone> = {
  positive: 'default',
  negative: 'success',
  deduction: 'success',
}

/** 「计入方式」候选：加项 / 减项（建模侧绑定时选择） */
export const directionOptions: SelectOption[] = [
  { label: '加项（正排放）', value: 'positive' },
  { label: '减项（扣减 / 负排放）', value: 'deduction' },
]

export const loopObjectText: Record<LoopObject, string> = {
  activity: '活动数据记录',
  material: '物料消耗记录',
  energy: '能源消耗记录',
  transport: '运输记录',
  fuel: '燃料记录',
  refrigerant: '制冷剂记录',
  waste: '废弃物记录',
  eol: '末期处理记录',
  project_param: '项目参数',
  none: '不循环',
}

export const dataOwnerTypeText: Record<DataOwnerType, string> = {
  preset: '系统预置',
  org: '组织自建',
}

/** 公式类型：按“输入口径”分类（方法学差异由建模侧绑定的排放源类型与循环对象承担） */
export const formulaTypeOrder: FormulaType[] = ['factor', 'energy', 'carbon', 'other']

export const formulaTypeText: Record<FormulaType, string> = {
  factor: '因子公式',
  energy: '能耗公式',
  carbon: '碳排公式',
  other: '其他',
}

/** 字段来源类型（活动数据为系统默认行，常量 / 变量 / 因子通过「添加字段」维护） */
export const factorSourceTypeText: Record<FactorSourceType, string> = {
  activity: '活动数据',
  variable: '变量',
  factor: '因子',
  constant: '常量',
  parameter: '参数（运行时填入）',
}

/** 数据因素可选来源库（业务库取值时） */
export const factorSourceLibOptions: string[] = ['排放因子库', '能源库', '物料库']

/** 数据因素单位候选（活动数据 / 常量可维护） */
export const factorUnitOptions: string[] = [
  'kg', 't', 'g', 'kWh', 'MWh', 'GJ', 'MJ', 'L', 'm³', 'm²', 'km', 't·km', '件', '双', '包', '个', '年', 'kgCO₂e', 'tCO₂e',
]

/* ============ 计算公式：轻量配置使用状态（无审核流程、无版本化） ============ */

export const enableStatusText: Record<EnableStatus, string> = {
  enabled: '启用',
  disabled: '禁用',
}

export const enableStatusTone: Record<EnableStatus, TagTone> = {
  enabled: 'success',
  disabled: 'default',
}

/** 可编辑：公式不做版本化与审核，均可直接编辑（变更不追溯已核算结果） */
export const canEditFormula = (_record: Pick<CalcFormula, 'status'>) => true

/** 可禁用：启用中的公式 */
export const canDisableFormula = (record: Pick<CalcFormula, 'status'>) => record.status === 'enabled'

/** 可启用：已禁用的公式 */
export const canEnableFormula = (record: Pick<CalcFormula, 'status'>) => record.status === 'disabled'

/** 可删除：**仅「已禁用」的公式可删除**（与物料库 / 能源库口径一致） */
export const canDeleteFormula = (record: Pick<CalcFormula, 'status'>) => record.status === 'disabled'

/* ============ 受控表达式：试算求值 ============ */

/**
 * 受控表达式求值：仅支持 `+ - * / ( )`、数字常量与 `SUM()`（Σ 场景按数值求和）。
 * 变量占位 `{code}` 由调用方在 values 中提供（数值或数值数组）。
 */
export function evaluateExpression(expression: string, values: Record<string, number | number[]>): number {
  const prepared = expression
    .replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (_all, code: string) => {
      const value = values[code]
      if (Array.isArray(value)) return `(${value.length > 0 ? value.join('+') : '0'})`
      const num = Number(value)
      return `(${Number.isFinite(num) ? num : 0})`
    })
    .replace(/\bSUM\s*\(/g, '(')

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
    if (start === pos) throw new Error('表达式解析失败，请检查公式写法')
    return Number(prepared.slice(start, pos))
  }

  const result = parseExpr()
  skip()
  if (pos !== prepared.length) throw new Error('表达式解析失败，请检查公式写法')
  if (!Number.isFinite(result)) throw new Error('试算结果无效，请检查样例入参')
  return result
}

/** 按结果精度格式化（字段清单 §6 decimal_precision 默认 4 位） */
export const formatCalcValue = (value: number, precision = 4) => {
  if (!Number.isFinite(value)) return '-'
  return value.toFixed(precision)
}
