/**
 * Mock 数据源（**演示数据集**：由《PCF核算全链路走查报告_2026-09-29》的模拟脚本
 * `__sim_pcf__.ts` 实际跑通的口径固化而来，刷新页面即可见）。
 *
 * 组成：
 * - 基础库：分类 / 行业 / 生命周期阶段 / 计量单位 / 物料 / 能源
 * - 核算配置：排放因子 / 计算公式
 * - 工艺库：工序 / 工艺流程 / 产品（含工艺工序组合）
 * - 前台核算：2 个「待核算」演示项目（同一产品、两个核算边界）：
 *   **PJ01 摇篮到大门**（原材料获取 + 生产）与 **PJ02 摇篮到坟墓**（+ 运输/交付 + 使用 + 生命末期）；
 *   步骤② 阶段数据项已按「数量」真实填报、步骤③ 检测已过，
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
  StandardItem,
  UnitItem,
  UnitReferenceItem,
} from '@/types'
import { DICT_TYPE_SYSTEM_BOUNDARY } from '@/types'
import { gbt4754LeafIndustryNames, industryGbt4754Seed } from './standards/industryGbt4754'

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
 * 生命周期阶段字典（5 个一级阶段 + 10 个二级阶段），系统边界归属按「数据字典 · 系统边界」字典项编码维护：
 * - 大门到大门（gate_to_gate）：仅厂内过程（生产）
 * - 摇篮到大门（gate）：原材料获取 + 生产
 * - 摇篮到坟墓（grave）：全阶段（含运输/交付、使用、生命末期）
 */
