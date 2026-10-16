import type { ModelPayload } from '@/mock'
import type {
  CarbonModel,
  ModelDataItem,
  ModelProcessNode,
  MyModel,
  PcfBoundary,
  PcfLifecycleStage,
} from '@/types'

/**
 * 模型两步向导的草稿态（=「目标与范围 + 产品建模」全量内容）。
 * 后台模型与「我的模型」共用同一草稿结构，仅在保存适配器上分流。
 */
export interface ModelDraft {
  /** 模型名称（替代 PCF 的「项目名称」） */
  name: string
  /** 产品名称 / 规格 / 所属行业（与产品核算步骤①「产品」面板字段一致） */
  productName: string
  productSpec: string
  productIndustry: string
  /** 声明 / 功能单位：仅单位，数值固定为 1（口径 = 每 1 个声明单位） */
  functionalUnit: string
  /** 产品图片（必填，原型以 data URL 存储） */
  productImageUrl: string
  /** 产品分类（分类 id，作为模型库筛选维度） */
  categoryId: string
  /** 行业标签（行业名称，多选） */
  industries: string[]
  /** 核算标准（标准文件 id） */
  standardId: string
  boundary: PcfBoundary
  lifecycleStages: PcfLifecycleStage[]
  items: ModelDataItem[]
  nodes: ModelProcessNode[]
  remark: string
}

/**
 * 声明单位数值：固定为 1（口径 = 「每 1 个声明单位」）。
 * 数据模型中保留该字段，但向导界面不再录入。
 */
const DECLARED_UNIT_QTY = '1'

/** 空白草稿（默认边界「摇篮到大门」） */
export function emptyModelDraft(): ModelDraft {
  return {
    name: '',
    productName: '',
    productSpec: '',
    productIndustry: '',
    functionalUnit: '',
    productImageUrl: '',
    categoryId: '',
    industries: [],
    standardId: '',
    boundary: 'gate',
    lifecycleStages: [],
    items: [],
    nodes: [],
    remark: '',
  }
}

/** 由已有模型（平台 / 我的）回填草稿（深拷贝，避免与 store 共享引用） */
export function modelToDraft(model: CarbonModel | MyModel): ModelDraft {
  return {
    name: model.name,
    productName: model.productName,
    productSpec: model.productSpec,
    productIndustry: model.productIndustry,
    functionalUnit: model.functionalUnit,
    productImageUrl: model.productImageUrl ?? '',
    categoryId: model.categoryId,
    industries: [...model.industries],
    standardId: model.standardId,
    boundary: model.boundary,
    lifecycleStages: model.lifecycleStages.map((stage) => ({ ...stage })),
    items: model.items.map((item) => ({ ...item })),
    nodes: model.nodes.map((node) => ({ ...node })),
    remark: model.remark,
  }
}

/** 草稿 → 保存 Payload（去除状态与审计字段） */
export function draftToPayload(draft: ModelDraft): ModelPayload {
  return {
    name: draft.name,
    productName: draft.productName.trim(),
    productSpec: draft.productSpec.trim(),
    productIndustry: draft.productIndustry,
    // 声明单位数值：默认 1（口径 = 每 1 个声明单位），界面不再录入
    functionalUnitValue: DECLARED_UNIT_QTY,
    functionalUnit: draft.functionalUnit,
    productImageUrl: draft.productImageUrl,
    categoryId: draft.categoryId,
    industries: [...draft.industries],
    standardId: draft.standardId,
    boundary: draft.boundary,
    lifecycleStages: draft.lifecycleStages.map((stage) => ({ ...stage })),
    items: draft.items.map((item) => ({ ...item })),
    nodes: draft.nodes.map((node) => ({ ...node })),
    remark: draft.remark,
  }
}
