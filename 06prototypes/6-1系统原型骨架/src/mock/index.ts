import type {
  CalcFormula,
  CategoryItem,
  CategoryLevel,
  DataOwnerType,
  EmissionCategory,
  EnableStatus,
  EnergyItem,
  EnergyOption,
  EnergyType,
  FactorCategory,
  FactorDetail,
  FactorItem,
  FactorReferenceItem,
  FactorSource,
  FlowFormulaDisposal,
  FlowItemType,
  FormulaFactor,
  FormulaType,
  IndustryItem,
  IndustryLevel,
  LifecycleInclusion,
  LifecycleLevel,
  LifecycleStageItem,
  MaterialFlowType,
  MaterialItem,
  MaterialOption,
  MaterialSubCategory,
  MyProductBatchFailure,
  MyProductBatchResult,
  MyProductItem,
  MyProductSource,
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
  ProductUseStatus,
  PcfBoundary,
  PcfActivityData,
  PcfActivityValue,
  PcfCalcResult,
  PcfCalcSourceType,
  PcfCheckIssue,
  PcfCheckResult,
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
  PcfResultDetail,
  PcfStandardOption,
  UnitDetail,
  UnitItem,
  UnitReferenceItem,
  UnitType,
} from '@/types'
import { parseCsvText, toCsv } from '@/shared/utils/csv'
import {
  calcFormulaSeed,
  categorySeed,
  energyOptions,
  energySeed,
  factorReferenceSeed,
  factorSeed,
  industryOptions,
  industrySeed,
  lifecycleOptions,
  lifecycleSeed,
  materialOptions,
  materialSeed,
  operationSeed,
  operationTemplates,
  pcfActivitySeed,
  pcfCalcResultSeed,
  pcfDemoOperationSeed,
  pcfOperationSeed,
  pcfOrgOptionSeed,
  pcfProjectSeed,
  pcfStandardOptionSeed,
  pcfWeightUnitOptions,
  processSeed,
  processTemplates,
  productSeed,
  unitOptions,
  unitReferenceSeed,
  unitSeed,
} from './data'

/** 我的产品库（前台 P27）类型转发：页面从 `@/mock` 一处取数 */
export type { MyProductBatchFailure, MyProductBatchResult, MyProductItem, MyProductSource } from '@/types'

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
/** 行业库：轻量行业字典（两级分类，启用 ↔ 禁用双向可达） */
let industryStore: IndustryItem[] = clone(industrySeed)
/** 排放因子库：核算模型域对象，**有版本化 + 有效期**（与基础库「无版本化」口径不同） */
let factorStore: FactorItem[] = clone(factorSeed)
/** 计算引擎配置 · 计算公式：轻量配置对象（不做审核与版本化，启用 / 禁用走行操作） */
let calcFormulaStore: CalcFormula[] = clone(calcFormulaSeed)

