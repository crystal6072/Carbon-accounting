/** 使用状态（启用 / 禁用） */
export type EnableStatus = 'enabled' | 'disabled'

/** 分类层级 */
export type CategoryLevel = 1 | 2 | 3

/** 产品分类（字段清单为唯一真相源，此处为前端原型投影） */
export interface CategoryItem {
  id: string
  /** 分类编码，唯一 */
  code: string
  /** 分类名称 */
  name: string
  /** 上级分类 id；null 表示一级分类 */
  parentId: string | null
  /** 分类层级：1 / 2 / 3 */
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
  /** 产品图片（选填，原型以 data URL 存储） */
  imageUrl: string
  description: string
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

/* ===================== 我的产品库（前台业务平台 · 组织自建，P27） ===================== */

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

/* ===================== 工序（后台管理 → 基础库 → 工艺库 → 工序，A1-8） ===================== */

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
  /**
   * 排放项公式（**公式下沉到工序投入产出项**）：系统默认带出、可手工覆盖。
   * 字段为空（`formulaId = ''`）表示沿用系统默认（按流类型 / 名称关键词带出）。
   */
  formulaId: string
  formulaCode: string
  formulaName: string
  formulaExpression: string
  /** 是否参与计算 */
  disposal: FlowFormulaDisposal
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

/* ============ 工艺流程（后台管理 → 基础库 → 工艺库 → 工艺流程，A1-7） ============ */

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
  /** 基准数量：按单位产品口径（已确认 Q04） */
  baseQty: number | null
  /** 基准单位（引用计量单位库 A1-9） */
  baseUnit: string
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

/* ============ 物料库（后台管理 → 基础库 → 物料库，A1-1；轻量基础数据） ============ */

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

/* ============ 计量单位库（后台管理 → 基础库 → 计量单位库，A1-9） ============ */

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

/* ============ 能源库（后台管理 → 基础库 → 物料库 → 能源管理，A1-2；轻量基础数据） ============ */

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

/* ============ 生命周期阶段（后台管理 → 基础库 → 生命周期阶段，A1-10；轻量基础数据） ============ */

/** 阶段层级：**仅支持一级 / 二级，不支持三级**（D03 / 方案 §4.2.4） */
export type LifecycleLevel = 1 | 2

/**
 * 纳入规则（**三态**，D10 / §5.2；对齐方案 §4.3.1）：
 * - `required` 必须纳入：项目内不可排除；缺活动数据触发 **E10**，阻断计算与报告
 * - `optional` 可选纳入：项目内可排除，**必须填写排除原因**；未填触发 **E11**（标风险 + 阻断报告）
 * - `excluded` 不纳入：该边界下天然不适用，默认排除且无需原因
 */
export type LifecycleInclusion = 'required' | 'optional' | 'excluded'

/** 边界（本期仅「摇篮到大门 / 摇篮到坟墓」两种，【待确认 Q13】） */
export type LifecycleBoundary = 'gate' | 'grave'

/**
 * 生命周期阶段（主表，单一对象、无子表；层级用「阶段层级 + 上级阶段」自引用表达）
 * - **轻量基础数据**：与物料库 / 能源库同口径 —— **不设「数据来源」、不设「引用状态」**，
 *   所有阶段统一维护（启用 ↔ 禁用双向可达，**仅「已禁用」可删除**）
 * - 推荐口径 A（【待确认 Q01】）：不建独立「阶段基线」对象，基线 = 按「行业 + 边界」查询出的集合
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
  /** 适用行业：多选，引用行业库 A1-4；**为空 = 全行业通用**（D06） */
  industries: string[]
  /** 摇篮到大门纳入规则（三态必填，D10） */
  gateRule: LifecycleInclusion
  /** 摇篮到坟墓纳入规则（三态必填，D10） */
  graveRule: LifecycleInclusion
  /** 使用状态：启用 / 禁用（不进表单，走行操作） */
  status: EnableStatus
  createdBy: string
  createdAt: string
  updatedBy: string
  updatedAt: string
}

/* ============ 行业库（后台管理 → 基础库 → 行业库，A1-4；轻量行业字典） ============ */

/** 行业层级：**仅支持一级 / 二级**（由「上级行业」推导，不设独立字段表达） */
export type IndustryLevel = 1 | 2

