import type {
  CalcFormula,
  CategoryItem,
  CategoryLevel,
  DataOwnerType,
  DictItem,
  DictType,
  EmissionCategory,
  EnableStatus,
  EnergyItem,
  EnergyOption,
  EnergyType,
  FactorCalibers,
  FactorCategory,
  FactorDetail,
  FactorExchange,
  FactorExt,
  FactorItem,
  FactorLibrary,
  FactorLibraryType,
  FactorLibraryVersion,
  FactorReferenceItem,
  FactorSource,
  MyFactor,
  MyFactorLibrary,
  FlowFormulaDisposal,
  FlowItemType,
  FormulaFactor,
  FormulaType,
  IndustryItem,
  IndustryLevel,
  LifecycleLevel,
  LifecycleStageItem,
  MaterialFlowType,
  MaterialItem,
  MaterialOption,
  MaterialSubCategory,
  CarbonModel,
  ModelDataItem,
  ModelProcessNode,
  ModelStatus,
  MyModel,
  PcfModelOption,
  MyProductBatchFailure,
  MyProductBatchResult,
  MyProductItem,
  MyProductSource,
  MyProcessBatchFailure,
  MyProcessBatchResult,
  MyProcessDetail,
  MyProcessItem,
  MyProcessSource,
  OperationFlowItem,
  OperationItem,
  OperationLogItem,
  OperationTemplate,
  OperationType,
  ProcessApplicableProduct,
  ProcessDetail,
  ProcessItem,
  ProcessOperationItem,
  ProcessTemplate,
  ProductFlowItem,
  ProductItem,
  ProductProcessItem,
  ProductScenario,
  ProductUseStatus,
  PcfBoundary,
  PcfActivityData,
  PcfActivityValue,
  PcfCalcResult,
  PcfCaliberKey,
  PcfCaliberValues,
  PcfCheckIssue,
  PcfCheckResult,
  PcfDataItemType,
  PcfFactorOption,
  PcfOperationConfig,
  PcfLifecycleStage,
  PcfOrgOption,
  PcfProductOption,
  PcfProductSource,
  PcfProject,
  PcfProjectStatus,
  PcfReport,
  PcfReportCover,
  PcfReportDraft,
  PcfReportTemplate,
  PcfProcessNode,
  PcfResultDetail,
  PcfStageDataItem,
  PcfStageImportPreset,
  PcfStageImportRow,
  PcfStandardOption,
  StandardAttachment,
  StandardItem,
  StandardStatus,
  TreeOption,
  UnitDetail,
  UnitItem,
  PcfUnitEmission,
  UnitReferenceItem,
  UnitType,
} from '@/types'
import { DICT_TYPE_SYSTEM_BOUNDARY, PCF_CALIBERS } from '@/types'
import { parseCsvText, toCsv } from '@/shared/utils/csv'
import {
  ROW_ACTIVITY_VAR,
  ROW_CONV_VAR,
  ROW_FACTOR_VAR,
  STAGE_ROWS_VAR,
  defaultFormulas,
  evaluateExpression,
} from '@/pages/formula/formulaMeta'
import { unitTypeOrder, unitTypeText } from '@/pages/unit/unitMeta'
import {
  calcFormulaSeed,
  categorySeed,
  dictItemSeed,
  dictTypeSeed,
  energyOptions,
  energySeed,
  externalFactorSeed,
  factorLibrarySeed,
  factorLibraryVersionSeed,
  factorReferenceSeed,
  factorSeed,
  myFactorLibrarySeed,
  myFactorSeed,
  industryOptions,
  industrySeed,
  lifecycleOptions,
  lifecycleSeed,
  materialOptions,
  materialSeed,
  modelSeed,
  myModelSeed,
  operationSeed,
  operationTemplates,
  pcfActivitySeed,
  pcfCalcResultSeed,
  pcfOperationSeed,
  pcfOrgOptionSeed,
  pcfProjectSeed,
  pcfStageDataSeed,
  pcfWeightUnitOptions,
  processSeed,
  processTemplates,
  standardSeed,
  productSeed,
  unitOptions,
  unitReferenceSeed,
  unitSeed,
} from './data'

/** 我的产品库（前台 P27）类型转发：页面从 `@/mock` 一处取数 */
export type { MyProductBatchFailure, MyProductBatchResult, MyProductItem, MyProductSource } from '@/types'

/** 我的工艺库（前台 B3）类型转发：页面从 `@/mock` 一处取数 */
export type {
  MyProcessBatchFailure,
  MyProcessBatchResult,
  MyProcessDetail,
  MyProcessItem,
  MyProcessSource,
} from '@/types'

/** 模型管理（前后台）类型转发：页面从 `@/mock` 一处取数 */
export type {
  CarbonModel,
  ModelContent,
  ModelDataItem,
  ModelProcessNode,
  ModelScope,
  ModelStatus,
  MyModel,
  MyModelOrigin,
  PcfModelOption,
} from '@/types'

/** 内存态数据源，模拟后端持久化 */
let categoryStore: CategoryItem[] = clone(categorySeed)
let productStore: ProductItem[] = clone(productSeed)
let operationStore: OperationItem[] = clone(operationSeed)
let processStore: ProcessItem[] = clone(processSeed)
let materialStore: MaterialItem[] = clone(materialSeed)
let energyStore: EnergyItem[] = clone(energySeed)
let unitStore: UnitItem[] = clone(unitSeed)
/** 生命周期阶段：轻量基础数据，不设数据来源与引用状态（与物料库 / 能源库口径一致） */
let lifecycleStore: LifecycleStageItem[] = clone(lifecycleSeed)
/** 数据字典：字典类型 + 字典项（平台支撑维护；系统边界字典供前台核算引用） */
let dictTypeStore: DictType[] = clone(dictTypeSeed)
let dictItemStore: DictItem[] = clone(dictItemSeed)
/** 行业库：内置《国民经济行业分类》GB/T 4754 四级字典（门类 / 大类 / 中类 / 小类，启用 ↔ 禁用双向可达） */
let industryStore: IndustryItem[] = clone(industrySeed)
/** 因子库（多库模型）：库 / 库版本 / 我的因子库 内存态 */
let factorLibraryStore: FactorLibrary[] = clone(factorLibrarySeed)
let factorLibraryVersionStore: FactorLibraryVersion[] = clone(factorLibraryVersionSeed)
let myFactorLibraryStore: MyFactorLibrary[] = clone(myFactorLibrarySeed)
let myFactorStore: MyFactor[] = clone(myFactorSeed)

/** 库内因子（自建库 V1.0 草稿 + 商业数据库因子）：归属「库 + 库版本」 */
let factorStore: FactorItem[] = clone([
  ...factorSeed.map((item) => ({ ...item, libraryId: 'FLIB01', libraryVersionId: 'FLV01' })),
  ...externalFactorSeed,
])
/** 计算引擎配置 · 计算公式：轻量配置对象（不做审核与版本化，启用 / 禁用走行操作） */
let calcFormulaStore: CalcFormula[] = clone(calcFormulaSeed)
/** 标准文件库：轻量基础数据，一个标准号 = 一条记录（无版本化 / 无审核流） */
let standardStore: StandardItem[] = clone(standardSeed)

/** 「排放项 → 标准公式」系统默认带出规则（按流名称关键词匹配，自上而下首个命中生效） */
const FLOW_FORMULA_RULES: Array<{ pattern: RegExp; formulaCode: string; basis: string }> = [
  { pattern: /运输|货运|物流/, formulaCode: 'FM-002', basis: '流名称含「运输」→ 运输 t·km 法' },
  { pattern: /电力|用电/, formulaCode: 'FM-003', basis: '含「电力 / 用电」→ 因子法（电力口径）' },
  { pattern: /废水|污水|废液/, formulaCode: 'FM-004', basis: '含「废水 / 污水」→ 因子法（废水口径）' },
  { pattern: /回收|再生|回用/, formulaCode: 'FM-005', basis: '含「回收」→ 回收信用法（负项）' },
]

/**
 * 默认**不计入**的流类型：**中间品 / 产品**（不论投入或产出方向）。
 * 理由：其排放即上游工序的排放，再算一次 = **重复计算**；工序衔接靠「中间品」表达。
 */
const FLOW_EXCLUDED_TYPES: FlowItemType[] = ['semi', 'product']

/** 兜底标准公式 */
const FLOW_FALLBACK_RULE = { formulaCode: 'FM-001', basis: '通用兜底 → 因子法（活动数据 × 排放因子）' }

/** 按公式编码取公式 */
function formulaByCode(code: string): CalcFormula | undefined {
  return calcFormulaStore.find((item) => item.code === code)
}

/**
 * 排放项公式默认带出（**公式下沉到工序的投入产出项**，取代原模型内「排放项级公式」）。
 * - 中间品 / 产品（`semi` / `product`）→ 不计入（其排放即上游工序排放，避免重复计算）；
 * - 用户已显式设为「不计入」→ 保持不计入；
 * - 用户已手动指定公式（`formulaId` 非空）→ 保留；
 * - 其余按流名称关键词带出标准公式（运输 → 运输法、蒸汽 → 热力法、燃料 → 燃烧法……），兜底因子法。
 */
function resolveFlowFormula(
  flowType: FlowItemType,
  name: string,
  formulaId: string,
  disposal: FlowFormulaDisposal,
): { formulaId: string; formulaCode: string; formulaName: string; formulaExpression: string; disposal: FlowFormulaDisposal } {
  if (FLOW_EXCLUDED_TYPES.includes(flowType) || disposal === 'excluded') {
    return { formulaId: '', formulaCode: '', formulaName: '', formulaExpression: '', disposal: 'excluded' }
  }
  if (formulaId) {
    const formula = calcFormulaStore.find((item) => item.id === formulaId)
    return {
      formulaId,
      formulaCode: formula?.code ?? '',
      formulaName: formula?.name ?? '',
      formulaExpression: formula?.expression ?? '',
      disposal: 'formula',
    }
  }
  const rule = FLOW_FORMULA_RULES.find((item) => item.pattern.test(name)) ?? FLOW_FALLBACK_RULE
  const formula = formulaByCode(rule.formulaCode)
  return {
    formulaId: formula?.id ?? '',
    formulaCode: formula?.code ?? rule.formulaCode,
    formulaName: formula?.name ?? '',
    formulaExpression: formula?.expression ?? '',
    disposal: 'formula',
  }
}

/** 产品 / 项目工序副本的投入产出项：按流类型 + 名称带出默认公式（保留用户覆盖） */
function decorateProductFlow(flow: ProductFlowItem): ProductFlowItem {
  return { ...flow, ...resolveFlowFormula(flow.type, flow.name, flow.formulaId, flow.disposal) }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

/** 统一请求封装：模拟网络延迟，返回深拷贝避免外部直接改动 store */
function request<T>(data: T, ms = 280): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(clone(data)), ms))
}

const NOW = '2026-09-20 10:00'

/* ===================== 产品分类 ===================== */

export interface CategoryPayload {
  code: string
  name: string
  parentId: string | null
  sortNo: number | null
  remark: string
}

/** 产品分类层级上限：**六级**（与前端 tree 工具同口径，D03） */
const CATEGORY_MAX_LEVEL = 6

/** 由上级分类推导分类层级：无上级 = 1，否则 = 上级层级 + 1；上限六级（Q01 已裁决） */
export function deriveLevel(parentId: string | null): CategoryLevel {
  if (!parentId) return 1
  const parent = categoryStore.find((c) => c.id === parentId)
  if (!parent) return 1
  return Math.min(parent.level + 1, CATEGORY_MAX_LEVEL) as CategoryLevel
}

/** 某分类的全部后代 id（不含自身）：用于禁止把上级选到自身或后代（D02） */
function collectCategoryDescendantIds(id: string): string[] {
  const ids: string[] = []
  const walk = (parentId: string) => {
    categoryStore
      .filter((c) => c.parentId === parentId)
      .forEach((child) => {
        ids.push(child.id)
        walk(child.id)
      })
  }
  walk(id)
  return ids
}

/** 同一级内排序号不允许重复（留空不参与判断；已裁决 Q03） */
function assertSortNoUnique(parentId: string | null, sortNo: number | null, excludeId?: string): void {
  if (sortNo == null) return
  const duplicated = categoryStore.some(
    (item) => (item.parentId ?? null) === parentId && item.sortNo === sortNo && item.id !== excludeId,
  )
  if (duplicated) throw new Error('同级内排序号已存在，请修改后重试')
}

/** 预演「某分类 + 其全部后代」在新位置下的层级结果，用于移动分类前的上限校验 */
function previewLevels(id: string, level: number, out: { id: string; level: number }[] = []) {
  out.push({ id, level })
  categoryStore
    .filter((c) => c.parentId === id)
    .forEach((child) => previewLevels(child.id, level + 1, out))
  return out
}

export function fetchCategories(): Promise<CategoryItem[]> {
  return request(categoryStore)
}

export async function createCategory(payload: CategoryPayload): Promise<CategoryItem> {
  if (categoryStore.some((c) => c.code === payload.code)) {
    throw new Error('分类编码已存在，请修改后重试')
  }
  if (payload.parentId) {
    const parent = categoryStore.find((c) => c.id === payload.parentId)
    if (parent && parent.level >= CATEGORY_MAX_LEVEL) {
      throw new Error('已达六级上限，无法在该分类下新增下级分类')
    }
  }
  assertSortNoUnique(payload.parentId, payload.sortNo)
  const item: CategoryItem = {
    id: `C${Date.now().toString().slice(-6)}`,
    ...payload,
    level: deriveLevel(payload.parentId),
    status: 'enabled',
    createdBy: '当前用户',
    createdAt: NOW,
    updatedAt: NOW,
  }
  categoryStore = [item, ...categoryStore]
  return request(item)
}

export async function updateCategory(id: string, payload: CategoryPayload): Promise<CategoryItem> {
  const target = categoryStore.find((c) => c.id === id)
  if (!target) throw new Error('分类不存在或已被删除')
  if (categoryStore.some((c) => c.code === payload.code && c.id !== id)) {
    throw new Error('分类编码已存在，请修改后重试')
  }
  if (payload.parentId && collectCategoryDescendantIds(id).includes(payload.parentId)) {
    throw new Error('上级分类不能选择该分类自身或其下级')
  }
  assertSortNoUnique(payload.parentId, payload.sortNo, id)

  /* 移动分类：该分类与其全部下级层级级联重算，重算后超过六级则阻断保存（已裁决 Q05） */
  const levels = previewLevels(id, deriveLevel(payload.parentId))
  if (levels.some((item) => item.level > CATEGORY_MAX_LEVEL)) {
    throw new Error('移动后分类层级将超过六级上限，请调整上级分类')
  }

  target.code = payload.code
  target.name = payload.name
  target.parentId = payload.parentId
  target.sortNo = payload.sortNo
  target.remark = payload.remark
  target.updatedAt = NOW
  levels.forEach(({ id: nodeId, level }) => {
    const node = categoryStore.find((c) => c.id === nodeId)
    if (node) node.level = level as CategoryLevel
  })
  return request(target)
}

export async function updateCategoryStatus(id: string, status: EnableStatus): Promise<CategoryItem> {
  const target = categoryStore.find((c) => c.id === id)
  if (!target) throw new Error('分类不存在或已被删除')
  target.status = status
  target.updatedAt = NOW
  return request(target)
}

/* ===================== 产品信息库 ===================== */

export interface ProductPayload {
  code: string
  name: string
  categoryId: string
  model: string
  spec: string
  unit: string
  /** 所属行业（引用行业库 A1-4） */
  industry: string
  /** 产品图片（**必填**，data URL） */
  imageUrl: string
  description: string
  /** 产品场景应用（选填；场景说明 + 多张场景图片） */
  scenarios?: ProductScenario[]
  /** 产品批次号（选填） */
  batchNo?: string
  /** 生产地点（选填） */
  productionSite?: string
  /** 生产功能（选填） */
  productionFunction?: string
  processes: ProductProcessItem[]
}

/** 计量单位选项（Mock 引用计量单位库 A1-9） */
export function fetchUnitOptions(): Promise<string[]> {
  return request(unitOptions, 120)
}

/** 行业选项（Mock 引用行业库 A1-4；取**末级行业**名称，所属行业落到最细口径） */
export function fetchIndustryOptions(): Promise<string[]> {
  return request(industryOptions, 120)
}

/* ===================== 多级分类下拉选项（行业 / 产品分类 / 计量单位） ===================== */

/**
 * 由「扁平字典（id + parentId）」递归构建多级下拉选项树：
 * 排序号优先、其次按编码；**停用项保留层级但标记 disabled**，保证既有引用可回显且不可再选。
 * 注：三个接口均**动态派生自基础库 Store**，后台新增 / 停用的数据即时反映到下游下拉（修复走查 F-02 的静态常量口径）。
 */
function buildIndustryTree(parentId: string | null): TreeOption[] {
  return industryStore
    .filter((item) => (item.parentId ?? null) === parentId)
    .sort((a, b) => (a.sortNo ?? 9999) - (b.sortNo ?? 9999) || a.code.localeCompare(b.code))
    .map((item) => {
      const children = buildIndustryTree(item.id)
      return {
        /** 引用方以「行业名称」落库（与既有口径一致），故 value 取名称 */
        value: item.name,
        label: item.name,
        extra: item.code,
        disabled: item.status === 'disabled',
        children: children.length > 0 ? children : undefined,
      }
    })
}

function buildCategoryTree(parentId: string | null, valueMode: 'id' | 'name'): TreeOption[] {
  return categoryStore
    .filter((item) => (item.parentId ?? null) === parentId)
    .sort((a, b) => (a.sortNo ?? 9999) - (b.sortNo ?? 9999) || a.code.localeCompare(b.code))
    .map((item) => {
      const children = buildCategoryTree(item.id, valueMode)
      return {
        /** 默认以「分类 id」落库；PCF 项目等以「分类名称」落库的引用方传 'name' */
        value: valueMode === 'id' ? item.id : item.name,
        label: item.name,
        extra: item.code,
        disabled: item.status === 'disabled',
        children: children.length > 0 ? children : undefined,
      }
    })
}

/**
 * 库外口径补充单位（**计量单位库不维护**，见走查报告 S-03）：
 * 数量类单位、复合单位与部分常用非基准单位，仅存在于填报字典中。
 */
const UNIT_EXTRA_OPTIONS: Record<UnitType, string[]> = {
  weight: ['g'],
  energy: [],
  distance: ['m'],
  volume: [],
  area: ['m²'],
  time: [],
  quantity: ['双', '件', '个', '包', '套', '盒'],
  carbon: [],
}

/** 复合单位（库外口径：如运输周转量 `t·km`），独立成组避免与单单位混淆 */
const UNIT_COMPOSITE_OPTIONS: string[] = ['t·km']

/** 行业多级选项：门类 → 大类 → 中类 → 小类（GB/T 4754 四级），下游「所属行业 / 适用行业」统一引用 */
export function fetchIndustryTreeOptions(): Promise<TreeOption[]> {
  return request(buildIndustryTree(null), 120)
}

/**
 * 产品分类多级选项：一级 → 二级 → 三级，下游「产品分类」统一引用。
 * @param valueMode 取值口径：`id`（产品信息库，默认）/ `name`（PCF 项目等按名称落库的引用方）
 */
export function fetchCategoryTreeOptions(valueMode: 'id' | 'name' = 'id'): Promise<TreeOption[]> {
  return request(buildCategoryTree(null, valueMode), 120)
}

/**
 * 计量单位分组选项：**按单位类型分组**（系统内置 8 类，另加「复合单位」组），组内为启用中的单位符号。
 * 引用方以「单位符号」落库，故 value 取 symbol；单位名称作为次要信息展示。
 * @param types 限定的单位类型；为空表示全部类型
 * @param includeComposite 是否附带「复合单位」组（如运输周转量 `t·km`）
 */
function buildUnitGroups(types: UnitType[] | null, includeComposite: boolean): TreeOption[] {
  const buckets = new Map<UnitType, { symbol: string; name: string }[]>()
  unitTypeOrder.forEach((type) => {
    buckets.set(
      type,
      UNIT_EXTRA_OPTIONS[type].map((symbol) => ({ symbol, name: symbol })),
    )
  })
  unitStore
    .filter((item) => item.status === 'enabled')
    .forEach((item) => {
      const list = buckets.get(item.unitType)
      if (!list) return
      if (!list.some((unit) => unit.symbol === item.symbol)) list.push({ symbol: item.symbol, name: item.name })
    })

  const groups: TreeOption[] = unitTypeOrder
    .filter((type) => !types || types.includes(type))
    .map((type) => ({
      value: `unit-type-${type}`,
      label: unitTypeText[type],
      children: (buckets.get(type) ?? []).map((unit) => ({
        value: unit.symbol,
        label: unit.symbol,
        extra: unit.name,
      })),
    }))
    .filter((group) => !!group.children && group.children.length > 0)

  if (includeComposite && UNIT_COMPOSITE_OPTIONS.length > 0) {
    groups.push({
      value: 'unit-type-composite',
      label: '复合单位',
      children: UNIT_COMPOSITE_OPTIONS.map((symbol) => ({ value: symbol, label: symbol, extra: '复合单位' })),
    })
  }
  return groups
}

/** 全部计量单位分组选项（表单「单位」通用） */
export function fetchUnitGroupOptions(): Promise<TreeOption[]> {
  return request(buildUnitGroups(null, true), 120)
}

/** 碳排放量类单位分组选项：排放因子「分子」（如 `kgCO₂e`） */
export function fetchCarbonUnitGroupOptions(): Promise<TreeOption[]> {
  return request(buildUnitGroups(['carbon'], false), 120)
}

/** 活动数据单位分组选项：排放因子「分母」（碳排放量 / 数量类以外的单位 + 复合单位 `t·km`） */
export function fetchActivityUnitGroupOptions(): Promise<TreeOption[]> {
  return request(buildUnitGroups(['weight', 'energy', 'distance', 'volume', 'area'], true), 120)
}

/**
 * 因子单位（**复合单位**）选项：新增 / 编辑因子时直接选择「带分母」的单位。
 * 一级 = 活动数据口径（质量 / 能量 / 体积 / 距离 / 运输周转量），二级 = `分子/分母` 复合单位，
 * 如 `kgCO₂e/kg`、`kgCO₂e/kWh`、`kgCO₂e/t·km`；分子取自计量单位库碳排放量类单位。
 */
export function fetchFactorUnitOptions(): Promise<TreeOption[]> {
  const denominatorsByType = new Map<string, string[]>()
  unitSeed
    .filter((item) => item.unitType !== 'carbon' && item.status === 'enabled')
    .forEach((item) => {
      const list = denominatorsByType.get(item.unitType) ?? []
      list.push(item.symbol)
      denominatorsByType.set(item.unitType, list)
    })

  const buildChildren = (denominators: string[]) =>
    FACTOR_CARBON_UNITS.flatMap((numerator) =>
      denominators.map((denominator) => ({
        value: `${numerator}/${denominator}`,
        label: `${numerator}/${denominator}`,
        extra: `每 ${denominator}`,
      })),
    )

  const groups: TreeOption[] = [...denominatorsByType.entries()].map(([type, denominators]) => ({
    value: `factor-denominator-${type}`,
    label: unitTypeText[type as UnitType] ?? type,
    children: buildChildren(denominators),
  }))

  // 运输周转量 `t·km` 为复合口径，不在计量单位库（库只维护单单位），单独成组
  if (FACTOR_ACTIVITY_UNITS.includes('t·km')) {
    groups.push({
      value: 'factor-denominator-composite',
      label: '运输周转量（复合）',
      children: buildChildren(['t·km']),
    })
  }

  return request(groups, 120)
}

/**
 * 工艺流程模板选项（**动态派生自工艺流程库 `processStore` + 工序库 `operationStore`**）。
 * 修复：产品引用工艺须带出「工艺流程库当前工序明细」，不能读静态 `processTemplates`，
 * 否则在工艺里新增的工序（如运输）不会被带出。
 * 注：工序投入产出流的基准数量（qty）在动态模型未单独维护，此处以 1 占位，实际以项目填报为准。
 */
export function fetchProcessTemplates(): Promise<ProcessTemplate[]> {
  const templates: ProcessTemplate[] = processStore
    .filter((item) => item.useStatus === 'enabled')
    .map((item) => ({
      code: item.code,
      name: item.name,
      lifecycleStage: item.lifecycleStage,
      operations: item.operations.map((op) => {
        const source = operationStore.find((o) => o.code === op.opCode)
        return {
          code: op.opCode,
          name: op.opName,
          inputs:
            source?.inputs.map((flow) => ({
              type: flow.flowType,
              name: flow.refName,
              qty: 1,
              unit: flow.unit,
            })) ?? [],
          outputs:
            source?.outputs.map((flow) => ({
              type: flow.flowType,
              name: flow.refName,
              qty: 1,
              unit: flow.unit,
            })) ?? [],
        }
      }),
    }))
  return request(templates, 120)
}

/** 工序模板选项（**动态派生自工序库 `operationStore`**，与工艺流程联动） */
export function fetchOperationTemplates(): Promise<OperationTemplate[]> {
  const templates: OperationTemplate[] = operationStore
    .filter((item) => item.useStatus === 'enabled')
    .map((item) => ({
      code: item.code,
      name: item.name,
      inputs: item.inputs.map((flow) => ({
        type: flow.flowType,
        name: flow.refName,
        qty: 1,
        unit: flow.unit,
      })),
      outputs: item.outputs.map((flow) => ({
        type: flow.flowType,
        name: flow.refName,
        qty: 1,
        unit: flow.unit,
      })),
    }))
  return request(templates, 120)
}

/** 组合完整性校验（C1～C6 / D05～D07 / R-004 / R-005；同一生命周期阶段仅允许绑定一个工艺流程，2026-09-29） */
function assertComposition(processes: ProductProcessItem[]): void {
  // 工艺流程为选填：可不关联工艺，未关联时跳过组合校验（2026-10-09）
  if (processes.length === 0) return
  const stageOwner = new Map<string, string>()
  processes.forEach((process) => {
    if (process.operations.length === 0) {
      throw new Error(`组合校验未通过：工艺流程「${process.processName}」至少需要 1 道工序（D05）`)
    }
    const seqs = process.operations.map((op) => op.seq)
    if (new Set(seqs).size !== seqs.length) {
      throw new Error(`组合校验未通过：工艺流程「${process.processName}」内工序顺序不得重复（D06）`)
    }
    // 同一生命周期阶段只允许绑定一个工艺流程（阶段为空视为未绑定，不参与判重）
    if (process.lifecycleStage) {
      const owner = stageOwner.get(process.lifecycleStage)
      if (owner) {
        throw new Error(
          `组合校验未通过：生命周期阶段「${process.lifecycleStage}」已绑定工艺流程「${owner}」，同一阶段只允许绑定一个工艺流程`,
        )
      }
      stageOwner.set(process.lifecycleStage, process.processName)
    }
  })
  const lastProcess = processes[processes.length - 1]
  const lastOperation = lastProcess.operations[lastProcess.operations.length - 1]
  if (!lastOperation.outputs.some((item) => item.type === 'product')) {
    throw new Error('组合校验未通过：末道工序的产出必须为「成品」（C6 / R-005）')
  }
}

/** 重建子表 id，避免重复保存后 id 冲突 */
function remapProcesses(processes: ProductProcessItem[]): ProductProcessItem[] {
  const stamp = Date.now().toString().slice(-6)
  return processes.map((process, pIndex) => ({
    ...process,
    id: `${stamp}-PR${pIndex + 1}`,
    seq: pIndex + 1,
    operations: process.operations.map((op, oIndex) => ({
      ...op,
      id: `${stamp}-OP${pIndex + 1}-${oIndex + 1}`,
      seq: oIndex + 1,
      inputs: op.inputs.map((item, i) => ({ ...item, id: `${stamp}-I${pIndex + 1}-${oIndex + 1}-${i}` })),
      outputs: op.outputs.map((item, i) => ({ ...item, id: `${stamp}-O${pIndex + 1}-${oIndex + 1}-${i}` })),
    })),
  }))
}

/** 产品工序副本的投入产出项：按流类型 + 名称带出默认公式（引用即复制，公式随工序带入） */
function decorateProduct(product: ProductItem): ProductItem {
  return {
    ...product,
    processes: product.processes.map((process) => ({
      ...process,
      operations: process.operations.map((op) => ({
        ...op,
        inputs: op.inputs.map(decorateProductFlow),
        outputs: op.outputs.map(decorateProductFlow),
      })),
    })),
  }
}

export function fetchProducts(): Promise<ProductItem[]> {
  return request(productStore.map(decorateProduct))
}

export async function fetchProduct(id: string): Promise<ProductItem> {
  const target = productStore.find((p) => p.id === id)
  if (!target) throw new Error('产品不存在或已被删除')
  return request(decorateProduct(target))
}

export async function fetchProductLogs(productId: string): Promise<OperationLogItem[]> {
  const target = productStore.find((p) => p.id === productId)
  if (!target) return request([])
  const logs: OperationLogItem[] = [
    {
      id: `${productId}-created`,
      time: target.createdAt,
      operator: target.createdBy,
      action: '新建产品',
      detail: `产品编码 ${target.code}；工艺 ${target.processes.length} 个`,
    },
    {
      id: `${productId}-updated`,
      time: target.updatedAt,
      operator: target.createdBy,
      action: '最近修改',
      detail: `产品「${target.name}」当前${target.useStatus === 'on' ? '已上架' : '已下架'}`,
    },
  ]
  return request(logs)
}

export async function createProduct(payload: ProductPayload): Promise<ProductItem> {
  if (productStore.some((p) => p.code === payload.code)) {
    throw new Error('产品编码已存在，请修改后重试')
  }
  assertComposition(payload.processes)

  const item: ProductItem = {
    id: `P${Date.now().toString().slice(-6)}`,
    code: payload.code,
    name: payload.name,
    categoryId: payload.categoryId,
    model: payload.model,
    spec: payload.spec,
    unit: payload.unit,
    industry: payload.industry,
    imageUrl: payload.imageUrl,
    description: payload.description,
    scenarios: clone(payload.scenarios ?? []),
    batchNo: payload.batchNo ?? '',
    productionSite: payload.productionSite ?? '',
    productionFunction: payload.productionFunction ?? '',
    useStatus: 'off',
    processes: remapProcesses(payload.processes),
    org: '平台级',
    createdBy: '当前用户',
    createdAt: NOW,
    updatedAt: NOW,
  }
  productStore = [item, ...productStore]
  return request(item)
}

export async function updateProduct(id: string, payload: ProductPayload): Promise<ProductItem> {
  const target = productStore.find((p) => p.id === id)
  if (!target) throw new Error('产品不存在或已被删除')
  if (productStore.some((p) => p.code === payload.code && p.id !== id)) {
    throw new Error('产品编码已存在，请修改后重试')
  }
  assertComposition(payload.processes)

  target.code = payload.code
  target.name = payload.name
  target.categoryId = payload.categoryId
  target.model = payload.model
  target.spec = payload.spec
  target.unit = payload.unit
  target.industry = payload.industry
  target.imageUrl = payload.imageUrl
  target.description = payload.description
  target.scenarios = clone(payload.scenarios ?? [])
  target.batchNo = payload.batchNo ?? ''
  target.productionSite = payload.productionSite ?? ''
  target.productionFunction = payload.productionFunction ?? ''
  target.processes = remapProcesses(payload.processes)
  target.updatedAt = NOW

  return request(target)
}

/** 上架 / 下架（**产品级**；产品不版本化后不再按版本上下架） */
export async function updateProductUseStatus(id: string, useStatus: ProductUseStatus): Promise<ProductItem> {
  const target = productStore.find((p) => p.id === id)
  if (!target) throw new Error('产品不存在或已被删除')
  target.useStatus = useStatus
  target.updatedAt = NOW
  return request(target)
}

/** 删除产品（K-02：仅下架状态允许删除；产品不版本化，删除为产品级整体删除） */
export async function deleteProduct(id: string): Promise<void> {
  const target = productStore.find((p) => p.id === id)
  if (!target) throw new Error('产品不存在或已被删除')
  if (target.useStatus === 'on') throw new Error('上架状态的产品不可删除，请先下架')
  productStore = productStore.filter((p) => p.id !== id)
  await new Promise((resolve) => setTimeout(resolve, 260))
}

/* ===================== 我的产品库（产品碳足迹 · P27，组织自建） ===================== */

/** 当前登录用户所属组织（原型固定值；归属组织自动带出、不可改，D03） */
export const MY_PRODUCT_ORG = '福建竹业集团 · 工厂A1'

/**
 * 组织自建产品种子（自己新增，`ORG`；演示数据，见 data.ts 演示数据集）。
 * 注：组织自建产品暂不可直接发起核算（已知断点 F-01，见走查报告）。
 */
const myProductSeed: MyProductItem[] = [
  {
    id: 'MP01',
    code: 'ORG-P-202609-001',
    name: '240mm 定制印花竹筷',
    categoryId: 'PC200903',
    model: 'ZKM-240-DY',
    spec: '240mm 单支印花',
    unit: '双',
    industry: '竹制品制造',
    imageUrl: '',
    description: '组织自建：在标准竹筷基础上增加印花与独立包装工序',
    useStatus: 'on',
    source: 'custom',
    sourceProductId: null,
    org: MY_PRODUCT_ORG,
    createdBy: '组织管理员',
    createdAt: '2026-09-02 09:00',
    updatedAt: '2026-09-22 16:40',
    /* 同一生命周期阶段只绑定一个工艺流程（2026-09-29）：包装工序并入「竹筷成型工艺 / 生产」 */
    processes: [
      {
        id: 'MP01-PR1',
        processCode: 'GY-01',
        processName: '竹筷成型工艺',
        lifecycleStage: '生产',
        seq: 1,
        operations: [
          {
            id: 'MP01-OP1',
            code: 'GX-01',
            name: '断料',
            seq: 1,
            sourceCode: 'GX-01',
            sourceCopiedAt: '2026-09-02 09:00',
            sourceUpdated: false,
            origin: 'template',
            inputs: [{ id: 'MP01-I1', type: 'material', name: '毛竹原竹', qty: 0.062, unit: 'kg', formulaId: '', formulaCode: '', formulaName: '', formulaExpression: '', disposal: 'formula' }],
            outputs: [{ id: 'MP01-O1', type: 'semi', name: '竹段', qty: 0.057, unit: 'kg', formulaId: '', formulaCode: '', formulaName: '', formulaExpression: '', disposal: 'excluded' }],
          },
          {
            id: 'MP01-OP2',
            code: 'GX-03',
            name: '打磨印花',
            seq: 2,
            sourceCode: 'GX-03',
            sourceCopiedAt: '2026-09-02 09:00',
            sourceUpdated: false,
            origin: 'custom',
            inputs: [{ id: 'MP01-I2', type: 'semi', name: '竹段', qty: 0.057, unit: 'kg', formulaId: '', formulaCode: '', formulaName: '', formulaExpression: '', disposal: 'excluded' }],
            outputs: [
              { id: 'MP01-O2', type: 'product', name: '印花竹筷（散）', qty: 1, unit: '双', formulaId: '', formulaCode: '', formulaName: '', formulaExpression: '', disposal: 'excluded' },
              { id: 'MP01-O3', type: 'byproduct', name: '竹屑', qty: 0.004, unit: 'kg', formulaId: '', formulaCode: '', formulaName: '', formulaExpression: '', disposal: 'formula' },
            ],
          },
          {
            id: 'MP01-OP3',
            code: 'GX-04',
            name: '包装',
            seq: 3,
            sourceCode: 'GX-04',
            sourceCopiedAt: '2026-09-02 09:00',
            sourceUpdated: false,
            origin: 'template',
            inputs: [
              { id: 'MP01-I3', type: 'semi', name: '印花竹筷（散）', qty: 1, unit: '双', formulaId: '', formulaCode: '', formulaName: '', formulaExpression: '', disposal: 'excluded' },
              { id: 'MP01-I4', type: 'material', name: '纸包装材料', qty: 0.05, unit: 'kg', formulaId: '', formulaCode: '', formulaName: '', formulaExpression: '', disposal: 'formula' },
            ],
            outputs: [{ id: 'MP01-O4', type: 'product', name: '盒装印花竹筷', qty: 1, unit: '盒', formulaId: '', formulaCode: '', formulaName: '', formulaExpression: '', disposal: 'excluded' }],
          },
        ],
      },
    ],
  },
]

