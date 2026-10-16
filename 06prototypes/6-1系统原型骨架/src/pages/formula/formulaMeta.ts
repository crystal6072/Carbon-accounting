/* ============================================================================
 * 公式管理（系统管理 · 核算配置）
 * 变量体系 / 默认公式 / 公式校验 / 试算引擎 / 内存数据（原型）
 * ---------------------------------------------------------------------------
 * 作用域：行级公式（row）/ 阶段汇总公式（stage）/ 全局公式（global）
 * 变量占位统一写作 [作用域.字段]，如 [当前行.活动数据]、[当前阶段.总碳排]
 * 默认口径：行级 = 活动数据 × 单位换算系数 × 排放因子；阶段 = SUM(各行碳排)；全局 = SUM(各阶段碳排)
 *          （阶段汇总时 [当前阶段.总碳排] = 该阶段各行碳排集合；全局汇总时 = 各阶段碳排集合）
 * **核算引擎（步骤④）以此公式配置为唯一计算入口**：改公式即改算法（见 `mock/index.ts` `runPcfCalc`）。
 * ==========================================================================*/

/* ===================== 类型 ===================== */

export type FormulaScope = 'row' | 'stage' | 'global'
export type FormulaStatus = 'draft' | 'published'

/** 变量类型：决定变量库中的彩色圆点 */
export type VariableType = 'row' | 'factor' | 'global' | 'stage' | 'func'

export interface VariableDef {
  /** 插入到公式中的文本（变量含中括号，函数形如 SUM()） */
  text: string
  type: VariableType
  /** 展示名称 */
  label: string
}

export interface FormulaDef {
  key: string
  name: string
  scope: FormulaScope
  /** 公式标识（展示用） */
  code: string
  defaultExpression: string
}

export interface FormulaConfig {
  id: string
  name: string
  description: string
  status: FormulaStatus
  version: string
  updatedBy: string
  updatedAt: string
  /** 公式 key → 表达式 */
  formulas: Record<string, string>
}

/* ===================== 变量体系 ===================== */

export const VARIABLE_DOT_COLOR: Record<VariableType, string> = {
  row: '#00b396',
  factor: '#7c5cff',
  stage: '#2f80ed',
  global: '#f59e0b',
  func: '#8c8c8c',
}

/* 行级：以「当前行」为主；阶段汇总 / 全局汇总均使用 [当前阶段.总碳排] + SUM() */
export const SCOPE_VARIABLES: Record<FormulaScope, VariableDef[]> = {
  row: [
    { text: '[当前行.活动数据]', type: 'row', label: '当前行.活动数据' },
    { text: '[当前行.单位换算系数]', type: 'global', label: '当前行.单位换算系数' },
    { text: '[当前行.排放因子]', type: 'factor', label: '当前行.排放因子' },
  ],
  stage: [
    { text: '[当前阶段.总碳排]', type: 'stage', label: '当前阶段.总碳排' },
    { text: 'SUM()', type: 'func', label: 'SUM()' },
  ],
  global: [
    { text: '[当前阶段.总碳排]', type: 'stage', label: '当前阶段.总碳排' },
    { text: 'SUM()', type: 'func', label: 'SUM()' },
  ],
}

/* ===================== 作用域元信息 ===================== */

export const SCOPE_ORDER: FormulaScope[] = ['row', 'stage', 'global']

export const SCOPE_TEXT: Record<FormulaScope, string> = {
  row: '行级公式',
  stage: '阶段汇总公式',
  global: '全局公式',
}

/** 作用域 Tab 文案（含序号） */
export const SCOPE_TAB: Record<FormulaScope, string> = {
  row: '① 行级公式',
  stage: '② 阶段汇总公式',
  global: '③ 全局公式',
}

/** 当前作用域变量库的分组标题 */
export const SCOPE_VAR_TITLE: Record<FormulaScope, string> = {
  row: '行级变量',
  stage: '阶段变量',
  global: '全局变量',
}

/* ===================== 默认公式 ===================== */

const ROW_DEFAULT = '[当前行.活动数据] × [当前行.单位换算系数] × [当前行.排放因子]'
const STAGE_DEFAULT = 'SUM([当前阶段.总碳排])'
const GLOBAL_DEFAULT = 'SUM([当前阶段.总碳排])'

