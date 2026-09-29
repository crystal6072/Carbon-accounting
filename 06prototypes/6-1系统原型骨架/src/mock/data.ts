/**
 * Mock 数据源（**演示数据集**：由《PCF核算全链路走查报告_2026-09-29》的模拟脚本
 * `__sim_pcf__.ts` 实际跑通的口径固化而来，刷新页面即可见）。
 *
 * 组成：
 * - 基础库：分类 / 行业 / 生命周期阶段 / 计量单位 / 物料 / 能源
 * - 核算配置：排放因子 / 计算公式
 * - 工艺库：工序 / 工艺流程 / 产品（含工艺工序组合）
 * - 前台核算：1 个「待核算」演示项目 PJ01（步骤②数据已填报、检测已过，
 *   进入工作台步骤④点击「开始核算」即按「排放 = 活动量 × 常量 × 因子值」产出真实结果）
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
  EmissionCategory,
  EnergyItem,
  EnergyOption,
  FactorItem,
  FactorReferenceItem,
  FlowFormulaDisposal,
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
  PcfStandardOption,
  ProcessItem,
  ProcessOperationItem,
  ProcessTemplate,
  ProductFlowItem,
  ProductItem,
  ProductOperationItem,
  ProductProcessItem,
  UnitItem,
  UnitReferenceItem,
} from '@/types'

/* ===================== 种子构造助手 ===================== */

/** 公式快照（写入流的冗余展示字段） */
const FM = {
  mass: { id: 'FMC001', code: 'FM-001', name: '因子法（质量口径）', expression: '活动量*排放因子' },
  transport: { id: 'FMC002', code: 'FM-002', name: '运输 t·km 法', expression: '周转量*排放因子' },
  fuel: { id: 'FMC003', code: 'FM-003', name: '燃料燃烧法', expression: '消耗量*排放因子' },
  elec: { id: 'FMC004', code: 'FM-004', name: '因子法（电力口径）', expression: '用电量*排放因子' },
  water: { id: 'FMC005', code: 'FM-005', name: '因子法（废水口径）', expression: '处理量*排放因子' },
  recycle: { id: 'FMC006', code: 'FM-006', name: '回收信用法', expression: '回收量*抵扣系数' },
  noFactor: { id: 'FMC007', code: 'FM-007', name: '活动数据法（无默认因子）', expression: '活动量*排放因子' },
} as const