/** 组织自建产品库（内存态） */
/**
 * 我的产品库（前台 P27）：组织自建产品 + 引用平台产品的**复制副本**。
 * 业务裁定（V1.1）：引用 = 从平台级产品信息库**复制一份**到本组织，成为可编辑副本；
 * 平台产品更新不回写本副本，副本与自建产品同等可编辑 / 上下架 / 删除。
 */
let myProductStore: MyProductItem[] = [
  ...clone(myProductSeed),
  // 演示数据：已引用平台级产品 P01 的复制副本（保留平台 id，贯通核算项目引用关系）
  copyBackendToMine(productStore.find((p) => p.id === 'P01')!),
]
/** 已复制的平台级产品 id（引用 = 复制一份到本组织，不重复复制） */
let myProductRefIds: string[] = ['P01']

/** 引用标准产品 = 从平台级复制一份为本组织可编辑副本（保留平台来源溯源） */
function copyBackendToMine(platform: ProductItem): MyProductItem {
  return {
    ...platform,
    id: platform.id, // 保留平台 id，避免与自建 MP- 前缀冲突，且贯通核算项目引用关系
    useStatus: 'off',
    source: 'referenced',
    sourceProductId: platform.id,
    org: MY_PRODUCT_ORG,
    createdBy: '组织管理员',
    createdAt: NOW,
    updatedAt: NOW,
  }
}

/** 投入产出流公式默认带出（与后台产品信息库同规则） */
function decorateMyProduct(item: MyProductItem): MyProductItem {
  return { ...item, ...decorateProduct(item) }
}

export function fetchMyProducts(): Promise<MyProductItem[]> {
  // 自建与引用副本统一混排，按更新时间倒序（最新在前）
  const all = myProductStore
    .map(decorateMyProduct)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  return request(all)
}

export async function fetchMyProduct(id: string): Promise<MyProductItem> {
  const target = myProductStore.find((p) => p.id === id)
  if (!target) throw new Error('产品不存在或已被删除')
  return request(decorateMyProduct(target))
}

/**
 * 操作日志：自建与引用副本均返回本组织操作日志（引用副本为可编辑副本，同样产生操作记录）。
 */
export async function fetchMyProductLogs(id: string): Promise<OperationLogItem[]> {
  const target = myProductStore.find((p) => p.id === id)
  if (!target) return request([])
  const isRef = target.source === 'referenced'
  const logs: OperationLogItem[] = [
    {
      id: `${id}-created`,
      time: target.createdAt,
      operator: target.createdBy,
      action: isRef ? '引用复制产品' : '新建产品',
      detail: `产品来源 = ${isRef ? '引用标准产品（复制副本）' : '自己新增'}；产品编码 ${target.code}；工艺 ${target.processes.length} 个`,
    },
    {
      id: `${id}-updated`,
      time: target.updatedAt,
      operator: target.createdBy,
      action: '最近修改',
      detail: `产品「${target.name}」当前${target.useStatus === 'on' ? '已上架' : '已下架'}`,
    },
  ]
  return request(logs)
}

/** 引用该产品的核算项目（项目侧快照；引用标准产品同样统计，用于详情页提示与删除校验） */
export interface MyProductRefProject {
  id: string
  code: string
  name: string
}

export function fetchMyProductRefProjects(id: string): Promise<MyProductRefProject[]> {
  const projects = pcfProjectStore
    .filter((project) => project.refProductId === id)
    .map((project) => ({ id: project.id, code: project.code, name: project.name }))
  return request(projects)
}

/**
 * 平台级标准产品（后台产品信息库 `PUBLIC`，「引用标准产品」的来源）。
 * **仅返回已上架产品**：下架产品不进入引用候选（业务规则 2026-09-29）；
 * 已引用产品的下架由后台控制，引用项只读展示后台状态（业务 PRD C2）。
 */
export function fetchBackendProducts(): Promise<ProductItem[]> {
  return request(productStore.filter((p) => p.org === '平台级' && p.useStatus === 'on').map(decorateProduct))
}

/**
 * 批量引用平台级标准产品（**引用即只读指向，不落库**；重复引用跳过）。
 * 上下架不限制引用（引用项只读展示后台状态，业务 PRD C2）。
 */
export async function referenceBackendProducts(ids: string[]): Promise<MyProductBatchResult> {
  const failed: MyProductBatchFailure[] = []
  let success = 0

  ids.forEach((id) => {
    const target = productStore.find((p) => p.id === id)
    if (!target) {
      failed.push({ id, code: '-', name: '-', reason: '产品不存在或已被删除' })
      return
    }
    if (myProductRefIds.includes(id)) {
      failed.push({ id, code: target.code, name: target.name, reason: '该产品已引用，请勿重复引用' })
      return
    }
    const copy = copyBackendToMine(target)
    myProductStore = [copy, ...myProductStore]
    myProductRefIds = [...myProductRefIds, id]
    success += 1
  })

  return request({ success, failed })
}

export async function createMyProduct(payload: ProductPayload): Promise<MyProductItem> {
  if (myProductStore.some((p) => p.code === payload.code) || productStore.some((p) => p.code === payload.code)) {
    throw new Error('产品编码已存在（含平台级产品信息库），请修改后重试')
  }
  assertComposition(payload.processes)

  const item: MyProductItem = {
    ...payload,
    id: `MP${Date.now().toString().slice(-6)}`,
    useStatus: 'off',
    processes: remapProcesses(payload.processes),
    source: 'custom',
    sourceProductId: null,
    org: MY_PRODUCT_ORG,
    createdBy: '组织管理员',
    createdAt: NOW,
    updatedAt: NOW,
  }
  myProductStore = [item, ...myProductStore]
  return request(item)
}

export async function updateMyProduct(id: string, payload: ProductPayload): Promise<MyProductItem> {
  const target = myProductStore.find((p) => p.id === id)
  if (!target) throw new Error('产品不存在或已被删除')
  if (
    myProductStore.some((p) => p.code === payload.code && p.id !== id) ||
    productStore.some((p) => p.code === payload.code)
  ) {
    throw new Error('产品编码已存在（含平台级产品信息库），请修改后重试')
  }
  assertComposition(payload.processes)

  Object.assign(target, payload, { processes: remapProcesses(payload.processes), updatedAt: NOW })
  return request(target)
}

/** 上架 / 下架（自建与引用副本同等，均可在本模块控制） */
export async function updateMyProductUseStatus(id: string, useStatus: ProductUseStatus): Promise<MyProductItem> {
  const target = myProductStore.find((p) => p.id === id)
  if (!target) throw new Error('产品不存在或已被删除')
  target.useStatus = useStatus
  target.updatedAt = NOW
  return request(target)
}

/** 删除（仅「未被核算项目引用」的产品可删除；自建与引用副本同等） */
export async function deleteMyProduct(id: string): Promise<void> {
  const target = myProductStore.find((p) => p.id === id)
  if (!target) throw new Error('产品不存在或已被删除')
  const refCount = pcfProjectStore.filter((project) => project.refProductId === id).length
  if (refCount > 0) {
    throw new Error(`该产品已被 ${refCount} 个核算项目引用，不可删除（项目侧快照保护）`)
  }
  if (target.source === 'referenced' && target.sourceProductId) {
    myProductRefIds = myProductRefIds.filter((rid) => rid !== target.sourceProductId)
  }
  myProductStore = myProductStore.filter((p) => p.id !== id)
  await new Promise((resolve) => setTimeout(resolve, 260))
}

/* ===================== 工序（工艺库 A1-8） ===================== */

/** 投入 / 产出数据项载荷（不含 id 与行序，由服务端重排；**不含数量与单位**，已确认 Q04） */
export interface OperationFlowPayload {
  flowType: FlowItemType
  refType: 'material' | 'energy'
  refCode: string
  refName: string
  /** 计量单位（默认取物料默认单位，可覆盖） */
  unit: string
  /** 仅产出项、且流类型 = 排放物：排放物类别（废气 / 废水 / 废渣） */
  emissionCategory?: EmissionCategory
  remark: string
}

export interface OperationPayload {
  code: string
  name: string
  type: OperationType
  iconUrl: string
  description: string
  inputs: OperationFlowPayload[]
  outputs: OperationFlowPayload[]
}

/** 物料库选项（引用物料库 A1-1） */
export function fetchMaterialOptions(): Promise<MaterialOption[]> {
  return request(materialOptions, 120)
}

/** 能源库选项（引用能源库 A1-2） */
export function fetchEnergyOptions(): Promise<EnergyOption[]> {
  return request(energyOptions, 120)
}

export function fetchOperations(): Promise<OperationItem[]> {
  return request(operationStore)
}

export async function fetchOperation(id: string): Promise<OperationItem> {
  const target = operationStore.find((o) => o.id === id)
  if (!target) throw new Error('工序不存在或已被删除')
  return request(target)
}

export async function fetchOperationLogs(operationId: string): Promise<OperationLogItem[]> {
  const target = operationStore.find((o) => o.id === operationId)
  if (!target) return request([])
  const logs: OperationLogItem[] = [
    {
      id: `${operationId}-created`,
      time: target.createdAt,
      operator: target.createdBy,
      action: '新建工序',
      detail: `工序编码 ${target.code}；投入 ${target.inputs.length} 项 / 产出 ${target.outputs.length} 项`,
    },
    {
      id: `${operationId}-updated`,
      time: target.updatedAt,
      operator: target.createdBy,
      action: '最近修改',
      detail: `工序「${target.name}」当前${target.useStatus === 'enabled' ? '已启用' : '已禁用'}；投入 ${target.inputs.length} 项 / 产出 ${target.outputs.length} 项`,
    },
  ]
  return request(logs)
}

/** 工序保存校验（§4 投入产出流规则 + §5 业务规则） */
function assertOperation(payload: OperationPayload): void {
  if (payload.outputs.length === 0) {
    throw new Error('保存失败：产出项至少需要 1 条（F4 / R-007）')
  }

  const checkRows = (rows: OperationFlowPayload[], table: string) => {
    rows.forEach((row, index) => {
      const no = `${table}第 ${index + 1} 行`
      if (!row.flowType) throw new Error(`${no}：请选择流类型（D03）`)
      if (!row.refCode) throw new Error(`${no}：请选择物料（D04）`)
      if (!row.unit) throw new Error(`${no}：请选择单位（D07）`)
      if (row.flowType === 'emission' && !row.emissionCategory) {
        throw new Error(`${no}：排放物必须选择排放物类别（废气 / 废水 / 废渣）（D15）`)
      }
      // 工序只维护「有哪些数据项」，不校验数量（数量在核算模型 / 数据录入阶段填写，已确认 Q04）
    })
  }
  checkRows(payload.inputs, '投入项')
  checkRows(payload.outputs, '产出项')

  const seen = new Map<string, string>()
  const checkDuplicate = (rows: OperationFlowPayload[], table: string) => {
    rows.forEach((row, index) => {
      if (!row.flowType || !row.refCode) return
      const key = `${row.flowType}:${row.refCode}`
      const no = `${table}第 ${index + 1} 行`
      const first = seen.get(key)
      if (first) throw new Error(`${no}：「流类型 + 物料」与${first}重复（F15 / R-010）`)
      seen.set(key, no)
    })
  }
  checkDuplicate(payload.inputs, '投入项')
  checkDuplicate(payload.outputs, '产出项')

  const semiCodes = new Set(
    payload.outputs.filter((row) => row.flowType === 'semi' && row.refCode).map((row) => row.refCode),
  )
  const loop = payload.inputs.find((row) => semiCodes.has(row.refCode))
  if (loop) {
    throw new Error(`禁止自身闭环：本工序产出的中间品「${loop.refName}」不能作为本工序自身的投入（F16 / R-011）`)
  }
}

/** 重排行：重建 id 与行序，避免重复保存后 id 冲突 */
function remapFlows(rows: OperationFlowPayload[], prefix: string, stamp: string) {
  return rows.map((row, index) => ({
    id: `${stamp}-${prefix}${index + 1}`,
    seq: index + 1,
    flowType: row.flowType,
    refType: row.refType,
    refCode: row.refCode,
    refName: row.refName,
    unit: row.unit,
    emissionCategory: row.emissionCategory,
    remark: row.remark,
  }))
}

export async function createOperation(payload: OperationPayload): Promise<OperationItem> {
  if (operationStore.some((o) => o.code === payload.code)) {
    throw new Error('工序编码已存在，请修改后重试（R-001）')
  }
  assertOperation(payload)

  const stamp = Date.now().toString().slice(-6)
  const item: OperationItem = {
    id: `OP${stamp}`,
    code: payload.code,
    name: payload.name,
    type: payload.type,
    iconUrl: payload.iconUrl,
    description: payload.description,
    useStatus: 'enabled',
    inputs: remapFlows(payload.inputs, 'I', stamp),
    outputs: remapFlows(payload.outputs, 'O', stamp),
    createdBy: '当前用户',
    createdAt: NOW,
    updatedAt: NOW,
  }
  operationStore = [item, ...operationStore]
  return request(item)
}

export async function updateOperation(id: string, payload: OperationPayload): Promise<OperationItem> {
  const target = operationStore.find((o) => o.id === id)
  if (!target) throw new Error('工序不存在或已被删除')
  if (operationStore.some((o) => o.code === payload.code && o.id !== id)) {
    throw new Error('工序编码已存在，请修改后重试（R-001）')
  }
  assertOperation(payload)

  const stamp = Date.now().toString().slice(-6)
  target.code = payload.code
  target.name = payload.name
  target.type = payload.type
  target.iconUrl = payload.iconUrl
  target.description = payload.description
  target.inputs = remapFlows(payload.inputs, 'I', stamp)
  target.outputs = remapFlows(payload.outputs, 'O', stamp)
  target.updatedAt = NOW

  return request(target)
}

/** 启用 / 禁用：禁用后不可被新的工艺流程引用，已复制副本不受影响（R-015 / D09） */
export async function updateOperationUseStatus(id: string, useStatus: EnableStatus): Promise<OperationItem> {
  const target = operationStore.find((o) => o.id === id)
  if (!target) throw new Error('工序不存在或已被删除')
  target.useStatus = useStatus
  target.updatedAt = NOW
  return request(target)
}

/** 删除：仅对**已禁用**的工序开放（R-016 / D14，2026-09-21 修订：不再依赖引用状态） */
export async function deleteOperation(id: string): Promise<void> {
  const target = operationStore.find((o) => o.id === id)
  if (!target) throw new Error('工序不存在或已被删除')
  if (target.useStatus === 'enabled') {
    throw new Error('请先禁用该工序，再执行删除（R-016）')
  }
  operationStore = operationStore.filter((o) => o.id !== id)
  await new Promise((resolve) => setTimeout(resolve, 260))
}


/* ===================== 工艺流程（工艺库 A1-7） ===================== */

/** 工序明细行载荷（不含 id 与序号，由服务端重排） */
export interface ProcessOperationPayload {
  /** 工序顺序：连续且不重复（D04） */
  order: number
  opCode: string
  opName: string
  remark: string
}

export interface ProcessPayload {
  code: string
  name: string
  categoryId: string
  /** 所属行业（引用行业库 A1-4，必填） */
  industry: string
  /** 所属生命周期阶段（引用生命周期阶段库，必填） */
  lifecycleStage: string
  description: string
  operations: ProcessOperationPayload[]
}

/** 生命周期阶段选项（Mock 引用「生命周期阶段」基础库） */
export function fetchLifecycleOptions(): Promise<string[]> {
  return request(lifecycleOptions, 120)
}

/** 引用工序的工序类型（用于「是否含处置工序」计算） */
const processOpType = (opCode: string) => operationStore.find((op) => op.code === opCode)?.type

/**
 * 工艺流程保存校验（**阻断级规则**）：
 * 明细至少 1 行（D02）、只能引用启用中的工序（D02）、顺序连续不重复（D04）、编码唯一（D01）。
 * **提示级**规则（不在此阻断，由页面按工序投入产出流计算呈现）：
 * 首道投入合规（D05）、末道产出为成品（D06）、上下游衔接（D11）—— 2026-09-21 业务确认三条均不阻断。
 */
function assertProcess(payload: ProcessPayload, isCreate: boolean): void {
  if (!payload.industry) {
    throw new Error('保存失败：所属行业为必填项（引用行业库 A1-4）')
  }
  if (!payload.lifecycleStage) {
    throw new Error('保存失败：所属生命周期阶段为必填项')
  }
  if (payload.operations.length === 0) {
    throw new Error('保存失败：工序明细至少需要 1 个工序节点（D02）')
  }

  payload.operations.forEach((row, index) => {
    const no = `工序明细第 ${index + 1} 行`
    if (!row.opCode) throw new Error(`${no}：请选择工序（A3）`)
    const operation = operationStore.find((op) => op.code === row.opCode)
    if (!operation) throw new Error(`${no}：引用的工序不存在（${row.opCode}）`)
    if (operation.useStatus === 'disabled') {
      throw new Error(`${no}：工序「${operation.name}」已禁用，不可新选（A1 / D02）`)
    }
  })

  const expected = payload.operations.map((_, index) => index + 1)
  const orders = payload.operations.map((row) => row.order).sort((a, b) => a - b)
  if (orders.some((order, index) => order !== expected[index])) {
    throw new Error('保存失败：工序顺序必须连续且不重复，不允许跳号（D04）')
  }

  // 「首道投入合规」（D05）与「末道工序产出为成品」（D06）均为**提示级**（2026-09-21 修订），
  // 此处不阻断；由页面按工序投入产出流给出提示（见 processMeta.buildChainChecks）

  if (isCreate && processStore.some((item) => item.code === payload.code)) {
    throw new Error('工艺流程编码已存在，请修改后重试（D01）')
  }
}

/** 重建工序明细 id 与序号 / 工序顺序，避免重复保存后 id 冲突 */
function remapProcessOps(rows: ProcessOperationPayload[], stamp: string): ProcessOperationItem[] {
  return [...rows]
    .sort((a, b) => a.order - b.order)
    .map((row, index) => ({
      id: `${stamp}-PO${index + 1}`,
      seq: index + 1,
      order: index + 1,
      opCode: row.opCode,
      opName: row.opName,
      remark: row.remark,
    }))
}

/** 「适用产品」只读反查：由产品侧引用关系反推（A13 / 已确认 Q01） */
function applicableProducts(code: string): ProcessApplicableProduct[] {
  return productStore
    .filter((product) => product.processes.some((process) => process.processCode === code))
    .map((product) => ({
      id: product.id,
      code: product.code,
      name: product.name,
      useStatus: product.useStatus,
    }))
}

function toProcessDetail(item: ProcessItem): ProcessDetail {
  const products = applicableProducts(item.code)
  return { ...item, applicableProducts: products, copiedProductCount: products.length }
}

export function fetchProcesses(): Promise<ProcessItem[]> {
  return request(processStore)
}

export async function fetchProcess(id: string): Promise<ProcessDetail> {
  const target = processStore.find((item) => item.id === id)
  if (!target) throw new Error('工艺流程不存在或已被删除')
  return request(toProcessDetail(target))
}

export async function fetchProcessLogs(processId: string): Promise<OperationLogItem[]> {
  const target = processStore.find((item) => item.id === processId)
  if (!target) return request([])
  const logs: OperationLogItem[] = [
    {
      id: `${processId}-created`,
      time: target.createdAt,
      operator: target.createdBy,
      action: '新建工艺流程',
      detail: `工艺流程编码 ${target.code}；工序 ${target.operations.length} 道`,
    },
    {
      id: `${processId}-updated`,
      time: target.updatedAt,
      operator: target.createdBy,
      action: '最近修改',
      detail: `「${target.name}」当前${target.useStatus === 'enabled' ? '已启用' : '已禁用'}；已复制产品 ${applicableProducts(target.code).length} 个`,
    },
  ]
  return request(logs)
}

export async function createProcess(payload: ProcessPayload): Promise<ProcessItem> {
  assertProcess(payload, true)
  const stamp = Date.now().toString().slice(-6)
  const item: ProcessItem = {
    id: `GY${stamp}`,
    code: payload.code,
    name: payload.name,
    categoryId: payload.categoryId,
    industry: payload.industry,
    lifecycleStage: payload.lifecycleStage,
    description: payload.description,
    // 新增默认启用（唯一状态维度；仅启用可被产品引用）
    useStatus: 'enabled',
    org: '平台级',
    visibility: 'PUBLIC',
    hasDisposal: payload.operations.some((row) => processOpType(row.opCode) === 'disposal'),
    operations: remapProcessOps(payload.operations, stamp),
    createdBy: '当前用户',
    createdAt: NOW,
    updatedAt: NOW,
  }
  processStore = [item, ...processStore]
  return request(item)
}

/** 编辑：模板可自由编辑，被引用 / 被复制后仍可编辑，不回写已建副本（R-008 / D07） */
export async function updateProcess(id: string, payload: ProcessPayload): Promise<ProcessItem> {
  const target = processStore.find((item) => item.id === id)
  if (!target) throw new Error('工艺流程不存在或已被删除')
  assertProcess(payload, false)

  target.name = payload.name
  target.categoryId = payload.categoryId
  target.industry = payload.industry
  target.lifecycleStage = payload.lifecycleStage
  target.description = payload.description
  target.hasDisposal = payload.operations.some((row) => processOpType(row.opCode) === 'disposal')
  target.operations = remapProcessOps(payload.operations, Date.now().toString().slice(-6))
  target.updatedAt = NOW
  return request(target)
}

/**
 * 启用 / 禁用：**仅「启用」可被产品引用**（R-009 / D10）；
 * 禁用不影响已建副本；模板仍可自由编辑（R-008）。
 */
export async function updateProcessUseStatus(id: string, useStatus: EnableStatus): Promise<ProcessItem> {
  const target = processStore.find((item) => item.id === id)
  if (!target) throw new Error('工艺流程不存在或已被删除')
  target.useStatus = useStatus
  target.updatedAt = NOW
  return request(target)
}

/** 删除：**仅「禁用」状态可删除，不检查引用 / 复制状态**（R-013 / D08，与工序口径一致） */
export async function deleteProcess(id: string): Promise<void> {
  const target = processStore.find((item) => item.id === id)
  if (!target) throw new Error('工艺流程不存在或已被删除')
  if (target.useStatus === 'enabled') {
    throw new Error('请先禁用该工艺流程，再执行删除（R-013 / D08）')
  }
  processStore = processStore.filter((item) => item.id !== id)
  await new Promise((resolve) => setTimeout(resolve, 260))
}

/* ===================== 我的工艺库（产品碳足迹 · B3，组织自建工艺） ===================== */

/** 当前登录用户所属组织（原型固定值；归属组织自动带出、不可改） */
export const MY_PROCESS_ORG = '福建竹业集团 · 工厂A1'

/**
 * 组织自建工艺种子（自己新增，`ORG`）。
 * 与后台「工艺流程」（平台级 `PUBLIC`）按数据归属分离：此处仅本组织可见 / 可维护。
 */
const myProcessSeed: MyProcessItem[] = [
  {
    id: 'MGY01',
    code: 'ORG-GY-202609-001',
    name: '定制印花竹筷成型工艺',
    categoryId: 'PC200903',
    industry: '竹制品制造',
    lifecycleStage: '生产',
    description: '组织自建：在标准竹筷成型工艺基础上增加印花与独立包装',
    useStatus: 'enabled',
    org: MY_PROCESS_ORG,
    visibility: 'ORG',
    hasDisposal: false,
    operations: [
      { id: 'MGY01-PO1', seq: 1, order: 1, opCode: 'GX-01', opName: '断料', remark: '' },
      { id: 'MGY01-PO2', seq: 2, order: 2, opCode: 'GX-03', opName: '打磨成型', remark: '' },
      { id: 'MGY01-PO3', seq: 3, order: 3, opCode: 'GX-04', opName: '包装', remark: '' },
    ],
    source: 'custom',
    sourceProcessId: null,
    createdBy: '组织管理员',
    createdAt: '2026-09-05 09:20',
    updatedAt: '2026-09-23 15:10',
  },
]

/** 组织自建工艺库（内存态） */
let myProcessStore: MyProcessItem[] = clone(myProcessSeed)
/** 已引用的后台工艺 id（引用 = 只读指向，**不落库**；演示数据引用 GY-00） */
let myProcessRefIds: string[] = ['GY01']

/** 引用后台工艺投影：平台级工艺 + 来源二态只读包装（使用状态随后台） */
function projectReferencedProcess(item: ProcessItem): MyProcessItem {
  return { ...item, source: 'referenced', sourceProcessId: item.id }
}

function toMyProcessDetail(item: MyProcessItem): MyProcessDetail {
  const products = applicableProducts(item.code)
  return { ...item, applicableProducts: products, copiedProductCount: products.length }
}

export function fetchMyProcesses(): Promise<MyProcessItem[]> {
  const custom = myProcessStore.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  const referenced = myProcessRefIds
    .map((id) => processStore.find((p) => p.id === id))
    .filter((p): p is ProcessItem => !!p)
    .map(projectReferencedProcess)
  return request([...custom, ...referenced])
}

export async function fetchMyProcess(id: string): Promise<MyProcessDetail> {
  const custom = myProcessStore.find((p) => p.id === id)
  if (custom) return request(toMyProcessDetail(custom))
  if (myProcessRefIds.includes(id)) {
    const platform = processStore.find((p) => p.id === id)
    if (platform) return request(toMyProcessDetail(projectReferencedProcess(platform)))
  }
  throw new Error('工艺流程不存在或已被删除')
}

/** 操作日志：组织自建工艺返回日志；引用后台工艺为只读项，无本组织操作日志 */
export async function fetchMyProcessLogs(id: string): Promise<OperationLogItem[]> {
  const target = myProcessStore.find((p) => p.id === id)
  if (!target) return request([])
  const logs: OperationLogItem[] = [
    {
      id: `${id}-created`,
      time: target.createdAt,
      operator: target.createdBy,
      action: '新建工艺流程',
      detail: `来源 = 自己新增；工艺流程编码 ${target.code}；工序 ${target.operations.length} 道`,
    },
    {
      id: `${id}-updated`,
      time: target.updatedAt,
      operator: target.createdBy,
      action: '最近修改',
      detail: `「${target.name}」当前${target.useStatus === 'enabled' ? '已启用' : '已禁用'}；组织自建（ORG）`,
    },
  ]
  return request(logs)
}

/** 后台平台级工艺（`PUBLIC`，「引用后台工艺」的来源）：仅返回启用中的工艺 */
export function fetchBackendProcesses(): Promise<ProcessItem[]> {
  return request(processStore.filter((p) => p.org === '平台级' && p.useStatus === 'enabled'))
}

/** 批量引用后台工艺流程（**引用即只读指向，不落库**；重复引用跳过） */
export async function referenceBackendProcesses(ids: string[]): Promise<MyProcessBatchResult> {
  const failed: MyProcessBatchFailure[] = []
  let success = 0

  ids.forEach((id) => {
    const target = processStore.find((p) => p.id === id)
    if (!target) {
      failed.push({ id, code: '-', name: '-', reason: '工艺流程不存在或已被删除' })
      return
    }
    if (myProcessRefIds.includes(id)) {
      failed.push({ id, code: target.code, name: target.name, reason: '该工艺流程已引用，请勿重复引用' })
      return
    }
    myProcessRefIds = [...myProcessRefIds, id]
    success += 1
  })

  return request({ success, failed })
}

/** 新增组织自建工艺（来源 = 自己新增；操作口径与后台「新增工艺流程」一致） */
export async function createMyProcess(payload: ProcessPayload): Promise<MyProcessItem> {
  if (myProcessStore.some((p) => p.code === payload.code) || processStore.some((p) => p.code === payload.code)) {
    throw new Error('工艺流程编码已存在（含后台工艺流程库），请修改后重试')
  }
  assertProcess(payload, false)

  const stamp = Date.now().toString().slice(-6)
  const item: MyProcessItem = {
    id: `MG${stamp}`,
    code: payload.code,
    name: payload.name,
    categoryId: payload.categoryId,
    industry: payload.industry,
    lifecycleStage: payload.lifecycleStage,
    description: payload.description,
    useStatus: 'enabled',
    org: MY_PROCESS_ORG,
    visibility: 'ORG',
    hasDisposal: payload.operations.some((row) => processOpType(row.opCode) === 'disposal'),
    operations: remapProcessOps(payload.operations, stamp),
    source: 'custom',
    sourceProcessId: null,
    createdBy: '组织管理员',
    createdAt: NOW,
    updatedAt: NOW,
  }
  myProcessStore = [item, ...myProcessStore]
  return request(item)
}

/** 编辑（**仅「自己新增」的组织自建工艺**；引用后台工艺只读，不可编辑） */
export async function updateMyProcess(id: string, payload: ProcessPayload): Promise<MyProcessItem> {
  const target = myProcessStore.find((p) => p.id === id)
  if (!target) throw new Error('仅「自己新增」的组织自建工艺可编辑（引用后台工艺只读）')
  if (
    myProcessStore.some((p) => p.code === payload.code && p.id !== id) ||
    processStore.some((p) => p.code === payload.code)
  ) {
    throw new Error('工艺流程编码已存在（含后台工艺流程库），请修改后重试')
  }
  assertProcess(payload, false)

  target.name = payload.name
  target.categoryId = payload.categoryId
  target.industry = payload.industry
  target.lifecycleStage = payload.lifecycleStage
  target.description = payload.description
  target.hasDisposal = payload.operations.some((row) => processOpType(row.opCode) === 'disposal')
  target.operations = remapProcessOps(payload.operations, Date.now().toString().slice(-6))
  target.updatedAt = NOW
  return request(target)
}

/** 启用 / 禁用（**仅组织自建工艺**；引用后台工艺的使用状态由后台控制，本模块只读） */
export async function updateMyProcessUseStatus(id: string, useStatus: EnableStatus): Promise<MyProcessItem> {
  const target = myProcessStore.find((p) => p.id === id)
  if (!target) throw new Error('引用后台工艺的使用状态由后台控制，本模块只读')
  target.useStatus = useStatus
  target.updatedAt = NOW
  return request(target)
}

/** 删除（仅「自己新增」；引用后台工艺为只读项，不可删除） */
export async function deleteMyProcess(id: string): Promise<void> {
  const target = myProcessStore.find((p) => p.id === id)
  if (!target) throw new Error('引用后台工艺为只读项，不可删除')
  myProcessStore = myProcessStore.filter((p) => p.id !== id)
  await new Promise((resolve) => setTimeout(resolve, 200))
}

/* ===================== 物料库（基础库 A1-1，轻量基础数据） ===================== */

/** 描述长度上限（D03 / R-004）：前端字数统计与服务端校验共用同一口径 */
export const MATERIAL_DESCRIPTION_MAX = 500

export interface MaterialPayload {
  code: string
  name: string
  /** 物料类型（一级）：投入产出流 */
  flowType: MaterialFlowType
  /** 物料类型（二级）：仅一级 = 原辅料（material）时必填 */
  subCategory: MaterialSubCategory | null
  /** 适用行业（多选，引用行业库 A1-4） */
  industries: string[]
  description: string
}

/** 物料主数据校验：物料类型必填且受控（一级 + 原辅料子类，R-002 / D05）、描述长度（R-004 / D03） */
function assertMaterial(payload: MaterialPayload): void {
  if (!payload.flowType) {
    throw new Error('保存失败：物料类型（一级 · 投入产出流）必填（R-002 / D05）')
  }
  if (payload.flowType === 'material' && !payload.subCategory) {
    throw new Error('保存失败：物料类型为「原辅料」时必须选择子类（原料 / 辅料 / 包装材料）（R-002 / D05）')
  }
  if (payload.description.length > MATERIAL_DESCRIPTION_MAX) {
    throw new Error(`保存失败：描述最长 ${MATERIAL_DESCRIPTION_MAX} 字符（R-004 / D03）`)
  }
}

/** 列表：物料字典（**无引用状态、无数据来源**，所有物料统一维护） */
export function fetchMaterials(): Promise<MaterialItem[]> {
  return request(materialStore)
}

export async function fetchMaterial(id: string): Promise<MaterialItem> {
  const target = materialStore.find((item) => item.id === id)
  if (!target) throw new Error('物料不存在或已被删除')
  return request(target)
}

export async function createMaterial(payload: MaterialPayload): Promise<MaterialItem> {
  if (materialStore.some((item) => item.code === payload.code)) {
    throw new Error('物料编码已存在，请修改后重试（R-001）')
  }
  assertMaterial(payload)

  const item: MaterialItem = {
    id: `MT${Date.now().toString().slice(-6)}`,
    code: payload.code,
    name: payload.name,
    flowType: payload.flowType,
    subCategory: payload.flowType === 'material' ? payload.subCategory : null,
    industries: [...payload.industries],
    // 新增默认启用；使用状态不进表单，走行操作
    status: 'enabled',
    description: payload.description,
    createdBy: '当前用户',
    createdAt: NOW,
    updatedBy: '当前用户',
    updatedAt: NOW,
  }
  materialStore = [item, ...materialStore]
  return request(item)
}

/** 编辑：所有物料均可维护（无数据来源 / 引用状态限制）；主数据变更不追溯已核算结果（R-010） */
export async function updateMaterial(id: string, payload: MaterialPayload): Promise<MaterialItem> {
  const target = materialStore.find((item) => item.id === id)
  if (!target) throw new Error('物料不存在或已被删除')
  if (materialStore.some((item) => item.code === payload.code && item.id !== id)) {
    throw new Error('物料编码已存在，请修改后重试（R-001）')
  }
  assertMaterial(payload)

  target.code = payload.code
  target.name = payload.name
  target.flowType = payload.flowType
  target.subCategory = payload.flowType === 'material' ? payload.subCategory : null
  target.industries = [...payload.industries]
  target.description = payload.description
  target.updatedBy = '当前用户'
  target.updatedAt = NOW
  return request(target)
}

/** 单个启用 / 禁用：双向可达、无前置约束（不设引用状态控制） */
export async function updateMaterialStatus(id: string, status: EnableStatus): Promise<MaterialItem> {
  const target = materialStore.find((item) => item.id === id)
  if (!target) throw new Error('物料不存在或已被删除')
  target.status = status
  target.updatedBy = '当前用户'
  target.updatedAt = NOW
  return request(target)
}

/** 批量启停的失败条目 */
export interface MaterialBatchFailure {
  id: string
  code: string
  name: string
  reason: string
}

export interface MaterialBatchResult {
  success: number
  failed: MaterialBatchFailure[]
}

/** 批量启用 / 停用：逐条执行，返回「成功 N 条 + 失败清单与原因」 */
export async function batchUpdateMaterialStatus(
  ids: string[],
  status: EnableStatus,
): Promise<MaterialBatchResult> {
  const failed: MaterialBatchFailure[] = []
  let success = 0

  ids.forEach((id) => {
    const target = materialStore.find((item) => item.id === id)
    if (!target) {
      failed.push({ id, code: '-', name: '-', reason: '物料不存在或已被删除' })
      return
    }
    target.status = status
    target.updatedBy = '当前用户'
    target.updatedAt = NOW
    success += 1
  })

  return request({ success, failed })
}

/** 删除：**仅「已禁用」的物料可删除**（与工序模块口径一致） */
export async function deleteMaterial(id: string): Promise<void> {
  const target = materialStore.find((item) => item.id === id)
  if (!target) throw new Error('物料不存在或已被删除')
  if (target.status === 'enabled') {
    throw new Error('请先禁用该物料，再执行删除（启用中的物料不可删除）')
  }
  materialStore = materialStore.filter((item) => item.id !== id)
  await new Promise((resolve) => setTimeout(resolve, 260))
}

/* ===================== 能源库（基础库 A1-2，轻量基础数据） ===================== */

/** 描述长度上限（D05 / R-005）：前端字数统计与服务端校验共用同一口径 */
export const ENERGY_DESCRIPTION_MAX = 500