export const FORMULA_DEFS: FormulaDef[] = [
  { key: 'row-formula', name: '行级公式', scope: 'row', code: 'row', defaultExpression: ROW_DEFAULT },
  { key: 'stage-sum', name: '阶段汇总公式', scope: 'stage', code: 'stage.sum', defaultExpression: STAGE_DEFAULT },
  { key: 'global-footprint', name: '产品碳足迹公式', scope: 'global', code: 'global.footprint', defaultExpression: GLOBAL_DEFAULT },
]

export const FORMULA_TOTAL = FORMULA_DEFS.length

export function formulaDefOf(key: string): FormulaDef | undefined {
  return FORMULA_DEFS.find((item) => item.key === key)
}

/** 是否已发布 */
export const isPublished = (config: Pick<FormulaConfig, 'status'>) => config.status === 'published'

/** 可编辑：**已发布不可编辑**，需先取消发布 */
export const canEditFormula = (config: Pick<FormulaConfig, 'status'>) => config.status !== 'published'

/** 可删除：**已发布不可删除**，需先取消发布 */
export const canDeleteFormula = (config: Pick<FormulaConfig, 'status'>) => config.status !== 'published'

export function formulasByScope(scope: FormulaScope): FormulaDef[] {
  return FORMULA_DEFS.filter((item) => item.scope === scope)
}

export function defaultFormulas(): Record<string, string> {
  const result: Record<string, string> = {}
  FORMULA_DEFS.forEach((item) => {
    result[item.key] = item.defaultExpression
  })
  return result
}

/* ===================== 公式校验 ===================== */

export type ValidationLevel = 'success' | 'warning' | 'error'

export interface FormulaValidation {
  level: ValidationLevel
  message: string
}

const PLACEHOLDER_RE = /\[([^\]]+)\]/g

/** 集合型变量：阶段汇总时 = 该阶段各行碳排；全局汇总时 = 各阶段碳排 */
export const STAGE_ROWS_VAR = '当前阶段.总碳排'
/** 行级变量（核算引擎按行取值） */
export const ROW_ACTIVITY_VAR = '当前行.活动数据'
/** 行级单位换算系数：活动数据单位 → 因子分母单位（默认 1 = 同口径，无需换算） */
export const ROW_CONV_VAR = '当前行.单位换算系数'
export const ROW_FACTOR_VAR = '当前行.排放因子'

/** 提取公式中的变量占位（不含中括号） */
export function extractPlaceholders(expression: string): string[] {
  const result: string[] = []
  for (const match of expression.matchAll(PLACEHOLDER_RE)) result.push(match[1])
  return result
}

/** 当前作用域允许的变量名（不含中括号） */
export function allowedPlaceholders(scope: FormulaScope): string[] {
  return SCOPE_VARIABLES[scope]
    .filter((item) => item.text.startsWith('['))
    .map((item) => item.text.slice(1, -1))
}

function sampleValues(scope: FormulaScope): Record<string, number | number[]> {
  const values: Record<string, number | number[]> = {}
  allowedPlaceholders(scope).forEach((name) => {
    // 集合型变量按数组求和展开
    values[name] = name === STAGE_ROWS_VAR ? [1, 1, 1] : 1
  })
  return values
}

