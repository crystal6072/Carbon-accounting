/**
 * Mock 数据源（**演示数据集**：由《PCF核算全链路走查报告_2026-09-29》的模拟脚本
 * `__sim_pcf__.ts` 实际跑通的口径固化而来，刷新页面即可见）。
 *
 * 组成：
 * - 基础库：分类 / 行业 / 生命周期阶段 / 计量单位 / 物料 / 能源
 * - 因子库：多库（商业数据库 / 自建库）+ 库版本 / 标准公式（建模侧工序流绑定用）
 * - 工艺库：工序 / 工艺流程 / 产品（含工艺工序组合）
 * - 前台核算：4 条核算记录（PJ01 / PJ02 为同一产品的两个核算边界，PJ03 为福临供应商清单记录，
 *   PJ04 为摇篮到坟墓 GWP 四口径已完成记录）：
 *   **PJ01 摇篮到大门**（采伐阶段 + 加工阶段）、**PJ02 摇篮到坟墓**（+ 运输阶段 + 使用阶段 + 废弃与循环）、
 *   **PJ03 福临 1 双碳化筷**（A1 原材料获取 / A2 原材料运输 / A3 产品生产，引用「福临因子库」9 项因子）、
 *   **PJ04 摇篮到坟墓 · 多口径**（5 阶段全覆盖，总量 / 化石 / 生物源 / 土地利用四分量齐备）；
 *   步骤② 阶段数据项已按「数量」真实填报、步骤③ 检测已过，PJ02 / PJ03 / PJ04 已有核算结果；
 *   进入工作台步骤④点击「开始核算」即按「行级公式 → 阶段汇总公式 → 全局公式」产出真实结果
 *
 * 说明：
 * - 工序/工艺模板接口（fetchProcessTemplates / fetchOperationTemplates）已改为从 Store
 *   动态派生，`processTemplates` / `operationTemplates` 仅为兼容旧导出的空数组。
 * - 单位/物料/能源/行业/阶段等「表单选项」仍为静态镜像（与库保持一致维护），
 *   后台新增数据后需同步维护此处（已知问题 F-02，见走查报告）。
 */
import type {
  CalcFormula,
  CategoryItem,
  DictItem,
  DictType,
  EmissionCategory,
  EnergyItem,
  EnergyOption,
  ExchangeCarbonType,
  FactorCalibers,
  FactorExchange,
  FactorExt,
  FactorItem,
  FactorLibrary,
  FactorLibraryVersion,
  FactorReferenceItem,
  MyFactor,
  MyFactorLibrary,
  FlowItemType,
  FormulaFactor,
  IndustryItem,
  LifecycleStageItem,
  MaterialItem,
  MaterialOption,
  OperationFlowItem,
  OperationItem,
  OperationTemplate,
  PcfActivityData,
  PcfCalcResult,
  PcfOperationConfig,
  PcfOrgOption,
  PcfProductOption,
  PcfProject,
  PcfStageDataItem,
  ProcessItem,
  ProcessOperationItem,
  ProcessTemplate,
  ProductFlowItem,
  ProductItem,
  ProductOperationItem,
  ProductProcessItem,
  CarbonModel,
  ModelDataItem,
  MyModel,
  PcfDataItemDirection,
  PcfDataItemType,
  PcfEmissionType,
  PcfLifecycleStage,
  FileDocItem,
  StandardItem,
  UnitItem,
  UnitReferenceItem,
} from '@/types'
import {
  DICT_TYPE_ACCOUNTING_DATA_TYPE,
  DICT_TYPE_ENERGY_TYPE,
  DICT_TYPE_MATERIAL_TYPE,
  DICT_TYPE_SYSTEM_BOUNDARY,
  DICT_TYPE_TENANT_TYPE,
} from '@/types'
import { gbt4754LeafIndustryNames, industryGbt4754Seed } from './standards/industryGbt4754'
/** 福临 240 mm 全竹碳化筷产品图（Vite 资源导入：自动带 base 路径与构建哈希） */
import fulinKuaiziCover from '@/assets/model-covers/fulin-240mm-kuaizi.png'

/* ===================== 种子构造助手 ===================== */

/** 公式快照（写入流的冗余展示字段） */
const FM = {
  mass: { id: 'FMC001', code: 'FM-001', name: '因子法（质量口径）', expression: '活动量*排放因子' },
  transport: { id: 'FMC002', code: 'FM-002', name: '运输 t·km 法', expression: '周转量*排放因子' },
  elec: { id: 'FMC003', code: 'FM-003', name: '因子法（电力口径）', expression: '用电量*排放因子' },
  water: { id: 'FMC004', code: 'FM-004', name: '因子法（废水口径）', expression: '处理量*排放因子' },
  recycle: { id: 'FMC005', code: 'FM-005', name: '回收信用法', expression: '回收量*抵扣系数' },
} as const

/** 构造工序库投入产出项（只定义「有哪些数据项」，不含数量与公式关联） */
function opFlow(
  id: string,
  seq: number,
  flowType: FlowItemType,
  refCode: string,
  refName: string,
  unit: string,
  extra: { emissionCategory?: EmissionCategory } = {},
): OperationFlowItem {
  return {
    id,
    seq,
    flowType,
    refType: flowType === 'energy' ? 'energy' : 'material',
    refCode,
    refName,
    unit,
    emissionCategory: extra.emissionCategory,
    remark: '',
  }
}

/** 构造产品 / 项目工序副本的投入产出项 */
function pdFlow(
  id: string,
  type: FlowItemType,
  name: string,
  qty: number,
  unit: string,
  formula: { id: string; code: string; name: string; expression: string } | null,
  disposal: 'formula' | 'excluded' = 'formula',
): ProductFlowItem {
  return {
    id,
    type,
    name,
    qty,
    unit,
    formulaId: formula?.id ?? '',
    formulaCode: formula?.code ?? '',
    formulaName: formula?.name ?? '',
    formulaExpression: formula?.expression ?? '',
    disposal,
  }
}

/** 构造产品内工序副本 */
function productOp(
  id: string,
  code: string,
  name: string,
  seq: number,
  inputs: ProductFlowItem[],
  outputs: ProductFlowItem[],
): ProductOperationItem {
  return { id, code, name, seq, sourceCode: code, sourceCopiedAt: '2026-08-20 09:00', sourceUpdated: false, origin: 'template', inputs, outputs }
}

const MASTER_BY = '系统管理员'
const MASTER_AT = '2026-08-01 09:00'

/* ===================== 产品分类 ===================== */

/**
 * 演示用初始分类（**仅用于原型演示，非业务预置数据**）。
 *
 * 正式结论：分类不预置、由用户从零维护（C-06，已确认）。这里保留一份**轻量演示数据**，
 * 让分类树从空起步时也能看到真实结构；其中 id `PC200903` 用来承接既有演示产品 / 工艺 /
 * 核算模型的分类引用，保证跨模块引用不悬空。
 *
 * 一键恢复：不需要演示数据时，把 `USE_DEMO_CATEGORY_SEED` 置为 `false` 即可（一句话恢复为空分类树）；
 * 重新置为 `true` 即可恢复本演示数据。
 */
export const USE_DEMO_CATEGORY_SEED = true

const demoCategorySeed: CategoryItem[] = [
  {
    id: 'DEMO-CAT-BAM',
    code: 'BAM',
    name: '竹制品',
    parentId: null,
    level: 1,
    sortNo: 1,
    status: 'enabled',
    remark: '演示一级分类',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedAt: MASTER_AT,
  },
  {
    id: 'DEMO-CAT-BAM-01',
    code: 'BAM-01',
    name: '竹制餐具',
    parentId: 'DEMO-CAT-BAM',
    level: 2,
    sortNo: 1,
    status: 'enabled',
    remark: '演示二级分类',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedAt: MASTER_AT,
  },
  {
    id: 'DEMO-CAT-BAM-02',
    code: 'BAM-02',
    name: '竹制建材',
    parentId: 'DEMO-CAT-BAM',
    level: 2,
    sortNo: 2,
    status: 'enabled',
    remark: '演示二级分类',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedAt: MASTER_AT,
  },
  {
    id: 'DEMO-CAT-BAM-0101',
    code: 'BAM-0101',
    name: '竹制餐具-筷子',
    parentId: 'DEMO-CAT-BAM-01',
    level: 3,
    sortNo: 1,
    status: 'enabled',
    remark: '演示三级分类',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedAt: MASTER_AT,
  },
  {
    id: 'PC200903',
    code: 'BAM-0103',
    name: '竹制炊事用具',
    parentId: 'DEMO-CAT-BAM-01',
    level: 3,
    sortNo: 2,
    status: 'enabled',
    remark: '承接演示产品 / 工艺 / 核算模型的分类引用',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedAt: MASTER_AT,
  },
  {
    id: 'DEMO-CAT-PLA',
    code: 'PLA',
    name: '纸制品',
    parentId: null,
    level: 1,
    sortNo: 2,
    status: 'enabled',
    remark: '演示一级分类',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedAt: MASTER_AT,
  },
  {
    id: 'DEMO-CAT-PLA-01',
    code: 'PLA-01',
    name: '纸制包装',
    parentId: 'DEMO-CAT-PLA',
    level: 2,
    sortNo: 1,
    status: 'enabled',
    remark: '演示二级分类',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedAt: MASTER_AT,
  },
]

export const categorySeed: CategoryItem[] = USE_DEMO_CATEGORY_SEED ? demoCategorySeed : []

/* ===================== 行业库 ===================== */

/**
 * 行业种子 = 内置标准《国民经济行业分类》GB/T 4754（门类 / 大类 / 中类 / 小类，四级）。
 * 演示数据的「所属行业」引用小类 **2041 竹制品制造**（id = `IND2041`）。
 */
export const industrySeed: IndustryItem[] = industryGbt4754Seed

/**
 * 行业选项（**末级行业**名称）：所属行业 / 适用行业落到最细口径——
 * 制造业 / 电力热力 / 林业等内置到小类（4 级），其余门类内置到中类（3 级）。
 */
export const industryOptions: string[] = gbt4754LeafIndustryNames

/* ===================== 生命周期阶段 ===================== */

/**
 * 生命周期阶段字典（竹木碳足迹口径，5 个一级阶段，无二级阶段），系统边界归属按「数据字典 · 系统边界」字典项编码维护：
 * - 大门到大门（gate_to_gate）：仅厂内过程（加工）
 * - 摇篮到大门（gate）：采伐 + 加工
 * - 摇篮到坟墓（grave）：全阶段（含运输、使用、废弃与循环）
 */
export const lifecycleSeed: LifecycleStageItem[] = [
  /* ---------- 一级阶段 ---------- */
  {
    id: 'LS01',
    code: 'LC-01',
    name: '采伐阶段',
    level: 1,
    parentId: null,
    order: 10,
    description: '发生在产品加工之前的产品生产所需部件、原辅料、包装材料、能源等的开采与生产及其运输过程。',
    boundaries: ['gate', 'grave'],
    status: 'enabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: '2026-08-01 09:00',
  },
  {
    id: 'LS02',
    code: 'LC-02',
    name: '加工阶段',
    level: 1,
    parentId: null,
    order: 20,
    description: '产品生产或组装、加工厂内部运输、生产设备的维护与物料消耗、产品的仓储、生产废弃物的运输及处理、消耗能源的生产等。',
    boundaries: ['gate_to_gate', 'gate', 'grave'],
    status: 'enabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: '2026-08-01 09:00',
  },
  {
    id: 'LS03',
    code: 'LC-03',
    name: '运输阶段',
    level: 1,
    parentId: null,
    order: 30,
    description: '发生在生产商大门之后的产品运输过程。',
    boundaries: ['grave'],
    status: 'enabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: '2026-08-01 09:00',
  },
  {
    id: 'LS04',
    code: 'LC-04',
    name: '使用阶段',
    level: 1,
    parentId: null,
    order: 40,
    description: '产品交付市场之后使用、维护、维修、翻新等过程消耗资源的生产过程、直接排放、废弃物处理等。',
    boundaries: ['grave'],
    status: 'enabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: '2026-08-01 09:00',
  },
  {
    id: 'LS05',
    code: 'LC-05',
    name: '废弃与循环',
    level: 1,
    parentId: null,
    order: 50,
    description: '产品经消费者使用报废后进入废弃处理厂发生的收集、运输、拆装、资源化、处理、处置等过程。',
    boundaries: ['grave'],
    status: 'enabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: '2026-08-01 09:00',
  },
]

/** 生命周期阶段选项（取启用状态的一级阶段，按顺序） */
export const lifecycleOptions: string[] = lifecycleSeed
  .filter((item) => item.level === 1 && item.status === 'enabled')
  .sort((a, b) => a.order - b.order)
  .map((item) => item.name)

/* ===================== 数据字典（平台支撑） ===================== */

/**
 * 字典类型种子：本期内置「系统边界」。
 * 系统边界的字典项即前台「核算边界」下拉与生命周期阶段「适用系统边界」下拉复选的取值来源。
 */
export const dictTypeSeed: DictType[] = [
  {
    id: 'DT-BOUNDARY',
    code: DICT_TYPE_SYSTEM_BOUNDARY,
    name: '系统边界',
    remark: '产品碳足迹核算的系统边界口径，供前台「核算边界」与生命周期阶段「适用系统边界」引用',
    status: 'enabled',
    builtin: true,
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: MASTER_AT,
  },
  {
    id: 'DT-TENANT-TYPE',
    code: DICT_TYPE_TENANT_TYPE,
    name: '租户类型',
    remark: '租户开户的租户类型枚举（tenant_type：1 企业 / 2 政府单位 / 3 机构 / 4 园区）',
    status: 'enabled',
    builtin: true,
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: MASTER_AT,
  },
  {
    id: 'DT-MATERIAL-TYPE',
    code: DICT_TYPE_MATERIAL_TYPE,
    name: '物料类型',
    remark: '物料库「物料类型」下拉取值来源：原辅料 / 中间产品 / 产品 / 副产品 / 废弃物/排放物 / 自然资源（单一层级）',
    status: 'enabled',
    builtin: true,
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: MASTER_AT,
  },
  {
    id: 'DT-ENERGY-TYPE',
    code: DICT_TYPE_ENERGY_TYPE,
    name: '能源类型',
    remark: '能源库「能源类型」下拉取值来源：电力 / 热力·蒸汽 / 化石燃料 / 生物质燃料 / 其他',
    status: 'enabled',
    builtin: true,
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: MASTER_AT,
  },
  {
    id: 'DT-ACCOUNTING-DATA-TYPE',
    code: DICT_TYPE_ACCOUNTING_DATA_TYPE,
    name: '核算数据类型',
    remark:
      '工序「投入产出流类型」与碳足迹核算数据录入「数据项类型」的共同取值来源：原辅料 / 能源 / 自然资源 / 中间产品 / 产品 / 副产品 / 废弃物/排放物',
    status: 'enabled',
    builtin: true,
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: MASTER_AT,
  },
]

/** 字典项种子：系统边界（大门到大门 / 摇篮到大门 / 摇篮到坟墓） */
export const dictItemSeed: DictItem[] = [
  {
    id: 'DI-BD-01',
    typeId: 'DT-BOUNDARY',
    code: 'gate_to_gate',
    label: '大门到大门',
    sort: 10,
    remark: 'Gate-to-Gate：仅涵盖厂内过程',
    status: 'enabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: MASTER_AT,
  },
  {
    id: 'DI-BD-02',
    typeId: 'DT-BOUNDARY',
    code: 'gate',
    label: '摇篮到大门',
    sort: 20,
    remark: 'Cradle-to-Gate：原料获取到产品出厂',
    status: 'enabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: MASTER_AT,
  },
  {
    id: 'DI-BD-03',
    typeId: 'DT-BOUNDARY',
    code: 'grave',
    label: '摇篮到坟墓',
    sort: 30,
    remark: 'Cradle-to-Grave：含使用与废弃与循环',
    status: 'enabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: MASTER_AT,
  },
  {
    id: 'DI-TT-01',
    typeId: 'DT-TENANT-TYPE',
    code: 'enterprise',
    label: '企业',
    sort: 10,
    remark: '核算主体',
    status: 'enabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: MASTER_AT,
  },
  {
    id: 'DI-TT-02',
    typeId: 'DT-TENANT-TYPE',
    code: 'government',
    label: '政府单位',
    sort: 20,
    remark: '监管方，按辖区只读；本期不开放',
    status: 'disabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: MASTER_AT,
  },
  {
    id: 'DI-TT-03',
    typeId: 'DT-TENANT-TYPE',
    code: 'org',
    label: '机构',
    sort: 30,
    remark: '金融 / 认证，授权范围内只读；本期不开放',
    status: 'disabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: MASTER_AT,
  },
  {
    id: 'DI-TT-04',
    typeId: 'DT-TENANT-TYPE',
    code: 'park',
    label: '园区',
    sort: 40,
    remark: '园区运营方，多租户聚集管理；本期不开放',
    status: 'disabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: MASTER_AT,
  },
  /* —— 物料类型字典（与物料库「物料类型」一致，单一层级、不再分一 / 二级） —— */
  {
    id: 'DI-MT-01',
    typeId: 'DT-MATERIAL-TYPE',
    code: 'raw_aux',
    label: '原辅料',
    sort: 10,
    remark: '用于产品生产的原料、辅料与包装材料',
    status: 'enabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: MASTER_AT,
  },
  {
    id: 'DI-MT-02',
    typeId: 'DT-MATERIAL-TYPE',
    code: 'semi',
    label: '中间产品',
    sort: 20,
    remark: '生产过程中的中间产物',
    status: 'enabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: MASTER_AT,
  },
  {
    id: 'DI-MT-03',
    typeId: 'DT-MATERIAL-TYPE',
    code: 'product',
    label: '产品',
    sort: 30,
    remark: '最终成品',
    status: 'enabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: MASTER_AT,
  },
  {
    id: 'DI-MT-04',
    typeId: 'DT-MATERIAL-TYPE',
    code: 'byproduct',
    label: '副产品',
    sort: 40,
    remark: '主产品外的附属产出',
    status: 'enabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: MASTER_AT,
  },
  {
    id: 'DI-MT-05',
    typeId: 'DT-MATERIAL-TYPE',
    code: 'waste',
    label: '废弃物/排放物',
    sort: 50,
    remark: '生产废弃物与排放物',
    status: 'enabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: MASTER_AT,
  },
  {
    id: 'DI-MT-06',
    typeId: 'DT-MATERIAL-TYPE',
    code: 'natural',
    label: '自然资源',
    sort: 60,
    remark: '直接取自自然环境的资源',
    status: 'enabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: MASTER_AT,
  },
  /* —— 能源类型字典（与能源库「能源类型」一致） —— */
  {
    id: 'DI-ET-01',
    typeId: 'DT-ENERGY-TYPE',
    code: 'electricity',
    label: '电力',
    sort: 10,
    remark: '电能，如外购电力 / 自发电',
    status: 'enabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: MASTER_AT,
  },
  {
    id: 'DI-ET-02',
    typeId: 'DT-ENERGY-TYPE',
    code: 'heat',
    label: '热力/蒸汽',
    sort: 20,
    remark: '热能，如蒸汽 / 热水 / 外购热力',
    status: 'enabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: MASTER_AT,
  },
  {
    id: 'DI-ET-03',
    typeId: 'DT-ENERGY-TYPE',
    code: 'fossil',
    label: '化石燃料',
    sort: 30,
    remark: '化石来源燃料，如煤炭 / 天然气 / 柴油 / 汽油',
    status: 'enabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: MASTER_AT,
  },
  {
    id: 'DI-ET-04',
    typeId: 'DT-ENERGY-TYPE',
    code: 'biomass',
    label: '生物质燃料',
    sort: 40,
    remark: '生物质燃料，如薪柴 / 秸秆 / 生物柴油 / 生物质颗粒',
    status: 'enabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: MASTER_AT,
  },
  {
    id: 'DI-ET-05',
    typeId: 'DT-ENERGY-TYPE',
    code: 'other',
    label: '其他',
    sort: 50,
    remark: '无法归入上述类别的其他能源',
    status: 'enabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: MASTER_AT,
  },
  /* —— 核算数据类型字典（工序流类型 + 碳足迹核算数据录入数据项类型的共同取值来源） —— */
  {
    id: 'DI-ADT-01',
    typeId: 'DT-ACCOUNTING-DATA-TYPE',
    code: 'material',
    label: '原辅料',
    sort: 10,
    remark: '用于产品生产的原料、辅料与包装材料（投入项）',
    status: 'enabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: MASTER_AT,
  },
  {
    id: 'DI-ADT-02',
    typeId: 'DT-ACCOUNTING-DATA-TYPE',
    code: 'energy',
    label: '能源',
    sort: 20,
    remark: '电力、热力、燃料等各类能源（投入项）',
    status: 'enabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: MASTER_AT,
  },
  {
    id: 'DI-ADT-03',
    typeId: 'DT-ACCOUNTING-DATA-TYPE',
    code: 'resource',
    label: '自然资源',
    sort: 30,
    remark: '直接取自自然环境的资源输入（投入项）',
    status: 'enabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: MASTER_AT,
  },
  {
    id: 'DI-ADT-04',
    typeId: 'DT-ACCOUNTING-DATA-TYPE',
    code: 'semi',
    label: '中间产品',
    sort: 40,
    remark: '生产过程中的中间产物（可作投入或产出）',
    status: 'enabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: MASTER_AT,
  },
  {
    id: 'DI-ADT-05',
    typeId: 'DT-ACCOUNTING-DATA-TYPE',
    code: 'product',
    label: '产品',
    sort: 50,
    remark: '目标产品 / 最终成品（产出项）',
    status: 'enabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: MASTER_AT,
  },
  {
    id: 'DI-ADT-06',
    typeId: 'DT-ACCOUNTING-DATA-TYPE',
    code: 'byproduct',
    label: '副产品',
    sort: 60,
    remark: '主产品外的附属产出（产出项）',
    status: 'enabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: MASTER_AT,
  },
  {
    id: 'DI-ADT-07',
    typeId: 'DT-ACCOUNTING-DATA-TYPE',
    code: 'emission',
    label: '废弃物/排放物',
    sort: 70,
    remark: '废气 / 废水 / 废渣等排放物（产出项）',
    status: 'enabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: MASTER_AT,
  },
]

/* ===================== 计量单位库 ===================== */