/**
 * 行业（主表，单一对象、无子表；**轻量行业字典**）
 * - 只回答「有哪些行业、叫什么、怎么分级」：编码 / 名称 / 上级行业 / 排序号 / 描述 / 使用状态
 * - **不承载任何行业参数**：阶段配置归生命周期阶段（A1-10）、因子集归排放因子库（A2-6）、
 *   规则模板归核算模型（A2-3）；行业库只作为下游行业化配置的锚点
 * - 与物料库 / 能源库 / 生命周期阶段同口径：**不设数据来源、不设引用状态、不做版本化**，
 *   启用 ↔ 禁用双向可达，V0.1 不提供删除入口（对齐「产品分类」交互）
 * - 下游引用方：物料 / 能源的「适用行业」（多选）、产品信息 / 工艺流程 / 工序的「所属行业」（单选必填）、
 *   生命周期阶段的「适用行业」（多选，为空 = 全行业通用）
 */
export interface IndustryItem {
  id: string
  /** 行业编码，唯一 */
  code: string
  /** 行业名称：**同级内唯一** */
  name: string
  /** 行业层级：一级 / 二级（派生值，随「上级行业」联动） */
  level: IndustryLevel
  /** 上级行业 id：**二级必填且只能指向一级行业**；一级为 null */
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

/* ============ 排放因子库（后台管理 → 核算模型 → 排放因子库，A2-6 / A2-7） ============ */

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
 * 排放因子（主表，**不做版本化**）
 * - 字段参考竞品「新增排放因子库」：因子信息（名称 / 别名 / 适用行业 / 适用场景 / 因子值 / 分子单位 / 活动数据单位 / 描述）
 *   + 来源信息（来源类别 / 发布年份 / 发布日期 / 发布国家组织 / 发布机构全称 / 简称 / 数据来源文件）
 * - 因子单位为**复合单位**：分子（碳排放量类 `numeratorUnit`）+ 分母（活动数据单位 `denominatorUnit`），分别引用计量单位库（A1-9）
 */
export interface FactorItem {
  id: string
  /** 因子编码（系统生成，列表展示用） */
  code: string
  /** 因子名称 */
  name: string
  /** 因子别名（选填） */
  alias: string
  /** 因子分类（系统内置 6 类） */
  category: FactorCategory
  /** 适用行业（多选，引用行业库 A1-4），至少选择 1 项 */
  industries: string[]
  /** 适用场景（如「电力消耗 / 燃料燃烧」，文本） */
  scenario: string
  /** 碳排放因子值（分类 = 生物碳因子时可为负） */
  value: number
  /** 单位（分子，碳排放量类，默认 kgCO₂e；引用计量单位库） */
  numeratorUnit: string
  /** 活动数据单位（分母；须与活动数据单位可换算，否则 E04） */
  denominatorUnit: string
  /** 来源类别（如「官方机构发布」「商业数据库」「企业自建」） */
  sourceCategory: string
  /** 发布年份 */
  publishYear: string
  /** 发布日期（选填） */
  publishDate: string
  /** 发布国家 / 组织 */
  publisherRegion: string
  /** 发布机构或出版者（全称） */
  publisherFullName: string
  /** 发布机构或出版者（简称，选填） */
  publisherShortName: string
  /** 数据来源（来源文件名称，选填，附件由附件管理承载） */
  dataSourceFile: string
  /** 来源（数据来源，权限档位）：environment 库 / 自定义因子库 */
  source: FactorSource
  /**
   * 是否已被当前组织引用到前台「我的因子库」（**引用，不复制**）。
   * 仅后台维护因子（`source = 'preset'`）可被引用；引用后在本组织可见且**只读**
   * （不可编辑 / 启用 / 禁用 / 删除），因子主体仍由后台维护。
   */
  referenced?: boolean
  /** 使用状态：启用 / 禁用（不进表单，走行操作） */
  status: EnableStatus
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

/* ============ 计算引擎配置（后台管理 → 核算模型 → 计算引擎配置，A2-3） ============ */

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
 * - `factor` 因子 / 物料 / 能源等**业务库取值**（直接引用，数值与单位由库带出）
 * - `constant` 常量（氧化率、44/12、方向系数等固定参数）
 * - `parameter` **参数占位**（**方案 A 口径**：表达式中参与运算、具体取值由**项目运行时填入**，
 *   如「排放因子」由项目步骤② 手动匹配的因子代入；公式模板不绑定具体业务库对象）
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
  /** 来源库（sourceType = factor 时）：如 排放因子库 / 能源库 / 物料库 */
  sourceLib: string
  /** 引用对象编码（sourceType = factor 时） */
  sourceCode: string
  /** 引用对象名称（冗余展示） */
  sourceName: string
  /** 因素数值：因子类由因子库带出；常量类手工维护 */
  value: string
  /** 因素单位：因子类带出复合单位；活动数据 / 常量可维护 */
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
  /** 适用行业（多选，引用行业库 A1-4） */
  industries: string[]
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

/* ===================== 前台业务平台 · 核算项目（P17 / P18） ===================== */

/**
 * 核算项目状态（**界面口径**，收敛自方案 §5.2 工程态名，见《核算项目业务 PRD》§5.1）：
 * 方案「目标与范围编辑中 / 产品模型创建中」→ `ongoing`；
 * 「检测异常」→ 归入 `checking`；「报告生成失败」→ 归入 `reportGenerating`。
 */
export type PcfProjectStatus =
  | 'new'
  | 'ongoing'
  | 'checking'
  | 'toCalc'
  | 'calculating'
  | 'calcFailed'
  | 'calculated'
  | 'reportGenerating'
  | 'reportEditing'
  | 'done'
  | 'archived'

/** 核算边界（与核算模型口径一致：摇篮到大门 / 摇篮到坟墓） */
export type PcfBoundary = 'gate' | 'grave'

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
  /**
   * 转换系数（步骤①「产品」）：功能单位 / 声明单位与产品单位的换算比例。
   * 如声明单位为「盒」、产品单位为「双」且 1 盒 = 100 双，则转换系数 = 100；与产品单位一致时为 1。
   */
  conversionFactor?: number | null
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
  /** 当前步骤（1~5） */
  currentStep: number
  status: PcfProjectStatus
  remark: string
  createdBy: string
  createdAt: string
  updatedAt: string
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
  /** 来自库的纳入规则（required 锁定 / optional 可改 / excluded 不适用） */
  rule: LifecycleInclusion
  /** 是否纳入本次核算 */
  included: boolean
}

/** 组织选项（Mock，引用组织架构） */
export interface PcfOrgOption {
  id: string
  name: string
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
  /** 产品分类 */
  category: string
  /** 所属行业 */
  industry: string
  /** 当前生效版本号 */
  version: string
  useStatus: ProductUseStatus
}

/**
 * 标准文件选项（Mock **假数据**：标准文件库 P05 尚未交付，先用假数据支撑步骤①「核算方法」）。
 * 正式交付后由 `02prd/02-1后台管理/06标准文件/` 承载，服务签名保持不变。
 */
export interface PcfStandardOption {
  id: string
  /** 标准编号（如 `GB/T 24067`） */
  code: string
  /** 标准名称 */
  name: string
  /** 版本 / 年份（如 `2024`） */
  version: string
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
 * - 因子 = 公式 `parameter` 因素的取值（**单因子**，手动匹配，Q3 裁定）；
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
  /** 公式是否含 `parameter` 因素（需手动匹配因子；因子法 / 运输法 = true，燃料燃烧法 = false） */
  requiresFactor: boolean
  /**
   * 手动匹配的排放因子（引用排放因子库 A2-6；**为空 = 未匹配**）。
   * 仅当公式含 `parameter` 因素时需要；**单因子**（Q3 裁定）；投入项必选、产出项选填。
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
  category: FactorCategory
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

/* ============ 前台 · 核算项目 · 步骤④⑤ 碳足迹核算 / 核算结果（P24 / P25） ============ */

/** 核算状态：待核算 / 核算中 / 完成 / 失败（界面口径，见《碳足迹核算字段清单》§2） */
export type PcfCalcStatus = 'idle' | 'calculating' | 'done' | 'failed'

/** 排放源分类（对齐因子分类 FactorCategory，结果归类口径，见字段清单 §5） */
export type PcfCalcSourceType = FactorCategory

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
  emission: number
  ratio: number
}

/** 排放源汇总（字段清单 §3.3） */
export interface PcfSourceSummary {
  source: PcfCalcSourceType
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
  /** 绑定公式名称 */
  formulaName: string
  /** 该明细行排放量（kgCO₂e） */
  emission: number
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

/** 核算结果（字段清单 §3）：一次核算的结论快照，版本化留存 */
export interface PcfCalcResult {
  projectId: string
  version: number
  calculatedAt: string
  totalEmission: number
  /** 功能单位（取项目「单位」） */
  unit: string
  /** 单位产品碳足迹（kgCO₂e / 功能单位；本期 = totalEmission） */
  unitEmission: number
  stageSummary: PcfStageSummary[]
  operationSummary: PcfOperationSummary[]
  sourceSummary: PcfSourceSummary[]
  details: PcfResultDetail[]
}

/* ============ 前台 · 核算项目 · 步骤⑤ 报告生成与编辑（P26） ============ */

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
  /** 每声明单位碳足迹（取核算结果，单位 = 项目「单位」） */
  unitEmission: number
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