/** 构造工序库投入产出项 */
function opFlow(
  id: string,
  seq: number,
  flowType: FlowItemType,
  refCode: string,
  refName: string,
  unit: string,
  formula: { id: string; code: string; name: string; expression: string } | null,
  extra: { emissionCategory?: EmissionCategory; disposal?: FlowFormulaDisposal } = {},
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
    formulaId: formula?.id ?? '',
    formulaCode: formula?.code ?? '',
    formulaName: formula?.name ?? '',
    formulaExpression: formula?.expression ?? '',
    disposal: extra.disposal ?? 'formula',
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

export const categorySeed: CategoryItem[] = [
  {
    id: 'C01',
    code: 'BAM',
    name: '竹制餐具',
    parentId: null,
    level: 1,
    sortNo: 10,
    status: 'enabled',
    remark: '一次性与家用竹制餐具',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedAt: '2026-08-20 10:00',
  },
]

/* ===================== 行业库 ===================== */

export const industrySeed: IndustryItem[] = [
  {
    id: 'IND01',
    code: 'IND-BAM',
    name: '竹制品制造',
    level: 1,
    parentId: null,
    sortNo: 10,
    description: '竹制餐具与家居用品制造',
    status: 'enabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: '2026-08-01 09:00',
  },
]

/** 行业选项（取启用状态的一级行业名称） */
export const industryOptions: string[] = industrySeed
  .filter((item) => item.level === 1 && item.status === 'enabled')
  .map((item) => item.name)

/* ===================== 生命周期阶段 ===================== */

/**
 * 5 个一级阶段，边界规则矩阵：
 * - 摇篮到大门（gate）：原材料获取 + 生产制造纳入，分销 / 使用 / 末期处理不适用
 * - 摇篮到坟墓（grave）：全阶段纳入（使用为 optional，可勾选）
 */
export const lifecycleSeed: LifecycleStageItem[] = [
  {
    id: 'LS01',
    code: 'LC-01',
    name: '原材料获取',
    level: 1,
    parentId: null,
    order: 10,
    description: '原料获取与厂外运输',
    industries: [],
    gateRule: 'required',
    graveRule: 'required',
    status: 'enabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: '2026-08-01 09:00',
  },
  {
    id: 'LS02',
    code: 'LC-02',
    name: '生产制造',
    level: 1,
    parentId: null,
    order: 20,
    description: '厂内加工与包装',
    industries: [],
    gateRule: 'required',
    graveRule: 'required',
    status: 'enabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: '2026-08-01 09:00',
  },
  {
    id: 'LS03',
    code: 'LC-03',
    name: '分销',
    level: 1,
    parentId: null,
    order: 30,
    description: '仓储、运输与销售环节',
    industries: [],
    gateRule: 'excluded',
    graveRule: 'required',
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
    description: '产品使用阶段能耗',
    industries: [],
    gateRule: 'excluded',
    graveRule: 'optional',
    status: 'enabled',
    createdBy: MASTER_BY,
    createdAt: MASTER_AT,
    updatedBy: MASTER_BY,
    updatedAt: '2026-08-01 09:00',
  },
  {
    id: 'LS05',
    code: 'LC-05',
    name: '末期处理',
    level: 1,
    parentId: null,
    order: 50,
    description: '废弃、填埋、焚烧与回收',
    industries: [],
    gateRule: 'excluded',
    graveRule: 'required',
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

/** 计量单位选项（表单下拉字典；数量类单位不由单位库维护，见走查报告 S-03） */
export const unitOptions: string[] = [
  '双', '件', '个', '包', '套', '盒',
  'g', 'kg', 't', 'kWh', 'm', 'm²', 'm³', 'km', 'kgCO₂e',
]

/* ===================== 工序引用选项（物料库 / 能源库静态镜像） ===================== */

/** 物料库选项（Mock 引用「物料库」A1-1；M-9xx 为中间品 / 成品 / 副产品等工序流占位编码） */
export const materialOptions: MaterialOption[] = [
  { code: 'M-001', name: '毛竹原竹', unit: 'kg', status: 'enabled' },
  { code: 'M-002', name: '竹板材', unit: 'kg', status: 'enabled' },
  { code: 'M-003', name: '纸包装材料', unit: 'kg', status: 'enabled' },
  { code: 'M-004', name: '环保胶粘剂', unit: 'kg', status: 'enabled' },
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
    id: 'FAC01', code: 'F-001', name: '电力排放因子', alias: '',
    category: 'energy', industries: ['竹制品制造'], scenario: '外购电力消耗',
    value: 0.581, numeratorUnit: 'kgCO₂e', denominatorUnit: 'kWh',
    sourceCategory: '国家温室气体清单', publishYear: '2023', publishDate: '2023-12',
    publisherRegion: '中国', publisherFullName: '生态环境部', publisherShortName: '',
    dataSourceFile: '', source: 'preset', referenced: false, status: 'enabled',
    description: '全国电网平均电力排放因子',
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'FAC02', code: 'F-002', name: '天然气排放因子', alias: '',
    category: 'energy', industries: ['竹制品制造'], scenario: '天然气燃烧',
    value: 2.1622, numeratorUnit: 'kgCO₂e', denominatorUnit: 'm³',
    sourceCategory: '国家温室气体清单', publishYear: '2023', publishDate: '2023-12',
    publisherRegion: '中国', publisherFullName: '生态环境部', publisherShortName: '',
    dataSourceFile: '', source: 'preset', referenced: false, status: 'enabled',
    description: '天然气固定燃烧排放因子',
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'FAC03', code: 'F-003', name: '毛竹原材料排放因子', alias: '',
    category: 'material', industries: ['竹制品制造'], scenario: '毛竹原竹获取',
    value: 0.18, numeratorUnit: 'kgCO₂e', denominatorUnit: 'kg',
    sourceCategory: '行业研究报告', publishYear: '2022', publishDate: '2022-06',
    publisherRegion: '中国', publisherFullName: '中国林产工业协会', publisherShortName: '',
    dataSourceFile: '', source: 'preset', referenced: false, status: 'enabled',
    description: '毛竹种植、采伐与初加工平均排放因子',
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'FAC04', code: 'F-004', name: '公路货运排放因子', alias: '',
    category: 'transport', industries: ['竹制品制造'], scenario: '公路货物运输',
    value: 0.036, numeratorUnit: 'kgCO₂e', denominatorUnit: 't·km',
    sourceCategory: '国家温室气体清单', publishYear: '2023', publishDate: '2023-12',
    publisherRegion: '中国', publisherFullName: '生态环境部', publisherShortName: '',
    dataSourceFile: '', source: 'preset', referenced: false, status: 'enabled',
    description: '中型柴油货车周转量排放因子',
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'FAC05', code: 'F-005', name: '废水处理排放因子', alias: '',
    category: 'waste', industries: ['竹制品制造'], scenario: '工业废水处理',
    value: 0.52, numeratorUnit: 'kgCO₂e', denominatorUnit: 'kg',
    sourceCategory: '行业研究报告', publishYear: '2021', publishDate: '2021-09',
    publisherRegion: '中国', publisherFullName: '生态环境部', publisherShortName: '',
    dataSourceFile: '', source: 'preset', referenced: false, status: 'enabled',
    description: '厂内废水处理站单位废水排放因子',
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'FAC06', code: 'F-006', name: '纸包装材料排放因子', alias: '',
    category: 'material', industries: ['竹制品制造'], scenario: '外购纸包装材料',
    value: 0.91, numeratorUnit: 'kgCO₂e', denominatorUnit: 'kg',
    sourceCategory: '行业研究报告', publishYear: '2022', publishDate: '2022-06',
    publisherRegion: '中国', publisherFullName: '中国包装联合会', publisherShortName: '',
    dataSourceFile: '', source: 'preset', referenced: false, status: 'enabled',
    description: '外购纸包装材料上游排放因子',
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
]

/** 因子引用情况（只读反查，仅作展示） */
export const factorReferenceSeed: Record<string, FactorReferenceItem[]> = {}

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
    industries: ['竹制品制造'], expression: '活动量*排放因子',
    resultName: '碳排放量', resultUnit: 'kgCO₂e',
    supportsSumLoop: false, supportsNegativeResult: false,
    dataOwnerType: 'preset', ownerOrg: '空天碳示范组织', status: 'enabled',
    description: '通用因子法：活动量 × 排放因子（质量口径）',
    factors: [
      formulaFactor('FF001', '活动量', 'activity', 'kg'),
      formulaFactor('FF002', '排放因子', 'parameter', 'kgCO₂e/kg', {
        sourceLib: '排放因子库', sourceCode: 'F-003', sourceName: '毛竹原材料排放因子',
      }),
    ],
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'FMC002', code: 'FM-002', name: '运输 t·km 法', formulaType: 'other',
    industries: ['竹制品制造'], expression: '周转量*排放因子',
    resultName: '碳排放量', resultUnit: 'kgCO₂e',
    supportsSumLoop: false, supportsNegativeResult: false,
    dataOwnerType: 'preset', ownerOrg: '空天碳示范组织', status: 'enabled',
    description: '运输环节：周转量（t·km）× 运输排放因子',
    factors: [
      formulaFactor('FF003', '周转量', 'activity', 't·km'),
      formulaFactor('FF004', '排放因子', 'parameter', 'kgCO₂e/t·km', {
        sourceLib: '排放因子库', sourceCode: 'F-004', sourceName: '公路货运排放因子',
      }),
    ],
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'FMC003', code: 'FM-003', name: '燃料燃烧法', formulaType: 'carbon',
    industries: ['竹制品制造'], expression: '消耗量*排放因子',
    resultName: '碳排放量', resultUnit: 'kgCO₂e',
    supportsSumLoop: false, supportsNegativeResult: false,
    dataOwnerType: 'preset', ownerOrg: '空天碳示范组织', status: 'enabled',
    description: '燃料燃烧：消耗量 × 排放因子',
    factors: [
      formulaFactor('FF005', '消耗量', 'activity', 'm³'),
      formulaFactor('FF006', '排放因子', 'parameter', 'kgCO₂e/m³', {
        sourceLib: '排放因子库', sourceCode: 'F-002', sourceName: '天然气排放因子',
      }),
    ],
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'FMC004', code: 'FM-004', name: '因子法（电力口径）', formulaType: 'energy',
    industries: ['竹制品制造'], expression: '用电量*排放因子',
    resultName: '碳排放量', resultUnit: 'kgCO₂e',
    supportsSumLoop: false, supportsNegativeResult: false,
    dataOwnerType: 'preset', ownerOrg: '空天碳示范组织', status: 'enabled',
    description: '外购电力：用电量 × 电力排放因子',
    factors: [
      formulaFactor('FF007', '用电量', 'activity', 'kWh'),
      formulaFactor('FF008', '排放因子', 'parameter', 'kgCO₂e/kWh', {
        sourceLib: '排放因子库', sourceCode: 'F-001', sourceName: '电力排放因子',
      }),
    ],
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'FMC005', code: 'FM-005', name: '因子法（废水口径）', formulaType: 'factor',
    industries: ['竹制品制造'], expression: '处理量*排放因子',
    resultName: '碳排放量', resultUnit: 'kgCO₂e',
    supportsSumLoop: false, supportsNegativeResult: false,
    dataOwnerType: 'preset', ownerOrg: '空天碳示范组织', status: 'enabled',
    description: '废水处理：处理量 × 废水处理排放因子',
    factors: [
      formulaFactor('FF009', '处理量', 'activity', 'kg'),
      formulaFactor('FF010', '排放因子', 'parameter', 'kgCO₂e/kg', {
        sourceLib: '排放因子库', sourceCode: 'F-005', sourceName: '废水处理排放因子',
      }),
    ],
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'FMC006', code: 'FM-006', name: '回收信用法', formulaType: 'factor',
    industries: ['竹制品制造'], expression: '回收量*抵扣系数',
    resultName: '碳排放量', resultUnit: 'kgCO₂e',
    supportsSumLoop: false, supportsNegativeResult: true,
    dataOwnerType: 'preset', ownerOrg: '空天碳示范组织', status: 'enabled',
    description: '副产品 / 回收物：回收量 × 抵扣系数（无需匹配因子）',
    factors: [
      formulaFactor('FF011', '回收量', 'activity', 'kg'),
      formulaFactor('FF012', '抵扣系数', 'constant', 'kgCO₂e/kg', { value: '0.5' }),
    ],
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedBy: MASTER_BY, updatedAt: MASTER_AT,
  },
  {
    id: 'FMC007', code: 'FM-007', name: '活动数据法（无默认因子）', formulaType: 'factor',
    industries: ['竹制品制造'], expression: '活动量*排放因子',
    resultName: '碳排放量', resultUnit: 'kgCO₂e',
    supportsSumLoop: false, supportsNegativeResult: false,
    dataOwnerType: 'preset', ownerOrg: '空天碳示范组织', status: 'enabled',
    description: '演示用：公式含 parameter 因素但无默认绑定，填报时须手动匹配因子',
    factors: [
      formulaFactor('FF013', '活动量', 'activity', 'kg'),
      formulaFactor('FF014', '排放因子', 'parameter', 'kgCO₂e/kg', {
        sourceLib: '排放因子库', sourceCode: '', sourceName: '',
      }),
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
    inputs: [opFlow('OF01', 1, 'material', 'M-001', '毛竹原竹（厂外运输）', 't·km', FM.transport)],
    outputs: [opFlow('OF02', 1, 'material', 'M-901', '集后毛竹', 'kg', null, { disposal: 'excluded' })],
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedAt: MASTER_AT,
  },
  {
    id: 'OP02', code: 'GX-01', name: '断料', type: 'main', iconUrl: '',
    description: '原竹断料成标准竹段',
    useStatus: 'enabled',
    inputs: [opFlow('OF03', 1, 'material', 'M-001', '毛竹原竹', 'kg', FM.mass)],
    outputs: [opFlow('OF04', 1, 'material', 'M-902', '竹段', 'kg', null, { disposal: 'excluded' })],
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedAt: MASTER_AT,
  },
  {
    id: 'OP03', code: 'GX-02', name: '碳化', type: 'main', iconUrl: '',
    description: '竹段碳化处理',
    useStatus: 'enabled',
    inputs: [
      opFlow('OF05', 1, 'material', 'M-902', '竹段', 'kg', null, { disposal: 'excluded' }),
      opFlow('OF06', 2, 'energy', 'E-001', '电力', 'kWh', FM.elec),
    ],
    outputs: [opFlow('OF07', 1, 'material', 'M-903', '碳化竹段', 'kg', null, { disposal: 'excluded' })],
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedAt: MASTER_AT,
  },
  {
    id: 'OP04', code: 'GX-03', name: '打磨成型', type: 'main', iconUrl: '',
    description: '碳化竹段打磨成型，产出散装配竹屑',
    useStatus: 'enabled',
    inputs: [opFlow('OF08', 1, 'material', 'M-903', '碳化竹段', 'kg', null, { disposal: 'excluded' })],
    outputs: [
      opFlow('OF09', 1, 'material', 'M-904', '成品筷（散）', '双', null, { disposal: 'excluded' }),
      opFlow('OF10', 2, 'material', 'M-905', '竹屑', 'kg', FM.recycle),
    ],
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedAt: MASTER_AT,
  },
  {
    id: 'OP05', code: 'GX-04', name: '包装', type: 'auxiliary', iconUrl: '',
    description: '散装筷纸盒包装成成品',
    useStatus: 'enabled',
    inputs: [
      opFlow('OF11', 1, 'material', 'M-904', '成品筷（散）', '双', null, { disposal: 'excluded' }),
      opFlow('OF12', 2, 'material', 'M-003', '纸包装材料', 'kg', FM.mass),
    ],
    outputs: [opFlow('OF13', 1, 'material', 'M-906', '盒装竹筷', '盒', null, { disposal: 'excluded' })],
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedAt: MASTER_AT,
  },
  {
    id: 'OP06', code: 'GX-06', name: '厂内废水处理', type: 'disposal', iconUrl: '',
    description: '生产废水厂内处理（末期处理阶段演示）',
    useStatus: 'enabled',
    inputs: [opFlow('OF14', 1, 'material', 'M-907', '生产废水', 'kg', FM.water, { emissionCategory: 'wastewater' })],
    outputs: [opFlow('OF15', 1, 'material', 'M-908', '净化污泥', 'kg', FM.recycle)],
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedAt: MASTER_AT,
  },
  {
    id: 'OP07', code: 'GX-07', name: '试剂添加', type: 'auxiliary', iconUrl: '',
    description: '添加环保胶粘剂（公式无默认因子，演示 B2 拦截）',
    useStatus: 'enabled',
    inputs: [opFlow('OF16', 1, 'material', 'M-004', '环保胶粘剂', 'kg', FM.noFactor)],
    outputs: [opFlow('OF17', 1, 'material', 'M-909', '混合料', 'kg', null, { disposal: 'excluded' })],
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedAt: MASTER_AT,
  },
  {
    id: 'OP08', code: 'GX-08', name: '分切', type: 'auxiliary', iconUrl: '',
    description: '混合料分切（多产出，演示 B3 分配比例）',
    useStatus: 'enabled',
    inputs: [opFlow('OF18', 1, 'material', 'M-909', '混合料', 'kg', null, { disposal: 'excluded' })],
    outputs: [
      opFlow('OF19', 1, 'material', 'M-910', '竹签', '包', null, { disposal: 'excluded' }),
      opFlow('OF20', 2, 'material', 'M-911', '竹粉', 'kg', FM.recycle),
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
    id: 'GY01', code: 'GY-00', name: '采购与运输工艺', categoryId: 'C01',
    industry: '竹制品制造', lifecycleStage: '原材料获取',
    description: '毛竹采购与厂外运输', baseQty: null, baseUnit: '',
    useStatus: 'enabled', org: '平台级', visibility: 'PUBLIC', hasDisposal: false,
    operations: [processOp('PO01', 1, 1, 'GX-00', '厂外运输')],
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedAt: MASTER_AT,
  },
  {
    id: 'GY02', code: 'GY-01', name: '竹筷成型工艺', categoryId: 'C01',
    industry: '竹制品制造', lifecycleStage: '生产制造',
    description: '断料 → 碳化 → 打磨成型', baseQty: null, baseUnit: '',
    useStatus: 'enabled', org: '平台级', visibility: 'PUBLIC', hasDisposal: false,
    operations: [
      processOp('PO02', 1, 1, 'GX-01', '断料'),
      processOp('PO03', 2, 2, 'GX-02', '碳化'),
      processOp('PO04', 3, 3, 'GX-03', '打磨成型'),
    ],
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedAt: MASTER_AT,
  },
  {
    id: 'GY03', code: 'GY-02', name: '包装工艺', categoryId: 'C01',
    industry: '竹制品制造', lifecycleStage: '生产制造',
    description: '纸盒包装', baseQty: null, baseUnit: '',
    useStatus: 'enabled', org: '平台级', visibility: 'PUBLIC', hasDisposal: false,
    operations: [processOp('PO05', 1, 1, 'GX-04', '包装')],
    createdBy: MASTER_BY, createdAt: MASTER_AT, updatedAt: MASTER_AT,
  },
  {
    id: 'GY04', code: 'GY-03', name: '废水处理工艺', categoryId: 'C01',
    industry: '竹制品制造', lifecycleStage: '末期处理',
    description: '厂内废水处理（末期处理阶段）', baseQty: null, baseUnit: '',
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
    categoryId: 'C01',
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
        lifecycleStage: '生产制造', seq: 2,
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
          /* 包装工序挂入「生产制造」工艺：同一生命周期阶段只允许绑定一个工艺流程（2026-09-29） */
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

/** 项目 PJ01 的核算工序副本（引用即复制，口径与 ensureOperations 生成结果一致） */
const pj01Op = (
  opId: string,
  processCode: string,
  processName: string,
  processSeq: number,
  processStage: string,
  opCode: string,
  opName: string,
  opSeq: number,
  inputs: ProductFlowItem[],
  outputs: ProductFlowItem[],
): PcfOperationConfig => ({
  id: opId,
  projectId: 'PJ01',
  sourceProductId: 'P01',
  copiedAt: '2026-09-01 09:05',
  processCode,
  processName,
  processSeq,
  processStage,
  opCode,
  opName,
  opSeq,
  inputs,
  outputs,
})

export const pcfOperationSeed: PcfOperationConfig[] = [
  pj01Op('PJ01-OP-GY-00-GX-00', 'GY-00', '采购与运输工艺', 1, '原材料获取', 'GX-00', '厂外运输', 1,
    [pdFlow('PJ01-F01', 'material', '毛竹原竹（厂外运输）', 3.2, 't·km', FM.transport)],
    [pdFlow('PJ01-F02', 'semi', '集后毛竹', 1, 'kg', null, 'excluded')]),
  pj01Op('PJ01-OP-GY-01-GX-01', 'GY-01', '竹筷成型工艺', 2, '生产制造', 'GX-01', '断料', 1,
    [pdFlow('PJ01-F03', 'material', '毛竹原竹', 62, 'kg', FM.mass)],
    [pdFlow('PJ01-F04', 'semi', '竹段', 58, 'kg', null, 'excluded')]),
  pj01Op('PJ01-OP-GY-01-GX-02', 'GY-01', '竹筷成型工艺', 2, '生产制造', 'GX-02', '碳化', 2,
    [
      pdFlow('PJ01-F05', 'semi', '竹段', 58, 'kg', null, 'excluded'),
      pdFlow('PJ01-F06', 'energy', '电力', 42, 'kWh', FM.elec),
    ],
    [pdFlow('PJ01-F07', 'semi', '碳化竹段', 52, 'kg', null, 'excluded')]),
  pj01Op('PJ01-OP-GY-01-GX-03', 'GY-01', '竹筷成型工艺', 2, '生产制造', 'GX-03', '打磨成型', 3,
    [pdFlow('PJ01-F08', 'semi', '碳化竹段', 52, 'kg', null, 'excluded')],
    [
      pdFlow('PJ01-F09', 'semi', '成品筷（散）', 100, '双', null, 'excluded'),
      pdFlow('PJ01-F10', 'byproduct', '竹屑', 5, 'kg', FM.recycle),
    ]),
  /* 包装工序归属「竹筷成型工艺 / 生产制造」：与产品工艺绑定口径一致（一阶段一工艺） */
  pj01Op('PJ01-OP-GY-01-GX-04', 'GY-01', '竹筷成型工艺', 2, '生产制造', 'GX-04', '包装', 4,
    [
      pdFlow('PJ01-F11', 'semi', '成品筷（散）', 100, '双', null, 'excluded'),
      pdFlow('PJ01-F12', 'material', '纸包装材料', 2.5, 'kg', FM.mass),
    ],
    [pdFlow('PJ01-F13', 'product', '盒装竹筷', 1, '盒', null, 'excluded')]),
]

/** 项目 PJ01 的活动数据填报行（已填报 + 已匹配因子，可直接进入检测 / 核算） */
export const pcfActivitySeed: PcfActivityData[] = [
  {
    id: 'PJ01-OP-GY-00-GX-00-IN-PJ01-F01',
    projectId: 'PJ01',
    operationId: 'PJ01-OP-GY-00-GX-00',
    direction: 'input',
    flowName: '毛竹原竹（厂外运输）',
    flowType: 'material',
    formulaId: 'FMC002', formulaCode: 'FM-002', formulaName: '运输 t·km 法',
    formulaExpression: '周转量*排放因子',
    activityValues: [{ factorName: '周转量', unit: 't·km', refQty: 3.2, value: 3.2 }],
    requiresFactor: true,
    factorId: 'FAC04', factorName: '公路货运排放因子', factorValue: 0.036,
    allocateRatio: null,
  },
  {
    id: 'PJ01-OP-GY-01-GX-01-IN-PJ01-F03',
    projectId: 'PJ01',
    operationId: 'PJ01-OP-GY-01-GX-01',
    direction: 'input',
    flowName: '毛竹原竹',
    flowType: 'material',
    formulaId: 'FMC001', formulaCode: 'FM-001', formulaName: '因子法（质量口径）',
    formulaExpression: '活动量*排放因子',
    activityValues: [{ factorName: '活动量', unit: 'kg', refQty: 62, value: 62 }],
    requiresFactor: true,
    factorId: 'FAC03', factorName: '毛竹原材料排放因子', factorValue: 0.18,
    allocateRatio: null,
  },
  {
    id: 'PJ01-OP-GY-01-GX-02-IN-PJ01-F06',
    projectId: 'PJ01',
    operationId: 'PJ01-OP-GY-01-GX-02',
    direction: 'input',
    flowName: '电力',
    flowType: 'energy',
    formulaId: 'FMC004', formulaCode: 'FM-004', formulaName: '因子法（电力口径）',
    formulaExpression: '用电量*排放因子',
    activityValues: [{ factorName: '用电量', unit: 'kWh', refQty: 42, value: 42 }],
    requiresFactor: true,
    factorId: 'FAC01', factorName: '电力排放因子', factorValue: 0.581,
    allocateRatio: null,
  },
  {
    id: 'PJ01-OP-GY-01-GX-03-OUT-PJ01-F10',
    projectId: 'PJ01',
    operationId: 'PJ01-OP-GY-01-GX-03',
    direction: 'output',
    flowName: '竹屑',
    flowType: 'byproduct',
    formulaId: 'FMC006', formulaCode: 'FM-006', formulaName: '回收信用法',
    formulaExpression: '回收量*抵扣系数',
    activityValues: [{ factorName: '回收量', unit: 'kg', refQty: 5, value: 5 }],
    requiresFactor: false,
    factorId: null, factorName: '', factorValue: null,
    allocateRatio: 100,
  },
  {
    id: 'PJ01-OP-GY-01-GX-04-IN-PJ01-F12',
    projectId: 'PJ01',
    operationId: 'PJ01-OP-GY-01-GX-04',
    direction: 'input',
    flowName: '纸包装材料',
    flowType: 'material',
    formulaId: 'FMC001', formulaCode: 'FM-001', formulaName: '因子法（质量口径）',
    formulaExpression: '活动量*排放因子',
    activityValues: [{ factorName: '活动量', unit: 'kg', refQty: 2.5, value: 2.5 }],
    requiresFactor: true,
    factorId: 'FAC06', factorName: '纸包装材料排放因子', factorValue: 0.91,
    allocateRatio: null,
  },
]

/** 核算结果：演示项目 PJ01 为「待核算」态，进入步骤④点击「开始核算」后由系统真实计算产出 */
export const pcfCalcResultSeed: PcfCalcResult[] = []

/** 演示工序（报告编制中示例）：本期无 */
export const pcfDemoOperationSeed: PcfOperationConfig[] = []

/**
 * 演示核算项目：摇篮到大门、数据已填报、检测已过（待核算）。
 * 手算合计 40.4522 kgCO₂e：运输 0.1152 + 毛竹 11.16 + 电力 24.402 + 竹屑 2.5 + 包装 2.275。
 */
export const pcfProjectSeed: PcfProject[] = [
  {
    id: 'PJ01',
    code: 'PCF-20260901-001',
    name: '240mm 全竹碳化筷·摇篮到大门',
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
    conversionFactor: 1,
    boundary: 'gate',
    currentStep: 4,
    status: 'toCalc',
    remark: '',
    method: 'GB/T 24067-2018',
    methodId: 'STD-001',
    lifecycleStages: [
      { id: 'LS01', name: '原材料获取', level: 1, parentName: '', custom: false, rule: 'required', included: true },
      { id: 'LS02', name: '生产制造', level: 1, parentName: '', custom: false, rule: 'required', included: true },
    ],
    createdBy: '当前用户',
    createdAt: '2026-09-01 09:00',
    updatedAt: '2026-09-18 16:30',
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

/**
 * 核算方法候选（引用标准文件库 P05；标准文件库为占位页、无新增入口，保留最小集）。
 * 说明：该字典无创建 API，清空后步骤①「核算方法」无选项、无法保存，故保留最小集。
 */
export const pcfStandardOptionSeed: PcfStandardOption[] = [
  {
    id: 'STD-001',
    code: 'GB/T 24067',
    name: '温室气体 产品碳足迹 量化要求和指南',
    version: '2018',
    status: '现行',
  },
  {
    id: 'STD-002',
    code: 'ISO 14067',
    name: '温室气体—产品碳足迹—量化要求和准则',
    version: '2018',
    status: '现行',
  },
]