export interface EnergyPayload {
  code: string
  name: string
  /** 能源类型：燃料 / 电力 / 热力（必填且受控） */
  energyType: EnergyType
  /** 适用行业（多选，引用行业库 A1-4） */
  industries: string[]
  description: string
}

/** 能源主数据校验：能源类型必填且受控（R-002 / D06 / T3）、描述长度（R-005 / D05） */
function assertEnergy(payload: EnergyPayload): void {
  if (!payload.energyType) {
    throw new Error('保存失败：能源类型（燃料 / 电力 / 热力）必填（R-002 / D06）')
  }
  if (payload.description.length > ENERGY_DESCRIPTION_MAX) {
    throw new Error(`保存失败：描述最长 ${ENERGY_DESCRIPTION_MAX} 字符（R-005 / D05）`)
  }
}

/** 列表：能源字典（**无引用状态、无数据来源**，所有能源统一维护） */
export function fetchEnergies(): Promise<EnergyItem[]> {
  return request(energyStore)
}

export async function fetchEnergy(id: string): Promise<EnergyItem> {
  const target = energyStore.find((item) => item.id === id)
  if (!target) throw new Error('能源不存在或已被删除')
  return request(target)
}

export async function createEnergy(payload: EnergyPayload): Promise<EnergyItem> {
  if (energyStore.some((item) => item.code === payload.code)) {
    throw new Error('能源编码已存在，请修改后重试（R-001）')
  }
  assertEnergy(payload)

  const item: EnergyItem = {
    id: `EN${Date.now().toString().slice(-6)}`,
    code: payload.code,
    name: payload.name,
    energyType: payload.energyType,
    industries: [...payload.industries],
    // 新增默认启用；使用状态不进表单，走行操作
    status: 'enabled',
    description: payload.description,
    createdBy: '当前用户',
    createdAt: NOW,
    updatedBy: '当前用户',
    updatedAt: NOW,
  }
  energyStore = [item, ...energyStore]
  return request(item)
}

/** 编辑：所有能源均可维护（无数据来源 / 引用状态限制）；主数据变更不追溯已核算结果（R-011 / H6） */
export async function updateEnergy(id: string, payload: EnergyPayload): Promise<EnergyItem> {
  const target = energyStore.find((item) => item.id === id)
  if (!target) throw new Error('能源不存在或已被删除')
  if (energyStore.some((item) => item.code === payload.code && item.id !== id)) {
    throw new Error('能源编码已存在，请修改后重试（R-001）')
  }
  assertEnergy(payload)

  target.code = payload.code
  target.name = payload.name
  target.energyType = payload.energyType
  target.industries = [...payload.industries]
  target.description = payload.description
  target.updatedBy = '当前用户'
  target.updatedAt = NOW
  return request(target)
}

/** 单个启用 / 禁用：双向可达、无前置约束（不设引用状态控制） */
export async function updateEnergyStatus(id: string, status: EnableStatus): Promise<EnergyItem> {
  const target = energyStore.find((item) => item.id === id)
  if (!target) throw new Error('能源不存在或已被删除')
  target.status = status
  target.updatedBy = '当前用户'
  target.updatedAt = NOW
  return request(target)
}

/** 批量启停的失败条目 */
export interface EnergyBatchFailure {
  id: string
  code: string
  name: string
  reason: string
}

export interface EnergyBatchResult {
  success: number
  failed: EnergyBatchFailure[]
}

/** 批量启用 / 停用：逐条执行，返回「成功 N 条 + 失败清单与原因」 */
export async function batchUpdateEnergyStatus(ids: string[], status: EnableStatus): Promise<EnergyBatchResult> {
  const failed: EnergyBatchFailure[] = []
  let success = 0

  ids.forEach((id) => {
    const target = energyStore.find((item) => item.id === id)
    if (!target) {
      failed.push({ id, code: '-', name: '-', reason: '能源不存在或已被删除' })
      return
    }
    target.status = status
    target.updatedBy = '当前用户'
    target.updatedAt = NOW
    success += 1
  })

  return request({ success, failed })
}

/** 删除：**仅「已禁用」的能源可删除**（与物料库 / 工序模块口径一致） */
export async function deleteEnergy(id: string): Promise<void> {
  const target = energyStore.find((item) => item.id === id)
  if (!target) throw new Error('能源不存在或已被删除')
  if (target.status === 'enabled') {
    throw new Error('请先禁用该能源，再执行删除（启用中的能源不可删除）')
  }
  energyStore = energyStore.filter((item) => item.id !== id)
  await new Promise((resolve) => setTimeout(resolve, 260))
}

/* ===================== 计量单位库（基础库 A1-9） ===================== */

/** 备注长度上限：前端字数统计与服务端校验共用同一口径 */
export const UNIT_REMARK_MAX = 200

export interface UnitPayload {
  name: string
  symbol: string
  /** 单位类型（系统内置枚举）：**新增后可改，编辑时不可改**（R-003 / R-008） */
  unitType: UnitType
  /** 是否基准单位：新增时可选，**编辑时不可改**（【待确认 Q04】） */
  isBase: boolean
  /** 关联基准单位 id：非基准单位必填且必须同类型（D03 / B5） */
  baseUnitId: string | null
  /** 换算系数：正数；基准单位恒为 1（D04） */
  factor: number
  remark: string
}

/** 引用情况（只读反查）：仅作详情页展示，不构成操作约束 */
function unitReferences(id: string): UnitReferenceItem[] {
  return unitReferenceSeed[id] ?? []
}

/**
 * 单位主数据校验（§4.2 基准单位规则 + §5 换算规则 + §6 业务规则）：
 * - 名称 / 符号必填，符号不得含空格（D01）；
 * - 「单位符号 + 单位类型」唯一（R-001）；
 * - 「数量」类型无基准单位，不可标记基准（B4）；
 * - 每个类型下有且仅有 1 个基准单位（R-002）；
 * - 非基准单位必须关联**同类型基准单位**（R-004 / D03）；
 * - 换算系数必须为正数（R-005 / U6）。
 */
function assertUnit(payload: UnitPayload, id: string | null): void {
  const name = payload.name.trim()
  const symbol = payload.symbol.trim()
  if (!name) throw new Error('保存失败：单位名称必填')
  if (!symbol) throw new Error('保存失败：单位符号必填（D01）')
  if (/\s/.test(symbol)) throw new Error('保存失败：单位符号不得包含空格（D01）')

  if (payload.isBase && payload.unitType === 'quantity') {
    throw new Error('保存失败：「数量」类型无基准单位，不可标记为基准单位（B4）')
  }

  if (unitStore.some((item) => item.id !== id && item.symbol === symbol && item.unitType === payload.unitType)) {
    throw new Error('保存失败：「单位符号 + 单位类型」已存在（R-001）')
  }

  if (payload.isBase) {
    if (unitStore.some((item) => item.id !== id && item.unitType === payload.unitType && item.isBase)) {
      throw new Error('保存失败：该单位类型下已存在基准单位（R-002）')
    }
  } else {
    if (!payload.baseUnitId) throw new Error('保存失败：非基准单位必须选择关联基准单位（R-004）')
    const base = unitStore.find((item) => item.id === payload.baseUnitId)
    if (!base) throw new Error('保存失败：关联基准单位不存在')
    if (!base.isBase) throw new Error('保存失败：关联基准单位必须是该类型下的基准单位（R-004）')
    if (base.unitType !== payload.unitType) {
      throw new Error('保存失败：关联基准单位必须与本单位同类型（R-004 / D03）')
    }
    if (!(payload.factor > 0)) throw new Error('保存失败：换算系数必须为正数（R-005 / U6）')
  }

  if (payload.remark.length > UNIT_REMARK_MAX) {
    throw new Error(`保存失败：备注最长 ${UNIT_REMARK_MAX} 字符`)
  }
}

/** 列表：单位字典 */
export function fetchUnits(): Promise<UnitItem[]> {
  return request(unitStore)
}

export async function fetchUnit(id: string): Promise<UnitItem> {
  const target = unitStore.find((item) => item.id === id)
  if (!target) throw new Error('单位不存在或已被删除')
  return request(target)
}

/** 详情：单位信息 + 引用情况（只读反查，仅作展示） */
export async function fetchUnitDetail(id: string): Promise<UnitDetail> {
  const target = unitStore.find((item) => item.id === id)
  if (!target) throw new Error('单位不存在或已被删除')
  return request<UnitDetail>({ ...target, references: unitReferences(id) })
}

export async function createUnit(payload: UnitPayload): Promise<UnitItem> {
  assertUnit(payload, null)

  const base = payload.isBase ? null : unitStore.find((item) => item.id === payload.baseUnitId) ?? null
  const item: UnitItem = {
    id: `U${Date.now().toString().slice(-6)}`,
    name: payload.name.trim(),
    symbol: payload.symbol.trim(),
    unitType: payload.unitType,
    isBase: payload.isBase,
    baseUnitId: payload.isBase ? null : payload.baseUnitId,
    baseUnitSymbol: payload.isBase ? null : base?.symbol ?? null,
    factor: payload.isBase ? 1 : payload.factor,
    // 新增默认启用；使用状态不进表单，走行操作
    status: 'enabled',
    remark: payload.remark.trim(),
    createdBy: '当前用户',
    createdAt: NOW,
    updatedBy: '当前用户',
    updatedAt: NOW,
  }
  unitStore = [item, ...unitStore]
  return request(item)
}

/**
 * 编辑（R-008 / R-010）：
 * - 单位类型与「是否基准单位」**编辑时不可改**（R-003 / Q04）；
 * - 基准单位：名称 / 符号 / 备注可维护，关联基准单位与换算系数锁定（系数恒为 1）；
 * - 非基准单位：可维护名称、符号、关联基准单位、换算系数、备注。
 * - 变更不追溯已有核算结果；需按新口径重算时走 E13（二次确认由页面处理）。
 */
export async function updateUnit(id: string, payload: UnitPayload): Promise<UnitItem> {
  const target = unitStore.find((item) => item.id === id)
  if (!target) throw new Error('单位不存在或已被删除')

  // 编辑时不可改类型与基准标记，忽略载荷中的对应值（R-003 / Q04）
  assertUnit({ ...payload, unitType: target.unitType, isBase: target.isBase }, id)

  const base = target.isBase ? null : unitStore.find((item) => item.id === payload.baseUnitId) ?? null
  target.name = payload.name.trim()
  target.symbol = payload.symbol.trim()
  target.baseUnitId = target.isBase ? null : payload.baseUnitId
  target.baseUnitSymbol = target.isBase ? null : base?.symbol ?? null
  target.factor = target.isBase ? 1 : payload.factor
  target.remark = payload.remark.trim()
  target.updatedBy = '当前用户'
  target.updatedAt = NOW
  return request(target)
}

/**
 * 启用 / 禁用：双向可达；**基准单位受保护不可禁用**（R-003 / B2）。
 * 使用状态不进表单，走行操作。
 */
export async function updateUnitStatus(id: string, status: EnableStatus): Promise<UnitItem> {
  const target = unitStore.find((item) => item.id === id)
  if (!target) throw new Error('单位不存在或已被删除')
  if (status === 'disabled' && target.isBase) {
    throw new Error('基准单位不可禁用（R-003 / B2）')
  }
  target.status = status
  target.updatedBy = '当前用户'
  target.updatedAt = NOW
  return request(target)
}

/** 批量操作的失败条目 */
export interface UnitBatchFailure {
  id: string
  name: string
  symbol: string
  reason: string
}

export interface UnitBatchResult {
  success: number
  failed: UnitBatchFailure[]
}

/** 批量启用 / 禁用：逐条执行，返回「成功 N 条 + 跳过清单与原因」 */
export async function batchUpdateUnitStatus(ids: string[], status: EnableStatus): Promise<UnitBatchResult> {
  const failed: UnitBatchFailure[] = []
  let success = 0

  ids.forEach((id) => {
    const target = unitStore.find((item) => item.id === id)
    if (!target) {
      failed.push({ id, name: '-', symbol: '-', reason: '单位不存在或已被删除' })
      return
    }
    if (status === 'disabled' && target.isBase) {
      failed.push({ id, name: target.name, symbol: target.symbol, reason: '基准单位不可禁用（R-003）' })
      return
    }
    target.status = status
    target.updatedBy = '当前用户'
    target.updatedAt = NOW
    success += 1
  })

  return request({ success, failed })
}

/** 删除：**仅「已禁用」的非基准单位可删除**（与物料库 / 能源库口径一致；基准单位受保护 R-003） */
export async function deleteUnit(id: string): Promise<void> {
  const target = unitStore.find((item) => item.id === id)
  if (!target) throw new Error('单位不存在或已被删除')
  if (target.isBase) throw new Error('基准单位不可删除（R-003）')
  if (target.status === 'enabled') throw new Error('请先禁用该单位，再执行删除（启用中的单位不可删除）')
  unitStore = unitStore.filter((item) => item.id !== id)
  await new Promise((resolve) => setTimeout(resolve, 260))
}

/** 批量删除：逐条执行，仅「已禁用」的非基准单位可删除；返回「成功 N 条 + 跳过清单与原因」 */
export async function batchDeleteUnits(ids: string[]): Promise<UnitBatchResult> {
  const failed: UnitBatchFailure[] = []
  let success = 0

  ids.forEach((id) => {
    const target = unitStore.find((item) => item.id === id)
    if (!target) {
      failed.push({ id, name: '-', symbol: '-', reason: '单位不存在或已被删除' })
      return
    }
    if (target.isBase) {
      failed.push({ id, name: target.name, symbol: target.symbol, reason: '基准单位不可删除（R-003）' })
      return
    }
    if (target.status === 'enabled') {
      failed.push({ id, name: target.name, symbol: target.symbol, reason: '启用中的单位不可删除，请先禁用' })
      return
    }
    unitStore = unitStore.filter((item) => item.id !== id)
    success += 1
  })

  return request({ success, failed })
}

/* ===================== 数据字典（平台支撑） ===================== */

export interface DictItemPayload {
  /** 所属字典类型 id */
  typeId: string
  code: string
  label: string
  sort: number
  remark: string
}

/** 字典类型列表（平台支撑 → 数据字典） */
export function fetchDictTypes(): Promise<DictType[]> {
  return request(dictTypeStore.slice().sort((a, b) => a.code.localeCompare(b.code)))
}

/** 某字典类型下的全部字典项（按排序号升序） */
export function fetchDictItems(typeId: string): Promise<DictItem[]> {
  return request(
    dictItemStore
      .filter((item) => item.typeId === typeId)
      .slice()
      .sort((a, b) => a.sort - b.sort || a.code.localeCompare(b.code)),
  )
}

/** 按字典类型编码取「启用」字典项（业务下拉取值来源，如系统边界） */
export function fetchDictOptionsByTypeCode(typeCode: string): Promise<DictItem[]> {
  const type = dictTypeStore.find((item) => item.code === typeCode)
  if (!type) return request([])
  return request(
    dictItemStore
      .filter((item) => item.typeId === type.id && item.status === 'enabled')
      .slice()
      .sort((a, b) => a.sort - b.sort),
  )
}

/** 系统边界字典项（同步，仅启用项，按排序号）：前台「核算边界」下拉与阶段「适用系统边界」复选取值来源 */
export function systemBoundaryItems(): DictItem[] {
  const type = dictTypeStore.find((item) => item.code === DICT_TYPE_SYSTEM_BOUNDARY)
  if (!type) return []
  return dictItemStore
    .filter((item) => item.typeId === type.id && item.status === 'enabled')
    .slice()
    .sort((a, b) => a.sort - b.sort)
}

/** 系统边界标签（同步：「字典项编码 → 名称」，用于列表 / 报告的边界展示） */
export function boundaryLabelOf(code: string): string {
  const item = dictItemStore.find(
    (entry) =>
      entry.code === code &&
      dictTypeStore.find((type) => type.id === entry.typeId)?.code === DICT_TYPE_SYSTEM_BOUNDARY,
  )
  return item?.label ?? code
}

function assertDictItem(payload: DictItemPayload, id: string | null): void {
  if (!payload.typeId) throw new Error('保存失败：所属字典类型必填')
  if (!payload.code.trim()) throw new Error('保存失败：字典项编码必填')
  if (!payload.label.trim()) throw new Error('保存失败：字典项名称必填')
  if (!Number.isInteger(payload.sort) || payload.sort < 0) throw new Error('保存失败：排序号需为不小于 0 的整数')
  if (
    dictItemStore.some(
      (item) => item.id !== id && item.typeId === payload.typeId && item.code.trim() === payload.code.trim(),
    )
  ) {
    throw new Error('保存失败：字典项编码在同一字典类型下已存在')
  }
}

/** 新增字典项：默认启用 */
export async function createDictItem(payload: DictItemPayload): Promise<DictItem> {
  assertDictItem(payload, null)
  const item: DictItem = {
    id: `DI${Date.now().toString().slice(-6)}`,
    typeId: payload.typeId,
    code: payload.code.trim(),
    label: payload.label.trim(),
    sort: payload.sort,
    remark: payload.remark.trim(),
    status: 'enabled',
    createdBy: '当前用户',
    createdAt: NOW,
    updatedBy: '当前用户',
    updatedAt: NOW,
  }
  dictItemStore = [item, ...dictItemStore]
  return request(item)
}

/** 编辑字典项 */
export async function updateDictItem(id: string, payload: DictItemPayload): Promise<DictItem> {
  const target = dictItemStore.find((item) => item.id === id)
  if (!target) throw new Error('字典项不存在或已被删除')
  assertDictItem(payload, id)
  target.typeId = payload.typeId
  target.code = payload.code.trim()
  target.label = payload.label.trim()
  target.sort = payload.sort
  target.remark = payload.remark.trim()
  target.updatedBy = '当前用户'
  target.updatedAt = NOW
  return request(target)
}

/** 启用 / 禁用字典项（禁用后不再出现在业务下拉中） */
export async function updateDictItemStatus(id: string, status: EnableStatus): Promise<DictItem> {
  const target = dictItemStore.find((item) => item.id === id)
  if (!target) throw new Error('字典项不存在或已被删除')
  target.status = status
  target.updatedBy = '当前用户'
  target.updatedAt = NOW
  return request(target)
}

/** 删除字典项：被生命周期阶段「适用系统边界」引用时阻断删除 */
export async function deleteDictItem(id: string): Promise<void> {
  const target = dictItemStore.find((item) => item.id === id)
  if (!target) throw new Error('字典项不存在或已被删除')
  if (lifecycleStore.some((stage) => stage.boundaries.includes(target.code))) {
    throw new Error('该字典项已被生命周期阶段的「适用系统边界」引用，请先解除引用再删除')
  }
  dictItemStore = dictItemStore.filter((item) => item.id !== id)
  await new Promise((resolve) => setTimeout(resolve, 200))
}

/* ===================== 生命周期阶段（基础库 A1-10，轻量基础数据） ===================== */

/** 阶段描述长度上限：前端字数统计与服务端校验共用同一口径 */
export const LIFECYCLE_DESCRIPTION_MAX = 500

/** 阶段顺序取值范围（【待确认 Q04】） */
export const LIFECYCLE_ORDER_MIN = 1
export const LIFECYCLE_ORDER_MAX = 99

export interface LifecycleStagePayload {
  code: string
  name: string
  level: LifecycleLevel
  /** 上级阶段 id：二级必填且只能指向一级阶段（D02）；一级为空 */
  parentId: string | null
  order: number
  description: string
  /** 适用系统边界（多选，引用「数据字典 · 系统边界」字典项编码）；为空 = 全边界通用 */
  boundaries: string[]
}

/**
 * 阶段主数据校验（§4 结构与基线规则 + §6 业务规则）：
 * - 编码必填且唯一（R-001 / D01）；
 * - 名称必填且**同级内唯一**（R-002 / D04）；
 * - 层级仅一级 / 二级，**二级必选上级阶段且上级必须为一级阶段**（R-003 / D02 / D03）；
 * - 阶段顺序为 1～99 整数，**同级内不重复**（R-004 / D05）；
 * - 适用系统边界为多选（引用「数据字典 · 系统边界」），允许为空 = 全边界通用。
 */
function assertLifecycle(payload: LifecycleStagePayload, id: string | null): void {
  const code = payload.code.trim()
  const name = payload.name.trim()

  if (!code) throw new Error('保存失败：阶段编码必填（R-001 / D01）')
  if (!name) throw new Error('保存失败：阶段名称必填')

  const parentId = payload.level === 2 ? payload.parentId : null

  if (payload.level === 2) {
    if (!parentId) throw new Error('保存失败：二级阶段的「上级阶段」必填（R-003 / D02）')
    const parent = lifecycleStore.find((item) => item.id === parentId)
    if (!parent) throw new Error('保存失败：上级阶段不存在或已被删除')
    if (parent.level !== 1) throw new Error('保存失败：上级阶段必须为一级阶段，不支持三级（D02 / D03）')
  }

  if (lifecycleStore.some((item) => item.id !== id && item.code === code)) {
    throw new Error('保存失败：阶段编码已存在（R-001 / D01）')
  }

  if (
    lifecycleStore.some(
      (item) => item.id !== id && item.level === payload.level && item.parentId === parentId && item.name === name,
    )
  ) {
    throw new Error('保存失败：同一上级下的阶段名称不得重复（R-002 / D04）')
  }

  if (!Number.isInteger(payload.order) || payload.order < LIFECYCLE_ORDER_MIN || payload.order > LIFECYCLE_ORDER_MAX) {
    throw new Error(`保存失败：阶段顺序取值为 ${LIFECYCLE_ORDER_MIN}～${LIFECYCLE_ORDER_MAX} 的整数（【待确认 Q04】）`)
  }

  if (
    lifecycleStore.some(
      (item) => item.id !== id && item.level === payload.level && item.parentId === parentId && item.order === payload.order,
    )
  ) {
    throw new Error('保存失败：同级内阶段顺序不重复（R-004 / D05）')
  }
}

/** 列表：阶段字典 */
export function fetchLifecycleStages(): Promise<LifecycleStageItem[]> {
  return request(lifecycleStore)
}

/** 单条：阶段信息（查看 / 编辑弹窗用） */
export async function fetchLifecycleStage(id: string): Promise<LifecycleStageItem> {
  const target = lifecycleStore.find((item) => item.id === id)
  if (!target) throw new Error('生命周期阶段不存在或已被删除')
  return request(target)
}

/** 新增：新增默认启用；使用状态不进表单，走行操作 */
export async function createLifecycleStage(payload: LifecycleStagePayload): Promise<LifecycleStageItem> {
  assertLifecycle(payload, null)

  const item: LifecycleStageItem = {
    id: `LS${Date.now().toString().slice(-6)}`,
    code: payload.code.trim(),
    name: payload.name.trim(),
    level: payload.level,
    parentId: payload.level === 2 ? payload.parentId : null,
    order: payload.order,
    description: payload.description.trim(),
    boundaries: [...payload.boundaries],
    status: 'enabled',
    createdBy: '当前用户',
    createdAt: NOW,
    updatedBy: '当前用户',
    updatedAt: NOW,
  }
  lifecycleStore = [item, ...lifecycleStore]
  return request(item)
}

/**
 * 编辑：轻量基础数据，**无数据来源 / 引用状态限制**，所有阶段均可维护
 * （与物料库 / 能源库口径一致）；主数据变更不追溯已建项目，需按新基线重算走 E13。
 */
export async function updateLifecycleStage(id: string, payload: LifecycleStagePayload): Promise<LifecycleStageItem> {
  const target = lifecycleStore.find((item) => item.id === id)
  if (!target) throw new Error('生命周期阶段不存在或已被删除')

  assertLifecycle(payload, id)

  target.code = payload.code.trim()
  target.name = payload.name.trim()
  target.level = payload.level
  target.parentId = payload.level === 2 ? payload.parentId : null
  target.order = payload.order
  target.description = payload.description.trim()
  target.boundaries = [...payload.boundaries]
  target.updatedBy = '当前用户'
  target.updatedAt = NOW
  return request(target)
}

/** 启用 / 禁用：**双向可达、无前置约束**（不设数据来源与引用状态，与物料库 / 能源库一致）；
 * **级联禁用**：禁用一级阶段时，其下全部二级阶段同步禁用（子阶段不应在父级禁用后仍可新项目选用）；
 * 启用**不级联**：子阶段保持各自状态，由业务按需单独启用 */
export async function updateLifecycleStageStatus(id: string, status: EnableStatus): Promise<LifecycleStageItem> {
  const target = lifecycleStore.find((item) => item.id === id)
  if (!target) throw new Error('生命周期阶段不存在或已被删除')
  target.status = status
  target.updatedBy = '当前用户'
  target.updatedAt = NOW
  if (status === 'disabled' && target.level === 1) {
    lifecycleStore.forEach((item) => {
      if (item.parentId === id && item.status !== 'disabled') {
        item.status = 'disabled'
        item.updatedBy = '当前用户'
        item.updatedAt = NOW
      }
    })
  }
  return request(target)
}

/** 删除：**仅「已禁用」的阶段可删除**（与物料库 / 能源库、工序模块口径一致）；
 * 一级阶段存在子级时阻断删除，避免产生孤儿二级阶段（列表按一级分组渲染，孤儿将无入口访问） */
export async function deleteLifecycleStage(id: string): Promise<void> {
  const target = lifecycleStore.find((item) => item.id === id)
  if (!target) throw new Error('生命周期阶段不存在或已被删除')
  if (target.status === 'enabled') {
    throw new Error('请先禁用该阶段，再执行删除（启用中的阶段不可删除）')
  }
  if (target.level === 1) {
    const childCount = lifecycleStore.filter((item) => item.parentId === id).length
    if (childCount > 0) {
      throw new Error(`删除失败：该一级阶段下存在 ${childCount} 个二级阶段，请先删除其下二级阶段`)
    }
  }
  lifecycleStore = lifecycleStore.filter((item) => item.id !== id)
  await new Promise((resolve) => setTimeout(resolve, 260))
}

/* ===================== 标准文件库（基础库 A1-3 / P05，轻量基础数据 · 无版本化） ===================== */

export interface StandardPayload {
  /** 标准号（含年份），唯一 */
  code: string
  nameZh: string
  nameEn: string
  status: StandardStatus
  publishDate: string
  implementDate: string
  publisher: string
  /** 来源链接（与「附件」二选一） */
  sourceUrl: string
  competentDept: string
  responsibleDept: string
  attachments: StandardAttachment[]
}

/**
 * 标准文件主数据校验（业务 PRD §5）：
 * - 标准号 / 中文标准名称 / 标准状态 / 发布日期 / 实施日期 / 发布单位必填（R-002）；
 * - 「标准号」唯一（R-001 / D01 / D02）；
 * - 实施日期 ≥ 发布日期（R-003 / D04）；
 * - 「来源链接」与「附件」二选一，至少填一个（R-004 / D03）；
 * - 「来源链接」非空时须为合法 URL（R-006 / D05）。
 */
function assertStandard(payload: StandardPayload, id: string | null): void {
  const code = payload.code.trim()
  const nameZh = payload.nameZh.trim()
  const sourceUrl = payload.sourceUrl.trim()

  if (!code) throw new Error('保存失败：标准号必填')
  if (!nameZh) throw new Error('保存失败：中文标准名称必填')
  if (!payload.status.trim()) throw new Error('保存失败：标准状态必填')
  if (!payload.publishDate) throw new Error('保存失败：发布日期必填')
  if (!payload.implementDate) throw new Error('保存失败：实施日期必填')
  if (!payload.publisher.trim()) throw new Error('保存失败：发布单位必填')

  if (payload.implementDate < payload.publishDate) {
    throw new Error('保存失败：实施日期不得早于发布日期（D04）')
  }

  if (!sourceUrl && payload.attachments.length === 0) {
    throw new Error('保存失败：「来源链接」与「附件」二选一，请至少填写一个（D03）')
  }
  if (sourceUrl && !/^https?:\/\/.+/i.test(sourceUrl)) {
    throw new Error('保存失败：来源链接须为合法 URL（http:// 或 https://，D05）')
  }

  if (standardStore.some((item) => item.id !== id && item.code === code)) {
    throw new Error(`保存失败：标准号「${code}」已存在，标准号唯一（R-001 / D01）`)
  }
}

/** 列表：标准文件字典（按标准号升序） */
export function fetchStandards(): Promise<StandardItem[]> {
  return request([...standardStore].sort((a, b) => a.code.localeCompare(b.code)))
}

/** 单条：标准信息（查看 / 编辑用） */
export async function fetchStandard(id: string): Promise<StandardItem> {
  const target = standardStore.find((item) => item.id === id)
  if (!target) throw new Error('标准文件不存在或已被删除')
  return request(target)
}

/**
 * 新增标准文件（S01 / S02）：
 * - 新建默认「现行」，可被核算模型绑定；
 * - 「来源链接」与「附件」二选一，由校验保证至少填一个。
 */
export async function createStandard(payload: StandardPayload): Promise<StandardItem> {
  assertStandard(payload, null)

  const item: StandardItem = {
    id: `STD${Date.now().toString().slice(-6)}`,
    code: payload.code.trim(),
    nameZh: payload.nameZh.trim(),
    nameEn: payload.nameEn.trim(),
    status: payload.status.trim() || '现行',
    publishDate: payload.publishDate,
    implementDate: payload.implementDate,
    publisher: payload.publisher.trim(),
    sourceUrl: payload.sourceUrl.trim(),
    competentDept: payload.competentDept.trim(),
    responsibleDept: payload.responsibleDept.trim(),
    attachments: payload.attachments.map((att) => ({ ...att })),
    createdBy: '当前用户',
    createdAt: NOW,
    updatedBy: '当前用户',
    updatedAt: NOW,
  }
  standardStore = [item, ...standardStore]
  return request(item)
}

/** 编辑标准文件：随时可编辑（无引用限制） */
export async function updateStandard(id: string, payload: StandardPayload): Promise<StandardItem> {
  const target = standardStore.find((item) => item.id === id)
  if (!target) throw new Error('标准文件不存在或已被删除')

  assertStandard(payload, id)

  target.code = payload.code.trim()
  target.nameZh = payload.nameZh.trim()
  target.nameEn = payload.nameEn.trim()
  target.status = payload.status.trim()
  target.publishDate = payload.publishDate
  target.implementDate = payload.implementDate
  target.publisher = payload.publisher.trim()
  target.sourceUrl = payload.sourceUrl.trim()
  target.competentDept = payload.competentDept.trim()
  target.responsibleDept = payload.responsibleDept.trim()
  target.attachments = payload.attachments.map((att) => ({ ...att }))
  target.updatedBy = '当前用户'
  target.updatedAt = NOW
  return request(target)
}

/** 删除标准文件：随时可删除（无引用限制） */
export async function deleteStandard(id: string): Promise<void> {
  const target = standardStore.find((item) => item.id === id)
  if (!target) throw new Error('标准文件不存在或已被删除')

  standardStore = standardStore.filter((item) => item.id !== id)
  await new Promise((resolve) => setTimeout(resolve, 260))
}

/* ===================== 行业库（基础库 A1-4，轻量行业字典） ===================== */

/** 行业描述长度上限（对齐竞品 500 字符） */
export const INDUSTRY_DESCRIPTION_MAX = 500

/** 排序号取值范围（选填，越小越靠前） */
export const INDUSTRY_SORT_MIN = 1
export const INDUSTRY_SORT_MAX = 99

export interface IndustryPayload {
  /** 行业编码：必填、唯一 */
  code: string
  name: string
  /** 上级行业 id：**只能指向非末级行业**；为空 = 门类 */
  parentId: string | null
  sortNo: number | null
  description: string
}

/** 行业最大层级：门类 / 大类 / 中类 / 小类（GB/T 4754 四级） */
export const INDUSTRY_MAX_LEVEL: IndustryLevel = 4

/** 由「上级行业」推导行业层级：无上级 = 门类（1），有上级 = 上级层级 + 1（与产品分类 `deriveLevel` 同口径） */
export function deriveIndustryLevel(parentId: string | null): IndustryLevel {
  if (!parentId) return 1
  const parent = industryStore.find((item) => item.id === parentId)
  if (!parent) return 1
  return Math.min(parent.level + 1, INDUSTRY_MAX_LEVEL) as IndustryLevel
}

/**
 * 行业主数据校验：
 * - 名称必填且**同级内唯一**；
 * - 编码必填且**唯一**；
 * - 层级四级：上级不得为末级（小类）、不得自引用；
 * - 排序号选填，取值为 1～99 整数；
 * - 描述 ≤ 500 字符。
 */
function assertIndustry(payload: IndustryPayload, id: string | null): void {
  const code = payload.code.trim()
  const name = payload.name.trim()
  const parentId = payload.parentId ?? null

  if (!name) throw new Error('保存失败：行业名称必填')

  if (parentId) {
    if (parentId === id) throw new Error('保存失败：上级行业不能选择自身')
    const parent = industryStore.find((item) => item.id === parentId)
    if (!parent) throw new Error('保存失败：上级行业不存在或已被删除')
    if (parent.level >= INDUSTRY_MAX_LEVEL) throw new Error('保存失败：上级行业不能是末级行业（小类），已达最大层级')
  }

  if (industryStore.some((item) => item.id !== id && item.code === code)) {
    throw new Error('保存失败：行业编码已存在')
  }

  if (
    industryStore.some(
      (item) => item.id !== id && item.name === name && (item.parentId ?? null) === parentId,
    )
  ) {
    throw new Error('保存失败：同一上级下的行业名称不得重复（R-001 / D01）')
  }

  if (payload.sortNo !== null) {
    if (!Number.isInteger(payload.sortNo) || payload.sortNo < INDUSTRY_SORT_MIN || payload.sortNo > INDUSTRY_SORT_MAX) {
      throw new Error(`保存失败：排序号取值为 ${INDUSTRY_SORT_MIN}～${INDUSTRY_SORT_MAX} 的整数`)
    }
  }

  if (payload.description.length > INDUSTRY_DESCRIPTION_MAX) {
    throw new Error(`保存失败：行业描述最长 ${INDUSTRY_DESCRIPTION_MAX} 字符`)
  }
}

/** 列表：行业字典（含只读的「已被引用」状态） */
export function fetchIndustries(): Promise<IndustryItem[]> {
  return request(industryStore)
}

/** 单条：行业信息（查看 / 编辑弹窗用） */
export async function fetchIndustry(id: string): Promise<IndustryItem> {
  const target = industryStore.find((item) => item.id === id)
  if (!target) throw new Error('行业不存在或已被删除')
  return request(target)
}

/** 新增：新增默认启用；层级由「上级行业」推导；使用状态不进表单，走行操作 */
export async function createIndustry(payload: IndustryPayload): Promise<IndustryItem> {
  assertIndustry(payload, null)

  const item: IndustryItem = {
    id: `IND${Date.now().toString().slice(-6)}`,
    code: payload.code.trim(),
    name: payload.name.trim(),
    level: deriveIndustryLevel(payload.parentId),
    parentId: payload.parentId,
    sortNo: payload.sortNo,
    description: payload.description.trim(),
    status: 'enabled',
    createdBy: '当前用户',
    createdAt: NOW,
    updatedBy: '当前用户',
    updatedAt: NOW,
  }
  industryStore = [item, ...industryStore]
  return request(item)
}

/**
 * 编辑：编码 / 名称 / 上级行业 / 排序号 / 描述可维护；层级随「上级行业」联动。
 * 行业主数据变更**不追溯已建核算项目**（项目按加载时的阶段基线快照冻结）。
 */
export async function updateIndustry(id: string, payload: IndustryPayload): Promise<IndustryItem> {
  const target = industryStore.find((item) => item.id === id)
  if (!target) throw new Error('行业不存在或已被删除')

  assertIndustry(payload, id)

  target.code = payload.code.trim()
  target.name = payload.name.trim()
  target.parentId = payload.parentId
  target.level = deriveIndustryLevel(payload.parentId)
  target.sortNo = payload.sortNo
  target.description = payload.description.trim()
  target.updatedBy = '当前用户'
  target.updatedAt = NOW
  return request(target)
}

