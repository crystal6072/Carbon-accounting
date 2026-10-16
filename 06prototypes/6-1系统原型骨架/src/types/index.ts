/** 使用状态（启用 / 禁用） */
export type EnableStatus = 'enabled' | 'disabled'

/** 分类层级（层级上限六级） */
export type CategoryLevel = 1 | 2 | 3 | 4 | 5 | 6

/** 产品分类（字段清单为唯一真相源，此处为前端原型投影） */
export interface CategoryItem {
  id: string
  /** 分类编码，唯一 */
  code: string
  /** 分类名称 */
  name: string
  /** 上级分类 id；null 表示一级分类 */
  parentId: string | null
  /** 分类层级：1 ~ 6（上限六级） */
  level: CategoryLevel
  /** 排序号，可为空 */
  sortNo: number | null
  /** 使用状态 */
  status: EnableStatus
  /** 备注 */
  remark: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

/* ===================== 产品信息库 ===================== */

/** 使用状态（产品级）：上架 / 下架 */
export type ProductUseStatus = 'on' | 'off'

/**
 * 投入产出流类型（**产品库与工序共用**的统一枚举）
 * - 投入项 ∈ { 原辅料, 能源, 自然资源输入 }
 * - 产出项 ∈ { 中间品, 产品, 副产品, 排放物 }
 */
export type FlowItemType = 'material' | 'energy' | 'resource' | 'semi' | 'product' | 'byproduct' | 'emission'

/** 排放物类别（仅流类型 = 排放物 时使用） */
export type EmissionCategory = 'gas' | 'wastewater' | 'residue'

/** 工序来源：模板复制 / 产品自建（【待确认 Q18】） */
export type OperationOrigin = 'template' | 'custom'

/**
 * 排放项处置（**公式下沉到工序的投入产出项**，取代原模型内「排放项级公式」）：
 * - `formula` 参与计算（系统默认带出，可手工覆盖具体公式）
 * - `excluded` 不参与计算（中间品 / 产品：其排放已计入上游工序，再算即重复计算）
 */
export type FlowFormulaDisposal = 'formula' | 'excluded'

/** 投入 / 产出项 */
export interface ProductFlowItem {
  id: string
  type: FlowItemType
  name: string
  qty: number
  unit: string
  /** 排放物类别（仅 type = emission 时使用） */
  emissionCategory?: EmissionCategory
  /**
   * 排放项公式（**随工序带入**，引用即复制）：系统默认带出、可手工覆盖。
   * 字段为空（`formulaId = ''`）表示沿用系统默认（按流类型 / 名称关键词带出）。
   */
  formulaId: string
  formulaCode: string
  formulaName: string
  formulaExpression: string
  /** 是否参与计算 */
  disposal: FlowFormulaDisposal
}

/** 产品工序（产品内的工序副本） */
export interface ProductOperationItem {
  id: string
  code: string
  name: string
  /** 工序顺序 */
  seq: number
  /** 来源模板标识：工序编码 + 复制时点 */
  sourceCode: string
  sourceCopiedAt: string
  /** 来源模板是否已更新（V0.1 仅展示提示） */
  sourceUpdated: boolean
  /** 工序来源 */
  origin: OperationOrigin
  /** 投入项（原料 / 能源） */
  inputs: ProductFlowItem[]
  /** 产出项（中间品 / 成品 / 副产品） */
  outputs: ProductFlowItem[]
}

/** 产品工艺（挂在产品下；工艺流程不做版本化，故不记录引用版本，已确认 Q05） */
export interface ProductProcessItem {
  id: string
  processCode: string
  processName: string
  /**
   * 所属生命周期阶段（**随工艺流程带出，来自工艺流程模板的 `lifecycleStage`**）。
   * 一个工艺流程对应一个生命周期阶段，产品引用工艺即确定该工艺下所有工序的阶段归属。
   */
  lifecycleStage: string
  /** 工艺顺序 */
  seq: number
  operations: ProductOperationItem[]
}

/** 产品（完整主数据；**不版本化**，工艺与工序组合直接挂在产品上） */
/** 产品场景应用（产品信息库：场景说明 + 多张场景图片） */
export interface ProductScenario {
  id: string
  /** 场景说明 */
  description: string
  /** 场景图片（支持多张，原型以 data URL 存储） */
  images: string[]
}

export interface ProductItem {
  id: string
  code: string
  name: string
  categoryId: string
  model: string
  spec: string
  /** 单位（引用计量单位库；合并承载原「计量单位」与「功能单位」口径） */
  unit: string
  /** 所属行业（引用行业库 A1-4） */
  industry: string
  /** 产品图片（**必填**，原型以 data URL 存储；维护入口：产品信息库 / 我的产品库） */
  imageUrl: string
  description: string
  /** 产品场景应用（选填；支持场景说明 + 多张场景图片） */
  scenarios?: ProductScenario[]
  /** 产品批次号（选填） */
  batchNo?: string
  /** 生产地点（选填） */
  productionSite?: string
  /** 生产功能（选填） */
  productionFunction?: string
  /** 使用状态：上架 / 下架 */
  useStatus: ProductUseStatus
  /** 工艺与工序组合（产品直接持有工序副本） */
  processes: ProductProcessItem[]
  org: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

/** 操作日志 */
export interface OperationLogItem {
  id: string
  time: string
  operator: string
  action: string
  detail: string
}

/* ===================== 我的产品库（产品碳足迹 · 组织自建，P27） ===================== */

/**
 * 产品来源（**二态**，业务裁定 2026-09-28：严格对齐方案 B2 原文，不做「复制成新的」）：
 * - `referenced` 引用标准产品：从平台级产品信息库（`PUBLIC`）**只读指向**（不落库，PRD Q02 建议口径），
 *   不可编辑 / 不可删除，上下架状态随后台产品信息库；
 * - `custom` 自己新增：从零新建的组织自建产品（`ORG`），可编辑，归属组织自动带出不可改（D03）。
 */
export type MyProductSource = 'referenced' | 'custom'

/** 我的产品库产品 = 后台产品结构投影（基本信息 + 工艺 + 工序组合）+ 来源二态 */
export interface MyProductItem extends ProductItem {
  /** 产品来源（系统带出，只读） */
  source: MyProductSource
  /** 来源产品（引用标准产品 = 平台级产品 id，追溯用；自己新增为 null） */
  sourceProductId: string | null
}

/** 引用标准产品的批量结果（对齐因子库批量引用结构） */
export interface MyProductBatchFailure {
  id: string
  code: string
  name: string
  reason: string
}

export interface MyProductBatchResult {
  success: number
  failed: MyProductBatchFailure[]
}

/** 工艺流程模板（引用「工艺流程库」A1-7，Mock；不做版本化，已确认 Q05） */
export interface ProcessTemplate {
  code: string
  name: string
  /** 所属生命周期阶段（来自工艺流程库，**一个工艺流程对应一个阶段**） */
  lifecycleStage: string
  operations: OperationTemplate[]
}

/** 工序模板（引用「工序管理」A1-8，Mock；模板层只描述投入产出物，公式在复制进产品 / 项目时按默认带出） */
export interface OperationTemplate {
  code: string
  name: string
  inputs: Array<Omit<ProductFlowItem, 'id' | 'formulaId' | 'formulaCode' | 'formulaName' | 'formulaExpression' | 'disposal'>>
  outputs: Array<Omit<ProductFlowItem, 'id' | 'formulaId' | 'formulaCode' | 'formulaName' | 'formulaExpression' | 'disposal'>>
}

/* ===================== 工序（系统管理 → 基础库 → 工艺库 → 工序，A1-8） ===================== */

/** 工序类型：主工序 / 辅助工序 / 处置工序（已确认 Q08，不设「工序分类」） */
export type OperationType = 'main' | 'auxiliary' | 'disposal'

/** 物料所属库（物料库 A1-1 / 能源库 A1-2，已确认 Q02 不合并） */
export type RefLibType = 'material' | 'energy'

/** 物料库选项（引用 A1-1） */
export interface MaterialOption {
  code: string
  name: string
  /** 默认单位（供核算填报侧引用；工序层不记录数量与单位） */
  unit: string
  status: EnableStatus
}

/** 能源库选项（引用 A1-2） */
export interface EnergyOption {
  code: string
  name: string
  unit: string
  status: EnableStatus
}

/**
 * 投入项 / 产出项行（工序的两张子表共用结构，F2）
 * 只定义「有哪些数据项」（流类型 + 物料 + 单位），**不含数量**；
 * 数量（工序单耗）在核算模型 / 数据录入（P22）阶段填写。
 */
export interface OperationFlowItem {
  id: string
  /** 行序：投入项 / 产出项各自独立编号（F1） */
  seq: number
  /** 流类型：投入项 ∈ {原辅料,能源,自然资源输入}；产出项 ∈ {中间品,产品,副产品,排放物}（F3 / D03） */
  flowType: FlowItemType
  /** 物料所属库（D04）：能源引用能源库，其余（原辅料 / 自然资源输入 / 产出各项）均引用物料库 */
  refType: RefLibType
  /** 物料编码（物料库 / 能源库） */
  refCode: string
  /** 物料名称（冗余，便于展示） */
  refName: string
  /** 计量单位：该数据项的计量基准，默认取物料的默认单位，可覆盖（引用计量单位库） */
  unit: string
  /** 仅产出项、且流类型 = 排放物：排放物类别（废气 / 废水 / 废渣，必填） */
  emissionCategory?: EmissionCategory
  remark: string
}

/** 工序（完整主数据；**不做版本化**，带投入项 / 产出项两张可维护子表） */
export interface OperationItem {
  id: string
  /** 工序编码，全租户唯一（D01） */
  code: string
  name: string
  type: OperationType
  /** 工序图标（选填，仅本地上传；原型以 data URL 存储，Q16） */
  iconUrl: string
  description: string
  useStatus: EnableStatus
  inputs: OperationFlowItem[]
  outputs: OperationFlowItem[]
  createdBy: string
  createdAt: string
  updatedAt: string
}

/* ============ 工艺流程（系统管理 → 基础库 → 工艺库 → 工艺流程，A1-7） ============ */

/** 可见性（方案 §3.3.3）：组织内可见 / 全平台只读 */
export type Visibility = 'ORG' | 'PUBLIC'

/**
 * 工序明细行（子表，1:N）
 * 主键 = 工艺流程 + 工序顺序（D04）；**只引用工序**，不维护工序的投入产出流（A4）
 */
export interface ProcessOperationItem {
  id: string
  /** 序号：行内展示顺序 */
  seq: number
  /** 工序顺序：执行顺序，必须连续且不重复（D04） */
  order: number
  /** 引用工序编码（引用工序管理 A1-8，仅可选启用中的工序，D02） */
  opCode: string
  /** 引用工序名称（冗余，便于展示） */
  opName: string
  remark: string
}

/**
 * 工艺流程（完整主数据，**不做版本化**，已确认 Q05；主键 = 工艺流程编码）
 * 模板层与工序之间为引用关系，被产品引用时复制并冻结（D09 / R-010）
 */
export interface ProcessItem {
  id: string
  /** 工艺流程编码，唯一（D01 / 【待确认 Q07】唯一范围） */
  code: string
  name: string
  /** 适用产品分类（说明性字段，不构成引用约束，A14） */
  categoryId: string
  /** 所属行业（引用行业库 A1-4，必填） */
  industry: string
  /** 所属生命周期阶段（引用生命周期阶段库，必填） */
  lifecycleStage: string
  description: string
  /** 使用状态：启用 / 禁用；仅「启用」可被产品引用（D10 / 已确认 Q11） */
  useStatus: EnableStatus
  /** 归属组织 */
  org: string
  visibility: Visibility
  /** 是否含处置工序（系统计算） */
  hasDisposal: boolean
  operations: ProcessOperationItem[]
  createdBy: string
  createdAt: string
  updatedAt: string
}

/** 适用产品（**只读反查**，由产品侧引用关系反推，A13 / 已确认 Q01） */
export interface ProcessApplicableProduct {
  id: string
  code: string
  name: string
  useStatus: ProductUseStatus
}

/** 工艺流程详情（含只读反查与复制情况） */
export interface ProcessDetail extends ProcessItem {
  applicableProducts: ProcessApplicableProduct[]
  /** 已复制本工艺流程的产品数（只读提示，不构成删除约束，R-013 / R-015） */
  copiedProductCount: number
}

/* ===================== 我的工艺库（产品碳足迹 · 组织自建工艺） ===================== */

/**
 * 我的工艺来源（**二态**，对齐「我的产品库」来源口径）：
 * - `referenced` 引用后台工艺：从平台级工艺流程库（`PUBLIC`）**只读指向**（不落库），
 *   不可编辑 / 不可删除，使用状态随后台工艺流程；
 * - `custom` 自己新增：从零新建的组织自建工艺（`ORG`），可编辑，归属组织自动带出不可改。
 */
export type MyProcessSource = 'referenced' | 'custom'

/** 我的工艺库工艺 = 后台工艺流程结构投影（基本信息 + 工序明细）+ 来源二态 */
export interface MyProcessItem extends ProcessItem {
  /** 工艺来源（系统带出，只读） */
  source: MyProcessSource
  /** 来源工艺（引用后台工艺 = 平台级工艺 id，追溯用；自己新增为 null） */
  sourceProcessId: string | null
}

/** 我的工艺详情（含只读反查与复制情况） */
export interface MyProcessDetail extends MyProcessItem {
  applicableProducts: ProcessApplicableProduct[]
  /** 已复制本工艺流程的产品数（只读提示，不构成删除约束） */
  copiedProductCount: number
}

/** 引用后台工艺的批量结果（对齐我的产品库批量引用结构） */
export interface MyProcessBatchFailure {
  id: string
  code: string
  name: string
  reason: string
}

export interface MyProcessBatchResult {
  success: number
  failed: MyProcessBatchFailure[]
}

/* ============ 物料库（系统管理 → 基础库 → 物料库，A1-1；轻量基础数据） ============ */

/**
 * 物料类型 · 一级 = **投入产出流**（与工序的 `FlowItemType` 严格同源，保证「物料类型 ↔ 投入产出流」对应挂接）
 * - 工序按流类型选用物料：投入项（原辅料 / 自然资源输入）、产出项（中间品 / 产品 / 副产品 / 排放物）
 * - **能源由能源库（A1-2）承载**，故物料库不含 `energy`
 */
export type MaterialFlowType = Exclude<FlowItemType, 'energy'>

/** 物料类型 · 二级子类：**仅当一级 = 原辅料（material）时维护** */
export type MaterialSubCategory = 'raw' | 'auxiliary' | 'packaging'

/**
 * 物料（主表，单一对象、无子表）
 * - **不持有单位**（§4.2 / D02 已废止）：单位由工序投入项 / 产出项逐行选择
 * - **不承载「数据来源 / 归属组织 / 数据获取方式 / 引用资源 / 可见性」**
 * - **不设引用状态控制**：所有物料均可新增 / 编辑，启用 ↔ 禁用双向可达，**仅「已禁用」可删除**
 */
export interface MaterialItem {
  id: string
  /** 物料编码，唯一（D01 / 【待确认 Q04】生成方式与唯一范围） */
  code: string
  /** 物料名称（不唯一） */
  name: string
  /** 物料类型（一级）：投入产出流 */
  flowType: MaterialFlowType
  /** 物料类型（二级）：仅 `flowType = 'material'`（原辅料）时有值，其余为 null */
  subCategory: MaterialSubCategory | null
  /** 适用行业：多选，引用行业库 A1-4（D06 / 【待确认 Q02】；行业库未交付时该字段降级，Q08） */
  industries: string[]
  /** 使用状态：启用 / 禁用（不进表单，走行操作；术语口径【待确认 Q03】） */
  status: EnableStatus
  /** 描述，选填，最长 500 字符（D03 / R-004） */
  description: string
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
}

/* ============ 计量单位库（系统管理 → 基础库 → 计量单位库，A1-9） ============ */

/**
 * 单位类型（**系统内置枚举，共 8 类**，不开放维护）：
 * 其中「数量」无基准单位且不可换算，其余类型各有且仅有 1 个基准单位（B1 / B4）。
 */
export type UnitType = 'weight' | 'energy' | 'distance' | 'volume' | 'area' | 'time' | 'quantity' | 'carbon'

/**
 * 计量单位（主表，单一对象、无子表；**轻量单位字典**，不设数据来源与引用状态）
 * 换算机制为**基准中转**：非基准单位只记录「相对同类型基准单位的乘数」（§5.1 / U1～U2）。
 */
export interface UnitItem {
  id: string
  /** 单位名称（如「千克」），**不唯一**（【待确认 Q06】） */
  name: string
  /** 单位符号（如 `kg`）；「单位符号 + 单位类型」唯一（D01） */
  symbol: string
  /** 单位类型：系统内置 8 类枚举 */
  unitType: UnitType
  /** 是否基准单位：每个类型下有且仅有 1 个（D02） */
  isBase: boolean
  /** 关联基准单位 id：非基准单位必填且必须同类型；基准单位为 null（D03 / B5） */
  baseUnitId: string | null
  /** 关联基准单位符号（冗余，便于列表 / 详情展示） */
  baseUnitSymbol: string | null
  /** 换算系数：本单位 → 基准单位的乘数；正数，基准单位恒为 1（D04） */
  factor: number
  /** 使用状态：启用 / 禁用（不进表单，走行操作） */
  status: EnableStatus
  /** 备注，选填短文本 */
  remark: string
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
}

/** 引用情况（只读反查）：引用本单位的物料 / 能源 / 工序 / 产品 / 因子清单（仅作展示，不构成操作约束） */
export interface UnitReferenceItem {
  id: string
  /** 引用模块（如「产品信息库」「排放因子库」） */
  module: string
  /** 引用对象（含编码，如「毛竹原竹（M-001）」） */
  target: string
  /** 引用字段（如「默认单位」「因子单位」） */
  field: string
}

/** 计量单位详情（含只读反查的引用清单） */
export interface UnitDetail extends UnitItem {
  references: UnitReferenceItem[]
}

/* ============ 能源库（系统管理 → 基础库 → 物料库 → 能源管理，A1-2；轻量基础数据） ============ */

/**
 * 能源类型 · 粗粒度枚举（对齐《能源字段清单》§5.1 / 【待确认 Q01】推荐口径）：
 * 只取 燃料 / 电力 / 热力 三类，**具体品名放「能源名称」**（如「柴油」「外购电力」「蒸汽」）。
 */
export type EnergyType = 'fuel' | 'electricity' | 'heat'

/**
 * 能源（主表，单一对象、无子表）
 * - **不持有单位**（§4.3 / N1）：单位由工序投入项 / 产出项逐行选择
 * - **暂不含「热值 + 热值单位」**（【待确认 Q12】：待排放因子库的因子表达口径确认后再定是否落字段）
 * - **不承载「数据来源 / 归属组织 / 数据获取方式 / 引用资源 / 可见性」**
 * - **不设引用状态控制**：所有能源均可新增 / 编辑，启用 ↔ 禁用双向可达，**仅「已禁用」可删除**
 */
export interface EnergyItem {
  id: string
  /** 能源编码，唯一（D01 / 【待确认 Q05】生成方式与唯一范围） */
  code: string
  /** 能源名称：具体品名，不唯一（T2） */
  name: string
  /** 能源类型：燃料 / 电力 / 热力（必填且受控，D06 / T3 / R-002） */
  energyType: EnergyType
  /** 适用行业：多选，引用行业库 A1-4（【待确认 Q09】；行业库未交付时该字段降级） */
  industries: string[]
  /** 使用状态：启用 / 禁用（不进表单，走行操作；术语口径与物料一致 Q03） */
  status: EnableStatus
  /** 描述，选填，最长 500 字符（D05 / R-005） */
  description: string
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
}

/* ============ 生命周期阶段（系统管理 → 基础库 → 生命周期阶段，A1-10；轻量基础数据） ============ */

/** 阶段层级：**仅支持一级 / 二级，不支持三级**（D03 / 方案 §4.2.4） */
export type LifecycleLevel = 1 | 2

/** 系统边界：引用「数据字典 · 系统边界」的字典项编码（如 `gate_to_gate` 大门到大门 / `gate` 摇篮到大门 / `grave` 摇篮到坟墓） */
export type LifecycleBoundary = string

/**
 * 生命周期阶段（主表，单一对象、无子表；层级用「阶段层级 + 上级阶段」自引用表达）
 * - **轻量基础数据**：与物料库 / 能源库同口径 —— **不设「数据来源」、不设「引用状态」**，
 *   所有阶段统一维护（启用 ↔ 禁用双向可达，**仅「已禁用」可删除**）
 * - 推荐口径 A（【待确认 Q01】）：不建独立「阶段基线」对象，基线 = 按「边界」查询出的集合
 * - **不设「排除原因」字段**：「排除 + 填原因」属项目级行为（P20），不回写主数据（D09 / 【待确认 Q03】）
 */
export interface LifecycleStageItem {
  id: string
  /** 阶段编码，唯一（D01 / 【待确认 Q06】生成方式与唯一范围） */
  code: string
  /** 阶段名称：**同级内唯一**（D04） */
  name: string
  /** 阶段层级：一级 / 二级 */
  level: LifecycleLevel
  /** 上级阶段 id：**二级必填且只能指向一级阶段**（D02）；一级阶段为 null */
  parentId: string | null
  /** 阶段顺序：同级内不重复，一级与二级各自独立排序（D05 / D11） */
  order: number
  /** 阶段描述，选填长文本 */
  description: string
  /** 适用系统边界：多选，引用「数据字典 · 系统边界」字典项编码；**为空 = 全边界通用** */
  boundaries: string[]
  /** 使用状态：启用 / 禁用（不进表单，走行操作） */
  status: EnableStatus
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
}

/* ============ 数据字典（系统管理 → 平台支撑 → 数据字典；轻量基础数据） ============ */

/**
 * 字典类型：一类可枚举口径的集合（如「系统边界」）。
 * 系统边界字典的字典项即前台「核算边界」下拉与生命周期阶段「适用系统边界」的取值来源。
 */
export interface DictType {
  id: string
  /** 类型编码，唯一，如 `SYSTEM_BOUNDARY`（系统边界） */
  code: string
  /** 类型名称，如「系统边界」 */
  name: string
  /** 类型说明 */
  remark: string
  /** 使用状态：启用 / 禁用 */
  status: EnableStatus
  /** 是否系统内置（内置类型不可删除，仅可维护其下字典项） */
  builtin: boolean
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
}

/** 字典项：隶属于某个字典类型；编码在类型内唯一 */
export interface DictItem {
  id: string
  /** 所属字典类型 id */
  typeId: string
  /** 字典项编码，类型内唯一，如 `gate_to_gate` */
  code: string
  /** 字典项名称，如「大门到大门」 */
  label: string
  /** 排序号：同级从小到大 */
  sort: number
  /** 说明 / 口径备注 */
  remark: string
  /** 使用状态：启用 / 禁用（仅启用项可被业务引用） */
  status: EnableStatus
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
}

/** 系统边界字典类型编码（约定值，供前台「核算边界」与生命周期阶段「适用系统边界」引用） */
export const DICT_TYPE_SYSTEM_BOUNDARY = 'SYSTEM_BOUNDARY'

/* ============ 标准文件库（系统管理 → 基础库 → 标准文件库，A1-3 / P05；轻量基础数据） ============ */

/**
 * 标准状态（**录入框 · 自由文本**，非枚举受控）：
 * 由用户直接录入，常用取值「现行 / 被替代 / 作废」，也支持录入「即将实施 / 废止」等其他官方表述。
 * 「现行」可被核算模型引用（D10）。
 */
export type StandardStatus = string

/**
 * 标准文件附件（字段清单 §1.2 / 业务 PRD §4）：
 * 由附件管理（§C6）承载；**选填、可多个**；与「来源链接」**二选一**（至少填一个）；
 * **支持在线预览**（PDF / 图片直接渲染，其他格式提示下载）；**仅限内部查阅，不得作为对外交付物**（A3 / R-011）。
 */
export interface StandardAttachment {
  id: string
  /** 附件文件名（如 `GB/T 24067-2024.pdf`） */
  name: string
  /** 文件大小（字节） */
  size: number
  /** 上传时间（`YYYY-MM-DD HH:mm`） */
  uploadedAt: string
  /**
   * 预览地址（原型环境）：
   * - 本地选择的文件读取为 data URL，用于在线预览；
   * - 系统预置附件为空 → 走「模拟预览」占位。
   */
  url?: string
}

/**
 * 标准文件（主表，单一对象、无子表；**无审核流、无版本化**）
 * - **一个标准号 = 一条记录**：版本年份并入「标准号」（如 `GB/T 24067-2024`），唯一键 = 标准号（D01 / D02）
 * - 必填：标准号 / 中文标准名称 / 标准状态 / 发布日期 / 实施日期 / 发布单位
 * - 非必填：英文标准名称 / 来源链接 / 主管部门 / 归口部门 / 附件
 * - **「来源链接」与「附件」二选一**（至少填一个，D03）
 */
export interface StandardItem {
  id: string
  /** 标准号（含年份，如 `GB/T 24067-2024`、`ISO 14067:2018`）；唯一（D01 / D02） */
  code: string
  /** 中文标准名称（如《温室气体 产品碳足迹 量化要求和指南》） */
  nameZh: string
  /** 英文标准名称（选填） */
  nameEn: string
  /** 标准状态：现行 / 被替代 / 作废（业务状态，决定能否被引用） */
  status: StandardStatus
  /** 发布日期：标准的发布 / 公告日期，**必填**（D04） */
  publishDate: string
  /** 实施日期：标准的实施 / 生效日期，**必填**，须 ≥ 发布日期（D04） */
  implementDate: string
  /** 发布单位（如 国家市场监督管理总局、国家标准化管理委员会 / ISO），**必填** */
  publisher: string
  /** 来源链接：标准官方发布页 / 在线查询链接（选填，与「附件」二选一，D03 / D05） */
  sourceUrl: string
  /** 主管部门（选填） */
  competentDept: string
  /** 归口部门（选填，如 全国环境管理标准化技术委员会（SAC/TC 207）） */
  responsibleDept: string
  /** 附件：选填、可多个；与「来源链接」二选一（D03）；仅限内部查阅（A3） */
  attachments: StandardAttachment[]
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
}

/* ============ 行业库（系统管理 → 基础库 → 行业库，A1-4；轻量行业字典） ============ */

/**
 * 行业层级：**门类 / 大类 / 中类 / 小类**（对齐《国民经济行业分类》GB/T 4754 四级口径，
 * 由「上级行业」推导，不设独立字段表达）
 */
export type IndustryLevel = 1 | 2 | 3 | 4

/**
 * 行业（主表，单一对象、无子表；**轻量行业字典**）
 * - 只回答「有哪些行业、叫什么、怎么分级」：编码 / 名称 / 上级行业 / 排序号 / 描述 / 使用状态
 * - **不承载任何行业参数**：阶段配置归生命周期阶段（A1-10）、因子集归排放因子库（A2-6）、
 *   规则模板归核算模型（A2-3）；行业库只作为下游行业化配置的锚点
 * - 与物料库 / 能源库 / 生命周期阶段同口径：**不设数据来源、不设引用状态、不做版本化**，
 *   启用 ↔ 禁用双向可达，V0.1 不提供删除入口（对齐「产品分类」交互）
 * - 下游引用方：物料 / 能源的「适用行业」（多选）、产品信息 / 工艺流程 / 工序的「所属行业」（单选必填）
 */
export interface IndustryItem {
  id: string
  /** 行业编码，唯一 */
  code: string
  /** 行业名称：**同级内唯一** */
  name: string
  /** 行业层级：门类 / 大类 / 中类 / 小类（派生值，随「上级行业」联动） */
  level: IndustryLevel
  /** 上级行业 id：**非门类必填，且只能指向其上一级**；门类为 null */
  parentId: string | null
  /** 排序号：选填，越小越靠前 */
  sortNo: number | null
  /** 行业描述（备注），选填，最长 500 字符 */
  description: string
  /** 使用状态：启用 / 禁用（不进表单，走行操作） */
  status: EnableStatus
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
}

/* ============ 排放因子库（系统管理 → 核算模型 → 排放因子库，A2-6 / A2-7） ============ */

/**
 * 因子分类（**系统内置枚举，共 6 类**，方案 §4.4），不开放维护。
 */
export type FactorCategory = 'material' | 'energy' | 'transport' | 'waste' | 'eol' | 'biocarbon'

/**
 * 因子来源（**仅用于权限与可见性判定**，不在表单维护）：
 * - `preset` = environment 库（系统预置，`PUBLIC`，只读）
 * - `custom` = 自定义因子库（组织自建，`ORG`，可编辑）
 */
export type FactorSource = 'preset' | 'custom'

/**
 * 因子口径（GWP 分项，选填）。
 * - 与 `FactorItem.value` 关系：`value` = GWP 总量（= 化石 + 生物 + 土地利用），保持向后兼容；
 * - 提供分项后，核算可按「含 / 不含生物碳」双口径输出（不含生物碳 = `gwpFossil`）；
 * - 全部选填：仅有单值 `value` 的因子视为「单一不可拆口径」。
 */
export interface FactorCalibers {
  /** GWP 总量（= 化石 + 生物 + 土地利用）；缺省时回退 `FactorItem.value` */
  gwpTotal?: number | null
  /** 化石源 GWP（对应「不含生物碳」口径） */
  gwpFossil?: number | null
  /** 生物源 GWP：吸收为**负**、释放为**正**（对应两口径之差） */
  gwpBiogenic?: number | null
  /** 土地利用变化 GWP */
  gwpLuluc?: number | null
}

/**
 * 排放因子（库内因子，统一字段集）
 * - 因子信息：名称 / 别名 / 适用场景 / 因子值 / 分子单位 / 活动数据单位 / 单位类别 / 地域 / 描述
 * - 因子单位为**复合单位**：分子（碳排放量类 `numeratorUnit`）+ 分母（活动数据单位 `denominatorUnit`），分别引用计量单位库（A1-9）
 * - 多库模型：归属「库 + 库版本」；商业数据库（external）另带 `ext` / `exchanges`
 * - V0.3：**移除「因子分类 / 适用行业」与「来源信息」（来源类别 / 发布年份 / 发布日期 / 发布机构等）**
 * - 增强：新增 `calibers`（GWP 分项口径），支持含 / 不含生物碳双口径（选填）
 */
export interface FactorItem {
  id: string
  /** 因子编码（系统生成，列表展示用） */
  code: string
  /** 因子名称 */
  name: string
  /** 因子别名（选填） */
  alias: string
  /** 英文名称（选填，前后台通用；商业数据库取数据集英文名） */
  englishName?: string
  /** 适用场景（如「电力消耗 / 燃料燃烧」，文本） */
  scenario: string
  /** 碳排放因子值（生物碳吸收因子可为负） */
  value: number
  /** GWP 分项口径（选填；提供后可分「含 / 不含生物碳」双口径输出） */
  calibers?: FactorCalibers
  /** 单位（分子，碳排放量类，默认 kgCO₂e；引用计量单位库） */
  numeratorUnit: string
  /** 活动数据单位（分母；须与活动数据单位可换算，否则 E04） */
  denominatorUnit: string
  /** 来源（数据来源，权限档位，内部推导字段）：environment 库 / 自定义因子库 */
  source: FactorSource
  /**
   * 是否已被当前组织引用到前台「我的因子库」（**引用，不复制**）。
   * 仅后台维护因子（`source = 'preset'`）可被引用；引用后在本组织可见且**只读**
   * （不可编辑 / 启用 / 禁用 / 删除），因子主体仍由后台维护。
   * @deprecated 多库模型下由「收藏副本」机制取代，仅作兼容保留。
   */
  referenced?: boolean
  /* ---- 多库模型（V0.2 新增）：因子归属「库 + 库版本」 ---- */
  /** 所属因子库 id */
  libraryId?: string
  /** 所属库版本 id */
  libraryVersionId?: string
  /** 单位类别（商业数据库，如 质量 / 能量 / 体积） */
  unitCategory?: string
  /** 适用地域（商业数据库，如 中国 / 秘鲁 / 全球） */
  region?: string
  /** 商业数据库扩展信息（Ecoinvent 数据集字段，自建库不填） */
  ext?: FactorExt
  /** 商业数据库输入输出清单（自建库不填） */
  exchanges?: FactorExchange[]
  /** 描述，选填，最长 500 字符 */
  description: string
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
}

/** 引用情况（只读反查）：引用本因子的活动数据 / 核算结果清单 */
export interface FactorReferenceItem {
  id: string
  /** 引用模块（如「活动数据」「核算结果」） */
  module: string
  /** 引用对象（含编码，如「240mm 全竹碳化筷项目（PCF-2026-001）」） */
  target: string
  /** 引用字段（如「匹配因子」） */
  field: string
}

/** 排放因子详情（含只读反查的引用清单） */
export interface FactorDetail extends FactorItem {
  references: FactorReferenceItem[]
}

/* ---- 多因子库模型（V0.2）：库 / 库版本 / 外部库扩展 / 我的因子库 ---- */

/**
 * 库来源（决定库内因子的可维护性）：
 * - `external` 商业数据库（如 Ecoinvent 3.11 / CPCD）：整库导入、库内因子**只读**；
 * - `builtin` 自建库：库内因子可新增 / 编辑 / 删除 / 批量导入。
 */
export type FactorLibraryType = 'external' | 'builtin'

/**
 * 库版本状态（**软件发版模型**：同一库同时只有一个「生效中」版本）：
 * - `draft` 草稿：可编辑 / 可删除；前台不可见、不参与匹配；
 * - `published` 生效中：当前对外生效的版本（唯一）；发布后不可修改，只能新建版本；
 * - `history` 历史版本：曾生效过、已被新版本或回滚替代；只读，可回滚重新设为生效。
 */
export type FactorLibraryVersionStatus = 'draft' | 'published' | 'history'

/** 碳类型：化石 / 生物 / 土地利用（用于从交换数据归集 GWP 分项） */
export type ExchangeCarbonType = 'fossil' | 'biogenic' | 'luluc'

/** 商业数据库因子的输入输出子项（Ecoinvent 交换记录） */
export interface FactorExchange {
  id: string
  /** 方向：输入 / 输出 */
  direction: 'input' | 'output'
  /** 名称（如 Carbon dioxide, in air） */
  name: string
  /** 数量 */
  amount: number
  /** 单位（如 kg） */
  unit: string
  /** 上游（输入）/ 下游（输出）过程名称 */
  counterpart: string
  /**
   * 碳类型（选填）：标明该基本流属于化石 / 生物 / 土地利用碳。
   * 用于「从交换数据归集 GWP 分项」（如 `Carbon dioxide, in air` = biogenic 吸收）。
   */
  carbonType?: ExchangeCarbonType | null
  /** 环境介质（air / water / soil，选填） */
  compartment?: string
  /** 该基本流的 GWP100 系数（选填；CO₂=1、CH₄≈27.9，吸收记负） */
  gwp100?: number | null
}

/** 商业数据库因子的扩展信息（对齐 Ecoinvent 数据集「数据基本信息」） */
export interface FactorExt {
  /** 产品名称 */
  productName?: string
  /** CAS 号 */
  casNo?: string
  /** 所有者（如 Ecoinvent3.11,Cutoff） */
  owner?: string
  /** 所有者名称（拆分「所有者 + 版本」，如 Ecoinvent） */
  ownerName?: string
  /** 所有者版本（如 3.11） */
  ownerVersion?: string
  /** 系统模型：截断 / 分配口径（Cutoff / APOS / Consequential） */
  systemModel?: 'cutoff' | 'apos' | 'consequential'
  /** 特征化方法 / 指标（决定生物碳如何计入，如 IPCC2021 GWP100 / EF3.1 / EN15804+A2） */
  lciaMethod?: string
  /** GWP 版本（如 AR5 / AR6） */
  gwpVersion?: string
  /** 该因子值是否已包含生物碳（口径声明） */
  biogenicIncluded?: boolean
  /** 过程描述 */
  processDescription?: string
  /** 时间边界 */
  timeBoundary?: string
  /** 时间描述 */
  timeDesc?: string
  /** 地域 */
  geoName?: string
  /** 地理信息描述 */
  geoDesc?: string
  /** 工艺技术描述 */
  techDesc?: string
  /** 完整性说明 */
  completeness?: string
  /** ISIC 门类编码（一级分类，A~S，如 C = 制造业） */
  isicCode?: string
  /** ISIC 门类名称 */
  isicName?: string
  /** ISIC 类编码（二级分类，两位，如 24 = 基本金属制造） */
  isicDivisionCode?: string
  /** ISIC 类名称 */
  isicDivisionName?: string
}

/** 因子库（一个平台可有多个库） */
export interface FactorLibrary {
  id: string
  /** 库编码（系统生成，LB-xxx） */
  code: string
  /** 库名称（如「中国官方排放因子库」「Ecoinvent 3.11」） */
  name: string
  /** 库来源：商业数据库 / 自建 */
  type: FactorLibraryType
  /** 库描述 */
  description: string
  /** 维护方（如 平台运营 / Ecoinvent） */
  maintainer: string
  /**
   * 库级上架状态（**整库下架**）：
   * - `false` / 缺省 = 在线（前台可见、参与因子匹配）；
   * - `true` = 已下架（前台不可见、不参与匹配；数据与版本保留、不可删除，可重新上架）。
   * 注意：**下架不改变库内版本状态**，库内仍保留已发布版本（版本层面不允许「零在线版本」）。
   */
  offline?: boolean
  /** 当前已发布版本 id（无已发布版本时为 null） */
  currentVersionId: string | null
  /** 版本数 */
  versionCount: number
  /** 当前展示版本的版本号（如 V1.0 / 3.11 / 2025，取当前发布版本） */
  currentVersionNo?: string
  /** 因子数（取当前版本） */
  factorCount: number
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
}

/** 库版本（库级版本化载体：外部库如 3.11/3.12；自建库如 V1.0/2024） */
export interface FactorLibraryVersion {
  id: string
  libraryId: string
  /** 版本号（如 V1.0 / 3.11 / 2024）；库内唯一、单调递增（= 发布次序，不表示血缘） */
  versionNo: string
  /** 适用年度（选填） */
  year: string
  /** 版本状态 */
  status: FactorLibraryVersionStatus
  /** 版本更新说明 */
  changeNote: string
  /** 因子数 */
  factorCount: number
  /** 快照来源版本号（新建版本时复制的是哪个版本，便于追溯血缘） */
  basedOnVersionNo?: string
  publishedBy?: string
  /** **首次发布时间**（仅首次由草稿发布时写入，回滚不覆盖） */
  publishedAt?: string
  /** **最近一次生效时间**（每次发布 / 回滚均更新） */
  lastActivatedAt?: string
  createdBy: string
  createdAt: string
}

/** 我的因子库（前台私有：仅本人 / 本组织可见，不发布、不版本化） */
export interface MyFactorLibrary {
  id: string
  name: string
  description: string
  factorCount: number
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
}

/** 我的因子来源：`manual` 手工新增 / `collected` 收藏副本（复制式快照，不随源库变化） */
export type MyFactorOrigin = 'manual' | 'collected'

/** 我的因子（沿用因子统一字段 + 来源元数据） */
export interface MyFactor extends FactorItem {
  /** 所属我的因子库 */
  libraryId: string
  origin: MyFactorOrigin
  /* ---- 收藏副本的来源元数据（origin = collected 时有值） ---- */
  sourceLibraryId?: string
  sourceLibraryName?: string
  sourceVersionId?: string
  sourceVersionNo?: string
  sourceFactorId?: string
  sourceFactorCode?: string
  /** 源库已发布新版本且该因子值发生变化（用于「有新版本可更新」提示） */
  updateAvailable?: boolean
  /**
   * 收藏副本的**来源状态**（`origin = collected` 时有意义）：
   * - `ok` 正常；
   * - `offline` 来源库已下架（前台不可见），副本停留在快照值；
   * - `removed` 来源库最新版本中该因子已被移除。
   */
  sourceStatus?: 'ok' | 'offline' | 'removed'
}

/* ============ 计算引擎配置（系统管理 → 核算模型 → 计算引擎配置，A2-3） ============ */

/**
 * 计算方向（字段清单 §2 calculation_direction）：
 * `positive` 正排放（加总） / `negative` 负排放（扣减） / `deduction` 扣减项
 */
export type CalculationDirection = 'positive' | 'negative' | 'deduction'

/** 排放源类型（字段清单 §2 emission_source_type） */
export type EmissionSourceType =
  | 'material'
  | 'energy'
  | 'electricity'
  | 'heat'
  | 'transport'
  | 'fuel'
  | 'refrigerant'
  | 'waste'
  | 'eol'
  | 'recycling'
  | 'biocarbon'
  | 'other'

/** 循环对象（字段清单 §2 loop_object）：系统按该对象逐行 Σ 计算 */
export type LoopObject =
  | 'activity'
  | 'material'
  | 'energy'
  | 'transport'
  | 'fuel'
  | 'refrigerant'
  | 'waste'
  | 'eol'
  | 'project_param'
  | 'none'

/** 数据归属（字段清单 §1 data_owner_type）：系统预置 / 组织自建 */
export type DataOwnerType = 'preset' | 'org'

/**
 * 公式类型（字段清单 §3 formula_type）：按“输入口径”分三类
 * - `factor` 因子公式：活动量 × 因子（材料、运输、末期处理、回收信用等）
 * - `energy` 能耗公式：能源 / 燃料消耗 → 碳排（电力、热力、燃料燃烧等）
 * - `carbon` 碳排公式：输入即碳排量（如制冷剂泄漏量 × GWP、直接给定碳排）
 * - `other` 其他：前三类之外的兜底
 *
 * 方法学差异（材料 / 运输 / 热力 / 制冷剂 / 末期处理 / 回收信用）由建模时绑定的
 * 「排放源类型 + 循环对象」承担；阶段汇总由建模侧的生命周期阶段汇总，不单设汇总公式。
 */
export type FormulaType = 'factor' | 'energy' | 'carbon' | 'other'

/**
 * 数据因素来源类型：
 * - `activity` 活动数据（系统标准取数项，填报侧取值）
 * - `variable` 自定义变量（用户自命名、可多条，运行时取值，如使用年限、年能耗量）
 * - `factor` **因子占位**（**只维护名称**，默认名「排放因子」：公式模板不绑定具体业务库对象，
 *   具体取值由项目步骤② 手动匹配的因子代入）
 * - `constant` 常量（氧化率、44/12、方向系数等固定参数）
 * - `parameter` 参数占位（语义同 `factor`，保留以兼容历史数据）
 */
export type FactorSourceType = 'activity' | 'variable' | 'factor' | 'constant' | 'parameter'

/**
 * 数据因素（公式中的参与运算项，对齐竞品「数据因素」行）：
 * 只保留「叫什么、从哪来、值多少、单位是什么」，不再暴露变量类型 / 来源字段 / 单位换算等配置项。
 */
export interface FormulaFactor {
  id: string
  /** 因素名称：直接作为公式表达式中的运算项名称（如「活动数据」「铝锭」） */
  name: string
  sourceType: FactorSourceType
  /** 来源库（**兼容保留**，因子占位不再绑定业务库对象） */
  sourceLib: string
  /** 引用对象编码（**兼容保留**） */
  sourceCode: string
  /** 引用对象名称（**兼容保留**） */
  sourceName: string
  /** 因素数值：常量类手工维护；活动数据 / 变量 / 因子运行时取值，不在此维护 */
  value: string
  /** 因素单位：常量类可维护；活动数据 / 变量 / 因子运行时取值，不在此维护 */
  unit: string
}

/**
 * 计算公式（字段清单 §3 公式主对象）
 * - **轻量配置对象**：不做审核 / 发布流程、不做版本化（可直接编辑），使用状态为启用 / 禁用
 * - **与生命周期阶段无关**：公式只解决「一类计算项怎么算」，可跨阶段、跨方案复用
 */
export interface CalcFormula {
  id: string
  code: string
  name: string
  formulaType: FormulaType
  /** 计算公式：由「数据因素 + 运算符」点选生成，如 `活动数据*铝锭`（不使用脚本） */
  expression: string
  resultName: string
  resultUnit: string
  supportsSumLoop: boolean
  supportsNegativeResult: boolean
  dataOwnerType: DataOwnerType
  ownerOrg: string
  /** 使用状态：启用 / 禁用（不走表单，行操作维护；仅「已禁用」可删除） */
  status: EnableStatus
  description: string
  /** 数据因素：公式中的取数项，含活动数据 / 业务库取值 / 常量 */
  factors: FormulaFactor[]
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
}

/* ===================== 产品碳足迹 · 核算项目（P17 / P18） ===================== */

/**
 * 核算项目状态（2026-10-16 收敛口径）。
 *
 * **在役状态机**（用户口径）：
 * `new` 新建（草稿）→ 步骤①「下一步」保存 → `ongoing` 待处理（生成编号 PCF-YYYYMMDD-NNN、落库）
 * → 步骤②「下一步」保存 → `toCheck` 待检测 → 「一键检测」通过 → `toCalc` 待核算
 * → 「开始核算」→ `done` 已完成；检测不通过 → 回退 `ongoing` 待处理。
 *
 * **已移除**：检测中（`checking`）、核算中（`calculating`）、已核算（`calculated`）——
 * 枚举保留以兼容既有数据与 mock，工作流不再产生。
 * `reportGenerating` / `reportEditing` 为报告环节移除前的历史状态，枚举保留仅供兼容。
 */
export type PcfProjectStatus =
  | 'new'
  | 'ongoing'
  | 'toCheck'
  | 'toCalc'
  | 'checking'
  | 'calculating'
  | 'calcFailed'
  | 'calculated'
  | 'reportGenerating'
  | 'reportEditing'
  | 'done'

/** 核算边界：引用「数据字典 · 系统边界」字典项编码（如 `gate` 摇篮到大门 / `grave` 摇篮到坟墓 / `gate_to_gate` 大门到大门） */
export type PcfBoundary = string

/** 产品来源：引用产品库 / 项目内自定义 */
export type PcfProductSource = 'library' | 'custom'

/**
 * 核算项目（前台主对象，投影自《核算项目字段清单》粗纲简表）。
 * - **一项目一边界**：`boundary` 创建后不可修改
 * - **引用即复制**：产品与工序以快照带入项目
 * - `currentStep` 为工作台步骤（1~5），与 `status` 映射见业务 PRD §5.4
 */
export interface PcfProject {
  id: string
  /** 项目编号，系统生成 `PCF-YYYYMMDD-NNN`，不可修改 */
  code: string
  name: string
  /** 核算主体组织（决定数据权限归属） */
  ownerOrg: string
  /** 统计时间（起止）：**V0.5 由原「核算年度 + 核算周期」合并** */
  startDate: string
  endDate: string
  productSource: PcfProductSource
  /** 引用产品（来源 = library 时必填） */
  refProductId: string | null
  /** 产品编码（引用产品时带出；自定义时为空） */
  productCode?: string
  productName: string
  /** 产品型号 */
  productModel?: string
  productSpec: string
  /** 产品图片（**必填**；引用产品时带出快照，原型以 data URL 存储） */
  productImageUrl?: string
  /** 产品分类 */
  productCategory?: string
  /** 所属行业（用于匹配行业阶段基线与核算模型） */
  productIndustry?: string
  /** 产品版本（当前生效版本号，只读） */
  productVersion?: string
  /**
   * 单位（= 结果表达基准，如 `kgCO₂e / 双`）。
   * **取值来自计量单位库**；默认带出所选产品的「单位」，允许项目级重选（不写回产品库）。
   * 字段名保留 `functionalUnit`（历史命名），界面标签统一为「单位」。
   */
  functionalUnit: string
  /** 声明/功能单位数值（文本框录入，如 `5 Item(s)` 中的 5） */
  functionalUnitValue?: number | string | null
  /**
   * 转换系数（步骤①「产品」）：功能单位 / 声明单位与产品单位的换算比例。
   * 如声明单位为「盒」、产品单位为「双」且 1 盒 = 100 双，则转换系数 = 100；与产品单位一致时为 1。
   */
  conversionFactor?: number | null
  /** 单位转换系数的来源单位（如 `Item(s)`） */
  conversionUnit?: string
  /** 单位转换系数的换算后单位（如 `kg`，用于「Item(s) = 1kg」表达） */
  convertedUnit?: string
  /** 产品净重（按批次实测，> 0；为空 = 未填，触发 E01） */
  netWeight?: number | null
  /** 净重单位（重量类计量单位） */
  netWeightUnit?: string
  /** 核算方法：引用标准文件库（显示文本，如 `GB/T 24067-2024`） */
  method?: string
  /** 核算方法引用的标准文件 id */
  methodId?: string
  /** 生命周期阶段（目标与范围：按边界带出 + 项目内自定义，V0.6） */
  lifecycleStages?: PcfLifecycleStage[]
  boundary: PcfBoundary
  /** 当前步骤（1~4；V0.8 报告环节移除后「碳足迹核算与结果」为最后一步） */
  currentStep: number
  status: PcfProjectStatus
  remark: string
  /** 新建来源模型 id（引用模型带入步骤①②时记录，追溯用；自定义新建为空） */
  sourceModelId?: string
  /** 新建来源模型名称（快照，来源模型被删除后仍可展示） */
  sourceModelName?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  /**
   * 最近一次核算的**总碳排放量**（kgCO₂e）——仅列表投影用，未核算为 null。
   * 列表「碳排放量」列只展示该总值。
   */
  totalEmission?: number | null
  /** 最近一次核算时间——仅列表投影用，未核算为空 */
  calculatedAt?: string
}

/**
 * 项目内生命周期阶段（步骤①「目标与范围」）。
 * 按「核算边界」带出该边界关联的生命周期阶段（required 锁定 / optional 可自定义 / excluded 不适用），
 * 并允许项目内自定义（勾选纳入 / 新增自定义阶段）。
 */
export interface PcfLifecycleStage {
  /** 阶段 id（来自生命周期阶段库；自定义阶段为项目内生成 id） */
  id: string
  name: string
  /** 阶段层级：一级 / 二级 */
  level: LifecycleLevel
  /** 所属一级阶段名称（二级阶段展示用） */
  parentName?: string
  /** 是否为项目内自定义新增 */
  custom: boolean
  /** 阶段描述（来自生命周期阶段库，配置弹窗展示用） */
  description?: string
  /** 是否纳入本次核算（按边界带出后默认全部纳入，项目内可自定义取消） */
  included: boolean
}

/** 组织选项（Mock，引用组织架构） */
export interface PcfOrgOption {
  id: string
  name: string
}

/* ============ 前台 · 产品建模（步骤②）：生命周期阶段数据项 ============ */

/** 数据项方向：输入 / 输出 */
export type PcfDataItemDirection = 'input' | 'output'

/**
 * 数据项类型：
 * - 输入：原辅料 / 自然资源 / 能源及能源介质
 * - 输出：产品 / 中间产品 / 副产品 / 排放物
 */
export type PcfDataItemType =
  | 'material'
  | 'natural'
  | 'energy'
  | 'product'
  | 'intermediate'
  | 'byproduct'
  | 'emission'

/** 排放物类型（输出 · 排放物）：废水 / 废渣 / 废气 */
export type PcfEmissionType = 'wastewater' | 'wasteSolid' | 'wasteGas'

/**
 * 数据凭证附件（活动数据支撑材料，《整体设计方案》§6.3「数据版本与追溯」）：
 * **选填、可多个**；原型以 data URL 本地存储，不落真实文件服务。
 */
export interface PcfVoucher {
  id: string
  /** 文件名称（如 `电费发票_2026Q1.pdf`） */
  name: string
  /** 文件大小（字节） */
  size: number
  /** 预览 / 下载地址（原型 = data URL） */
  url: string
  /** 上传时间 `YYYY-MM-DD HH:mm` */
  uploadedAt: string
}

/**
 * 产品建模（步骤②）：生命周期阶段下的数据项。
 * 默认按步骤①勾选的生命周期阶段带出；每个阶段按「输入 / 输出」维护数据项清单（支持新增 / 删除）。
 */
export interface PcfStageDataItem {
  id: string
  projectId: string
  /** 所属生命周期阶段 id / 名称（来自步骤①） */
  stageId: string
  stageName: string
  /** 所属过程节点（为空 = 直接挂在生命周期阶段下） */
  nodeId?: string | null
  /** 输入 / 输出 */
  direction: PcfDataItemDirection
  /** 数据项名称 */
  name: string
  /** 数据项类型 */
  itemType: PcfDataItemType
  /** 排放物类型（仅输出 · 排放物时有效） */
  emissionType?: PcfEmissionType | null
  /** 数量 */
  quantity: number | null
  /** 单位 */
  unit: string
  /** 排放因子（引用排放因子库） */
  factorId: string | null
  /** 排放因子名称（快照） */
  factorName: string
  /** 排放因子数值（快照） */
  factorValue: number | null
  /** 排放因子口径快照（选填；来自所选因子，用于「含 / 不含生物碳」双口径核算） */
  factorCalibers?: FactorCalibers | null
  /** 数据凭证附件（**选填、可多个**；支撑该条活动数据的凭证材料） */
  vouchers?: PcfVoucher[]
}

/**
 * 过程节点（步骤②「继续追溯」生成的上游过程）。
 * 数据项点击「继续追溯」即按该项名称生成一个子节点，可在节点下录入其自身的输入 / 输出数据。
 */
export interface PcfProcessNode {
  id: string
  projectId: string
  /** 所属生命周期阶段 */
  stageId: string
  /** 父节点（空 = 直接挂在生命周期阶段下） */
  parentId: string | null
  /** 节点名称（来源于触发追溯的数据项名称） */
  name: string
  /** 触发追溯的数据项 id（用于回显「上游过程名称」） */
  sourceItemId?: string | null
}

/** 当前生命周期阶段的导入行（预设输入 / 输出） */
export interface PcfStageImportRow {
  name: string
  itemType: PcfDataItemType
  emissionType?: PcfEmissionType
  unit: string
}

/** 当前生命周期阶段的导入预设 */
export interface PcfStageImportPreset {
  inputs: PcfStageImportRow[]
  outputs: PcfStageImportRow[]
}

/** 产品选项（Mock，引用产品信息库 A1-6；仅上架产品可选） */
export interface PcfProductOption {
  id: string
  code: string
  name: string
  /** 产品型号 */
  model: string
  spec: string
  /** 产品计量单位（作为功能单位默认值） */
  unit: string
  /** 产品分类（分类名称，用于展示） */
  category: string
  /** 产品分类 id（模型 / 项目按分类 id 落库时回填） */
  categoryId: string
  /** 所属行业 */
  industry: string
  /** 产品图片（引用产品时带出快照） */
  imageUrl: string
  /** 当前生效版本号 */
  version: string
  useStatus: ProductUseStatus
}

/**
 * 标准文件选项（步骤①「核算方法」候选项，由「标准文件库」A1-3 投影）：
 * 仅返回**标准状态 = 现行**的标准（R-008 / D10）。
 */
export interface PcfStandardOption {
  id: string
  /** 标准号（含年份，如 `GB/T 24067-2024`） */
  code: string
  /** 中文标准名称 */
  name: string
  /** 标准状态：现行 / 被替代 / 作废 */
  status: string
}

/* ============ 前台 · 核算项目 · 步骤② 模型与数据（P20） ============ */

/**
 * 项目内核算工序（步骤②）。
 * **引用即复制**（方案 §4.9 口径 2）：首次进入步骤② 时从所选产品的工艺 / 工序副本**复制**一份到项目；
 * 副本归项目所有、可在项目内调整；产品库后续变更**不回写**副本，仅保留来源标识供追溯。
 */
export interface PcfOperationConfig {
  id: string
  projectId: string
  /** 来源产品 id（追溯用） */
  sourceProductId: string
  /** 复制时点 */
  copiedAt: string
  /** 所属工艺流程（来自产品） */
  processCode: string
  processName: string
  processSeq: number
  /**
   * 所属生命周期阶段（**随工艺流程带出，不可在本步骤修改**）。
   * 一个工艺流程对应一个生命周期阶段，故该工艺下所有工序的阶段归属一致。
   */
  processStage: string
  /** 工序编码 / 名称（来自产品工序副本） */
  opCode: string
  opName: string
  opSeq: number
  /** 投入项（复制自产品工序副本） */
  inputs: ProductFlowItem[]
  /** 产出项（复制自产品工序副本） */
  outputs: ProductFlowItem[]
}

/**
 * 活动量填报值（步骤②）：按**绑定公式的 `activity` 因素**动态生成，
 * 一个数据项可能有多个活动量（如运输 = 运输重量 + 运输距离）。
 */
export interface PcfActivityValue {
  /** 因素名称（对应公式 activity 因素的 name，如「运输重量」「运输距离」） */
  factorName: string
  /** 因素单位 */
  unit: string
  /** 参考值（仅单 activity 因素的因子法：来自工序副本流的基准数量；多因素为空） */
  refQty: number | null
  /** 填报值（为空 = 未填报） */
  value: number | null
}

/**
 * 项目活动数据（步骤②「模型与数据」）：核算工序下**单项投入 / 产出**的填报记录。
 * - **绑定公式**来自模型快照（工序公式配置阶段完成，前台只读）；
 * - 填报字段 = 公式 `activity` 因素的集合（**动态**，如运输 = 重量 + 距离两个）；
 * - 因子 = 公式 `factor` / `parameter` 占位因素的取值（**单因子**，手动匹配，Q3 裁定）；
 * - 公式 `constant` 因素在模型侧已配置，前台不出现。
 */
export interface PcfActivityData {
  id: string
  projectId: string
  /** 所属核算工序（项目内工序 id） */
  operationId: string
  /** 流向：投入 / 产出 */
  direction: 'input' | 'output'
  /** 数据项名称（来自工序副本） */
  flowName: string
  /** 数据项类别（原料 / 能源 / 中间品 / 成品 / 副产品 / 排放物） */
  flowType: FlowItemType
  /** 绑定的计算公式（来自模型快照的工序公式配置） */
  formulaId: string
  formulaCode: string
  formulaName: string
  /** 公式表达式（展示用，如「运输重量*运输距离*运输因子」） */
  formulaExpression: string
  /** 活动量填报值（按公式 activity 因素数量动态） */
  activityValues: PcfActivityValue[]
  /** 公式是否含 `factor` / `parameter` 占位因素（需手动匹配因子） */
  requiresFactor: boolean
  /**
   * 手动匹配的排放因子（引用排放因子库 A2-6；**为空 = 未匹配**）。
   * 仅当公式含 `factor` / `parameter` 占位因素时需要；**单因子**（Q3 裁定）；投入项必选、产出项选填。
   */
  factorId: string | null
  /** 因子名称（展示快照，来自因子库） */
  factorName: string
  /** 因子值（计算快照，`kgCO₂e / 单位`；为空 = 未匹配） */
  factorValue: number | null
  /**
   * 分配比例（%）：**仅产出项使用**。
   * 一个工序存在多个产出（联产品 / 副产品）时，用于把该工序投入的环境负荷分配到各产出上；
   * 单产出时固定 100%。
   */
  allocateRatio: number | null
}

/** 排放因子选项（步骤② 手动匹配用，引用排放因子库 A2-6；仅返回「启用」态） */
export interface PcfFactorOption {
  id: string
  code: string
  name: string
  /** 因子值 */
  value: number
  /** 分子单位（碳排放量类，如 kgCO₂e） */
  numeratorUnit: string
  /** 活动数据单位（分母） */
  denominatorUnit: string
  /** GWP 分项口径（选填；用于核算时拆「含 / 不含生物碳」双口径） */
  calibers?: FactorCalibers
  /** 所属因子库 id（后台已发布库因子为其库 id；我的因子为其私有库 id） */
  libraryId?: string
}

/* ============ 前台 · 核算项目 · 步骤③ 数据检测（P23） ============ */

/** 检测状态：待检测 / 检测中 / 通过 / 不通过（界面口径，见《数据检测字段清单》§2） */
export type PcfCheckStatus = 'pending' | 'checking' | 'passed' | 'failed'

/** 检测问题级别：阻断级（须整改）/ 提示级（不阻断） */
export type PcfCheckIssueLevel = 'blocking' | 'warning'

/** 检测类别（界面口径，不展示异常编号） */
export type PcfCheckCategory =
  | 'completeness'
  | 'factorUnit'
  | 'allocation'
  | 'stageCoverage'
  | 'massBalance'
  | 'biogenic'

/**
 * 检测问题（步骤③）：一次检测结果中的一条问题。
 * 界面只呈现「人话问题 + 修改入口」，不展示异常编号（E01–E16）与公式/因子绑定术语。
 */
export interface PcfCheckIssue {
  id: string
  /** 问题级别：阻断 / 提示 */
  level: PcfCheckIssueLevel
  /** 检测类别 */
  category: PcfCheckCategory
  /** 人话问题标题 */
  title: string
  /** 详细描述（含整改建议） */
  description: string
  /** 定位信息（如「工序：断料 / 数据项：电力」） */
  location?: string
  /** 修改入口步骤：1 = 目标与范围，2 = 工序与数据 */
  fixStep?: 1 | 2
  /** 修改入口按钮文案 */
  fixLabel?: string
}

/**
 * 检测结果（步骤③）：一次「提交检测」动作的结论快照，随项目留存（最近一次结论）。
 * - 通过 = 阻断级问题数为 0；不通过 = 存在阻断级问题。
 * - `issues` 按阻断级 / 提示级分组展示。
 */
export interface PcfCheckResult {
  projectId: string
  status: PcfCheckStatus
  /** 检测完成时间（`YYYY-MM-DD HH:mm`）；未检测 / 检测中为空 */
  checkedAt: string
  /** 阻断级问题数 */
  blockingCount: number
  /** 提示级问题数 */
  warningCount: number
  /** 问题清单 */
  issues: PcfCheckIssue[]
}

/* ============ 前台 · 核算项目 · 步骤④ 碳足迹核算与结果（P24 / P25） ============ */

/** 核算状态：待核算 / 核算中 / 完成 / 失败（界面口径，见《碳足迹核算字段清单》§2） */
export type PcfCalcStatus = 'idle' | 'calculating' | 'done' | 'failed'

/**
 * 核算结果 / 清册口径：GWP 四分量（对齐竞品「影响评价指标」，与因子 `FactorCalibers` 分项一一对应）。
 * - `total`：总量（不含生物源 CO₂）= 化石 + 土地利用变化；
 * - `fossil`：化石；`biogenic`：生物源；`luluc`：直接土地利用变化。
 */
export type PcfCaliberKey = 'total' | 'fossil' | 'biogenic' | 'luluc'

/** 口径定义（界面切换 + 清册「影响评价指标」文案） */
export interface PcfCaliberDef {
  key: PcfCaliberKey
  /** 中文口径名（界面展示） */
  label: string
  /** 中文口径简称（按钮 / 文件名等窄空间使用） */
  shortLabel: string
  /** 影响评价指标全称（界面卡片 / 清册「影响评价指标」行，对齐竞品英文口径） */
  indicator: string
  /** 影响评价指标中文名 */
  indicatorCn: string
}

/** GWP 四分量口径（顺序即界面 / 清册展示顺序） */
export const PCF_CALIBERS: PcfCaliberDef[] = [
  {
    key: 'total',
    label: '总量（不含生物源CO₂）',
    shortLabel: '总量',
    indicator: 'Climate change: total (excl. biogenic CO₂) - Global warming potential (GWP100)',
    indicatorCn: '气候变化：总量（不含生物源CO₂） - 全球变暖潜势（GWP100）',
  },
  {
    key: 'biogenic',
    label: '生物源（不含CO₂）',
    shortLabel: '生物源',
    indicator: 'Climate change: biogenic (excl. CO₂) - Global warming potential (GWP100)',
    indicatorCn: '气候变化：生物源（不含CO₂） - 全球变暖潜势（GWP100）',
  },
  {
    key: 'luluc',
    label: '直接土地利用变化',
    shortLabel: '土地利用',
    indicator: 'Climate change: direct land use change - Global warming potential (GWP100)',
    indicatorCn: '气候变化：直接土地利用变化 - 全球变暖潜势（GWP100）',
  },
  {
    key: 'fossil',
    label: '化石',
    shortLabel: '化石',
    indicator: 'Climate change: fossil - Global warming potential (GWP100)',
    indicatorCn: '气候变化：化石 - 全球变暖潜势（GWP100）',
  },
]

/** 四分量数值表（行级 / 结果级通用） */
export type PcfCaliberValues = Record<PcfCaliberKey, number>

/** 阶段汇总（字段清单 §3.1） */
export interface PcfStageSummary {
  /** 一级生命周期阶段名称 */
  stage: string
  /** 该阶段排放量（kgCO₂e） */
  emission: number
  /** 占总排放比例（%） */
  ratio: number
}

/** 工序汇总（字段清单 §3.2） */
export interface PcfOperationSummary {
  operationId: string
  processName: string
  opName: string
  stage: string
  /** 最末级生命周期阶段路径（如「原材料获取-原材料运输」；一级阶段无子级时即一级阶段名） */
  stagePath?: string
  emission: number
  ratio: number
}

/** 结果明细（字段清单 §4）：结果下钻到「工序 → 数据项 → 因子 → 公式」 */
export interface PcfResultDetail {
  id: string
  operationId: string
  processName: string
  opName: string
  stage: string
  flowName: string
  flowType: FlowItemType
  direction: 'input' | 'output'
  /** 活动量描述（如「12000 kWh」或「5 t × 300 km」） */
  activityText: string
  /** 匹配因子名称（无因子时为空） */
  factorName: string
  /** 因子值（快照） */
  factorValue: number | null
  /**
   * 最末级生命周期阶段路径（「一级阶段-二级阶段」；一级阶段下无二级时即一级阶段名）。
   * 清册按「一个最末级阶段一张表」拆分即以此字段分组。
   */
  stagePath?: string
  /** 因子单位（复合单位快照，如 `kgCO₂e/kg`，用于清册「排放系数」列） */
  factorUnit?: string
  /** 四分量「排放系数」（因子值口径；清册「排放系数」列按所选分量取值） */
  factorCaliberValues?: PcfCaliberValues
  /** 背景数据来源（因子所在库 + 版本 + 因子名称，如「中国官方排放因子库 V1.0 数据库：电力排放因子」） */
  factorSource?: string
  /** 绑定公式名称 */
  formulaName: string
  /** 该明细行排放量（kgCO₂e，GWP 总量含生物碳 = 化石 + 生物源 + 土地利用） */
  emission: number
  /** 化石源排放（kgCO₂e） */
  fossilEmission?: number
  /** 生物源排放（含生物碳净值增量，kgCO₂e；吸收为负、释放为正） */
  biogenicEmission?: number
  /** 直接土地利用变化排放（kgCO₂e） */
  lulucEmission?: number
  /**
   * 该行的四分量排放值（kgCO₂e）：总量（不含生物源CO₂）/ 化石 / 生物源 / 土地利用。
   * 结果页与清册的「按口径」汇总、导出均以此为准。
   */
  emissionBreakdown?: PcfCaliberValues
}

/** 核算任务（字段清单 §2）：由项目状态推导，接口层投影 */
export interface PcfCalcTask {
  projectId: string
  status: PcfCalcStatus
  startedAt: string
  finishedAt: string
  /** 结果版本号（未完成无版本） */
  version: number
  /** 失败原因（人话描述） */
  errorMessage: string
}

/**
 * 单位产品碳足迹（按某个口径折算）。
 * 清单口径为「数量」，故主口径值 = 清单合计；换算口径由「单位转换系数」派生。
 */
export interface PcfUnitEmission {
  /** 口径单位（如 `双` / `kg`） */
  unit: string
  /** 单位产品碳足迹（kgCO₂e / 单位） */
  value: number
}

/** 核算结果（字段清单 §3）：一次核算的结论快照，版本化留存 */
export interface PcfCalcResult {
  projectId: string
  version: number
  calculatedAt: string
  totalEmission: number
  /** 化石源总排放（kgCO₂e） */
  fossilEmission?: number
  /** 生物源净排放（生物碳吸收 / 释放净额，kgCO₂e；吸收为负、释放为正） */
  biogenicEmission?: number
  /** 直接土地利用变化总排放（kgCO₂e） */
  lulucEmission?: number
  /** 单位产品碳足迹的四分量口径值（kgCO₂e / 声明单位），口径切换与清册导出用 */
  caliberEmission?: PcfCaliberValues
  /** 结果表达单位（取项目「单位」= 声明单位） */
  unit: string
  /**
   * 单位产品碳足迹（kgCO₂e / 声明单位）。
   * **清单口径即「数量」**（步骤②「数量」= 每 1 个声明单位的用量），
   * 故本值 = 清单合计 = `totalEmission`，无需再做除法。
   */
  unitEmission: number
  /** 各口径单位产品碳足迹：首项 = 声明单位口径；由「单位转换系数」派生换算口径（如 kg） */
  unitEmissionBreakdown: PcfUnitEmission[]
  stageSummary: PcfStageSummary[]
  operationSummary: PcfOperationSummary[]
  details: PcfResultDetail[]
}

/* ============ 前台 · 核算项目 · 报告生成与编辑（原步骤⑤ P26；V0.8 起报告环节移出核算流程，类型保留供「报告管理」复用） ============ */

/** 报告状态（界面口径，见《报告生成字段清单》§6.1）：生成中 / 编制中 / 已完成 */
export type PcfReportStatus = 'reportGenerating' | 'reportEditing' | 'done'

/** 章节类型：`system` 系统生成（只读）/ `editable` 说明性内容（编制中可编辑） */
export type PcfSectionType = 'system' | 'editable'

/** 报告模板（引用对象；本期系统预置 1 个，见《报告模板定义（系统预置V1）》§1） */
export interface PcfReportTemplate {
  templateId: string
  templateName: string
  /** 适用边界（本期唯一模板为 `all`） */
  applicableBoundary: PcfBoundary | 'all'
  templateVersion: string
  isPreset: boolean
  status: '启用' | '停用'
}

/**
 * 报告封面与概况信息（《报告生成字段清单》§3）：
 * 封面字段 + 一、概况的「生产者信息 / 产品信息」。
 */
export interface PcfReportCover {
  /** 产品名称（系统带出，只读） */
  productName: string
  /** 产品规格型号（系统带出，只读） */
  productSpec: string
  /** 生产者 / 企业名称（系统带出，只读） */
  companyName: string
  /** 报告编号（系统生成，只读） */
  reportNo: string
  /** 报告日期（手工补充，必填） */
  reportDate: string
  /** 出具报告机构（手工补充，选填） */
  issuer: string
  /* 生产者信息 */
  producerName: string
  address: string
  legalPerson: string
  contactPerson: string
  contactPhone: string
  companyProfile: string
  /* 产品信息 */
  productFunction: string
  productIntro: string
  productImage: string
}

/** 报告章节（《报告生成字段清单》§5）：本期仅承载说明性章节，系统章节由 `system` 块渲染 */
export interface PcfReportSection {
  id: string
  code: string
  title: string
  type: PcfSectionType
  /** 章节正文（默认文案 / 用户编辑内容） */
  content: string
}

/** 系统章节数据源（由核算结果 / 项目信息自动填充，只读） */
export interface PcfReportSystemBlock {
  /** 量化方法（依据标准 + 项目核算方法） */
  standard: string
  /** 功能单位或声明单位（取项目「单位」） */
  unit: string
  /** 系统边界文案 */
  boundaryText: string
  /** 时间范围（取项目「统计时间」） */
  period: string
  /** 分配原则与程序 */
  allocation: string
  /** 每声明单位碳足迹（取核算结果；清单口径即数量） */
  unitEmission: number
  /** 各口径单位产品碳足迹（声明单位 + 单位转换系数派生口径） */
  unitEmissionBreakdown: PcfUnitEmission[]
  totalEmission: number
  /** 结果版本号 */
  resultVersion: number
  /** 表 2：各生命周期阶段碳排放 */
  stageSummary: PcfStageSummary[]
  /** 表 1：生命周期碳排放清单（结果明细） */
  details: PcfResultDetail[]
}

/**
 * 报告（《报告生成字段清单》§2）：步骤⑤ 产出物，**单一当前版本**（重新生成覆盖，不设多版本）。
 */
export interface PcfReport {
  projectId: string
  /** 报告编号，`PCF-R-YYYYMMDDNNN` */
  reportNo: string
  /** 报告类型（取项目核算边界） */
  reportType: PcfBoundary
  status: PcfReportStatus
  templateId: string
  templateName: string
  templateVersion: string
  generatedAt: string
  cover: PcfReportCover
  sections: PcfReportSection[]
  system: PcfReportSystemBlock
  /** 下载文件名 */
  fileName: string
  confirmedBy: string
  confirmedAt: string
  /** 确认完成后锁定（报告与步骤①~④只读） */
  locked: boolean
}

/**
 * 报告草稿（生成前的前置信息收集与预览，业务 PRD R-052）：
 * 由模板 + 核算结果装配，系统带出字段已填、手工补充字段留空，**不落库**；
 * 用户填写完成后先预览、再自行「生成报告」。
 */
export interface PcfReportDraft {
  /** 封面与概况（系统带出字段已填，手工补充字段待填） */
  cover: PcfReportCover
  /** 说明性章节（含模板默认文案） */
  sections: PcfReportSection[]
  /** 系统章节数据（取自核算结果，只读） */
  system: PcfReportSystemBlock
  /** 预览用文件名 */
  fileName: string
}

/* ============ 多级下拉选项（层级字典的通用投影） ============ */

/**
 * 多级下拉选项树（**行业 / 产品分类 / 计量单位等层级字典统一复用**）：
 * - 行业：门类 → 大类 → 中类 → 小类（GB/T 4754 四级）
 * - 产品分类：一级 → 二级 → 三级（统计用产品分类目录）
 * - 计量单位：单位类型 → 单位（按 8 类内置类型分组）
 *
 * 取值口径由引用方决定：行业取**行业名称**、产品分类取**分类 id**、计量单位取**单位符号**。
 */
export interface TreeOption {
  value: string
  label: string
  /** 次要信息（行业编码 / 分类编码 / 单位名称等），展示在右侧 */
  extra?: string
  /** 禁用：不可选中（如已停用的行业 / 分类），但保留层级以便回显与下钻 */
  disabled?: boolean
  children?: TreeOption[]
}

/* ===================== 模型管理（前后台 · 模型库） ===================== */

/**
 * 模型状态机：草稿 → 已发布 → 已停用（下架）→ 重新启用（回已发布）。
 * - `draft`：仅后台可见，可编辑 / 删除
 * - `published`：前台模型库可见，可停用
 * - `disabled`：前台不可见，可重新启用 / 删除
 */
export type ModelStatus = 'draft' | 'published' | 'disabled'

/** 模型归属范围：`platform` = 后台平台模型；`org` = 前台「我的模型」 */
export type ModelScope = 'platform' | 'org'

/** 我的模型来源：`manual` 自己新增（可编辑）/ `collected` 收藏副本（只读） */
export type MyModelOrigin = 'manual' | 'collected'

/**
 * 模型数据项（= `PcfStageDataItem` 去掉 `projectId`）。
 * 模型被核算项目引用时按「引用即复制」写入项目数据项，故字段口径与 PCF 完全一致。
 */
export interface ModelDataItem {
  id: string
  /** 所属生命周期阶段 id / 名称（来自模型「目标与范围」） */
  stageId: string
  stageName: string
  /** 所属过程节点（为空 = 直接挂在生命周期阶段下） */
  nodeId: string | null
  direction: PcfDataItemDirection
  name: string
  itemType: PcfDataItemType
  emissionType: PcfEmissionType | null
  /** 数量 */
  quantity: number | null
  unit: string
  factorId: string | null
  factorName: string
  factorValue: number | null
  factorCalibers?: FactorCalibers | null
  /** 数据凭证附件（**选填、可多个**；支撑该条活动数据的凭证材料） */
  vouchers?: PcfVoucher[]
}

/** 模型过程节点（= `PcfProcessNode` 去掉 `projectId`） */
export interface ModelProcessNode {
  id: string
  stageId: string
  parentId: string | null
  name: string
  sourceItemId?: string | null
}

/** 模型「目标与范围 + 产品建模」的完整内容（后台模型 / 我的模型共用） */
export interface ModelContent {
  /** 产品信息（与产品核算步骤①「产品」面板保持一致） */
  productName: string
  productSpec: string
  /** 产品所属行业（行业名称，取自行业目录） */
  productIndustry: string
  /** 声明 / 功能单位（数值 + 单位，如 `5` + `Item(s)`） */
  functionalUnitValue: string
  functionalUnit: string
  /** 产品图片（**必填**，原型以 data URL 存储） */
  productImageUrl?: string
  /** 产品分类（分类 id，用于模型库筛选；引用项目时映射为分类名称） */
  categoryId: string
  /** 行业标签（行业名称，多选，用于模型库筛选） */
  industries: string[]
  /** 核算标准（标准文件 id / 名称快照） */
  standardId: string
  standardName: string
  /** 系统边界（数据字典编码：gate / grave / gate_to_gate） */
  boundary: PcfBoundary
  /** 生命周期阶段（含勾选态） */
  lifecycleStages: PcfLifecycleStage[]
  items: ModelDataItem[]
  nodes: ModelProcessNode[]
}

/** 后台 · 平台模型 */
export interface CarbonModel extends ModelContent {
  id: string
  /** 模型编码，系统生成 `MDL-NNN` */
  code: string
  name: string
  scope: 'platform'
  status: ModelStatus
  remark: string
  /** 维护人 */
  maintainer: string
  createdBy: string
  createdAt: string
  updatedAt: string
  /** 最近一次发布时间 */
  publishedAt?: string
}

/** 前台 · 我的模型（来源二态：自己新增 / 收藏副本） */
export interface MyModel extends ModelContent {
  id: string
  /** 模型编码，系统生成 `MYM-NNN` */
  code: string
  name: string
  scope: 'org'
  origin: MyModelOrigin
  remark: string
  updatedAt: string
  /** 收藏来源（`origin = collected` 时的快照，复制式、不与源模型联动） */
  sourceModelId?: string
  sourceModelName?: string
}

/** PCF 新建核算时的模型候选项（平台已发布模型 + 我的模型） */
export interface PcfModelOption {
  id: string
  code: string
  name: string
  source: 'platform' | 'my'
  /** 核算标准（id 用于筛选命中，名称用于卡片展示） */
  standardId: string
  standardName: string
  categoryId: string
  /** 行业标签（名称） */
  industries: string[]
  boundary: PcfBoundary
  stageCount: number
  itemCount: number
  updatedAt: string
  /** 我的模型来源二态标记（`source = my` 时有值） */
  origin?: MyModelOrigin
}