export const lifecycleSeed: LifecycleStageItem[] = [
  /* ---------- 一级阶段 ---------- */
  {
    id: 'LS01',
    code: 'LC-01',
    name: '原材料获取',
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
    name: '生产',
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
    name: '运输/交付',
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
    name: '使用',
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
    name: '生命末期',
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
  /* ---------- 二级阶段 ---------- */
  {
    id: 'LS06',
    code: 'LC-06',
    name: '原材料获取',
    level: 2,
    parentId: 'LS01',
    order: 10,
    description: '发生在产品加工之前的产品生产所需部件、原辅料、包装材料、能源等的开采与生产过程。',
    boundaries: ['gate', 'grave'],
    status: 'enabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: '2026-08-01 09:00',
  },
  {
    id: 'LS07',
    code: 'LC-07',
    name: '原材料运输',
    level: 2,
    parentId: 'LS01',
    order: 20,
    description: '发生在产品加工生产之前的产品生产所需部件、原辅料、包装材料、能源等的运输过程。',
    boundaries: ['gate', 'grave'],
    status: 'enabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: '2026-08-01 09:00',
  },
  {
    id: 'LS08',
    code: 'LC-08',
    name: '生产过程',
    level: 2,
    parentId: 'LS02',
    order: 10,
    description: '产品生产或组装、加工厂内部运输、生产设备的维护与物料消耗、产品的仓储、生产废弃物的运输及处理、消耗能源的生产等。',
    boundaries: ['gate_to_gate', 'gate', 'grave'],
    status: 'enabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: '2026-08-01 09:00',
  },
  {
    id: 'LS09',
    code: 'LC-09',
    name: '生产过程的废弃物处理',
    level: 2,
    parentId: 'LS02',
    order: 20,
    description: '产品生产或组装废弃的运输及处理、消耗能源的生产等。',
    boundaries: ['gate_to_gate', 'gate', 'grave'],
    status: 'enabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: '2026-08-01 09:00',
  },
  {
    id: 'LS10',
    code: 'LC-10',
    name: '运输/交付',
    level: 2,
    parentId: 'LS03',
    order: 10,
    description: '发生在生产商大门之后的产品运输过程。',
    boundaries: ['grave'],
    status: 'enabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: '2026-08-01 09:00',
  },
  {
    id: 'LS11',
    code: 'LC-11',
    name: '使用',
    level: 2,
    parentId: 'LS04',
    order: 10,
    description: '产品交付市场之后使用、维护、维修、翻新等过程消耗资源的生产过程、直接排放、废弃物处理等。',
    boundaries: ['grave'],
    status: 'enabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: '2026-08-01 09:00',
  },
  {
    id: 'LS12',
    code: 'LC-12',
    name: '生命末期产品的收集、包装和运输',
    level: 2,
    parentId: 'LS05',
    order: 10,
    description: '产品经消费者使用报废后进入废弃处理厂发生的收集、包装及运输等过程。',
    boundaries: ['grave'],
    status: 'enabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: '2026-08-01 09:00',
  },
  {
    id: 'LS13',
    code: 'LC-13',
    name: '生命末期产品的拆解、破碎和分选',
    level: 2,
    parentId: 'LS05',
    order: 20,
    description: '产品回收再利用部分的拆解、破碎、分选等过程。',
    boundaries: ['grave'],
    status: 'enabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: '2026-08-01 09:00',
  },
  {
    id: 'LS14',
    code: 'LC-14',
    name: '材料、有机物、能量回收',
    level: 2,
    parentId: 'LS05',
    order: 30,
    description: '产品经消费者使用报废后进入废弃处理厂发生的产品回收/再利用部分预处理及材料/有机物/能量等回收过程。',
    boundaries: ['grave'],
    status: 'enabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: '2026-08-01 09:00',
  },
  {
    id: 'LS15',
    code: 'LC-15',
    name: '焚烧和底渣分选，填埋和促进分解的排放',
    level: 2,
    parentId: 'LS05',
    order: 40,
    description: '产品报废后进入废弃处理厂发生的不可回收部分处理处置过程。',
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
    remark: 'Cradle-to-Grave：含使用与生命周期末期',
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
]

/** 单位引用情况（只读反查，仅作展示） */
export const unitReferenceSeed: Record<string, UnitReferenceItem[]> = {}

/**
 * 计量单位选项（**填报表单下拉字典**；数量类单位不由单位库维护，见走查报告 S-03）。
 * 注：`t·km`（运输周转量）为**复合单位**，不在计量单位库（库只维护单单位），
 * 与因子侧的复合分母单位（如 `kgCO₂e/kWh`）同属"库外口径"，故仅在此字典与因子分母中表达。
 */
export const unitOptions: string[] = [
  '双', '件', '个', '包', '套', '盒',
  'g', 'kg', 't', 'kWh', 'm', 'm²', 'm³', 'km', 't·km', 'kgCO₂e',
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
]

/** 能源库选项（Mock 引用「能源库」A1-2） */
export const energyOptions: EnergyOption[] = [
  { code: 'E-001', name: '电力', unit: 'kWh', status: 'enabled' },
  { code: 'E-002', name: '天然气', unit: 'm³', status: 'enabled' },
]

/* ===================== 物料库 ===================== */

export const materialSeed: MaterialItem[] = [
  {
    id: 'M01', code: 'M-001', name: '毛竹原竹', flowType: 'material', subCategory: 'raw',
    industries: ['竹制品制造'], status: 'enabled', description: '碳化筷主要原料',
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'M02', code: 'M-002', name: '竹板材', flowType: 'material', subCategory: 'raw',
    industries: ['竹制品制造'], status: 'enabled', description: '冲压成型用板材',
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'M03', code: 'M-003', name: '纸包装材料', flowType: 'material', subCategory: 'packaging',
    industries: ['竹制品制造'], status: 'enabled', description: '外包装纸盒',
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'M04', code: 'M-004', name: '环保胶粘剂', flowType: 'material', subCategory: 'auxiliary',
    industries: ['竹制品制造'], status: 'enabled', description: '工序辅料',
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'M05', code: 'M-005', name: '竹屑', flowType: 'byproduct', subCategory: null,
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
    id: 'EN02', code: 'E-002', name: '天然气', energyType: 'fuel',
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
    id: 'FAC07', code: 'F-007', name: '废弃竹制品焚烧处理排放因子', alias: '', scenario: '生命末期 · 焚烧处置',
    value: 0.06, numeratorUnit: 'kgCO₂e', denominatorUnit: 'kg',
    source: 'preset', referenced: false,
    description: '生活垃圾焚烧设施处置竹制品：仅计设施能耗与辅助燃料分摊，生物源 CO₂ 不计入（本期 CO₂ 口径）',
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'FAC08', code: 'F-008', name: '废弃竹制品卫生填埋排放因子', alias: '', englishName: 'Bamboo product waste, sanitary landfill', scenario: '生命末期 · 卫生填埋',
    value: 0.09, numeratorUnit: 'kgCO₂e', denominatorUnit: 'kg',
    source: 'preset', referenced: false,
    description: '卫生填埋场处置竹制品：计填埋作业能耗与分解气体按 CO₂ 口径简化折算',
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
    maintainer: '平台运营', currentVersionId: 'FLV01', versionCount: 1, factorCount: 8,
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
  { id: 'FLV01', libraryId: 'FLIB01', versionNo: 'V1.0', year: '2024', status: 'published', changeNote: '初始版本（已发布）', factorCount: 8, publishedBy: MASTER_BY, publishedAt: '2024-12-01 10:00', lastActivatedAt: '2024-12-01 10:00', createdBy: MASTER_BY, createdAt: MASTER_AT },
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

export const myFactorLibrarySeed: MyFactorLibrary[] = [
  {
    id: 'MFL01', name: '熊宝组织因子库', description: '收藏后台已发布库中的因子形成本组织私有副本，并维护企业实测因子。',
    factorCount: 2, createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
]

/** 我的因子种子：1 条收藏副本（源库已发布新版本，展示「有新版本可更新」）+ 1 条手工新增 */
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
]

/* ===================== 计算引擎配置 · 计算公式 ===================== */

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
    description: '生产废水厂内处理（生命末期阶段演示）',
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
]

/* ===================== 工艺流程管理 ===================== */

const processOp = (id: string, seq: number, order: number, opCode: string, opName: string): ProcessOperationItem => ({
  id, seq, order, opCode, opName, remark: '',
})

export const processSeed: ProcessItem[] = [
  {
    id: 'GY01', code: 'GY-00', name: '采购与运输工艺', categoryId: 'PC200903',
    industry: '竹制品制造', lifecycleStage: '原材料获取',
    description: '毛竹采购与厂外运输',
    useStatus: 'enabled', org: '平台级', visibility: 'PUBLIC', hasDisposal: false,
    operations: [processOp('PO01', 1, 1, 'GX-00', '厂外运输')],
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedAt: MASTER_AT,
  },
  {
    id: 'GY02', code: 'GY-01', name: '竹筷成型工艺', categoryId: 'PC200903',
    industry: '竹制品制造', lifecycleStage: '生产',
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
    industry: '竹制品制造', lifecycleStage: '生产',
    description: '纸盒包装',
    useStatus: 'enabled', org: '平台级', visibility: 'PUBLIC', hasDisposal: false,
    operations: [processOp('PO05', 1, 1, 'GX-04', '包装')],
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedAt: MASTER_AT,
  },
  {
    id: 'GY04', code: 'GY-03', name: '废水处理工艺', categoryId: 'PC200903',
    industry: '竹制品制造', lifecycleStage: '生命末期',
    description: '厂内废水处理（生命末期阶段）',
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
        lifecycleStage: '原材料获取', seq: 1,
        operations: [
          productOp('P01-OP1', 'GX-00', '厂外运输', 1,
            [pdFlow('P01-F01', 'material', '毛竹原竹（厂外运输）', 3.2, 't·km', FM.transport)],
            [pdFlow('P01-F02', 'semi', '集后毛竹', 1, 'kg', null, 'excluded')]),
        ],
      },
      {
        id: 'P01-PR2', processCode: 'GY-01', processName: '竹筷成型工艺',
        lifecycleStage: '生产', seq: 2,
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
          /* 包装工序挂入「生产」工艺：同一生命周期阶段只允许绑定一个工艺流程（2026-09-29） */
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
  /* ---------- PJ01｜240mm 全竹碳化筷 · 摇篮到大门 ---------- */
  { id: 'PJ01-SD-01', projectId: 'PJ01', stageId: 'LS07', stageName: '原材料运输', nodeId: null, direction: 'input', name: '毛竹原竹（厂外运输）', itemType: 'material', emissionType: null, quantity: 0.004, unit: 't·km', factorId: 'FAC04', factorName: '公路货运排放因子', factorValue: 0.036 },
  { id: 'PJ01-SD-02', projectId: 'PJ01', stageId: 'LS06', stageName: '原材料获取', nodeId: null, direction: 'input', name: '毛竹原竹', itemType: 'material', emissionType: null, quantity: 0.062, unit: 'kg', factorId: 'FAC03', factorName: '毛竹原材料排放因子', factorValue: 0.18, factorCalibers: { gwpTotal: 0.18, gwpFossil: 0.12, gwpBiogenic: 0.06, gwpLuluc: 0 } },
  { id: 'PJ01-SD-03', projectId: 'PJ01', stageId: 'LS08', stageName: '生产过程', nodeId: null, direction: 'input', name: '电力', itemType: 'energy', emissionType: null, quantity: 0.042, unit: 'kWh', factorId: 'FAC01', factorName: '电力排放因子', factorValue: 0.581 },
  { id: 'PJ01-SD-04', projectId: 'PJ01', stageId: 'LS08', stageName: '生产过程', nodeId: null, direction: 'input', name: '纸包装材料', itemType: 'material', emissionType: null, quantity: 0.0025, unit: 'kg', factorId: 'FAC06', factorName: '纸包装材料排放因子', factorValue: 0.91 },
  { id: 'PJ01-SD-05', projectId: 'PJ01', stageId: 'LS08', stageName: '生产过程', nodeId: null, direction: 'output', name: '竹屑', itemType: 'byproduct', emissionType: null, quantity: 0.038, unit: 'kg', factorId: null, factorName: '', factorValue: null },

  /* ---------- PJ02｜240mm 全竹碳化筷 · 摇篮到坟墓 ---------- */
  { id: 'PJ02-SD-01', projectId: 'PJ02', stageId: 'LS07', stageName: '原材料运输', nodeId: null, direction: 'input', name: '毛竹原竹（厂外运输）', itemType: 'material', emissionType: null, quantity: 0.004, unit: 't·km', factorId: 'FAC04', factorName: '公路货运排放因子', factorValue: 0.036 },
  { id: 'PJ02-SD-02', projectId: 'PJ02', stageId: 'LS06', stageName: '原材料获取', nodeId: null, direction: 'input', name: '毛竹原竹', itemType: 'material', emissionType: null, quantity: 0.062, unit: 'kg', factorId: 'FAC03', factorName: '毛竹原材料排放因子', factorValue: 0.18, factorCalibers: { gwpTotal: 0.18, gwpFossil: 0.12, gwpBiogenic: 0.06, gwpLuluc: 0 } },
  { id: 'PJ02-SD-03', projectId: 'PJ02', stageId: 'LS08', stageName: '生产过程', nodeId: null, direction: 'input', name: '电力', itemType: 'energy', emissionType: null, quantity: 0.042, unit: 'kWh', factorId: 'FAC01', factorName: '电力排放因子', factorValue: 0.581 },
  { id: 'PJ02-SD-04', projectId: 'PJ02', stageId: 'LS08', stageName: '生产过程', nodeId: null, direction: 'input', name: '纸包装材料', itemType: 'material', emissionType: null, quantity: 0.0025, unit: 'kg', factorId: 'FAC06', factorName: '纸包装材料排放因子', factorValue: 0.91 },
  { id: 'PJ02-SD-05', projectId: 'PJ02', stageId: 'LS08', stageName: '生产过程', nodeId: null, direction: 'output', name: '竹屑', itemType: 'byproduct', emissionType: null, quantity: 0.038, unit: 'kg', factorId: null, factorName: '', factorValue: null },
  { id: 'PJ02-SD-06', projectId: 'PJ02', stageId: 'LS10', stageName: '运输/交付', nodeId: null, direction: 'input', name: '成品运输', itemType: 'material', emissionType: null, quantity: 0.0036, unit: 't·km', factorId: 'FAC04', factorName: '公路货运排放因子', factorValue: 0.036 },
  { id: 'PJ02-SD-07', projectId: 'PJ02', stageId: 'LS11', stageName: '使用', nodeId: null, direction: 'input', name: '使用阶段能耗', itemType: 'energy', emissionType: null, quantity: 0, unit: 'kWh', factorId: 'FAC01', factorName: '电力排放因子', factorValue: 0.581 },
  { id: 'PJ02-SD-08', projectId: 'PJ02', stageId: 'LS12', stageName: '生命末期产品的收集、包装和运输', nodeId: null, direction: 'input', name: '废弃竹筷收集运输', itemType: 'material', emissionType: null, quantity: 0.00036, unit: 't·km', factorId: 'FAC04', factorName: '公路货运排放因子', factorValue: 0.036 },
  { id: 'PJ02-SD-09', projectId: 'PJ02', stageId: 'LS15', stageName: '焚烧和底渣分选，填埋和促进分解的排放', nodeId: null, direction: 'input', name: '废弃竹筷焚烧处理（60%）', itemType: 'material', emissionType: null, quantity: 0.0072, unit: 'kg', factorId: 'FAC07', factorName: '废弃竹制品焚烧处理排放因子', factorValue: 0.06 },
  { id: 'PJ02-SD-10', projectId: 'PJ02', stageId: 'LS15', stageName: '焚烧和底渣分选，填埋和促进分解的排放', nodeId: null, direction: 'input', name: '废弃竹筷卫生填埋（40%）', itemType: 'material', emissionType: null, quantity: 0.0048, unit: 'kg', factorId: 'FAC08', factorName: '废弃竹制品卫生填埋排放因子', factorValue: 0.09 },
]

/** 核算结果：演示项目 PJ01 为「待核算」态，进入步骤④点击「开始核算」后由系统真实计算产出 */
export const pcfCalcResultSeed: PcfCalcResult[] = []

/** 演示工序（报告编制中示例）：本期无 */
export const pcfDemoOperationSeed: PcfOperationConfig[] = []

/**
 * 演示核算项目（**两个不同核算边界**，同一产品 = 一项目一边界）：
 *
 * | 项目 | 边界 | 覆盖阶段 | 清单合计（数量口径） |
 * | :--- | :--- | :--- | :--- |
 * | **PJ01** | 摇篮到大门（`gate`） | 原材料获取、生产 | 0.037981 kgCO₂e / 双 |
 * | **PJ02** | 摇篮到坟墓（`grave`） | 原材料获取、生产、运输/交付、使用、生命末期 | 0.03898756 kgCO₂e / 双 |
 *
 * 两个项目均：步骤① 目标与范围已配置、步骤② 阶段数据项已按「数量」真实填报、
 * 步骤③ 检测已通过、状态「待核算」→ 进入工作台步骤④ 点「开始核算」即可走完 ④核算与结果
 * （V0.8 起报告环节已移除，核算结果为最后一个节点）。
 */
export const pcfProjectSeed: PcfProject[] = [
  {
    id: 'PJ01',
    code: 'PCF-20260901-001',
    name: '240mm 全竹碳化筷 · 摇篮到大门',
    ownerOrg: '福建竹业集团 · 工厂A1',
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
    remark: '摇篮到大门：仅覆盖原材料获取与生产，不含下游阶段。',
    method: 'GB/T 24067-2024',
    methodId: 'STD-001',
    lifecycleStages: [
      { id: 'LS01', name: '原材料获取', level: 1, parentName: '', custom: false, included: true },
      { id: 'LS06', name: '原材料获取', level: 2, parentName: '原材料获取', custom: false, included: true },
      { id: 'LS07', name: '原材料运输', level: 2, parentName: '原材料获取', custom: false, included: true },
      { id: 'LS02', name: '生产', level: 1, parentName: '', custom: false, included: true },
      { id: 'LS08', name: '生产过程', level: 2, parentName: '生产', custom: false, included: true },
      /* 生产废弃物以副产品「竹屑」在「生产过程」下记录，故本阶段不单独纳入 */
      { id: 'LS09', name: '生产过程的废弃物处理', level: 2, parentName: '生产', custom: false, included: false },
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
    status: 'toCalc',
    remark: '覆盖下游阶段：运输/交付、使用、生命末期（焚烧 60% + 卫生填埋 40%）。',
    method: 'GB/T 24067-2024',
    methodId: 'STD-001',
    lifecycleStages: [
      { id: 'LS01', name: '原材料获取', level: 1, parentName: '', custom: false, included: true },
      { id: 'LS06', name: '原材料获取', level: 2, parentName: '原材料获取', custom: false, included: true },
      { id: 'LS07', name: '原材料运输', level: 2, parentName: '原材料获取', custom: false, included: true },
      { id: 'LS02', name: '生产', level: 1, parentName: '', custom: false, included: true },
      { id: 'LS08', name: '生产过程', level: 2, parentName: '生产', custom: false, included: true },
      { id: 'LS09', name: '生产过程的废弃物处理', level: 2, parentName: '生产', custom: false, included: false },
      { id: 'LS03', name: '运输/交付', level: 1, parentName: '', custom: false, included: true },
      { id: 'LS10', name: '运输/交付', level: 2, parentName: '运输/交付', custom: false, included: true },
      { id: 'LS04', name: '使用', level: 1, parentName: '', custom: false, included: true },
      { id: 'LS11', name: '使用', level: 2, parentName: '使用', custom: false, included: true },
      { id: 'LS05', name: '生命末期', level: 1, parentName: '', custom: false, included: true },
      { id: 'LS12', name: '生命末期产品的收集、包装和运输', level: 2, parentName: '生命末期', custom: false, included: true },
      /* 本项目末端按「焚烧 + 填埋」处置，不做拆解回收与材料再生 */
      { id: 'LS13', name: '生命末期产品的拆解、破碎和分选', level: 2, parentName: '生命末期', custom: false, included: false },
      { id: 'LS14', name: '材料、有机物、能量的预处理及回收/再利用过程', level: 2, parentName: '生命末期', custom: false, included: false },
      { id: 'LS15', name: '焚烧和底渣分选，填埋和促进分解的排放', level: 2, parentName: '生命末期', custom: false, included: true },
    ],
    createdBy: '当前用户',
    createdAt: '2026-09-02 09:00',
    updatedAt: '2026-09-19 10:20',
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

/* ===================== 标准文件库（基础库 A1-3，P05；轻量基础数据 · 无版本化） ===================== */

/**
 * 标准文件种子（一个标准号 = 一条记录，唯一键 = 标准号）。
 * 覆盖：首发的 `GB/T 24067-2024`（已被首个核算模型绑定，R-007 锁定）、
 * 新旧版本（GB/T 24067-2018 → 2024、GB/T 2589-2008 → 2020，以标准号年份区分）、
 * 标准状态各枚举组合、「来源链接 / 附件」二选一的多种组合。
 */
export const standardSeed: StandardItem[] = [
  {
    id: 'STD-001',
    code: 'GB/T 24067-2024',
    nameZh: '温室气体 产品碳足迹 量化要求和指南',
    nameEn: 'Greenhouse gases — Carbon footprint of products — Requirements and guidelines for quantification',
    status: '现行',
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
  factor: { id: string | null; name: string; value: number | null; calibers?: FactorCalibers | null } = { id: null, name: '', value: null },
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
    factorCalibers: factor.calibers ?? null,
  }
}

/** 常用生命周期阶段（模型向导 / 详情复用） */
const MST = {
  mat: modelStage('LS01', '原材料获取', 1, ''),
  matRaw: modelStage('LS06', '原材料获取', 2, '原材料获取'),
  matTrans: modelStage('LS07', '原材料运输', 2, '原材料获取'),
  prod: modelStage('LS02', '生产', 1, ''),
  prodProc: modelStage('LS08', '生产过程', 2, '生产'),
  prodWaste: modelStage('LS09', '生产过程的废弃物处理', 2, '生产', false),
  delivery: modelStage('LS03', '运输/交付', 1, ''),
  delivery2: modelStage('LS10', '运输/交付', 2, '运输/交付'),
  use: modelStage('LS04', '使用', 1, ''),
  use2: modelStage('LS11', '使用', 2, '使用'),
  eol: modelStage('LS05', '生命末期', 1, ''),
  eolCollect: modelStage('LS12', '生命末期产品的收集、包装和运输', 2, '生命末期'),
  eolWaste: modelStage('LS15', '焚烧和底渣分选，填埋和促进分解的排放', 2, '生命末期'),
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
    lifecycleStages: [MST.mat, MST.matRaw, MST.matTrans, MST.prod, MST.prodProc, MST.prodWaste],
    items: [
      modelItem('MDL-001-IT-01', 'LS07', '原材料运输', 'input', '毛竹原竹（厂外运输）', 'material', 0.004, 't·km', MF.freight),
      modelItem('MDL-001-IT-02', 'LS06', '原材料获取', 'input', '毛竹原竹', 'material', 0.062, 'kg', MF.bamboo),
      modelItem('MDL-001-IT-03', 'LS08', '生产过程', 'input', '电力', 'energy', 0.042, 'kWh', MF.elec),
      modelItem('MDL-001-IT-04', 'LS08', '生产过程', 'input', '纸包装材料', 'material', 0.0025, 'kg', MF.paper),
      modelItem('MDL-001-IT-05', 'LS08', '生产过程', 'output', '竹屑', 'byproduct', 0.038, 'kg'),
    ],
    nodes: [],
    remark: '覆盖「原材料获取 + 生产」两阶段，适用于厂内自制竹制餐具的快速核算。',
    maintainer: '平台运营',
    createdBy: '当前用户',
    createdAt: '2026-09-20 10:00',
    updatedAt: '2026-09-26 15:20',
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
    lifecycleStages: [
      MST.mat,
      MST.matRaw,
      MST.matTrans,
      MST.prod,
      MST.prodProc,
      MST.prodWaste,
      MST.delivery,
      MST.delivery2,
      MST.use,
      MST.use2,
      MST.eol,
      MST.eolCollect,
      MST.eolWaste,
    ],
    items: [
      modelItem('MDL-002-IT-01', 'LS07', '原材料运输', 'input', '毛竹原竹（厂外运输）', 'material', 0.004, 't·km', MF.freight),
      modelItem('MDL-002-IT-02', 'LS06', '原材料获取', 'input', '毛竹原竹', 'material', 0.062, 'kg', MF.bamboo),
      modelItem('MDL-002-IT-03', 'LS08', '生产过程', 'input', '电力', 'energy', 0.042, 'kWh', MF.elec),
      modelItem('MDL-002-IT-04', 'LS08', '生产过程', 'input', '纸包装材料', 'material', 0.0025, 'kg', MF.paper),
      modelItem('MDL-002-IT-05', 'LS08', '生产过程', 'output', '竹屑', 'byproduct', 0.038, 'kg'),
      modelItem('MDL-002-IT-06', 'LS10', '运输/交付', 'input', '成品运输', 'material', 0.0036, 't·km', MF.freight),
      modelItem('MDL-002-IT-07', 'LS11', '使用', 'input', '使用阶段能耗', 'energy', 0, 'kWh', MF.elec),
      modelItem('MDL-002-IT-08', 'LS12', '生命末期产品的收集、包装和运输', 'input', '废弃竹筷收集运输', 'material', 0.00036, 't·km', MF.freight),
      modelItem('MDL-002-IT-09', 'LS15', '焚烧和底渣分选，填埋和促进分解的排放', 'input', '废弃竹筷焚烧处理（60%）', 'material', 0.0072, 'kg', MF.incin),
      modelItem('MDL-002-IT-10', 'LS15', '焚烧和底渣分选，填埋和促进分解的排放', 'input', '废弃竹筷卫生填埋（40%）', 'material', 0.0048, 'kg', MF.landfill),
    ],
    nodes: [],
    remark: '含下游「运输/交付 + 使用 + 生命末期（焚烧 60% + 卫生填埋 40%）」，覆盖产品全生命周期。',
    maintainer: '平台运营',
    createdBy: '当前用户',
    createdAt: '2026-09-27 09:10',
    updatedAt: '2026-09-28 17:40',
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
    lifecycleStages: [MST.prod, MST.prodProc, MST.prodWaste],
    items: [
      modelItem('MDL-003-IT-01', 'LS08', '生产过程', 'input', '电力', 'energy', 0.055, 'kWh', MF.elec),
      modelItem('MDL-003-IT-02', 'LS08', '生产过程', 'input', '瓦楞原纸', 'material', 0.06, 'kg', MF.paper),
      modelItem('MDL-003-IT-03', 'LS08', '生产过程', 'output', '纸板边角料', 'byproduct', 0.004, 'kg'),
    ],
    nodes: [],
    remark: '仅覆盖生产阶段（大门到大门），适用于多工厂分工下的单环节核算。',
    maintainer: '平台运营',
    createdBy: '当前用户',
    createdAt: '2026-08-15 11:00',
    updatedAt: '2026-09-10 09:25',
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
    lifecycleStages: [MST.mat, MST.matRaw, MST.matTrans, MST.prod, MST.prodProc, MST.prodWaste],
    items: [
      modelItem('MDL-004-IT-01', 'LS07', '原材料运输', 'input', '废纸板（厂外运输）', 'material', 0.006, 't·km', MF.freight),
      modelItem('MDL-004-IT-02', 'LS06', '原材料获取', 'input', '废纸浆', 'material', 0.075, 'kg', MF.paper),
      modelItem('MDL-004-IT-03', 'LS08', '生产过程', 'input', '电力', 'energy', 0.048, 'kWh', MF.elec),
      modelItem('MDL-004-IT-04', 'LS08', '生产过程', 'input', '纸包装材料', 'material', 0.003, 'kg', MF.paper),
      modelItem('MDL-004-IT-05', 'LS08', '生产过程', 'output', '纸浆边角料', 'byproduct', 0.005, 'kg'),
    ],
    nodes: [],
    remark: '以废纸浆模塑餐具为原型，覆盖原材料获取 + 生产两阶段，适用于纸浆模塑类一次性餐具。',
    maintainer: '平台运营',
    createdBy: '当前用户',
    createdAt: '2026-09-22 09:40',
    updatedAt: '2026-09-30 11:15',
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
    lifecycleStages: [
      MST.mat,
      MST.matRaw,
      MST.matTrans,
      MST.prod,
      MST.prodProc,
      MST.prodWaste,
      MST.delivery,
      MST.use,
      MST.eol,
      MST.eolWaste,
    ],
    items: [
      modelItem('MDL-005-IT-01', 'LS07', '原材料运输', 'input', '板材（厂外运输）', 'material', 0.012, 't·km', MF.freight),
      modelItem('MDL-005-IT-02', 'LS06', '原材料获取', 'input', '实木板材', 'material', 0.85, 'kg', MF.bamboo),
      modelItem('MDL-005-IT-03', 'LS08', '生产过程', 'input', '电力', 'energy', 0.36, 'kWh', MF.elec),
      modelItem('MDL-005-IT-04', 'LS08', '生产过程', 'input', '五金配件', 'material', 0.05, 'kg', MF.paper),
      modelItem('MDL-005-IT-05', 'LS10', '运输/交付', 'input', '成品运输', 'material', 0.0036, 't·km', MF.freight),
      modelItem('MDL-005-IT-06', 'LS12', '生命末期产品的收集、包装和运输', 'input', '废弃家具收集运输', 'material', 0.0004, 't·km', MF.freight),
      modelItem('MDL-005-IT-07', 'LS15', '焚烧和底渣分选，填埋和促进分解的排放', 'input', '废弃家具焚烧处理', 'material', 0.0072, 'kg', MF.incin),
    ],
    nodes: [],
    remark: '以实木桌椅为原型，含下游「运输/交付 + 生命末期」，覆盖产品全生命周期。',
    maintainer: '平台运营',
    createdBy: '当前用户',
    createdAt: '2026-09-18 14:20',
    updatedAt: '2026-09-29 16:50',
    publishedAt: '2026-09-29 16:50',
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
    lifecycleStages: [MST.mat, MST.matRaw, MST.matTrans, MST.prod, MST.prodProc, MST.prodWaste],
    items: [
      modelItem('MYM-001-IT-01', 'LS07', '原材料运输', 'input', '板材（厂外运输）', 'material', 0.012, 't·km', MF.freight),
      modelItem('MYM-001-IT-02', 'LS06', '原材料获取', 'input', '实木板材', 'material', 0.85, 'kg', MF.bamboo),
      modelItem('MYM-001-IT-03', 'LS08', '生产过程', 'input', '电力', 'energy', 0.36, 'kWh', MF.elec),
      modelItem('MYM-001-IT-04', 'LS08', '生产过程', 'input', '五金配件', 'material', 0.05, 'kg', MF.paper),
      modelItem('MYM-001-IT-05', 'LS08', '生产过程', 'output', '木屑废料', 'byproduct', 0.06, 'kg'),
    ],
    nodes: [],
    remark: '组织自建：以实木桌椅为原型，覆盖原材料获取与生产两阶段。',
    updatedAt: '2026-09-25 14:05',
  },
  {
    id: 'MYM-002',
    code: 'MYM-002',
    name: '全竹碳化筷 · 摇篮到大门核算模型（收藏）',
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
    lifecycleStages: [MST.mat, MST.matRaw, MST.matTrans, MST.prod, MST.prodProc, MST.prodWaste],
    items: [
      modelItem('MYM-002-IT-01', 'LS07', '原材料运输', 'input', '毛竹原竹（厂外运输）', 'material', 0.004, 't·km', MF.freight),
      modelItem('MYM-002-IT-02', 'LS06', '原材料获取', 'input', '毛竹原竹', 'material', 0.062, 'kg', MF.bamboo),
      modelItem('MYM-002-IT-03', 'LS08', '生产过程', 'input', '电力', 'energy', 0.042, 'kWh', MF.elec),
      modelItem('MYM-002-IT-04', 'LS08', '生产过程', 'input', '纸包装材料', 'material', 0.0025, 'kg', MF.paper),
      modelItem('MYM-002-IT-05', 'LS08', '生产过程', 'output', '竹屑', 'byproduct', 0.038, 'kg'),
    ],
    nodes: [],
    remark: '收藏自平台模型库（MDL-001），复制式快照、只读预览。',
    updatedAt: '2026-09-27 10:30',
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
    lifecycleStages: [
      MST.mat,
      MST.matRaw,
      MST.matTrans,
      MST.prod,
      MST.prodProc,
      MST.prodWaste,
      MST.delivery,
      MST.use,
      MST.eol,
      MST.eolWaste,
    ],
    items: [
      modelItem('MYM-003-IT-01', 'LS06', '原材料获取', 'input', '毛竹原竹', 'material', 0.068, 'kg', MF.bamboo),
      modelItem('MYM-003-IT-02', 'LS07', '原材料运输', 'input', '毛竹原竹（厂外运输）', 'material', 0.004, 't·km', MF.freight),
      modelItem('MYM-003-IT-03', 'LS08', '生产过程', 'input', '电力', 'energy', 0.05, 'kWh', MF.elec),
      modelItem('MYM-003-IT-04', 'LS08', '生产过程', 'input', '纸包装材料', 'material', 0.0028, 'kg', MF.paper),
      modelItem('MYM-003-IT-05', 'LS08', '生产过程', 'output', '竹屑', 'byproduct', 0.041, 'kg'),
      modelItem('MYM-003-IT-06', 'LS10', '运输/交付', 'input', '成品运输', 'material', 0.0032, 't·km', MF.freight),
      modelItem('MYM-003-IT-07', 'LS15', '焚烧和底渣分选，填埋和促进分解的排放', 'input', '废弃竹筷焚烧处理', 'material', 0.0072, 'kg', MF.incin),
    ],
    nodes: [],
    remark: '组织自建：在福建地方标准口径下覆盖竹制餐具全生命周期（含运输/交付与生命末期）。',
    updatedAt: '2026-09-28 15:40',
  },
]