/** 启用 / 禁用：**双向可达、无前置约束**（轻量行业字典，与产品分类 / 物料库 / 能源库口径一致） */
export async function updateIndustryStatus(id: string, status: EnableStatus): Promise<IndustryItem> {
  const target = industryStore.find((item) => item.id === id)
  if (!target) throw new Error('行业不存在或已被删除')
  target.status = status
  target.updatedBy = '当前用户'
  target.updatedAt = NOW
  return request(target)
}

/* ===================== 排放因子库（核算模型 A2-6 / A2-7） ===================== */

/** 因子描述长度上限（前端字数统计与服务端校验共用同一口径，D12） */
export const FACTOR_DESCRIPTION_MAX = 500

/** 适用行业选项（引用行业库 A1-4；取启用状态的末级行业名称） */
export const FACTOR_INDUSTRY_OPTIONS: string[] = [...industryOptions]

/** 发布国家 / 组织选项 */
export const FACTOR_PUBLISHER_REGION_OPTIONS: string[] = [
  '中国',
  '国际组织',
  '欧盟',
  '美国',
  '英国',
  '日本',
  '其他',
]

/** 发布年份选项 */
export const FACTOR_PUBLISH_YEAR_OPTIONS: string[] = [
  '2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2010', '2006',
]

/** 单位（分子）选项：碳排放量类，引用计量单位库 A1-9 */
export const FACTOR_CARBON_UNITS: string[] = unitSeed
  .filter((item) => item.unitType === 'carbon' && item.status === 'enabled')
  .map((item) => item.symbol)

/** 活动数据单位（分母）选项：引用计量单位库 A1-9；含运输周转量复合口径 `t·km` */
export const FACTOR_ACTIVITY_UNITS: string[] = [
  ...unitSeed
    .filter((item) => item.unitType !== 'carbon' && item.status === 'enabled')
    .map((item) => item.symbol),
  't·km',
]

export interface FactorFormOptions {
  industries: string[]
  publisherRegions: string[]
  publishYears: string[]
  carbonUnits: string[]
  activityUnits: string[]
}

/** 因子表单下拉选项（适用行业 / 发布国家组织 / 发布年份 / 分子分母单位）；来源类别为自由输入 */
export function fetchFactorFormOptions(): Promise<FactorFormOptions> {
  return request({
    industries: FACTOR_INDUSTRY_OPTIONS,
    publisherRegions: FACTOR_PUBLISHER_REGION_OPTIONS,
    publishYears: FACTOR_PUBLISH_YEAR_OPTIONS,
    carbonUnits: FACTOR_CARBON_UNITS,
    activityUnits: FACTOR_ACTIVITY_UNITS,
  })
}

export interface FactorPayload {
  name: string
  alias: string
  /** 英文名称（选填，后台因子库 / 前台我的因子库通用） */
  englishName?: string
  scenario: string
  value: number
  /** GWP 分项口径（选填；提供后可分「含 / 不含生物碳」双口径输出） */
  calibers?: FactorCalibers
  numeratorUnit: string
  denominatorUnit: string
  description: string
  /** 单位类别（选填） */
  unitCategory?: string
  /** 地域（选填） */
  region?: string
  /** 扩展信息「数据基本信息」（选填） */
  ext?: FactorExt
  /** 输入输出信息（选填） */
  exchanges?: FactorExchange[]
  /** 仅新增时使用：来源档位（后端新增 = preset；前台「我的因子库」新增 = custom） */
  source?: FactorSource
}

/** 引用情况（只读反查）：仅作详情页展示 */
function factorReferences(id: string): FactorReferenceItem[] {
  return factorReferenceSeed[id] ?? []
}

/** 因子 id 自增序号（批量导入时 `Date.now()` 可能相同，用序号保证唯一） */
let factorSeq = 0

function nextFactorId(): string {
  factorSeq += 1
  return `FC${String(Date.now()).slice(-6)}${String(factorSeq).padStart(3, '0')}`
}

/** 生成因子编码：`F-{序号}`（三位补零，基于当前最大序号自增） */
function nextFactorCode(): string {
  const used = factorStore
    .map((item) => Number((/^F-(\d+)$/.exec(item.code) ?? [])[1] ?? 0))
    .filter((num) => num > 0)
  const max = used.length > 0 ? Math.max(...used) : 0
  return `F-${String(max + 1).padStart(3, '0')}`
}

/**
 * 因子主数据校验：
 * - 因子名称 / 适用场景 / 因子值 / 活动数据单位 必填；
 * - 因子值不能为 0（生物碳吸收因子可为负）；
 * - 描述 ≤ 500 字符。
 */
function assertFactor(payload: FactorPayload): void {
  if (!payload.name.trim()) throw new Error('保存失败：因子名称必填')
  if (!payload.scenario.trim()) throw new Error('保存失败：适用场景不能为空')
  if (!payload.numeratorUnit) throw new Error('保存失败：单位必填')
  if (!payload.denominatorUnit) throw new Error('保存失败：请选择活动数据单位')
  if (Number.isNaN(payload.value) || payload.value === 0) throw new Error('保存失败：因子值不能为空且不能为 0')
  if (payload.description.length > FACTOR_DESCRIPTION_MAX) {
    throw new Error(`保存失败：描述最长 ${FACTOR_DESCRIPTION_MAX} 字符`)
  }
  // 口径闭合校验：总量应 ≈ 化石 + 生物碳 + 土地利用（容差 1%）
  const cal = payload.calibers
  if (cal) {
    const parts = [cal.gwpFossil, cal.gwpBiogenic, cal.gwpLuluc].filter(
      (value): value is number => value != null && Number.isFinite(value),
    )
    if (parts.length > 0 && cal.gwpTotal != null && Number.isFinite(cal.gwpTotal)) {
      const sum = parts.reduce((acc, value) => acc + value, 0)
      const tolerance = Math.max(0.001, Math.abs(cal.gwpTotal) * 0.01)
      if (Math.abs(sum - cal.gwpTotal) > tolerance) {
        throw new Error('保存失败：口径不闭合，GWP 总量应约等于 化石 + 生物碳 + 土地利用')
      }
    }
  }
}

/** 解析可选数值：空串返回 null（区别于 0） */
function parseOptionalNumber(raw: string): number | null {
  if (raw == null || raw.trim() === '') return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

/** 口径归一化：全部为空 → 返回 undefined（视为单一口径）；否则仅保留有限数值项 */
function normalizeCalibers(calibers?: FactorCalibers | null): FactorCalibers | undefined {
  if (!calibers) return undefined
  const pick = (value?: number | null) =>
    value != null && Number.isFinite(value) ? value : null
  const next: FactorCalibers = {
    gwpTotal: pick(calibers.gwpTotal),
    gwpFossil: pick(calibers.gwpFossil),
    gwpBiogenic: pick(calibers.gwpBiogenic),
    gwpLuluc: pick(calibers.gwpLuluc),
  }
  const hasAny = [next.gwpTotal, next.gwpFossil, next.gwpBiogenic, next.gwpLuluc].some(
    (value) => value != null,
  )
  return hasAny ? next : undefined
}

/** 列表：因子字典 */
export function fetchFactors(): Promise<FactorItem[]> {
  return request(factorStore)
}

export async function fetchFactor(id: string): Promise<FactorItem> {
  const target = factorStore.find((item) => item.id === id)
  if (!target) throw new Error('因子不存在或已被删除')
  return request(target)
}

/** 详情：因子信息 + 引用情况（只读反查） */
export async function fetchFactorDetail(id: string): Promise<FactorDetail> {
  const target = factorStore.find((item) => item.id === id)
  if (!target) throw new Error('因子不存在或已被删除')
  return request<FactorDetail>({ ...target, references: factorReferences(id) })
}

/** 由表单 / 导入载荷构造因子主数据（编码系统生成，新增默认启用；不做版本化） */
function buildFactorItem(payload: FactorPayload): FactorItem {
  return {
    id: nextFactorId(),
    code: nextFactorCode(),
    name: payload.name.trim(),
    alias: payload.alias.trim(),
    englishName: payload.englishName?.trim() || undefined,
    scenario: payload.scenario.trim(),
    value: payload.value,
    calibers: normalizeCalibers(payload.calibers),
    numeratorUnit: payload.numeratorUnit,
    denominatorUnit: payload.denominatorUnit,
    source: payload.source ?? 'custom',
    description: payload.description.trim(),
    createdBy: '当前用户',
    createdAt: NOW,
    updatedBy: '当前用户',
    updatedAt: NOW,
  }
}

/** 新增因子：编码系统生成，新增默认启用；不做版本化 */
export async function createFactor(payload: FactorPayload): Promise<FactorItem> {
  assertFactor(payload)
  const item = buildFactorItem(payload)
  factorStore = [item, ...factorStore]
  return request(item)
}

/** 编辑因子：不做版本化，编辑直接覆盖；变更不追溯已参与计算的历史结果 */
export async function updateFactor(id: string, payload: FactorPayload): Promise<FactorItem> {
  const target = factorStore.find((item) => item.id === id)
  if (!target) throw new Error('因子不存在或已被删除')
  assertFactor(payload)

  target.name = payload.name.trim()
  target.alias = payload.alias.trim()
  target.scenario = payload.scenario.trim()
  target.value = payload.value
  target.calibers = normalizeCalibers(payload.calibers)
  target.numeratorUnit = payload.numeratorUnit
  target.denominatorUnit = payload.denominatorUnit
  target.description = payload.description.trim()
  target.updatedBy = '当前用户'
  target.updatedAt = NOW
  return request(target)
}

/** 批量操作的失败条目 */
export interface FactorBatchFailure {
  id: string
  code: string
  name: string
  reason: string
}

export interface FactorBatchResult {
  success: number
  failed: FactorBatchFailure[]
}

/* ============ Excel 导入（后台排放因子库 / 前台我的因子库通用） ============ */

/** 单次导入的数据行上限 */
export const FACTOR_IMPORT_ROW_LIMIT = 500

/** 模板列定义（**顺序即模板列顺序**，与因子字段一一对应） */
export interface FactorImportColumn {
  key: string
  label: string
  required: boolean
  hint: string
}

export const FACTOR_IMPORT_COLUMNS: FactorImportColumn[] = [
  { key: 'name', label: '因子名称', required: true, hint: '必填，文本，≤100 字符' },
  { key: 'alias', label: '因子别名', required: false, hint: '选填' },
  { key: 'englishName', label: '英文名称', required: false, hint: '选填，如 Electricity' },
  { key: 'scenario', label: '适用场景', required: true, hint: '必填，如「外购电力消耗」' },
  { key: 'value', label: '碳排放因子值', required: true, hint: '必填，数字；生物碳吸收因子可为负（表达固碳）' },
  { key: 'unit', label: '因子单位', required: true, hint: '必填，复合单位「分子/分母」，如 kgCO₂e/kg、kgCO₂e/kWh' },
  { key: 'description', label: '描述', required: false, hint: `选填，≤${FACTOR_DESCRIPTION_MAX} 字符` },
  { key: 'gwpFossil', label: 'GWP-化石（选填）', required: false, hint: '选填；对应「不含生物碳」口径' },
  { key: 'gwpBiogenic', label: 'GWP-生物碳（选填）', required: false, hint: '选填；吸收为负、释放为正' },
  { key: 'gwpLuluc', label: 'GWP-土地利用（选填）', required: false, hint: '选填' },
]

/** 导入模板：仅表头行（必填列以 `*` 标记） */
export function buildFactorImportTemplate(): string {
  return toCsv([FACTOR_IMPORT_COLUMNS.map((col) => (col.required ? `${col.label}*` : col.label))])
}

/** 校验不通过的行（行号 = Excel 行号，表头占第 1 行） */
export interface FactorImportRowError {
  row: number
  name: string
  reason: string
}

export interface FactorImportPreview {
  /** 数据行总数（不含表头） */
  total: number
  /** 校验通过、可导入的载荷 */
  valid: FactorPayload[]
  errors: FactorImportRowError[]
}

/** 取指定列单元格（按模板列顺序定位，长度不足按空值处理） */
function importCell(cells: string[], key: string): string {
  const index = FACTOR_IMPORT_COLUMNS.findIndex((col) => col.key === key)
  return (cells[index] ?? '').trim()
}

/** 解析并校验导入文本（CSV）：第 1 行为表头，其余为数据行 */
export function validateFactorImportText(text: string): FactorImportPreview {
  if (!text.trim()) throw new Error('文件内容为空，请按模板填写后重新上传')
  // xlsx 实为 zip 包，原型不引入解析依赖，直接给出可执行的指引
  if (text.slice(0, 2) === 'PK') {
    throw new Error('原型环境仅支持解析 CSV 文件，请将 Excel「另存为 CSV」后重新导入')
  }

  const rows = parseCsvText(text)
  if (rows.length <= 1) throw new Error('未解析到数据行，请按模板填写后重新上传')

  const dataRows = rows.slice(1)
  const errors: FactorImportRowError[] = []
  const valid: FactorPayload[] = []

  if (dataRows.length > FACTOR_IMPORT_ROW_LIMIT) {
    errors.push({
      row: FACTOR_IMPORT_ROW_LIMIT + 2,
      name: '-',
      reason: `单次导入不超过 ${FACTOR_IMPORT_ROW_LIMIT} 行，超出部分已忽略`,
    })
  }

  dataRows.slice(0, FACTOR_IMPORT_ROW_LIMIT).forEach((cells, index) => {
    const row = index + 2
    const name = importCell(cells, 'name')
    const reasons: string[] = []

    const valueRaw = importCell(cells, 'value')
    const value = Number(valueRaw)
    const unitRaw = importCell(cells, 'unit')
    const [numeratorUnit, denominatorUnit] = unitRaw.split('/').map((part) => part.trim())
    const description = importCell(cells, 'description')

    if (!name) reasons.push('因子名称必填')
    if (!importCell(cells, 'scenario')) reasons.push('适用场景必填')
    if (!valueRaw || Number.isNaN(value)) reasons.push('碳排放因子值必填且必须为数字')
    else if (value === 0) reasons.push('因子值不能为 0')
    if (!unitRaw) reasons.push('因子单位必填（复合单位，如 kgCO₂e/kg）')
    else {
      if (!numeratorUnit || !denominatorUnit) {
        reasons.push(`因子单位「${unitRaw}」格式应为「分子/分母」，如 kgCO₂e/kg`)
      }
      if (numeratorUnit && !FACTOR_CARBON_UNITS.includes(numeratorUnit)) {
        reasons.push(`因子单位分子「${numeratorUnit}」不在计量单位库（碳排放量类）中`)
      }
      if (denominatorUnit && !FACTOR_ACTIVITY_UNITS.includes(denominatorUnit)) {
        reasons.push(`因子单位分母「${denominatorUnit}」不在计量单位库中`)
      }
    }
    if (description.length > FACTOR_DESCRIPTION_MAX) {
      reasons.push(`描述超过 ${FACTOR_DESCRIPTION_MAX} 字符`)
    }

    if (reasons.length > 0) {
      errors.push({ row, name: name || '（空）', reason: reasons.join('；') })
      return
    }

    const gwpFossil = parseOptionalNumber(importCell(cells, 'gwpFossil'))
    const gwpBiogenic = parseOptionalNumber(importCell(cells, 'gwpBiogenic'))
    const gwpLuluc = parseOptionalNumber(importCell(cells, 'gwpLuluc'))
    const hasCaliber = [gwpFossil, gwpBiogenic, gwpLuluc].some((item) => item != null)

    valid.push({
      name,
      alias: importCell(cells, 'alias'),
      englishName: importCell(cells, 'englishName') || undefined,
      scenario: importCell(cells, 'scenario'),
      value,
      numeratorUnit,
      denominatorUnit,
      description,
      calibers: hasCaliber
        ? normalizeCalibers({ gwpTotal: value, gwpFossil, gwpBiogenic, gwpLuluc })
        : undefined,
    })
  })

  return { total: dataRows.length, valid, errors }
}

/**
 * 执行导入：逐条落库（一次性返回成功 / 失败清单）。
 * - 后台「排放因子库」导入 → `preset`（environment 库）
 * - 前台「我的因子库」导入 → `custom`（组织自建）
 * 导入因子默认**启用**，因子编码由系统生成。
 */
export async function importFactors(payloads: FactorPayload[], source: FactorSource): Promise<FactorBatchResult> {
  const failed: FactorBatchFailure[] = []
  let success = 0

  payloads.forEach((payload) => {
    try {
      assertFactor(payload)
      factorStore = [buildFactorItem({ ...payload, source }), ...factorStore]
      success += 1
    } catch (error) {
      failed.push({
        id: `IMPORT-${failed.length + 1}`,
        code: '-',
        name: payload.name,
        reason: (error instanceof Error ? error.message : '导入失败').replace('保存失败：', ''),
      })
    }
  })

  return request({ success, failed })
}

/* ===================== 因子库（多库模型） ===================== */

/** 同步库 / 库版本 / 我的因子库的统计字段（因子数 / 版本数） */
function syncLibraryStats(): void {
  factorLibraryVersionStore.forEach((version) => {
    version.factorCount = factorStore.filter((item) => item.libraryVersionId === version.id).length
  })
  factorLibraryStore.forEach((library) => {
    const versions = factorLibraryVersionStore.filter((item) => item.libraryId === library.id)
    library.versionCount = versions.length
    const current = library.currentVersionId
      ? versions.find((item) => item.id === library.currentVersionId)
      : undefined
    const display = current ?? versions.find((item) => item.status === 'draft') ?? versions[0]
    library.factorCount = display ? display.factorCount : 0
    library.currentVersionNo = current ? current.versionNo : (display?.versionNo ?? '')
  })
  myFactorLibraryStore.forEach((library) => {
    library.factorCount = myFactorStore.filter((item) => item.libraryId === library.id).length
  })
}

let librarySeq = 0
let versionSeq = 0
let myFactorSeq = 0

function nextLibraryId(): string {
  librarySeq += 1
  return `FLIB${String(Date.now()).slice(-6)}${String(librarySeq).padStart(2, '0')}`
}
function nextVersionId(): string {
  versionSeq += 1
  return `FLV${String(Date.now()).slice(-6)}${String(versionSeq).padStart(2, '0')}`
}
function nextMyFactorId(): string {
  myFactorSeq += 1
  return `MYF${String(Date.now()).slice(-6)}${String(myFactorSeq).padStart(2, '0')}`
}
/** 生成「我的因子」编码：MF-{序号}，按当前组织因子库范围自增 */
function nextMyFactorCode(): string {
  const used = myFactorStore
    .map((item) => Number((/^MF-(\d+)$/.exec(item.code) ?? [])[1] ?? 0))
    .filter((num) => num > 0)
  const max = used.length > 0 ? Math.max(...used) : 0
  return `MF-${String(max + 1).padStart(3, '0')}`
}

/* ---------- 后台：因子库 CRUD ---------- */

export function fetchFactorLibraries(): Promise<FactorLibrary[]> {
  syncLibraryStats()
  return request(clone(factorLibraryStore))
}

export async function fetchFactorLibrary(id: string): Promise<FactorLibrary> {
  syncLibraryStats()
  const target = factorLibraryStore.find((item) => item.id === id)
  if (!target) throw new Error('因子库不存在或已被删除')
  return request(clone(target))
}

export interface FactorLibraryPayload {
  name: string
  type: FactorLibraryType
  description: string
  maintainer: string
}

/** 新建因子库：自动创建一个草稿版本 V1.0（自建库可维护；外部库整库导入） */
export async function createFactorLibrary(payload: FactorLibraryPayload): Promise<FactorLibrary> {
  if (!payload.name.trim()) throw new Error('保存失败：库名称必填')
  const code = `LB-${String(factorLibraryStore.length + 1).padStart(3, '0')}`
  const library: FactorLibrary = {
    id: nextLibraryId(),
    code,
    name: payload.name.trim(),
    type: payload.type,
    description: payload.description.trim(),
    maintainer: payload.maintainer.trim() || '平台运营',
    offline: false,
    currentVersionId: null,
    versionCount: 0,
    factorCount: 0,
    createdBy: '当前用户',
    createdAt: NOW,
    updatedBy: '当前用户',
    updatedAt: NOW,
  }
  const version: FactorLibraryVersion = {
    id: nextVersionId(),
    libraryId: library.id,
    versionNo: 'V1.0',
    year: String(new Date(NOW).getFullYear() || 2025),
    status: 'draft',
    changeNote: '初始版本',
    factorCount: 0,
    createdBy: '当前用户',
    createdAt: NOW,
  }
  factorLibraryStore = [library, ...factorLibraryStore]
  factorLibraryVersionStore = [version, ...factorLibraryVersionStore]
  syncLibraryStats()
  return request(clone(library))
}

export async function updateFactorLibrary(id: string, patch: Partial<FactorLibraryPayload>): Promise<FactorLibrary> {
  const target = factorLibraryStore.find((item) => item.id === id)
  if (!target) throw new Error('因子库不存在或已被删除')
  if (patch.name !== undefined) {
    if (!patch.name.trim()) throw new Error('保存失败：库名称必填')
    target.name = patch.name.trim()
  }
  if (patch.description !== undefined) target.description = patch.description.trim()
  if (patch.maintainer !== undefined) target.maintainer = patch.maintainer.trim() || target.maintainer
  target.updatedBy = '当前用户'
  target.updatedAt = NOW
  return request(clone(target))
}

/**
 * 删除因子库：**已发布过的库须先「整库下架」才可删除**（防止误删线上库；
 * 下架后库已不在前台可见、不参与匹配，历史结果与收藏副本仍可追溯）。
 * 从未发布过的库（无生效中 / 历史版本）可直接删除。
 */
export async function deleteFactorLibrary(id: string): Promise<void> {
  const target = factorLibraryStore.find((item) => item.id === id)
  if (!target) throw new Error('因子库不存在或已被删除')
  const versions = factorLibraryVersionStore.filter((item) => item.libraryId === id)
  const everPublished = !!target.currentVersionId || versions.some((item) => item.status !== 'draft')
  if (everPublished && !target.offline) {
    throw new Error('该库已发布过版本，须先「下架」整库后才可删除')
  }
  const versionIds = new Set(versions.map((item) => item.id))
  factorStore = factorStore.filter((item) => !(item.libraryVersionId && versionIds.has(item.libraryVersionId)))
  factorLibraryVersionStore = factorLibraryVersionStore.filter((item) => item.libraryId !== id)
  factorLibraryStore = factorLibraryStore.filter((item) => item.id !== id)
  await new Promise((resolve) => setTimeout(resolve, 240))
}

/* ---------- 后台：库版本 ---------- */

export function fetchLibraryVersions(libraryId: string): Promise<FactorLibraryVersion[]> {
  syncLibraryStats()
  const list = factorLibraryVersionStore
    .filter((item) => item.libraryId === libraryId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  return request(clone(list))
}

/** 新建库版本：以当前最新版本因子为快照，复制为可编辑草稿 */
export async function createLibraryVersion(
  libraryId: string,
  payload: { versionNo: string; year: string; changeNote: string },
): Promise<FactorLibraryVersion> {
  const library = factorLibraryStore.find((item) => item.id === libraryId)
  if (!library) throw new Error('因子库不存在或已被删除')
  if (!payload.versionNo.trim()) throw new Error('保存失败：版本号必填')
  const duplicated = factorLibraryVersionStore.find(
    (item) => item.libraryId === libraryId && item.versionNo.trim() === payload.versionNo.trim(),
  )
  if (duplicated) throw new Error(`保存失败：版本号「${payload.versionNo.trim()}」已存在，请使用其他版本号`)
  const existingDraft = factorLibraryVersionStore.find(
    (item) => item.libraryId === libraryId && item.status === 'draft',
  )
  if (existingDraft) {
    throw new Error(`已存在草稿版本「${existingDraft.versionNo}」，请先发布或删除该草稿后再新建版本`)
  }
  const versions = factorLibraryVersionStore.filter((item) => item.libraryId === libraryId)
  const base: FactorLibraryVersion | undefined =
    versions.find((item) => item.id === library.currentVersionId) ??
    versions.find((item) => item.status === 'draft') ??
    versions[0]
  const version: FactorLibraryVersion = {
    id: nextVersionId(),
    libraryId,
    versionNo: payload.versionNo.trim(),
    year: payload.year,
    status: 'draft',
    changeNote: payload.changeNote.trim(),
    basedOnVersionNo: base?.versionNo,
    factorCount: 0,
    createdBy: '当前用户',
    createdAt: NOW,
  }
  factorLibraryVersionStore = [version, ...factorLibraryVersionStore]
  // 快照：复制基线版本因子为新草稿
  if (base) {
    const snapshot = factorStore
      .filter((item) => item.libraryVersionId === base.id)
      .map((item) => ({ ...clone(item), id: nextFactorId(), libraryVersionId: version.id }))
    factorStore = [...snapshot, ...factorStore]
  }
  syncLibraryStats()
  return request(clone(version))
}

/**
 * 发布库版本（**软件发版模型**，同一库同时只有一个「生效中」版本）：
 * - **发布新版本**：草稿 → 生效中；同库上一「生效中」版本自动转为「历史版本」；
 * - **回滚**：历史版本 → 生效中（当前生效版本自动转为历史），即直接把历史版本设为生效；
 * - 发布时间拆分：`publishedAt` 仅首次发布时写入（回滚不覆盖），`lastActivatedAt` 每次发布 / 回滚均更新。
 */
export async function publishLibraryVersion(versionId: string): Promise<FactorLibraryVersion> {
  const version = factorLibraryVersionStore.find((item) => item.id === versionId)
  if (!version) throw new Error('版本不存在或已被删除')
  const library = factorLibraryStore.find((item) => item.id === version.libraryId)
  if (!library) throw new Error('因子库不存在或已被删除')
  if (library.offline) throw new Error('该库已「整库下架」，请先「整库上架」后再发布版本')
  // 空在线版本校验：不允许发布空版本，否则前台将出现无有效因子的库（触发 E03 因子缺失）
  const factorCount = factorStore.filter((item) => item.libraryVersionId === version.id).length
  if (factorCount === 0) throw new Error('该版本内容为空，不允许发布空版本（前台将无有效因子可用）')
  // 生效中版本唯一：其余已生效版本（含被新版本替代 / 被回滚替代的）转「历史版本」
  factorLibraryVersionStore.forEach((item) => {
    if (item.libraryId === version.libraryId && item.status === 'published') item.status = 'history'
  })
  version.status = 'published'
  version.publishedBy = '当前用户'
  version.publishedAt = version.publishedAt ?? NOW
  version.lastActivatedAt = NOW
  library.currentVersionId = version.id
  library.updatedBy = '当前用户'
  library.updatedAt = NOW
  syncLibraryStats()
  return request(clone(version))
}

/** 删除库版本：仅草稿可删除 */
export async function deleteLibraryVersion(versionId: string): Promise<void> {
  const version = factorLibraryVersionStore.find((item) => item.id === versionId)
  if (!version) throw new Error('版本不存在或已被删除')
  if (version.status !== 'draft') throw new Error('仅草稿版本可删除（生效中 / 历史版本只读）')
  factorStore = factorStore.filter((item) => item.libraryVersionId !== versionId)
  factorLibraryVersionStore = factorLibraryVersionStore.filter((item) => item.id !== versionId)
  syncLibraryStats()
  await new Promise((resolve) => setTimeout(resolve, 240))
}

/** 整库下架：前台不可见、不参与因子匹配；库数据与版本保留，可随时重新上架 */
export async function offlineFactorLibrary(id: string): Promise<FactorLibrary> {
  const target = factorLibraryStore.find((item) => item.id === id)
  if (!target) throw new Error('因子库不存在或已被删除')
  if (!target.currentVersionId) throw new Error('该库尚无已发布版本，无需下架')
  target.offline = true
  target.updatedBy = '当前用户'
  target.updatedAt = NOW
  return request(clone(target))
}

/** 整库上架：恢复前台可见与参与因子匹配 */
export async function onlineFactorLibrary(id: string): Promise<FactorLibrary> {
  const target = factorLibraryStore.find((item) => item.id === id)
  if (!target) throw new Error('因子库不存在或已被删除')
  if (!target.offline) throw new Error('该库未下架，无需上架')
  target.offline = false
  target.updatedBy = '当前用户'
  target.updatedAt = NOW
  return request(clone(target))
}

/* ---------- 后台：库内因子 ---------- */

export function fetchFactorsByVersion(libraryId: string, versionId: string): Promise<FactorItem[]> {
  syncLibraryStats()
  const list = factorStore
    .filter((item) => item.libraryId === libraryId && item.libraryVersionId === versionId)
    .sort((a, b) => (a.code < b.code ? -1 : 1))
  return request(clone(list))
}

/** 库内因子载荷（与 FactorPayload 同构） */
export type LibraryFactorPayload = FactorPayload

function buildLibraryFactor(
  libraryId: string,
  versionId: string,
  payload: LibraryFactorPayload,
): FactorItem {
  return {
    id: nextFactorId(),
    code: nextFactorCode(),
    name: payload.name.trim(),
    alias: payload.alias.trim(),
    englishName: payload.englishName?.trim() || undefined,
    scenario: payload.scenario.trim(),
    value: payload.value,
    calibers: normalizeCalibers(payload.calibers),
    numeratorUnit: payload.numeratorUnit,
    denominatorUnit: payload.denominatorUnit,
    source: 'preset',
    libraryId,
    libraryVersionId: versionId,
    unitCategory: payload.unitCategory,
    region: payload.region,
    ext: payload.ext,
    exchanges: payload.exchanges,
    description: payload.description.trim(),
    createdBy: '当前用户',
    createdAt: NOW,
    updatedBy: '当前用户',
    updatedAt: NOW,
  }
}

export async function createLibraryFactor(
  libraryId: string,
  versionId: string,
  payload: LibraryFactorPayload,
): Promise<FactorItem> {
  assertFactor(payload)
  const item = buildLibraryFactor(libraryId, versionId, payload)
  factorStore = [item, ...factorStore]
  syncLibraryStats()
  return request(clone(item))
}

export async function updateLibraryFactor(id: string, payload: LibraryFactorPayload): Promise<FactorItem> {
  const target = factorStore.find((item) => item.id === id)
  if (!target) throw new Error('因子不存在或已被删除')
  const ownerLibrary = factorLibraryStore.find((item) => item.id === target.libraryId)
  if (ownerLibrary?.type === 'external') {
    throw new Error('商业数据库因子只读，不支持编辑')
  }
  assertFactor(payload)
  Object.assign(target, buildLibraryFactor(target.libraryId ?? '', target.libraryVersionId ?? '', payload), {
    id: target.id,
    code: target.code,
    libraryId: target.libraryId,
    libraryVersionId: target.libraryVersionId,
    // 未提交的扩展信息保持原值（编辑基础字段时不误清空单位类别 / 地域 / 扩展信息 / 输入输出）
    unitCategory: payload.unitCategory ?? target.unitCategory,
    region: payload.region ?? target.region,
    ext: payload.ext ?? target.ext,
    exchanges: payload.exchanges ?? target.exchanges,
    calibers: payload.calibers !== undefined ? normalizeCalibers(payload.calibers) : target.calibers,
    createdAt: target.createdAt,
    createdBy: target.createdBy,
  })
  syncLibraryStats()
  return request(clone(target))
}

export async function deleteLibraryFactor(id: string): Promise<void> {
  const target = factorStore.find((item) => item.id === id)
  if (!target) throw new Error('因子不存在或已被删除')
  const ownerLibrary = factorLibraryStore.find((item) => item.id === target.libraryId)
  if (ownerLibrary?.type === 'external') {
    throw new Error('商业数据库因子只读，不支持删除')
  }
  factorStore = factorStore.filter((item) => item.id !== id)
  syncLibraryStats()
  await new Promise((resolve) => setTimeout(resolve, 240))
}

/** 整库导入（商业数据库）/ 批量导入（自建库）：逐条落库并返回结果 */
export async function importLibraryFactors(
  libraryId: string,
  versionId: string,
  payloads: LibraryFactorPayload[],
): Promise<FactorBatchResult> {
  const failed: FactorBatchFailure[] = []
  let success = 0
  payloads.forEach((payload) => {
    try {
      assertFactor(payload)
      factorStore = [buildLibraryFactor(libraryId, versionId, payload), ...factorStore]
      success += 1
    } catch (error) {
      failed.push({
        id: `IMPORT-${failed.length + 1}`,
        code: '-',
        name: payload.name,
        reason: (error instanceof Error ? error.message : '导入失败').replace('保存失败：', ''),
      })
    }
  })
  syncLibraryStats()
  return request({ success, failed })
}

/* ---------- 前台：已发布库预览 ---------- */

/** 已发布库列表（有当前发布版本**且未整库下架**的库） */
export function fetchPublishedLibraries(): Promise<FactorLibrary[]> {
  syncLibraryStats()
  return request(clone(factorLibraryStore.filter((item) => !!item.currentVersionId && !item.offline)))
}

export interface PublishedLibraryDetail {
  library: FactorLibrary
  /** 可见版本：生效中 + 历史版本（不含草稿） */
  versions: FactorLibraryVersion[]
  factors: FactorItem[]
  /** 当前展示的版本 id */
  activeVersionId: string
}

/** 已发布库详情：默认展示当前生效版本，可切换历史（history）版本 */
export async function fetchPublishedLibraryDetail(
  id: string,
  versionId?: string,
): Promise<PublishedLibraryDetail> {
  syncLibraryStats()
  const library = factorLibraryStore.find((item) => item.id === id)
  if (!library || !library.currentVersionId) throw new Error('该因子库尚未发布或已被删除')
  if (library.offline) throw new Error('该因子库已下架，暂不可用')
  const versions = factorLibraryVersionStore
    .filter((item) => item.libraryId === id && item.status !== 'draft')
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  const activeVersionId = versionId && versions.some((item) => item.id === versionId)
    ? versionId
    : library.currentVersionId
  const factors = factorStore
    .filter((item) => item.libraryVersionId === activeVersionId)
    .sort((a, b) => (a.code < b.code ? -1 : 1))
  return request(clone({ library, versions, factors, activeVersionId }))
}

/* ---------- 前台：我的因子库 ---------- */

export function fetchMyFactorLibraries(): Promise<MyFactorLibrary[]> {
  syncLibraryStats()
  return request(clone(myFactorLibraryStore))
}

export async function fetchMyFactorLibrary(id: string): Promise<MyFactorLibrary> {
  syncLibraryStats()
  const target = myFactorLibraryStore.find((item) => item.id === id)
  if (!target) throw new Error('我的因子库不存在或已被删除')
  return request(clone(target))
}

export async function createMyFactorLibrary(name: string, description = ''): Promise<MyFactorLibrary> {
  if (!name.trim()) throw new Error('保存失败：库名称必填')
  const item: MyFactorLibrary = {
    id: `MFL${String(Date.now()).slice(-6)}`,
    name: name.trim(),
    description: description.trim(),
    factorCount: 0,
    createdBy: '当前用户',
    createdAt: NOW,
    updatedBy: '当前用户',
    updatedAt: NOW,
  }
  myFactorLibraryStore = [item, ...myFactorLibraryStore]
  syncLibraryStats()
  return request(clone(item))
}

export async function updateMyFactorLibrary(
  id: string,
  patch: { name?: string; description?: string },
): Promise<MyFactorLibrary> {
  const target = myFactorLibraryStore.find((item) => item.id === id)
  if (!target) throw new Error('我的因子库不存在或已被删除')
  if (patch.name !== undefined) {
    if (!patch.name.trim()) throw new Error('保存失败：库名称必填')
    target.name = patch.name.trim()
  }
  if (patch.description !== undefined) target.description = patch.description.trim()
  target.updatedBy = '当前用户'
  target.updatedAt = NOW
  return request(clone(target))
}

export async function deleteMyFactorLibrary(id: string): Promise<void> {
  const target = myFactorLibraryStore.find((item) => item.id === id)
  if (!target) throw new Error('我的因子库不存在或已被删除')
  myFactorStore = myFactorStore.filter((item) => item.libraryId !== id)
  myFactorLibraryStore = myFactorLibraryStore.filter((item) => item.id !== id)
  await new Promise((resolve) => setTimeout(resolve, 240))
}

/** 计算「收藏副本」是否可更新：源库当前发布版本中存在同编码因子且数值不同 */
function isMyFactorUpdatable(item: MyFactor): boolean {
  if (item.origin !== 'collected' || !item.sourceLibraryId || !item.sourceFactorCode) return false
  const library = factorLibraryStore.find((lib) => lib.id === item.sourceLibraryId)
  if (!library || !library.currentVersionId || library.offline) return false
  if (library.currentVersionId === item.sourceVersionId) return false
  const latest = factorStore.find(
    (f) => f.libraryVersionId === library.currentVersionId && f.code === item.sourceFactorCode,
  )
  return !!latest && latest.value !== item.value
}

/**
 * 收藏副本的「来源状态」：
 * - `ok` 正常；
 * - `offline` 来源库已下架（前台不可见），副本停留在快照值；
 * - `removed` 来源库最新版本中该因子已被移除（或来源库已不存在）。
 */
function resolveMyFactorSourceStatus(item: MyFactor): 'ok' | 'offline' | 'removed' {
  if (item.origin !== 'collected' || !item.sourceLibraryId || !item.sourceFactorCode) return 'ok'
  const library = factorLibraryStore.find((lib) => lib.id === item.sourceLibraryId)
  if (!library || !library.currentVersionId) return 'removed'
  if (library.offline) return 'offline'
  const latest = factorStore.find(
    (f) => f.libraryVersionId === library.currentVersionId && f.code === item.sourceFactorCode,
  )
  return latest ? 'ok' : 'removed'
}

/** 我的因子列表（附「有新版本可更新」与「来源状态」实时判定） */
export function fetchMyFactors(libraryId: string): Promise<MyFactor[]> {
  syncLibraryStats()
  const list = myFactorStore
    .filter((item) => item.libraryId === libraryId)
    .map((item) => {
      const cloned = clone(item)
      cloned.updateAvailable = isMyFactorUpdatable(item)
      cloned.sourceStatus = resolveMyFactorSourceStatus(item)
      return cloned
    })
    .sort((a, b) => (a.code < b.code ? -1 : 1))
  return request(list)
}

export async function fetchMyFactor(id: string): Promise<MyFactor> {
  const target = myFactorStore.find((item) => item.id === id)
  if (!target) throw new Error('因子不存在或已被删除')
  const cloned = clone(target)
  cloned.updateAvailable = isMyFactorUpdatable(target)
  cloned.sourceStatus = resolveMyFactorSourceStatus(target)
  return request(cloned)
}

function buildManualMyFactor(libraryId: string, payload: FactorPayload): MyFactor {
  return {
    id: nextMyFactorId(),
    code: nextMyFactorCode(),
    name: payload.name.trim(),
    alias: payload.alias.trim(),
    englishName: payload.englishName?.trim() || undefined,
    scenario: payload.scenario.trim(),
    value: payload.value,
    calibers: normalizeCalibers(payload.calibers),
    numeratorUnit: payload.numeratorUnit,
    denominatorUnit: payload.denominatorUnit,
    unitCategory: payload.unitCategory,
    region: payload.region,
    ext: payload.ext,
    exchanges: payload.exchanges,
    source: 'custom',
    libraryId,
    origin: 'manual',
    description: payload.description.trim(),
    createdBy: '当前用户',
    createdAt: NOW,
    updatedBy: '当前用户',
    updatedAt: NOW,
  }
}

export async function createMyFactor(libraryId: string, payload: FactorPayload): Promise<MyFactor> {
  assertFactor(payload)
  const item = buildManualMyFactor(libraryId, payload)
  myFactorStore = [item, ...myFactorStore]
  syncLibraryStats()
  return request(clone(item))
}

export async function updateMyFactor(id: string, payload: FactorPayload): Promise<MyFactor> {
  const target = myFactorStore.find((item) => item.id === id)
  if (!target) throw new Error('因子不存在或已被删除')
  assertFactor(payload)
  Object.assign(target, buildManualMyFactor(target.libraryId, payload), {
    id: target.id,
    code: target.code,
    origin: target.origin,
    sourceLibraryId: target.sourceLibraryId,
    sourceLibraryName: target.sourceLibraryName,
    sourceVersionId: target.sourceVersionId,
    sourceVersionNo: target.sourceVersionNo,
    sourceFactorId: target.sourceFactorId,
    sourceFactorCode: target.sourceFactorCode,
    libraryId: target.libraryId,
    unitCategory: payload.unitCategory ?? target.unitCategory,
    region: payload.region ?? target.region,
    ext: payload.ext ?? target.ext,
    exchanges: payload.exchanges ?? target.exchanges,
    calibers: payload.calibers !== undefined ? normalizeCalibers(payload.calibers) : target.calibers,
    createdAt: target.createdAt,
    createdBy: target.createdBy,
  })
  target.updateAvailable = isMyFactorUpdatable(target)
  return request(clone(target))
}

export async function deleteMyFactor(id: string): Promise<void> {
  const target = myFactorStore.find((item) => item.id === id)
  if (!target) throw new Error('因子不存在或已被删除')
  myFactorStore = myFactorStore.filter((item) => item.id !== id)
  syncLibraryStats()
  await new Promise((resolve) => setTimeout(resolve, 240))
}

/**
 * 收藏：把已发布库中的因子**复制**为「我的因子库」中的独立副本（复制式快照）。
 * 跳过规则：源版本不存在 / 目标库不存在 / 同库内已收藏同一源因子（重复收藏）。
 */
export async function collectFactorsToLibrary(
  sourceVersionId: string,
  factorIds: string[],
  targetLibraryId: string,
): Promise<FactorBatchResult> {
  const failed: FactorBatchFailure[] = []
  let success = 0
  const targetLibrary = myFactorLibraryStore.find((item) => item.id === targetLibraryId)
  if (!targetLibrary) throw new Error('请选择「我的因子库」作为收藏目标')

  factorIds.forEach((id) => {
    const factor = factorStore.find((item) => item.id === id)
    if (!factor) {
      failed.push({ id, code: '-', name: '-', reason: '因子不存在或已被删除' })
      return
    }
    if (factor.libraryVersionId !== sourceVersionId) {
      failed.push({ id: factor.id, code: factor.code, name: factor.name, reason: '因子不属于所选发布版本' })
      return
    }
    const duplicated = myFactorStore.some(
      (item) => item.libraryId === targetLibraryId && item.sourceFactorId === factor.id,
    )
    if (duplicated) {
      failed.push({ id: factor.id, code: factor.code, name: factor.name, reason: '该因子已收藏，请勿重复收藏' })
      return
    }
    const sourceVersion = factorLibraryVersionStore.find((item) => item.id === sourceVersionId)
    const sourceLibrary = factorLibraryStore.find((item) => item.id === factor.libraryId)
    const copy: MyFactor = {
      ...clone(factor),
      id: nextMyFactorId(),
      code: nextMyFactorCode(),
      libraryId: targetLibraryId,
      libraryVersionId: undefined,
      origin: 'collected',
      source: 'custom',
      sourceLibraryId: sourceLibrary?.id,
      sourceLibraryName: sourceLibrary?.name,
      sourceVersionId,
      sourceVersionNo: sourceVersion?.versionNo,
      sourceFactorId: factor.id,
      sourceFactorCode: factor.code,
      updateAvailable: false,
      createdBy: '当前用户',
      createdAt: NOW,
      updatedBy: '当前用户',
      updatedAt: NOW,
    }
    myFactorStore = [copy, ...myFactorStore]
    success += 1
  })

  syncLibraryStats()
  return request({ success, failed })
}

/** 查询某「已发布库因子」的收藏状态（详情页五角星：已收藏 / 未收藏） */
export function fetchFactorCollectState(
  sourceFactorId: string,
): Promise<{ collected: boolean; myFactorId?: string }> {
  const found = myFactorStore.find((item) => item.sourceFactorId === sourceFactorId)
  return request({ collected: !!found, myFactorId: found?.id })
}

/** 一键更新收藏副本：以源库当前发布版本的因子值刷新副本 */
export async function refreshMyFactorFromSource(id: string): Promise<MyFactor> {
  const target = myFactorStore.find((item) => item.id === id)
  if (!target) throw new Error('因子不存在或已被删除')
  if (target.origin !== 'collected' || !target.sourceLibraryId || !target.sourceFactorCode) {
    throw new Error('仅收藏副本支持按源库更新')
  }
  const library = factorLibraryStore.find((item) => item.id === target.sourceLibraryId)
  if (!library || !library.currentVersionId) throw new Error('源库当前无已发布版本')
  const latest = factorStore.find(
    (f) => f.libraryVersionId === library.currentVersionId && f.code === target.sourceFactorCode,
  )
  if (!latest) throw new Error('源库最新版本中未找到该因子')
  const sourceVersion = factorLibraryVersionStore.find((item) => item.id === library.currentVersionId)
  target.value = latest.value
  target.numeratorUnit = latest.numeratorUnit
  target.denominatorUnit = latest.denominatorUnit
  target.name = latest.name
  target.alias = latest.alias
  target.ext = latest.ext
  target.exchanges = latest.exchanges
  target.sourceVersionId = library.currentVersionId
  target.sourceVersionNo = sourceVersion?.versionNo
  target.updateAvailable = false
  target.updatedBy = '当前用户'
  target.updatedAt = NOW
  return request(clone(target))
}

/** 一键更新：批量刷新某「我的因子库」内所有可更新的收藏副本 */
export async function refreshAllMyFactors(libraryId: string): Promise<FactorBatchResult> {
  const failed: FactorBatchFailure[] = []
  let success = 0
  const candidates = myFactorStore.filter((item) => item.libraryId === libraryId && isMyFactorUpdatable(item))
  for (const item of candidates) {
    try {
      await refreshMyFactorFromSource(item.id)
      success += 1
    } catch (error) {
      failed.push({
        id: item.id,
        code: item.code,
        name: item.name,
        reason: error instanceof Error ? error.message : '更新失败',
      })
    }
  }
  return request({ success, failed })
}

/* ===================== 计算引擎配置（核算模型 A2-3） ===================== */

/** 公式描述长度上限（≤1000 字符） */
export const CALC_FORMULA_DESCRIPTION_MAX = 1000

const SNAKE_CASE_RE = /^[a-z][a-z0-9_]*$/

/** 表达式允许的运算字符：数字、`+ - * /`、`( )`、`[ ]`、百分号、小数点 */
const EXPRESSION_ALLOWED_RE = /[0-9+\-*/().[\]%\s]/g

/** 按名称长度降序排序（避免「排放因子」与「排放因子值」这类子串误匹配） */
const sortByNameLength = (names: string[]) => [...names].filter(Boolean).sort((a, b) => b.length - a.length)

/**
 * 计算公式校验：
 * 表达式只能由**已定义的数据因素名称**、数字与 `+ - * / ( ) [ ] %` 组成，不支持脚本。
 */
export function validateFormulaExpression(expression: string, factorNames: string[]): string {
  const text = expression.trim()
  if (!text) return '计算公式不能为空，请点击「配置」点选数据因素与运算符'

  let rest = text
  sortByNameLength(factorNames).forEach((name) => {
    rest = rest.split(name).join('')
  })
  const illegal = rest.replace(EXPRESSION_ALLOWED_RE, '')
  if (illegal) {
    return `计算公式含未定义内容「${illegal}」；只能使用数据因素与 + - * / ( ) [ ] % 运算符`
  }

  let depth = 0
  for (const char of text) {
    if (char === '(' || char === '[') depth += 1
    else if (char === ')' || char === ']') depth -= 1
    if (depth < 0) return '计算公式的括号不匹配'
  }
  if (depth !== 0) return '计算公式的括号不匹配'
  return ''
}

/**
 * 将「数据因素名称 + 运算符」的计算公式转换为可求值的数值表达式（供试算）：
 * 因素名称替换为样例数值，`[ ]` 视为分组括号，`数字%` 视为百分比。
 */
export function buildNumericExpression(
  expression: string,
  factorNames: string[],
  values: Record<string, number | number[]>,
): string {
  let text = expression
  sortByNameLength(factorNames).forEach((name) => {
    const value = values[name]
    let literal: string
    if (Array.isArray(value)) literal = value.length > 0 ? `(${value.join('+')})` : '(0)'
    else {
      const num = Number(value)
      literal = `(${Number.isFinite(num) ? num : 0})`
    }
    text = text.split(name).join(literal)
  })
  return text
    .replace(/\[/g, '(')
    .replace(/\]/g, ')')
    .replace(/(\d+(?:\.\d+)?)\s*%/g, '($1/100)')
}

/** 生成公式编码：`FM-{序号}`（三位补零） */
function nextCalcFormulaCode(): string {
  const used = calcFormulaStore
    .map((item) => Number((/^FM-(\d+)$/.exec(item.code) ?? [])[1] ?? 0))
    .filter((num) => num > 0)
  const max = used.length > 0 ? Math.max(...used) : 0
  return `FM-${String(max + 1).padStart(3, '0')}`
}

/* ---------- 公式库：载荷与校验 ---------- */

export interface CalcFormulaPayload {
  name: string
  formulaType: FormulaType
  expression: string
  resultName: string
  resultUnit: string
  supportsSumLoop: boolean
  supportsNegativeResult: boolean
  dataOwnerType: DataOwnerType
  description: string
  /** 数据因素（活动数据 / 自定义变量 / 业务库取值 / 常量） */
  factors: FormulaFactor[]
}

/**
 * 公式校验（对齐竞品「算法配置」口径）：
 * 数据因素名称必填且不重复；常量类必须有常量值；活动数据 / 变量 / 因子仅作运行时占位，无需维护单位与因子值；
 * 计算公式只能由数据因素与 `+ - * / ( ) [ ] %` 组成。
 */
function assertCalcFormula(payload: CalcFormulaPayload): void {
  if (!payload.name.trim()) throw new Error('保存失败：公式名称必填')
  if (!payload.formulaType) throw new Error('保存失败：公式类型必填')
  if (!payload.resultName.trim()) throw new Error('保存失败：结果名称必填')
  if (!payload.resultUnit) throw new Error('保存失败：结果单位必填')
  if (payload.factors.length === 0) throw new Error('保存失败：请至少添加一个数据因素')

  const names = payload.factors.map((item) => item.name.trim())
  if (names.some((name) => !name)) throw new Error('保存失败：存在未命名的数据因素')
  if (new Set(names).size !== names.length) throw new Error('保存失败：数据因素名称不得重复')

  payload.factors.forEach((item) => {
    // 活动数据 / 变量 / 因子仅作运行时占位（因子数值与单位在建模绑定后按因子库带出），此处只校验常量必须填值
    if (item.sourceType === 'constant' && !item.value.trim()) {
      throw new Error(`保存失败：常量因素「${item.name}」必须填写常量值`)
    }
  })

  const expressionError = validateFormulaExpression(payload.expression, names)
  if (expressionError) throw new Error(`保存失败：${expressionError}`)

  if (payload.description.length > CALC_FORMULA_DESCRIPTION_MAX) {
    throw new Error(`保存失败：公式说明最长 ${CALC_FORMULA_DESCRIPTION_MAX} 字符`)
  }
}

/** 公式列表：公式配置（不做审核流程、不做版本化） */
export function fetchCalcFormulas(): Promise<CalcFormula[]> {
  return request(calcFormulaStore)
}

export function fetchCalcFormula(id: string): Promise<CalcFormula> {
  const target = calcFormulaStore.find((item) => item.id === id)
  if (!target) throw new Error('公式不存在或已被删除')
  return request(target)
}

export async function createCalcFormula(payload: CalcFormulaPayload): Promise<CalcFormula> {
  assertCalcFormula(payload)
  const item: CalcFormula = {
    id: `FMC${Date.now().toString().slice(-6)}`,
    code: nextCalcFormulaCode(),
    name: payload.name.trim(),
    formulaType: payload.formulaType,
    expression: payload.expression.trim(),
    resultName: payload.resultName.trim(),
    resultUnit: payload.resultUnit,
    supportsSumLoop: payload.supportsSumLoop,
    supportsNegativeResult: payload.supportsNegativeResult,
    dataOwnerType: payload.dataOwnerType,
    ownerOrg: '空天碳示范组织',
    // 新增默认启用；使用状态不进表单，走行操作
    status: 'enabled',
    description: payload.description.trim(),
    factors: clone(payload.factors),
    createdBy: '当前用户',
    createdAt: NOW,
    updatedBy: '当前用户',
    updatedAt: NOW,
  }
  calcFormulaStore = [item, ...calcFormulaStore]
  return request(item)
}

/**
 * 编辑：**轻量配置对象，不做版本化与审核**，直接覆盖（口径对齐物料库 / 能源库）；
 * 变更不追溯已参与计算的历史结果，需按新口径重算时走 E13。
 */
export async function updateCalcFormula(id: string, payload: CalcFormulaPayload): Promise<CalcFormula> {
  const target = calcFormulaStore.find((item) => item.id === id)
  if (!target) throw new Error('公式不存在或已被删除')
  assertCalcFormula(payload)

  target.name = payload.name.trim()
  target.formulaType = payload.formulaType
  target.expression = payload.expression.trim()
  target.resultName = payload.resultName.trim()
  target.resultUnit = payload.resultUnit
  target.supportsSumLoop = payload.supportsSumLoop
  target.supportsNegativeResult = payload.supportsNegativeResult
  target.dataOwnerType = payload.dataOwnerType
  target.description = payload.description.trim()
  target.factors = clone(payload.factors)
  target.updatedBy = '当前用户'
  target.updatedAt = NOW
  return request(target)
}

/** 启用 / 禁用：双向可达；禁用后不进明细行候选（历史绑定保留） */
export async function updateCalcFormulaStatus(id: string, status: EnableStatus): Promise<CalcFormula> {
  const target = calcFormulaStore.find((item) => item.id === id)
  if (!target) throw new Error('公式不存在或已被删除')
  target.status = status
  target.updatedBy = '当前用户'
  target.updatedAt = NOW
  return request(target)
}

/** 删除：**仅「已禁用」的公式可删除**（与基础库口径一致；建模侧的绑定由建模模块校验） */
export async function deleteCalcFormula(id: string): Promise<void> {
  const target = calcFormulaStore.find((item) => item.id === id)
  if (!target) throw new Error('公式不存在或已被删除')
  if (target.status === 'enabled') throw new Error('请先禁用该公式，再执行删除（启用中的公式不可删除）')
  calcFormulaStore = calcFormulaStore.filter((item) => item.id !== id)
  await new Promise((resolve) => setTimeout(resolve, 260))
}

/* ---------- 计算公式：表单下拉选项 ---------- */

/* ===================== 产品碳足迹 · 核算项目（P17 / P18） ===================== */

/** 项目备注长度上限（《核算项目字段清单》§4 备注） */
export const PCF_PROJECT_REMARK_MAX = 200

/**
 * 步骤①「目标与范围」可编辑状态（2026-10-16）：
 * 核算完成（`done`）后**步骤①数据锁定不可修改**，故 `done` / 历史报告态不在其列。
 * 步骤②「产品建模」仍可编辑（走 `savePcfStageData`，见 `PCF_REVERT_STATUSES`）。
 */
const PCF_EDITABLE_STATUS: PcfProjectStatus[] = [
  'new',
  'ongoing',
  'toCheck',
  'toCalc',
  'calcFailed',
  'calculated',
]

/**
 * 需「编辑即回退重跑」的状态（2026-10-16）：
 * 检测 / 核算环节已进行后（含核算完成 `done`），一旦回改数据，即回退「待检测」currentStep=3，
 * 需重走 一键检测 → 核算（历史结果版本保留）；前端在保存前弹出「数据变更」提示。
 */
const PCF_REVERT_STATUSES: PcfProjectStatus[] = [
  'toCheck',
  'toCalc',
  'calculating',
  'calcFailed',
  'calculated',
  'done',
]

/**
 * 步骤口径（V0.4）：②「模型与数据」已合并原「生命周期模型 / 分配场景 / 数据填报」，共 6 步。
 * 项目种子数据直接采用新口径（1~6），不再需要运行时迁移映射。
 */

let pcfProjectStore: PcfProject[] = clone(pcfProjectSeed)

/** 组织选项（引用组织架构 P01） */
export function fetchPcfOrgOptions(): Promise<PcfOrgOption[]> {
  return request(pcfOrgOptionSeed, 120)
}

/**
 * 当前登录用户归属组织（原型模拟）。
 * 核算主体组织**不由用户手选**，默认取当前用户所属组织，作为项目数据归属与数据权限锚点。
 */
export function fetchPcfCurrentUserOrg(): Promise<PcfOrgOption> {
  return request(pcfOrgOptionSeed[1], 80)
}

/** 产品选项（**动态派生自后台产品信息库 `productStore`**；仅「上架」产品可选） */
export function fetchPcfProductOptions(): Promise<PcfProductOption[]> {
  return request(
    productStore
      .filter((item) => item.useStatus === 'on')
      .map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        model: item.model,
        spec: item.spec,
        unit: item.unit,
        category: categoryStore.find((c) => c.id === item.categoryId)?.name ?? '-',
        categoryId: item.categoryId,
        industry: item.industry,
        imageUrl: item.imageUrl,
        version: 'V1.0',
        useStatus: item.useStatus,
      })),
    120,
  )
}