export const unitSeed: UnitItem[] = [
  {
    id: 'U01', name: '千克', symbol: 'kg', unitType: 'weight',
    isBase: true, baseUnitId: null, baseUnitSymbol: null, factor: 1,
    status: 'enabled', remark: '质量基准单位',
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'U02', name: '吨', symbol: 't', unitType: 'weight',
    isBase: false, baseUnitId: 'U01', baseUnitSymbol: 'kg', factor: 1000,
    status: 'enabled', remark: '1 t = 1000 kg',
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'U03', name: '千瓦时', symbol: 'kWh', unitType: 'energy',
    isBase: true, baseUnitId: null, baseUnitSymbol: null, factor: 1,
    status: 'enabled', remark: '能源基准单位',
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'U04', name: '立方米', symbol: 'm³', unitType: 'volume',
    isBase: true, baseUnitId: null, baseUnitSymbol: null, factor: 1,
    status: 'enabled', remark: '体积基准单位',
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'U05', name: '千米', symbol: 'km', unitType: 'distance',
    isBase: true, baseUnitId: null, baseUnitSymbol: null, factor: 1,
    status: 'enabled', remark: '距离基准单位',
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'U06', name: '千克二氧化碳当量', symbol: 'kgCO₂e', unitType: 'carbon',
    isBase: true, baseUnitId: null, baseUnitSymbol: null, factor: 1,
    status: 'enabled', remark: '碳排放量基准单位',
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  /* ---- 供应商清单（福临 1 双碳化筷）用到的单位：按表格原单位计算，不预先换算成 kg ---- */
  {
    id: 'U07', name: '克', symbol: 'g', unitType: 'weight',
    isBase: false, baseUnitId: 'U01', baseUnitSymbol: 'kg', factor: 0.001,
    status: 'enabled', remark: '1 g = 0.001 kg；材料 / 包材投入按表格 g 计',
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'U08', name: '吨·千米', symbol: 't·km', unitType: 'quantity',
    isBase: true, baseUnitId: null, baseUnitSymbol: null, factor: 1,
    status: 'enabled', remark: '运输周转量复合口径基准；1 t·km = 1000 kg·km',
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'U09', name: '千克·千米', symbol: 'kg·km', unitType: 'quantity',
    isBase: false, baseUnitId: 'U08', baseUnitSymbol: 't·km', factor: 0.001,
    status: 'enabled', remark: '1 kg·km = 0.001 t·km；原材料运输按表格 kg·km 计',
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'U10', name: '克二氧化碳当量', symbol: 'gCO₂e', unitType: 'carbon',
    isBase: false, baseUnitId: 'U06', baseUnitSymbol: 'kgCO₂e', factor: 0.001,
    status: 'enabled', remark: '1 gCO₂e = 0.001 kgCO₂e；供应商清单合计以 g/双 计',
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
]

/** 单位引用情况（只读反查，仅作展示） */
export const unitReferenceSeed: Record<string, UnitReferenceItem[]> = {}

/**
 * 计量单位选项（**填报表单下拉字典**；数量类单位不由单位库维护，见走查报告 S-03）。
 * 注：`t·km` / `kg·km` 为运输周转量**复合单位**，已按供应商清单口径补入计量单位库，
 * 在表单中仍独立成「复合单位」组，避免与单单位混淆。
 */
export const unitOptions: string[] = [
  '双', '件', '个', '包', '套', '盒',
  'g', 'kg', 't', 'kWh', 'm', 'm²', 'm³', 'km', 'kg·km', 't·km', 'gCO₂e', 'kgCO₂e',
]

/* ===================== 工序引用选项（物料库 / 能源库静态镜像） ===================== */

/** 物料库选项（Mock 引用「物料库」A1-1；M-9xx 为中间品 / 成品 / 副产品等工序流占位编码） */
export const materialOptions: MaterialOption[] = [
  { code: 'M-001', name: '毛竹原竹', unit: 'kg', status: 'enabled' },
  { code: 'M-002', name: '竹板材', unit: 'kg', status: 'enabled' },
  { code: 'M-003', name: '纸包装材料', unit: 'kg', status: 'enabled' },
  { code: 'M-004', name: '环保胶粘剂', unit: 'kg', status: 'enabled' },
  { code: 'M-005', name: '竹屑', unit: 'kg', status: 'enabled' },
  { code: 'M-901', name: '集后毛竹', unit: 'kg', status: 'enabled' },
  { code: 'M-902', name: '竹段', unit: 'kg', status: 'enabled' },
  { code: 'M-903', name: '碳化竹段', unit: 'kg', status: 'enabled' },
  { code: 'M-904', name: '成品筷（散）', unit: '双', status: 'enabled' },
  { code: 'M-905', name: '竹屑', unit: 'kg', status: 'enabled' },
  { code: 'M-906', name: '盒装竹筷', unit: '盒', status: 'enabled' },
  { code: 'M-907', name: '生产废水', unit: 'kg', status: 'enabled' },
  { code: 'M-908', name: '净化污泥', unit: 'kg', status: 'enabled' },
  { code: 'M-909', name: '混合料', unit: 'kg', status: 'enabled' },
  { code: 'M-910', name: '竹签', unit: '包', status: 'enabled' },
  { code: 'M-911', name: '竹粉', unit: 'kg', status: 'enabled' },
  { code: 'M-912', name: '干燥竹段', unit: 'kg', status: 'enabled' },
  { code: 'M-913', name: '竹坯料', unit: 'kg', status: 'enabled' },
  { code: 'M-914', name: '砂光竹件', unit: 'kg', status: 'enabled' },
  { code: 'M-915', name: '热压竹板', unit: 'kg', status: 'enabled' },
  { code: 'M-916', name: '水性涂料', unit: 'kg', status: 'enabled' },
  { code: 'M-917', name: '涂装竹板', unit: 'kg', status: 'enabled' },
  { code: 'M-918', name: '涂装废气', unit: 'kg', status: 'enabled' },
  { code: 'M-919', name: '五金配件', unit: '件', status: 'enabled' },
  { code: 'M-920', name: '成品竹木制品', unit: '件', status: 'enabled' },
]

/** 能源库选项（Mock 引用「能源库」A1-2） */
export const energyOptions: EnergyOption[] = [
  { code: 'E-001', name: '电力', unit: 'kWh', status: 'enabled' },
  { code: 'E-002', name: '天然气', unit: 'm³', status: 'enabled' },
]

/* ===================== 物料库 ===================== */

export const materialSeed: MaterialItem[] = [
  {
    id: 'M01', code: 'M-001', name: '毛竹原竹', type: 'raw_aux',
    industries: ['竹制品制造'], status: 'enabled', description: '碳化筷主要原料',
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'M02', code: 'M-002', name: '竹板材', type: 'raw_aux',
    industries: ['竹制品制造'], status: 'enabled', description: '冲压成型用板材',
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'M03', code: 'M-003', name: '纸包装材料', type: 'raw_aux',
    industries: ['竹制品制造'], status: 'enabled', description: '外包装纸盒',
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'M04', code: 'M-004', name: '环保胶粘剂', type: 'raw_aux',
    industries: ['竹制品制造'], status: 'enabled', description: '工序辅料',
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'M05', code: 'M-005', name: '竹屑', type: 'byproduct',
    industries: ['竹制品制造'], status: 'enabled', description: '断料 / 碳化 / 打磨产生的竹屑，可作副产品外售，核算中不重复计算上游负荷',
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
]

/* ===================== 能源库 ===================== */

export const energySeed: EnergyItem[] = [
  {
    id: 'EN01', code: 'E-001', name: '电力', energyType: 'electricity',
    industries: ['竹制品制造'], status: 'enabled', description: '外购电力',
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'EN02', code: 'E-002', name: '天然气', energyType: 'fossil',
    industries: ['竹制品制造'], status: 'enabled', description: '锅炉与热处理燃料',
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
]

/* ===================== 排放因子库 ===================== */

export const factorSeed: FactorItem[] = [
  {
    id: 'FAC01', code: 'F-001', name: '电力排放因子', alias: '', englishName: 'Electricity', scenario: '外购电力消耗',
    value: 0.581, numeratorUnit: 'kgCO₂e', denominatorUnit: 'kWh',
    source: 'preset', referenced: false,
    description: '全国电网平均电力排放因子',
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'FAC02', code: 'F-002', name: '天然气排放因子', alias: '', englishName: 'Natural gas', scenario: '天然气燃烧',
    value: 2.1622, numeratorUnit: 'kgCO₂e', denominatorUnit: 'm³',
    source: 'preset', referenced: false,
    description: '天然气固定燃烧排放因子',
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'FAC03', code: 'F-003', name: '毛竹原材料排放因子', alias: '', englishName: 'Moso bamboo, raw material', scenario: '毛竹原竹获取',
    value: 0.18, numeratorUnit: 'kgCO₂e', denominatorUnit: 'kg',
    /** 分指标示例：化石 0.12 + 生物碳 0.06 + 土地利用 0 = 总指标 0.18 */
    calibers: { gwpTotal: 0.18, gwpFossil: 0.12, gwpBiogenic: 0.06, gwpLuluc: 0 },
    source: 'preset', referenced: false,
    description: '毛竹种植、采伐与初加工平均排放因子',
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'FAC04', code: 'F-004', name: '公路货运排放因子', alias: '', scenario: '公路货物运输',
    value: 0.036, numeratorUnit: 'kgCO₂e', denominatorUnit: 't·km',
    source: 'preset', referenced: false,
    description: '中型柴油货车周转量排放因子',
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'FAC05', code: 'F-005', name: '废水处理排放因子', alias: '', englishName: 'Wastewater treatment', scenario: '工业废水处理',
    value: 0.52, numeratorUnit: 'kgCO₂e', denominatorUnit: 'kg',
    source: 'preset', referenced: false,
    description: '厂内废水处理站单位废水排放因子',
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'FAC06', code: 'F-006', name: '纸包装材料排放因子', alias: '', englishName: 'Paper packaging material', scenario: '外购纸包装材料',
    value: 0.91, numeratorUnit: 'kgCO₂e', denominatorUnit: 'kg',
    source: 'preset', referenced: false,
    description: '外购纸包装材料上游排放因子',
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'FAC07', code: 'F-007', name: '废弃竹制品焚烧处理排放因子', alias: '', scenario: '废弃与循环 · 焚烧处置',
    value: 0.06, numeratorUnit: 'kgCO₂e', denominatorUnit: 'kg',
    source: 'preset', referenced: false,
    description: '生活垃圾焚烧设施处置竹制品：仅计设施能耗与辅助燃料分摊，生物源 CO₂ 不计入（本期 CO₂ 口径）',
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'FAC08', code: 'F-008', name: '废弃竹制品卫生填埋排放因子', alias: '', englishName: 'Bamboo product waste, sanitary landfill', scenario: '废弃与循环 · 卫生填埋',
    value: 0.09, numeratorUnit: 'kgCO₂e', denominatorUnit: 'kg',
    source: 'preset', referenced: false,
    description: '卫生填埋场处置竹制品：计填埋作业能耗与分解气体按 CO₂ 口径简化折算',
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  /** 多口径演示因子：带「土地利用变化」分量（化石 0.01 + 土地利用 0.04 = 0.05） */
  {
    id: 'FAC09', code: 'F-009', name: '竹林经营土地利用变化排放因子', alias: '', englishName: 'Bamboo forest, direct land use change', scenario: '竹林经营与采伐',
    value: 0.05, numeratorUnit: 'kgCO₂e', denominatorUnit: 'kg',
    calibers: { gwpTotal: 0.05, gwpFossil: 0.01, gwpBiogenic: 0, gwpLuluc: 0.04 },
    source: 'preset', referenced: false,
    description: '竹林经营引起的直接土地利用变化（dLUC）排放，按单位原竹质量分摊',
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  /** 多口径演示因子：带「生物源」分量（化石 0.02 + 生物源 0.10 = 0.12） */
  {
    id: 'FAC10', code: 'F-010', name: '废弃竹制品生物源释放排放因子', alias: '', englishName: 'Bamboo product waste, biogenic release', scenario: '废弃与循环 · 生物源释放',
    value: 0.12, numeratorUnit: 'kgCO₂e', denominatorUnit: 'kg',
    calibers: { gwpTotal: 0.12, gwpFossil: 0.02, gwpBiogenic: 0.1, gwpLuluc: 0 },
    source: 'preset', referenced: false,
    description: '废弃竹制品降解 / 处置过程的生物源 CO₂ 释放（释放为正），按单位废弃竹制品质量分摊',
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
]

/** 因子引用情况（只读反查，仅作展示） */
export const factorReferenceSeed: Record<string, FactorReferenceItem[]> = {}

/* ===================== 因子库（多库模型） ===================== */

/** 因子库种子：商业数据库（整库导入、只读）+ 自建库（可维护） */
export const factorLibrarySeed: FactorLibrary[] = [
  {
    id: 'FLIB01', code: 'LB-001', name: '中国官方排放因子库', type: 'builtin',
    description: '平台运维维护的国内官方 / 行业公开排放因子合集，按需发布后供前台预览与使用。',
    maintainer: '平台运营', currentVersionId: 'FLV01', versionCount: 1, factorCount: 10,
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'FLIB02', code: 'LB-002', name: 'Ecoinvent 3.11', type: 'external',
    description: '商业数据库：Ecoinvent 3.11 背景数据库（Cutoff 体系）；整库导入，库内因子只读，按 ISIC 门类分类。',
    maintainer: 'Ecoinvent', currentVersionId: 'FLV02', versionCount: 1, factorCount: 4,
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'FLIB03', code: 'LB-003', name: 'CPCD 中国产品碳足迹数据库', type: 'external',
    description: '商业数据库：CPCD 中国产品碳足迹背景数据库；整库导入，库内因子只读，按年度发布新版本。',
    maintainer: 'CPCD', currentVersionId: 'FLV04', versionCount: 2, factorCount: 2,
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
]

/** 库版本种子：草稿 / 生效中 / 历史版本（发布新版本时上一生效版本自动转历史） */
export const factorLibraryVersionSeed: FactorLibraryVersion[] = [
  { id: 'FLV01', libraryId: 'FLIB01', versionNo: 'V1.0', year: '2024', status: 'published', changeNote: '初始版本（已发布）', factorCount: 10, publishedBy: MASTER_BY, publishedAt: '2024-12-01 10:00', lastActivatedAt: '2024-12-01 10:00', createdBy: MASTER_BY, createdAt: MASTER_AT },
  { id: 'FLV02', libraryId: 'FLIB02', versionNo: '3.11', year: '2024', status: 'published', changeNote: 'Ecoinvent 3.11 Cutoff 数据集', factorCount: 4, publishedBy: MASTER_BY, publishedAt: '2024-11-24 04:57', lastActivatedAt: '2024-11-24 04:57', createdBy: MASTER_BY, createdAt: MASTER_AT },
  { id: 'FLV03', libraryId: 'FLIB03', versionNo: '2024', year: '2024', status: 'history', changeNote: 'CPCD 2024 年度发布（已被 2025 替代）', factorCount: 2, publishedBy: MASTER_BY, publishedAt: '2024-06-01 10:00', lastActivatedAt: '2025-06-01 10:00', createdBy: MASTER_BY, createdAt: MASTER_AT },
  { id: 'FLV04', libraryId: 'FLIB03', versionNo: '2025', year: '2025', status: 'published', changeNote: 'CPCD 2025 年度发布：更新电网与天然气因子', factorCount: 2, publishedBy: MASTER_BY, publishedAt: '2025-06-01 10:00', lastActivatedAt: '2025-06-01 10:00', createdBy: MASTER_BY, createdAt: MASTER_AT },
]

const ex = (
  id: string,
  direction: 'input' | 'output',
  name: string,
  amount: number,
  unit: string,
  counterpart: string,
  carbonType: ExchangeCarbonType | null = null,
): FactorExchange => ({ id, direction, name, amount, unit, counterpart, carbonType })

interface ExtFactorInput {
  id: string
  code: string
  name: string
  alias: string
  libraryId: string
  libraryVersionId: string
  value: number
  denominatorUnit: string
  unitCategory: string
  region: string
  /** 英文名称（选填；不填时取英文别名首段，如「tin production | tin | Cutoff, S」→「tin production」） */
  englishName?: string
  isicCode: string
  isicName: string
  /** ISIC 类（二级分类）编码与名称，如 24 / 基本金属制造 */
  isicDivisionCode: string
  isicDivisionName: string
  ext: FactorExt
  exchanges: FactorExchange[]
  /** GWP 分项口径（选填） */
  calibers?: FactorCalibers
}

const buildExtFactor = (o: ExtFactorInput): FactorItem => ({
  id: o.id,
  code: o.code,
  name: o.name,
  alias: o.alias,
  englishName: o.englishName ?? o.alias.split('|')[0].trim() ?? undefined,
  scenario: o.ext.productName ?? '',
  value: o.value,
  calibers: o.calibers,
  numeratorUnit: 'kgCO₂e',
  denominatorUnit: o.denominatorUnit,
  source: 'preset',
  referenced: false,
  libraryId: o.libraryId,
  libraryVersionId: o.libraryVersionId,
  unitCategory: o.unitCategory,
  region: o.region,
  ext: {
    ...o.ext,
    isicCode: o.isicCode,
    isicName: o.isicName,
    isicDivisionCode: o.isicDivisionCode,
    isicDivisionName: o.isicDivisionName,
  },
  exchanges: o.exchanges,
  description: o.ext.processDescription ?? '',
  createdBy: MASTER_BY,
  createdAt: MASTER_AT,
  updatedBy: MASTER_BY,
  updatedAt: MASTER_AT,
})

/** 商业数据库因子（Ecoinvent 3.11 / CPCD），含 ext 扩展信息与 exchanges 输入输出 */
export const externalFactorSeed: FactorItem[] = [
  buildExtFactor({
    id: 'FACX01', code: 'F-201', name: '锡 | 锡生产', alias: 'tin production | tin | Cutoff, S',
    libraryId: 'FLIB02', libraryVersionId: 'FLV02', value: 6.0972,
    denominatorUnit: 'kg', unitCategory: '质量', region: '秘鲁', isicCode: 'C', isicName: '制造业',
    isicDivisionCode: '24', isicDivisionName: '基本金属制造',
    /** GWP 分项：IPCC2021 GWP100 口径下生物碳计 0，总量 = 化石 */
    calibers: { gwpTotal: 6.0972, gwpFossil: 6.0972, gwpBiogenic: 0 },
    ext: {
      productName: 'tin', casNo: '7440-31-5', owner: 'Ecoinvent3.11,Cutoff',
      ownerName: 'Ecoinvent', ownerVersion: '3.11', systemModel: 'cutoff',
      lciaMethod: 'IPCC2021 GWP100', gwpVersion: 'AR6', biogenicIncluded: false,
      processDescription:
        'ecoQuery: https://ecoinventory.org/3.11/cutoff/dataset/20003/documentation。该数据集描述秘鲁某锡冶炼精炼厂的运行：处理能力 240 吨精矿/日，年产约 4 万吨精锡（99.95%）。',
      timeBoundary: '-',
      timeDesc: '已复核近 6 年数据，期间工艺无显著变化。',
      geoName: '秘鲁',
      geoDesc: '所述过程发生在秘鲁南部 Ica 省；秘鲁仅此一家锡精炼厂。矿渣运至 Puno 省 San Rafael 锡矿。',
      techDesc: 'Ausmelt 熔炼炉技术基于澳大利亚 CSIRO 的专利，矿渣用于充填，故系统不含矿渣堆存与处理。',
      completeness: '-',
    },
    exchanges: [
      ex('EX01', 'input', 'Carbon dioxide, in air', 0.6712261367110443, 'kg', '-', 'biogenic'),
      ex('EX02', 'input', 'Carbon dioxide, non-fossil, resource correction', 0.6727637714841437, 'kg', '-', 'biogenic'),
      ex('EX03', 'output', 'Carbon monoxide, non-fossil', 0.00003487587627625868, 'kg', '-'),
      ex('EX04', 'output', 'Carbon tetrachloride', 2.2729669071746678e-9, 'kg', '-'),
      ex('EX05', 'output', 'Chloro-fluoromethane', 2.462005724507337e-10, 'kg', '-'),
    ],
  }),
  buildExtFactor({
    id: 'FACX02', code: 'F-202', name: '铸造，黄铜 | 铸造，黄铜', alias: 'casting, brass | casting, brass | Cutoff, S',
    libraryId: 'FLIB02', libraryVersionId: 'FLV02', value: 0.015391,
    denominatorUnit: 'kg', unitCategory: '质量', region: '全球', isicCode: 'C', isicName: '制造业',
    isicDivisionCode: '24', isicDivisionName: '基本金属制造',
    ext: {
      productName: 'brass', casNo: '12597-71-6', owner: 'Ecoinvent3.11,Cutoff',
      processDescription: '黄铜铸造过程数据集（Cutoff 体系），以废黄铜与电解铜为主要原料。',
      timeBoundary: '2019-2023', timeDesc: '基于近 5 年全球平均数据。',
      geoName: '全球', geoDesc: '全球平均（GLO）数据集，覆盖主要黄铜铸造产区。',
      techDesc: '中频感应电炉熔炼 + 砂型 / 金属型铸造。', completeness: '-',
    },
    exchanges: [
      ex('EX11', 'input', 'Brass scrap', 1.05, 'kg', 'brass scrap treatment'),
      ex('EX12', 'input', 'Electricity, medium voltage', 0.42, 'kWh', 'electricity production'),
      ex('EX13', 'output', 'Brass, cast', 1.0, 'kg', 'brass product'),
    ],
  }),
  buildExtFactor({
    id: 'FACX03', code: 'F-203', name: '铸造，黄铜 | 精密铸造', alias: 'casting, brass | precision casting | Cutoff, S',
    libraryId: 'FLIB02', libraryVersionId: 'FLV02', value: 0.062722,
    denominatorUnit: 'kg', unitCategory: '质量', region: '全球', isicCode: 'C', isicName: '制造业',
    isicDivisionCode: '25', isicDivisionName: '金属制品制造（机械除外）',
    ext: {
      productName: 'brass', casNo: '12597-71-6', owner: 'Ecoinvent3.11,Cutoff',
      processDescription: '黄铜精密铸造（失蜡法）数据集，能耗高于普通砂型铸造。',
      timeBoundary: '2019-2023', timeDesc: '基于近 5 年全球平均数据。',
      geoName: '全球', geoDesc: '全球平均（GLO）数据集。',
      techDesc: '失蜡精密铸造（investment casting）。', completeness: '-',
    },
    exchanges: [
      ex('EX21', 'input', 'Wax, for investment casting', 0.02, 'kg', 'wax production'),
      ex('EX22', 'input', 'Electricity, medium voltage', 1.8, 'kWh', 'electricity production'),
      ex('EX23', 'output', 'Brass, precision cast', 1.0, 'kg', 'brass product'),
    ],
  }),
  buildExtFactor({
    id: 'FACX04', code: 'F-204', name: '电力 | 全国电网（Ecoinvent）', alias: 'electricity, high voltage | CN grid | Cutoff, S',
    libraryId: 'FLIB02', libraryVersionId: 'FLV02', value: 0.5703,
    denominatorUnit: 'kWh', unitCategory: '能量', region: '中国', isicCode: 'D', isicName: '电力、燃气、蒸汽和空调供应',
    isicDivisionCode: '35', isicDivisionName: '电力、燃气、蒸汽和空调供应',
    calibers: { gwpTotal: 0.5703, gwpFossil: 0.5703, gwpBiogenic: 0 },
    ext: {
      productName: 'electricity', casNo: '-', owner: 'Ecoinvent3.11,Cutoff',
      ownerName: 'Ecoinvent', ownerVersion: '3.11', systemModel: 'cutoff',
      lciaMethod: 'IPCC2021 GWP100', gwpVersion: 'AR6', biogenicIncluded: false,
      processDescription: '中国高压电网电力供应数据集（Cutoff 体系），含输配电损耗。',
      timeBoundary: '2022', timeDesc: '基于 2022 年全国电网平均排放因子。',
      geoName: '中国', geoDesc: '中国大陆（CN）电网平均。',
      techDesc: '按全国电源结构加权（火电 / 水电 / 风电 / 光伏 / 核电）。', completeness: '-',
    },
    exchanges: [
      ex('EX31', 'input', 'Electricity, high voltage, produced', 1.06, 'kWh', 'CN electricity production'),
      ex('EX32', 'output', 'Electricity, high voltage', 1.0, 'kWh', 'consuming activity'),
    ],
  }),
  buildExtFactor({
    id: 'FACX09', code: 'F-205', name: '大豆 | 大豆种植', alias: 'soybean production | soybean | Cutoff, S',
    libraryId: 'FLIB02', libraryVersionId: 'FLV02', value: 0.7521,
    denominatorUnit: 'kg', unitCategory: '质量', region: '巴西', isicCode: 'A', isicName: '农业、林业和渔业',
    isicDivisionCode: '01', isicDivisionName: '作物种植、畜牧与狩猎',
    calibers: { gwpTotal: 0.7521, gwpFossil: 0.4103, gwpBiogenic: 0.3418 },
    ext: {
      productName: 'soybean', casNo: '-', owner: 'Ecoinvent3.11,Cutoff',
      ownerName: 'Ecoinvent', ownerVersion: '3.11', systemModel: 'cutoff',
      lciaMethod: 'IPCC2021 GWP100', gwpVersion: 'AR6', biogenicIncluded: true,
      processDescription: '巴西大豆种植数据集（Cutoff 体系），含化肥生产、田间机械作业与土地利用变化。',
      timeBoundary: '2018-2022', timeDesc: '基于近 5 年巴西主产区平均。', geoName: '巴西', geoDesc: '巴西中西部主产区。',
      techDesc: '免耕播种 + 化肥施用（N/P/K）。', completeness: '-',
    },
    exchanges: [
      ex('EX81', 'input', 'Nitrogen fertiliser, as N', 0.052, 'kg', 'fertiliser production'),
      ex('EX82', 'input', 'Carbon dioxide, in air', 0.3418, 'kg', '-', 'biogenic'),
      ex('EX83', 'output', 'Soybean', 1.0, 'kg', 'oil mill'),
    ],
  }),
  buildExtFactor({
    id: 'FACX10', code: 'F-206', name: '铜矿石 | 铜矿开采（含选矿）', alias: 'copper mine operation | copper concentrate | Cutoff, S',
    libraryId: 'FLIB02', libraryVersionId: 'FLV02', value: 1.2437,
    denominatorUnit: 'kg', unitCategory: '质量', region: '智利', isicCode: 'B', isicName: '采矿和采石',
    isicDivisionCode: '07', isicDivisionName: '金属矿开采',
    ext: {
      productName: 'copper concentrate', casNo: '-', owner: 'Ecoinvent3.11,Cutoff',
      ownerName: 'Ecoinvent', ownerVersion: '3.11', systemModel: 'cutoff',
      processDescription: '智利铜矿露天开采与选矿数据集，产出铜精矿（含 30% 铜）。',
      timeBoundary: '2019-2023', timeDesc: '基于近 5 年生产数据。', geoName: '智利', geoDesc: '智利北部铜矿区。',
      techDesc: '露天开采 + 破碎磨矿 + 浮选。', completeness: '-',
    },
    exchanges: [
      ex('EX91', 'input', 'Electricity, medium voltage', 0.62, 'kWh', 'electricity production'),
      ex('EX92', 'input', 'Diesel', 0.041, 'kg', 'diesel production'),
      ex('EX93', 'output', 'Copper concentrate', 1.0, 'kg', 'copper smelting'),
    ],
  }),
  buildExtFactor({
    id: 'FACX11', code: 'F-207', name: '铝锭 | 原生铝生产', alias: 'aluminium production, primary | aluminium | Cutoff, S',
    libraryId: 'FLIB02', libraryVersionId: 'FLV02', value: 16.4832,
    denominatorUnit: 'kg', unitCategory: '质量', region: '中国', isicCode: 'C', isicName: '制造业',
    isicDivisionCode: '24', isicDivisionName: '基本金属制造',
    calibers: { gwpTotal: 16.4832, gwpFossil: 16.4832, gwpBiogenic: 0 },
    ext: {
      productName: 'aluminium', casNo: '7429-90-5', owner: 'Ecoinvent3.11,Cutoff',
      ownerName: 'Ecoinvent', ownerVersion: '3.11', systemModel: 'cutoff',
      lciaMethod: 'IPCC2021 GWP100', gwpVersion: 'AR6', biogenicIncluded: false,
      processDescription: '中国原生铝（电解铝）生产数据集，含氧化铝精炼与电解环节电力消耗。',
      timeBoundary: '2021-2023', timeDesc: '基于近 3 年中国电解铝行业平均。', geoName: '中国', geoDesc: '中国大陆（CN）平均。',
      techDesc: '拜耳法氧化铝 + 预焙阳极电解槽（400kA）。', completeness: '-',
    },
    exchanges: [
      ex('EXA1', 'input', 'Aluminium oxide', 1.92, 'kg', 'alumina production'),
      ex('EXA2', 'input', 'Electricity, medium voltage', 13.5, 'kWh', 'electricity production'),
      ex('EXA3', 'output', 'Aluminium, primary', 1.0, 'kg', 'aluminium product'),
    ],
  }),
  buildExtFactor({
    id: 'FACX12', code: 'F-208', name: '水泥 | 硅酸盐水泥生产', alias: 'cement production, Portland | cement | Cutoff, S',
    libraryId: 'FLIB02', libraryVersionId: 'FLV02', value: 0.8624,
    denominatorUnit: 'kg', unitCategory: '质量', region: '全球', isicCode: 'C', isicName: '制造业',
    isicDivisionCode: '23', isicDivisionName: '非金属矿物制品制造',
    ext: {
      productName: 'cement', casNo: '65997-15-1', owner: 'Ecoinvent3.11,Cutoff',
      ownerName: 'Ecoinvent', ownerVersion: '3.11', systemModel: 'cutoff',
      lciaMethod: 'IPCC2021 GWP100', gwpVersion: 'AR6', biogenicIncluded: false,
      processDescription: '硅酸盐水泥（CEM I 42.5）生产数据集，含原料破碎、生料制备、熟料煅烧与粉磨。',
      timeBoundary: '2019-2023', timeDesc: '基于近 5 年全球平均。', geoName: '全球', geoDesc: '全球平均（GLO）。',
      techDesc: '新型干法回转窑，替代燃料比例 12%。', completeness: '-',
    },
    exchanges: [
      ex('EXB1', 'input', 'Limestone', 1.15, 'kg', 'limestone quarrying'),
      ex('EXB2', 'input', 'Hard coal', 0.094, 'kg', 'coal production'),
      ex('EXB3', 'output', 'Cement, Portland', 1.0, 'kg', 'concrete production'),
    ],
  }),
  buildExtFactor({
    id: 'FACX13', code: 'F-209', name: '废钢 | 废钢回收处理', alias: 'steel scrap recycling | steel scrap | Cutoff, S',
    libraryId: 'FLIB02', libraryVersionId: 'FLV02', value: 0.4231,
    denominatorUnit: 'kg', unitCategory: '质量', region: '全球', isicCode: 'E', isicName: '供水；污水处理、废物管理和治理',
    isicDivisionCode: '38', isicDivisionName: '废物收集、处理与处置；材料回收',
    ext: {
      productName: 'steel scrap', casNo: '-', owner: 'Ecoinvent3.11,Cutoff',
      ownerName: 'Ecoinvent', ownerVersion: '3.11', systemModel: 'cutoff',
      lciaMethod: 'IPCC2021 GWP100', gwpVersion: 'AR6', biogenicIncluded: false,
      processDescription: '废钢回收处理数据集（Cutoff 体系），含收集、分选、剪切打包与短流程供电。',
      timeBoundary: '2019-2023', timeDesc: '基于近 5 年全球平均。', geoName: '全球', geoDesc: '全球平均（GLO）。',
      techDesc: '磁选 + 剪切打包，电弧炉短流程冶炼供电。', completeness: '-',
    },
    exchanges: [
      ex('EXC1', 'input', 'Steel scrap, unsorted', 1.05, 'kg', 'scrap collection'),
      ex('EXC2', 'input', 'Electricity, medium voltage', 0.28, 'kWh', 'electricity production'),
      ex('EXC3', 'output', 'Steel scrap, sorted', 1.0, 'kg', 'steel production'),
    ],
  }),
  buildExtFactor({
    id: 'FACX14', code: 'F-210', name: '公路货运 | 重型货车运输（>32t）', alias: 'transport, freight, lorry >32 metric ton | EURO6 | Cutoff, S',
    libraryId: 'FLIB02', libraryVersionId: 'FLV02', value: 0.1063,
    denominatorUnit: 't·km', unitCategory: '运输', region: '欧洲', isicCode: 'H', isicName: '运输与储存',
    isicDivisionCode: '49', isicDivisionName: '陆路运输与管道运输',
    ext: {
      productName: 'transport, freight', casNo: '-', owner: 'Ecoinvent3.11,Cutoff',
      ownerName: 'Ecoinvent', ownerVersion: '3.11', systemModel: 'cutoff',
      lciaMethod: 'IPCC2021 GWP100', gwpVersion: 'AR6', biogenicIncluded: false,
      processDescription: '重型柴油货车（>32t，EURO6）公路货运数据集，按吨公里计量，含空载回程修正。',
      timeBoundary: '2019-2023', timeDesc: '基于近 5 年欧洲车队平均。', geoName: '欧洲', geoDesc: '欧洲（RER）平均。',
      techDesc: '柴油牵引车 + 半挂车，平均载荷率 85%。', completeness: '-',
    },
    exchanges: [
      ex('EXD1', 'input', 'Diesel', 0.033, 'kg', 'diesel production'),
      ex('EXD2', 'output', 'Transport, freight, lorry', 1.0, 't·km', 'freight service'),
    ],
  }),
  buildExtFactor({
    id: 'FACX05', code: 'F-301', name: '电力 | 华东电网', alias: 'electricity | East China grid',
    libraryId: 'FLIB03', libraryVersionId: 'FLV03', value: 0.61,
    denominatorUnit: 'kWh', unitCategory: '能量', region: '中国', isicCode: 'D', isicName: '电力、燃气、蒸汽和空调供应',
    isicDivisionCode: '35', isicDivisionName: '电力、燃气、蒸汽和空调供应',
    ext: {
      productName: 'electricity', casNo: '-', owner: 'CPCD', processDescription: 'CPCD 2024 年度华东电网电力因子。',
      timeBoundary: '2023', timeDesc: '基于 2023 年华东电网实际电源结构。', geoName: '中国', geoDesc: '华东区域电网。',
      techDesc: '区域电网加权平均。', completeness: '-',
    },
    exchanges: [ex('EX41', 'output', 'Electricity, East China grid', 1.0, 'kWh', 'consuming activity')],
  }),
  buildExtFactor({
    id: 'FACX06', code: 'F-302', name: '天然气 | 工业锅炉燃烧', alias: 'natural gas | industrial boiler',
    libraryId: 'FLIB03', libraryVersionId: 'FLV03', value: 2.2,
    denominatorUnit: 'm³', unitCategory: '体积', region: '中国', isicCode: 'D', isicName: '电力、燃气、蒸汽和空调供应',
    isicDivisionCode: '35', isicDivisionName: '电力、燃气、蒸汽和空调供应',
    ext: {
      productName: 'natural gas', casNo: '8006-14-2', owner: 'CPCD', processDescription: 'CPCD 2024 年度工业锅炉天然气燃烧因子。',
      timeBoundary: '2023', timeDesc: '基于 2023 年国内工业锅炉实测均值。', geoName: '中国', geoDesc: '全国平均。',
      techDesc: '固定燃烧源排放因子法。', completeness: '-',
    },
    exchanges: [ex('EX51', 'output', 'Natural gas combustion', 1.0, 'm³', 'consuming activity')],
  }),
  buildExtFactor({
    id: 'FACX07', code: 'F-301', name: '电力 | 华东电网', alias: 'electricity | East China grid',
    libraryId: 'FLIB03', libraryVersionId: 'FLV04', value: 0.581,
    denominatorUnit: 'kWh', unitCategory: '能量', region: '中国', isicCode: 'D', isicName: '电力、燃气、蒸汽和空调供应',
    isicDivisionCode: '35', isicDivisionName: '电力、燃气、蒸汽和空调供应',
    ext: {
      productName: 'electricity', casNo: '-', owner: 'CPCD', processDescription: 'CPCD 2025 年度华东电网电力因子（较 2024 下降）。',
      timeBoundary: '2024', timeDesc: '基于 2024 年华东电网实际电源结构。', geoName: '中国', geoDesc: '华东区域电网。',
      techDesc: '区域电网加权平均。', completeness: '-',
    },
    exchanges: [ex('EX61', 'output', 'Electricity, East China grid', 1.0, 'kWh', 'consuming activity')],
  }),
  buildExtFactor({
    id: 'FACX08', code: 'F-302', name: '天然气 | 工业锅炉燃烧', alias: 'natural gas | industrial boiler',
    libraryId: 'FLIB03', libraryVersionId: 'FLV04', value: 2.1622,
    denominatorUnit: 'm³', unitCategory: '体积', region: '中国', isicCode: 'D', isicName: '电力、燃气、蒸汽和空调供应',
    isicDivisionCode: '35', isicDivisionName: '电力、燃气、蒸汽和空调供应',
    ext: {
      productName: 'natural gas', casNo: '8006-14-2', owner: 'CPCD', processDescription: 'CPCD 2025 年度工业锅炉天然气燃烧因子（较 2024 更新）。',
      timeBoundary: '2024', timeDesc: '基于 2024 年国内工业锅炉实测均值。', geoName: '中国', geoDesc: '全国平均。',
      techDesc: '固定燃烧源排放因子法。', completeness: '-',
    },
    exchanges: [ex('EX71', 'output', 'Natural gas combustion', 1.0, 'm³', 'consuming activity')],
  }),
]

/* ===================== 我的因子库（前台私有） ===================== */

/** 福临因子库 id：福建邵武福临日用品制造有限公司「1 双碳化筷」单元过程因子 */
const FULIN_LIBRARY_ID = 'MFL02'

/**
 * 福临因子构造器：统一填充「手工新增」来源与制单信息。
 * 因子单位按供应商清单原口径录入（分子 gCO₂e / kgCO₂e；分母 g / kg·km / t·km / kWh / kg），
 * 活动数据与合计（g/双）逐条保留在描述中，**不预先换算成 kg**。
 */
const fulinFactor = (params: {
  id: string
  code: string
  name: string
  scenario: string
  value: number
  numeratorUnit: string
  denominatorUnit: string
  description: string
}): MyFactor => ({
  ...params,
  alias: '',
  source: 'custom',
  libraryId: FULIN_LIBRARY_ID,
  origin: 'manual',
  createdBy: MASTER_BY,
  createdAt: MASTER_AT,
  updatedBy: MASTER_BY,
  updatedAt: MASTER_AT,
})

export const myFactorLibrarySeed: MyFactorLibrary[] = [
  {
    id: 'MFL01', name: '熊宝组织因子库', description: '收藏后台已发布库中的因子形成本组织私有副本，并维护企业实测因子。',
    factorCount: 2, createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: FULIN_LIBRARY_ID,
    name: '福临因子库',
    description:
      '福建邵武福临日用品制造有限公司「1 双碳化筷」单元过程（2025/01/01—2025/12/31）：FU 与基准流均为 1 双，产品重量 12.1 g。按 A1 原材料获取 / A2 原材料运输 / A3 产品生产三阶段录入 9 项因子；背景数据库来源为 Ecoinvent 3.11 cut-off 数据集（截图来源列文字模糊，具体数据集名以供应商原始清单为准），柴油燃烧为 IPCC 计算。因子单位按表格原口径录入（gCO₂e/g、gCO₂e/kg·km、gCO₂e/t·km、kgCO₂e/kWh、kgCO₂e/kg），活动数据不预先换算成 kg。',
    factorCount: 9, createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
]

/** 我的因子种子：熊宝库 1 条收藏副本（有新版本可更新）+ 1 条手工新增；福临库 9 条单元过程因子 */
export const myFactorSeed: MyFactor[] = [
  {
    id: 'MYF01', code: 'MF-001', name: '天然气 | 工业锅炉燃烧', alias: 'natural gas | industrial boiler',
    englishName: 'Natural gas, industrial boiler',
    scenario: 'natural gas',
    value: 2.2, numeratorUnit: 'kgCO₂e', denominatorUnit: 'm³',
    source: 'custom',
    description: '收藏自 CPCD 2024 年度版本（复制副本，不随源库自动变化）。',
    libraryId: 'MFL01', origin: 'collected',
    sourceLibraryId: 'FLIB03', sourceLibraryName: 'CPCD 中国产品碳足迹数据库',
    sourceVersionId: 'FLV03', sourceVersionNo: '2024',
    sourceFactorId: 'FACX06', sourceFactorCode: 'F-302', updateAvailable: true,
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'MYF02', code: 'MF-002', name: '企业实测电力排放因子', alias: '',
    englishName: 'Electricity, enterprise measured',
    scenario: '企业自备电站供电',
    value: 0.49, numeratorUnit: 'kgCO₂e', denominatorUnit: 'kWh',
    source: 'custom',
    description: '企业自备生物质电站实测电力排放因子。',
    libraryId: 'MFL01', origin: 'manual',
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  /* ---- 福临因子库：1 双碳化筷单元过程（A1 / A2 / A3），单位按表格原口径 ---- */
  fulinFactor({
    id: 'MYF03', code: 'MF-003', name: '竹丝条（碳化毛竹）',
    scenario: 'A1 原材料获取 · 主材获取（碳化筷）',
    value: 0.544, numeratorUnit: 'gCO₂e', denominatorUnit: 'g',
    description:
      'A1 原材料获取 / 主材获取 / 竹丝条；活动数据 14.40 g，排放因子 0.544 gCO₂e/g，合计 7.8396 g/双。背景数据库来源：Ecoinvent 3.11 cut-off 数据集。备注：碳化 / 175cm / 毛竹 / 3 年以上。',
  }),
  fulinFactor({
    id: 'MYF04', code: 'MF-004', name: '牛皮纸',
    scenario: 'A1 原材料获取 · 包材获取（碳化筷）',
    value: 0.788, numeratorUnit: 'gCO₂e', denominatorUnit: 'g',
    description:
      'A1 原材料获取 / 包材获取 / 牛皮纸；活动数据 1.60 g，排放因子 0.788 gCO₂e/g，合计 1.2602 g/双。背景数据库来源：Ecoinvent 3.11 cut-off 数据集。备注：基于市场，排放因子包含运输。',
  }),
  fulinFactor({
    id: 'MYF05', code: 'MF-005', name: '瓦楞纸箱',
    scenario: 'A1 原材料获取 · 包材获取（碳化筷）',
    value: 1.319, numeratorUnit: 'gCO₂e', denominatorUnit: 'g',
    description:
      'A1 原材料获取 / 包材获取 / 瓦楞纸箱；活动数据 0.36 g，排放因子 1.319 gCO₂e/g，合计 0.4736 g/双。背景数据库来源：Ecoinvent 3.11 cut-off 数据集。备注：基于市场，排放因子包含运输。',
  }),
  fulinFactor({
    id: 'MYF06', code: 'MF-006', name: '陆运（原材料运输）',
    scenario: 'A2 原材料运输 · 原材料运输输入',
    value: 0.161, numeratorUnit: 'gCO₂e', denominatorUnit: 'kg·km',
    description:
      'A2 原材料运输 / 原材料运输输入 / 陆运；活动数据 3.95 kg·km，排放因子 0.161 gCO₂e/kg·km，合计 0.6360 g/双。背景数据库来源：Ecoinvent 3.11 cut-off 数据集。备注：调研供应商 - 实际 274 km。',
  }),
  fulinFactor({
    id: 'MYF07', code: 'MF-007', name: '电力（华中电网）',
    scenario: 'A3 产品生产 · 能源使用（电）',
    value: 0.854, numeratorUnit: 'kgCO₂e', denominatorUnit: 'kWh',
    description:
      'A3 产品生产 / 能源使用 / 电；活动数据 4.28E-03 kWh，排放因子 0.854 kgCO₂e/kWh，合计 3.6522 g/双（因子为 kg 口径，核算时按单位库归一）。背景数据库来源：Ecoinvent 3.11 cut-off 数据集。备注：原表记录华中电网 0.5366 kgCO₂e/kWh，暂不修改。',
  }),
  fulinFactor({
    id: 'MYF08', code: 'MF-008', name: '柴油（上游）',
    scenario: 'A3 产品生产 · 能源使用（柴油）',
    value: 0.861, numeratorUnit: 'kgCO₂e', denominatorUnit: 'kg',
    description:
      'A3 产品生产 / 能源使用 / 柴油；活动数据 3.32E-07 kg，排放因子 0.861 kgCO₂e/kg，合计 0.0003 g/双（因子为 kg 口径，核算时按单位库归一）。背景数据库来源：Ecoinvent 3.11 cut-off 数据集。',
  }),
  fulinFactor({
    id: 'MYF09', code: 'MF-009', name: '柴油燃烧',
    scenario: 'A3 产品生产 · 能源使用（柴油燃烧）',
    value: 3.503, numeratorUnit: 'kgCO₂e', denominatorUnit: 'kg',
    description:
      'A3 产品生产 / 能源使用 / 柴油燃烧；活动数据 3.32E-07 kg，排放因子 3.503 kgCO₂e/kg，合计 0.0012 g/双（因子为 kg 口径，核算时按单位库归一）。背景数据库来源：IPCC 计算。',
  }),
  fulinFactor({
    id: 'MYF10', code: 'MF-010', name: '抵扣材料（竹丝条）',
    scenario: 'A3 产品生产 · 废弃物处理（抵扣）',
    value: -0.544, numeratorUnit: 'gCO₂e', denominatorUnit: 'g',
    description:
      'A3 产品生产 / 废弃物处理 / 抵扣材料；活动数据 2.30 g，排放因子 -0.544 gCO₂e/g，合计 -1.2522 g/双。背景数据库来源：原表未标注，按对应主材因子负值抵扣。备注：扣除对应的原材料，用于木粉。',
  }),
  fulinFactor({
    id: 'MYF11', code: 'MF-011', name: '陆运（废弃物运输）',
    scenario: 'A3 产品生产 · 废弃物运输',
    value: 0.161, numeratorUnit: 'gCO₂e', denominatorUnit: 't·km',
    description:
      'A3 产品生产 / 废弃物运输 / 陆运；活动数据 0.53 t·km，排放因子 0.161 gCO₂e/t·km，合计 0.0853 g/双。背景数据库来源：Ecoinvent 3.11 cut-off 数据集。',
  }),
]

/* ===================== 计算公式（标准公式库：建模侧工序流绑定） ===================== */

const formulaFactor = (
  id: string,
  name: string,
  sourceType: FormulaFactor['sourceType'],
  unit: string,
  extra: { sourceCode?: string; sourceName?: string; sourceLib?: string; value?: string } = {},
): FormulaFactor => ({
  id,
  name,
  sourceType,
  sourceLib: extra.sourceLib ?? '',
  sourceCode: extra.sourceCode ?? '',
  sourceName: extra.sourceName ?? '',
  value: extra.value ?? '',
  unit,
})

export const calcFormulaSeed: CalcFormula[] = [
  {
    id: 'FMC001', code: 'FM-001', name: '因子法（质量口径）', formulaType: 'factor',
    expression: '活动量*排放因子',
    resultName: '碳排放量', resultUnit: 'kgCO₂e',
    supportsSumLoop: false, supportsNegativeResult: false,
    dataOwnerType: 'preset', ownerOrg: '空天碳示范组织', status: 'enabled',
    description: '通用因子法：活动量 × 排放因子（质量口径）',
    factors: [
      formulaFactor('FF001', '活动量', 'activity', ''),
      formulaFactor('FF002', '排放因子', 'factor', ''),
    ],
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'FMC002', code: 'FM-002', name: '运输 t·km 法', formulaType: 'other',
    expression: '周转量*排放因子',
    resultName: '碳排放量', resultUnit: 'kgCO₂e',
    supportsSumLoop: false, supportsNegativeResult: false,
    dataOwnerType: 'preset', ownerOrg: '空天碳示范组织', status: 'enabled',
    description: '运输环节：周转量（t·km）× 运输排放因子',
    factors: [
      formulaFactor('FF003', '周转量', 'activity', ''),
      formulaFactor('FF004', '排放因子', 'factor', ''),
    ],
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'FMC003', code: 'FM-003', name: '因子法（电力口径）', formulaType: 'energy',
    expression: '用电量*排放因子',
    resultName: '碳排放量', resultUnit: 'kgCO₂e',
    supportsSumLoop: false, supportsNegativeResult: false,
    dataOwnerType: 'preset', ownerOrg: '空天碳示范组织', status: 'enabled',
    description: '外购电力：用电量 × 电力排放因子',
    factors: [
      formulaFactor('FF005', '用电量', 'activity', ''),
      formulaFactor('FF006', '排放因子', 'factor', ''),
    ],
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'FMC004', code: 'FM-004', name: '因子法（废水口径）', formulaType: 'factor',
    expression: '处理量*排放因子',
    resultName: '碳排放量', resultUnit: 'kgCO₂e',
    supportsSumLoop: false, supportsNegativeResult: false,
    dataOwnerType: 'preset', ownerOrg: '空天碳示范组织', status: 'enabled',
    description: '废水处理：处理量 × 废水处理排放因子',
    factors: [
      formulaFactor('FF007', '处理量', 'activity', ''),
      formulaFactor('FF008', '排放因子', 'factor', ''),
    ],
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'FMC005', code: 'FM-005', name: '回收信用法', formulaType: 'factor',
    expression: '回收量*抵扣系数',
    resultName: '碳排放量', resultUnit: 'kgCO₂e',
    supportsSumLoop: false, supportsNegativeResult: true,
    dataOwnerType: 'preset', ownerOrg: '空天碳示范组织', status: 'enabled',
    description: '副产品 / 回收物：回收量 × 抵扣系数（无需匹配因子）',
    factors: [
      formulaFactor('FF009', '回收量', 'activity', ''),
      formulaFactor('FF010', '抵扣系数', 'constant', 'kgCO₂e/kg', { value: '0.5' }),
    ],
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
]

/* ===================== 工序管理 ===================== */

export const operationSeed: OperationItem[] = [
  {
    id: 'OP01', code: 'GX-00', name: '厂外运输', type: 'auxiliary', iconUrl: '',
    description: '毛竹原竹从林场到工厂的公路运输',
    useStatus: 'enabled',
    inputs: [opFlow('OF01', 1, 'material', 'M-001', '毛竹原竹（厂外运输）', 't·km')],
    outputs: [opFlow('OF02', 1, 'material', 'M-901', '集后毛竹', 'kg')],
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedAt: MASTER_AT,
  },
  {
    id: 'OP02', code: 'GX-01', name: '断料', type: 'main', iconUrl: '',
    description: '原竹断料成标准竹段',
    useStatus: 'enabled',
    inputs: [opFlow('OF03', 1, 'material', 'M-001', '毛竹原竹', 'kg')],
    outputs: [opFlow('OF04', 1, 'material', 'M-902', '竹段', 'kg')],
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedAt: MASTER_AT,
  },
  {
    id: 'OP03', code: 'GX-02', name: '碳化', type: 'main', iconUrl: '',
    description: '竹段碳化处理',
    useStatus: 'enabled',
    inputs: [
      opFlow('OF05', 1, 'material', 'M-902', '竹段', 'kg'),
      opFlow('OF06', 2, 'energy', 'E-001', '电力', 'kWh'),
    ],
    outputs: [opFlow('OF07', 1, 'material', 'M-903', '碳化竹段', 'kg')],
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedAt: MASTER_AT,
  },
  {
    id: 'OP04', code: 'GX-03', name: '打磨成型', type: 'main', iconUrl: '',
    description: '碳化竹段打磨成型，产出散装配竹屑',
    useStatus: 'enabled',
    inputs: [opFlow('OF08', 1, 'material', 'M-903', '碳化竹段', 'kg')],
    outputs: [
      opFlow('OF09', 1, 'material', 'M-904', '成品筷（散）', '双'),
      opFlow('OF10', 2, 'material', 'M-905', '竹屑', 'kg'),
    ],
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedAt: MASTER_AT,
  },
  {
    id: 'OP05', code: 'GX-04', name: '包装', type: 'auxiliary', iconUrl: '',
    description: '散装筷纸盒包装成成品',
    useStatus: 'enabled',
    inputs: [
      opFlow('OF11', 1, 'material', 'M-904', '成品筷（散）', '双'),
      opFlow('OF12', 2, 'material', 'M-003', '纸包装材料', 'kg'),
    ],
    outputs: [opFlow('OF13', 1, 'material', 'M-906', '盒装竹筷', '盒')],
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedAt: MASTER_AT,
  },
  {
    id: 'OP06', code: 'GX-06', name: '厂内废水处理', type: 'disposal', iconUrl: '',
    description: '生产废水厂内处理（废弃与循环阶段演示）',
    useStatus: 'enabled',
    inputs: [opFlow('OF14', 1, 'material', 'M-907', '生产废水', 'kg', { emissionCategory: 'wastewater' })],
    outputs: [opFlow('OF15', 1, 'material', 'M-908', '净化污泥', 'kg')],
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedAt: MASTER_AT,
  },
  {
    id: 'OP07', code: 'GX-07', name: '试剂添加', type: 'auxiliary', iconUrl: '',
    description: '添加环保胶粘剂（排放因子在填报时匹配，演示 B2 拦截）',
    useStatus: 'enabled',
    inputs: [opFlow('OF16', 1, 'material', 'M-004', '环保胶粘剂', 'kg')],
    outputs: [opFlow('OF17', 1, 'material', 'M-909', '混合料', 'kg')],
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedAt: MASTER_AT,
  },
  {
    id: 'OP08', code: 'GX-08', name: '分切', type: 'auxiliary', iconUrl: '',
    description: '混合料分切（多产出，演示 B3 分配比例）',
    useStatus: 'enabled',
    inputs: [opFlow('OF18', 1, 'material', 'M-909', '混合料', 'kg')],
    outputs: [
      opFlow('OF19', 1, 'material', 'M-910', '竹签', '包'),
      opFlow('OF20', 2, 'material', 'M-911', '竹粉', 'kg'),
    ],
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedAt: MASTER_AT,
  },
  {
    id: 'OP09', code: 'GX-09', name: '干燥', type: 'main', iconUrl: '',
    description: '竹段烘干去湿，降低含水率',
    useStatus: 'enabled',
    inputs: [
      opFlow('OF21', 1, 'material', 'M-902', '竹段', 'kg'),
      opFlow('OF22', 2, 'energy', 'E-001', '电力', 'kWh'),
    ],
    outputs: [opFlow('OF23', 1, 'semi', 'M-912', '干燥竹段', 'kg')],
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedAt: MASTER_AT,
  },
  {
    id: 'OP10', code: 'GX-10', name: '裁切', type: 'main', iconUrl: '',
    description: '干燥竹段定尺裁切，产出竹坯料与竹屑',
    useStatus: 'enabled',
    inputs: [
      opFlow('OF24', 1, 'material', 'M-912', '干燥竹段', 'kg'),
      opFlow('OF25', 2, 'energy', 'E-001', '电力', 'kWh'),
    ],
    outputs: [
      opFlow('OF26', 1, 'semi', 'M-913', '竹坯料', 'kg'),
      opFlow('OF27', 2, 'byproduct', 'M-905', '竹屑', 'kg'),
    ],
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedAt: MASTER_AT,
  },
  {
    id: 'OP11', code: 'GX-11', name: '砂光', type: 'main', iconUrl: '',
    description: '竹坯料表面砂光，产出砂光竹件与竹屑',
    useStatus: 'enabled',
    inputs: [
      opFlow('OF28', 1, 'material', 'M-913', '竹坯料', 'kg'),
      opFlow('OF29', 2, 'energy', 'E-001', '电力', 'kWh'),
    ],
    outputs: [
      opFlow('OF30', 1, 'semi', 'M-914', '砂光竹件', 'kg'),
      opFlow('OF31', 2, 'byproduct', 'M-905', '竹屑', 'kg'),
    ],
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedAt: MASTER_AT,
  },
  {
    id: 'OP12', code: 'GX-12', name: '热压', type: 'main', iconUrl: '',
    description: '砂光竹件涂胶热压成型，产出热压竹板',
    useStatus: 'enabled',
    inputs: [
      opFlow('OF32', 1, 'material', 'M-914', '砂光竹件', 'kg'),
      opFlow('OF33', 2, 'material', 'M-004', '环保胶粘剂', 'kg'),
      opFlow('OF34', 3, 'energy', 'E-001', '电力', 'kWh'),
    ],
    outputs: [opFlow('OF35', 1, 'semi', 'M-915', '热压竹板', 'kg')],
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedAt: MASTER_AT,
  },
  {
    id: 'OP13', code: 'GX-13', name: '涂装', type: 'main', iconUrl: '',
    description: '热压竹板表面涂饰，产出涂装竹板与涂装废气',
    useStatus: 'enabled',
    inputs: [
      opFlow('OF36', 1, 'material', 'M-915', '热压竹板', 'kg'),
      opFlow('OF37', 2, 'material', 'M-916', '水性涂料', 'kg'),
    ],
    outputs: [
      opFlow('OF38', 1, 'semi', 'M-917', '涂装竹板', 'kg'),
      opFlow('OF39', 2, 'emission', 'M-918', '涂装废气', 'kg', { emissionCategory: 'gas' }),
    ],
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedAt: MASTER_AT,
  },
  {
    id: 'OP14', code: 'GX-14', name: '组装', type: 'auxiliary', iconUrl: '',
    description: '涂装竹板与五金配件组装成成品',
    useStatus: 'enabled',
    inputs: [
      opFlow('OF40', 1, 'material', 'M-917', '涂装竹板', 'kg'),
      opFlow('OF41', 2, 'material', 'M-919', '五金配件', '件'),
    ],
    outputs: [opFlow('OF42', 1, 'product', 'M-920', '成品竹木制品', '件')],
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedAt: MASTER_AT,
  },
]

/* ===================== 工艺流程管理 ===================== */

const processOp = (id: string, seq: number, order: number, opCode: string, opName: string): ProcessOperationItem => ({
  id, seq, order, opCode, opName, remark: '',
})

export const processSeed: ProcessItem[] = [
  {
    id: 'GY01', code: 'GY-00', name: '采购与运输工艺', categoryId: 'PC200903',
    industry: '竹制品制造', lifecycleStage: '采伐阶段',
    description: '毛竹采购与厂外运输',
    useStatus: 'enabled', org: '平台级', visibility: 'PUBLIC', hasDisposal: false,
    operations: [processOp('PO01', 1, 1, 'GX-00', '厂外运输')],
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedAt: MASTER_AT,
  },
  {
    id: 'GY02', code: 'GY-01', name: '竹筷成型工艺', categoryId: 'PC200903',
    industry: '竹制品制造', lifecycleStage: '加工阶段',
    description: '断料 → 碳化 → 打磨成型',
    useStatus: 'enabled', org: '平台级', visibility: 'PUBLIC', hasDisposal: false,
    operations: [
      processOp('PO02', 1, 1, 'GX-01', '断料'),
      processOp('PO03', 2, 2, 'GX-02', '碳化'),
      processOp('PO04', 3, 3, 'GX-03', '打磨成型'),
    ],
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedAt: MASTER_AT,
  },
  {
    id: 'GY03', code: 'GY-02', name: '包装工艺', categoryId: 'PC200903',
    industry: '竹制品制造', lifecycleStage: '加工阶段',
    description: '纸盒包装',
    useStatus: 'enabled', org: '平台级', visibility: 'PUBLIC', hasDisposal: false,
    operations: [processOp('PO05', 1, 1, 'GX-04', '包装')],
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedAt: MASTER_AT,
  },
  {
    id: 'GY04', code: 'GY-03', name: '废水处理工艺', categoryId: 'PC200903',
    industry: '竹制品制造', lifecycleStage: '废弃与循环',
    description: '厂内废水处理（废弃与循环阶段）',
    useStatus: 'enabled', org: '平台级', visibility: 'PUBLIC', hasDisposal: true,
    operations: [processOp('PO06', 1, 1, 'GX-06', '厂内废水处理')],
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedAt: MASTER_AT,
  },
]

/** 工序模板扁平索引：已由 fetchOperationTemplates 从工序库动态派生，保留空导出 */
export const operationTemplates: OperationTemplate[] = []

/** 工艺流程模板：已由 fetchProcessTemplates 从工艺流程库动态派生，保留空导出 */
export const processTemplates: ProcessTemplate[] = []

/* ===================== 产品信息库 ===================== */

export const productSeed: ProductItem[] = [
  {
    id: 'P01',
    code: 'P-2026-001',
    name: '240mm 全竹碳化筷',
    categoryId: 'PC200903',
    model: 'ZKM-240',
    spec: '240mm·100 双/盒',
    unit: '双',
    industry: '竹制品制造',
    imageUrl: '',
    description: '以毛竹为原料的碳化筷',
    useStatus: 'on',
    org: '平台级',
    createdBy: MASTER_BY,
    createdAt: '2026-08-20 09:00',
    updatedAt: '2026-08-20 09:00',
    processes: [
      {
        id: 'P01-PR1', processCode: 'GY-00', processName: '采购与运输工艺',
        lifecycleStage: '采伐阶段', seq: 1,
        operations: [
          productOp('P01-OP1', 'GX-00', '厂外运输', 1,
            [pdFlow('P01-F01', 'material', '毛竹原竹（厂外运输）', 3.2, 't·km', FM.transport)],
            [pdFlow('P01-F02', 'semi', '集后毛竹', 1, 'kg', null, 'excluded')]),
        ],
      },
      {
        id: 'P01-PR2', processCode: 'GY-01', processName: '竹筷成型工艺',
        lifecycleStage: '加工阶段', seq: 2,
        operations: [
          productOp('P01-OP2', 'GX-01', '断料', 1,
            [pdFlow('P01-F03', 'material', '毛竹原竹', 62, 'kg', FM.mass)],
            [pdFlow('P01-F04', 'semi', '竹段', 58, 'kg', null, 'excluded')]),
          productOp('P01-OP3', 'GX-02', '碳化', 2,
            [
              pdFlow('P01-F05', 'semi', '竹段', 58, 'kg', null, 'excluded'),
              pdFlow('P01-F06', 'energy', '电力', 42, 'kWh', FM.elec),
            ],
            [pdFlow('P01-F07', 'semi', '碳化竹段', 52, 'kg', null, 'excluded')]),
          productOp('P01-OP4', 'GX-03', '打磨成型', 3,
            [pdFlow('P01-F08', 'semi', '碳化竹段', 52, 'kg', null, 'excluded')],
            [
              pdFlow('P01-F09', 'semi', '成品筷（散）', 100, '双', null, 'excluded'),
              pdFlow('P01-F10', 'byproduct', '竹屑', 5, 'kg', FM.recycle),
            ]),
          /* 包装工序挂入「加工阶段」工艺：同一生命周期阶段只允许绑定一个工艺流程（2026-09-29） */
          productOp('P01-OP5', 'GX-04', '包装', 4,
            [
              pdFlow('P01-F11', 'semi', '成品筷（散）', 100, '双', null, 'excluded'),
              pdFlow('P01-F12', 'material', '纸包装材料', 2.5, 'kg', FM.mass),
            ],
            [pdFlow('P01-F13', 'product', '盒装竹筷', 1, '盒', null, 'excluded')]),
        ],
      },
    ],
  },
]

/* ===================== 前台 · 核算项目 ===================== */

/**
 * 【已废弃】项目工序副本种子：
 * 方案 A（2026-10-09）已把核算引擎对齐 UI「阶段数据项 + 过程节点」模型，
 * **不再走「产品工艺 → 工序 → 投入产出项」这条路径**；相关 mock API 保留兼容但不再被引擎引用。
 */
export const pcfOperationSeed: PcfOperationConfig[] = []

/** 【已废弃】工序填报行种子（见上，引擎已改用阶段数据项） */
export const pcfActivitySeed: PcfActivityData[] = []

/* ============ 福临「1 双碳化筷」核算记录（供应商 LCA 清单 + 产品碳足迹基本信息） ============ */
/**
 * 数据来源：
 * - 表 1：福建邵武福临日用品制造有限公司「1 双碳化筷单元过程」输入清单
 *   （2025/01/01—2025/12/31，基准流 1 双，产品重量 12.1 g，合计单位 g/双）；
 * - 表 2：产品碳足迹基本信息（组织 / 产品 / 目标与范围 / 标准 / 分配与截止原则）。
 *
 * 口径说明：
 * - 活动数据、因子单位一律按表格原单位（g / kg·km / t·km / kWh / kg）与原值录入，
 *   **不预先把 g 换算成 kg**；核算引擎按计量单位库换算系数把因子分子 gCO₂e / kgCO₂e 归一到结果口径；
 * - 表中材料 / 包材 / 陆运 / 抵扣因子为 g 口径（gCO₂e/g、gCO₂e/kg·km、gCO₂e/t·km），
 *   电 / 柴油 / 柴油燃烧为 kg 口径（kgCO₂e/kWh、kgCO₂e/kg）；
 *   因此「0.53 t·km × 0.161 gCO₂e/t·km = 0.0853 g」按原值成立，无需再折算活动数据；
 * - 结果按表格实际单位 gCO₂e/双 输出（12.6962），不再换算成 kg，也不再派生 kgCO₂e/kg 换算口径；
 * - 评价指标仅考虑 IPCC 2021、不考虑生物碳，四分量全部归为「总量 / 化石」；
 * - 因子引用自建的「福临因子库」(MFL02) 内的 MF-003 ~ MF-011。
 */
const FULIN_PROJECT_ID = 'PJ03'

interface FulinRow {
  no: string
  stageId: string
  stageName: string
  name: string
  itemType: PcfDataItemType
  direction: PcfDataItemDirection
  /** 表格原值（每 1 双的活动数据，不预先换算单位） */
  quantity: number
  /** 表格原单位（g / kg·km / t·km / kWh / kg） */
  unit: string
  /** 因子分子单位（gCO₂e / kgCO₂e） */
  numeratorUnit: string
  activityText: string
  factorId: string
  factorName: string
  factorValue: number
  /** 原表合计（g/双，抵扣项为负） */
  emissionG: number
  factorSource: string
}

/** 背景数据来源文案：原表来源列 + 福临因子库因子编码 */
const fulinSource = (factorName: string, code: string, note = ''): string =>
  `Ecoinvent 3.11 cut-off 数据库：${factorName} · 福临因子库 ${code}${note ? ` · ${note}` : ''}`

const FULIN_ROWS: FulinRow[] = [
  {
    no: '01', stageId: 'FL-A1', stageName: 'A1 原材料获取',
    name: '竹丝条', itemType: 'material', direction: 'input',
    quantity: 14.4, unit: 'g', numeratorUnit: 'gCO₂e', activityText: '14.40 g',
    factorId: 'MYF03', factorName: '竹丝条（碳化毛竹）', factorValue: 0.544,
    emissionG: 7.8396, factorSource: fulinSource('竹丝条（碳化毛竹）', 'MF-003', '碳化/175cm/毛竹/3年以上'),
  },
  {
    no: '02', stageId: 'FL-A1', stageName: 'A1 原材料获取',
    name: '牛皮纸', itemType: 'material', direction: 'input',
    quantity: 1.6, unit: 'g', numeratorUnit: 'gCO₂e', activityText: '1.60 g',
    factorId: 'MYF04', factorName: '牛皮纸', factorValue: 0.788,
    emissionG: 1.2602, factorSource: fulinSource('牛皮纸', 'MF-004', '基于市场，因子含运输'),
  },
  {
    no: '03', stageId: 'FL-A1', stageName: 'A1 原材料获取',
    name: '瓦楞纸箱', itemType: 'material', direction: 'input',
    quantity: 0.36, unit: 'g', numeratorUnit: 'gCO₂e', activityText: '0.36 g',
    factorId: 'MYF05', factorName: '瓦楞纸箱', factorValue: 1.319,
    emissionG: 0.4736, factorSource: fulinSource('瓦楞纸箱', 'MF-005', '基于市场，因子含运输'),
  },
  {
    no: '04', stageId: 'FL-A2', stageName: 'A2 原材料运输',
    name: '陆运（原材料运输）', itemType: 'material', direction: 'input',
    quantity: 3.95, unit: 'kg·km', numeratorUnit: 'gCO₂e', activityText: '3.95 kg·km',
    factorId: 'MYF06', factorName: '陆运（原材料运输）', factorValue: 0.161,
    emissionG: 0.636, factorSource: fulinSource('陆运（原材料运输）', 'MF-006', '调研供应商实际 274 km'),
  },
  {
    no: '05', stageId: 'FL-A3', stageName: 'A3 产品生产',
    name: '电力（华中电网）', itemType: 'energy', direction: 'input',
    quantity: 4.28e-3, unit: 'kWh', numeratorUnit: 'kgCO₂e', activityText: '4.28E-03 kWh',
    factorId: 'MYF07', factorName: '电力（华中电网）', factorValue: 0.854,
    emissionG: 3.6522, factorSource: fulinSource('电力（华中电网）', 'MF-007', '华中电网 0.5366 kgCO₂e/kWh'),
  },
  {
    no: '06', stageId: 'FL-A3', stageName: 'A3 产品生产',
    name: '柴油（上游）', itemType: 'energy', direction: 'input',
    quantity: 3.32e-7, unit: 'kg', numeratorUnit: 'kgCO₂e', activityText: '3.32E-07 kg',
    factorId: 'MYF08', factorName: '柴油（上游）', factorValue: 0.861,
    emissionG: 0.0003, factorSource: fulinSource('柴油（上游）', 'MF-008'),
  },
  {
    no: '07', stageId: 'FL-A3', stageName: 'A3 产品生产',
    name: '柴油燃烧', itemType: 'energy', direction: 'input',
    quantity: 3.32e-7, unit: 'kg', numeratorUnit: 'kgCO₂e', activityText: '3.32E-07 kg',
    factorId: 'MYF09', factorName: '柴油燃烧', factorValue: 3.503,
    emissionG: 0.0012, factorSource: 'IPCC 计算：柴油燃烧 · 福临因子库 MF-009',
  },
  {
    no: '08', stageId: 'FL-A3', stageName: 'A3 产品生产',
    name: '抵扣材料（竹丝条）', itemType: 'byproduct', direction: 'output',
    quantity: 2.3, unit: 'g', numeratorUnit: 'gCO₂e', activityText: '2.30 g',
    factorId: 'MYF10', factorName: '抵扣材料（竹丝条）', factorValue: -0.544,
    emissionG: -1.2522, factorSource: '福临因子库 MF-010（按对应主材因子负值抵扣，用于木粉）',
  },
  {
    no: '09', stageId: 'FL-A3', stageName: 'A3 产品生产',
    name: '陆运（废弃物运输）', itemType: 'material', direction: 'input',
    quantity: 0.53, unit: 't·km', numeratorUnit: 'gCO₂e', activityText: '0.53 t·km',
    factorId: 'MYF11', factorName: '陆运（废弃物运输）', factorValue: 0.161,
    emissionG: 0.0853, factorSource: fulinSource('陆运（废弃物运输）', 'MF-011'),
  },
]

/** 阶段数据项 → 结果明细的流类型（对齐核算引擎 toFlowType） */
const fulinFlowType = (type: PcfDataItemType): FlowItemType =>
  (type === 'natural' ? 'resource' : type === 'intermediate' ? 'semi' : type) as FlowItemType

/** 步骤② 阶段数据项：数量 / 单位均为表格原值，核算时由单位库换算系数归一 */
const fulinStageData: PcfStageDataItem[] = FULIN_ROWS.map((row) => ({
  id: `PJ03-SD-${row.no}`,
  projectId: FULIN_PROJECT_ID,
  stageId: row.stageId,
  stageName: row.stageName,
  nodeId: null,
  direction: row.direction,
  name: row.name,
  itemType: row.itemType,
  emissionType: null,
  quantity: row.quantity,
  unit: row.unit,
  factorId: row.factorId,
  factorName: row.factorName,
  factorValue: row.factorValue,
  factorUnit: `${row.numeratorUnit}/${row.unit}`,
}))

/** 清单合计（gCO₂e/双）：Σ 原表合计 = 12.6962 gCO₂e/双（结果单位即 gCO₂e，不再换算成 kg） */
const fulinTotal = Math.round(FULIN_ROWS.reduce((sum, row) => sum + row.emissionG, 0) * 1e7) / 1e7
/** 占比（%，保留 4 位小数） */
const fulinRatio = (value: number): number => Math.round((value / fulinTotal) * 1e6) / 1e4

/** 步骤④ 结果明细：排放量取原表合计（gCO₂e/双），四分量不考虑生物碳 */
const fulinDetails: PcfCalcResult['details'] = FULIN_ROWS.map((row) => {
  const emission = row.emissionG
  return {
    id: `PJ03-SD-${row.no}`,
    operationId: `PJ03-SD-${row.no}`,
    processName: row.stageName,
    opName: row.name,
    stage: row.stageName,
    stagePath: row.stageName,
    flowName: row.name,
    flowType: fulinFlowType(row.itemType),
    direction: row.direction,
    activityText: row.activityText,
    factorName: row.factorName,
    factorValue: row.factorValue,
    factorUnit: `${row.numeratorUnit}/${row.unit}`,
    factorCaliberValues: { total: row.factorValue, fossil: row.factorValue, biogenic: 0, luluc: 0 },
    factorSource: row.factorSource,
    formulaName: '默认口径（活动数据 × 排放因子）',
    emission,
    fossilEmission: emission,
    biogenicEmission: 0,
    lulucEmission: 0,
    emissionBreakdown: { total: emission, fossil: emission, biogenic: 0, luluc: 0 },
  }
})

/** 阶段汇总：按 A1 / A2 / A3 三个阶段归集 */
const fulinStageSummary: PcfCalcResult['stageSummary'] = [...new Set(FULIN_ROWS.map((row) => row.stageName))].map((stage) => {
  const emission =
    Math.round(FULIN_ROWS.filter((row) => row.stageName === stage).reduce((sum, row) => sum + row.emissionG, 0) * 1e7) / 1e7
  return { stage, emission, ratio: fulinRatio(emission) }
})

/** 数据项汇总（按排放量降序） */
const fulinOperationSummary: PcfCalcResult['operationSummary'] = fulinDetails
  .map((detail) => ({
    operationId: detail.operationId,
    processName: detail.processName,
    opName: detail.opName,
    stage: detail.stage,
    stagePath: detail.stagePath,
    emission: detail.emission,
    ratio: fulinRatio(detail.emission),
  }))
  .sort((a, b) => b.emission - a.emission)

/* ===================== PJ04｜摇篮到坟墓 · GWP 四口径（核算已完成） ===================== */

/**
 * 多口径演示核算记录：系统边界 `grave`，覆盖采伐 / 加工 / 运输 / 使用 / 废弃与循环 5 个阶段，
 * 因子带 GWP 四分量快照（总量 = 化石 + 土地利用；含生物碳 = 化石 + 生物源 + 土地利用），
 * 结果页可切换「总量 / 生物源 / 土地利用 / 化石」四套清册口径，状态为「已完成」。
 * 结果单位 kgCO₂e/双，并派生 kgCO₂e/kg 换算口径（83.3 双 = 1 kg）。
 */
const MULTI_PROJECT_ID = 'PJ04'
const MULTI_CONVERSION_FACTOR = 83.3

interface MultiCaliberRow {
  no: string
  stageId: string
  stageName: string
  name: string
  itemType: PcfDataItemType
  direction: PcfDataItemDirection
  /** 排放物类别（仅排放物数据项） */
  emissionType?: PcfEmissionType
  quantity: number
  unit: string
  factorId: string
  factorName: string
  factorValue: number
  /** 因子四分量口径快照；null = 单值因子（全部计入化石源） */
  calibers: FactorCalibers | null
}

const MULTI_ROWS: MultiCaliberRow[] = [
  { no: '01', stageId: 'LS01', stageName: '采伐阶段', name: '毛竹原竹（含生物碳）', itemType: 'material', direction: 'input', quantity: 0.062, unit: 'kg', factorId: 'FAC03', factorName: '毛竹原材料排放因子', factorValue: 0.18, calibers: { gwpTotal: 0.18, gwpFossil: 0.12, gwpBiogenic: 0.06, gwpLuluc: 0 } },
  { no: '02', stageId: 'LS01', stageName: '采伐阶段', name: '竹林经营土地利用变化', itemType: 'material', direction: 'input', quantity: 0.062, unit: 'kg', factorId: 'FAC09', factorName: '竹林经营土地利用变化排放因子', factorValue: 0.05, calibers: { gwpTotal: 0.05, gwpFossil: 0.01, gwpBiogenic: 0, gwpLuluc: 0.04 } },
  { no: '03', stageId: 'LS01', stageName: '采伐阶段', name: '原竹厂外运输', itemType: 'material', direction: 'input', quantity: 0.004, unit: 't·km', factorId: 'FAC04', factorName: '公路货运排放因子', factorValue: 0.036, calibers: null },
  { no: '04', stageId: 'LS02', stageName: '加工阶段', name: '电力', itemType: 'energy', direction: 'input', quantity: 0.042, unit: 'kWh', factorId: 'FAC01', factorName: '电力排放因子', factorValue: 0.581, calibers: null },
  { no: '05', stageId: 'LS02', stageName: '加工阶段', name: '纸包装材料', itemType: 'material', direction: 'input', quantity: 0.0025, unit: 'kg', factorId: 'FAC06', factorName: '纸包装材料排放因子', factorValue: 0.91, calibers: null },
  { no: '06', stageId: 'LS03', stageName: '运输阶段', name: '成品运输', itemType: 'material', direction: 'input', quantity: 0.0036, unit: 't·km', factorId: 'FAC04', factorName: '公路货运排放因子', factorValue: 0.036, calibers: null },
  { no: '07', stageId: 'LS04', stageName: '使用阶段', name: '使用阶段清洗能耗', itemType: 'energy', direction: 'input', quantity: 0.005, unit: 'kWh', factorId: 'FAC01', factorName: '电力排放因子', factorValue: 0.581, calibers: null },
  { no: '08', stageId: 'LS05', stageName: '废弃与循环', name: '废弃竹筷收集运输', itemType: 'material', direction: 'input', quantity: 0.00036, unit: 't·km', factorId: 'FAC04', factorName: '公路货运排放因子', factorValue: 0.036, calibers: null },
  { no: '09', stageId: 'LS05', stageName: '废弃与循环', name: '废弃竹筷生物源释放', itemType: 'emission', direction: 'output', quantity: 0.0072, unit: 'kg', factorId: 'FAC10', factorName: '废弃竹制品生物源释放排放因子', factorValue: 0.12, emissionType: 'wasteGas', calibers: { gwpTotal: 0.12, gwpFossil: 0.02, gwpBiogenic: 0.1, gwpLuluc: 0 } },
  { no: '10', stageId: 'LS05', stageName: '废弃与循环', name: '废弃竹筷卫生填埋', itemType: 'material', direction: 'input', quantity: 0.0048, unit: 'kg', factorId: 'FAC08', factorName: '废弃竹制品卫生填埋排放因子', factorValue: 0.09, calibers: null },
]

/** 明细行保留 6 位、结果级保留 4 位，与核算引擎 roundDetail / roundCalc 对齐 */
const multiDetailRound = (value: number): number => Math.round(value * 1e6) / 1e6
const multiResultRound = (value: number): number => Math.round(value * 1e4) / 1e4

/** 单行四分量：与 runPcfCalc 同口径（总量不含生物源 CO₂；单值因子全部计化石源） */
const multiSplitOf = (row: MultiCaliberRow) => {
  const fossilFactor = row.calibers?.gwpFossil ?? row.factorValue
  const biogenicFactor = row.calibers?.gwpBiogenic ?? 0
  const lulucFactor = row.calibers?.gwpLuluc ?? 0
  const totalFactor = fossilFactor + lulucFactor
  return {
    factorCaliberValues: {
      total: multiDetailRound(totalFactor),
      fossil: multiDetailRound(fossilFactor),
      biogenic: multiDetailRound(biogenicFactor),
      luluc: multiDetailRound(lulucFactor),
    },
    emission: multiDetailRound(row.quantity * row.factorValue),
    emissionBreakdown: {
      total: multiDetailRound(row.quantity * totalFactor),
      fossil: multiDetailRound(row.quantity * fossilFactor),
      biogenic: multiDetailRound(row.quantity * biogenicFactor),
      luluc: multiDetailRound(row.quantity * lulucFactor),
    },
  }
}

/** 步骤② 阶段数据项：数量 / 单位与因子分母单位一致，因子四分量随引用快照带入 */
const multiStageData: PcfStageDataItem[] = MULTI_ROWS.map((row) => ({
  id: `PJ04-SD-${row.no}`,
  projectId: MULTI_PROJECT_ID,
  stageId: row.stageId,
  stageName: row.stageName,
  nodeId: null,
  direction: row.direction,
  name: row.name,
  itemType: row.itemType,
  emissionType: row.emissionType ?? null,
  quantity: row.quantity,
  unit: row.unit,
  factorId: row.factorId,
  factorName: row.factorName,
  factorValue: row.factorValue,
  factorUnit: `kgCO₂e/${row.unit}`,
  factorCalibers: row.calibers,
}))

/** 步骤④ 结果明细：逐行四分量完整，供口径切换 / 清册按指标导出 */
const multiDetails: PcfCalcResult['details'] = MULTI_ROWS.map((row) => {
  const id = `PJ04-SD-${row.no}`
  const split = multiSplitOf(row)
  return {
    id,
    operationId: id,
    processName: row.stageName,
    opName: row.name,
    stage: row.stageName,
    stagePath: row.stageName,
    flowName: row.name,
    flowType: fulinFlowType(row.itemType),
    direction: row.direction,
    activityText: `${row.quantity} ${row.unit}`,
    factorName: row.factorName,
    factorValue: row.factorValue,
    factorUnit: `kgCO₂e/${row.unit}`,
    factorCaliberValues: split.factorCaliberValues,
    factorSource: `中国官方排放因子库 V1.0 数据库：${row.factorName}`,
    formulaName: '默认口径（活动数据 × 排放因子）',
    emission: split.emission,
    fossilEmission: split.emissionBreakdown.fossil,
    biogenicEmission: split.emissionBreakdown.biogenic,
    lulucEmission: split.emissionBreakdown.luluc,
    emissionBreakdown: split.emissionBreakdown,
  }
})

const multiRawTotal = multiDetails.reduce((sum, detail) => sum + detail.emission, 0)
const multiTotalEmission = multiResultRound(multiRawTotal)
const multiRatio = (value: number): number => multiResultRound((value / multiRawTotal) * 100)

/** 四分量结果合计（总量 / 化石 / 生物源 / 土地利用） */
const multiCaliberEmission = multiDetails.reduce(
  (acc, detail) => {
    const split = detail.emissionBreakdown!
    return {
      total: acc.total + split.total,
      fossil: acc.fossil + split.fossil,
      biogenic: acc.biogenic + split.biogenic,
      luluc: acc.luluc + split.luluc,
    }
  },
  { total: 0, fossil: 0, biogenic: 0, luluc: 0 },
)

const multiStageSummary: PcfCalcResult['stageSummary'] = [...new Set(MULTI_ROWS.map((row) => row.stageName))].map(
  (stage) => {
    const emission = multiDetails
      .filter((detail) => detail.stage === stage)
      .reduce((sum, detail) => sum + detail.emission, 0)
    return { stage, emission: multiResultRound(emission), ratio: multiRatio(emission) }
  },
)

const multiOperationSummary: PcfCalcResult['operationSummary'] = multiDetails
  .map((detail) => ({
    operationId: detail.operationId,
    processName: detail.processName,
    opName: detail.opName,
    stage: detail.stage,
    stagePath: detail.stagePath,
    emission: detail.emission,
    ratio: multiRatio(detail.emission),
  }))
  .sort((a, b) => b.emission - a.emission)

/**
 * 演示项目的**阶段数据项**（步骤②「产品建模」真实录入口径，已匹配因子，可直接检测 / 核算）。
 *
 * **清单口径：数量** —— 即「每 1 个声明单位（项目『单位』）的消耗 / 产出量」，
 * 而非核算期累计量。因清单本身即单位产品口径，单位产品碳足迹 = 清单合计，**无需再除以产量**。
 *
 * 物理口径（240mm 全竹碳化筷，1 双 ≈ 12 g 成品净重）：
 * - 原竹 → 成品出材率约 19%，故每双需原竹 0.062 kg，边角料以竹屑（副产品）产出 0.038 kg；
 * - 原竹公路运输 65 km：0.062 kg × 65 km ≈ 0.004 t·km；
 * - 生产综合电耗 0.042 kWh/双；纸包装材料 0.0025 kg/双。
 *
 * 手算（排放 = 数量 × 因子值）：
 * - **PJ01 摇篮到大门**：0.004×0.036 = 0.000144；0.062×0.18 = 0.01116；0.042×0.581 = 0.024402；
 *   0.0025×0.91 = 0.002275 → 合计 **0.037981 kgCO₂e / 双**
 * - **PJ02 摇篮到坟墓**：在 PJ01 基础上加
 *   成品运输 0.0036×0.036 = 0.0001296；使用阶段 0×0.581 = 0；
 *   废弃收集运输 0.00036×0.036 = 0.00001296；焚烧 0.0072×0.06 = 0.000432；填埋 0.0048×0.09 = 0.000432
 *   → 合计 **0.03898756 kgCO₂e / 双**
 */
export const pcfStageDataSeed: PcfStageDataItem[] = [
  /* ---------- PJ04｜摇篮到坟墓 · GWP 四口径（10 项，因子带四分量快照） ---------- */
  ...multiStageData,
  /* ---------- PJ03｜福临 1 双碳化筷（供应商清单 9 项） ---------- */
  ...fulinStageData,
  /* ---------- PJ01｜240mm 全竹碳化筷 · 摇篮到大门 ---------- */
  { id: 'PJ01-SD-01', projectId: 'PJ01', stageId: 'LS01', stageName: '采伐阶段', nodeId: null, direction: 'input', name: '毛竹原竹（厂外运输）', itemType: 'material', emissionType: null, quantity: 0.004, unit: 't·km', factorId: 'FAC04', factorName: '公路货运排放因子', factorValue: 0.036 },
  { id: 'PJ01-SD-02', projectId: 'PJ01', stageId: 'LS01', stageName: '采伐阶段', nodeId: null, direction: 'input', name: '毛竹原竹', itemType: 'material', emissionType: null, quantity: 0.062, unit: 'kg', factorId: 'FAC03', factorName: '毛竹原材料排放因子', factorValue: 0.18, factorCalibers: { gwpTotal: 0.18, gwpFossil: 0.12, gwpBiogenic: 0.06, gwpLuluc: 0 } },
  { id: 'PJ01-SD-03', projectId: 'PJ01', stageId: 'LS02', stageName: '加工阶段', nodeId: null, direction: 'input', name: '电力', itemType: 'energy', emissionType: null, quantity: 0.042, unit: 'kWh', factorId: 'FAC01', factorName: '电力排放因子', factorValue: 0.581 },
  { id: 'PJ01-SD-04', projectId: 'PJ01', stageId: 'LS02', stageName: '加工阶段', nodeId: null, direction: 'input', name: '纸包装材料', itemType: 'material', emissionType: null, quantity: 0.0025, unit: 'kg', factorId: 'FAC06', factorName: '纸包装材料排放因子', factorValue: 0.91 },
  { id: 'PJ01-SD-05', projectId: 'PJ01', stageId: 'LS02', stageName: '加工阶段', nodeId: null, direction: 'output', name: '竹屑', itemType: 'byproduct', emissionType: null, quantity: 0.038, unit: 'kg', factorId: null, factorName: '', factorValue: null },

  /* ---------- PJ02｜240mm 全竹碳化筷 · 摇篮到坟墓 ---------- */
  { id: 'PJ02-SD-01', projectId: 'PJ02', stageId: 'LS01', stageName: '采伐阶段', nodeId: null, direction: 'input', name: '毛竹原竹（厂外运输）', itemType: 'material', emissionType: null, quantity: 0.004, unit: 't·km', factorId: 'FAC04', factorName: '公路货运排放因子', factorValue: 0.036 },
  { id: 'PJ02-SD-02', projectId: 'PJ02', stageId: 'LS01', stageName: '采伐阶段', nodeId: null, direction: 'input', name: '毛竹原竹', itemType: 'material', emissionType: null, quantity: 0.062, unit: 'kg', factorId: 'FAC03', factorName: '毛竹原材料排放因子', factorValue: 0.18, factorCalibers: { gwpTotal: 0.18, gwpFossil: 0.12, gwpBiogenic: 0.06, gwpLuluc: 0 } },
  { id: 'PJ02-SD-03', projectId: 'PJ02', stageId: 'LS02', stageName: '加工阶段', nodeId: null, direction: 'input', name: '电力', itemType: 'energy', emissionType: null, quantity: 0.042, unit: 'kWh', factorId: 'FAC01', factorName: '电力排放因子', factorValue: 0.581 },
  { id: 'PJ02-SD-04', projectId: 'PJ02', stageId: 'LS02', stageName: '加工阶段', nodeId: null, direction: 'input', name: '纸包装材料', itemType: 'material', emissionType: null, quantity: 0.0025, unit: 'kg', factorId: 'FAC06', factorName: '纸包装材料排放因子', factorValue: 0.91 },
  { id: 'PJ02-SD-05', projectId: 'PJ02', stageId: 'LS02', stageName: '加工阶段', nodeId: null, direction: 'output', name: '竹屑', itemType: 'byproduct', emissionType: null, quantity: 0.038, unit: 'kg', factorId: null, factorName: '', factorValue: null },
  { id: 'PJ02-SD-06', projectId: 'PJ02', stageId: 'LS03', stageName: '运输阶段', nodeId: null, direction: 'input', name: '成品运输', itemType: 'material', emissionType: null, quantity: 0.0036, unit: 't·km', factorId: 'FAC04', factorName: '公路货运排放因子', factorValue: 0.036 },
  { id: 'PJ02-SD-07', projectId: 'PJ02', stageId: 'LS04', stageName: '使用阶段', nodeId: null, direction: 'input', name: '使用阶段能耗', itemType: 'energy', emissionType: null, quantity: 0, unit: 'kWh', factorId: 'FAC01', factorName: '电力排放因子', factorValue: 0.581 },
  { id: 'PJ02-SD-08', projectId: 'PJ02', stageId: 'LS05', stageName: '废弃与循环', nodeId: null, direction: 'input', name: '废弃竹筷收集运输', itemType: 'material', emissionType: null, quantity: 0.00036, unit: 't·km', factorId: 'FAC04', factorName: '公路货运排放因子', factorValue: 0.036 },
  { id: 'PJ02-SD-09', projectId: 'PJ02', stageId: 'LS05', stageName: '废弃与循环', nodeId: null, direction: 'input', name: '废弃竹筷焚烧处理（60%）', itemType: 'material', emissionType: null, quantity: 0.0072, unit: 'kg', factorId: 'FAC07', factorName: '废弃竹制品焚烧处理排放因子', factorValue: 0.06 },
  { id: 'PJ02-SD-10', projectId: 'PJ02', stageId: 'LS05', stageName: '废弃与循环', nodeId: null, direction: 'input', name: '废弃竹筷卫生填埋（40%）', itemType: 'material', emissionType: null, quantity: 0.0048, unit: 'kg', factorId: 'FAC08', factorName: '废弃竹制品卫生填埋排放因子', factorValue: 0.09 },
]

/**
 * 核算结果（**演示种子**，与《PCF核算全链路走查报告》口径一致，等于「开始核算」真实产出值）：
 * - PJ01 摇篮到大门：清单合计 0.037981 kgCO₂e / 双（加工阶段 0.026677 + 采伐阶段 0.011304）；
 * - PJ02 摇篮到坟墓：清单合计 0.03898756 kgCO₂e / 双
 *   （加工阶段 0.026677 + 采伐阶段 0.011304 + 废弃与循环 0.00087696 + 运输阶段 0.0001296 + 使用阶段 0）。
 * - PJ03 福临 1 双碳化筷：供应商清单合计 12.6962 gCO₂e/双
 *   （A1 9.5734 + A2 0.636 + A3 2.4868），结果单位 gCO₂e，含 9 条结果明细；
 * - PJ04 摇篮到坟墓 · 多口径：10 条明细覆盖 5 个阶段，四分量（总量 / 化石 / 生物源 / 土地利用）均非零。
 * 注：PJ01 仍保留「待核算」态用于演示步骤④「开始核算」流程（重算时版本号递增、不覆盖本种子）；
 * PJ02 / PJ03 / PJ04 置「已完成」，工作台「碳排放总览 / 碳足迹概览」取最近一次已完成结果。
 */
export const pcfCalcResultSeed: PcfCalcResult[] = [
  {
    projectId: 'PJ01',
    version: 1,
    calculatedAt: '2026-09-18 16:30',
    totalEmission: 0.037981,
    fossilEmission: 0.037981,
    biogenicEmission: 0,
    lulucEmission: 0,
    caliberEmission: { total: 0.037981, fossil: 0.037981, biogenic: 0, luluc: 0 },
    unit: '双',
    unitEmission: 0.037981,
    unitEmissionBreakdown: [
      { unit: '双', value: 0.037981 },
      { unit: 'kg', value: 3.1639 },
    ],
    stageSummary: [
      { stage: '加工阶段', emission: 0.026677, ratio: 70.2 },
      { stage: '采伐阶段', emission: 0.011304, ratio: 29.8 },
    ],
    operationSummary: [],
    details: [],
  },
  {
    projectId: 'PJ02',
    version: 1,
    calculatedAt: '2026-09-19 10:20',
    totalEmission: 0.03898756,
    fossilEmission: 0.03898756,
    biogenicEmission: 0,
    lulucEmission: 0,
    caliberEmission: { total: 0.03898756, fossil: 0.03898756, biogenic: 0, luluc: 0 },
    unit: '双',
    unitEmission: 0.03898756,
    unitEmissionBreakdown: [
      { unit: '双', value: 0.03898756 },
      { unit: 'kg', value: 3.2476 },
    ],
    stageSummary: [
      { stage: '加工阶段', emission: 0.026677, ratio: 68.4 },
      { stage: '采伐阶段', emission: 0.011304, ratio: 29.0 },
      { stage: '废弃与循环', emission: 0.00087696, ratio: 2.2 },
      { stage: '运输阶段', emission: 0.0001296, ratio: 0.3 },
      { stage: '使用阶段', emission: 0, ratio: 0 },
    ],
    operationSummary: [],
    details: [],
  },
  /* ---------- PJ03｜福临 1 双碳化筷（供应商清单合计 12.6962 gCO₂e/双） ---------- */
  {
    projectId: FULIN_PROJECT_ID,
    version: 1,
    calculatedAt: '2026-11-05 10:00',
    /** 结果按表格实际单位 gCO₂e/双 输出（12.6962），不换算成 kg */
    emissionUnit: 'gCO₂e',
    totalEmission: fulinTotal,
    fossilEmission: fulinTotal,
    biogenicEmission: 0,
    lulucEmission: 0,
    caliberEmission: { total: fulinTotal, fossil: fulinTotal, biogenic: 0, luluc: 0 },
    unit: '双',
    unitEmission: fulinTotal,
    /** 按表格口径只输出「双」，不再派生 kgCO₂e/kg 换算口径 */
    unitEmissionBreakdown: [{ unit: '双', value: fulinTotal }],
    stageSummary: fulinStageSummary,
    operationSummary: fulinOperationSummary,
    details: fulinDetails,
  },
  /* ---------- PJ04｜摇篮到坟墓 · GWP 四口径（核算已完成） ---------- */
  {
    projectId: MULTI_PROJECT_ID,
    version: 1,
    calculatedAt: '2026-11-09 15:42',
    emissionUnit: 'kgCO₂e',
    totalEmission: multiTotalEmission,
    fossilEmission: multiResultRound(multiCaliberEmission.fossil),
    biogenicEmission: multiResultRound(multiCaliberEmission.biogenic),
    lulucEmission: multiResultRound(multiCaliberEmission.luluc),
    /** 四分量各自非零：结果页可切换四套口径并分别下载清册 */
    caliberEmission: {
      total: multiResultRound(multiCaliberEmission.total),
      fossil: multiResultRound(multiCaliberEmission.fossil),
      biogenic: multiResultRound(multiCaliberEmission.biogenic),
      luluc: multiResultRound(multiCaliberEmission.luluc),
    },
    unit: '双',
    unitEmission: multiTotalEmission,
    /** 声明单位口径 + 由单位转换系数派生的 kgCO₂e/kg 口径 */
    unitEmissionBreakdown: [
      { unit: '双', value: multiTotalEmission },
      { unit: 'kg', value: multiResultRound(multiRawTotal * MULTI_CONVERSION_FACTOR) },
    ],
    stageSummary: multiStageSummary,
    operationSummary: multiOperationSummary,
    details: multiDetails,
  },
]

/** 演示工序（报告编制中示例）：本期无 */
export const pcfDemoOperationSeed: PcfOperationConfig[] = []

/**
 * 演示核算项目（**PJ01 / PJ02 为同一产品的两个核算边界，PJ03 为福临供应商清单记录，
 * PJ04 为摇篮到坟墓 GWP 四口径已完成记录**）：
 *
 * | 项目 | 边界 | 覆盖阶段 | 清单合计（数量口径） |
 * | :--- | :--- | :--- | :--- |
 * | **PJ01** | 摇篮到大门（`gate`） | 采伐阶段、加工阶段 | 0.037981 kgCO₂e / 双 |
 * | **PJ02** | 摇篮到坟墓（`grave`） | 采伐阶段、加工阶段、运输阶段、使用阶段、废弃与循环 | 0.03898756 kgCO₂e / 双 |
 * | **PJ03** | 摇篮到坟墓（`grave`，清单仅到 A3） | A1 原材料获取、A2 原材料运输、A3 产品生产 | 12.6962 gCO₂e / 双 |
 * | **PJ04** | 摇篮到坟墓（`grave`，多口径） | 采伐阶段、加工阶段、运输阶段、使用阶段、废弃与循环 | 0.04542456 kgCO₂e / 双（四分量均非零） |
 *
 * 四条记录均：步骤① 目标与范围已配置（**PJ02 / PJ04 已完成并含生物碳核算数据**，见 `biocarbon`）、
 * 步骤② 阶段数据项已按「数量」真实填报、步骤③ 检测已通过；
 * PJ01 保留「待核算」态用于演示「开始核算」流程，PJ02 / PJ03 / PJ04 置「已完成」并带核算结果
 * （V0.8 起报告环节已移除，核算结果为最后一个节点）。
 */
export const pcfProjectSeed: PcfProject[] = [
  {
    id: 'PJ01',
    code: 'PCF-20260901-001',
    name: '240mm 全竹碳化筷 · 摇篮到大门',
    ownerOrg: '福建竹业集团 · 工厂A1',
    tenantId: 'T001',
    deptId: '',
    ownerId: 'A003',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    productSource: 'library',
    refProductId: 'P01',
    productCode: 'P-2026-001',
    productName: '240mm 全竹碳化筷',
    productModel: 'ZKM-240',
    productSpec: '240mm·100 双/盒',
    productCategory: '竹制餐具',
    productIndustry: '竹制品制造',
    productVersion: 'V1.0',
    functionalUnit: '双',
    functionalUnitValue: 1,
    /** 单位转换系数（换算口径）：1 双成品净重 ≈ 0.012 kg → 83.3 双 = 1 kg，另出 kgCO₂e/kg */
    conversionFactor: 83.3,
    conversionUnit: '双',
    convertedUnit: 'kg',
    boundary: 'gate',
    currentStep: 4,
    status: 'toCalc',
    remark: '摇篮到大门：仅覆盖采伐阶段与加工阶段，不含下游阶段。',
    method: 'GB/T 24067-2024',
    methodId: 'STD-001',
    /** 引用的核算规则：允许共生产品分配（分摊法）→ 步骤②展示「分配计算」 */
    calcRuleNo: 'RULE-20261027001',
    lifecycleStages: [
      { id: 'LS01', name: '采伐阶段', level: 1, parentName: '', custom: false, included: true },
      { id: 'LS02', name: '加工阶段', level: 1, parentName: '', custom: false, included: true },
    ],
    createdBy: '当前用户',
    createdAt: '2026-09-01 09:00',
    updatedAt: '2026-09-18 16:30',
  },
  {
    id: 'PJ02',
    code: 'PCF-20260901-002',
    name: '240mm 全竹碳化筷 · 摇篮到坟墓',
    ownerOrg: '福建竹业集团 · 工厂A1',
    tenantId: 'T001',
    deptId: '',
    ownerId: 'A003',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    productSource: 'library',
    refProductId: 'P01',
    productCode: 'P-2026-001',
    productName: '240mm 全竹碳化筷',
    productModel: 'ZKM-240',
    productSpec: '240mm·100 双/盒',
    productCategory: '竹制餐具',
    productIndustry: '竹制品制造',
    productVersion: 'V1.0',
    functionalUnit: '双',
    functionalUnitValue: 1,
    /** 单位转换系数（换算口径）：1 双成品净重 ≈ 0.012 kg → 83.3 双 = 1 kg，另出 kgCO₂e/kg */
    conversionFactor: 83.3,
    conversionUnit: '双',
    convertedUnit: 'kg',
    boundary: 'grave',
    currentStep: 4,
    status: 'done',
    remark: '覆盖下游阶段：运输阶段、使用阶段、废弃与循环（焚烧 60% + 卫生填埋 40%）。',
    method: 'GB/T 24067-2024',
    methodId: 'STD-001',
    /** 引用的核算规则：允许共生产品分配（分摊法）→ 步骤②展示「分配计算」 */
    calcRuleNo: 'RULE-20261027001',
    /**
     * 生物碳核算（步骤①「碳固存计算」已算并随项目落库，2026-11-02 重新生成）：
     * 参数取每双竹木净重 M=0.012 kg（与转换系数 83.3 双/kg 一致）、cf=0.47、ω=12%、
     * 设计寿命 1 年、焚烧比例 60%（与备注「焚烧 60% + 卫生填埋 40%」一致）；
     * CS = 44/12 × 0.47 × 0.012 × 100/112 ≈ 0.01846429，释放 = CS×60%，净储量 = CS×40%。
     */
    biocarbon: {
      mass: 0.012,
      carbonRate: 0.47,
      moisture: 12,
      life: 1,
      incinerationRatio: 60,
      sequestration: 0.01846429,
      annualSequestration: 0.01846429,
      release: 0.01107857,
      netStorage: 0.00738571,
    },
    lifecycleStages: [
      { id: 'LS01', name: '采伐阶段', level: 1, parentName: '', custom: false, included: true },
      { id: 'LS02', name: '加工阶段', level: 1, parentName: '', custom: false, included: true },
      { id: 'LS03', name: '运输阶段', level: 1, parentName: '', custom: false, included: true },
      { id: 'LS04', name: '使用阶段', level: 1, parentName: '', custom: false, included: true },
      { id: 'LS05', name: '废弃与循环', level: 1, parentName: '', custom: false, included: true },
    ],
    createdBy: '当前用户',
    createdAt: '2026-09-02 09:00',
    updatedAt: '2026-09-19 10:20',
  },
  /* ---------- PJ03｜福临 1 双碳化筷（供应商清单 + 产品碳足迹基本信息） ---------- */
  {
    id: FULIN_PROJECT_ID,
    code: 'PCF-20261105-001',
    name: '240 mm 全竹筷子碳化系列（福临）· 摇篮到坟墓',
    ownerOrg: '福建邵武福临日用品制造有限公司',
    tenantId: 'T001',
    deptId: '',
    ownerId: 'A003',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    productSource: 'custom',
    refProductId: null,
    productCode: 'P-FL-240',
    productName: '240 mm 全竹筷子碳化系列',
    productSpec: '7*7*240mm，雅致牛皮纸款',
    productCategory: '竹制餐具',
    productIndustry: '竹制品制造',
    productVersion: 'V1.0',
    /** 声明单位：1 双 240 mm 全竹碳化筷（基准流 1 双，净重 12.1 g）；按表格 g/双 口径，不做 kg 换算 */
    functionalUnit: '双',
    functionalUnitValue: 1,
    /** 结果分子单位：按表格实际单位 gCO₂e（列表「碳排放量」列直接显示 12.6962 gCO₂e） */
    emissionUnit: 'gCO₂e',
    netWeight: 12.1,
    netWeightUnit: 'g',
    boundary: 'grave',
    currentStep: 4,
    status: 'done',
    remark:
      '生产地址：福建省邵武市张三丰大道373-11号。含水率12%、含碳率0.5 kgC/kg；流程：来料-多段锯-摇篮-分选-削尖-磨光-精选-雕刻-单双包-尾包；背景数据 Ecoinvent 3.11；分配：原材料按质量、生产按加工费；评价指标 IPCC 2021 且不考虑生物碳。按表格单位计算（g/双），不做 kg 换算；边界 grave，清单仅覆盖 A1/A2/A3。',
    method: 'ISO 14067:2018',
    methodId: 'STD-003',
    /** 表 2「CUT-OFF 原则：截止值设定为 1% 质量」 */
    cutOffRule: '截止值设定为 1% 质量',
    /** 自定义一级阶段，与供应商清单 A1 / A2 / A3 一一对应 */
    lifecycleStages: [
      { id: 'FL-A1', name: 'A1 原材料获取', level: 1, parentName: '', custom: true, included: true },
      { id: 'FL-A2', name: 'A2 原材料运输', level: 1, parentName: '', custom: true, included: true },
      { id: 'FL-A3', name: 'A3 产品生产', level: 1, parentName: '', custom: true, included: true },
    ],
    createdBy: '当前用户',
    createdAt: '2026-11-05 09:00',
    updatedAt: '2026-11-05 10:00',
  },
  /* ---------- PJ04｜摇篮到坟墓 · GWP 四口径（核算已完成） ---------- */
  {
    id: MULTI_PROJECT_ID,
    code: 'PCF-20261106-001',
    name: '240mm 全竹碳化筷 · 摇篮到坟墓（多口径）',
    ownerOrg: '福建竹业集团 · 工厂A1',
    tenantId: 'T001',
    deptId: '',
    ownerId: 'A003',
    /** 统计时间：与 PJ01 / PJ02 的 2026 年度区分，演示同一产品不同统计时间的核算记录 */
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    productSource: 'library',
    refProductId: 'P01',
    productCode: 'P-2026-001',
    productName: '240mm 全竹碳化筷',
    productModel: 'ZKM-240',
    productSpec: '240mm·100 双/盒',
    productCategory: '竹制餐具',
    productIndustry: '竹制品制造',
    productVersion: 'V1.0',
    functionalUnit: '双',
    functionalUnitValue: 1,
    conversionFactor: MULTI_CONVERSION_FACTOR,
    conversionUnit: '双',
    convertedUnit: 'kg',
    emissionUnit: 'kgCO₂e',
    boundary: 'grave',
    currentStep: 4,
    status: 'done',
    remark:
      '摇篮到坟墓全覆盖（采伐 / 加工 / 运输 / 使用 / 废弃与循环）；因子带 GWP 四分量，结果可切换总量（不含生物源 CO₂）、生物源、土地利用、化石四套口径并分别导出清册。',
    method: 'ISO 14067:2018',
    methodId: 'STD-003',
    biocarbon: {
      mass: 0.012,
      carbonRate: 0.47,
      moisture: 12,
      life: 1,
      incinerationRatio: 60,
      sequestration: 0.01846429,
      annualSequestration: 0.01846429,
      release: 0.01107857,
      netStorage: 0.00738571,
    },
    lifecycleStages: [
      { id: 'LS01', name: '采伐阶段', level: 1, parentName: '', custom: false, included: true },
      { id: 'LS02', name: '加工阶段', level: 1, parentName: '', custom: false, included: true },
      { id: 'LS03', name: '运输阶段', level: 1, parentName: '', custom: false, included: true },
      { id: 'LS04', name: '使用阶段', level: 1, parentName: '', custom: false, included: true },
      { id: 'LS05', name: '废弃与循环', level: 1, parentName: '', custom: false, included: true },
    ],
    createdBy: '李文博',
    createdAt: '2026-11-06 09:15',
    updatedAt: '2026-11-09 15:42',
  },
]

/* ===================== 系统字典（无维护入口，保留最小集） ===================== */

/**
 * 核算主体组织（系统字典：组织架构模块交付前的最小可用集，暂无新增入口）。
 * 说明：该字典无创建 API，清空后前台无法新建核算项目 / 保存步骤①，故保留最小集。
 */
export const pcfOrgOptionSeed: PcfOrgOption[] = [
  { id: 'ORG-01', name: '空天碳示范组织' },
  { id: 'ORG-02', name: '福建竹业集团 · 工厂A1' },
]

/** 产品选项（动态派生自后台产品信息库 `productStore`；仅「上架」产品可选） */
export const pcfProductOptionSeed: PcfProductOption[] = []

/**
 * 净重单位候选（重量类单位字典，暂无维护入口）。
 * 说明：同组织字典，无创建 API，清空后步骤①「净重单位」无选项，故保留最小集。
 */
export const pcfWeightUnitOptions: string[] = ['g', 'kg', 't']

/* ===================== 文件管理（基础库 A1-3，P05；由「标准文件库」升级） ===================== */

/**
 * 文件管理种子（文件类型 = 标准 / 单据 / 其他）：
 * - 标准记录沿用原标准文件库（一个标准号 = 一条记录，唯一键 = 标准号）；
 * - 原「附件」统一改造为「版本」（每次上传 = 一个版本，versionNo=1 即首版）；
 * - 新增单据 / 其他样本（含多版本示例 DOC-001），用于演示类型差异与版本管理。
 */
export const standardSeed: FileDocItem[] = [
  {
    id: 'STD-001',
    fileType: 'standard',
    fileCode: 'FILE-2026-0001',
    code: 'GB/T 24067-2024',
    nameZh: '温室气体 产品碳足迹 量化要求和指南',
    nameEn: 'Greenhouse gases — Carbon footprint of products — Requirements and guidelines for quantification',
    fileName: '温室气体 产品碳足迹 量化要求和指南',
    status: '现行',
    publishDate: '2024-08-23',
    implementDate: '2024-12-01',
    publisher: '国家市场监督管理总局、国家标准化管理委员会',
    sourceUrl: 'https://openstd.samr.gov.cn/bzgk/gb/newGbInfo?hcno=GB-T-24067-2024',
    competentDept: '国家标准化管理委员会',
    responsibleDept: '全国环境管理标准化技术委员会（SAC/TC 207）',
    versions: [
      { id: 'VER-001-1', versionNo: 1, fileName: 'GB/T 24067-2024 标准文本（内部查阅）.pdf', size: 4210688, uploadedAt: '2026-09-18 14:20', uploadedBy: '平台运营', isCurrent: true },
    ],
    currentVersionNo: 1,
    createdBy: '平台运营',
    createdAt: '2026-09-18 14:20',
    updatedBy: '平台运营',
    updatedAt: '2026-09-18 14:20',
  },
  {
    id: 'STD-002',
    fileType: 'standard',
    fileCode: 'FILE-2026-0002',
    code: 'GB/T 24067-2018',
    nameZh: '温室气体 产品碳足迹 量化要求和指南',
    nameEn: 'Greenhouse gases — Carbon footprint of products — Requirements and guidelines for quantification',
    fileName: '温室气体 产品碳足迹 量化要求和指南',
    status: '被替代',
    publishDate: '2018-05-14',
    implementDate: '2018-07-01',
    publisher: '国家市场监督管理总局、国家标准化管理委员会',
    sourceUrl: 'https://openstd.samr.gov.cn/bzgk/gb/newGbInfo?hcno=GB-T-24067-2018',
    competentDept: '国家标准化管理委员会',
    responsibleDept: '全国环境管理标准化技术委员会（SAC/TC 207）',
    versions: [],
    currentVersionNo: 0,
    createdBy: '平台运营',
    createdAt: '2026-09-18 14:10',
    updatedBy: '平台运营',
    updatedAt: '2026-09-18 14:10',
  },
  {
    id: 'STD-003',
    fileType: 'standard',
    fileCode: 'FILE-2026-0003',
    code: 'ISO 14067:2018',
    nameZh: '温室气体—产品碳足迹—量化要求和准则',
    nameEn: 'Greenhouse gases — Carbon footprint of products — Requirements and guidelines for quantification',
    fileName: '温室气体—产品碳足迹—量化要求和准则',
    status: '现行',
    publishDate: '2018-08-01',
    implementDate: '2018-08-01',
    publisher: '国际标准化组织（ISO）',
    sourceUrl: 'https://www.iso.org/standard/71206.html',
    competentDept: '国际标准化组织（ISO）',
    responsibleDept: 'ISO/TC 207/SC 7',
    versions: [],
    currentVersionNo: 0,
    createdBy: '平台运营',
    createdAt: '2026-09-18 14:25',
    updatedBy: '平台运营',
    updatedAt: '2026-09-18 14:25',
  },
  {
    id: 'STD-004',
    fileType: 'standard',
    fileCode: 'FILE-2026-0004',
    code: 'PAS 2050:2011',
    nameZh: '产品与服务生命周期温室气体排放评估规范',
    nameEn: 'Specification for the assessment of the life cycle greenhouse gas emissions of goods and services',
    fileName: '产品与服务生命周期温室气体排放评估规范',
    status: '现行',
    publishDate: '2011-10-01',
    implementDate: '2011-10-01',
    publisher: '英国标准协会（BSI）',
    sourceUrl: 'https://www.bsigroup.com/en-GB/pas-2050/',
    competentDept: '英国标准协会（BSI）',
    responsibleDept: '',
    versions: [],
    currentVersionNo: 0,
    createdBy: '平台运营',
    createdAt: '2026-09-18 14:30',
    updatedBy: '平台运营',
    updatedAt: '2026-09-18 14:30',
  },
  {
    id: 'STD-005',
    fileType: 'standard',
    fileCode: 'FILE-2026-0005',
    code: 'GB/T 2589-2008',
    nameZh: '综合能耗计算通则',
    nameEn: 'General principles for calculation of the comprehensive energy consumption',
    fileName: '综合能耗计算通则',
    status: '被替代',
    publishDate: '2008-02-01',
    implementDate: '2008-06-01',
    publisher: '国家质量监督检验检疫总局、国家标准化管理委员会',
    sourceUrl: 'https://openstd.samr.gov.cn/bzgk/gb/newGbInfo?hcno=GB-T-2589-2008',
    competentDept: '国家标准化管理委员会',
    responsibleDept: '全国能源基础与管理标准化技术委员会',
    versions: [],
    currentVersionNo: 0,
    createdBy: '平台运营',
    createdAt: '2026-09-18 14:35',
    updatedBy: '平台运营',
    updatedAt: '2026-09-18 14:35',
  },
  {
    id: 'STD-006',
    fileType: 'standard',
    fileCode: 'FILE-2026-0006',
    code: 'GB/T 2589-2020',
    nameZh: '综合能耗计算通则',
    nameEn: 'General principles for calculation of the comprehensive energy consumption',
    fileName: '综合能耗计算通则',
    status: '现行',
    publishDate: '2020-05-18',
    implementDate: '2020-10-01',
    publisher: '国家市场监督管理总局、国家标准化管理委员会',
    sourceUrl: 'https://openstd.samr.gov.cn/bzgk/gb/newGbInfo?hcno=GB-T-2589-2020',
    competentDept: '国家标准化管理委员会',
    responsibleDept: '全国能源基础与管理标准化技术委员会',
    versions: [],
    currentVersionNo: 0,
    createdBy: '平台运营',
    createdAt: '2026-09-18 14:40',
    updatedBy: '平台运营',
    updatedAt: '2026-09-18 14:40',
  },
  {
    id: 'STD-007',
    fileType: 'standard',
    fileCode: 'FILE-2026-0007',
    code: 'YB/T 4966-2021',
    nameZh: '钢铁产品碳足迹核算技术规范',
    nameEn: '',
    fileName: '钢铁产品碳足迹核算技术规范',
    status: '现行',
    publishDate: '2021-08-20',
    implementDate: '2021-11-01',
    publisher: '工业和信息化部',
    sourceUrl: '',
    competentDept: '工业和信息化部',
    responsibleDept: '全国钢标准化技术委员会（SAC/TC 183）',
    versions: [
      { id: 'VER-007-1', versionNo: 1, fileName: 'YB/T 4966-2021 标准文本（内部查阅）.pdf', size: 2150000, uploadedAt: '2026-09-18 14:45', uploadedBy: '平台运营', isCurrent: true },
    ],
    currentVersionNo: 1,
    createdBy: '平台运营',
    createdAt: '2026-09-18 14:45',
    updatedBy: '平台运营',
    updatedAt: '2026-09-18 14:45',
  },
  {
    id: 'STD-008',
    fileType: 'standard',
    fileCode: 'FILE-2026-0008',
    code: 'DB35/T 2089-2022',
    nameZh: '竹制品碳足迹核算通则',
    nameEn: '',
    fileName: '竹制品碳足迹核算通则',
    status: '现行',
    publishDate: '2022-03-01',
    implementDate: '2022-05-01',
    publisher: '福建省市场监督管理局',
    sourceUrl: 'https://scjgj.fujian.gov.cn/zwgk/zfxxgkzl/dfbz/',
    competentDept: '福建省市场监督管理局',
    responsibleDept: '福建省林业标准化技术委员会',
    versions: [],
    currentVersionNo: 0,
    createdBy: '平台运营',
    createdAt: '2026-09-18 14:50',
    updatedBy: '平台运营',
    updatedAt: '2026-09-18 14:50',
  },
  {
    id: 'STD-009',
    fileType: 'standard',
    fileCode: 'FILE-2026-0009',
    code: 'T/CAEPI 58-2023',
    nameZh: '产品碳足迹核算与报告通则',
    nameEn: '',
    fileName: '产品碳足迹核算与报告通则',
    status: '现行',
    publishDate: '2023-01-10',
    implementDate: '2023-03-01',
    publisher: '中华环保联合会',
    sourceUrl: 'http://www.ttbz.org.cn/',
    competentDept: '中华环保联合会',
    responsibleDept: '中华环保联合会标准化工作委员会',
    versions: [],
    currentVersionNo: 0,
    createdBy: '平台运营',
    createdAt: '2026-09-18 14:55',
    updatedBy: '平台运营',
    updatedAt: '2026-09-18 14:55',
  },
  {
    id: 'STD-010',
    fileType: 'standard',
    fileCode: 'FILE-2026-0010',
    code: 'Q/FJZY 001-2026',
    nameZh: '竹制品产品碳足迹核算企业规范',
    nameEn: '',
    fileName: '竹制品产品碳足迹核算企业规范',
    status: '现行',
    publishDate: '2025-12-15',
    implementDate: '2026-01-01',
    publisher: '福建竹业集团',
    sourceUrl: '',
    competentDept: '福建竹业集团',
    responsibleDept: '福建竹业集团技术中心',
    versions: [
      { id: 'VER-010-1', versionNo: 1, fileName: 'Q/FJZY 001-2026 企业规范（内部查阅）.pdf', size: 980000, uploadedAt: '2026-09-19 09:30', uploadedBy: '当前用户', isCurrent: true },
    ],
    currentVersionNo: 1,
    createdBy: '当前用户',
    createdAt: '2026-09-19 09:30',
    updatedBy: '当前用户',
    updatedAt: '2026-09-19 09:30',
  },
  {
    id: 'STD-011',
    fileType: 'standard',
    fileCode: 'FILE-2026-0011',
    code: 'Q/SKH 002-2023',
    nameZh: '碳化筷客户指定核算技术规范',
    nameEn: '',
    fileName: '碳化筷客户指定核算技术规范',
    status: '作废',
    publishDate: '2023-05-01',
    implementDate: '2023-06-01',
    publisher: '福建竹业集团',
    sourceUrl: '',
    competentDept: '福建竹业集团',
    responsibleDept: '',
    versions: [
      { id: 'VER-011-1', versionNo: 1, fileName: 'Q/SKH 002-2023 客户指定口径（内部查阅）.pdf', size: 760000, uploadedAt: '2026-09-19 09:35', uploadedBy: '当前用户', isCurrent: true },
    ],
    currentVersionNo: 1,
    createdBy: '当前用户',
    createdAt: '2026-09-19 09:35',
    updatedBy: '当前用户',
    updatedAt: '2026-09-19 09:35',
  },
  /* —— 单据样本（fileType = document）：演示类型差异与版本管理 —— */
  {
    id: 'DOC-001',
    fileType: 'document',
    fileCode: 'FILE-2026-1001',
    docNo: 'JC-2026-0088',
    docType: '检测报告',
    fileName: 'XX 竹制品含碳量检测报告',
    bizDate: '2026-10-25',
    issueOrg: 'XX 检测认证中心',
    versions: [
      { id: 'VER-D1-1', versionNo: 1, fileName: '含碳量检测报告_初稿.pdf', size: 1820000, uploadedAt: '2026-09-20 09:12', uploadedBy: '张三', isCurrent: false, changeNote: '首次上传' },
      { id: 'VER-D1-2', versionNo: 2, fileName: '含碳量检测报告_终版.pdf', size: 2100000, uploadedAt: '2026-10-27 14:20', uploadedBy: '张三', isCurrent: true, changeNote: '补充检测数据后定稿' },
    ],
    currentVersionNo: 2,
    createdBy: '张三',
    createdAt: '2026-09-20 09:12',
    updatedBy: '张三',
    updatedAt: '2026-10-27 14:20',
  },
  {
    id: 'DOC-002',
    fileType: 'document',
    fileCode: 'FILE-2026-1002',
    docNo: 'FP-2026-0031',
    docType: '发票',
    fileName: '竹原料采购发票',
    bizDate: '2026-10-20',
    issueOrg: 'XX 竹材供应商',
    versions: [
      { id: 'VER-D2-1', versionNo: 1, fileName: '采购发票_2026Q4.pdf', size: 320000, uploadedAt: '2026-10-20 11:05', uploadedBy: '李四', isCurrent: true },
    ],
    currentVersionNo: 1,
    createdBy: '李四',
    createdAt: '2026-10-20 11:05',
    updatedBy: '李四',
    updatedAt: '2026-10-20 11:05',
  },
  {
    id: 'DOC-003',
    fileType: 'document',
    fileCode: 'FILE-2026-1003',
    docNo: 'YD-2026-0102',
    docType: '单据',
    fileName: '原料运输磅单',
    bizDate: '2026-10-22',
    issueOrg: 'XX 物流公司',
    versions: [
      { id: 'VER-D3-1', versionNo: 1, fileName: '运输磅单_2026Q4.xlsx', size: 54000, uploadedAt: '2026-10-22 16:40', uploadedBy: '王五', isCurrent: true },
    ],
    currentVersionNo: 1,
    createdBy: '王五',
    createdAt: '2026-10-22 16:40',
    updatedBy: '王五',
    updatedAt: '2026-10-22 16:40',
  },
  /* —— 其他样本（fileType = other） —— */
  {
    id: 'OTH-001',
    fileType: 'other',
    fileCode: 'FILE-2026-2001',
    fileName: '竹木原料采购框架协议',
    fileDesc: '集团与基地的长期采购框架（非标准 / 非单据类文件示例）',
    versions: [
      { id: 'VER-O1-1', versionNo: 1, fileName: '采购框架协议.pdf', size: 1200000, uploadedAt: '2026-10-15 10:00', uploadedBy: '赵六', isCurrent: true },
    ],
    currentVersionNo: 1,
    createdBy: '赵六',
    createdAt: '2026-10-15 10:00',
    updatedBy: '赵六',
    updatedAt: '2026-10-15 10:00',
  },
]

/* ===================== 模型库（前后台 · 模型管理） ===================== */

/** 构造模型生命周期阶段（含勾选态；口径与 PCF 步骤① 一致） */
function modelStage(id: string, name: string, level: 1 | 2, parentName: string, included = true): PcfLifecycleStage {
  return { id, name, level, parentName, custom: false, included }
}

/** 构造模型数据项（= PcfStageDataItem 去掉 projectId） */
function modelItem(
  id: string,
  stageId: string,
  stageName: string,
  direction: PcfDataItemDirection,
  name: string,
  itemType: PcfDataItemType,
  quantity: number | null,
  unit: string,
  factor: {
    id: string | null
    name: string
    value: number | null
    calibers?: FactorCalibers | null
    /** 因子单位快照（如 `gCO₂e/g`；选用因子后回显） */
    unit?: string
  } = { id: null, name: '', value: null },
  extra: { emissionType?: PcfEmissionType | null; nodeId?: string | null } = {},
): ModelDataItem {
  return {
    id,
    stageId,
    stageName,
    nodeId: extra.nodeId ?? null,
    direction,
    name,
    itemType,
    emissionType: extra.emissionType ?? null,
    quantity,
    unit,
    factorId: factor.id,
    factorName: factor.name,
    factorValue: factor.value,
    factorUnit: factor.unit ?? '',
    factorCalibers: factor.calibers ?? null,
  }
}

/** 常用生命周期阶段（模型向导 / 详情复用）：竹木口径 5 个一级阶段 */
const MST = {
  mat: modelStage('LS01', '采伐阶段', 1, ''),
  prod: modelStage('LS02', '加工阶段', 1, ''),
  delivery: modelStage('LS03', '运输阶段', 1, ''),
  use: modelStage('LS04', '使用阶段', 1, ''),
  eol: modelStage('LS05', '废弃与循环', 1, ''),
}

/** 因子快照简写 */
const MF = {
  elec: { id: 'FAC01', name: '电力排放因子', value: 0.581 },
  bamboo: { id: 'FAC03', name: '毛竹原材料排放因子', value: 0.18, calibers: { gwpTotal: 0.18, gwpFossil: 0.12, gwpBiogenic: 0.06, gwpLuluc: 0 } },
  freight: { id: 'FAC04', name: '公路货运排放因子', value: 0.036 },
  paper: { id: 'FAC06', name: '纸包装材料排放因子', value: 0.91 },
  incin: { id: 'FAC07', name: '废弃竹制品焚烧处理排放因子', value: 0.06 },
  landfill: { id: 'FAC08', name: '废弃竹制品卫生填埋排放因子', value: 0.09 },
}

/** 后台 · 平台模型（覆盖 草稿 / 已发布 / 已停用 三态） */
export const modelSeed: CarbonModel[] = [
  {
    id: 'MDL-001',
    code: 'MDL-001',
    name: '全竹碳化筷 · 摇篮到大门核算模型',
    productName: '全竹碳化筷',
    productSpec: '240mm',
    productIndustry: '竹制品制造',
    functionalUnitValue: '1',
    functionalUnit: '双',
    scope: 'platform',
    status: 'published',
    categoryId: 'PC200903',
    industries: ['竹制品制造'],
    standardId: 'STD-001',
    standardName: 'GB/T 24067-2024',
    boundary: 'gate',
    lifecycleStages: [MST.mat, MST.prod],
    items: [
      modelItem('MDL-001-IT-01', 'LS01', '采伐阶段', 'input', '毛竹原竹（厂外运输）', 'material', 0.004, 't·km', MF.freight),
      modelItem('MDL-001-IT-02', 'LS01', '采伐阶段', 'input', '毛竹原竹', 'material', 0.062, 'kg', MF.bamboo),
      modelItem('MDL-001-IT-03', 'LS02', '加工阶段', 'input', '电力', 'energy', 0.042, 'kWh', MF.elec),
      modelItem('MDL-001-IT-04', 'LS02', '加工阶段', 'input', '纸包装材料', 'material', 0.0025, 'kg', MF.paper),
      modelItem('MDL-001-IT-05', 'LS02', '加工阶段', 'output', '竹屑', 'byproduct', 0.038, 'kg'),
    ],
    nodes: [],
    remark: '覆盖「采伐阶段 + 加工阶段」两阶段，适用于厂内自制竹制餐具的快速核算。',
    maintainer: '平台运营',
    createdBy: '当前用户',
    createdAt: '2026-09-20 10:00',
    updatedAt: '2026-09-26 15:20',
    version: 'V1.2',
    publishedAt: '2026-09-26 15:20',
  },
  {
    id: 'MDL-002',
    code: 'MDL-002',
    name: '竹制餐具 · 摇篮到坟墓核算模型',
    productName: '竹制餐具（筷子）',
    productSpec: '240mm',
    productIndustry: '竹制品制造',
    functionalUnitValue: '1',
    functionalUnit: '双',
    scope: 'platform',
    status: 'draft',
    categoryId: 'PC200903',
    industries: ['竹制品制造'],
    standardId: 'STD-001',
    standardName: 'GB/T 24067-2024',
    boundary: 'grave',
    lifecycleStages: [MST.mat, MST.prod, MST.delivery, MST.use, MST.eol],
    items: [
      modelItem('MDL-002-IT-01', 'LS01', '采伐阶段', 'input', '毛竹原竹（厂外运输）', 'material', 0.004, 't·km', MF.freight),
      modelItem('MDL-002-IT-02', 'LS01', '采伐阶段', 'input', '毛竹原竹', 'material', 0.062, 'kg', MF.bamboo),
      modelItem('MDL-002-IT-03', 'LS02', '加工阶段', 'input', '电力', 'energy', 0.042, 'kWh', MF.elec),
      modelItem('MDL-002-IT-04', 'LS02', '加工阶段', 'input', '纸包装材料', 'material', 0.0025, 'kg', MF.paper),
      modelItem('MDL-002-IT-05', 'LS02', '加工阶段', 'output', '竹屑', 'byproduct', 0.038, 'kg'),
      modelItem('MDL-002-IT-06', 'LS03', '运输阶段', 'input', '成品运输', 'material', 0.0036, 't·km', MF.freight),
      modelItem('MDL-002-IT-07', 'LS04', '使用阶段', 'input', '使用阶段能耗', 'energy', 0, 'kWh', MF.elec),
      modelItem('MDL-002-IT-08', 'LS05', '废弃与循环', 'input', '废弃竹筷收集运输', 'material', 0.00036, 't·km', MF.freight),
      modelItem('MDL-002-IT-09', 'LS05', '废弃与循环', 'input', '废弃竹筷焚烧处理（60%）', 'material', 0.0072, 'kg', MF.incin),
      modelItem('MDL-002-IT-10', 'LS05', '废弃与循环', 'input', '废弃竹筷卫生填埋（40%）', 'material', 0.0048, 'kg', MF.landfill),
    ],
    nodes: [],
    remark: '含下游「运输阶段 + 使用阶段 + 废弃与循环（焚烧 60% + 卫生填埋 40%）」，覆盖产品全生命周期。',
    maintainer: '平台运营',
    createdBy: '当前用户',
    createdAt: '2026-09-27 09:10',
    updatedAt: '2026-09-28 17:40',
    version: 'V1.0',
  },
  {
    id: 'MDL-003',
    code: 'MDL-003',
    name: '纸包装产品 · 大门到大门核算模型',
    productName: '瓦楞纸包装箱',
    productSpec: '400×300×200mm',
    productIndustry: '纸和纸板容器制造',
    functionalUnitValue: '1',
    functionalUnit: '件',
    scope: 'platform',
    status: 'disabled',
    categoryId: 'PC2205',
    industries: ['纸和纸板容器制造'],
    standardId: 'STD-009',
    standardName: 'T/CAEPI 58-2023',
    boundary: 'gate_to_gate',
    lifecycleStages: [MST.prod],
    items: [
      modelItem('MDL-003-IT-01', 'LS02', '加工阶段', 'input', '电力', 'energy', 0.055, 'kWh', MF.elec),
      modelItem('MDL-003-IT-02', 'LS02', '加工阶段', 'input', '瓦楞原纸', 'material', 0.06, 'kg', MF.paper),
      modelItem('MDL-003-IT-03', 'LS02', '加工阶段', 'output', '纸板边角料', 'byproduct', 0.004, 'kg'),
    ],
    nodes: [],
    remark: '仅覆盖生产阶段（大门到大门），适用于多工厂分工下的单环节核算。',
    maintainer: '平台运营',
    createdBy: '当前用户',
    createdAt: '2026-08-15 11:00',
    updatedAt: '2026-09-10 09:25',
    version: 'V1.0',
    publishedAt: '2026-09-01 10:00',
  },
  {
    id: 'MDL-004',
    code: 'MDL-004',
    name: '纸浆模塑餐具 · 摇篮到大门核算模型',
    productName: '纸浆模塑餐盒',
    productSpec: '750ml',
    productIndustry: '纸和纸板容器制造',
    functionalUnitValue: '1',
    functionalUnit: '个',
    scope: 'platform',
    status: 'published',
    categoryId: 'PC2205',
    industries: ['纸和纸板容器制造'],
    standardId: 'STD-009',
    standardName: 'T/CAEPI 58-2023',
    boundary: 'gate',
    lifecycleStages: [MST.mat, MST.prod],
    items: [
      modelItem('MDL-004-IT-01', 'LS01', '采伐阶段', 'input', '废纸板（厂外运输）', 'material', 0.006, 't·km', MF.freight),
      modelItem('MDL-004-IT-02', 'LS01', '采伐阶段', 'input', '废纸浆', 'material', 0.075, 'kg', MF.paper),
      modelItem('MDL-004-IT-03', 'LS02', '加工阶段', 'input', '电力', 'energy', 0.048, 'kWh', MF.elec),
      modelItem('MDL-004-IT-04', 'LS02', '加工阶段', 'input', '纸包装材料', 'material', 0.003, 'kg', MF.paper),
      modelItem('MDL-004-IT-05', 'LS02', '加工阶段', 'output', '纸浆边角料', 'byproduct', 0.005, 'kg'),
    ],
    nodes: [],
    remark: '以废纸浆模塑餐具为原型，覆盖采伐阶段 + 加工阶段两阶段，适用于纸浆模塑类一次性餐具。',
    maintainer: '平台运营',
    createdBy: '当前用户',
    createdAt: '2026-09-22 09:40',
    updatedAt: '2026-09-30 11:15',
    version: 'V1.0',
    publishedAt: '2026-09-30 11:15',
  },
  {
    id: 'MDL-005',
    code: 'MDL-005',
    name: '实木家具 · 摇篮到坟墓核算模型',
    productName: '实木餐桌椅套装',
    productSpec: '一桌四椅',
    productIndustry: '木质家具制造',
    functionalUnitValue: '1',
    functionalUnit: '套',
    scope: 'platform',
    status: 'published',
    categoryId: 'PC2101',
    industries: ['木质家具制造'],
    standardId: 'STD-001',
    standardName: 'GB/T 24067-2024',
    boundary: 'grave',
    lifecycleStages: [MST.mat, MST.prod, MST.delivery, MST.use, MST.eol],
    items: [
      modelItem('MDL-005-IT-01', 'LS01', '采伐阶段', 'input', '板材（厂外运输）', 'material', 0.012, 't·km', MF.freight),
      modelItem('MDL-005-IT-02', 'LS01', '采伐阶段', 'input', '实木板材', 'material', 0.85, 'kg', MF.bamboo),
      modelItem('MDL-005-IT-03', 'LS02', '加工阶段', 'input', '电力', 'energy', 0.36, 'kWh', MF.elec),
      modelItem('MDL-005-IT-04', 'LS02', '加工阶段', 'input', '五金配件', 'material', 0.05, 'kg', MF.paper),
      modelItem('MDL-005-IT-05', 'LS03', '运输阶段', 'input', '成品运输', 'material', 0.0036, 't·km', MF.freight),
      modelItem('MDL-005-IT-06', 'LS05', '废弃与循环', 'input', '废弃家具收集运输', 'material', 0.0004, 't·km', MF.freight),
      modelItem('MDL-005-IT-07', 'LS05', '废弃与循环', 'input', '废弃家具焚烧处理', 'material', 0.0072, 'kg', MF.incin),
    ],
    nodes: [],
    remark: '以实木桌椅为原型，含下游「运输阶段 + 废弃与循环」，覆盖产品全生命周期。',
    maintainer: '平台运营',
    createdBy: '当前用户',
    createdAt: '2026-09-18 14:20',
    updatedAt: '2026-09-29 16:50',
    version: 'V1.1',
    publishedAt: '2026-09-29 16:50',
  },
  {
    /**
     * 福临「240 mm 全竹筷子碳化系列」发布模型（依据供应商 LCA 清单 + 产品碳足迹基本信息）：
     * - 自定义三阶段与供应商清单 A1 / A2 / A3 一一对应；
     * - 数据项名称 / 单位 / 排放因子与「1 双碳化筷单元过程」清单一致，**数量留空**（核算时按项目填报）；
     * - 因子引用「福临因子库」(MFL02) 的 MF-003 ~ MF-011，背景数据为 Ecoinvent 3.11 cut-off，柴油燃烧按 IPCC 计算。
     */
    id: 'MDL-006',
    code: 'MDL-006',
    name: '240 mm 全竹碳化筷 · 摇篮到坟墓核算模型',
    productName: '240 mm 全竹筷子碳化系列',
    productSpec: '7*7*240mm，雅致牛皮纸款',
    productIndustry: '竹制品制造',
    functionalUnitValue: '1',
    functionalUnit: '双',
    productImageUrl: fulinKuaiziCover,
    scope: 'platform',
    status: 'published',
    categoryId: 'PC200903',
    industries: ['竹制品制造'],
    standardId: 'STD-003',
    standardName: 'ISO 14067:2018',
    cutOffRule: '截止值设定为 1% 质量',
    boundary: 'grave',
    lifecycleStages: [
      { id: 'FL-A1', name: 'A1 原材料获取', level: 1, parentName: '', custom: true, included: true },
      { id: 'FL-A2', name: 'A2 原材料运输', level: 1, parentName: '', custom: true, included: true },
      { id: 'FL-A3', name: 'A3 产品生产', level: 1, parentName: '', custom: true, included: true },
    ],
    items: [
      /* A1 原材料获取 */
      modelItem('MDL-006-IT-01', 'FL-A1', 'A1 原材料获取', 'input', '竹丝条', 'material', null, 'g', {
        id: 'MYF03', name: '竹丝条（碳化毛竹）', value: 0.544, unit: 'gCO₂e/g',
      }),
      modelItem('MDL-006-IT-02', 'FL-A1', 'A1 原材料获取', 'input', '牛皮纸', 'material', null, 'g', {
        id: 'MYF04', name: '牛皮纸', value: 0.788, unit: 'gCO₂e/g',
      }),
      modelItem('MDL-006-IT-03', 'FL-A1', 'A1 原材料获取', 'input', '瓦楞纸箱', 'material', null, 'g', {
        id: 'MYF05', name: '瓦楞纸箱', value: 1.319, unit: 'gCO₂e/g',
      }),
      /* A2 原材料运输 */
      modelItem('MDL-006-IT-04', 'FL-A2', 'A2 原材料运输', 'input', '陆运（原材料运输）', 'material', null, 'kg·km', {
        id: 'MYF06', name: '陆运（原材料运输）', value: 0.161, unit: 'gCO₂e/kg·km',
      }),
      /* A3 产品生产 */
      modelItem('MDL-006-IT-05', 'FL-A3', 'A3 产品生产', 'input', '电力（华中电网）', 'energy', null, 'kWh', {
        id: 'MYF07', name: '电力（华中电网）', value: 0.854, unit: 'kgCO₂e/kWh',
      }),
      modelItem('MDL-006-IT-06', 'FL-A3', 'A3 产品生产', 'input', '柴油（上游）', 'energy', null, 'kg', {
        id: 'MYF08', name: '柴油（上游）', value: 0.861, unit: 'kgCO₂e/kg',
      }),
      modelItem('MDL-006-IT-07', 'FL-A3', 'A3 产品生产', 'input', '柴油燃烧', 'energy', null, 'kg', {
        id: 'MYF09', name: '柴油燃烧', value: 3.503, unit: 'kgCO₂e/kg',
      }),
      modelItem('MDL-006-IT-08', 'FL-A3', 'A3 产品生产', 'output', '抵扣材料（竹丝条）', 'byproduct', null, 'g', {
        id: 'MYF10', name: '抵扣材料（竹丝条）', value: -0.544, unit: 'gCO₂e/g',
      }),
      modelItem('MDL-006-IT-09', 'FL-A3', 'A3 产品生产', 'input', '陆运（废弃物运输）', 'material', null, 't·km', {
        id: 'MYF11', name: '陆运（废弃物运输）', value: 0.161, unit: 'gCO₂e/t·km',
      }),
    ],
    nodes: [],
    remark:
      '福建邵武福临日用品制造有限公司 240 mm 全竹筷子碳化系列（1 双，净重 12.1 g，时段 2025-01-01—2025-12-31）：按 A1 原材料获取 / A2 原材料运输 / A3 产品生产三阶段沉淀数据结构，数量留待实际核算时按项目填报；分配原则为原材料按质量、生产按加工费；评价指标 IPCC 2021 且不考虑生物碳。',
    maintainer: '平台运营',
    createdBy: '当前用户',
    createdAt: '2026-11-05 09:00',
    updatedAt: '2026-11-05 10:00',
    version: 'V1.0',
    publishedAt: '2026-11-05 10:00',
  },
]

/** 前台 · 我的模型（manual 自己新增 + collected 收藏副本，各 1 条） */
export const myModelSeed: MyModel[] = [
  {
    id: 'MYM-001',
    code: 'MYM-001',
    name: '木质家具 · 摇篮到大门核算模型',
    productName: '实木餐桌',
    productSpec: '1400×800×750mm',
    productIndustry: '木质家具制造',
    functionalUnitValue: '1',
    functionalUnit: '件',
    scope: 'org',
    origin: 'manual',
    categoryId: 'PC2101',
    industries: ['木质家具制造'],
    standardId: 'STD-008',
    standardName: 'DB35/T 2089-2022',
    boundary: 'gate',
    lifecycleStages: [MST.mat, MST.prod],
    items: [
      modelItem('MYM-001-IT-01', 'LS01', '采伐阶段', 'input', '板材（厂外运输）', 'material', 0.012, 't·km', MF.freight),
      modelItem('MYM-001-IT-02', 'LS01', '采伐阶段', 'input', '实木板材', 'material', 0.85, 'kg', MF.bamboo),
      modelItem('MYM-001-IT-03', 'LS02', '加工阶段', 'input', '电力', 'energy', 0.36, 'kWh', MF.elec),
      modelItem('MYM-001-IT-04', 'LS02', '加工阶段', 'input', '五金配件', 'material', 0.05, 'kg', MF.paper),
      modelItem('MYM-001-IT-05', 'LS02', '加工阶段', 'output', '木屑废料', 'byproduct', 0.06, 'kg'),
    ],
    nodes: [],
    remark: '组织自建：以实木桌椅为原型，覆盖采伐阶段与加工阶段两阶段。',
    createdAt: '2026-09-18 09:30',
    updatedAt: '2026-09-25 14:05',
    version: 'V1.0',
  },
  {
    id: 'MYM-002',
    code: 'MYM-002',
    name: '全竹碳化筷 · 摇篮到大门核算模型（V1.1）',
    productName: '全竹碳化筷',
    productSpec: '240mm',
    productIndustry: '竹制品制造',
    functionalUnitValue: '1',
    functionalUnit: '双',
    scope: 'org',
    origin: 'collected',
    categoryId: 'PC200903',
    industries: ['竹制品制造'],
    standardId: 'STD-001',
    standardName: 'GB/T 24067-2024',
    boundary: 'gate',
    lifecycleStages: [MST.mat, MST.prod],
    items: [
      modelItem('MYM-002-IT-01', 'LS01', '采伐阶段', 'input', '毛竹原竹（厂外运输）', 'material', 0.004, 't·km', MF.freight),
      modelItem('MYM-002-IT-02', 'LS01', '采伐阶段', 'input', '毛竹原竹', 'material', 0.062, 'kg', MF.bamboo),
      modelItem('MYM-002-IT-03', 'LS02', '加工阶段', 'input', '电力', 'energy', 0.042, 'kWh', MF.elec),
      modelItem('MYM-002-IT-04', 'LS02', '加工阶段', 'input', '纸包装材料', 'material', 0.0025, 'kg', MF.paper),
      modelItem('MYM-002-IT-05', 'LS02', '加工阶段', 'output', '竹屑', 'byproduct', 0.038, 'kg'),
    ],
    nodes: [],
    remark: '复制自平台模型库（MDL-001 V1.1），复制式快照、独立可维护。',
    createdAt: '2026-09-27 10:30',
    updatedAt: '2026-09-27 10:30',
    version: 'V1.1',
    sourceModelId: 'MDL-001',
    sourceModelName: '全竹碳化筷 · 摇篮到大门核算模型',
  },
  {
    id: 'MYM-003',
    code: 'MYM-003',
    name: '竹制餐具 · 摇篮到坟墓核算模型',
    productName: '竹制餐具（筷子）',
    productSpec: '240mm',
    productIndustry: '竹制品制造',
    functionalUnitValue: '1',
    functionalUnit: '双',
    scope: 'org',
    origin: 'manual',
    categoryId: 'PC200903',
    industries: ['竹制品制造'],
    standardId: 'STD-008',
    standardName: 'DB35/T 2089-2022',
    boundary: 'grave',
    lifecycleStages: [MST.mat, MST.prod, MST.delivery, MST.use, MST.eol],
    items: [
      modelItem('MYM-003-IT-01', 'LS01', '采伐阶段', 'input', '毛竹原竹', 'material', 0.068, 'kg', MF.bamboo),
      modelItem('MYM-003-IT-02', 'LS01', '采伐阶段', 'input', '毛竹原竹（厂外运输）', 'material', 0.004, 't·km', MF.freight),
      modelItem('MYM-003-IT-03', 'LS02', '加工阶段', 'input', '电力', 'energy', 0.05, 'kWh', MF.elec),
      modelItem('MYM-003-IT-04', 'LS02', '加工阶段', 'input', '纸包装材料', 'material', 0.0028, 'kg', MF.paper),
      modelItem('MYM-003-IT-05', 'LS02', '加工阶段', 'output', '竹屑', 'byproduct', 0.041, 'kg'),
      modelItem('MYM-003-IT-06', 'LS03', '运输阶段', 'input', '成品运输', 'material', 0.0032, 't·km', MF.freight),
      modelItem('MYM-003-IT-07', 'LS05', '废弃与循环', 'input', '废弃竹筷焚烧处理', 'material', 0.0072, 'kg', MF.incin),
    ],
    nodes: [],
    remark: '组织自建：在福建地方标准口径下覆盖竹制餐具全生命周期（含运输阶段与废弃与循环）。',
    createdAt: '2026-09-19 10:10',
    updatedAt: '2026-09-28 15:40',
    version: 'V1.0',
  },
]

export const standardLibrarySeed: StandardItem[] = [
  {
    id: 'STD-001',
    code: 'GB/T 24067-2024',
    nameZh: '温室气体 产品碳足迹 量化要求和指南',
    nameEn: 'Greenhouse gases — Carbon footprint of products — Requirements and guidelines for quantification',
    status: '现行',
    category: '国家标准',
    publishDate: '2024-08-23',
    implementDate: '2024-12-01',
    publisher: '国家市场监督管理总局、国家标准化管理委员会',
    sourceUrl: 'https://openstd.samr.gov.cn/bzgk/gb/newGbInfo?hcno=GB-T-24067-2024',
    competentDept: '国家标准化管理委员会',
    responsibleDept: '全国环境管理标准化技术委员会（SAC/TC 207）',
    attachments: [
      { id: 'ATT-001', name: 'GB/T 24067-2024 标准文本（内部查阅）.pdf', size: 4210688, uploadedAt: '2026-09-18 14:20' },
    ],
    createdBy: '平台运营',
    createdAt: '2026-09-18 14:20',
    updatedBy: '平台运营',
    updatedAt: '2026-09-18 14:20',
  },
  {
    id: 'STD-002',
    code: 'GB/T 24067-2018',
    nameZh: '温室气体 产品碳足迹 量化要求和指南',
    nameEn: 'Greenhouse gases — Carbon footprint of products — Requirements and guidelines for quantification',
    status: '被替代',
    category: '国家标准',
    publishDate: '2018-05-14',
    implementDate: '2018-07-01',
    publisher: '国家市场监督管理总局、国家标准化管理委员会',
    sourceUrl: 'https://openstd.samr.gov.cn/bzgk/gb/newGbInfo?hcno=GB-T-24067-2018',
    competentDept: '国家标准化管理委员会',
    responsibleDept: '全国环境管理标准化技术委员会（SAC/TC 207）',
    attachments: [],
    createdBy: '平台运营',
    createdAt: '2026-09-18 14:10',
    updatedBy: '平台运营',
    updatedAt: '2026-09-18 14:10',
  },
  {
    id: 'STD-003',
    code: 'ISO 14067:2018',
    nameZh: '温室气体—产品碳足迹—量化要求和准则',
    nameEn: 'Greenhouse gases — Carbon footprint of products — Requirements and guidelines for quantification',
    status: '现行',
    category: '国际标准',
    publishDate: '2018-08-01',
    implementDate: '2018-08-01',
    publisher: '国际标准化组织（ISO）',
    sourceUrl: 'https://www.iso.org/standard/71206.html',
    competentDept: '国际标准化组织（ISO）',
    responsibleDept: 'ISO/TC 207/SC 7',
    attachments: [],
    createdBy: '平台运营',
    createdAt: '2026-09-18 14:25',
    updatedBy: '平台运营',
    updatedAt: '2026-09-18 14:25',
  },
  {
    id: 'STD-004',
    code: 'PAS 2050:2011',
    nameZh: '产品与服务生命周期温室气体排放评估规范',
    nameEn: 'Specification for the assessment of the life cycle greenhouse gas emissions of goods and services',
    status: '现行',
    category: '国际标准',
    publishDate: '2011-10-01',
    implementDate: '2011-10-01',
    publisher: '英国标准协会（BSI）',
    sourceUrl: 'https://www.bsigroup.com/en-GB/pas-2050/',
    competentDept: '英国标准协会（BSI）',
    responsibleDept: '',
    attachments: [],
    createdBy: '平台运营',
    createdAt: '2026-09-18 14:30',
    updatedBy: '平台运营',
    updatedAt: '2026-09-18 14:30',
  },
  {
    id: 'STD-005',
    code: 'GB/T 2589-2008',
    nameZh: '综合能耗计算通则',
    nameEn: 'General principles for calculation of the comprehensive energy consumption',
    status: '被替代',
    category: '国家标准',
    publishDate: '2008-02-01',
    implementDate: '2008-06-01',
    publisher: '国家质量监督检验检疫总局、国家标准化管理委员会',
    sourceUrl: 'https://openstd.samr.gov.cn/bzgk/gb/newGbInfo?hcno=GB-T-2589-2008',
    competentDept: '国家标准化管理委员会',
    responsibleDept: '全国能源基础与管理标准化技术委员会',
    attachments: [],
    createdBy: '平台运营',
    createdAt: '2026-09-18 14:35',
    updatedBy: '平台运营',
    updatedAt: '2026-09-18 14:35',
  },
  {
    id: 'STD-006',
    code: 'GB/T 2589-2020',
    nameZh: '综合能耗计算通则',
    nameEn: 'General principles for calculation of the comprehensive energy consumption',
    status: '现行',
    category: '国家标准',
    publishDate: '2020-05-18',
    implementDate: '2020-10-01',
    publisher: '国家市场监督管理总局、国家标准化管理委员会',
    sourceUrl: 'https://openstd.samr.gov.cn/bzgk/gb/newGbInfo?hcno=GB-T-2589-2020',
    competentDept: '国家标准化管理委员会',
    responsibleDept: '全国能源基础与管理标准化技术委员会',
    attachments: [],
    createdBy: '平台运营',
    createdAt: '2026-09-18 14:40',
    updatedBy: '平台运营',
    updatedAt: '2026-09-18 14:40',
  },
  {
    id: 'STD-007',
    code: 'YB/T 4966-2021',
    nameZh: '钢铁产品碳足迹核算技术规范',
    nameEn: '',
    status: '现行',
    category: '行业标准',
    publishDate: '2021-08-20',
    implementDate: '2021-11-01',
    publisher: '工业和信息化部',
    sourceUrl: '',
    competentDept: '工业和信息化部',
    responsibleDept: '全国钢标准化技术委员会（SAC/TC 183）',
    attachments: [
      { id: 'ATT-002', name: 'YB/T 4966-2021 标准文本（内部查阅）.pdf', size: 2150000, uploadedAt: '2026-09-18 14:45' },
    ],
    createdBy: '平台运营',
    createdAt: '2026-09-18 14:45',
    updatedBy: '平台运营',
    updatedAt: '2026-09-18 14:45',
  },
  {
    id: 'STD-008',
    code: 'DB35/T 2089-2022',
    nameZh: '竹制品碳足迹核算通则',
    nameEn: '',
    status: '现行',
    category: '行业标准',
    publishDate: '2022-03-01',
    implementDate: '2022-05-01',
    publisher: '福建省市场监督管理局',
    sourceUrl: 'https://scjgj.fujian.gov.cn/zwgk/zfxxgkzl/dfbz/',
    competentDept: '福建省市场监督管理局',
    responsibleDept: '福建省林业标准化技术委员会',
    attachments: [],
    createdBy: '平台运营',
    createdAt: '2026-09-18 14:50',
    updatedBy: '平台运营',
    updatedAt: '2026-09-18 14:50',
  },
  {
    id: 'STD-009',
    code: 'T/CAEPI 58-2023',
    nameZh: '产品碳足迹核算与报告通则',
    nameEn: '',
    status: '现行',
    category: '团体标准',
    publishDate: '2023-01-10',
    implementDate: '2023-03-01',
    publisher: '中华环保联合会',
    sourceUrl: 'http://www.ttbz.org.cn/',
    competentDept: '中华环保联合会',
    responsibleDept: '中华环保联合会标准化工作委员会',
    attachments: [],
    createdBy: '平台运营',
    createdAt: '2026-09-18 14:55',
    updatedBy: '平台运营',
    updatedAt: '2026-09-18 14:55',
  },
  {
    id: 'STD-010',
    code: 'Q/FJZY 001-2026',
    nameZh: '竹制品产品碳足迹核算企业规范',
    nameEn: '',
    status: '现行',
    category: '团体标准',
    publishDate: '2025-12-15',
    implementDate: '2026-01-01',
    publisher: '福建竹业集团',
    sourceUrl: '',
    competentDept: '福建竹业集团',
    responsibleDept: '福建竹业集团技术中心',
    attachments: [
      { id: 'ATT-003', name: 'Q/FJZY 001-2026 企业规范（内部查阅）.pdf', size: 980000, uploadedAt: '2026-09-19 09:30' },
    ],
    createdBy: '当前用户',
    createdAt: '2026-09-19 09:30',
    updatedBy: '当前用户',
    updatedAt: '2026-09-19 09:30',
  },
  {
    id: 'STD-011',
    code: 'Q/SKH 002-2023',
    nameZh: '碳化筷客户指定核算技术规范',
    nameEn: '',
    status: '作废',
    category: '团体标准',
    publishDate: '2023-05-01',
    implementDate: '2023-06-01',
    publisher: '福建竹业集团',
    sourceUrl: '',
    competentDept: '福建竹业集团',
    responsibleDept: '',
    attachments: [
      { id: 'ATT-004', name: 'Q/SKH 002-2023 客户指定口径（内部查阅）.pdf', size: 760000, uploadedAt: '2026-09-19 09:35' },
    ],
    createdBy: '当前用户',
    createdAt: '2026-09-19 09:35',
    updatedBy: '当前用户',
    updatedAt: '2026-09-19 09:35',
  },
];