/** 公式校验：按当前作用域给出 成功 / 警告 / 错误 三级提示 */
export function validateFormula(scope: FormulaScope, expression: string): FormulaValidation {
  const text = expression.trim()
  if (!text) {
    return { level: 'error', message: '公式为空，请点击左侧变量或使用上方运算符编写公式' }
  }

  const placeholders = extractPlaceholders(text)
  const allowed = allowedPlaceholders(scope)
  const unknown = Array.from(new Set(placeholders.filter((name) => !allowed.includes(name))))
  if (unknown.length > 0) {
    return { level: 'error', message: `存在未定义变量：${unknown.map((name) => `[${name}]`).join('、')}` }
  }

  try {
    evaluateExpression(text, sampleValues(scope))
  } catch {
    return { level: 'error', message: '公式语法有误：请检查运算符与括号是否成对匹配' }
  }

  if (scope === 'row') {
    const required = ['当前行.活动数据', '当前行.排放因子'].filter((name) => !placeholders.includes(name))
    if (required.length > 0) {
      return { level: 'warning', message: `建议包含变量 ${required.map((name) => `[${name}]`).join('、')}，否则行碳排可能无法计算` }
    }
    if (!placeholders.includes(ROW_CONV_VAR)) {
      return { level: 'warning', message: `推荐包含变量 [${ROW_CONV_VAR}] 以统一量纲（活动数据单位 → 因子分母单位）` }
    }
    return { level: 'success', message: '行级公式校验通过，将逐行套用计算每行碳排' }
  }

  if (scope === 'stage') {
    if (!/SUM/i.test(text) && !placeholders.includes(STAGE_ROWS_VAR)) {
      return { level: 'warning', message: `建议包含 SUM() 或 [${STAGE_ROWS_VAR}] 以汇总当前阶段各行碳排` }
    }
    return { level: 'success', message: '阶段汇总公式校验通过，将累加当前阶段所有行的碳排' }
  }

  if (!/SUM/i.test(text) && !placeholders.includes(STAGE_ROWS_VAR)) {
    return { level: 'warning', message: `建议包含 SUM() 或 [${STAGE_ROWS_VAR}] 以汇总各阶段碳排` }
  }
  return { level: 'success', message: '全局公式校验通过，将按全局公式汇总各阶段碳排得出核算结果' }
}

/* ===================== 试算引擎 ===================== */

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
  if (!Number.isFinite(result)) throw new Error('试算结果无效')
  return result
}

/* ===================== 试算数据（阶段与行均由用户自行新增） ===================== */

export interface TestRow {
  id: string
  name: string
  activity: string
  /** 单位换算系数（活动数据单位 → 因子分母单位；默认 1 = 同口径） */
  conv: string
  factor: string
}

export interface TestStage {
  id: string
  name: string
  rows: TestRow[]
}

export interface TestData {
  stages: TestStage[]
}

/** 试算初始数据：阶段与数据行均留空，由用户自行新增填写 */
export function createEmptyTestData(): TestData {
  return { stages: [] }
}

export interface TestStageResult {
  id: string
  name: string
  total: number
  rows: Array<{ id: string; name: string; value: number }>
}

export interface TestResult {
  ok: boolean
  error?: string
  /** 全局公式结果（默认即单位产品碳足迹） */
  footprint: number
  /** 各阶段碳排合计（模型总碳排） */
  totalEmission: number
  stages: TestStageResult[]
}

function toNumber(text: string): number {
  const num = Number(String(text).trim())
  return Number.isFinite(num) ? num : 0
}

/**
 * 试算（口径与核算引擎 `runPcfCalc` 完全一致）：
 * 1. 行级公式逐行套用 → 每行碳排；
 * 2. 阶段汇总公式累加各行碳排 → 各阶段碳排；
 * 3. 全局公式汇总各阶段碳排 → 核算结果。
 */
export function computeTest(formulas: Record<string, string>, data: TestData): TestResult {
  const rowExpr = formulas['row-formula'] ?? ''
  const stageExpr = formulas['stage-sum'] ?? ''
  const globalExpr = formulas['global-footprint'] ?? ''

  try {
    const stages: TestStageResult[] = data.stages.map((stage) => {
      const rows = stage.rows.map((row) => {
        const value = evaluateExpression(rowExpr, {
          [ROW_ACTIVITY_VAR]: toNumber(row.activity),
          // 换算系数留空按 1 处理（同口径），避免清空输入导致整行归零
          [ROW_CONV_VAR]: row.conv.trim() ? toNumber(row.conv) : 1,
          [ROW_FACTOR_VAR]: toNumber(row.factor),
        })
        return { id: row.id, name: row.name, value }
      })
      const rowValues = rows.map((row) => row.value)
      const total = evaluateExpression(stageExpr, { [STAGE_ROWS_VAR]: rowValues })
      return { id: stage.id, name: stage.name, total, rows }
    })

    const totalEmission = stages.reduce((sum, stage) => sum + stage.total, 0)
    // 全局公式：以「各阶段碳排」为集合传入 [当前阶段.总碳排]
    const footprint = evaluateExpression(globalExpr, {
      [STAGE_ROWS_VAR]: stages.map((stage) => stage.total),
    })

    if (!Number.isFinite(footprint)) {
      return { ok: false, error: '试算结果无效，请检查全局公式', footprint: 0, totalEmission, stages }
    }

    return { ok: true, footprint, totalEmission, stages }
  } catch {
    return {
      ok: false,
      error: '试算失败：公式存在语法错误或变量缺失，请先修正公式',
      footprint: 0,
      totalEmission: 0,
      stages: [],
    }
  }
}