/**
 * 前台核算可选产品（**我的产品库**：组织自建 + 引用平台产品；仅「上架」可选）。
 * 业务规则（2026-09-29 裁定）：前台「新增产品」仅允许选择我的产品库列表中的产品，
 * 平台产品库产品须先在前台「我的产品库」引用后方可进入核算候选。
 */
export interface PcfMyProductOption extends PcfProductOption {
  /** 产品来源：自己新增（custom）/ 引用平台产品（referenced） */
  source: MyProductSource
}

export function fetchPcfMyProductOptions(): Promise<PcfMyProductOption[]> {
  // 自建与引用副本统一作为核算可选产品（仅上架可选）
  return request(
    myProductStore
      .filter((item) => item.useStatus === 'on')
      .map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        model: item.model,
        spec: item.spec,
        unit: item.unit,
        category: categoryStore.find((c) => c.id === item.categoryId)?.name ?? '-',
        categoryId: item.categoryId,
        industry: item.industry,
        imageUrl: item.imageUrl,
        version: 'V1.0',
        useStatus: item.useStatus,
        source: item.source,
      })),
    120,
  )
}

/**
 * 列表：核算项目（默认按更新时间倒序，R-013）。
 * 附带**最近一次核算结果**的「总碳排放量 / 核算时间」投影，供列表「碳排放量（总值）」「核算时间」列展示。
 */
export function fetchPcfProjects(): Promise<PcfProject[]> {
  return request(
    [...pcfProjectStore]
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
      .map((item) => {
        const latest = pcfCalcResultStore
          .filter((result) => result.projectId === item.id)
          .sort((a, b) => b.version - a.version)[0]
        return {
          ...clone(item),
          totalEmission: latest ? latest.totalEmission : null,
          calculatedAt: latest ? latest.calculatedAt : '',
        }
      }),
  )
}

/** 产品维度分组条目（核算列表第一层：一个产品多条核算记录） */
export interface PcfProjectGroupItem {
  productId: string
  productCode: string
  productName: string
  productModel: string
  productSpec: string
  productCategory: string
  productIndustry: string
  productUnit: string
  imageUrl: string
  useStatus: ProductUseStatus
  createdBy: string
  createdAt: string
  /** 该产品的核算记录数 */
  projectCount: number
  /** 最近一次核算的更新时间 */
  lastUpdatedAt: string
}

/**
 * 产品维度分组列表（核算列表第一层）：
 * 覆盖「上架产品 + 已有核算记录的产品」，按最近核算时间倒序。
 */
export function fetchPcfProjectGroups(): Promise<PcfProjectGroupItem[]> {
  // 分组口径：平台产品库 + 我的产品库（组织自建）合并；引用平台产品不重复计入（id 与平台产品一致）
  const items: PcfProjectGroupItem[] = [...productStore, ...myProductStore]
    .filter((p) => p.useStatus === 'on' || pcfProjectStore.some((pj) => pj.refProductId === p.id))
    .map((p) => {
      const projects = pcfProjectStore
        .filter((pj) => pj.refProductId === p.id)
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
      return {
        productId: p.id,
        productCode: p.code,
        productName: p.name,
        productModel: p.model,
        productSpec: p.spec,
        productCategory: categoryStore.find((c) => c.id === p.categoryId)?.name ?? '-',
        productIndustry: p.industry,
        productUnit: p.unit,
        imageUrl: p.imageUrl,
        useStatus: p.useStatus,
        createdBy: p.createdBy,
        createdAt: p.createdAt,
        projectCount: projects.length,
        lastUpdatedAt: projects[0]?.updatedAt ?? p.updatedAt,
      }
    })
    .sort((a, b) => (a.lastUpdatedAt < b.lastUpdatedAt ? 1 : -1))
  return request(items)
}

/** 某产品的全部核算记录（按更新时间倒序） */
export function fetchPcfProjectsByProduct(productId: string): Promise<PcfProject[]> {
  return request(
    pcfProjectStore
      .filter((item) => item.refProductId === productId)
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
  )
}

/** 单条：核算项目（工作台用） */
export async function fetchPcfProject(id: string): Promise<PcfProject> {
  const target = pcfProjectStore.find((item) => item.id === id)
  if (!target) throw new Error('项目不存在或已被删除')
  return request(target)
}

export interface PcfProjectPayload {
  name: string
  ownerOrg: string
  /** 统计时间（起止）：**V0.5 由原「核算年度 + 核算周期」合并** */
  startDate: string
  endDate: string
  boundary: PcfBoundary
  remark: string
  productSource?: PcfProductSource
  refProductId?: string | null
  productCode?: string
  productName?: string
  productModel?: string
  productSpec?: string
  /** 产品图片（**必填**；引用产品时带出快照） */
  productImageUrl?: string
  productCategory?: string
  productIndustry?: string
  functionalUnit?: string
  /** 声明/功能单位数值（文本框录入） */
  functionalUnitValue?: number | string | null
  /** 转换系数（功能单位 / 声明单位 ↔ 产品单位；默认 1 = 与产品单位一致） */
  conversionFactor?: number | null
  conversionUnit?: string
  convertedUnit?: string
}

/** 生成项目编号：`PCF-YYYYMMDD-NNN`，全局唯一、同一天内序号连续（R-001） */
function nextPcfProjectCode(): string {
  const stamp = NOW.slice(0, 10).replace(/-/g, '')
  const prefix = `PCF-${stamp}-`
  const used = pcfProjectStore
    .filter((item) => item.code.startsWith(prefix))
    .map((item) => Number(item.code.slice(prefix.length)))
    .filter((num) => Number.isInteger(num) && num > 0)
  const max = used.length > 0 ? Math.max(...used) : 0
  return `${prefix}${String(max + 1).padStart(3, '0')}`
}

/** 核算项目校验（R-001 名称必填 / R-003 模型启用态 / 备注长度） */
function assertPcfProject(payload: PcfProjectPayload): void {
  if (!payload.name.trim()) throw new Error('保存失败：项目名称必填')
  if (!payload.ownerOrg) throw new Error('保存失败：核算主体组织必填')
  if (!payload.startDate || !payload.endDate) throw new Error('保存失败：统计时间必填')
  if (payload.startDate > payload.endDate) throw new Error('保存失败：统计时间起始不能晚于结束')
  if (!payload.boundary) throw new Error('保存失败：核算边界必填')
  if (payload.remark.length > PCF_PROJECT_REMARK_MAX) {
    throw new Error(`保存失败：备注最长 ${PCF_PROJECT_REMARK_MAX} 字符`)
  }
}
/**
 * 新建核算项目：**必须先选择产品库中「上架」产品**（一个产品可多次核算），
 * 生成编号 + 按「引用即复制」写入产品快照（R-004），
 * 保存成功后进入工作台步骤①（状态转「进行中」，R-002 一项目一边界创建后不可改）。
 */
export async function createPcfProject(payload: PcfProjectPayload): Promise<PcfProject> {
  assertPcfProject(payload)

  // 引用产品**可选**：未引用时由用户自行录入产品信息
  const product = payload.refProductId
    ? productStore.find((item) => item.id === payload.refProductId) ??
      myProductStore.find((item) => item.id === payload.refProductId)
    : undefined
  if (payload.refProductId && !product) throw new Error('保存失败：所选产品不存在或已被删除')
  if (product && product.useStatus !== 'on') throw new Error('保存失败：所选产品已下架，请重新选择')

  // 按系统边界 + 行业带出默认生命周期阶段（默认全部纳入，新建即生效，步骤② 据此对齐展示）
  const lifecycleStages: PcfLifecycleStage[] = lifecycleStore
    .filter(
      (s) =>
        s.status === 'enabled' &&
        (s.boundaries.length === 0 || s.boundaries.includes(payload.boundary)),
    )
    .sort((a, b) => a.order - b.order)
    .map((s) => ({
      id: s.id,
      name: s.name,
      level: s.level,
      parentName: '',
      custom: false,
      description: s.description,
      included: true,
    }))

  const item: PcfProject = {
    id: `PJ${Date.now().toString().slice(-6)}`,
    code: nextPcfProjectCode(),
    name: payload.name.trim(),
    ownerOrg: payload.ownerOrg,
    startDate: payload.startDate,
    endDate: payload.endDate,
    productSource:
      payload.productSource ?? (product && productStore.some((item) => item.id === product.id) ? 'library' : 'custom'),
    refProductId: product?.id ?? null,
    productCode: product?.code ?? payload.productCode ?? '',
    productName: (product?.name ?? payload.productName ?? '').trim(),
    productModel: product?.model ?? payload.productModel ?? '',
    productSpec: product?.spec ?? payload.productSpec ?? '',
    productCategory:
      product != null
        ? categoryStore.find((c) => c.id === product.categoryId)?.name ?? ''
        : payload.productCategory ?? '',
    productIndustry: product?.industry ?? payload.productIndustry ?? '',
    productVersion: 'V1.0',
    functionalUnit: payload.functionalUnit ?? product?.unit ?? '',
    functionalUnitValue: payload.functionalUnitValue ?? 1,
    conversionFactor: payload.conversionFactor ?? 1,
    conversionUnit: payload.conversionUnit ?? '',
    convertedUnit: payload.convertedUnit ?? '',
    lifecycleStages,
    boundary: payload.boundary,
    currentStep: 1,
    status: 'ongoing',
    remark: payload.remark.trim(),
    createdBy: '当前用户',
    createdAt: NOW,
    updatedAt: NOW,
  }
  pcfProjectStore = [item, ...pcfProjectStore]
  return request(item)
}

/**
 * 删除：**任意状态均可删除**（物理删除、记录消失、不可恢复）。
 * 已移除「作废」与「归档」状态，取消 / 清理项目统一走删除。
 */
export async function deletePcfProject(id: string): Promise<void> {
  const target = pcfProjectStore.find((item) => item.id === id)
  if (!target) throw new Error('项目不存在或已被删除')
  pcfProjectStore = pcfProjectStore.filter((item) => item.id !== id)
  await new Promise((resolve) => setTimeout(resolve, 260))
}

/**
 * 复制核算项目（2026-10-16）：以既有核算记录为模板**复制**出一条新记录，
 * 带出原项目的目标与范围 + 步骤②建模数据（阶段数据项 / 过程节点），
 * 新记录状态置「进行中」、可自由编辑修改（核算结果不复制，需重新检测 → 核算）。
 */
export async function copyPcfProject(id: string): Promise<PcfProject> {
  const source = pcfProjectStore.find((item) => item.id === id)
  if (!source) throw new Error('项目不存在或已被删除')

  const newId = `PJ${Date.now().toString().slice(-6)}`
  const hasStageData = pcfStageDataStore.some((item) => item.projectId === id)
  const copy: PcfProject = {
    ...clone(source),
    id: newId,
    code: nextPcfProjectCode(),
    name: `${source.name}（副本）`,
    status: 'ongoing',
    // 原项目已完成步骤①（且可能带出步骤②建模数据）→ 新记录从步骤②起，
    // 否则从步骤①起；避免复制后步骤②之后的步骤被锁死无法继续。
    currentStep: hasStageData ? 2 : 1,
    createdBy: '当前用户',
    createdAt: NOW,
    updatedAt: NOW,
    totalEmission: null,
    calculatedAt: '',
  }
  pcfProjectStore = [copy, ...pcfProjectStore]

  // 复制步骤②建模数据（阶段数据项 + 过程节点），新项目可在此基础上继续编辑
  pcfStageDataStore = [
    ...pcfStageDataStore,
    ...pcfStageDataStore
      .filter((item) => item.projectId === id)
      .map((item) => ({ ...clone(item), projectId: newId })),
  ]
  pcfProcessNodeStore = [
    ...pcfProcessNodeStore,
    ...pcfProcessNodeStore
      .filter((item) => item.projectId === id)
      .map((item) => ({ ...clone(item), projectId: newId })),
  ]

  return request(copy)
}

/* ---------- 步骤② 产品建模：生命周期阶段数据项 ---------- */

let pcfStageDataStore: PcfStageDataItem[] = clone(pcfStageDataSeed)

/** 阶段数据项列表（按项目：默认按步骤①勾选的生命周期阶段带出，数据由用户新增 / 删除） */
export function fetchPcfStageData(projectId: string): Promise<PcfStageDataItem[]> {
  return request(pcfStageDataStore.filter((item) => item.projectId === projectId))
}

/**
 * 保存阶段数据项（整表覆盖：新增 / 删除在本地完成后一次性提交）。
 * 2026-10-09：报告「已完成」前允许回改数据；一旦回改，检测 / 核算结果失效，
 * 项目回退「进行中」并定位到步骤③（需重走检测 → 核算，历史结果版本保留）。
 */
export async function savePcfStageData(
  projectId: string,
  items: PcfStageDataItem[],
): Promise<PcfStageDataItem[]> {
  pcfStageDataStore = [
    ...pcfStageDataStore.filter((item) => item.projectId !== projectId),
    ...items.map((item) => ({ ...item, projectId })),
  ]
  const project = pcfProjectStore.find((item) => item.id === projectId)
  if (project) {
    // 步骤②数据保存后即进入「待检测」（首次录入 / 回改数据回退重跑均如此）
    project.status = 'toCheck'
    project.currentStep = 3
    project.updatedAt = NOW
  }
  await new Promise((resolve) => setTimeout(resolve, 200))
  return clone(pcfStageDataStore.filter((item) => item.projectId === projectId))
}

/** 导入预设：按当前生命周期阶段名称匹配典型输入 / 输出（原型内置示例） */
const STAGE_IMPORT_PRESETS: Array<{
  match: RegExp
  inputs: PcfStageImportRow[]
  outputs: PcfStageImportRow[]
}> = [
  {
    match: /原料|原材料|获取|开采|种植|养殖|培育/,
    inputs: [
      { name: '主要原辅料', itemType: 'material', unit: 'kg' },
      { name: '包装材料', itemType: 'material', unit: 'kg' },
      { name: '电力', itemType: 'energy', unit: 'kWh' },
    ],
    outputs: [
      { name: '中间产品', itemType: 'intermediate', unit: 'kg' },
      { name: '废渣', itemType: 'emission', emissionType: 'wasteSolid', unit: 'kg' },
    ],
  },
  {
    match: /生产|制造|加工|装配|成型/,
    inputs: [
      { name: '电力', itemType: 'energy', unit: 'kWh' },
      { name: '天然气', itemType: 'energy', unit: 'm³' },
      { name: '水', itemType: 'natural', unit: 'm³' },
    ],
    outputs: [
      { name: '产品', itemType: 'product', unit: 'kg' },
      { name: '副产品', itemType: 'byproduct', unit: 'kg' },
      { name: '废水', itemType: 'emission', emissionType: 'wastewater', unit: 'm³' },
      { name: '废气', itemType: 'emission', emissionType: 'wasteGas', unit: 'm³' },
      { name: '废渣', itemType: 'emission', emissionType: 'wasteSolid', unit: 'kg' },
    ],
  },
  {
    match: /运输|物流|分销|配送|仓储/,
    inputs: [
      { name: '柴油', itemType: 'energy', unit: 'L' },
      { name: '公路运输', itemType: 'energy', unit: 't·km' },
    ],
    outputs: [{ name: '废气', itemType: 'emission', emissionType: 'wasteGas', unit: 'm³' }],
  },
  {
    match: /使用|消费|运行/,
    inputs: [{ name: '电力', itemType: 'energy', unit: 'kWh' }],
    outputs: [{ name: '废气', itemType: 'emission', emissionType: 'wasteGas', unit: 'm³' }],
  },
  {
    match: /废弃|处置|回收|生命末期|末端|拆解/,
    inputs: [
      { name: '柴油', itemType: 'energy', unit: 'L' },
      { name: '电力', itemType: 'energy', unit: 'kWh' },
    ],
    outputs: [
      { name: '废渣', itemType: 'emission', emissionType: 'wasteSolid', unit: 'kg' },
      { name: '废水', itemType: 'emission', emissionType: 'wastewater', unit: 'm³' },
    ],
  },
]