/** 「排放项 → 标准公式」系统默认带出规则（按流名称关键词匹配，自上而下首个命中生效） */
const FLOW_FORMULA_RULES: Array<{ pattern: RegExp; formulaCode: string; basis: string }> = [
  { pattern: /运输|货运|物流/, formulaCode: 'FM-002', basis: '流名称含「运输」→ 运输 t·km 法' },
  { pattern: /蒸汽|热力|热水|采暖/, formulaCode: 'FM-004', basis: '含「蒸汽 / 热力」→ 净外购热力法' },
  { pattern: /天然气|柴油|汽油|燃煤|燃料|燃气|液化气/, formulaCode: 'FM-003', basis: '含「燃料」→ 燃料燃烧（碳平衡）法' },
  { pattern: /制冷剂|冷媒|R\d{3}/i, formulaCode: 'FM-005', basis: '含「制冷剂」→ 制冷剂泄漏法' },
  { pattern: /回收|再生|回用/, formulaCode: 'FM-007', basis: '含「回收」→ 回收信用法（负项）' },
  { pattern: /末期|废弃|填埋|焚烧|处置/, formulaCode: 'FM-006', basis: '含「末期处理 / 废弃」→ 末期处理法' },
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

/** 工序库投入产出项：按流类型 + 名称带出默认公式（保留用户覆盖） */
function decorateOperationFlow(flow: OperationFlowItem): OperationFlowItem {
  return { ...flow, ...resolveFlowFormula(flow.flowType, flow.refName, flow.formulaId, flow.disposal) }
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

/** 由上级分类推导分类层级（【待确认 Q01】联动口径） */
export function deriveLevel(parentId: string | null): CategoryLevel {
  if (!parentId) return 1
  const parent = categoryStore.find((c) => c.id === parentId)
  if (!parent) return 1
  return Math.min(parent.level + 1, 3) as CategoryLevel
}

export function fetchCategories(): Promise<CategoryItem[]> {
  return request(categoryStore)
}

export async function createCategory(payload: CategoryPayload): Promise<CategoryItem> {
  if (categoryStore.some((c) => c.code === payload.code)) {
    throw new Error('分类编码已存在，请修改后重试')
  }
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
  target.code = payload.code
  target.name = payload.name
  target.parentId = payload.parentId
  target.level = deriveLevel(payload.parentId)
  target.sortNo = payload.sortNo
  target.remark = payload.remark
  target.updatedAt = NOW
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
  /** 产品图片（选填，data URL） */
  imageUrl: string
  description: string
  processes: ProductProcessItem[]
}

/** 计量单位选项（Mock 引用计量单位库 A1-9） */
export function fetchUnitOptions(): Promise<string[]> {
  return request(unitOptions, 120)
}

/** 行业选项（Mock 引用行业库 A1-4） */
export function fetchIndustryOptions(): Promise<string[]> {
  return request(industryOptions, 120)
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
  if (processes.length === 0) {
    throw new Error('组合校验未通过：产品至少需要 1 个工艺流程（D05）')
  }
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

/* ===================== 我的产品库（前台业务平台 · P27，组织自建） ===================== */

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
    categoryId: 'C01',
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
    /* 同一生命周期阶段只绑定一个工艺流程（2026-09-29）：包装工序并入「竹筷成型工艺 / 生产制造」 */
    processes: [
      {
        id: 'MP01-PR1',
        processCode: 'GY-01',
        processName: '竹筷成型工艺',
        lifecycleStage: '生产制造',
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
let myProductStore: MyProductItem[] = clone(myProductSeed)
/** 已引用的平台级产品 id（引用 = 只读指向，**不落库**，PRD Q02 建议口径；演示数据引用 P-2026-001） */
let myProductRefIds: string[] = ['P01']

/** 引用标准产品投影：平台级产品 + 来源二态只读包装（上下架随后台） */
function projectReferenced(product: ProductItem): MyProductItem {
  return { ...product, source: 'referenced', sourceProductId: product.id }
}

/** 投入产出流公式默认带出（与后台产品信息库同规则） */
function decorateMyProduct(item: MyProductItem): MyProductItem {
  return { ...item, ...decorateProduct(item) }
}

export function fetchMyProducts(): Promise<MyProductItem[]> {
  const custom = myProductStore.map(decorateMyProduct).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  const referenced = myProductRefIds
    .map((id) => productStore.find((p) => p.id === id))
    .filter((p): p is ProductItem => !!p)
    .map((p) => decorateMyProduct(projectReferenced(p)))
  return request([...custom, ...referenced])
}

export async function fetchMyProduct(id: string): Promise<MyProductItem> {
  const custom = myProductStore.find((p) => p.id === id)
  if (custom) return request(decorateMyProduct(custom))
  if (myProductRefIds.includes(id)) {
    const platform = productStore.find((p) => p.id === id)
    if (platform) return request(decorateMyProduct(projectReferenced(platform)))
  }
  throw new Error('产品不存在或已被删除')
}

/**
 * 操作日志：组织自建产品返回日志；**引用标准产品为只读项，无本组织操作日志**（业务 PRD C4）。
 */
export async function fetchMyProductLogs(id: string): Promise<OperationLogItem[]> {
  const target = myProductStore.find((p) => p.id === id)
  if (!target) return request([])
  const logs: OperationLogItem[] = [
    {
      id: `${id}-created`,
      time: target.createdAt,
      operator: target.createdBy,
      action: '新建产品',
      detail: `产品来源 = 自己新增；产品编码 ${target.code}；工艺 ${target.processes.length} 个`,
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
  if (!target) throw new Error('仅「自己新增」的组织自建产品可编辑（引用标准产品只读）')
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

/** 上架 / 下架（**仅组织自建产品**；引用标准产品上下架随后台，本模块只读） */
export async function updateMyProductUseStatus(id: string, useStatus: ProductUseStatus): Promise<MyProductItem> {
  const target = myProductStore.find((p) => p.id === id)
  if (!target) throw new Error('引用标准产品的上下架由后台产品信息库控制，本模块只读')
  target.useStatus = useStatus
  target.updatedAt = NOW
  return request(target)
}

/** 删除（仅「自己新增 且 未被核算项目引用」；引用标准产品为只读项，不可删除） */
export async function deleteMyProduct(id: string): Promise<void> {
  const target = myProductStore.find((p) => p.id === id)
  if (!target) throw new Error('引用标准产品为只读项，不可删除')
  const refCount = pcfProjectSeed.filter((project) => project.refProductId === id).length
  if (refCount > 0) {
    throw new Error(`该产品已被 ${refCount} 个核算项目引用，不可删除（项目侧快照保护）`)
  }
  myProductStore = myProductStore.filter((p) => p.id !== id)
  return request(undefined)
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
  /** 排放项公式（**公式下沉到工序投入产出项**）：空 = 系统默认带出 */
  formulaId: string
  /** 是否参与计算 */
  disposal: FlowFormulaDisposal
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
  return request(
    operationStore.map((op) => ({
      ...op,
      inputs: op.inputs.map(decorateOperationFlow),
      outputs: op.outputs.map(decorateOperationFlow),
    })),
  )
}

export async function fetchOperation(id: string): Promise<OperationItem> {
  const target = operationStore.find((o) => o.id === id)
  if (!target) throw new Error('工序不存在或已被删除')
  return request({
    ...target,
    inputs: target.inputs.map(decorateOperationFlow),
    outputs: target.outputs.map(decorateOperationFlow),
  })
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
    formulaId: row.formulaId ?? '',
    formulaCode: '',
    formulaName: '',
    formulaExpression: '',
    disposal: row.disposal ?? 'formula',
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
  baseQty: number | null
  baseUnit: string
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
    baseQty: payload.baseQty,
    baseUnit: payload.baseUnit,
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
  target.baseQty = payload.baseQty
  target.baseUnit = payload.baseUnit
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
  /** 适用行业（多选，引用行业库 A1-4）；为空 = 全行业通用（D06） */
  industries: string[]
  gateRule: LifecycleInclusion
  graveRule: LifecycleInclusion
}

/**
 * 阶段主数据校验（§4 结构与基线规则 + §6 业务规则）：
 * - 编码必填且唯一（R-001 / D01）；
 * - 名称必填且**同级内唯一**（R-002 / D04）；
 * - 层级仅一级 / 二级，**二级必选上级阶段且上级必须为一级阶段**（R-003 / D02 / D03）；
 * - 阶段顺序为 1～99 整数，**同级内不重复**（R-004 / D05）；
 * - 两个边界的纳入规则必须取三态之一，不允许留空（R-006 / D10）。
 */
function assertLifecycle(payload: LifecycleStagePayload, id: string | null): void {
  const code = payload.code.trim()
  const name = payload.name.trim()

  if (!code) throw new Error('保存失败：阶段编码必填（R-001 / D01）')
  if (!name) throw new Error('保存失败：阶段名称必填')
  if (!payload.gateRule) throw new Error('保存失败：「摇篮到大门纳入规则」必填（R-006 / D10）')
  if (!payload.graveRule) throw new Error('保存失败：「摇篮到坟墓纳入规则」必填（R-006 / D10）')

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
    industries: [...payload.industries],
    gateRule: payload.gateRule,
    graveRule: payload.graveRule,
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
  target.industries = [...payload.industries]
  target.gateRule = payload.gateRule
  target.graveRule = payload.graveRule
  target.updatedBy = '当前用户'
  target.updatedAt = NOW
  return request(target)
}

/** 启用 / 禁用：**双向可达、无前置约束**（不设数据来源与引用状态，与物料库 / 能源库一致） */
export async function updateLifecycleStageStatus(id: string, status: EnableStatus): Promise<LifecycleStageItem> {
  const target = lifecycleStore.find((item) => item.id === id)
  if (!target) throw new Error('生命周期阶段不存在或已被删除')
  target.status = status
  target.updatedBy = '当前用户'
  target.updatedAt = NOW
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
  /** 上级行业 id：**只能指向一级行业**；为空 = 一级行业 */
  parentId: string | null
  sortNo: number | null
  description: string
}

/** 由「上级行业」推导行业层级（与产品分类 `deriveLevel` 同口径） */
export function deriveIndustryLevel(parentId: string | null): IndustryLevel {
  if (!parentId) return 1
  const parent = industryStore.find((item) => item.id === parentId)
  return parent && parent.level === 1 ? 2 : 1
}

/**
 * 行业主数据校验：
 * - 名称必填且**同级内唯一**；
 * - 编码必填且**唯一**；
 * - 层级仅两级：上级必须为一级行业、不得自引用；
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
    if (parent.level !== 1) throw new Error('保存失败：上级行业必须为一级行业，本模块仅支持两级')
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

/** 适用行业选项（引用行业库 A1-4；取启用状态的行业名称） */
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
  category: FactorCategory
  industries: string[]
  scenario: string
  value: number
  numeratorUnit: string
  denominatorUnit: string
  sourceCategory: string
  publishYear: string
  publishDate: string
  publisherRegion: string
  publisherFullName: string
  publisherShortName: string
  dataSourceFile: string
  description: string
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
 * 因子主数据校验（对齐竞品必填项 + 业务 PRD §6）：
 * - 因子名称 / 适用行业 / 适用场景 / 因子值 / 活动数据单位 必填；
 * - 来源类别 / 发布年份 / 发布国家组织 / 发布机构全称 必填；
 * - 分类 = 生物碳因子时数值可为负，其余必须为正；
 * - 描述 ≤ 500 字符。
 */
function assertFactor(payload: FactorPayload): void {
  if (!payload.name.trim()) throw new Error('保存失败：因子名称必填')
  if (!payload.category) throw new Error('保存失败：因子分类必填')
  if (payload.industries.length === 0) throw new Error('保存失败：适用行业必填（至少选择 1 项）')
  if (!payload.scenario.trim()) throw new Error('保存失败：适用场景不能为空')
  if (!payload.numeratorUnit) throw new Error('保存失败：单位必填')
  if (!payload.denominatorUnit) throw new Error('保存失败：请选择活动数据单位')

  if (payload.category === 'biocarbon') {
    if (Number.isNaN(payload.value) || payload.value === 0) throw new Error('保存失败：因子值不能为空')
  } else if (!(payload.value > 0)) {
    throw new Error('保存失败：因子值不能为空，且非生物碳因子必须为正数')
  }

  if (!payload.sourceCategory) throw new Error('保存失败：来源类别必填')
  if (!payload.publishYear) throw new Error('保存失败：发布年份必填')
  if (!payload.publisherRegion) throw new Error('保存失败：发布国家/组织必填')
  if (!payload.publisherFullName.trim()) throw new Error('保存失败：发布机构或出版者（全称）必填')

  if (payload.description.length > FACTOR_DESCRIPTION_MAX) {
    throw new Error(`保存失败：描述最长 ${FACTOR_DESCRIPTION_MAX} 字符`)
  }
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
    category: payload.category,
    industries: payload.industries,
    scenario: payload.scenario.trim(),
    value: payload.value,
    numeratorUnit: payload.numeratorUnit,
    denominatorUnit: payload.denominatorUnit,
    sourceCategory: payload.sourceCategory,
    publishYear: payload.publishYear,
    publishDate: payload.publishDate,
    publisherRegion: payload.publisherRegion,
    publisherFullName: payload.publisherFullName.trim(),
    publisherShortName: payload.publisherShortName.trim(),
    dataSourceFile: payload.dataSourceFile,
    source: payload.source ?? 'custom',
    status: 'enabled',
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
  target.category = payload.category
  target.industries = payload.industries
  target.scenario = payload.scenario.trim()
  target.value = payload.value
  target.numeratorUnit = payload.numeratorUnit
  target.denominatorUnit = payload.denominatorUnit
  target.sourceCategory = payload.sourceCategory
  target.publishYear = payload.publishYear
  target.publishDate = payload.publishDate
  target.publisherRegion = payload.publisherRegion
  target.publisherFullName = payload.publisherFullName.trim()
  target.publisherShortName = payload.publisherShortName.trim()
  target.dataSourceFile = payload.dataSourceFile
  target.description = payload.description.trim()
  target.updatedBy = '当前用户'
  target.updatedAt = NOW
  return request(target)
}

/** 启用 / 禁用：双向可达；系统预置因子（environment 库）只读，不可禁用 */
export async function updateFactorStatus(id: string, status: EnableStatus): Promise<FactorItem> {
  const target = factorStore.find((item) => item.id === id)
  if (!target) throw new Error('因子不存在或已被删除')
  if (status === 'disabled' && target.source === 'preset') {
    throw new Error('系统预置因子（environment 库）不可禁用')
  }
  target.status = status
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

/** 批量启用 / 禁用：逐条执行，返回「成功 N 条 + 跳过清单与原因」 */
export async function batchUpdateFactorStatus(ids: string[], status: EnableStatus): Promise<FactorBatchResult> {
  const failed: FactorBatchFailure[] = []
  let success = 0

  ids.forEach((id) => {
    const target = factorStore.find((item) => item.id === id)
    if (!target) {
      failed.push({ id, code: '-', name: '-', reason: '因子不存在或已被删除' })
      return
    }
    if (status === 'disabled' && target.source === 'preset') {
      failed.push({ id, code: target.code, name: target.name, reason: '系统预置因子不可禁用' })
      return
    }
    target.status = status
    target.updatedBy = '当前用户'
    target.updatedAt = NOW
    success += 1
  })

  return request({ success, failed })
}

/** 删除：**仅「已禁用」的因子可删除**；系统预置因子一律不可删除（对齐物料库 / 能源库口径） */
export async function deleteFactor(id: string): Promise<void> {
  const target = factorStore.find((item) => item.id === id)
  if (!target) throw new Error('因子不存在或已被删除')
  if (target.source === 'preset') throw new Error('系统预置因子（environment 库）不可删除')
  if (target.status === 'enabled') throw new Error('请先禁用该因子，再执行删除（启用中的因子不可删除）')
  factorStore = factorStore.filter((item) => item.id !== id)
  await new Promise((resolve) => setTimeout(resolve, 260))
}

/** 批量删除：逐条执行，仅「已禁用」的组织自建因子可删除 */
export async function batchDeleteFactors(ids: string[]): Promise<FactorBatchResult> {
  const failed: FactorBatchFailure[] = []
  let success = 0

  ids.forEach((id) => {
    const target = factorStore.find((item) => item.id === id)
    if (!target) {
      failed.push({ id, code: '-', name: '-', reason: '因子不存在或已被删除' })
      return
    }
    let reason = ''
    if (target.source === 'preset') reason = '系统预置因子不可删除'
    else if (target.status === 'enabled') reason = '启用中的因子不可删除，请先禁用'

    if (reason) {
      failed.push({ id, code: target.code, name: target.name, reason })
      return
    }
    factorStore = factorStore.filter((item) => item.id !== id)
    success += 1
  })

  return request({ success, failed })
}

/* ============ 前台「我的因子库」：引用因子库（引用，不复制） ============ */

/**
 * 可引用的后台维护因子：后台「排放因子库」中**启用中**的因子（`source = 'preset'`）。
 * 前台仅能引用、不能改写；引用后在本组织可见且**只读**。
 */
export function fetchBackendFactors(): Promise<FactorItem[]> {
  return request(factorStore.filter((item) => item.source === 'preset' && item.status === 'enabled'))
}

/**
 * 批量引用后台维护因子到「我的因子库」（「全部引用」与勾选引用共用本方法）。
 * 跳过规则：非后台维护因子 / 已禁用 / 已引用（重复引用）。
 */
export async function referenceBackendFactors(ids: string[]): Promise<FactorBatchResult> {
  const failed: FactorBatchFailure[] = []
  let success = 0

  ids.forEach((id) => {
    const target = factorStore.find((item) => item.id === id)
    if (!target) {
      failed.push({ id, code: '-', name: '-', reason: '因子不存在或已被删除' })
      return
    }
    let reason = ''
    if (target.source !== 'preset') reason = '仅后台维护因子可被引用'
    else if (target.status !== 'enabled') reason = '已禁用的因子不可引用'
    else if (target.referenced) reason = '该因子已引用，请勿重复引用'

    if (reason) {
      failed.push({ id: target.id, code: target.code, name: target.name, reason })
      return
    }
    target.referenced = true
    target.updatedBy = '当前用户'
    target.updatedAt = NOW
    success += 1
  })

  return request({ success, failed })
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
  {
    key: 'category',
    label: '因子分类',
    required: true,
    hint: '必填，取值：材料因子 / 能源因子 / 运输因子 / 废弃物处理因子 / 末期处理因子 / 生物碳因子',
  },
  { key: 'industries', label: '适用行业', required: true, hint: '必填，至少 1 项；多个行业用「、」分隔（取值见行业库）' },
  { key: 'scenario', label: '适用场景', required: true, hint: '必填，如「外购电力消耗」' },
  { key: 'value', label: '碳排放因子值', required: true, hint: '必填，数字；生物碳因子可为负（表达固碳），其余必须为正' },
  { key: 'numeratorUnit', label: '单位（分子）', required: false, hint: '碳排放量类单位，默认 kgCO₂e' },
  { key: 'denominatorUnit', label: '活动数据单位（分母）', required: true, hint: '必填，须取自计量单位库，且与活动数据可换算' },
  { key: 'sourceCategory', label: '来源类别', required: true, hint: '必填，如「官方机构发布」「企业自建」' },
  { key: 'publishYear', label: '发布年份', required: true, hint: '必填，4 位年份，如 2024' },
  { key: 'publishDate', label: '发布日期', required: false, hint: '选填，格式 YYYY-MM-DD' },
  { key: 'publisherRegion', label: '发布国家/组织', required: true, hint: '必填，取值：中国 / 国际组织 / 欧盟 / 美国 / 英国 / 日本 / 其他' },
  { key: 'publisherFullName', label: '发布机构（全称）', required: true, hint: '必填' },
  { key: 'publisherShortName', label: '发布机构（简称）', required: false, hint: '选填' },
  { key: 'dataSourceFile', label: '数据来源', required: false, hint: '选填，来源文件名称' },
  { key: 'description', label: '描述', required: false, hint: `选填，≤${FACTOR_DESCRIPTION_MAX} 字符` },
]

/** 因子分类：中文标签 → 枚举（模板枚举取值，同时接受英文枚举值） */
const FACTOR_CATEGORY_BY_LABEL: Record<string, FactorCategory> = {
  材料因子: 'material',
  能源因子: 'energy',
  运输因子: 'transport',
  废弃物处理因子: 'waste',
  末期处理因子: 'eol',
  生物碳因子: 'biocarbon',
}

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

    const categoryRaw = importCell(cells, 'category')
    const category =
      FACTOR_CATEGORY_BY_LABEL[categoryRaw] ??
      (Object.values(FACTOR_CATEGORY_BY_LABEL).includes(categoryRaw as FactorCategory)
        ? (categoryRaw as FactorCategory)
        : null)
    const industries = importCell(cells, 'industries')
      .split(/[、,，;；]/)
      .map((item) => item.trim())
      .filter(Boolean)
    const valueRaw = importCell(cells, 'value')
    const value = Number(valueRaw)
    const numeratorUnit = importCell(cells, 'numeratorUnit') || 'kgCO₂e'
    const denominatorUnit = importCell(cells, 'denominatorUnit')
    const publishYear = importCell(cells, 'publishYear')
    const publisherRegion = importCell(cells, 'publisherRegion')
    const description = importCell(cells, 'description')

    if (!name) reasons.push('因子名称必填')
    if (!categoryRaw) reasons.push('因子分类必填')
    else if (!category) reasons.push(`因子分类「${categoryRaw}」不在枚举范围内`)
    if (industries.length === 0) reasons.push('适用行业必填（至少 1 项）')
    else {
      const unknown = industries.filter((item) => !FACTOR_INDUSTRY_OPTIONS.includes(item))
      if (unknown.length > 0) reasons.push(`适用行业「${unknown.join('、')}」不在行业库中`)
    }
    if (!importCell(cells, 'scenario')) reasons.push('适用场景必填')
    if (!valueRaw || Number.isNaN(value)) reasons.push('碳排放因子值必填且必须为数字')
    else if (category && category !== 'biocarbon' && value <= 0) reasons.push('非生物碳因子的因子值必须为正数')
    else if (category === 'biocarbon' && value === 0) reasons.push('因子值不能为 0')
    if (!FACTOR_CARBON_UNITS.includes(numeratorUnit)) {
      reasons.push(`单位（分子）「${numeratorUnit}」不在计量单位库（碳排放量类）中`)
    }
    if (!denominatorUnit) reasons.push('活动数据单位必填')
    else if (!FACTOR_ACTIVITY_UNITS.includes(denominatorUnit)) {
      reasons.push(`活动数据单位「${denominatorUnit}」不在计量单位库中`)
    }
    if (!importCell(cells, 'sourceCategory')) reasons.push('来源类别必填')
    if (!/^\d{4}$/.test(publishYear)) reasons.push('发布年份必填，且为 4 位年份')
    if (!publisherRegion) reasons.push('发布国家/组织必填')
    else if (!FACTOR_PUBLISHER_REGION_OPTIONS.includes(publisherRegion)) {
      reasons.push(`发布国家/组织「${publisherRegion}」不在枚举范围内`)
    }
    if (!importCell(cells, 'publisherFullName')) reasons.push('发布机构（全称）必填')
    if (description.length > FACTOR_DESCRIPTION_MAX) {
      reasons.push(`描述超过 ${FACTOR_DESCRIPTION_MAX} 字符`)
    }

    if (reasons.length > 0 || !category) {
      errors.push({ row, name: name || '（空）', reason: reasons.join('；') || '因子分类取值有误' })
      return
    }

    valid.push({
      name,
      alias: importCell(cells, 'alias'),
      category,
      industries,
      scenario: importCell(cells, 'scenario'),
      value,
      numeratorUnit,
      denominatorUnit,
      sourceCategory: importCell(cells, 'sourceCategory'),
      publishYear,
      publishDate: importCell(cells, 'publishDate'),
      publisherRegion,
      publisherFullName: importCell(cells, 'publisherFullName'),
      publisherShortName: importCell(cells, 'publisherShortName'),
      dataSourceFile: importCell(cells, 'dataSourceFile'),
      description,
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
  /** 适用行业（多选，引用行业库 A1-4），至少 1 项 */
  industries: string[]
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
 * 数据因素名称必填且不重复；因子类必须选择引用对象；常量类必须有常量值；活动数据 / 常量必须有单位；
 * 计算公式只能由数据因素与 `+ - * / ( ) [ ] %` 组成。
 */
function assertCalcFormula(payload: CalcFormulaPayload): void {
  if (!payload.name.trim()) throw new Error('保存失败：公式名称必填')
  if (payload.industries.length === 0) throw new Error('保存失败：适用行业必填（至少选择 1 项）')
  if (!payload.formulaType) throw new Error('保存失败：公式类型必填')
  if (!payload.resultName.trim()) throw new Error('保存失败：结果名称必填')
  if (!payload.resultUnit) throw new Error('保存失败：结果单位必填')
  if (payload.factors.length === 0) throw new Error('保存失败：请至少添加一个数据因素')

  const names = payload.factors.map((item) => item.name.trim())
  if (names.some((name) => !name)) throw new Error('保存失败：存在未命名的数据因素')
  if (new Set(names).size !== names.length) throw new Error('保存失败：数据因素名称不得重复')

  payload.factors.forEach((item) => {
    if (item.sourceType === 'factor') {
      if (!item.sourceCode) throw new Error(`保存失败：数据因素「${item.name}」请选择引用对象`)
      return
    }
    if (item.sourceType === 'constant' && !item.value.trim()) {
      throw new Error(`保存失败：常量因素「${item.name}」必须填写常量值`)
    }
    if (!item.unit.trim()) throw new Error(`保存失败：数据因素「${item.name}」必须填写单位`)
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
    industries: [...payload.industries],
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
  target.industries = [...payload.industries]
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

export interface CalcEngineOptions {
  /** 适用行业（引用行业库 A1-4） */
  industries: string[]
}

/** 计算公式表单下拉选项（行业引用行业库 A1-4） */
export function fetchCalcEngineOptions(): Promise<CalcEngineOptions> {
  return request({
    industries: [...industryOptions],
  })
}

/* ===================== 前台业务平台 · 核算项目（P17 / P18） ===================== */

/** 项目备注长度上限（《核算项目字段清单》§4 备注） */
export const PCF_PROJECT_REMARK_MAX = 200

/**
 * 可编辑状态（V0.3 放宽）：**核算完成前均可编辑**。
 * `calculated` 可编辑，但保存即回退「进行中」并需重走检测 → 核算（E13）。
 */
const PCF_EDITABLE_STATUS: PcfProjectStatus[] = [
  'new',
  'ongoing',
  'checking',
  'toCalc',
  'calcFailed',
  'calculated',
]

/** 可删除状态：仅「新建 / 进行中」 */
const PCF_DELETABLE_STATUS: PcfProjectStatus[] = ['new', 'ongoing']

/** 需「编辑即回退重算」的状态（E13） */
const PCF_REVERT_STATUSES: PcfProjectStatus[] = ['calculated']

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
        industry: item.industry,
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
  const referenced = myProductRefIds
    .map((id) => productStore.find((p) => p.id === id))
    .filter((p): p is ProductItem => !!p)
  const items = [...myProductStore, ...referenced.map(projectReferenced)]
  return request(
    items
      .filter((item) => item.useStatus === 'on')
      .map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        model: item.model,
        spec: item.spec,
        unit: item.unit,
        category: categoryStore.find((c) => c.id === item.categoryId)?.name ?? '-',
        industry: item.industry,
        version: 'V1.0',
        useStatus: item.useStatus,
        source: item.source,
      })),
    120,
  )
}

/** 列表：核算项目（默认按更新时间倒序，R-013） */
export function fetchPcfProjects(): Promise<PcfProject[]> {
  return request([...pcfProjectStore].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)))
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
  productName?: string
  productSpec?: string
  functionalUnit?: string
  /** 转换系数（功能单位 / 声明单位 ↔ 产品单位；默认 1 = 与产品单位一致） */
  conversionFactor?: number | null
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

  if (!payload.refProductId) throw new Error('保存失败：请选择产品')
  // 前台核算产品 = 我的产品库（组织自建 / 引用平台产品）；兼容平台产品库直连
  const product =
    productStore.find((item) => item.id === payload.refProductId) ??
    myProductStore.find((item) => item.id === payload.refProductId)
  if (!product) throw new Error('保存失败：所选产品不存在或已被删除')
  if (product.useStatus !== 'on') throw new Error('保存失败：所选产品已下架，请重新选择')

  // 按边界 + 行业带出默认生命周期阶段（新建即生效，步骤② 据此对齐展示）
  const ruleOf = (s: LifecycleStageItem) => (payload.boundary === 'gate' ? s.gateRule : s.graveRule)
  const lifecycleStages: PcfLifecycleStage[] = lifecycleStore
    .filter(
      (s) =>
        s.status === 'enabled' &&
        ruleOf(s) !== 'excluded' &&
        (s.industries.length === 0 || s.industries.includes(product.industry)),
    )
    .sort((a, b) => a.order - b.order)
    .map((s) => ({
      id: s.id,
      name: s.name,
      level: s.level,
      parentName: '',
      custom: false,
      rule: ruleOf(s),
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
      payload.productSource ??
      (productStore.some((item) => item.id === product.id) ? 'library' : 'custom'),
    refProductId: payload.refProductId,
    productCode: product.code,
    productName: product.name,
    productModel: product.model,
    productSpec: product.spec,
    productCategory: categoryStore.find((c) => c.id === product.categoryId)?.name ?? '',
    productIndustry: product.industry,
    productVersion: 'V1.0',
    functionalUnit: payload.functionalUnit ?? product.unit,
    conversionFactor: payload.conversionFactor ?? 1,
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
 * 删除：**「新建 / 进行中」均可删除**（物理删除、记录消失、不可恢复）。
 * 已移除「作废」状态，取消项目统一走删除。
 */
export async function deletePcfProject(id: string): Promise<void> {
  const target = pcfProjectStore.find((item) => item.id === id)
  if (!target) throw new Error('项目不存在或已被删除')
  if (!PCF_DELETABLE_STATUS.includes(target.status)) {
    throw new Error('当前状态不可删除（仅「新建 / 进行中」支持删除）')
  }
  pcfProjectStore = pcfProjectStore.filter((item) => item.id !== id)
  await new Promise((resolve) => setTimeout(resolve, 260))
}

/* ---------- 步骤② 产品与边界配置（P19） ---------- */

/** 净重单位候选（**仅重量类**，字段清单 §5.2） */
export function fetchPcfWeightUnitOptions(): Promise<string[]> {
  return request(pcfWeightUnitOptions, 120)
}

/**
 * 核算方法候选：**引用标准文件库**（Mock 假数据，仅返回「现行」标准）。
 * 标准文件库（P05）交付后替换内部实现，函数签名不变。
 */
export function fetchPcfStandardOptions(): Promise<PcfStandardOption[]> {
  return request(
    pcfStandardOptionSeed.filter((item) => item.status === '现行'),
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
  /** 产品（引用产品库） */
  refProductId: string
  productCode?: string
  productName: string
  productModel?: string
  productSpec?: string
  productCategory?: string
  productIndustry?: string
  productVersion?: string
  /** 单位（取计量单位库；默认带出产品「单位」，可项目级重选） */
  functionalUnit: string
  /** 转换系数（功能单位 / 声明单位 ↔ 产品单位，须 > 0；1 = 与产品单位一致） */
  conversionFactor: number | null
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

  if (!payload.refProductId) throw new Error('保存失败：请选择产品')

  const picked =
    productStore.find((item) => item.id === payload.refProductId) ??
    myProductStore.find((item) => item.id === payload.refProductId)
  if (!picked) throw new Error('保存失败：所选产品不存在或已被删除')
  if (picked.useStatus !== 'on') throw new Error('保存失败：所选产品已下架，请重新选择')

  if (!payload.functionalUnit) throw new Error('保存失败：单位必填')

  if (
    payload.conversionFactor == null ||
    !Number.isFinite(payload.conversionFactor) ||
    payload.conversionFactor <= 0
  ) {
    throw new Error('保存失败：转换系数须为大于 0 的数值')
  }

  if (!payload.methodId) throw new Error('保存失败：核算方法必填')
  const std = pcfStandardOptionSeed.find((item) => item.id === payload.methodId)
  if (!std) throw new Error('保存失败：所选核算方法不存在或已被移除')

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

  target.productSource = productStore.some((item) => item.id === picked.id) ? 'library' : 'custom'
  target.refProductId = payload.refProductId
  target.productCode = payload.productCode ?? ''
  target.productName = payload.productName.trim()
  target.productModel = payload.productModel ?? ''
  target.productSpec = payload.productSpec ?? ''
  target.productCategory = payload.productCategory ?? ''
  target.productIndustry = payload.productIndustry ?? ''
  target.productVersion = payload.productVersion ?? ''
  target.functionalUnit = payload.functionalUnit
  target.conversionFactor = payload.conversionFactor
  target.methodId = std.id
  target.method = `${std.code}-${std.version}`
  target.lifecycleStages = clone(payload.lifecycleStages)
  target.updatedAt = NOW

  if (PCF_REVERT_STATUSES.includes(target.status)) {
    // 「已核算」修改 → 回退「进行中」，需重走检测 → 核算（E13）
    target.status = 'ongoing'
    target.currentStep = 1
  } else if (target.currentStep < 2) {
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
 * 排放因子选项（**手动匹配**用）：引用排放因子库（A2-6），仅返回「启用」态因子。
 * **本版不做自动匹配、不做自动预选**，由填报人在步骤② 逐条手动选择排放来源。
 */
export function fetchPcfFactorOptions(): Promise<PcfFactorOption[]> {
  return request(
    factorStore
      .filter((item) => item.status === 'enabled')
      .map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        value: item.value,
        numeratorUnit: item.numeratorUnit,
        denominatorUnit: item.denominatorUnit,
        category: item.category,
      })),
    120,
  )
}

/**
 * 加载项目活动数据（**懒初始化**）：
 * 首次进入步骤② 时，按项目内核算工序的投入产出流**生成填报行**。
 * - **绑定公式随工序带入**（引用即复制，产品侧配置完成，前台只读）；填报字段 = 公式 `activity` 因素（**动态**）；
 * - **中间品 / 产品**流不计入（`disposal = excluded`，避免重复计算）；
 * - 因子：公式含 `parameter` 因素时才需手动匹配（**单因子**）；数值与分配比例初始为空。
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
    const requiresFactor = factors.some((item) => item.sourceType === 'parameter')
    // 排放来源**默认带出公式中绑定的因子**（允许填报时修改）
    const paramFactor = factors.find((item) => item.sourceType === 'parameter')
    const defaultFactor = paramFactor?.sourceCode
      ? factorStore.find((f) => f.code === paramFactor.sourceCode && f.status === 'enabled')
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

/** 工序库投入产出流 → 项目工序副本流（公式随流带入 / 默认带出，引用即复制） */
function toProjectFlow(flow: OperationFlowItem, prefix: string, stamp: string): ProductFlowItem {
  const base: ProductFlowItem = {
    id: `${stamp}-${prefix}-${flow.id}`,
    type: flow.flowType,
    name: flow.refName,
    qty: 1,
    unit: flow.unit,
    emissionCategory: flow.emissionCategory,
    formulaId: flow.formulaId,
    formulaCode: flow.formulaCode,
    formulaName: flow.formulaName,
    formulaExpression: flow.formulaExpression,
    disposal: flow.disposal,
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
  const paramFactor = formula.factors.find((item) => item.sourceType === 'parameter')
  const defaultFactor = paramFactor?.sourceCode
    ? factorStore.find((f) => f.code === paramFactor.sourceCode && f.status === 'enabled')
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
  target.requiresFactor = formula.factors.some((item) => item.sourceType === 'parameter')
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

/** 数据检测结果（内存态；PJ01 为演示项目「检测已通过」的留存记录） */
let pcfCheckStore: PcfCheckResult[] = [
  {
    projectId: 'PJ01',
    status: 'passed',
    checkedAt: '2026-09-10 14:20',
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
 * 提交检测：真实执行简化检测逻辑（阻断 B1–B5 + 提示 W1），生成并留存检测结果。
 * - 检测通过（阻断项 = 0）→ 项目「待核算」、步骤推进到④；
 * - 检测不通过 → 项目回「进行中」、步骤停留③，返回问题清单。
 */
export async function submitPcfCheck(projectId: string): Promise<PcfCheckResult> {
  const project = pcfProjectStore.find((item) => item.id === projectId)
  if (!project) throw new Error('项目不存在或已被删除')
  if (!['ongoing', 'checking'].includes(project.status)) {
    throw new Error('当前状态不可检测')
  }

  // 置「检测中」并模拟异步
  project.status = 'checking'
  project.currentStep = 3
  project.updatedAt = NOW
  await new Promise((resolve) => setTimeout(resolve, 900))

  const issues: PcfCheckIssue[] = []
  const stageNames = includedStageNamesOf(project)
  const projectOps = pcfOperationStore.filter((item) => item.projectId === projectId)
  const ops = stageNames ? projectOps.filter((op) => stageNames.has(op.processStage)) : projectOps
  const rows = pcfActivityStore.filter((item) => item.projectId === projectId)

  // B1 活动数据缺失 / B2 排放来源缺失 / B4 因子单位不匹配（逐数据项）
  rows.forEach((row) => {
    const op = pcfOperationStore.find((o) => o.id === row.operationId)
    const loc = `工序：${op?.opName ?? '-'} / 数据项：${row.flowName}`

    // B1 活动数据缺失
    const missing = row.activityValues.filter((av) => av.value == null)
    if (missing.length > 0) {
      issues.push({
        id: `${row.id}-B1`,
        level: 'blocking',
        category: 'completeness',
        title: `数据项「${row.flowName}」的活动量未填写`,
        description: `${missing.map((m) => m.factorName).join('、')} 未填写，请补充数量。`,
        location: loc,
        fixStep: 2,
        fixLabel: '去填写',
      })
    }

    // B2 排放来源缺失（需因子的投入项）
    if (row.requiresFactor && row.direction === 'input' && !row.factorId) {
      issues.push({
        id: `${row.id}-B2`,
        level: 'blocking',
        category: 'completeness',
        title: `投入项「${row.flowName}」未匹配排放因子`,
        description: '该投入项参与计算需匹配排放来源，请选择排放因子。',
        location: loc,
        fixStep: 2,
        fixLabel: '去匹配因子',
      })
    }

    // B4 因子单位不匹配（仅活动量已填时检测）
    if (
      row.factorId &&
      row.activityValues.length > 0 &&
      row.activityValues.every((av) => av.value != null)
    ) {
      const factor = factorStore.find((f) => f.id === row.factorId)
      const incompatible = factor
        ? row.activityValues.some((av) => unitTypeOf(av.unit) !== unitTypeOf(factor.denominatorUnit))
        : false
      if (incompatible && factor) {
        issues.push({
          id: `${row.id}-B4`,
          level: 'blocking',
          category: 'factorUnit',
          title: `数据项「${row.flowName}」的活动量单位与因子单位不可换算`,
          description: `活动量单位为「${row.activityValues.map((av) => av.unit).join(' / ')}」，排放因子分母单位为「${factor.denominatorUnit}」，无法换算，请重新选择排放因子或调整单位。`,
          location: loc,
          fixStep: 2,
          fixLabel: '去修改',
        })
      }
    }
  })

  // B3 分配比例不闭合（多产出工序）
  ops.forEach((op) => {
    if (op.outputs.length <= 1) return
    const outRows = rows.filter((r) => r.operationId === op.id && r.direction === 'output')
    const total = outRows.reduce((sum, r) => sum + (r.allocateRatio ?? 0), 0)
    if (Math.abs(total - 100) > 0.01) {
      issues.push({
        id: `${op.id}-B3`,
        level: 'blocking',
        category: 'allocation',
        title: `工序「${op.opName}」的产出分配比例合计 ${total}%，须为 100%`,
        description: '该工序存在多个产出，分配比例合计须为 100%。',
        location: `工序：${op.opName}`,
        fixStep: 2,
        fixLabel: '去调整比例',
      })
    }
  })

  // B5 阶段无数据（步骤①勾选纳入的一级阶段未匹配任何工序）
  const includedLevel1 = (project.lifecycleStages ?? []).filter((s) => s.included && s.level === 1)
  includedLevel1.forEach((stage) => {
    const has = ops.some((op) => op.processStage === stage.name)
    if (!has) {
      issues.push({
        id: `stage-${stage.id}-B5`,
        level: 'blocking',
        category: 'stageCoverage',
        title: `阶段「${stage.name}」已纳入但未匹配到工序数据`,
        description: '该阶段已纳入核算，但未匹配到任何工序，请补充该阶段的工序与数据。',
        location: `阶段：${stage.name}`,
        fixStep: 2,
        fixLabel: '去补充',
      })
    }
  })

  // W1 质量平衡偏差（提示级，简化启发式：物料类投入 vs 成品 / 副产品类产出）
  ops.forEach((op) => {
    const inputRows = rows.filter(
      (r) =>
        r.operationId === op.id &&
        r.direction === 'input' &&
        (r.flowType === 'material' || r.flowType === 'resource'),
    )
    const outputRows = rows.filter(
      (r) =>
        r.operationId === op.id &&
        r.direction === 'output' &&
        (r.flowType === 'product' || r.flowType === 'byproduct'),
    )
    if (inputRows.length === 0 || outputRows.length === 0) return
    const inputTotal = inputRows.reduce((sum, r) => sum + (r.activityValues[0]?.value ?? 0), 0)
    const outputTotal = outputRows.reduce((sum, r) => sum + (r.activityValues[0]?.value ?? 0), 0)
    if (inputTotal > 0 && outputTotal > 0) {
      const diff = (Math.abs(inputTotal - outputTotal) / inputTotal) * 100
      if (diff > 5) {
        issues.push({
          id: `${op.id}-W1`,
          level: 'warning',
          category: 'massBalance',
          title: `工序「${op.opName}」投入与产出质量偏差 ${diff.toFixed(1)}%，请核对`,
          description: '投入与产出质量偏差超过 5% 阈值，请核对数量与单位。',
          location: `工序：${op.opName}`,
          fixStep: 2,
          fixLabel: '去核对',
        })
      }
    }
  })

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

/** 排放源归类：优先按匹配因子分类，无因子按流类型兜底 */
function sourceOf(row: PcfActivityData, factor?: FactorItem): PcfCalcSourceType {
  if (factor) return factor.category
  if (row.flowType === 'energy') return 'energy'
  if (row.flowType === 'emission') return 'waste'
  return 'material'
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
 * - 准入：项目「待核算 / 核算失败 / 已核算」；
 *   **已核算（`calculated`）= 在既有结果上重新计算**（活动数据、排放因子或公式口径变更后使用），
 *   不覆盖历史，按版本号递增产出新结果版本；
 * - 置「核算中」模拟异步，懒初始化工序与填报行后逐行计算；
 * - 生成新结果版本（版本号递增、旧版本保留），项目置「已核算」，停留步骤④「碳足迹核算与结果」。
 */
export async function startPcfCalc(projectId: string): Promise<PcfCalcResult> {
  const project = pcfProjectStore.find((item) => item.id === projectId)
  if (!project) throw new Error('项目不存在或已被删除')
  if (!['toCalc', 'calcFailed', 'calculated'].includes(project.status)) {
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

/** 核算主流程：懒初始化 → 逐行计算 → 逐级汇总 → 写入新结果版本 → 项目置「已核算」 */
async function runPcfCalc(project: PcfProject): Promise<PcfCalcResult> {
  const projectId = project.id

  // 懒初始化（确保工序与填报行已生成）
  await fetchPcfLifecycleBundle(projectId)
  await fetchPcfActivityData(projectId)

  const stageNames = includedStageNamesOf(project)
  const projectOps = pcfOperationStore.filter((item) => item.projectId === projectId)
  const ops = stageNames ? projectOps.filter((op) => stageNames.has(op.processStage)) : projectOps
  const visibleOpIds = new Set(ops.map((op) => op.id))
  const rows = pcfActivityStore.filter(
    (item) => item.projectId === projectId && visibleOpIds.has(item.operationId),
  )

  const details: PcfResultDetail[] = []
  const opEmission = new Map<string, number>()
  const stageEmission = new Map<string, number>()
  const sourceEmission = new Map<PcfCalcSourceType, number>()
  // 汇总用「未四舍五入」的原始排放，保证各维度占比合计 = 100%（避免四舍五入引入误差）
  let rawTotal = 0

  rows.forEach((row) => {
    const op = pcfOperationStore.find((o) => o.id === row.operationId)
    const formula = calcFormulaStore.find((f) => f.id === row.formulaId)
    const factor = row.factorId ? factorStore.find((f) => f.id === row.factorId) : undefined
    const emission = computeRowEmission(row, formula)

    details.push({
      id: row.id,
      operationId: row.operationId,
      processName: op?.processName ?? '',
      opName: op?.opName ?? '',
      stage: op?.processStage ?? '',
      flowName: row.flowName,
      flowType: row.flowType,
      direction: row.direction,
      activityText: activityTextOf(row),
      factorName: factor?.name ?? row.factorName ?? '',
      factorValue: factor?.value ?? row.factorValue ?? null,
      formulaName: formula?.name ?? row.formulaName ?? '',
      emission: roundCalc(emission),
    })

    opEmission.set(row.operationId, (opEmission.get(row.operationId) ?? 0) + emission)
    const stage = op?.processStage ?? '未归类'
    stageEmission.set(stage, (stageEmission.get(stage) ?? 0) + emission)
    const source = sourceOf(row, factor)
    sourceEmission.set(source, (sourceEmission.get(source) ?? 0) + emission)
    rawTotal += emission
  })

  const total = rawTotal
  // 版本号 = 该项目已有结果的最大版本 + 1（重新计算时递增，历史版本不可篡改）
  const version =
    pcfCalcResultStore
      .filter((item) => item.projectId === projectId)
      .reduce((max, item) => Math.max(max, item.version), 0) + 1

  const result: PcfCalcResult = {
    projectId,
    version,
    calculatedAt: NOW,
    totalEmission: roundCalc(total),
    unit: project.functionalUnit,
    unitEmission: roundCalc(total),
    stageSummary: [...stageEmission.entries()].map(([stage, emission]) => ({
      stage,
      emission: roundCalc(emission),
      ratio: roundCalc(ratioCalc(emission, total)),
    })),
    operationSummary: ops
      .map((op) => {
        const emission = opEmission.get(op.id) ?? 0
        return {
          operationId: op.id,
          processName: op.processName,
          opName: op.opName,
          stage: op.processStage,
          emission: roundCalc(emission),
          ratio: roundCalc(ratioCalc(emission, total)),
        }
      })
      .filter((item) => item.emission !== 0),
    sourceSummary: [...sourceEmission.entries()].map(([source, emission]) => ({
      source,
      emission: roundCalc(emission),
      ratio: roundCalc(ratioCalc(emission, total)),
    })),
    details,
  }

  // 新版本前插，历史版本保留（界面仅展示最近版本）
  pcfCalcResultStore = [result, ...pcfCalcResultStore]
  project.status = 'calculated'
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
    '工序',
    '工艺流程',
    '阶段',
    '流向',
    '活动量',
    '排放因子',
    '绑定公式',
    '排放量(kgCO₂e)',
  ]
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`
  const lines = latest.details.map((d) =>
    [
      d.flowName,
      d.opName,
      d.processName,
      d.stage,
      d.direction === 'input' ? '投入' : '产出',
      d.activityText,
      d.factorName,
      d.formulaName,
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

/** 报告边界文案（Mock 本地口径，避免 mock 反向依赖页面模块） */
const REPORT_BOUNDARY_TEXT: Record<PcfBoundary, string> = {
  gate: '摇篮到大门',
  grave: '摇篮到坟墓',
}

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

/** 演示用封面预置（PJ09「报告编制中」：演示已补充概况信息的状态） */
const DEMO_REPORT_COVER: Record<string, Partial<PcfReportCover>> = {
  PJ09: {
    reportDate: '2026-09-09',
    issuer: '示例竹制品二厂',
    address: '福建省南平市工业路 65 号',
    legalPerson: '周策',
    contactPerson: '周策',
    contactPhone: '0599-0000000',
    companyProfile: '示例竹制品二厂，专注竹制餐具与家居用品生产，年产竹制餐具 1200 万件。',
    productFunction: '用于餐饮场景的竹制刀叉，可替代一次性塑料餐具。',
    productIntro: '以竹板材冲压成型、打磨包装制成，规格 175mm。',
  },
}

/** 演示用章节预置（PJ09「报告编制中」/ PJ10「已完成」：结果说明已补填，可直接预览与确认完成） */
const DEMO_REPORT_SECTIONS: Record<string, Record<string, string>> = {
  PJ09: {
    S06A:
      '本期核算覆盖原材料获取、生产制造两个阶段，生产制造阶段排放占比最高，主要来源为电力消耗与竹材加工工序；建议后续优先推进能效改造与清洁能源替代，并完善初级数据采集频次。',
  },
  PJ10: {
    S06A:
      '本期核算覆盖原材料获取、生产制造、分销与使用阶段，排放集中在生产制造阶段；建议通过设备节能改造、绿色电力采购与包装减量持续降低单位产品碳足迹。',
  },
}

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
  const demo = DEMO_REPORT_COVER[project.id] ?? {}
  const demoSections = DEMO_REPORT_SECTIONS[project.id] ?? {}
  const reportDate = demo.reportDate ?? NOW.slice(0, 10)

  const cover: PcfReportCover = {
    productName: project.productName,
    productSpec: project.productSpec,
    companyName: project.ownerOrg,
    reportNo: previous?.reportNo ?? nextReportNo(),
    reportDate,
    issuer: demo.issuer ?? '',
    producerName: project.ownerOrg,
    address: demo.address ?? '',
    legalPerson: demo.legalPerson ?? '',
    contactPerson: demo.contactPerson ?? '',
    contactPhone: demo.contactPhone ?? '',
    companyProfile: demo.companyProfile ?? '',
    productFunction: demo.productFunction ?? '',
    productIntro: demo.productIntro ?? '',
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
      content: demoSections[item.code] ?? item.defaultText,
    })),
    system: {
      standard: `依据标准：${project.method || 'GB/T 24067《温室气体 产品碳足迹 量化要求和指南》'}`,
      unit: project.functionalUnit,
      boundaryText: REPORT_BOUNDARY_TEXT[project.boundary],
      period: `${project.startDate} 到 ${project.endDate}`,
      allocation:
        '优先通过过程细分避免分配，对可明确归属的单元过程直接计入对应环节；对无法避免的共享单元过程，基于物理关系（如质量比例）进行分配；无明确物理关系的共享过程，参考经济价值比例进行分配。',
      unitEmission: result?.unitEmission ?? 0,
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
      return `<tr><td>${d.opName}</td><td>${d.stage}</td><td>${d.direction === 'input' ? '投入' : '产出'}</td><td>${d.flowName}</td><td>${qty}</td><td>${unit}</td><td>${d.factorName || '—'}</td><td>${emission}</td></tr>`
    })
    .join('')
  const stageRows = [
    ...system.stageSummary.map(
      (s) =>
        `<tr><td>${s.stage}</td><td>${formatReportNumber(s.emission)}</td><td>${formatReportNumber(s.ratio)}</td></tr>`,
    ),
    `<tr><td>总计</td><td>${formatReportNumber(system.totalEmission)}</td><td>100</td></tr>`,
  ].join('')

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
<table><tr><th>工序</th><th>阶段</th><th>投入/产出</th><th>名称</th><th>数量</th><th>单位</th><th>排放因子</th><th>排放量 kgCO₂e</th></tr>${listRows}</table>
<p>4. 数据质量评价：${textOf('S04D')}</p>
<h2>五、影响评价</h2>
<p>1. 影响类型和特征化因子：一般选择 IPCC 给出的 100 年 GWP，采用 IPCC 第六次评估报告推荐值。</p>
<p>2. 产品碳足迹结果计算：${cover.productName} 每声明单位（${system.unit}）碳足迹为 ${formatReportNumber(system.unitEmission)} kgCO₂e。</p>
<h2>六、结果解释</h2>
<p>${textOf('S06A')}</p>
<p>${cover.companyName} 生产的 ${cover.productName}，系统边界为 ${system.boundaryText}，生命周期碳足迹为 ${formatReportNumber(system.unitEmission)} kgCO₂e / ${system.unit}。各生命周期阶段排放情况如下：</p>
<table><tr><th>生命周期阶段</th><th>碳足迹（kgCO₂e/${system.unit}）</th><th>百分比/%</th></tr>${stageRows}</table>
<p>注：图 2 各生命周期阶段碳排放分布图（本期占位）。</p>
</body></html>`
}

/** 导出报告（doc），返回文件名与内容，由前端触发浏览器下载 */
export function exportPcfReport(projectId: string): Promise<{ filename: string; content: string }> {
  const report = pcfReportStore.find((item) => item.projectId === projectId)
  if (!report) throw new Error('暂无报告')
  return request({ filename: report.fileName, content: buildReportDocHtml(report) }, 150)
}

/**
 * 报告演示项目：为其补一份核算结果（克隆 PJ07 最近版本），
 * 使「报告编制中 / 已完成」样本的报告表格有数据（原型演示口径，不影响业务规则）。
 */
const DEMO_REPORT_PROJECTS = ['PJ08', 'PJ09', 'PJ10']

function seedPcfReportDemo(): void {
  const base = latestCalcOf('PJ07')
  if (!base) return
  DEMO_REPORT_PROJECTS.forEach((id) => {
    const project = pcfProjectStore.find((item) => item.id === id)
    if (!project) return
    if (pcfCalcResultStore.some((item) => item.projectId === id)) return
    pcfCalcResultStore = [
      ...pcfCalcResultStore,
      {
        ...clone(base),
        projectId: id,
        version: 1,
        unit: project.functionalUnit,
        calculatedAt: project.updatedAt,
      },
    ]
  })
}

/* ===================== 演示数据预置（仅用于原型演示，不影响业务规则） ===================== */

/**
 * 预置「已填报」活动数据的演示项目：
 * - PJ04（待核算）：橡木实木餐桌，含生产 + 运输与交付两阶段、材料 / 能源 / 废弃物 / 运输四类排放源；
 * - PJ05（核算中）：竹木收纳盒，进入步骤④ 后异步核算完成，结果与 PJ07 V3 同口径；
 * - PJ06（核算失败）：竹制刀叉套装（项目内自定义产品），预置自定义工序后可演示「重新核算」成功。
 */
const DEMO_FILLED_PROJECTS = ['PJ04', 'PJ05', 'PJ06']

/** 演示用「数据项 → 排放因子」匹配规则（模拟填报人在步骤② 手动匹配排放来源） */
const DEMO_FACTOR_RULES: Array<{ pattern: RegExp; factorCode: string }> = [
  { pattern: /电力/, factorCode: 'F-001' },
  { pattern: /橡木/, factorCode: 'F-403' },
  { pattern: /胶粘剂/, factorCode: 'F-405' },
  { pattern: /木器漆/, factorCode: 'F-404' },
  { pattern: /漆渣/, factorCode: 'F-203' },
  { pattern: /竹板材|竹片|毛竹/, factorCode: 'F-402' },
  { pattern: /运输/, factorCode: 'F-301' },
]

/** 演示用「数据项 → 活动量单位」覆盖规则（公式因素默认单位为 kg，按数据项口径修正） */
const DEMO_UNIT_RULES: Array<{ pattern: RegExp; units: string[] }> = [
  { pattern: /电力/, units: ['kWh'] },
  { pattern: /橡木/, units: ['m³'] },
  { pattern: /运输/, units: ['t', 'km'] },
]

/** 演示用运输量（[运输重量 t, 运输距离 km]）：多 activity 因素行（运输 t·km 法）无基准数量，按项目给值 */
const DEMO_TRANSPORT: Record<string, [number, number]> = {
  PJ04: [0.045, 320],
  PJ06: [0.02, 260],
}

/** 按流类型兜底的演示因子 */
const DEMO_FACTOR_FALLBACK: Record<string, string> = {
  material: 'F-402',
  energy: 'F-001',
  transport: 'F-301',
  waste: 'F-201',
  eol: 'F-601',
  biocarbon: 'F-501',
}

function demoFactorOf(row: PcfActivityData): FactorItem | undefined {
  const enabled = factorStore.filter((item) => item.status === 'enabled')
  const rule = DEMO_FACTOR_RULES.find((item) => item.pattern.test(row.flowName))
  if (rule) return enabled.find((item) => item.code === rule.factorCode)
  const code = DEMO_FACTOR_FALLBACK[row.flowType]
  return code ? enabled.find((item) => item.code === code) : undefined
}

/** 单行演示填值：活动量取工艺基准数量（运输行按「重量 × 距离」），并匹配排放因子 */
function fillDemoRow(row: PcfActivityData): void {
  const formula = calcFormulaStore.find((item) => item.id === row.formulaId)
  const activityCount = (formula?.factors ?? []).filter((item) => item.sourceType === 'activity').length
  const transport = DEMO_TRANSPORT[row.projectId]

  const unitRule = DEMO_UNIT_RULES.find((item) => item.pattern.test(row.flowName))

  row.activityValues = row.activityValues.map((item, index) => {
    if (activityCount > 1) {
      // 多 activity 因素：运输重量 × 运输距离
      const value = transport ? transport[index] ?? 1 : index === 0 ? (item.refQty ?? 0.04) : 320
      return { ...item, value, unit: unitRule?.units[index] ?? item.unit }
    }
    return { ...item, value: item.refQty ?? 1, unit: unitRule?.units[0] ?? item.unit }
  })

  if (row.requiresFactor && !row.factorId) {
    const factor = demoFactorOf(row)
    if (factor) {
      row.factorId = factor.id
      row.factorName = factor.name
      row.factorValue = factor.value
    }
  }
}

/** 多产出工序的分配比例：单行填 100%，多行均分并补齐 100% */
function fillDemoRatio(rows: PcfActivityData[]): void {
  const grouped = new Map<string, PcfActivityData[]>()
  rows
    .filter((row) => row.direction === 'output' && row.allocateRatio == null)
    .forEach((row) => {
      const list = grouped.get(row.operationId) ?? []
      list.push(row)
      grouped.set(row.operationId, list)
    })

  grouped.forEach((list) => {
    if (list.length === 1) {
      list[0].allocateRatio = 100
      return
    }
    const base = Math.floor(100 / list.length)
    list.forEach((row, index) => {
      row.allocateRatio = index === list.length - 1 ? 100 - base * (list.length - 1) : base
    })
  })
}

/**
 * 预置演示数据：生成工序与填报行，并填入演示用的活动量、排放因子与分配比例，
 * 使「碳足迹核算」可直接算出跨阶段 / 跨工序 / 跨排放源的结果。
 * **仅影响 `DEMO_FILLED_PROJECTS` 中的项目**，其余项目仍按填报流程留空。
 */
function seedPcfDemoData(): void {
  // ① 项目内自定义产品的工序（PJ06 无产品工艺可复制，模拟填报人手工新增工序）
  const demoOps = clone(pcfDemoOperationSeed).map((op) => ({
    ...op,
    inputs: op.inputs.map(decorateProductFlow),
    outputs: op.outputs.map(decorateProductFlow),
  }))
  pcfOperationStore = [...pcfOperationStore, ...demoOps]

  // ② 生成工序副本 + 填报行 → ③ 填入演示值
  DEMO_FILLED_PROJECTS.forEach((projectId) => {
    const ops = ensureOperations(projectId)
    let rows = pcfActivityStore.filter((item) => item.projectId === projectId)
    const withRows = new Set(rows.map((row) => row.operationId))
    const missing = ops.filter((op) => !withRows.has(op.id))
    if (missing.length > 0) {
      const generated = missing.flatMap((op) => buildActivityRows(projectId, op))
      pcfActivityStore = [...pcfActivityStore, ...generated]
      rows = [...rows, ...generated]
    }
    rows.forEach(fillDemoRow)
    fillDemoRatio(rows)
  })
}

seedPcfDemoData()
seedPcfReportDemo()