/* ===================== 格式化 ===================== */

export function formatValue(value: number, digits = 4): string {
  if (!Number.isFinite(value)) return '—'
  return value.toFixed(digits)
}

export function formatDateTime(date: Date): string {
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/* ===================== 内存数据（原型：刷新即重置） ===================== */

let configStore: FormulaConfig[] = [
  {
    id: 'FC-1001',
    name: '竹地板产品碳足迹核算公式',
    description: '面向竹基复合材料地板，覆盖行级公式、阶段汇总与全局折算，单位产品碳足迹按产品总产量折算。',
    status: 'published',
    version: 'v2.1',
    updatedBy: '张工',
    updatedAt: '2026-09-28 14:20',
    formulas: defaultFormulas(),
  },
  {
    id: 'FC-1002',
    name: '铝合金型材碳足迹核算公式',
    description: '铝合金挤压型材，行级公式采用活动数据直乘排放因子，阶段与全局汇总沿用统一口径。',
    status: 'draft',
    version: 'v1.0',
    updatedBy: '李工',
    updatedAt: '2026-10-02 09:15',
    formulas: {
      ...defaultFormulas(),
      'row-formula': '[当前行.活动数据] × [当前行.排放因子]',
    },
  },
  {
    id: 'FC-1003',
    name: '通用产品碳足迹核算公式',
    description: '通用模板，适用于多数离散制造产品的快速公式配置。',
    status: 'published',
    version: 'v1.3',
    updatedBy: '王工',
    updatedAt: '2026-09-15 16:40',
    formulas: defaultFormulas(),
  },
]

export function listFormulaConfigs(): FormulaConfig[] {
  return configStore
}

/** 已发布公式配置（供前台「产品碳足迹核算」引用：核算公式候选） */
export function listPublishedFormulaOptions(): Array<{ id: string; label: string; name: string }> {
  return configStore
    .filter((item) => item.status === 'published')
    .map((item) => ({ id: item.id, label: `${item.name}（${item.version}）`, name: item.name }))
}

export function getFormulaConfig(id: string): FormulaConfig | undefined {
  return configStore.find((item) => item.id === id)
}

export function upsertFormulaConfig(next: FormulaConfig): void {
  const index = configStore.findIndex((item) => item.id === next.id)
  if (index >= 0) configStore[index] = next
  else configStore = [next, ...configStore]
}

export function removeFormulaConfig(id: string): void {
  configStore = configStore.filter((item) => item.id !== id)
}

/** 发布 / 取消发布：更新配置状态 */
export function setFormulaConfigStatus(id: string, status: FormulaStatus): void {
  configStore = configStore.map((item) =>
    item.id === id ? { ...item, status, updatedBy: '系统管理员', updatedAt: formatDateTime(new Date()) } : item,
  )
}

export function createFormulaConfig(name: string): FormulaConfig {
  const config: FormulaConfig = {
    id: `FC-${Date.now().toString().slice(-6)}`,
    name: name.trim(),
    description: '新建公式配置，请完善各作用域公式后保存。',
    status: 'draft',
    version: 'v1.0',
    updatedBy: '系统管理员',
    updatedAt: formatDateTime(new Date()),
    formulas: defaultFormulas(),
  }
  configStore = [config, ...configStore]
  return config
}

export function duplicateFormulaConfig(id: string): FormulaConfig | undefined {
  const source = getFormulaConfig(id)
  if (!source) return undefined
  const copy: FormulaConfig = {
    ...source,
    id: `FC-${Date.now().toString().slice(-6)}`,
    name: `${source.name}（副本）`,
    status: 'draft',
    version: 'v1.0',
    updatedBy: '系统管理员',
    updatedAt: formatDateTime(new Date()),
    formulas: { ...source.formulas },
  }
  configStore = [copy, ...configStore]
  return copy
}