const DEFAULT_IMPORT_PRESET: { inputs: PcfStageImportRow[]; outputs: PcfStageImportRow[] } = {
  inputs: [
    { name: '原辅料', itemType: 'material', unit: 'kg' },
    { name: '电力', itemType: 'energy', unit: 'kWh' },
  ],
  outputs: [
    { name: '产品', itemType: 'product', unit: 'kg' },
    { name: '废渣', itemType: 'emission', emissionType: 'wasteSolid', unit: 'kg' },
  ],
}

/** 当前生命周期阶段的导入预设：典型输入 / 输出清单 */
export function fetchPcfStageImportPresets(stageName: string): Promise<PcfStageImportPreset> {
  const hit = STAGE_IMPORT_PRESETS.find((item) => item.match.test(stageName))
  return request(clone(hit ? { inputs: hit.inputs, outputs: hit.outputs } : DEFAULT_IMPORT_PRESET), 160)
}

/* ---------- 步骤② 产品建模：过程节点（「继续追溯」生成的上游过程） ---------- */

let pcfProcessNodeStore: PcfProcessNode[] = []

/** 过程节点列表（按项目） */
export function fetchPcfProcessNodes(projectId: string): Promise<PcfProcessNode[]> {
  return request(pcfProcessNodeStore.filter((item) => item.projectId === projectId))
}

/** 保存过程节点（整表覆盖） */
export async function savePcfProcessNodes(
  projectId: string,
  nodes: PcfProcessNode[],
): Promise<PcfProcessNode[]> {
  pcfProcessNodeStore = [
    ...pcfProcessNodeStore.filter((item) => item.projectId !== projectId),
    ...nodes.map((node) => ({ ...node, projectId })),
  ]
  await new Promise((resolve) => setTimeout(resolve, 160))
  return clone(pcfProcessNodeStore.filter((item) => item.projectId === projectId))
}

/* ---------- 步骤② 产品与边界配置（P19） ---------- */

/** 净重单位候选（**仅重量类**，字段清单 §5.2） */
export function fetchPcfWeightUnitOptions(): Promise<string[]> {
  return request(pcfWeightUnitOptions, 120)
}

/**
 * 核算方法候选：**引用标准文件库**（A1-3，仅返回「标准状态 = 现行」的标准，R-008 / D10）。
 */
export function fetchPcfStandardOptions(): Promise<PcfStandardOption[]> {
  return request(
    standardStore
      .filter((item) => item.status === '现行')
      .map((item) => ({
        id: item.id,
        code: item.code,
        name: item.nameZh,
        status: item.status,
      })),
    120,
  )
}

/* ---------- 步骤① 目标与范围（含产品与边界，V0.3 合并） ---------- */

export interface PcfStepOnePayload {
  /** 基础信息 */
  name: string
  ownerOrg: string
  /** 统计时间（起止） */
  startDate: string
  endDate: string
  remark: string
  /** 核算依据 */
  boundary: PcfBoundary
  methodId: string
  /** 产品：引用产品库可选；未引用时由用户自行录入产品信息 */
  refProductId?: string
  productCode?: string
  productName: string
  productModel?: string
  productSpec?: string
  /** 产品图片（**必填**；引用产品时带出快照） */
  productImageUrl?: string
  productCategory?: string
  productIndustry?: string
  productVersion?: string
  /** 单位（取计量单位库；默认带出产品「单位」，可项目级重选） */
  functionalUnit: string
  /** 声明/功能单位数值（文本框录入） */
  functionalUnitValue?: number | string | null
  /** 转换系数（功能单位 / 声明单位 ↔ 产品单位，须 > 0；1 = 与产品单位一致） */
  conversionFactor?: number | null
  /** 单位转换系数的来源单位 */
  conversionUnit?: string
  /** 单位转换系数的换算后单位 */
  convertedUnit?: string
  /** 生命周期阶段（按边界带出，全部可勾选） */
  lifecycleStages: PcfLifecycleStage[]
}

/**
 * 保存步骤①「目标与范围」（**V0.3 已合并原「产品与边界」步骤**）。
 * 校验：项目名称 / 引用产品（仅上架）/ 单位 / 净重（> 0）/ 净重单位（重量类）/ 核算周期。
 * - 保存后进度推进到②；
 * - 若原状态为「已核算」→ 回退「进行中」，需重走检测 → 核算（E13 人话化）。
 */
export async function updatePcfProjectStepOne(id: string, payload: PcfStepOnePayload): Promise<PcfProject> {
  const target = pcfProjectStore.find((item) => item.id === id)
  if (!target) throw new Error('项目不存在或已被删除')
  if (!PCF_EDITABLE_STATUS.includes(target.status)) {
    throw new Error('当前状态不可编辑')
  }

  if (!payload.name.trim()) throw new Error('保存失败：项目名称必填')
  if (!payload.ownerOrg) throw new Error('保存失败：核算主体组织必填')
  if (!payload.boundary) throw new Error('保存失败：核算边界必填')

  if (!payload.productName || !payload.productName.trim()) throw new Error('保存失败：产品名称必填')

  // 引用产品**可选**；仅当引用了产品才校验其有效性
  const picked = payload.refProductId
    ? productStore.find((item) => item.id === payload.refProductId) ??
      myProductStore.find((item) => item.id === payload.refProductId)
    : undefined
  if (payload.refProductId && !picked) throw new Error('保存失败：所选产品不存在或已被删除')
  if (picked && picked.useStatus !== 'on') throw new Error('保存失败：所选产品已下架，请重新选择')

  if (!payload.functionalUnit) throw new Error('保存失败：单位必填')

  // 转换系数**选填**；填写时须为大于 0 的数值
  if (
    payload.conversionFactor != null &&
    (!Number.isFinite(payload.conversionFactor) || payload.conversionFactor <= 0)
  ) {
    throw new Error('保存失败：转换系数须为大于 0 的数值')
  }

  if (!payload.methodId) throw new Error('保存失败：核算方法必填')
  const std = standardStore.find((item) => item.id === payload.methodId)
  if (!std) throw new Error('保存失败：所选核算方法不存在或已被移除')
  if (std.status !== '现行') {
    throw new Error('保存失败：仅「现行」的标准可作为核算方法（R-008 / D10）')
  }

  if (!payload.startDate || !payload.endDate) throw new Error('保存失败：统计时间必填')
  if (payload.startDate > payload.endDate) {
    throw new Error('保存失败：统计时间起始不能晚于结束')
  }
  if (payload.remark.length > PCF_PROJECT_REMARK_MAX) {
    throw new Error(`保存失败：备注最长 ${PCF_PROJECT_REMARK_MAX} 字符`)
  }

  target.name = payload.name.trim()
  target.ownerOrg = payload.ownerOrg
  target.startDate = payload.startDate
  target.endDate = payload.endDate
  target.remark = payload.remark.trim()

  // 核算依据（V0.5 起开放编辑）
  target.boundary = payload.boundary

  target.productSource = picked
    ? productStore.some((item) => item.id === picked.id)
      ? 'library'
      : 'custom'
    : 'custom'
  target.refProductId = picked?.id ?? null
  target.productCode = payload.productCode ?? ''
  target.productName = payload.productName.trim()
  target.productModel = payload.productModel ?? ''
  target.productSpec = payload.productSpec ?? ''
  target.productImageUrl = payload.productImageUrl ?? ''
  target.productCategory = payload.productCategory ?? ''
  target.productIndustry = payload.productIndustry ?? ''
  target.productVersion = payload.productVersion ?? ''
  target.functionalUnit = payload.functionalUnit
  target.functionalUnitValue = payload.functionalUnitValue ?? null
  target.conversionFactor = payload.conversionFactor ?? null
  target.conversionUnit = payload.conversionUnit ?? ''
  target.convertedUnit = payload.convertedUnit ?? ''
  target.methodId = std.id
  target.method = std.code
  target.lifecycleStages = clone(payload.lifecycleStages)
  target.updatedAt = NOW

  if (PCF_REVERT_STATUSES.includes(target.status)) {
    // 检测 / 核算已进行后回改步骤① → 回退「待处理」，需重走步骤② → 一键检测 → 核算（E13）
    target.status = 'ongoing'
    target.currentStep = 2
  } else if (target.currentStep < 2) {
    // 步骤①保存后落库并推进到步骤②（编号已在创建时生成）
    target.currentStep = 2
  }

  return request(target)
}

/* ---------- 步骤② 生命周期模型（P20） ---------- */

let pcfOperationStore: PcfOperationConfig[] = clone(pcfOperationSeed)

export interface PcfLifecycleBundle {
  /** 项目内核算工序（**引用即复制**自产品的工艺 / 工序，公式随工序带入） */
  operations: PcfOperationConfig[]
}

/**
 * 步骤①纳入的生命周期阶段名称集合。
 * **以一级阶段为纳入粒度**（工序 / 工艺流程仅标记一级阶段名，二级为一级的从属明细），
 * 只收集「纳入的一级阶段名」，与工序的 `processStage` 严格对齐。
 */
function includedStageNamesOf(project: PcfProject): Set<string> | null {
  const stages = project.lifecycleStages
  if (!stages || stages.length === 0) return null
  const names = new Set<string>()
  stages
    .filter((s) => s.included && s.level === 1)
    .forEach((s) => names.add(s.name))
  return names.size > 0 ? names : null
}

/** 步骤①纳入的一级阶段名称集合（空集 = 未配置阶段，不再过滤） */
function includedLevel1Names(project: PcfProject): Set<string> {
  const names = new Set<string>()
  ;(project.lifecycleStages ?? [])
    .filter((s) => s.included && s.level === 1)
    .forEach((s) => names.add(s.name))
  return names
}

/**
 * 阶段数据项归属的**一级阶段名**（检测 / 核算统一口径）：
 * - 直接挂在一级阶段 → 本身；
 * - 挂在二级阶段 → 上卷到其一级父阶段（项目内 `parentName`，其次生命周期阶段库 `parentId`）；
 * - 均无法解析 → 回退为自身阶段名。
 */
function level1StageNameOf(
  project: PcfProject,
  item: PcfStageDataItem,
  lv1Names: Set<string>,
): string {
  if (lv1Names.size === 0 || lv1Names.has(item.stageName)) return item.stageName
  const mine = (project.lifecycleStages ?? []).find((s) => s.id === item.stageId)
  if (mine?.parentName && lv1Names.has(mine.parentName)) return mine.parentName
  const lib = lifecycleStore.find((s) => s.id === item.stageId)
  if (lib?.parentId) {
    const parent = lifecycleStore.find((s) => s.id === lib.parentId)
    if (parent && lv1Names.has(parent.name)) return parent.name
  }
  return item.stageName
}

/**
 * 加载步骤② 「模型与数据」的工序（**懒初始化**）：
 * 从所选产品的工艺 / 工序副本**复制**一份到项目（引用即复制），
 * 投入产出项随工序**带入公式**（系统默认带出 + 产品侧可覆盖）；
 * 产品变更（重选产品）时**重新复制**。
 */
/**
 * **同步**确保项目内核算工序副本已生成（引用即复制）；返回该项目**全部**工序（不做阶段过滤）。
 * 产品变更（重选产品）时重新复制；项目内自定义工序（`sourceProductId = ''`）保留不动。
 */
function ensureOperations(projectId: string): PcfOperationConfig[] {
  const project = pcfProjectStore.find((item) => item.id === projectId)
  if (!project) return []

  const product =
    productStore.find((item) => item.id === project.refProductId) ??
    myProductStore.find((item) => item.id === project.refProductId)
  let operations = pcfOperationStore.filter((item) => item.projectId === projectId)
  const stale = operations.length === 0 || operations[0]?.sourceProductId !== (product?.id ?? '')
  if (stale) {
    pcfOperationStore = pcfOperationStore.filter((item) => item.projectId !== projectId)
    operations = product
      ? product.processes.flatMap((process) =>
          process.operations.map((op) => ({
            id: `${projectId}-OP-${process.processCode}-${op.code}`,
            projectId,
            sourceProductId: product.id,
            copiedAt: NOW,
            processCode: process.processCode,
            processName: process.processName,
            processSeq: process.seq,
            // 阶段随工艺流程带出（一个工艺流程对应一个生命周期阶段）
            processStage: process.lifecycleStage,
            opCode: op.code,
            opName: op.name,
            opSeq: op.seq,
            inputs: clone(op.inputs).map(decorateProductFlow),
            outputs: clone(op.outputs).map(decorateProductFlow),
          })),
        )
      : []
    pcfOperationStore = [...pcfOperationStore, ...operations]
  }
  return operations
}

export function fetchPcfLifecycleBundle(projectId: string): Promise<PcfLifecycleBundle> {
  const project = pcfProjectStore.find((item) => item.id === projectId)
  if (!project) throw new Error('项目不存在或已被删除')

  let operations = ensureOperations(projectId)

  // 步骤①「目标与范围」勾选的生命周期阶段 → 步骤② 仅展示纳入阶段的工序（V0.7 对齐）
  const stageNames = includedStageNamesOf(project)
  if (stageNames) {
    operations = operations.filter((op) => stageNames.has(op.processStage))
  }

  return request({ operations }, 160)
}

/* ---------- 步骤② 模型与数据：活动数据填报 + 排放来源手动匹配 + 产出分配比例 ---------- */

let pcfActivityStore: PcfActivityData[] = clone(pcfActivitySeed)

/**
 * 排放因子选项（**手动匹配**用）：多库模型下取「后台已发布库当前版本因子 + 我的因子库因子」中**启用**的因子。
 * **本版不做自动匹配、不做自动预选**，由填报人在步骤② 逐条手动选择排放来源。
 */
export function fetchPcfFactorOptions(): Promise<PcfFactorOption[]> {
  syncLibraryStats()
  const offlineLibraryIds = new Set(factorLibraryStore.filter((item) => item.offline).map((item) => item.id))
  const publishedVersionIds = new Set(
    factorLibraryVersionStore
      .filter((item) => item.status === 'published' && !offlineLibraryIds.has(item.libraryId))
      .map((item) => item.id),
  )
  const libraryFactors = factorStore.filter(
    (item) => !!item.libraryVersionId && publishedVersionIds.has(item.libraryVersionId),
  )
  const myFactors = myFactorStore
  return request(
    [...libraryFactors, ...myFactors].map((item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      value: item.value,
      numeratorUnit: item.numeratorUnit,
      denominatorUnit: item.denominatorUnit,
      calibers: item.calibers,
      libraryId: item.libraryId,
    })),
    120,
  )
}

/**
 * 加载项目活动数据（**懒初始化**）：
 * 首次进入步骤② 时，按项目内核算工序的投入产出流**生成填报行**。
 * - **绑定公式随工序带入**（引用即复制，产品侧配置完成，前台只读）；填报字段 = 公式 `activity` 因素（**动态**）；
 * - **中间品 / 产品**流不计入（`disposal = excluded`，避免重复计算）；
 * - 因子：公式含 `factor` / `parameter` 占位因素时才需手动匹配（**单因子**）；数值与分配比例初始为空。
 */
/** 由单个工序副本生成其活动数据填报行 */
function buildActivityRows(projectId: string, op: PcfOperationConfig): PcfActivityData[] {
  const multiOutput = op.outputs.length > 1
  const buildRow = (
    direction: 'input' | 'output',
    flow: ProductFlowItem,
  ): PcfActivityData | null => {
    // 公式随工序带入（引用即复制）；中间品 / 产品不计入
    if (flow.disposal !== 'formula') return null
    const formula = calcFormulaStore.find((item) => item.id === flow.formulaId)
    const factors = formula?.factors ?? []
    const activityFactors = factors.filter((item) => item.sourceType === 'activity')
    const requiresFactor = factors.some((item) => item.sourceType === 'factor' || item.sourceType === 'parameter')
    // 排放来源**默认带出公式中绑定的因子**（允许填报时修改）
    const paramFactor = factors.find((item) => item.sourceType === 'factor' || item.sourceType === 'parameter')
    const defaultFactor = paramFactor?.sourceCode
      ? factorStore.find((f) => f.code === paramFactor.sourceCode)
      : undefined
    return {
      id: `${op.id}-${direction === 'input' ? 'IN' : 'OUT'}-${flow.id}`,
      projectId,
      operationId: op.id,
      direction,
      flowName: flow.name,
      flowType: flow.type,
      formulaId: flow.formulaId,
      formulaCode: flow.formulaCode,
      formulaName: flow.formulaName,
      formulaExpression: flow.formulaExpression,
      activityValues: activityFactors.map((factor) => ({
        factorName: factor.name,
        unit: factor.unit,
        // 仅「单 activity 因素」时用工序副本流的基准数量作参考值
        refQty: activityFactors.length === 1 ? flow.qty : null,
        value: null,
      })),
      requiresFactor,
      factorId: defaultFactor?.id ?? null,
      factorName: defaultFactor?.name ?? '',
      factorValue: defaultFactor?.value ?? null,
      // 单产出固定 100%；多产出留空待填（合计须为 100%）
      allocateRatio: direction === 'output' ? (multiOutput ? null : 100) : null,
    }
  }
  return [
    ...op.inputs.map((flow) => buildRow('input', flow)),
    ...op.outputs.map((flow) => buildRow('output', flow)),
  ].filter((row): row is PcfActivityData => row != null)
}

export function fetchPcfActivityData(projectId: string): Promise<PcfActivityData[]> {
  const project = pcfProjectStore.find((item) => item.id === projectId)
  if (!project) throw new Error('项目不存在或已被删除')

  // 按步骤①纳入的生命周期阶段过滤可见工序（与 fetchPcfLifecycleBundle 同口径）
  const stageNames = includedStageNamesOf(project)
  const projectOps = pcfOperationStore.filter((item) => item.projectId === projectId)
  const visibleOps = stageNames
    ? projectOps.filter((op) => stageNames.has(op.processStage))
    : projectOps

  let rows = pcfActivityStore.filter((item) => item.projectId === projectId)
  // 为「尚无填报行」的可见工序补行（首次进入 / 新增工序后自动生成）
  const withRows = new Set(rows.map((row) => row.operationId))
  const missingOps = visibleOps.filter((op) => !withRows.has(op.id))
  if (missingOps.length > 0) {
    const generated = missingOps.flatMap((op) => buildActivityRows(projectId, op))
    pcfActivityStore = [...pcfActivityStore, ...generated]
    rows = [...rows, ...generated]
  }
  // 被取消勾选阶段（或已删除）的工序，其填报行不展示
  const visibleOpIds = new Set(visibleOps.map((op) => op.id))
  rows = rows.filter((row) => visibleOpIds.has(row.operationId))

  return request(rows, 160)
}

export interface PcfActivityValuePayload {
  factorName: string
  value: number | null
  /** 活动量单位（可修改，引用计量单位库） */
  unit?: string
}

export interface PcfActivityPayload {
  id: string
  /** 活动量填报值（与 activityValues 一一对应） */
  activityValues: PcfActivityValuePayload[]
  /** 手动匹配的排放因子 id（`null` = 未匹配；仅 requiresFactor 行需要） */
  factorId?: string | null
  allocateRatio?: number | null
}

/**
 * 保存「模型与数据」：更新活动量填报值、因子与产出分配比例。
 * 校验：① 每条活动量必填且 ≥ 0；② 需因子的投入项必须匹配排放来源（单因子）；
 * ③ 多产出工序分配比例合计须为 100%。
 * 保存后进度推进到步骤③（数据检测）。
 */
export async function updatePcfActivityData(
  projectId: string,
  payload: PcfActivityPayload[],
): Promise<void> {
  const project = pcfProjectStore.find((item) => item.id === projectId)
  if (!project) throw new Error('项目不存在或已被删除')
  if (!PCF_EDITABLE_STATUS.includes(project.status)) {
    throw new Error('当前状态不可编辑')
  }

  // ① **活动量必填**：每条数据项的每个活动量均须填值（业务裁定 2026-09-23）
  const missingQty = payload.filter((row) => row.activityValues.some((item) => item.value == null))
  if (missingQty.length > 0) {
    const first = pcfActivityStore.find((item) => item.id === missingQty[0].id)
    const op = pcfOperationStore.find((item) => item.id === first?.operationId)
    throw new Error(
      `保存失败：还有 ${missingQty.length} 条数据项存在未填写的活动量（如「${op?.opName ?? ''} / ${first?.flowName ?? ''}」），活动数据为必填`,
    )
  }

  // ② **排放来源（因子）手动匹配**：仅「需因子」的投入项必选，产出项选填（本版不做自动匹配）
  const missingFactor = payload.filter((row) => {
    const target = pcfActivityStore.find((item) => item.id === row.id)
    if (!target || !target.requiresFactor || target.direction !== 'input') return false
    const factorId = row.factorId === undefined ? target.factorId : row.factorId
    return !factorId
  })
  if (missingFactor.length > 0) {
    const first = pcfActivityStore.find((item) => item.id === missingFactor[0].id)
    const op = pcfOperationStore.find((item) => item.id === first?.operationId)
    throw new Error(
      `保存失败：还有 ${missingFactor.length} 条投入项未匹配排放来源（如「${op?.opName ?? ''} / ${first?.flowName ?? ''}」），请手动选择排放因子`,
    )
  }

  // ③ 数值范围与分配比例校验
  payload.forEach((row) => {
    row.activityValues.forEach((item) => {
      if (item.value != null && (Number.isNaN(item.value) || item.value < 0)) {
        throw new Error('保存失败：活动数据必须为大于等于 0 的数字')
      }
    })
    if (
      row.allocateRatio != null &&
      (Number.isNaN(row.allocateRatio) || row.allocateRatio < 0 || row.allocateRatio > 100)
    ) {
      throw new Error('保存失败：分配比例须为 0 ~ 100 之间的数字')
    }
  })

  // ④ 多产出的工序：分配比例合计须为 100%
  const outputByOp = new Map<string, number[]>()
  payload.forEach((row) => {
    const target = pcfActivityStore.find((item) => item.id === row.id)
    if (!target || target.direction !== 'output') return
    const op = pcfOperationStore.find((item) => item.id === target.operationId)
    if (!op || op.outputs.length <= 1) return
    const ratio = row.allocateRatio === undefined ? target.allocateRatio ?? 0 : row.allocateRatio ?? 0
    const list = outputByOp.get(target.operationId) ?? []
    list.push(ratio)
    outputByOp.set(target.operationId, list)
  })
  outputByOp.forEach((ratios, operationId) => {
    const total = ratios.reduce((sum, value) => sum + value, 0)
    if (Math.abs(total - 100) > 0.01) {
      const op = pcfOperationStore.find((item) => item.id === operationId)
      throw new Error(
        `保存失败：工序「${op?.opName ?? ''}」存在多个产出，分配比例合计须为 100%（当前 ${total}%）`,
      )
    }
  })

  // 写入
  payload.forEach((row) => {
    const target = pcfActivityStore.find((item) => item.id === row.id)
    if (!target) return
    row.activityValues.forEach((item) => {
      const targetValue = target.activityValues.find((v) => v.factorName === item.factorName)
      if (targetValue) {
        targetValue.value = item.value
        if (item.unit) targetValue.unit = item.unit
      }
    })
    if (row.allocateRatio !== undefined) target.allocateRatio = row.allocateRatio
    if (row.factorId !== undefined) {
      // 引用即复制：因子名称与因子值随选择写入项目，因子库后续变更不影响本项目历史
      const factor = row.factorId ? factorStore.find((item) => item.id === row.factorId) : undefined
      target.factorId = factor?.id ?? null
      target.factorName = factor?.name ?? ''
      target.factorValue = factor?.value ?? null
    }
  })

  project.currentStep = Math.max(project.currentStep, 3)
  project.updatedAt = NOW
  await new Promise((resolve) => setTimeout(resolve, 200))
}

/* ---------- 步骤② 工序管理：新增 / 删除项目内核算工序 ---------- */

export interface PcfOperationAddPayload {
  /** 工序库工序编码 */
  opCode: string
  /** 归属方式一：挂载到项目内已有工艺流程 */
  processCode?: string
  /** 归属方式二：直接归属到生命周期阶段（自动创建自定义工艺容器），与 processCode 二选一 */
  stage?: string
}

/** 工序库投入产出流 → 项目工序副本流（公式按流类型 / 名称默认带出，引用即复制） */
function toProjectFlow(flow: OperationFlowItem, prefix: string, stamp: string): ProductFlowItem {
  const base: ProductFlowItem = {
    id: `${stamp}-${prefix}-${flow.id}`,
    type: flow.flowType,
    name: flow.refName,
    qty: 1,
    unit: flow.unit,
    emissionCategory: flow.emissionCategory,
    formulaId: '',
    formulaCode: '',
    formulaName: '',
    formulaExpression: '',
    disposal: 'formula',
  }
  return decorateProductFlow(base)
}

/** 新增工序：从工序库选择一道启用工序，挂载到已有工艺流程**或**直接归属到生命周期阶段（引用即复制） */
export async function addPcfOperation(
  projectId: string,
  payload: PcfOperationAddPayload,
): Promise<PcfOperationConfig> {
  const project = pcfProjectStore.find((item) => item.id === projectId)
  if (!project) throw new Error('项目不存在或已被删除')
  if (!PCF_EDITABLE_STATUS.includes(project.status)) throw new Error('当前状态不可编辑')
  if (!payload.opCode) throw new Error('请选择工序')
  if (!payload.processCode && !payload.stage) throw new Error('请选择所属工艺流程或生命周期阶段')
  if (payload.processCode && payload.stage) throw new Error('所属工艺流程与生命周期阶段只能二选一')

  const source = operationStore.find((item) => item.code === payload.opCode)
  if (!source) throw new Error('所选工序不存在或已被删除')
  if (source.useStatus !== 'enabled') throw new Error('所选工序已禁用，不可新增')

  const projectOps = pcfOperationStore.filter((item) => item.projectId === projectId)

  let processCode: string
  let processName: string
  let processSeq: number
  let processStage: string
  let sourceProductId: string

  if (payload.processCode) {
    const group = projectOps.find((item) => item.processCode === payload.processCode)
    if (!group) throw new Error('所属工艺流程不存在或已被删除')
    processCode = group.processCode
    processName = group.processName
    processSeq = group.processSeq
    processStage = group.processStage
    sourceProductId = group.sourceProductId
  } else {
    const stage = payload.stage!.trim()
    processCode = `CUSTOM-${stage}`
    processName = `${stage}·自定义工艺`
    processStage = stage
    processSeq = new Set(projectOps.map((item) => item.processCode)).size + 1
    sourceProductId = productStore.find((item) => item.id === project.refProductId)?.id ?? ''
  }

  if (projectOps.some((item) => item.processCode === processCode && item.opCode === payload.opCode)) {
    throw new Error(`工序「${source.name}」已存在于该工艺流程中`)
  }

  const stamp = Date.now().toString()
  const siblings = projectOps.filter((item) => item.processCode === processCode)
  const item: PcfOperationConfig = {
    id: `${projectId}-OP-${processCode}-${payload.opCode}-${stamp}`,
    projectId,
    sourceProductId,
    copiedAt: NOW,
    processCode,
    processName,
    processSeq,
    processStage,
    opCode: source.code,
    opName: source.name,
    opSeq: siblings.length + 1,
    inputs: source.inputs.map((flow, index) => toProjectFlow(flow, `I${index}`, stamp)),
    outputs: source.outputs.map((flow, index) => toProjectFlow(flow, `O${index}`, stamp)),
  }
  pcfOperationStore = [...pcfOperationStore, item]
  await new Promise((resolve) => setTimeout(resolve, 200))
  return request(item, 120)
}

/** 删除工序：从项目内移除该核算工序，并同步清除其活动数据填报行 */
export async function removePcfOperation(projectId: string, operationId: string): Promise<void> {
  const project = pcfProjectStore.find((item) => item.id === projectId)
  if (!project) throw new Error('项目不存在或已被删除')
  if (!PCF_EDITABLE_STATUS.includes(project.status)) throw new Error('当前状态不可编辑')

  const target = pcfOperationStore.find(
    (item) => item.projectId === projectId && item.id === operationId,
  )
  if (!target) throw new Error('工序不存在或已被删除')

  pcfOperationStore = pcfOperationStore.filter((item) => item.id !== operationId)
  pcfActivityStore = pcfActivityStore.filter((item) => item.operationId !== operationId)
  project.updatedAt = NOW
  await new Promise((resolve) => setTimeout(resolve, 200))
}

/**
 * 修改数据项绑定公式：按新公式重建活动量变量（变量名 / 单位），排放来源重置为公式默认因子。
 * 原填报值随公式变更清空（口径变化不兼容）。
 */
export async function updatePcfActivityFormula(
  projectId: string,
  rowId: string,
  formulaId: string,
): Promise<PcfActivityData> {
  const project = pcfProjectStore.find((item) => item.id === projectId)
  if (!project) throw new Error('项目不存在或已被删除')
  if (!PCF_EDITABLE_STATUS.includes(project.status)) throw new Error('当前状态不可编辑')

  const target = pcfActivityStore.find((item) => item.projectId === projectId && item.id === rowId)
  if (!target) throw new Error('数据项不存在或已被删除')

  const formula = calcFormulaStore.find((item) => item.id === formulaId)
  if (!formula) throw new Error('所选公式不存在或已被删除')
  if (formula.status !== 'enabled') throw new Error('所选公式已禁用，不可选择')

  const activityFactors = formula.factors.filter((item) => item.sourceType === 'activity')
  const paramFactor = formula.factors.find((item) => item.sourceType === 'factor' || item.sourceType === 'parameter')
  const defaultFactor = paramFactor?.sourceCode
    ? factorStore.find((f) => f.code === paramFactor.sourceCode)
    : undefined

  target.formulaId = formula.id
  target.formulaCode = formula.code
  target.formulaName = formula.name
  target.formulaExpression = formula.expression
  target.activityValues = activityFactors.map((factor) => ({
    factorName: factor.name,
    unit: factor.unit,
    refQty: null,
    value: null,
  }))
  target.requiresFactor = formula.factors.some(
    (item) => item.sourceType === 'factor' || item.sourceType === 'parameter',
  )
  target.factorId = defaultFactor?.id ?? null
  target.factorName = defaultFactor?.name ?? ''
  target.factorValue = defaultFactor?.value ?? null
  project.updatedAt = NOW

  await new Promise((resolve) => setTimeout(resolve, 160))
  return request(target, 100)
}

/** 新增工艺流程：从工艺流程库选择一道启用工艺，复制到项目（含其工序，引用即复制），可指定所属生命周期阶段 */
export async function addPcfProcess(
  projectId: string,
  processCode: string,
  stage?: string,
): Promise<PcfOperationConfig[]> {
  const project = pcfProjectStore.find((item) => item.id === projectId)
  if (!project) throw new Error('项目不存在或已被删除')
  if (!PCF_EDITABLE_STATUS.includes(project.status)) throw new Error('当前状态不可编辑')
  if (!processCode) throw new Error('请选择工艺流程')

  const process = processStore.find((item) => item.code === processCode)
  if (!process) throw new Error('所选工艺流程不存在或已被删除')
  if (process.useStatus !== 'enabled') throw new Error('所选工艺流程已禁用，不可新增')

  if (pcfOperationStore.some((item) => item.projectId === projectId && item.processCode === processCode)) {
    throw new Error(`工艺流程「${process.name}」已存在于项目中`)
  }

  // 指定阶段优先，否则沿用工艺库绑定阶段
  const targetStage = stage?.trim() || process.lifecycleStage
  const product = productStore.find((item) => item.id === project.refProductId)
  const processSeq =
    new Set(pcfOperationStore.filter((item) => item.projectId === projectId).map((item) => item.processCode))
      .size + 1
  const stamp = Date.now().toString()

  const ops: PcfOperationConfig[] = process.operations.map((po, index) => {
    const source = operationStore.find((op) => op.code === po.opCode)
    return {
      id: `${projectId}-OP-${process.code}-${po.opCode}-${stamp}`,
      projectId,
      sourceProductId: product?.id ?? '',
      copiedAt: NOW,
      processCode: process.code,
      processName: process.name,
      processSeq,
      processStage: targetStage,
      opCode: po.opCode,
      opName: po.opName,
      opSeq: index + 1,
      inputs: source?.inputs.map((flow, i) => toProjectFlow(flow, `I${i}`, stamp)) ?? [],
      outputs: source?.outputs.map((flow, i) => toProjectFlow(flow, `O${i}`, stamp)) ?? [],
    }
  })

  pcfOperationStore = [...pcfOperationStore, ...ops]
  await new Promise((resolve) => setTimeout(resolve, 200))
  return request(ops, 120)
}

/* ---------- 步骤③ 数据检测：提交检测 + 检测结果 + 问题清单（P23） ---------- */

/** 数据检测结果（内存态；两个演示项目均为「检测已通过」的留存记录） */
let pcfCheckStore: PcfCheckResult[] = [
  {
    projectId: 'PJ01',
    status: 'passed',
    checkedAt: '2026-09-10 14:20',
    blockingCount: 0,
    warningCount: 0,
    issues: [],
  },
  {
    projectId: 'PJ02',
    status: 'passed',
    checkedAt: '2026-09-11 10:05',
    blockingCount: 0,
    warningCount: 0,
    issues: [],
  },
]

/** 获取项目最近一次检测结果；无记录时返回「待检测」态 */
export function fetchPcfCheckResult(projectId: string): Promise<PcfCheckResult> {
  const target = pcfCheckStore.find((item) => item.projectId === projectId)
  if (target) return request(target, 120)
  return request<PcfCheckResult>(
    {
      projectId,
      status: 'pending',
      checkedAt: '',
      blockingCount: 0,
      warningCount: 0,
      issues: [],
    },
    120,
  )
}

/** 单位符号 → 单位类型（可换算判定用）；查不到返回原符号作为类型兜底 */
function unitTypeOf(symbol: string): string {
  const unit = unitStore.find((item) => item.symbol === symbol)
  return unit ? unit.unitType : symbol
}

/**
 * 单位换算系数（核算引擎 / 公式变量 `[当前行.单位换算系数]` 的取值）：
 * 把「活动数据数量（from 单位）」换算为「因子分母单位（to 单位）」。
 *
 * 规则（对齐《计量单位业务 PRD》「基准中转」）：
 * - `1 from = f_from × 基准`、`1 to = f_to × 基准` → `x(to) = x(from) × f_from ÷ f_to`
 * - 无法解析（复合单位 / 数量类无基准 / 类型不同）时返回 **1**（视为已同口径）
 */
function unitConversionFactor(from: string, to: string): number {
  if (!from || !to || from === to) return 1
  const source = unitStore.find((item) => item.symbol === from)
  const target = unitStore.find((item) => item.symbol === to)
  if (!source || !target || source.unitType !== target.unitType) return 1
  const sourceFactor = source.isBase ? 1 : source.factor
  const targetFactor = target.isBase ? 1 : target.factor
  if (!(sourceFactor > 0) || !(targetFactor > 0)) return 1
  return sourceFactor / targetFactor
}

/** 需匹配排放因子的投入项类型（原辅料 / 自然资源 / 能源及能源介质） */
const PCF_INPUT_FACTOR_TYPES: PcfDataItemType[] = ['material', 'natural', 'energy']

/**
 * 提交检测：基于步骤②「阶段数据项」真实执行检测（阻断 B1 / B2 / B4 / B5），生成并留存检测结果。
 * - B1 数量未填写；B2 投入项未匹配排放因子；B4 数量单位与因子分母单位不可换算；
 * - B5 步骤①纳入的一级阶段在该阶段下无任何数据项；
 * - 检测通过（阻断项 = 0）→ 项目「待核算」、步骤推进到④；
 * - 检测不通过 → 项目回「进行中」、步骤停留③，返回问题清单。
 */
export async function submitPcfCheck(projectId: string): Promise<PcfCheckResult> {
  const project = pcfProjectStore.find((item) => item.id === projectId)
  if (!project) throw new Error('项目不存在或已被删除')
  // 可检测状态：「待处理」/「待检测」（历史 `checking` 兼容）
  if (!['ongoing', 'toCheck', 'checking'].includes(project.status)) {
    throw new Error('当前状态不可检测')
  }

  // 2026-10-16：数据检测为即时校验，**不再占用独立项目状态**（已移除「检测中」）。
  // 检测不通过 → 停留「待处理」；检测通过 → 直接流转「待核算」。
  project.currentStep = 3
  project.updatedAt = NOW
  await new Promise((resolve) => setTimeout(resolve, 900))

  const issues: PcfCheckIssue[] = []
  const lv1Names = includedLevel1Names(project)
  const stageNameOf = (item: PcfStageDataItem) => level1StageNameOf(project, item, lv1Names)
  const allItems = pcfStageDataStore.filter((item) => item.projectId === projectId)
  const items = lv1Names.size > 0 ? allItems.filter((item) => lv1Names.has(stageNameOf(item))) : allItems

  // B1 数量缺失 / B2 排放因子缺失 / B4 因子单位不匹配（逐数据项）
  items.forEach((item) => {
    const loc = `阶段：${stageNameOf(item)} / 数据项：${item.name}`

    if (item.quantity == null) {
      issues.push({
        id: `${item.id}-B1`,
        level: 'blocking',
        category: 'completeness',
        title: `数据项「${item.name}」的数量未填写`,
        description: '请补充该数据项的数量后重新检测。',
        location: loc,
        fixStep: 2,
        fixLabel: '去填写',
      })
    }

    if (item.direction === 'input' && PCF_INPUT_FACTOR_TYPES.includes(item.itemType) && !item.factorId) {
      issues.push({
        id: `${item.id}-B2`,
        level: 'blocking',
        category: 'completeness',
        title: `投入项「${item.name}」未匹配排放因子`,
        description: '该投入项参与计算需匹配排放来源，请选择排放因子。',
        location: loc,
        fixStep: 2,
        fixLabel: '去匹配因子',
      })
    }

    if (item.factorId && item.quantity != null) {
      const factor = factorStore.find((f) => f.id === item.factorId)
      if (factor && unitTypeOf(item.unit) !== unitTypeOf(factor.denominatorUnit)) {
        issues.push({
          id: `${item.id}-B4`,
          level: 'blocking',
          category: 'factorUnit',
          title: `数据项「${item.name}」的数量单位与因子单位不可换算`,
          description: `数量单位为「${item.unit}」，排放因子分母单位为「${factor.denominatorUnit}」，无法换算，请重新选择排放因子或调整单位。`,
          location: loc,
          fixStep: 2,
          fixLabel: '去修改',
        })
      }
    }
  })

  // B5 阶段覆盖（步骤①纳入的一级阶段在该阶段下无任何数据项）
  const includedLevel1 = (project.lifecycleStages ?? []).filter((s) => s.included && s.level === 1)
  includedLevel1.forEach((stage) => {
    const has = items.some((item) => stageNameOf(item) === stage.name)
    if (!has) {
      issues.push({
        id: `stage-${stage.id}-B5`,
        level: 'blocking',
        category: 'stageCoverage',
        title: `阶段「${stage.name}」已纳入但未录入数据项`,
        description: '该阶段已纳入核算，但尚未录入任何数据项，请到步骤②补充该阶段的数据。',
        location: `阶段：${stage.name}`,
        fixStep: 2,
        fixLabel: '去补充',
      })
    }
  })

  // 生物碳对称性（E16 简化版）：含生物碳（口径带生物碳分量）但未覆盖生命末期时提示
  const hasBiogenic = items.some(
    (item) => (item.factorCalibers?.gwpBiogenic ?? 0) !== 0,
  )
  if (hasBiogenic) {
    const coversEol = includedLevel1.some((stage) => /生命末期|末期|废弃|处置|回收/.test(stage.name))
    if (!coversEol) {
      issues.push({
        id: `biogenic-${projectId}`,
        level: 'warning',
        category: 'biogenic',
        title: '生物碳未在生命末期闭环',
        description:
          '本次核算含生物碳口径，但未纳入生命末期（释放）阶段，含生物碳净值可能未闭合；如为摇篮到大门口径可忽略。',
        fixStep: 1,
        fixLabel: '去调整边界',
      })
    }
  }

  const blocking = issues.filter((i) => i.level === 'blocking')
  const warnings = issues.filter((i) => i.level === 'warning')
  const passed = blocking.length === 0

  const result: PcfCheckResult = {
    projectId,
    status: passed ? 'passed' : 'failed',
    checkedAt: NOW,
    blockingCount: blocking.length,
    warningCount: warnings.length,
    issues,
  }
  pcfCheckStore = [result, ...pcfCheckStore.filter((item) => item.projectId !== projectId)]

  project.status = passed ? 'toCalc' : 'ongoing'
  project.currentStep = passed ? 4 : 3
  project.updatedAt = NOW

  return request(result, 200)
}

/* ---------- 步骤④⑤ 碳足迹核算 / 核算结果（P24 / P25） ---------- */

let pcfCalcResultStore: PcfCalcResult[] = clone(pcfCalcResultSeed)

/** 保留 4 位小数（展示口径） */
function roundCalc(value: number): number {
  return Math.round(value * 10000) / 10000
}

/**
 * 明细行精度：保留 6 位小数。
 * 明细量级可能很小（如 0.000144 kgCO₂e），按 4 位小数落库会丢有效数字，
 * 导致清册「逐行相加」与合计对不上；界面展示仍按 4 位小数格式化，不影响观感。
 */
function roundDetail(value: number): number {
  return Math.round(value * 1e6) / 1e6
}

/** 占比（%）：总分 0 时返回 0 */
function ratioCalc(part: number, total: number): number {
  if (total === 0) return 0
  return (part / total) * 100
}

/** 解析常量值：支持「44/12」简单表达式，其余 parseFloat；解析失败取 1（不放大） */
function parseConstValue(value: string): number {
  const trimmed = value.trim()
  if (trimmed.includes('/')) {
    const [a, b] = trimmed.split('/').map((s) => parseFloat(s))
    if (a && b) return a / b
    return a || 1
  }
  const num = parseFloat(trimmed)
  return Number.isNaN(num) ? 1 : num
}

/** 活动量描述：各 activity 因素「值 × 单位」拼接（如「5 t × 300 km」） */
function activityTextOf(row: PcfActivityData): string {
  return row.activityValues.map((av) => `${av.value ?? '-'} ${av.unit}`).join(' × ')
}

/**
 * 单条填报行排放量（业务 PRD §6.1）：
 * `排放 = Π(活动量) × Π(常量) × 因子值`（含 parameter 因素时乘因子值，否则乘 1）。
 */
function computeRowEmission(row: PcfActivityData, formula?: CalcFormula): number {
  const activityProduct = row.activityValues.reduce((acc, av) => acc * (av.value ?? 0), 1)
  const constants = (formula?.factors ?? []).filter((item) => item.sourceType === 'constant')
  const constantProduct = constants.reduce((acc, item) => acc * parseConstValue(item.value), 1)
  const factorValue = row.requiresFactor ? (row.factorValue ?? 0) : 1
  return activityProduct * constantProduct * factorValue
}

/** 获取项目最近一次核算结果；无记录返回 null */
export function fetchPcfCalcResult(projectId: string): Promise<PcfCalcResult | null> {
  const latest = pcfCalcResultStore
    .filter((item) => item.projectId === projectId)
    .sort((a, b) => b.version - a.version)[0]
  return request(latest ?? null, 120)
}

/**
 * 执行核算（业务 PRD §4 / §6）：真实遍历项目活动数据 + 工序 + 公式做简化核算。
 * - 准入：项目「待核算 / 核算失败 / 已核算 / **已完成**」（V1.1 起已完成不锁定，可重新核算）；
 *   **已核算（`calculated`）= 在既有结果上重新计算**（活动数据、排放因子或公式口径变更后使用），
 *   不覆盖历史，按版本号递增产出新结果版本；
 * - 置「核算中」模拟异步，懒初始化工序与填报行后逐行计算；
 * - 生成新结果版本（版本号递增、旧版本保留），项目置「已核算」，停留步骤④「碳足迹核算与结果」。
 */
export async function startPcfCalc(projectId: string): Promise<PcfCalcResult> {
  const project = pcfProjectStore.find((item) => item.id === projectId)
  if (!project) throw new Error('项目不存在或已被删除')
  if (!['toCalc', 'calcFailed', 'calculated', 'done'].includes(project.status)) {
    throw new Error('当前状态不可核算')
  }

  // 置「核算中」并模拟异步
  project.status = 'calculating'
  project.currentStep = 4
  project.updatedAt = NOW
  await new Promise((resolve) => setTimeout(resolve, 1200))

  return runPcfCalc(project)
}

/**
 * 继续「核算中」的核算任务（原型模拟异步）：进入步骤④ 时若项目处于「核算中」，
 * 前端调用本函数在数秒后把任务推进到「已核算」并产出结果版本。
 */
export async function resumePcfCalc(projectId: string): Promise<PcfCalcResult> {
  const project = pcfProjectStore.find((item) => item.id === projectId)
  if (!project) throw new Error('项目不存在或已被删除')
  if (project.status !== 'calculating') throw new Error('当前项目不在核算中')

  await new Promise((resolve) => setTimeout(resolve, 2000))
  return runPcfCalc(project)
}

/** 数据项类型 → 流类型（`natural`→`resource`、`intermediate`→`semi`，其余同名） */
function toFlowType(type: PcfDataItemType): FlowItemType {
  if (type === 'natural') return 'resource'
  if (type === 'intermediate') return 'semi'
  return type as FlowItemType
}

/**
 * 数据项归属的**最末级生命周期阶段路径**（清册按最末级阶段拆表的分组依据）：
 * - 挂在二级阶段 → `一级阶段名-二级阶段名`（即使同名也保留一级前缀，如「原材料获取-原材料获取」）；
 * - 直接挂在一级阶段 → 一级阶段名；
 * - 项目内 / 阶段库均取不到 → 回退该行所属的一级阶段名。
 */
function stagePathOf(project: PcfProject, item: PcfStageDataItem, level1Name: string): string {
  const stage =
    (project.lifecycleStages ?? []).find((s) => s.id === item.stageId) ??
    lifecycleStore.find((s) => s.id === item.stageId)
  if (stage?.level === 2) return `${level1Name}-${stage.name}`
  return level1Name
}

/**
 * 背景数据来源文案（清册「背景数据来源」列）：
 * 优先商业数据库的「所有者 + 系统模型」（如 `Ecoinvent3.11,Cutoff`），
 * 其次「库名称 + 库版本号」（如 `中国官方排放因子库 V1.0`），最终回退因子名称。
 */
function factorSourceText(factor?: FactorItem): string {
  if (!factor) return ''
  const library = factor.libraryId ? factorLibraryStore.find((l) => l.id === factor.libraryId) : undefined
  const version = factor.libraryVersionId
    ? factorLibraryVersionStore.find((v) => v.id === factor.libraryVersionId)
    : undefined
  const dbName = factor.ext?.owner || [library?.name, version?.versionNo].filter(Boolean).join(' ')
  return dbName ? `${dbName} 数据库：${factor.name}` : factor.name
}

/** 阶段数据项 → 最末级生命周期阶段路径（清册拆表用） */

/**
 * 核算主流程（**方案 A：基于步骤②「阶段数据项 + 过程节点」**）：
 * 行级公式逐行算碳排 → 阶段汇总公式算阶段碳排 → 全局公式算核算结果。
 * V0.8（2026-10-12）：项目步骤①不再引用「核算公式」，碳核算计算引擎内置代码层级，
 * 暂按默认公式（`defaultFormulas()`）求值，后续按引擎建设逐层替换。
 */
async function runPcfCalc(project: PcfProject): Promise<PcfCalcResult> {
  const projectId = project.id

  const lv1Names = includedLevel1Names(project)
  const stageNameOf = (item: PcfStageDataItem) => level1StageNameOf(project, item, lv1Names)
  const allItems = pcfStageDataStore.filter((item) => item.projectId === projectId)
  const items = lv1Names.size > 0 ? allItems.filter((item) => lv1Names.has(stageNameOf(item))) : allItems
  const nodes = pcfProcessNodeStore.filter((item) => item.projectId === projectId)

  // 公式口径：引擎内置代码层（V0.8 起步骤①不再引用公式配置），暂用默认公式
  const formulas = defaultFormulas()
  /** 按公式求值；表达式缺失 / 语法错误返回 NaN，由调用方回退默认口径 */
  const evaluateFormula = (scopeKey: string, values: Record<string, number | number[]>): number => {
    try {
      return evaluateExpression(formulas[scopeKey] ?? '', values)
    } catch {
      return NaN
    }
  }

  const details: PcfResultDetail[] = []
  const itemSummaries: Array<{
    item: PcfStageDataItem
    emission: number
    processName: string
    stagePath: string
  }> = []
  /** 阶段 → 该阶段各行碳排（供阶段汇总公式使用） */
  const stageRowValues = new Map<string, number[]>()
  /** 四分量累计（化石 / 生物源 / 土地利用；总量 = 化石 + 土地利用） */
  const caliberTotals = { total: 0, fossil: 0, biogenic: 0, luluc: 0 }

  items.forEach((item) => {
    const stage = stageNameOf(item)
    const node = item.nodeId ? nodes.find((n) => n.id === item.nodeId) : undefined
    const processName = node?.name ?? stage
    const factor = item.factorId ? factorStore.find((f) => f.id === item.factorId) : undefined
    const quantity = item.quantity ?? 0
    const factorValue = item.factorValue ?? 0
    const calibers = item.factorCalibers ?? null
    /** 生物碳因子（吸收为负、释放为正）；无口径信息时为 0 */
    const biogenicFactor = calibers?.gwpBiogenic ?? 0

    // 行级公式：默认 `活动数据 × 单位换算系数 × 排放因子`
    // 单位换算系数 = 活动数据单位 → 因子分母单位（无法换算时为 1）
    const unitConv = unitConversionFactor(item.unit, factor?.denominatorUnit ?? '')
    const evalRow = (fv: number): number => {
      const value = evaluateFormula('row-formula', {
        [ROW_ACTIVITY_VAR]: quantity,
        [ROW_CONV_VAR]: unitConv,
        [ROW_FACTOR_VAR]: fv,
      })
      // 公式不可用 / 结果非法 → 回退「活动数据 × 排放因子」
      return Number.isFinite(value) ? value : quantity * unitConv * fv
    }
    /**
     * 四分量排放系数（因子值口径，取自数据项的口径快照）：
     * - 无量级分项时按「单一口径」处理：总量 = 因子值 − 生物源（化石 + 土地利用）。
     */
    const lulucFactor = calibers?.gwpLuluc ?? 0
    const fossilFactor = calibers?.gwpFossil ?? factorValue - biogenicFactor - lulucFactor
    const totalFactor = fossilFactor + lulucFactor
    const factorCaliberValues: PcfCaliberValues = {
      total: roundDetail(totalFactor),
      fossil: roundDetail(fossilFactor),
      biogenic: roundDetail(biogenicFactor),
      luluc: roundDetail(lulucFactor),
    }
    const emissionBreakdown: PcfCaliberValues = {
      total: roundDetail(evalRow(totalFactor)),
      fossil: roundDetail(evalRow(fossilFactor)),
      biogenic: roundDetail(evalRow(biogenicFactor)),
      luluc: roundDetail(evalRow(lulucFactor)),
    }
    /** GWP 总量（含生物碳，= 因子值口径）——界面「排放量」与报告沿用该值 */
    const emission = evalRow(factorValue)
    /** 最末级生命周期阶段路径：清册按此拆表（「一级-二级」；直接挂一级时即一级名） */
    const stagePath = stagePathOf(project, item, stage)

    details.push({
      id: item.id,
      operationId: item.id,
      processName,
      opName: item.name,
      stage,
      stagePath,
      flowName: item.name,
      flowType: toFlowType(item.itemType),
      direction: item.direction,
      activityText: `${item.quantity ?? '-'} ${item.unit}`.trim(),
      factorName: factor?.name ?? item.factorName ?? '',
      factorValue: item.factorValue ?? null,
      factorUnit: factor ? `${factor.numeratorUnit}/${factor.denominatorUnit}` : '',
      factorCaliberValues,
      factorSource: factorSourceText(factor),
      formulaName: '默认口径（活动数据 × 排放因子）',
      emission: roundDetail(emission),
      fossilEmission: emissionBreakdown.fossil,
      biogenicEmission: emissionBreakdown.biogenic,
      lulucEmission: emissionBreakdown.luluc,
      emissionBreakdown,
    })

    const rows = stageRowValues.get(stage)
    if (rows) rows.push(emission)
    else stageRowValues.set(stage, [emission])

    itemSummaries.push({ item, emission, processName, stagePath })
    caliberTotals.total += emissionBreakdown.total
    caliberTotals.fossil += emissionBreakdown.fossil
    caliberTotals.biogenic += emissionBreakdown.biogenic
    caliberTotals.luluc += emissionBreakdown.luluc
  })

  /** 阶段汇总公式：默认 `SUM(该阶段各行碳排)` */
  const stageResults = [...stageRowValues.entries()].map(([stage, rowValues]) => {
    let stageTotal = evaluateFormula('stage-sum', { [STAGE_ROWS_VAR]: rowValues })
    if (!Number.isFinite(stageTotal)) stageTotal = rowValues.reduce((sum, value) => sum + value, 0)
    return { stage, total: stageTotal }
  })
  // 汇总用「未四舍五入」的原始排放，保证各维度占比合计 = 100%（避免四舍五入引入误差）
  const total = stageResults.reduce((sum, item) => sum + item.total, 0)

  /** 全局公式：默认 `SUM(各阶段碳排)` → 核算结果（单位产品碳足迹） */
  let footprint = evaluateFormula('global-footprint', { [STAGE_ROWS_VAR]: stageResults.map((item) => item.total) })
  if (!Number.isFinite(footprint)) footprint = total

  // 版本号 = 该项目已有结果的最大版本 + 1（重新计算时递增，历史版本不可篡改）
  const version =
    pcfCalcResultStore
      .filter((item) => item.projectId === projectId)
      .reduce((max, item) => Math.max(max, item.version), 0) + 1

  /**
   * 结果口径：
   * - `unitEmission` = 全局公式结果（公式管理的「全局公式」决定，默认 = 各阶段合计）；
   * - `totalEmission` = 各阶段合计（模型总碳排，用于占比与「总量」展示）；
   * - 若项目填了「单位转换系数」（`N 声明单位 = 1 换算单位`），再派生一个换算口径：
   *   `换算口径值 = 核算结果 × N`（例：`0.3341 Item = 1 kg` → 每 kg = 每 Item × 0.3341）。
   */
  const convFactor = project.conversionFactor
  const unitEmissionBreakdown: PcfUnitEmission[] = [
    { unit: project.functionalUnit, value: roundCalc(footprint) },
  ]
  if (
    convFactor != null &&
    Number.isFinite(convFactor) &&
    convFactor > 0 &&
    project.conversionUnit &&
    project.convertedUnit
  ) {
    unitEmissionBreakdown.push({ unit: project.convertedUnit, value: roundCalc(footprint * convFactor) })
  }

  const result: PcfCalcResult = {
    projectId,
    version,
    calculatedAt: NOW,
    totalEmission: roundCalc(total),
    fossilEmission: roundCalc(caliberTotals.fossil),
    biogenicEmission: roundCalc(caliberTotals.biogenic),
    lulucEmission: roundCalc(caliberTotals.luluc),
    /** 四分量口径值（kgCO₂e / 声明单位）：清单口径即数量，故等于各分量清单合计 */
    caliberEmission: {
      total: roundCalc(caliberTotals.total),
      fossil: roundCalc(caliberTotals.fossil),
      biogenic: roundCalc(caliberTotals.biogenic),
      luluc: roundCalc(caliberTotals.luluc),
    },
    unit: project.functionalUnit,
    unitEmission: roundCalc(footprint),
    unitEmissionBreakdown,
    stageSummary: stageResults.map((item) => ({
      stage: item.stage,
      emission: roundCalc(item.total),
      ratio: roundCalc(ratioCalc(item.total, total)),
    })),
    // 「数据项汇总」：按排放量降序（替代原工序维度）
    operationSummary: itemSummaries
      .sort((a, b) => b.emission - a.emission)
      .map(({ item, emission, processName, stagePath }) => ({
        operationId: item.id,
        processName,
        opName: item.name,
        // 阶段口径与「阶段汇总」对齐：逐条数据上卷到**一级阶段**（原取 item.stageName 会出现一级 / 二级混用）
        stage: stageNameOf(item),
        stagePath,
        emission: roundCalc(emission),
        ratio: roundCalc(ratioCalc(emission, total)),
      })),
    details,
  }

  // 新版本前插，历史版本保留（界面仅展示最近版本）
  pcfCalcResultStore = [result, ...pcfCalcResultStore]
  // 2026-10-16：核算完成即置「已完成」（不再经过中间态「已核算」）
  project.status = 'done'
  project.currentStep = 4
  project.updatedAt = NOW

  return request(result, 200)
}

/** 导出核算结果明细（CSV），返回文件名与内容，由前端触发浏览器下载 */
export function exportPcfResult(
  projectId: string,
): Promise<{ filename: string; content: string }> {
  const latest = pcfCalcResultStore
    .filter((item) => item.projectId === projectId)
    .sort((a, b) => b.version - a.version)[0]
  if (!latest) throw new Error('暂无核算结果')

  const header = [
    '数据项名称',
    '所属阶段',
    '所属过程',
    '流向',
    '数量',
    '排放因子',
    '排放量(kgCO₂e)',
  ]
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`
  const lines = latest.details.map((d) =>
    [
      d.flowName,
      d.stage,
      d.processName,
      d.direction === 'input' ? '投入' : '产出',
      d.activityText,
      d.factorName,
      d.emission.toFixed(4),
    ]
      .map((v) => escape(String(v)))
      .join(','),
  )
  const content = [header.map(escape).join(','), ...lines].join('\n')
  const project = pcfProjectStore.find((item) => item.id === projectId)
  return request(
    { filename: `${project?.code ?? projectId}_核算结果明细.csv`, content },
    120,
  )
}

/* ---------- 步骤④ 核算清册（按口径导出：总表 + 每个最末级生命周期阶段一张表） ---------- */

/**
 * 清册口径：GWP 四分量（与竞品「影响评价指标」一一对应）——
 * 总量（不含生物源CO₂）/ 化石 / 生物源（不含CO₂）/ 直接土地利用变化。
 */
export type PcfInventoryCaliber = PcfCaliberKey

/** SpreadsheetML（Excel 2003 XML）单元格 */
interface SmCell {
  text: string
  type?: 'String' | 'Number'
  style?: string
  /** 数字格式（仅 Number 生效，如 `0.0000`） */
  format?: string
  /** 横向合并列数 − 1 */
  merge?: number
}

function smEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function smCellXml(cell: SmCell): string {
  const attrs = [
    cell.style ? `ss:StyleID="${cell.style}"` : '',
    cell.format ? `ss:Format="${cell.format}"` : '',
    cell.merge && cell.merge > 0 ? `ss:MergeAcross="${cell.merge}"` : '',
  ]
    .filter(Boolean)
    .join(' ')
  return `<Cell${attrs ? ` ${attrs}` : ''}><Data ss:Type="${cell.type ?? 'String'}">${smEscape(cell.text)}</Data></Cell>`
}

function smRowXml(cells: SmCell[]): string {
  if (cells.length === 0) return '<Row/>'
  return `<Row>${cells.map(smCellXml).join('')}</Row>`
}

/** 工作表名：剔除 Excel 非法字符并截断到 31 字符 */
function smSheetName(name: string): string {
  const cleaned = name.replace(/[\\/?*[\]:]/g, '-').trim().slice(0, 31)
  return cleaned || 'Sheet'
}

/** 单元格样式（细边框 / 表头底色 / 数字右对齐），与清册模板观感对齐 */
const SM_STYLES = `<Styles>
<Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Font ss:FontName="微软雅黑" ss:Size="10"/></Style>
<Style ss:ID="sTitle"><Font ss:FontName="微软雅黑" ss:Size="14" ss:Bold="1"/><Alignment ss:Vertical="Center"/></Style>
<Style ss:ID="sValue"><Font ss:FontName="微软雅黑" ss:Size="10"/><Alignment ss:Vertical="Center" ss:WrapText="1"/></Style>
<Style ss:ID="sLabel"><Font ss:FontName="微软雅黑" ss:Size="10" ss:Bold="1"/><Interior ss:Color="#F5F7FA" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9D9D9"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9D9D9"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9D9D9"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9D9D9"/></Borders></Style>
<Style ss:ID="sHead"><Font ss:FontName="微软雅黑" ss:Size="10" ss:Bold="1"/><Interior ss:Color="#E6F4FF" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BFBFBF"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BFBFBF"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BFBFBF"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BFBFBF"/></Borders></Style>
<Style ss:ID="sText"><Font ss:FontName="微软雅黑" ss:Size="10"/><Alignment ss:Vertical="Center" ss:WrapText="1"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9D9D9"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9D9D9"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9D9D9"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9D9D9"/></Borders></Style>
<Style ss:ID="sNum"><Font ss:FontName="微软雅黑" ss:Size="10"/><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9D9D9"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9D9D9"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9D9D9"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9D9D9"/></Borders></Style>
<Style ss:ID="sSum"><Font ss:FontName="微软雅黑" ss:Size="10" ss:Bold="1"/><Interior ss:Color="#FAFAFA" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BFBFBF"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BFBFBF"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BFBFBF"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BFBFBF"/></Borders></Style>
<Style ss:ID="sSumNum"><Font ss:FontName="微软雅黑" ss:Size="10" ss:Bold="1"/><Interior ss:Color="#FAFAFA" ss:Pattern="Solid"/><Alignment ss:Horizontal="Right" ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BFBFBF"/><Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BFBFBF"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BFBFBF"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BFBFBF"/></Borders></Style>
</Styles>`

function smSheetXml(name: string, columns: number[], rows: string[]): string {
  const cols = columns
    .map((width, index) => `<Column ss:Index="${index + 1}" ss:Width="${width}"/>`)
    .join('')
  return `<Worksheet ss:Name="${smEscape(smSheetName(name))}"><Table ss:DefaultRowHeight="16">${cols}${rows.join('')}</Table></Worksheet>`
}

/**
 * 导出**核算清册**（Excel 多工作表：`总表` + 每个最末级生命周期阶段一张表），按口径分别生成：
 * - 总表：产品 / 功能单位 / 系统边界 / 影响评价方法 / 影响评价指标 / 结果 + 各阶段排放与占比；
 * - 阶段表：生命周期过程 | 排放系数 | 背景数据来源 | 结果（kgCO₂e） | 占比（%）；
 * - 数据全部取自最近一次核算结果明细（步骤② 数据项 × 因子快照），不额外造数。
 */
export function exportPcfInventory(
  projectId: string,
  caliber: PcfInventoryCaliber = 'total',
): Promise<{ filename: string; content: string; mime: string }> {
  const project = pcfProjectStore.find((item) => item.id === projectId)
  if (!project) throw new Error('项目不存在或已被删除')
  const latest = pcfCalcResultStore
    .filter((item) => item.projectId === projectId)
    .sort((a, b) => b.version - a.version)[0]
  if (!latest) throw new Error('暂无核算结果，请先完成碳足迹核算')

  const caliberDef = PCF_CALIBERS.find((item) => item.key === caliber) ?? PCF_CALIBERS[0]
  const caliberText = caliberDef.label
  /** 清册数值格式：最多 8 位小数并去尾零（小量级行如 0.000144 不丢有效数字） */
  const fmt = (value: number) => {
    if (!Number.isFinite(value)) return '-'
    if (value === 0) return '0'
    return String(Number(value.toFixed(8)))
  }
  /** 行级口径值：优先取四分量明细；兼容无分量字段的历史结果 */
  const emissionOf = (d: PcfResultDetail): number => {
    if (d.emissionBreakdown) return d.emissionBreakdown[caliber]
    if (caliber === 'fossil') return d.fossilEmission ?? d.emission
    if (caliber === 'biogenic') return d.biogenicEmission ?? 0
    if (caliber === 'luluc') return d.lulucEmission ?? 0
    return d.emission
  }
  const factorTextOf = (d: PcfResultDetail) => {
    const value = d.factorCaliberValues
      ? d.factorCaliberValues[caliber]
      : caliber === 'total'
        ? d.factorValue
        : null
    if (value == null) return '-'
    return `${fmt(value)} ${d.factorUnit ?? ''}`.trim()
  }
  /** 清单合计（逐行相加，即该口径下的单位产品碳足迹） */
  const totalEmission = latest.details.reduce((sum, d) => sum + emissionOf(d), 0)
  const percentOf = (value: number) => (totalEmission > 0 ? (value / totalEmission) * 100 : 0)

  /** 最末级阶段顺序：步骤①纳入的一级阶段 → 其下二级阶段（无二级时一级本身即最末级） */
  const includedStages = (project.lifecycleStages ?? []).filter((s) => s.included)
  const lifecycleOrder: string[] = []
  includedStages
    .filter((s) => s.level === 1)
    .forEach((primary) => {
      const children = includedStages.filter((s) => s.level === 2 && s.parentName === primary.name)
      if (children.length > 0) children.forEach((child) => lifecycleOrder.push(`${primary.name}-${child.name}`))
      else lifecycleOrder.push(primary.name)
    })

  const groups = new Map<string, PcfResultDetail[]>()
  latest.details.forEach((d) => {
    const key = d.stagePath || d.stage
    const list = groups.get(key)
    if (list) list.push(d)
    else groups.set(key, [d])
  })
  const orderedPaths = [
    ...lifecycleOrder,
    ...[...groups.keys()].filter((key) => !lifecycleOrder.includes(key)),
  ]
  const stageTables = orderedPaths.map((path) => {
    const rows = (groups.get(path) ?? []).slice().sort((a, b) => emissionOf(b) - emissionOf(a))
    return { path, rows, emission: rows.reduce((sum, d) => sum + emissionOf(d), 0) }
  })

  /* ---- 总表 ---- */
  const summaryRows: string[] = []
  summaryRows.push(
    smRowXml([{ text: `${project.productName || project.name} 产品碳足迹核算清册`, style: 'sTitle', merge: 4 }]),
    smRowXml([{ text: `口径：${caliberText}`, style: 'sValue', merge: 4 }]),
  )
  const infoRows: Array<[string, string]> = [
    ['产品名称', [project.productName, project.productSpec].filter(Boolean).join(' ')],
    ['功能单位', `${project.functionalUnitValue ?? 1} ${project.functionalUnit}`],
    ['系统边界', boundaryLabelOf(project.boundary)],
    /** 与步骤⑤报告「五、影响评价」口径一致（IPCC 100 年 GWP，AR6 推荐值） */
    ['影响评价方法', 'IPCC 2021（GWP100）'],
    ['影响评价指标', caliberDef.indicatorCn],
    ['影响评价指标（英文）', caliberDef.indicator],
    [
      '结果（kgCO₂e）',
      `${fmt(totalEmission)} kgCO₂e / ${latest.unit}`,
    ],
    ['计算方法', '活动数据 × 排放因子'],
    ['统计时间', `${project.startDate} ~ ${project.endDate}`],
    ['结果版本', `V${latest.version}（${latest.calculatedAt}）`],
  ]
  infoRows.forEach(([label, value]) => {
    summaryRows.push(
      smRowXml([
        { text: label, style: 'sLabel' },
        { text: value, style: 'sValue', merge: 3 },
      ]),
    )
  })

  /* 说明：一份清册只对应一个影响评价指标口径（文件头已标注），不再在总表内罗列其他指标结果 */

  summaryRows.push(smRowXml([]))
  summaryRows.push(smRowXml([{ text: '各生命周期阶段排放及占比', style: 'sHead', merge: 4 }]))
  summaryRows.push(
    smRowXml([
      { text: '生命周期阶段', style: 'sHead' },
      { text: '排放量（kgCO₂e）', style: 'sHead' },
      { text: '占比（%）', style: 'sHead' },
      { text: '数据项', style: 'sHead' },
      { text: '备注', style: 'sHead' },
    ]),
  )
  stageTables.forEach((stage) => {
    summaryRows.push(
      smRowXml([
        { text: stage.path, style: 'sText' },
        { text: fmt(stage.emission), type: 'Number', style: 'sNum', format: '0.########' },
        { text: percentOf(stage.emission).toFixed(4), type: 'Number', style: 'sNum', format: '0.0000' },
        { text: String(stage.rows.length), type: 'Number', style: 'sNum', format: '0' },
        { text: stage.rows.length > 0 ? '' : '本期无数据项', style: 'sText' },
      ]),
    )
  })
  summaryRows.push(
    smRowXml([
      { text: '合计', style: 'sSum' },
      { text: fmt(totalEmission), type: 'Number', style: 'sSumNum', format: '0.########' },
      { text: totalEmission > 0 ? '100.0000' : '0.0000', type: 'Number', style: 'sSumNum', format: '0.0000' },
      { text: String(latest.details.length), type: 'Number', style: 'sSumNum', format: '0' },
      { text: caliberText, style: 'sSum' },
    ]),
  )

  /* ---- 每个最末级生命周期阶段一张表 ---- */
  const stageSheets = stageTables.map((stage) => {
    const rows: string[] = []
    rows.push(
      smRowXml([{ text: `${stage.path} 生命周期碳排放清单`, style: 'sTitle', merge: 4 }]),
      smRowXml([{ text: `影响评价指标：${caliberDef.indicatorCn}`, style: 'sValue', merge: 4 }]),
      smRowXml([{ text: `Impact indicator: ${caliberDef.indicator}`, style: 'sValue', merge: 4 }]),
      smRowXml([
        { text: '生命周期过程', style: 'sHead' },
        { text: '排放系数', style: 'sHead' },
        { text: '背景数据来源', style: 'sHead' },
        { text: '结果（kgCO₂e）', style: 'sHead' },
        { text: '占比（%）', style: 'sHead' },
      ]),
    )
    stage.rows.forEach((d) => {
      rows.push(
        smRowXml([
          { text: `${d.flowName}（${d.activityText}）`, style: 'sText' },
          { text: factorTextOf(d), style: 'sText' },
          { text: d.factorSource || '-', style: 'sText' },
          { text: fmt(emissionOf(d)), type: 'Number', style: 'sNum', format: '0.########' },
          { text: percentOf(emissionOf(d)).toFixed(4), type: 'Number', style: 'sNum', format: '0.0000' },
        ]),
      )
    })
    if (stage.rows.length === 0) {
      rows.push(smRowXml([{ text: '该最末级阶段本期无数据项', style: 'sText', merge: 4 }]))
    }
    rows.push(
      smRowXml([
        { text: '合计', style: 'sSum' },
        { text: '', style: 'sSum' },
        { text: '', style: 'sSum' },
        { text: fmt(stage.emission), type: 'Number', style: 'sSumNum', format: '0.########' },
        {
          text: totalEmission > 0 ? percentOf(stage.emission).toFixed(4) : '0.0000',
          type: 'Number',
          style: 'sSumNum',
          format: '0.0000',
        },
      ]),
    )
    return smSheetXml(stage.path, [220, 150, 300, 140, 90], rows)
  })

  const content =
    '<?xml version="1.0" encoding="UTF-8"?>\n<?mso-application progid="Excel.Sheet"?>\n' +
    `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40">` +
    SM_STYLES +
    smSheetXml('总表', [140, 300, 140, 100, 140], summaryRows) +
    stageSheets.join('') +
    '</Workbook>'

  return request(
    {
      filename: `${project.code || projectId}_碳足迹核算清册_${caliberText}_V${latest.version}.xls`,
      content,
      mime: 'application/vnd.ms-excel;charset=utf-8',
    },
    150,
  )
}

/* ---------- 步骤⑤ 报告生成与编辑（P26） ---------- */

let pcfReportStore: PcfReport[] = []

/** 系统预置报告模板（本期仅 1 个，`applicableBoundary = all`；后台模板配置本期未交付） */
const PCF_REPORT_TEMPLATES: PcfReportTemplate[] = [
  {
    templateId: 'RPT-PCF-001',
    templateName: '产品碳足迹报告（通用模板）',
    applicableBoundary: 'all',
    templateVersion: 'V1.0',
    isPreset: true,
    status: '启用',
  },
]

/** 报告模板选项（仅返回启用模板） */
export function fetchPcfReportTemplates(): Promise<PcfReportTemplate[]> {
  return request(
    PCF_REPORT_TEMPLATES.filter((item) => item.status === '启用'),
    120,
  )
}

/** 报告边界文案取「数据字典 · 系统边界」字典项名称（boundaryLabelOf） */

/** 保留 4 位小数（报告展示口径） */
function formatReportNumber(value: number): string {
  return value.toFixed(4).replace(/\.?0+$/, '')
}

/** 活动量描述拆分为「数量 / 单位」（如「0.692 kWh」） */
function splitActivityText(text: string): { qty: string; unit: string } {
  const index = text.lastIndexOf(' ')
  if (index < 0) return { qty: text || '-', unit: '' }
  return { qty: text.slice(0, index), unit: text.slice(index + 1) }
}

/** 说明性章节默认文案（模板预置，用户可改；《报告模板定义（系统预置V1）》§3） */
const REPORT_DEFAULT_TEXT = {
  purpose:
    '为产品碳足迹绩效追踪提供基础数据，支撑公司低碳发展战略制定与实施。满足供应链低碳信息披露需求，为客户提供产品环境影响相关信息。识别碳排放优化潜力，为后续工艺改进、节能减排措施制定提供数据支撑。',
  cutoff:
    '采用的取舍准则以 GB/T 24067《温室气体 产品碳足迹 量化要求和指南》中 6.3.5.3 为依据，具体规则如下：① 舍弃对产品碳足迹影响小于 1% 的单个环节；② 所有舍弃环节的总影响不超过产品碳足迹总量的 5%；③ 对碳排放贡献显著（贡献度不低于 80%）的单元过程均纳入核算范围，未进行舍弃。',
  dataSource:
    '初级数据：来源于企业生产系统直接监测数据、现场计量记录及统计报表，包括原材料消耗量、能源使用量、工艺排放数据等，数据收集覆盖关键生产环节。次级数据：来源于行业权威数据库及国家标准推荐排放因子，均经过第三方验证，符合数据质量要求。',
  dataQuality:
    '数据来源：初级数据来自企业内部实时监测系统及台账记录，可信度高；次级数据来源于行业公认数据库，经过权威机构验证。完整性：覆盖各生命周期阶段关键碳排放环节，无重大数据缺失。代表性：时间、地理、技术代表性均与核算边界匹配。准确性：通过物质平衡和能量平衡验证数据一致性，关键数据重复测量误差控制在 5% 以内。',
  resultNote: '',
}

/** 说明性章节定义（编码 → 标题 / 默认文案） */
const REPORT_SECTION_DEFS: Array<{ id: string; code: string; title: string; defaultText: string }> = [
  { id: 'S02', code: 'S02', title: '二、量化目的', defaultText: REPORT_DEFAULT_TEXT.purpose },
  { id: 'S03C', code: 'S03C', title: '三、量化范围 · 取舍准则', defaultText: REPORT_DEFAULT_TEXT.cutoff },
  { id: 'S04A', code: 'S04A', title: '四、清单分析 · 数据来源说明', defaultText: REPORT_DEFAULT_TEXT.dataSource },
  { id: 'S04D', code: 'S04D', title: '四、清单分析 · 数据质量评价', defaultText: REPORT_DEFAULT_TEXT.dataQuality },
  { id: 'S06A', code: 'S06A', title: '六、结果解释 · 结果说明', defaultText: REPORT_DEFAULT_TEXT.resultNote },
]

/** 项目最近一次核算结果（报告的数据来源） */
function latestCalcOf(projectId: string): PcfCalcResult | undefined {
  return pcfCalcResultStore
    .filter((item) => item.projectId === projectId)
    .sort((a, b) => b.version - a.version)[0]
}

/** 生成报告编号：`PCF-R-YYYYMMDDNNN`（生成日 + 当日 3 位顺序号，业务 PRD R-058） */
function nextReportNo(): string {
  const date = NOW.slice(0, 10).replace(/-/g, '')
  const seq = pcfReportStore.filter((item) => item.reportNo.startsWith(`PCF-R-${date}`)).length + 1
  return `PCF-R-${date}${String(seq).padStart(3, '0')}`
}

/** 按模板装配报告：system 章节取核算结果 / 项目信息，editable 章节取默认文案 */
function buildPcfReport(project: PcfProject, templateId: string): PcfReport {
  const template =
    PCF_REPORT_TEMPLATES.find((item) => item.templateId === templateId) ?? PCF_REPORT_TEMPLATES[0]
  const previous = pcfReportStore.find((item) => item.projectId === project.id)
  const result = latestCalcOf(project.id)
  const reportDate = NOW.slice(0, 10)

  const cover: PcfReportCover = {
    productName: project.productName,
    productSpec: project.productSpec,
    companyName: project.ownerOrg,
    reportNo: previous?.reportNo ?? nextReportNo(),
    reportDate,
    issuer: '',
    producerName: project.ownerOrg,
    address: '',
    legalPerson: '',
    contactPerson: '',
    contactPhone: '',
    companyProfile: '',
    productFunction: '',
    productIntro: '',
    productImage: '',
  }

  return {
    projectId: project.id,
    reportNo: cover.reportNo,
    reportType: project.boundary,
    status: 'reportEditing',
    templateId: template.templateId,
    templateName: template.templateName,
    templateVersion: template.templateVersion,
    generatedAt: NOW,
    cover,
    sections: REPORT_SECTION_DEFS.map((item) => ({
      id: item.id,
      code: item.code,
      title: item.title,
      type: 'editable',
      content: item.defaultText,
    })),
    system: {
      standard: `依据标准：${project.method || 'GB/T 24067《温室气体 产品碳足迹 量化要求和指南》'}`,
      unit: project.functionalUnit,
      boundaryText: boundaryLabelOf(project.boundary),
      period: `${project.startDate} 到 ${project.endDate}`,
      allocation:
        '优先通过过程细分避免分配，对可明确归属的单元过程直接计入对应环节；对无法避免的共享单元过程，基于物理关系（如质量比例）进行分配；无明确物理关系的共享过程，参考经济价值比例进行分配。',
      unitEmission: result?.unitEmission ?? 0,
      unitEmissionBreakdown: result?.unitEmissionBreakdown ?? [],
      totalEmission: result?.totalEmission ?? 0,
      resultVersion: result?.version ?? 0,
      stageSummary: result?.stageSummary ?? [],
      details: result?.details ?? [],
    },
    fileName: `${project.productName}_产品碳足迹报告_${reportDate.replace(/-/g, '')}.doc`,
    confirmedBy: '',
    confirmedAt: '',
    locked: false,
  }
}

/**
 * 装配报告草稿（生成前填写与预览用，**不落库**）：
 * 系统带出字段（产品名称 / 规格 / 生产者 / 报告编号）已填，手工补充字段留空待用户填写。
 */
function buildPcfReportDraft(project: PcfProject, templateId: string): PcfReportDraft {
  const built = buildPcfReport(project, templateId)
  return {
    cover: {
      ...built.cover,
      reportNo: '待生成',
      reportDate: '',
      issuer: '',
      address: '',
      legalPerson: '',
      contactPerson: '',
      contactPhone: '',
      companyProfile: '',
      productFunction: '',
      productIntro: '',
    },
    sections: built.sections.map((item) => ({ ...item })),
    system: built.system,
    fileName: `${project.productName}_产品碳足迹报告.doc`,
  }
}

/** 取生成报告前的草稿（业务 PRD R-052 前置信息收集）：准入 = 已存在核算结果 */
export function fetchPcfReportDraft(projectId: string, templateId: string): Promise<PcfReportDraft> {
  const project = pcfProjectStore.find((item) => item.id === projectId)
  if (!project) throw new Error('项目不存在或已被删除')
  if (!latestCalcOf(projectId)) throw new Error('请先完成核算')
  return request(buildPcfReportDraft(project, templateId), 150)
}

/** 写入 / 覆盖报告（单一当前版本，R-059） */
function upsertPcfReport(report: PcfReport): void {
  pcfReportStore = [report, ...pcfReportStore.filter((item) => item.projectId !== report.projectId)]
}

/** 取项目当前报告；项目处于报告阶段但尚无报告时按模板懒生成（原型演示口径） */
export function fetchPcfReport(projectId: string): Promise<PcfReport | null> {
  const project = pcfProjectStore.find((item) => item.id === projectId)
  if (!project) throw new Error('项目不存在或已被删除')

  let report = pcfReportStore.find((item) => item.projectId === projectId)
  if (!report && ['reportGenerating', 'reportEditing', 'done'].includes(project.status)) {
    report = buildPcfReport(project, PCF_REPORT_TEMPLATES[0].templateId)
    if (project.status === 'done') {
      report.status = 'done'
      report.locked = true
      report.confirmedBy = '李核算'
      report.confirmedAt = project.updatedAt
    }
    upsertPcfReport(report)
  }
  return request(report ?? null, 150)
}

/** 生成报告时随报告一并提交的填写内容（封面补充信息 + 说明性章节） */
export interface PcfReportGeneratePayload {
  cover?: Partial<PcfReportCover>
  /** 章节 id → 正文 */
  sections?: Record<string, string>
}

/**
 * 生成报告（业务 PRD R-052 / R-053）：
 * 准入 = 项目「已核算」且存在核算结果；「报告编制中」再次调用 = **重新生成（覆盖当前报告）**。
 * `payload` 为生成前用户填写的前置信息，随报告一并落库（系统带出字段不可覆盖）。
 */
export async function generatePcfReport(
  projectId: string,
  templateId: string = PCF_REPORT_TEMPLATES[0].templateId,
  payload?: PcfReportGeneratePayload,
): Promise<PcfReport> {
  const project = pcfProjectStore.find((item) => item.id === projectId)
  if (!project) throw new Error('项目不存在或已被删除')
  if (project.status === 'reportGenerating') throw new Error('报告生成中，请稍候')
  if (project.status !== 'calculated' && project.status !== 'reportEditing') {
    throw new Error('请先完成核算')
  }
  if (!latestCalcOf(projectId)) throw new Error('请先完成核算')

  project.status = 'reportGenerating'
  project.currentStep = 5
  project.updatedAt = NOW
  await new Promise((resolve) => setTimeout(resolve, 1200))

  const report = buildPcfReport(project, templateId)
  if (payload?.cover) {
    report.cover = {
      ...report.cover,
      ...payload.cover,
      productName: report.cover.productName,
      productSpec: report.cover.productSpec,
      companyName: report.cover.companyName,
      reportNo: report.cover.reportNo,
      producerName: report.cover.producerName,
      // productImage 为手工补充字段，允许随生成一并提交
    }
  }
  if (payload?.sections) {
    report.sections = report.sections.map((item) =>
      payload.sections![item.id] === undefined ? item : { ...item, content: payload.sections![item.id] },
    )
  }
  report.fileName = `${report.cover.productName}_产品碳足迹报告_${report.cover.reportDate.replace(/-/g, '')}.doc`
  upsertPcfReport(report)
  project.status = 'reportEditing'
  project.updatedAt = NOW
  return request(report, 200)
}

/** 继续「报告生成中」的报告任务（原型模拟异步）：进入步骤⑤ 时推进到「报告编制中」 */
export async function resumePcfReport(projectId: string): Promise<PcfReport> {
  const project = pcfProjectStore.find((item) => item.id === projectId)
  if (!project) throw new Error('项目不存在或已被删除')
  if (project.status !== 'reportGenerating') throw new Error('当前项目不在报告生成中')

  await new Promise((resolve) => setTimeout(resolve, 1600))
  const report = buildPcfReport(project, PCF_REPORT_TEMPLATES[0].templateId)
  upsertPcfReport(report)
  project.status = 'reportEditing'
  project.currentStep = 5
  project.updatedAt = NOW
  return request(report, 200)
}

/** 可编辑性校验（R-057 / R-064）：仅在「报告编制中」且未锁定时允许写入 */
function requireEditingReport(projectId: string): { project: PcfProject; report: PcfReport } {
  const project = pcfProjectStore.find((item) => item.id === projectId)
  if (!project) throw new Error('项目不存在或已被删除')
  const report = pcfReportStore.find((item) => item.projectId === projectId)
  if (!report) throw new Error('暂无报告')
  if (project.status !== 'reportEditing' || report.locked) throw new Error('当前报告不可编辑')
  return { project, report }
}

/** 保存封面 / 概况信息（系统带出字段不可覆盖） */
export async function savePcfReportCover(
  projectId: string,
  payload: Partial<PcfReportCover>,
): Promise<PcfReport> {
  const { project, report } = requireEditingReport(projectId)
  report.cover = {
    ...report.cover,
    ...payload,
    productName: report.cover.productName,
    productSpec: report.cover.productSpec,
    companyName: report.cover.companyName,
    reportNo: report.cover.reportNo,
    producerName: report.cover.producerName,
  }
  report.fileName = `${report.cover.productName}_产品碳足迹报告_${report.cover.reportDate.replace(/-/g, '')}.doc`
  project.updatedAt = NOW
  return request(report, 150)
}

/** 保存说明性章节内容 */
export async function updatePcfReportSection(
  projectId: string,
  sectionId: string,
  content: string,
): Promise<PcfReport> {
  const { project, report } = requireEditingReport(projectId)
  report.sections = report.sections.map((item) =>
    item.id === sectionId ? { ...item, content } : item,
  )
  project.updatedAt = NOW
  return request(report, 120)
}

/** 确认完成（R-063 / R-064）：校验通过后报告锁定、项目置「已完成」 */
export async function confirmPcfReport(projectId: string): Promise<PcfReport> {
  const project = pcfProjectStore.find((item) => item.id === projectId)
  if (!project) throw new Error('项目不存在或已被删除')
  const report = pcfReportStore.find((item) => item.projectId === projectId)
  if (!report) throw new Error('暂无报告')
  if (project.status !== 'reportEditing') throw new Error('当前报告不可确认完成')
  if (!report.cover.reportDate.trim()) throw new Error('请填写报告日期')
  const empty = report.sections.find((item) => !item.content.trim())
  if (empty) throw new Error(`请完善「${empty.title}」内容`)

  report.status = 'done'
  report.locked = true
  report.confirmedBy = '李核算'
  report.confirmedAt = NOW
  project.status = 'done'
  project.currentStep = 5
  project.updatedAt = NOW
  return request(report, 300)
}

/** 报告正文（doc 导出内容，原型用 HTML 承载；正式由服务端生成 doc） */
function buildReportDocHtml(report: PcfReport): string {
  const { cover, system } = report
  const textOf = (code: string) => report.sections.find((item) => item.code === code)?.content ?? ''
  const listRows = system.details
    .map((d) => {
      const { qty, unit } = splitActivityText(d.activityText)
      const emission = d.direction === 'output' && !d.emission ? '不重复计算' : formatReportNumber(d.emission)
      return `<tr><td>${d.processName}</td><td>${d.stage}</td><td>${d.direction === 'input' ? '投入' : '产出'}</td><td>${d.flowName}</td><td>${qty}</td><td>${unit}</td><td>${d.factorName || '—'}</td><td>${emission}</td></tr>`
    })
    .join('')
  const stageRows = [
    ...system.stageSummary.map(
      (s) =>
        `<tr><td>${s.stage}</td><td>${formatReportNumber(s.emission)}</td><td>${formatReportNumber(s.ratio)}</td></tr>`,
    ),
    `<tr><td>总计</td><td>${formatReportNumber(system.totalEmission)}</td><td>100</td></tr>`,
  ].join('')

  // 口径说明：清单按「数量」录入，故结果即「每 1 个声明单位」的单位产品碳足迹
  const resultSentence = `每声明单位（${system.unit}）碳足迹为 ${formatReportNumber(system.unitEmission)} kgCO₂e`
  const footprintSentence = `生命周期碳足迹为 ${formatReportNumber(system.unitEmission)} kgCO₂e / ${system.unit}`
  const stageUnit = `kgCO₂e/${system.unit}`

  return `<html><head><meta charset="utf-8"><title>${cover.productName} 产品碳足迹报告</title>
<style>body{font-family:"Microsoft YaHei",Arial,sans-serif;line-height:1.8;color:#222}
h1{text-align:center;font-size:20px}h2{font-size:15px;margin-top:18px}
table{width:100%;border-collapse:collapse;margin:8px 0;font-size:12px}
th,td{border:1px solid #999;padding:4px 6px;text-align:left}
p{margin:6px 0}</style></head><body>
<h1>${cover.productName} 碳足迹核算报告</h1>
<p style="text-align:center">产品名称：${cover.productName}　产品规格型号：${cover.productSpec}</p>
<p style="text-align:center">生产者名称：${cover.companyName}　报告编号：${cover.reportNo}</p>
<p style="text-align:center">出具报告机构：${cover.issuer || '——'}　日期：${cover.reportDate}</p>
<h2>一、概况</h2>
<p>1. 生产者信息</p>
<table><tr><th>生产者名称</th><td>${cover.producerName}</td></tr>
<tr><th>地址</th><td>${cover.address || '——'}</td></tr>
<tr><th>法定代表人</th><td>${cover.legalPerson || '——'}</td></tr>
<tr><th>授权人（联系人）</th><td>${cover.contactPerson || '——'}</td></tr>
<tr><th>联系电话</th><td>${cover.contactPhone || '——'}</td></tr>
<tr><th>企业概况</th><td>${cover.companyProfile || '——'}</td></tr></table>
<p>2. 产品信息</p>
<p>产品名称：${cover.productName}　产品功能：${cover.productFunction || '——'}</p>
<p>产品介绍：${cover.productIntro || '——'}</p>
<p>产品图片：${cover.productImage ? `<img src="${cover.productImage}" style="max-width:240px"/>` : '——'}</p>
<p>3. 量化方法：${system.standard}</p>
<h2>二、量化目的</h2><p>${textOf('S02')}</p>
<h2>三、量化范围</h2>
<p>1. 功能单位或声明单位：以 ${system.unit} 为功能单位或声明单位。</p>
<p>2. 系统边界：${system.boundaryText}</p>
<p>3. 取舍准则：${textOf('S03C')}</p>
<p>4. 时间范围：${system.period}</p>
<h2>四、清单分析</h2>
<p>1. 数据来源说明：${textOf('S04A')}</p>
<p>2. 分配原则与程序：${system.allocation}</p>
<p>3. 清单结果及计算</p>
<table><tr><th>所属过程</th><th>阶段</th><th>投入/产出</th><th>名称</th><th>数量</th><th>单位</th><th>排放因子</th><th>排放量 kgCO₂e</th></tr>${listRows}</table>
<p>4. 数据质量评价：${textOf('S04D')}</p>
<h2>五、影响评价</h2>
<p>1. 影响类型和特征化因子：一般选择 IPCC 给出的 100 年 GWP，采用 IPCC 第六次评估报告推荐值。</p>
<p>2. 产品碳足迹结果计算：${cover.productName} ${resultSentence}。</p>
<p>注：本报告清单数据以 1 个声明单位计（数量口径）。</p>
<h2>六、结果解释</h2>
<p>${textOf('S06A')}</p>
<p>${cover.companyName} 生产的 ${cover.productName}，系统边界为 ${system.boundaryText}，${footprintSentence}。各生命周期阶段排放情况如下：</p>
<table><tr><th>生命周期阶段</th><th>碳足迹（${stageUnit}）</th><th>百分比/%</th></tr>${stageRows}</table>
<p>注：图 2 各生命周期阶段碳排放分布图（本期占位）。</p>
</body></html>`
}

/** 导出报告（doc），返回文件名与内容，由前端触发浏览器下载 */
export function exportPcfReport(projectId: string): Promise<{ filename: string; content: string }> {
  const report = pcfReportStore.find((item) => item.projectId === projectId)
  if (!report) throw new Error('暂无报告')
  return request({ filename: report.fileName, content: buildReportDocHtml(report) }, 150)
}

/* ===================== 演示数据说明 ===================== */

/**
 * 演示数据**静态固化在 `./data.ts`**，不在运行时生成：
 *
 * - `pcfProjectSeed`：PJ01（摇篮到大门）+ PJ02（摇篮到坟墓），步骤① 目标与范围字段齐备；
 * - `pcfStageDataSeed`：两个项目的步骤② 阶段数据项（「数量」口径，已匹配排放因子）；
 * - `pcfCheckStore`（见上）：两个项目的步骤③ 检测结果均预置为「已通过」；
 * - 步骤④ 核算结果与步骤⑤ 报告**由页面操作实时产出**（点「开始核算」→「生成报告」），
 *   不做静态预置，以保证结果与引擎当前口径始终一致。
 *
 * 说明：早期版本曾为 PJ04–PJ10 在运行时「造」填报数据（走已废弃的
 * 「产品工艺 → 工序 → 投入产出项」路径，与引擎读取的「阶段数据项」脱节），
 * 该演示逻辑已随 `pcfProjectSeed` 精简一并移除。
 */

/* ===================== 模型管理（前后台 · 模型库） ===================== */

/** 平台模型（后台维护） */
let modelStore: CarbonModel[] = clone(modelSeed)
/** 我的模型（前台组织级：manual 自己新增 + collected 收藏副本） */
let myModelStore: MyModel[] = clone(myModelSeed)

/** 模型内容载入 Payload（后台模型 / 我的模型共用；不含状态与审计字段） */
export interface ModelPayload {
  name: string
  /** 产品信息（与产品核算步骤①「产品」面板一致） */
  productName: string
  productSpec: string
  productIndustry: string
  functionalUnitValue: string
  functionalUnit: string
  /** 产品图片（**必填**，data URL） */
  productImageUrl: string
  categoryId: string
  industries: string[]
  standardId: string
  boundary: PcfBoundary
  lifecycleStages: PcfLifecycleStage[]
  items: ModelDataItem[]
  nodes: ModelProcessNode[]
  remark: string
}

let modelSeq = 0
function nextModelId(): string {
  modelSeq += 1
  return `MDL${String(Date.now()).slice(-6)}${String(modelSeq).padStart(2, '0')}`
}
function nextModelCode(): string {
  const max = modelStore.reduce((acc, item) => {
    const num = Number(item.code.replace(/[^0-9]/g, ''))
    return Number.isFinite(num) ? Math.max(acc, num) : acc
  }, 0)
  return `MDL-${String(max + 1).padStart(3, '0')}`
}
let myModelSeq = 0
function nextMyModelId(): string {
  myModelSeq += 1
  return `MYM${String(Date.now()).slice(-6)}${String(myModelSeq).padStart(2, '0')}`
}
function nextMyModelCode(): string {
  const max = myModelStore.reduce((acc, item) => {
    const num = Number(item.code.replace(/[^0-9]/g, ''))
    return Number.isFinite(num) ? Math.max(acc, num) : acc
  }, 0)
  return `MYM-${String(max + 1).padStart(3, '0')}`
}

/** 模型内容校验：名称 / 产品名称 / 产品图片 / 产品分类 / 核算标准 / 系统边界必填，且标准须为「现行」 */
function validateModelPayload(payload: ModelPayload): void {
  if (!payload.name.trim()) throw new Error('请填写模型名称')
  if (!payload.productName.trim()) throw new Error('请填写产品名称')
  if (!payload.productImageUrl) throw new Error('请上传产品图片')
  if (!payload.categoryId) throw new Error('请选择产品分类')
  if (!payload.standardId) throw new Error('请选择核算标准')
  const standard = standardStore.find((item) => item.id === payload.standardId)
  if (!standard) throw new Error('核算标准不存在')
  if (standard.status !== '现行') throw new Error('核算标准须为「现行」状态')
  if (!payload.boundary) throw new Error('请选择系统边界')
}

/** 归一化模型内容（核算标准以标准号落库快照；数组深拷贝避免共享引用） */
function normalizeModelContent(payload: ModelPayload): {
  name: string
  productName: string
  productSpec: string
  productIndustry: string
  functionalUnitValue: string
  functionalUnit: string
  productImageUrl: string
  categoryId: string
  industries: string[]
  standardId: string
  standardName: string
  boundary: PcfBoundary
  lifecycleStages: PcfLifecycleStage[]
  items: ModelDataItem[]
  nodes: ModelProcessNode[]
  remark: string
} {
  const standard = standardStore.find((item) => item.id === payload.standardId) as StandardItem
  return {
    name: payload.name.trim(),
    productName: payload.productName.trim(),
    productSpec: payload.productSpec.trim(),
    productIndustry: payload.productIndustry,
    functionalUnitValue: payload.functionalUnitValue.trim() || '1',
    functionalUnit: payload.functionalUnit,
    productImageUrl: payload.productImageUrl,
    categoryId: payload.categoryId,
    industries: [...payload.industries],
    standardId: payload.standardId,
    standardName: standard.code,
    boundary: payload.boundary,
    lifecycleStages: clone(payload.lifecycleStages),
    items: clone(payload.items),
    nodes: clone(payload.nodes),
    remark: payload.remark.trim(),
  }
}

/* ---------- 后台 · 平台模型 ---------- */

/** 后台 · 模型列表（更新时间倒序） */
export function fetchModels(): Promise<CarbonModel[]> {
  return request([...modelStore].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))
}

/** 后台 · 模型详情 */
export function fetchModel(id: string): Promise<CarbonModel> {
  const model = modelStore.find((item) => item.id === id)
  if (!model) throw new Error('模型不存在')
  return request(model)
}

/** 后台 · 新建模型（默认草稿） */
export function createModel(payload: ModelPayload): Promise<CarbonModel> {
  validateModelPayload(payload)
  const model: CarbonModel = {
    id: nextModelId(),
    code: nextModelCode(),
    scope: 'platform',
    status: 'draft',
    maintainer: '平台运营',
    createdBy: '当前用户',
    createdAt: NOW,
    updatedAt: NOW,
    ...normalizeModelContent(payload),
  }
  modelStore = [model, ...modelStore]
  return request(model)
}

/** 后台 · 编辑模型（已发布需先停用） */
export function updateModel(id: string, payload: ModelPayload): Promise<CarbonModel> {
  const target = modelStore.find((item) => item.id === id)
  if (!target) throw new Error('模型不存在')
  if (target.status === 'published') throw new Error('已发布模型不可直接编辑，请先停用后再编辑')
  validateModelPayload(payload)
  const next: CarbonModel = { ...target, ...normalizeModelContent(payload), updatedAt: NOW }
  modelStore = modelStore.map((item) => (item.id === id ? next : item))
  return request(next)
}

/** 后台 · 删除模型（仅草稿 / 已停用可删） */
export function deleteModel(id: string): Promise<void> {
  const target = modelStore.find((item) => item.id === id)
  if (!target) throw new Error('模型不存在')
  if (target.status === 'published') throw new Error('已发布模型不可删除，请先停用')
  modelStore = modelStore.filter((item) => item.id !== id)
  return new Promise<void>((resolve) => setTimeout(resolve, 260))
}

/** 后台 · 发布模型（草稿 / 已停用 → 已发布，前台模型库可见） */
export function publishModel(id: string): Promise<CarbonModel> {
  const target = modelStore.find((item) => item.id === id)
  if (!target) throw new Error('模型不存在')
  if (target.status === 'published') throw new Error('模型已处于发布状态')
  const next: CarbonModel = { ...target, status: 'published', publishedAt: NOW, updatedAt: NOW }
  modelStore = modelStore.map((item) => (item.id === id ? next : item))
  return request(next)
}

/** 后台 · 停用模型（已发布 → 已停用，前台不可见） */
export function disableModel(id: string): Promise<CarbonModel> {
  const target = modelStore.find((item) => item.id === id)
  if (!target) throw new Error('模型不存在')
  if (target.status !== 'published') throw new Error('仅已发布模型可停用')
  const next: CarbonModel = { ...target, status: 'disabled', updatedAt: NOW }
  modelStore = modelStore.map((item) => (item.id === id ? next : item))
  return request(next)
}

/** 后台 · 重新启用模型（已停用 → 已发布） */
export function enableModel(id: string): Promise<CarbonModel> {
  const target = modelStore.find((item) => item.id === id)
  if (!target) throw new Error('模型不存在')
  if (target.status !== 'disabled') throw new Error('仅已停用模型可重新启用')
  const next: CarbonModel = { ...target, status: 'published', publishedAt: NOW, updatedAt: NOW }
  modelStore = modelStore.map((item) => (item.id === id ? next : item))
  return request(next)
}

/* ---------- 前台 · 模型库（只读） ---------- */

/** 前台 · 模型库列表（仅「已发布」） */
export function fetchPublishedModels(): Promise<CarbonModel[]> {
  return request(
    [...modelStore].filter((item) => item.status === 'published').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  )
}

/** 前台 · 模型库详情（仅「已发布」） */
export function fetchPublishedModel(id: string): Promise<CarbonModel> {
  const model = modelStore.find((item) => item.id === id && item.status === 'published')
  if (!model) throw new Error('模型不存在或未发布')
  return request(model)
}

/* ---------- 前台 · 我的模型 ---------- */

/** 我的模型列表（更新时间倒序） */
export function fetchMyModels(): Promise<MyModel[]> {
  return request([...myModelStore].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))
}

/** 我的模型详情 */
export function fetchMyModel(id: string): Promise<MyModel> {
  const model = myModelStore.find((item) => item.id === id)
  if (!model) throw new Error('模型不存在')
  return request(model)
}

/** 新建我的模型（来源 = 自己新增） */
export function createMyModel(payload: ModelPayload): Promise<MyModel> {
  validateModelPayload(payload)
  const model: MyModel = {
    id: nextMyModelId(),
    code: nextMyModelCode(),
    scope: 'org',
    origin: 'manual',
    updatedAt: NOW,
    ...normalizeModelContent(payload),
  }
  myModelStore = [model, ...myModelStore]
  return request(model)
}

/** 编辑我的模型（收藏副本为只读，不可编辑） */
export function updateMyModel(id: string, payload: ModelPayload): Promise<MyModel> {
  const target = myModelStore.find((item) => item.id === id)
  if (!target) throw new Error('模型不存在')
  if (target.origin === 'collected') throw new Error('收藏副本为只读，不可编辑')
  validateModelPayload(payload)
  const next: MyModel = { ...target, ...normalizeModelContent(payload), updatedAt: NOW }
  myModelStore = myModelStore.map((item) => (item.id === id ? next : item))
  return request(next)
}

/** 删除我的模型 */
export function deleteMyModel(id: string): Promise<void> {
  if (!myModelStore.some((item) => item.id === id)) throw new Error('模型不存在')
  myModelStore = myModelStore.filter((item) => item.id !== id)
  return new Promise<void>((resolve) => setTimeout(resolve, 260))
}

/**
 * 收藏平台模型 → 我的模型。
 * **复制式快照**（不与源模型联动），来源记为 `collected`，仅允许只读预览。
 */
export function collectModelToMy(modelId: string): Promise<MyModel> {
  const source = modelStore.find((item) => item.id === modelId)
  if (!source) throw new Error('模型不存在')
  if (source.status !== 'published') throw new Error('仅已发布模型可收藏')
  const model: MyModel = {
    id: nextMyModelId(),
    code: nextMyModelCode(),
    scope: 'org',
    origin: 'collected',
    name: `${source.name}（收藏）`,
    productName: source.productName,
    productSpec: source.productSpec,
    productIndustry: source.productIndustry,
    functionalUnitValue: source.functionalUnitValue,
    functionalUnit: source.functionalUnit,
    productImageUrl: source.productImageUrl,
    categoryId: source.categoryId,
    industries: [...source.industries],
    standardId: source.standardId,
    standardName: source.standardName,
    boundary: source.boundary,
    lifecycleStages: clone(source.lifecycleStages),
    items: clone(source.items),
    nodes: clone(source.nodes),
    remark: `收藏自平台模型库（${source.code}），复制式快照、只读预览。`,
    updatedAt: NOW,
    sourceModelId: source.id,
    sourceModelName: source.name,
  }
  myModelStore = [model, ...myModelStore]
  return request(model)
}

/* ---------- PCF 集成：新建核算引用模型 ---------- */

/** PCF 新建核算的模型候选项（平台已发布模型 + 我的模型） */
export function fetchPcfModelOptions(): Promise<PcfModelOption[]> {
  const toOption = (model: CarbonModel | MyModel, source: 'platform' | 'my'): PcfModelOption => ({
    id: model.id,
    code: model.code,
    name: model.name,
    source,
    standardId: model.standardId,
    standardName: model.standardName,
    categoryId: model.categoryId,
    industries: [...model.industries],
    boundary: model.boundary,
    stageCount: model.lifecycleStages.filter((stage) => stage.included).length,
    itemCount: model.items.length,
    updatedAt: model.updatedAt,
    origin: source === 'my' ? (model as MyModel).origin : undefined,
  })
  const platform = modelStore.filter((item) => item.status === 'published').map((item) => toOption(item, 'platform'))
  const mine = myModelStore.map((item) => toOption(item, 'my'))
  return request([...platform, ...mine])
}

/** PCF 引用模型的解析结果（新建核算时带入草稿的「目标与范围」） */
export interface PcfSourceModel {
  id: string
  code: string
  name: string
  source: 'platform' | 'my'
  standardId: string
  standardName: string
  boundary: PcfBoundary
  categoryId: string
  industries: string[]
  lifecycleStages: PcfLifecycleStage[]
}

/** 按模型 id 解析可引用模型（先查平台已发布，再查我的模型） */
export function fetchPcfSourceModel(id: string): Promise<PcfSourceModel> {
  const resolve = (model: CarbonModel | MyModel, source: 'platform' | 'my'): PcfSourceModel => ({
    id: model.id,
    code: model.code,
    name: model.name,
    source,
    standardId: model.standardId,
    standardName: model.standardName,
    boundary: model.boundary,
    categoryId: model.categoryId,
    industries: [...model.industries],
    lifecycleStages: clone(model.lifecycleStages),
  })
  const platform = modelStore.find((item) => item.id === id && item.status === 'published')
  if (platform) return request(resolve(platform, 'platform'))
  const mine = myModelStore.find((item) => item.id === id)
  if (mine) return request(resolve(mine, 'my'))
  throw new Error('模型不存在或不可用')
}

/**
 * 引用即复制：把模型的数据项 / 过程节点复制进核算项目。
 * 在项目步骤①保存落库后调用（草稿阶段不落库，沿用现有口径）。
 */
export function applyModelToProject(projectId: string, modelId: string): Promise<void> {
  const model = modelStore.find((item) => item.id === modelId) ?? myModelStore.find((item) => item.id === modelId)
  if (!model) throw new Error('模型不存在')
  const idMap = new Map<string, string>()
  const items: PcfStageDataItem[] = model.items.map((item, index) => {
    const nextId = `${projectId}-MD-${String(index + 1).padStart(2, '0')}`
    idMap.set(item.id, nextId)
    return { ...clone(item), id: nextId, projectId }
  })
  const nodes: PcfProcessNode[] = model.nodes.map((node, index) => ({
    ...clone(node),
    id: `${projectId}-MN-${String(index + 1).padStart(2, '0')}`,
    projectId,
    sourceItemId: node.sourceItemId ? idMap.get(node.sourceItemId) ?? null : null,
  }))
  pcfStageDataStore = [...pcfStageDataStore.filter((item) => item.projectId !== projectId), ...items]
  pcfProcessNodeStore = [...pcfProcessNodeStore.filter((node) => node.projectId !== projectId), ...nodes]
  return new Promise<void>((resolve) => setTimeout(resolve, 260))
}
