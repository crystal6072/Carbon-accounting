/* ============================================================================
 * PCF 核算全链路模拟脚本（走查报告配套回归脚本；面向 mock 数据清空态基线，
 * 已加载 data.ts 演示种子数据时会自动跳过）
 *
 * 通过系统自身的 mock API 层（即所有页面实际调用的同一层）驱动：
 *   ① 后台基础数据录入（分类/行业/生命周期/单位/物料/能源/工序/工艺/产品/因子/公式）
 *   ② 前台核算五步闭环（新建项目 → 步骤①目标与范围 → 步骤②模型与数据
 *      → 步骤③数据检测 → 步骤④核算计算 → 步骤⑤报告生成与确认）
 *   ③ 异常场景（grave 边界 B5 拦截与修复、B1~B4 数据质量拦截与修复）
 *   ④ 前后台联动（因子禁用、产品下架、E13 回退重算、删除约束）
 *   ⑤ 选项断点（静态常量选项 vs Store 数据脱钩）
 * ========================================================================== */
import {
  // ---- 后台基础数据 ----
  createCategory,
  createIndustry,
  createLifecycleStage,
  createUnit,
  createMaterial,
  createEnergy,
  createOperation,
  createProcess,
  createProduct,
  updateProductUseStatus,
  createFactor,
  createCalcFormula,
  updateFactorStatus,
  fetchCategories,
  fetchIndustries,
  fetchLifecycleStages,
  fetchUnits,
  fetchMaterials,
  fetchEnergies,
  fetchOperations,
  fetchProcesses,
  fetchProducts,
  fetchProcessTemplates,
  fetchOperationTemplates,
  fetchUnitOptions,
  fetchIndustryOptions,
  fetchLifecycleOptions,
  fetchMaterialOptions,
  fetchEnergyOptions,
  fetchPcfWeightUnitOptions,
  fetchFactorFormOptions,
  // ---- 前台核算 ----
  fetchPcfCurrentUserOrg,
  fetchPcfOrgOptions,
  fetchPcfProductOptions,
  fetchPcfStandardOptions,
  createPcfProject,
  fetchPcfProject,
  fetchPcfProjectGroups,
  fetchPcfProjectsByProduct,
  deletePcfProject,
  updatePcfProjectStepOne,
  fetchPcfLifecycleBundle,
  fetchPcfFactorOptions,
  fetchPcfActivityData,
  updatePcfActivityData,
  addPcfOperation,
  addPcfProcess,
  removePcfOperation,
  submitPcfCheck,
  fetchPcfCheckResult,
  startPcfCalc,
  fetchPcfCalcResult,
  exportPcfResult,
  fetchPcfReportTemplates,
  fetchPcfReportDraft,
  fetchPcfReport,
  generatePcfReport,
  savePcfReportCover,
  updatePcfReportSection,
  confirmPcfReport,
  exportPcfReport,
  // ---- 我的产品库 ----
  createMyProduct,
  fetchMyProducts,
  fetchMyProductRefProjects,
  referenceBackendProducts,
} from './index'
import type { ProductPayload } from './index'

/* ------------------------------ 测试框架 ------------------------------ */
const stats = { pass: 0, fail: 0 }
const failures: string[] = []
const findings: string[] = []

function section(title: string): void {
  console.log(`\n\n================ ${title} ================`)
}
function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg)
}
function near(a: number, b: number, msg: string, eps = 1e-6): void {
  if (Math.abs(a - b) > eps) throw new Error(`${msg}（期望 ${b}，实际 ${a}）`)
}
async function T(name: string, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn()
    stats.pass++
    console.log(`  [PASS] ${name}`)
  } catch (error) {
    stats.fail++
    const msg = error instanceof Error ? error.message : String(error)
    failures.push(`${name} => ${msg}`)
    console.log(`  [FAIL] ${name} => ${msg}`)
  }
}
async function expectThrow(name: string, fn: () => Promise<unknown>, contains: string): Promise<void> {
  try {
    await fn()
    stats.fail++
    failures.push(`${name} => 预期抛错但执行成功`)
    console.log(`  [FAIL] ${name} => 预期抛错但执行成功`)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes(contains)) {
      stats.pass++
      console.log(`  [PASS] ${name} => 按预期拦截「${msg}」`)
    } else {
      stats.fail++
      failures.push(`${name} => 抛错信息不符: ${msg}（期望包含「${contains}」）`)
      console.log(`  [FAIL] ${name} => ${msg}`)
    }
  }
}
function finding(id: string, text: string): void {
  findings.push(`${id} ${text}`)
  console.log(`  [FINDING] ${id} ${text}`)
}

/* ------------------------------ 数据构造助手 ------------------------------ */
/** 产品侧投入产出流 */
const pf = (
  type: string,
  name: string,
  qty: number,
  unit: string,
  formulaId: string,
  disposal: 'formula' | 'excluded' = 'formula',
): any => ({
  id: '',
  type,
  name,
  qty,
  unit,
  formulaId,
  formulaCode: '',
  formulaName: '',
  formulaExpression: '',
  disposal,
})

/** 工序库投入产出流 */
const of = (
  flowType: string,
  refCode: string,
  refName: string,
  unit: string,
  formulaId: string,
  extra: { emissionCategory?: string; disposal?: 'formula' | 'excluded' } = {},
): any => ({
  flowType,
  refType: flowType === 'energy' ? 'energy' : 'material',
  refCode,
  refName,
  unit,
  emissionCategory: extra.emissionCategory,
  remark: '',
  formulaId,
  disposal: extra.disposal ?? 'formula',
})

/** 工序库工序载荷 */
const op = (code: string, name: string, type: string, inputs: any[], outputs: any[]): any => ({
  code,
  name,
  type,
  iconUrl: '',
  description: '',
  inputs,
  outputs,
})

/** 产品内工序副本 */
const opCopy = (code: string, name: string, seq: number, inputs: any[], outputs: any[]): any => ({
  id: '',
  code,
  name,
  seq,
  sourceCode: code,
  sourceCopiedAt: '',
  sourceUpdated: false,
  origin: 'template',
  inputs,
  outputs,
})

const ff = (
  id: string,
  name: string,
  sourceType: string,
  unit: string,
  extra: { sourceCode?: string; sourceName?: string; sourceLib?: string; value?: string } = {},
): any => ({
  id,
  name,
  sourceType,
  sourceLib: extra.sourceLib ?? '',
  sourceCode: extra.sourceCode ?? '',
  sourceName: extra.sourceName ?? '',
  value: extra.value ?? '',
  unit,
})

const coverFill = {
  reportDate: '2026-09-20',
  issuer: '福建竹业集团 · 工厂A1',
  address: '福建省南平市工业路 18 号',
  legalPerson: '李核算',
  contactPerson: '李核算',
  contactPhone: '0599-1234567',
  companyProfile: '专注竹制餐具与家居用品生产，年产竹制餐具 800 万件。',
  productFunction: '用于餐饮场景的竹制筷，可替代一次性塑料餐具。',
  productIntro: '以毛竹原竹经断料、碳化、打磨成型与包装制成。',
}
const sectionFill = {
  S06A: '本期核算覆盖原材料获取、生产制造两个阶段，生产制造阶段排放占比最高，主要来源为电力消耗与竹材加工工序。',
}

/** 步骤① 生命周期派生（复刻 ProjectStepOne.deriveStages 口径） */
async function deriveStages(boundary: 'gate' | 'grave', industryName: string): Promise<any[]> {
  const all = await fetchLifecycleStages()
  const ruleOf = (s: any) => (boundary === 'gate' ? s.gateRule : s.graveRule)
  return all
    .filter(
      (s: any) =>
        s.status === 'enabled' &&
        ruleOf(s) !== 'excluded' &&
        (s.industries.length === 0 || s.industries.includes(industryName)),
    )
    .sort((a: any, b: any) => a.order - b.order)
    .map((s: any) => ({
      id: s.id,
      name: s.name,
      level: s.level,
      parentName: '',
      custom: false,
      rule: ruleOf(s),
      included: true,
    }))
}

/* ================================ 主流程 ================================ */
async function main(): Promise<void> {
  /* 基线守卫：本脚本逐库造数，仅适用于 mock 数据清空态；已加载演示种子数据时跳过 */
  const [seededIndustries, seededProducts] = await Promise.all([fetchIndustries(), fetchProducts()])
  if (seededIndustries.length > 0 || seededProducts.length > 0) {
    console.log('检测到系统已加载演示数据（data.ts 种子），本脚本面向清空态基线，跳过执行。')
    console.log('演示数据状态的链路验证请使用针对性冒烟脚本（断言创建 / 读取 / 核算链路）。')
    return
  }

  /* ============ ① 后台基础数据录入（模拟后台管理各库维护） ============ */
  section('① 后台基础数据录入（分类/行业/生命周期/单位/物料/能源/工序/工艺/产品/因子/公式）')

  const industry = await createIndustry({
    code: 'IND-BAM',
    name: '竹制品制造',
    parentId: null,
    sortNo: 10,
    description: '竹制餐具与家居用品制造',
  })
  const category = await createCategory({
    code: 'BAM',
    name: '竹制餐具',
    parentId: null,
    sortNo: 10,
    remark: '一次性与家用竹制餐具',
  })
  console.log(`  行业 ${industry.code}${industry.name} / 分类 ${category.code}${category.name}`)

  const lcRaw = await createLifecycleStage({
    code: 'LC-01',
    name: '原材料获取',
    level: 1,
    parentId: null,
    order: 10,
    description: '原料获取与厂外运输',
    industries: [],
    gateRule: 'required',
    graveRule: 'required',
  })
  const lcProd = await createLifecycleStage({
    code: 'LC-02',
    name: '生产制造',
    level: 1,
    parentId: null,
    order: 20,
    description: '',
    industries: [],
    gateRule: 'required',
    graveRule: 'required',
  })
  const lcDist = await createLifecycleStage({
    code: 'LC-03',
    name: '分销',
    level: 1,
    parentId: null,
    order: 30,
    description: '',
    industries: [],
    gateRule: 'excluded',
    graveRule: 'required',
  })
  const lcUse = await createLifecycleStage({
    code: 'LC-04',
    name: '使用',
    level: 1,
    parentId: null,
    order: 40,
    description: '',
    industries: [],
    gateRule: 'excluded',
    graveRule: 'optional',
  })
  const lcEol = await createLifecycleStage({
    code: 'LC-05',
    name: '末期处理',
    level: 1,
    parentId: null,
    order: 50,
    description: '',
    industries: [],
    gateRule: 'excluded',
    graveRule: 'required',
  })
  console.log(`  生命周期阶段：原材料获取 / 生产制造 / 分销(grave) / 使用(grave) / 末期处理(grave)`)

  const uKg = await createUnit({ name: '千克', symbol: 'kg', unitType: 'weight', isBase: true, baseUnitId: null, factor: 1, remark: '' })
  await createUnit({ name: '吨', symbol: 't', unitType: 'weight', isBase: false, baseUnitId: uKg.id, factor: 1000, remark: '' })
  await createUnit({ name: '千瓦时', symbol: 'kWh', unitType: 'energy', isBase: true, baseUnitId: null, factor: 1, remark: '' })
  await createUnit({ name: '立方米', symbol: 'm³', unitType: 'volume', isBase: true, baseUnitId: null, factor: 1, remark: '' })
  await createUnit({ name: '千米', symbol: 'km', unitType: 'distance', isBase: true, baseUnitId: null, factor: 1, remark: '' })
  await createUnit({ name: '千克二氧化碳当量', symbol: 'kgCO₂e', unitType: 'carbon', isBase: true, baseUnitId: null, factor: 1, remark: '' })
  console.log('  计量单位：kg / t / kWh / m³ / km / kgCO₂e（kg/t/m³/km/kWh/kgCO₂e 均为基准单位）')

  await createMaterial({ code: 'M-001', name: '毛竹原竹', flowType: 'material', subCategory: 'raw', industries: ['竹制品制造'], description: '' })
  await createMaterial({ code: 'M-002', name: '竹板材', flowType: 'material', subCategory: 'raw', industries: ['竹制品制造'], description: '' })
  await createMaterial({ code: 'M-003', name: '纸包装材料', flowType: 'material', subCategory: 'packaging', industries: ['竹制品制造'], description: '' })
  await createMaterial({ code: 'M-004', name: '环保胶粘剂', flowType: 'material', subCategory: 'auxiliary', industries: ['竹制品制造'], description: '' })
  await createEnergy({ code: 'E-001', name: '电力', energyType: 'electricity', industries: ['竹制品制造'], description: '' })
  await createEnergy({ code: 'E-002', name: '天然气', energyType: 'fuel', industries: ['竹制品制造'], description: '' })
  console.log('  物料 4 条 / 能源 2 条')

  // 排放因子（后台预置 preset）
  const fElec = await createFactor({
    name: '电力排放因子', alias: '', category: 'energy', industries: ['竹制品制造'],
    scenario: '外购电力消耗', value: 0.581, numeratorUnit: 'kgCO₂e', denominatorUnit: 'kWh',
    sourceCategory: '国家温室气体清单', publishYear: '2023', publishDate: '2023-12',
    publisherRegion: '中国', publisherFullName: '生态环境部', publisherShortName: '',
    dataSourceFile: '', description: '', source: 'preset',
  })
  const fGas = await createFactor({
    name: '天然气排放因子', alias: '', category: 'energy', industries: ['竹制品制造'],
    scenario: '天然气燃烧', value: 2.1622, numeratorUnit: 'kgCO₂e', denominatorUnit: 'm³',
    sourceCategory: '国家温室气体清单', publishYear: '2023', publishDate: '2023-12',
    publisherRegion: '中国', publisherFullName: '生态环境部', publisherShortName: '',
    dataSourceFile: '', description: '', source: 'preset',
  })
  const fBamboo = await createFactor({
    name: '毛竹原材料排放因子', alias: '', category: 'material', industries: ['竹制品制造'],
    scenario: '毛竹原竹获取', value: 0.18, numeratorUnit: 'kgCO₂e', denominatorUnit: 'kg',
    sourceCategory: '行业研究报告', publishYear: '2022', publishDate: '2022-06',
    publisherRegion: '中国', publisherFullName: '中国林产工业协会', publisherShortName: '',
    dataSourceFile: '', description: '', source: 'preset',
  })
  const fTrans = await createFactor({
    name: '公路货运排放因子', alias: '', category: 'transport', industries: ['竹制品制造'],
    scenario: '公路货物运输', value: 0.036, numeratorUnit: 'kgCO₂e', denominatorUnit: 't·km',
    sourceCategory: '国家温室气体清单', publishYear: '2023', publishDate: '2023-12',
    publisherRegion: '中国', publisherFullName: '生态环境部', publisherShortName: '',
    dataSourceFile: '', description: '', source: 'preset',
  })
  const fWater = await createFactor({
    name: '废水处理排放因子', alias: '', category: 'waste', industries: ['竹制品制造'],
    scenario: '工业废水处理', value: 0.52, numeratorUnit: 'kgCO₂e', denominatorUnit: 'kg',
    sourceCategory: '行业研究报告', publishYear: '2021', publishDate: '2021-09',
    publisherRegion: '中国', publisherFullName: '生态环境部', publisherShortName: '',
    dataSourceFile: '', description: '', source: 'preset',
  })
  const fPack = await createFactor({
    name: '纸包装材料排放因子', alias: '', category: 'material', industries: ['竹制品制造'],
    scenario: '外购纸包装材料', value: 0.91, numeratorUnit: 'kgCO₂e', denominatorUnit: 'kg',
    sourceCategory: '行业研究报告', publishYear: '2022', publishDate: '2022-06',
    publisherRegion: '中国', publisherFullName: '中国包装联合会', publisherShortName: '',
    dataSourceFile: '', description: '', source: 'preset',
  })
  console.log(`  排放因子：${[fElec, fGas, fBamboo, fTrans, fWater, fPack].map((f) => `${f.code} ${f.name}(${f.value} ${f.numeratorUnit}/${f.denominatorUnit})`).join('；')}`)

  // 计算公式（按 FM-001 起顺序创建，编码与「流→公式」默认带出规则对齐）
  const formulaBase = {
    industries: ['竹制品制造'],
    resultName: '碳排放量',
    resultUnit: 'kgCO₂e',
    supportsSumLoop: false,
    supportsNegativeResult: false,
    dataOwnerType: 'preset' as const,
    description: '',
  }
  const fmMass = await createCalcFormula({
    ...formulaBase, name: '因子法（质量口径）', formulaType: 'factor',
    expression: '活动量*排放因子',
    factors: [
      ff('FF-1A', '活动量', 'activity', 'kg'),
      ff('FF-1B', '排放因子', 'parameter', 'kgCO₂e/kg', { sourceLib: '排放因子库', sourceCode: fBamboo.code, sourceName: fBamboo.name }),
    ],
  })
  const fmTrans = await createCalcFormula({
    ...formulaBase, name: '运输 t·km 法', formulaType: 'other',
    expression: '周转量*排放因子',
    factors: [
      ff('FF-2A', '周转量', 'activity', 't·km'),
      ff('FF-2B', '排放因子', 'parameter', 'kgCO₂e/t·km', { sourceLib: '排放因子库', sourceCode: fTrans.code, sourceName: fTrans.name }),
    ],
  })
  await createCalcFormula({
    ...formulaBase, name: '燃料燃烧法', formulaType: 'carbon',
    expression: '消耗量*排放因子',
    factors: [
      ff('FF-3A', '消耗量', 'activity', 'm³'),
      ff('FF-3B', '排放因子', 'parameter', 'kgCO₂e/m³', { sourceLib: '排放因子库', sourceCode: fGas.code, sourceName: fGas.name }),
    ],
  })
  const fmElec = await createCalcFormula({
    ...formulaBase, name: '因子法（电力口径）', formulaType: 'energy',
    expression: '用电量*排放因子',
    factors: [
      ff('FF-4A', '用电量', 'activity', 'kWh'),
      ff('FF-4B', '排放因子', 'parameter', 'kgCO₂e/kWh', { sourceLib: '排放因子库', sourceCode: fElec.code, sourceName: fElec.name }),
    ],
  })
  const fmWater = await createCalcFormula({
    ...formulaBase, name: '因子法（废水口径）', formulaType: 'factor',
    expression: '处理量*排放因子',
    factors: [
      ff('FF-5A', '处理量', 'activity', 'kg'),
      ff('FF-5B', '排放因子', 'parameter', 'kgCO₂e/kg', { sourceLib: '排放因子库', sourceCode: fWater.code, sourceName: fWater.name }),
    ],
  })
  const fmRecycle = await createCalcFormula({
    ...formulaBase, name: '回收信用法', formulaType: 'factor',
    expression: '回收量*抵扣系数',
    factors: [
      ff('FF-6A', '回收量', 'activity', 'kg'),
      ff('FF-6B', '抵扣系数', 'constant', 'kgCO₂e/kg', { value: '0.5' }),
    ],
  })
  const fmNoFactor = await createCalcFormula({
    ...formulaBase, name: '活动数据法（无默认因子）', formulaType: 'factor',
    expression: '活动量*排放因子',
    factors: [
      ff('FF-7A', '活动量', 'activity', 'kg'),
      ff('FF-7B', '排放因子', 'parameter', 'kgCO₂e/kg', { sourceLib: '排放因子库', sourceCode: '', sourceName: '' }),
    ],
  })
  console.log(`  计算公式：${[fmMass, fmTrans, fmElec, fmWater, fmRecycle, fmNoFactor].map((f) => f.code).join(' / ')}（共 7 条）`)

  // 工序库
  await createOperation(op('GX-00', '厂外运输', 'auxiliary',
    [of('material', 'M-001', '毛竹原竹（厂外运输）', 't·km', fmTrans.id)],
    [of('material', 'M-901', '集后毛竹', 'kg', '', { disposal: 'excluded' })]))
  await createOperation(op('GX-01', '断料', 'main',
    [of('material', 'M-001', '毛竹原竹', 'kg', fmMass.id)],
    [of('material', 'M-902', '竹段', 'kg', '', { disposal: 'excluded' })]))
  await createOperation(op('GX-02', '碳化', 'main',
    [of('material', 'M-902', '竹段', 'kg', '', { disposal: 'excluded' }), of('energy', 'E-001', '电力', 'kWh', fmElec.id)],
    [of('material', 'M-903', '碳化竹段', 'kg', '', { disposal: 'excluded' })]))
  await createOperation(op('GX-03', '打磨成型', 'main',
    [of('material', 'M-903', '碳化竹段', 'kg', '', { disposal: 'excluded' })],
    [of('material', 'M-904', '成品筷（散）', '双', '', { disposal: 'excluded' }), of('material', 'M-905', '竹屑', 'kg', fmRecycle.id)]))
  await createOperation(op('GX-04', '包装', 'auxiliary',
    [of('material', 'M-904', '成品筷（散）', '双', '', { disposal: 'excluded' }), of('material', 'M-003', '纸包装材料', 'kg', fmMass.id)],
    [of('material', 'M-906', '盒装竹筷', '盒', '', { disposal: 'excluded' })]))
  await createOperation(op('GX-06', '厂内废水处理', 'disposal',
    [of('material', 'M-907', '生产废水', 'kg', fmWater.id, { emissionCategory: 'wastewater' })],
    [of('material', 'M-908', '净化污泥', 'kg', fmRecycle.id)]))
  await createOperation(op('GX-07', '试剂添加', 'auxiliary',
    [of('material', 'M-004', '环保胶粘剂', 'kg', fmNoFactor.id)],
    [of('material', 'M-909', '混合料', 'kg', '', { disposal: 'excluded' })]))
  await createOperation(op('GX-08', '分切', 'auxiliary',
    [of('material', 'M-909', '混合料', 'kg', '', { disposal: 'excluded' })],
    [of('material', 'M-910', '竹签', '包', '', { disposal: 'excluded' }), of('material', 'M-911', '竹粉', 'kg', fmRecycle.id)]))
  console.log('  工序 8 条（GX-00/01/02/03/04/06/07/08，GX-07 用于 B2 演示、GX-08 用于 B3 演示）')

  // 工艺流程（工艺库）
  await createProcess({
    code: 'GY-00', name: '采购与运输工艺', categoryId: category.id, industry: '竹制品制造',
    lifecycleStage: '原材料获取', description: '毛竹采购与厂外运输', baseQty: null, baseUnit: '',
    operations: [{ order: 1, opCode: 'GX-00', opName: '厂外运输', remark: '' }],
  })
  await createProcess({
    code: 'GY-01', name: '竹筷成型工艺', categoryId: category.id, industry: '竹制品制造',
    lifecycleStage: '生产制造', description: '断料-碳化-打磨成型', baseQty: null, baseUnit: '',
    operations: [
      { order: 1, opCode: 'GX-01', opName: '断料', remark: '' },
      { order: 2, opCode: 'GX-02', opName: '碳化', remark: '' },
      { order: 3, opCode: 'GX-03', opName: '打磨成型', remark: '' },
    ],
  })
  await createProcess({
    code: 'GY-02', name: '包装工艺', categoryId: category.id, industry: '竹制品制造',
    lifecycleStage: '生产制造', description: '纸盒包装', baseQty: null, baseUnit: '',
    operations: [{ order: 1, opCode: 'GX-04', opName: '包装', remark: '' }],
  })
  await createProcess({
    code: 'GY-03', name: '废水处理工艺', categoryId: category.id, industry: '竹制品制造',
    lifecycleStage: '末期处理', description: '厂内废水处理', baseQty: null, baseUnit: '',
    operations: [{ order: 1, opCode: 'GX-06', opName: '厂内废水处理', remark: '' }],
  })

  // 产品信息库（新建默认下架，需上架后才可发起核算）
  const productPayload: ProductPayload = {
    code: 'P-2026-001',
    name: '240mm 全竹碳化筷',
    categoryId: category.id,
    model: 'ZKM-240',
    spec: '240mm·100 双/盒',
    unit: '双',
    industry: '竹制品制造',
    imageUrl: '',
    description: '以毛竹为原料的碳化筷',
    processes: [
      {
        id: '', processCode: 'GY-00', processName: '采购与运输工艺', lifecycleStage: '原材料获取', seq: 1,
        operations: [opCopy('GX-00', '厂外运输', 1,
          [pf('material', '毛竹原竹（厂外运输）', 3.2, 't·km', fmTrans.id)],
          [pf('material', '集后毛竹', 1, 'kg', '', 'excluded')])],
      },
      {
        id: '', processCode: 'GY-01', processName: '竹筷成型工艺', lifecycleStage: '生产制造', seq: 2,
        operations: [
          opCopy('GX-01', '断料', 1,
            [pf('material', '毛竹原竹', 62, 'kg', fmMass.id)],
            [pf('material', '竹段', 58, 'kg', '', 'excluded')]),
          opCopy('GX-02', '碳化', 2,
            [pf('material', '竹段', 58, 'kg', '', 'excluded'), pf('energy', '电力', 42, 'kWh', fmElec.id)],
            [pf('material', '碳化竹段', 52, 'kg', '', 'excluded')]),
          opCopy('GX-03', '打磨成型', 3,
            [pf('material', '碳化竹段', 52, 'kg', '', 'excluded')],
            [pf('material', '成品筷（散）', 100, '双', '', 'excluded'), pf('material', '竹屑', 5, 'kg', fmRecycle.id)]),
          /* 同一生命周期阶段只绑定一个工艺流程：包装工序并入「竹筷成型工艺 / 生产制造」 */
          opCopy('GX-04', '包装', 4,
            [pf('material', '成品筷（散）', 100, '双', '', 'excluded'), pf('material', '纸包装材料', 2.5, 'kg', fmMass.id)],
            [pf('product', '盒装竹筷', 1, '盒', '', 'excluded')]),
        ],
      },
    ],
  }
  const product = await createProduct(productPayload)
  const productOn = await updateProductUseStatus(product.id, 'on')
  assert(productOn.useStatus === 'on', '产品上架失败')
  console.log(`  产品 ${product.code} ${product.name}（${product.unit}）已上架，含 ${product.processes.length} 个工艺流程`)

  // 后台数据体检
  await T('后台库数据落库（分类1/行业1/阶段5/单位6/物料4/能源2/工序8/工艺4/产品1/因子6/公式7）', async () => {
    const [cats, inds, lcs, units, mats, enes, ops, prcs, prods] = await Promise.all([
      fetchCategories(), fetchIndustries(), fetchLifecycleStages(), fetchUnits(), fetchMaterials(),
      fetchEnergies(), fetchOperations(), fetchProcesses(), fetchProducts(),
    ])
    const ok = cats.length === 1 && inds.length === 1 && lcs.length === 5 && units.length === 6 &&
      mats.length === 4 && enes.length === 2 && ops.length === 8 && prcs.length === 4 && prods.length === 1
    assert(ok, `实际：分类${cats.length} 行业${inds.length} 阶段${lcs.length} 单位${units.length} 物料${mats.length} 能源${enes.length} 工序${ops.length} 工艺${prcs.length} 产品${prods.length}`)
  })
  await T('工序/工艺模板接口由 Store 动态派生（下拉数据源）', async () => {
    const [opTpl, prTpl] = await Promise.all([fetchOperationTemplates(), fetchProcessTemplates()])
    assert(opTpl.length === 8, `工序模板 ${opTpl.length} 条`)
    assert(prTpl.length === 4, `工艺模板 ${prTpl.length} 条`)
    const gy01 = prTpl.find((p: any) => p.code === 'GY-01')
    assert(gy01 && gy01.operations.length === 3, 'GY-01 应带出 3 道工序')
  })

  /* ============ ② 场景一：标准闭环（平台产品 + gate 边界 + 数据完备） ============ */
  section('② 场景一：标准闭环（摇篮到大门 / 平台产品库产品 / 数据完备）')
  const org = await fetchPcfCurrentUserOrg()
  const orgOptions = await fetchPcfOrgOptions()
  assert(org && org.name, '当前用户组织为空')
  console.log(`  当前核算主体：${org.name}；组织选项 ${orgOptions.length} 个`)
  const stdOptions = await fetchPcfStandardOptions()
  assert(stdOptions.length === 2 && stdOptions.some((s) => s.id === 'STD-001'), '核算方法选项异常')

  const projA = await createPcfProject({
    name: '240mm 全竹碳化筷·摇篮到大门',
    ownerOrg: org.name, startDate: '2026-01-01', endDate: '2026-12-31',
    boundary: 'gate', remark: '', productSource: 'library',
    refProductId: product.id, productName: product.name, productSpec: product.spec,
    functionalUnit: product.unit,
  })
  console.log(`  项目 ${projA.code} 创建成功（status=${projA.status}, step=${projA.currentStep}）`)
  await T('新建项目按边界 + 行业带出默认生命周期阶段', async () => {
    const names = (projA.lifecycleStages ?? []).map((s: any) => `${s.name}(${s.rule},${s.included ? '纳入' : '排除'})`)
    assert(names.length === 2 && names[0].startsWith('原材料获取') && names[1].startsWith('生产制造'),
      `实际带出：${names.join('、')}`)
  })

  await T('步骤① 目标与范围保存（含核算方法 / 功能单位 / 阶段勾选）', async () => {
    const derived = await deriveStages('gate', product.industry)
    const saved = await updatePcfProjectStepOne(projA.id, {
      name: projA.name, ownerOrg: projA.ownerOrg, startDate: projA.startDate, endDate: projA.endDate,
      remark: '', boundary: 'gate', methodId: 'STD-001', refProductId: product.id,
      productCode: product.code, productName: product.name, productModel: product.model,
      productSpec: product.spec, productCategory: '竹制餐具', productIndustry: product.industry,
      productVersion: 'V1.0', functionalUnit: product.unit, conversionFactor: 1, lifecycleStages: derived,
    })
    assert(saved.currentStep === 2, `步骤应推进到 2，实际 ${saved.currentStep}`)
    assert(saved.method === 'GB/T 24067-2018', `核算方法回写异常：${saved.method}`)
    assert((saved.lifecycleStages ?? []).length === 2, '阶段数量异常')
  })

  const bundleA = await fetchPcfLifecycleBundle(projA.id)
  console.log(`  步骤② 引用即复制工序 ${bundleA.operations.length} 道：${bundleA.operations.map((o: any) => `${o.processName}/${o.opName}(${o.processStage})`).join('、')}`)
  await T('产品工艺按纳入阶段复制进项目（引用即复制、阶段对齐）', async () => {
    assert(bundleA.operations.length === 5, `应复制 5 道工序，实际 ${bundleA.operations.length}`)
    const stages = new Set(bundleA.operations.map((o: any) => o.processStage))
    assert(stages.has('原材料获取') && stages.has('生产制造'), `阶段集合异常：${[...stages].join('/')}`)
    const elec = bundleA.operations.find((o: any) => o.opName === '碳化')
    assert(elec && elec.inputs.some((i: any) => i.name === '电力' && i.formulaCode), '公式未随工序带入')
  })

  const rowsA = await fetchPcfActivityData(projA.id)
  console.log(`  活动数据填报行 ${rowsA.length} 条：${rowsA.map((r: any) => `${r.opName}/${r.flowName}[${r.requiresFactor ? '需因子' : '免因子'}]`).join('、')}`)
  const fillA: Record<string, { values: number[]; factor?: any }> = {
    '毛竹原竹（厂外运输）': { values: [3.2], factor: fTrans },
    '毛竹原竹': { values: [62], factor: fBamboo },
    '电力': { values: [42], factor: fElec },
    '纸包装材料': { values: [2.5], factor: fPack },
    '竹屑': { values: [5] },
  }
  const payloadA = rowsA.map((r: any) => {
    const plan = fillA[r.flowName]
    if (!plan) throw new Error(`未规划的填报行：${r.flowName}`)
    return {
      id: r.id,
      activityValues: r.activityValues.map((av: any, i: number) => ({ factorName: av.factorName, value: plan.values[i] ?? null })),
      factorId: plan.factor ? plan.factor.id : null,
      allocateRatio: r.direction === 'output' ? 100 : null,
    }
  })
  await expectThrow('保存拦截：存在未填写活动量', () =>
    updatePcfActivityData(projA.id, payloadA.map((p: any, i: number) => (i === 0 ? { ...p, activityValues: p.activityValues.map((av: any) => ({ ...av, value: null })) } : p))), '未填写的活动量')
  await expectThrow('保存拦截：投入项未匹配排放来源', () =>
    updatePcfActivityData(projA.id, payloadA.map((p: any) => (p.factorId ? { ...p, factorId: null } : p))), '未匹配排放来源')
  await expectThrow('保存拦截：多产出分配比例不闭合', () =>
    updatePcfActivityData(projA.id, payloadA.map((p: any) => (p.allocateRatio != null ? { ...p, allocateRatio: 60 } : p))), '分配比例合计须为 100%')
  await T('步骤② 保存活动数据 + 因子匹配 + 分配比例', async () => {
    await updatePcfActivityData(projA.id, payloadA)
    const proj = await fetchPcfProject(projA.id)
    assert(proj.currentStep === 3, `步骤应推进到 3，实际 ${proj.currentStep}`)
  })

  const checkA = await submitPcfCheck(projA.id)
  console.log(`  步骤③ 检测结果：${checkA.status}（阻断 ${checkA.blockingCount} / 提示 ${checkA.warningCount}）${checkA.issues.map((i: any) => i.title).join('；')}`)
  await T('步骤③ 数据检测通过 → 项目进入「待核算」', async () => {
    assert(checkA.status === 'passed', `检测未通过：${checkA.issues.map((i: any) => i.title).join('；')}`)
    const proj = await fetchPcfProject(projA.id)
    assert(proj.status === 'toCalc', `项目状态应为 toCalc，实际 ${proj.status}`)
    assert(proj.currentStep === 4, `步骤应为 4，实际 ${proj.currentStep}`)
  })
  await T('检测记录可回查（fetchPcfCheckResult）', async () => {
    const again = await fetchPcfCheckResult(projA.id)
    assert(again.status === 'passed', '回查检测结果异常')
  })

  const calcA = await startPcfCalc(projA.id)
  console.log(`  步骤④ 核算结果 V${calcA.version}：合计 ${calcA.totalEmission} ${calcA.unit}；阶段 ${calcA.stageSummary.map((s: any) => `${s.stage} ${s.emission}(${s.ratio}%)`).join('、')}；排放源 ${calcA.sourceSummary.map((s: any) => `${s.source} ${s.emission}(${s.ratio}%)`).join('、')}`)
  await T('步骤④ 核算计算（排放 = 活动量 × 因子值）', async () => {
    const expected = 3.2 * 0.036 + 62 * 0.18 + 42 * 0.581 + 5 * 0.5 + 2.5 * 0.91
    near(calcA.totalEmission, expected, '核算合计与手算不一致')
    assert(calcA.version === 1, '首次核算版本应为 1')
    assert(calcA.operationSummary.length === 5, `工序汇总应 5 行，实际 ${calcA.operationSummary.length}`)
    const byStage = Object.fromEntries(calcA.stageSummary.map((s: any) => [s.stage, s.emission]))
    near(byStage['原材料获取'], 0.1152, '原材料获取阶段排放')
    near(byStage['生产制造'], 40.337, '生产制造阶段排放')
    const proj = await fetchPcfProject(projA.id)
    assert(proj.status === 'calculated', `项目状态应为 calculated，实际 ${proj.status}`)
  })
  await T('核算结果 CSV 导出（exportPcfResult，仅明细行、无合计行）', async () => {
    const { filename, content } = await exportPcfResult(projA.id)
    assert(filename.includes('PCF'), '文件名异常')
    assert(content.includes('11.1600'), 'CSV 未包含断料工序排放明细')
    assert(content.includes('24.4020'), 'CSV 未包含碳化工序排放明细')
    assert(!content.includes('合计') && !content.includes('40.4522'), 'CSV 不应包含合计（当前实现只有明细）')
    assert(content.split('\n').length === 6, `CSV 应 1 表头 + 5 明细，实际 ${content.split('\n').length} 行`)
  })

  await T('步骤⑤ 报告生成（模板 + 封面 + 章节）', async () => {
    const templates = await fetchPcfReportTemplates()
    assert(templates.length === 1 && templates[0].status === '启用', '报告模板选项异常')
    await fetchPcfReportDraft(projA.id, templates[0].templateId)
    const report = await generatePcfReport(projA.id, templates[0].templateId, { cover: coverFill, sections: sectionFill })
    assert(report.cover.productName === product.name, '封面产品名称未带出')
    assert(report.sections.every((s: any) => s.content.trim()), '存在空章节')
    const proj = await fetchPcfProject(projA.id)
    assert(proj.status === 'reportEditing', `项目状态应为 reportEditing，实际 ${proj.status}`)
    assert(proj.currentStep === 5, '步骤应推进到 5')
  })
  await T('报告保存草稿（封面 + 单章节）', async () => {
    await savePcfReportCover(projA.id, { address: '福建省南平市工业路 18 号' })
    await updatePcfReportSection(projA.id, 'S06A', sectionFill.S06A + '（补充）')
    const report = await fetchPcfReport(projA.id)
    const s06a = report?.sections.find((s: any) => s.id === 'S06A')
    assert(s06a && s06a.content.includes('补充'), '章节内容未更新')
  })
  const reportA = await confirmPcfReport(projA.id)
  console.log(`  报告 ${reportA.reportNo} 已确认锁定（status=${reportA.status}, locked=${reportA.locked}）`)
  await T('步骤⑤ 确认完成 → 报告锁定、项目「已完成」', async () => {
    assert(reportA.locked === true, '报告未锁定')
    assert(reportA.status === 'done', '报告状态应为 done')
    const proj = await fetchPcfProject(projA.id)
    assert(proj.status === 'done', `项目状态应为 done，实际 ${proj.status}`)
    assert(proj.currentStep === 5, '步骤应为 5')
  })
  await T('报告导出 doc（exportPcfReport）', async () => {
    const { filename, content } = await exportPcfReport(projA.id)
    assert(filename.endsWith('.doc'), '报告文件名异常')
    assert(content.includes(product.name) && content.includes('40.4522'), '报告内容缺少产品名或核算结果')
  })

  /* ============ ③ 场景二：摇篮到坟墓（grave）+ B5 拦截与修复 ============ */
  section('③ 场景二：摇篮到坟墓（grave 边界）+ 阶段覆盖拦截与修复')
  const projB = await createPcfProject({
    name: '240mm 全竹碳化筷·摇篮到坟墓',
    ownerOrg: org.name, startDate: '2026-01-01', endDate: '2026-12-31',
    boundary: 'grave', remark: '', productSource: 'library',
    refProductId: product.id, productName: product.name, productSpec: product.spec,
    functionalUnit: product.unit,
  })
  console.log(`  项目 ${projB.code}（grave）默认带出阶段：${(projB.lifecycleStages ?? []).map((s: any) => `${s.name}(${s.rule})`).join('、')}`)
  await T('grave 边界默认带出 5 个阶段（含分销/使用/末期处理）', async () => {
    assert((projB.lifecycleStages ?? []).length === 5, `应带出 5 个阶段，实际 ${(projB.lifecycleStages ?? []).length}`)
  })
  const derivedB = await deriveStages('grave', product.industry)
  await updatePcfProjectStepOne(projB.id, {
    name: projB.name, ownerOrg: projB.ownerOrg, startDate: projB.startDate, endDate: projB.endDate,
    remark: '', boundary: 'grave', methodId: 'STD-001', refProductId: product.id,
    productCode: product.code, productName: product.name, productModel: product.model,
    productSpec: product.spec, productCategory: '竹制餐具', productIndustry: product.industry,
    productVersion: 'V1.0', functionalUnit: product.unit, conversionFactor: 1, lifecycleStages: derivedB,
  })
  const bundleB = await fetchPcfLifecycleBundle(projB.id)
  const rowsB0 = await fetchPcfActivityData(projB.id)
  const fillB: Record<string, { values: number[]; factor?: any }> = {
    '毛竹原竹（厂外运输）': { values: [3.2], factor: fTrans },
    '毛竹原竹': { values: [62], factor: fBamboo },
    '电力': { values: [42], factor: fElec },
    '纸包装材料': { values: [2.5], factor: fPack },
    '竹屑': { values: [5] },
  }
  await updatePcfActivityData(projB.id, rowsB0.map((r: any) => {
    const plan = fillB[r.flowName]
    return {
      id: r.id,
      activityValues: r.activityValues.map((av: any, i: number) => ({ factorName: av.factorName, value: plan.values[i] ?? null })),
      factorId: plan.factor ? plan.factor.id : null,
      allocateRatio: r.direction === 'output' ? 100 : null,
    }
  }))
  const checkB = await submitPcfCheck(projB.id)
  console.log(`  首次检测：${checkB.status}，问题 ${checkB.issues.length} 条：${checkB.issues.map((i: any) => `[${i.category}]${i.title}`).join('；')}`)
  await T('B5 拦截：纳入但无工序数据的阶段被检出（分销/使用/末期处理）', async () => {
    assert(checkB.status === 'failed', '应检测不通过')
    const b5 = checkB.issues.filter((i: any) => i.category === 'stageCoverage')
    assert(b5.length === 3, `应检出 3 个阶段覆盖问题，实际 ${b5.length}`)
  })

  // 修复方式一：从工艺流程库补充末期处理工艺（addPcfProcess）
  const added = await addPcfProcess(projB.id, 'GY-03')
  console.log(`  addPcfProcess(GY-03) 追加工序 ${added.length} 道：${added.map((o: any) => `${o.processName}/${o.opName}(${o.processStage})`).join('、')}`)
  // 修复方式二：取消勾选暂不覆盖的分销 / 使用阶段
  const stagesFixed = derivedB.map((s: any) => ({ ...s, included: s.name === '分销' || s.name === '使用' ? false : s.included }))
  await updatePcfProjectStepOne(projB.id, {
    name: projB.name, ownerOrg: projB.ownerOrg, startDate: projB.startDate, endDate: projB.endDate,
    remark: '', boundary: 'grave', methodId: 'STD-001', refProductId: product.id,
    productCode: product.code, productName: product.name, productModel: product.model,
    productSpec: product.spec, productCategory: '竹制餐具', productIndustry: product.industry,
    productVersion: 'V1.0', functionalUnit: product.unit, conversionFactor: 1, lifecycleStages: stagesFixed,
  })
  const rowsB = await fetchPcfActivityData(projB.id)
  console.log(`  修复后填报行 ${rowsB.length} 条（含废水处理工序新增行）`)
  await T('新增工序后自动生成填报行（懒初始化）', async () => {
    const names = rowsB.map((r: any) => r.flowName)
    assert(names.includes('生产废水') && names.includes('净化污泥'), `缺少废水处理工序行：${names.join('、')}`)
  })
  await updatePcfActivityData(projB.id, rowsB.map((r: any) => {
    const plan = fillB[r.flowName] ?? ({ '生产废水': { values: [8.4], factor: fWater }, '净化污泥': { values: [3] } } as any)[r.flowName]
    return {
      id: r.id,
      activityValues: r.activityValues.map((av: any, i: number) => ({ factorName: av.factorName, value: plan.values[i] ?? null })),
      factorId: plan.factor ? plan.factor.id : null,
      allocateRatio: r.direction === 'output' ? 100 : null,
    }
  }))
  const checkB2 = await submitPcfCheck(projB.id)
  await T('修复后检测通过 → 核算 → 报告闭环', async () => {
    assert(checkB2.status === 'passed', `仍未通过：${checkB2.issues.map((i: any) => i.title).join('；')}`)
    const calcB = await startPcfCalc(projB.id)
    const expected = 3.2 * 0.036 + 62 * 0.18 + 42 * 0.581 + 5 * 0.5 + 2.5 * 0.91 + 8.4 * 0.52 + 3 * 0.5
    near(calcB.totalEmission, expected, 'grave 场景核算合计与手算不一致')
    const eol = calcB.stageSummary.find((s: any) => s.stage === '末期处理')
    assert(eol && near2(eol.emission, 4.368 + 1.5), `末期处理阶段排放异常：${JSON.stringify(eol)}`)
    const reportB = await generatePcfReport(projB.id, 'RPT-PCF-001', { cover: coverFill, sections: sectionFill })
    assert(reportB.cover.productName === product.name, '报告封面异常')
    const confirmed = await confirmPcfReport(projB.id)
    assert(confirmed.status === 'done' && confirmed.locked, 'grave 场景报告未完成')
    console.log(`  grave 核算合计 ${calcB.totalEmission} kgCO₂e（末期处理 ${eol?.emission}）`)
  })
  function near2(a: number, b: number): boolean {
    return Math.abs(a - b) < 1e-6
  }

  /* ============ ④ 场景三：数据质量拦截（B1~B4）与修复 ============ */
  section('④ 场景三：数据质量拦截（B1 活动量缺失 / B2 因子未匹配 / B3 分配比例 / B4 因子单位）与修复')
  const projC = await createPcfProject({
    name: '240mm 全竹碳化筷·数据质量演练',
    ownerOrg: org.name, startDate: '2026-01-01', endDate: '2026-12-31',
    boundary: 'gate', remark: '', productSource: 'library',
    refProductId: product.id, productName: product.name, productSpec: product.spec,
    functionalUnit: product.unit,
  })
  await updatePcfProjectStepOne(projC.id, {
    name: projC.name, ownerOrg: projC.ownerOrg, startDate: projC.startDate, endDate: projC.endDate,
    remark: '', boundary: 'gate', methodId: 'STD-001', refProductId: product.id,
    productCode: product.code, productName: product.name, productModel: product.model,
    productSpec: product.spec, productCategory: '竹制餐具', productIndustry: product.industry,
    productVersion: 'V1.0', functionalUnit: product.unit, conversionFactor: 1,
    lifecycleStages: await deriveStages('gate', product.industry),
  })
  // 先保存完备数据，再追加两道「问题工序」制造异常
  await fetchPcfLifecycleBundle(projC.id) // 触发项目工序副本懒初始化（与步骤②页面加载同口径）
  const rowsC0 = await fetchPcfActivityData(projC.id)
  await updatePcfActivityData(projC.id, rowsC0.map((r: any) => {
    const plan = fillA[r.flowName]
    return {
      id: r.id,
      activityValues: r.activityValues.map((av: any, i: number) => ({ factorName: av.factorName, value: plan.values[i] ?? null })),
      factorId: plan.factor ? plan.factor.id : null,
      allocateRatio: r.direction === 'output' ? 100 : null,
    }
  }))
  await addPcfOperation(projC.id, { opCode: 'GX-07', stage: '生产制造' }) // 无默认因子 → B1+B2
  await addPcfOperation(projC.id, { opCode: 'GX-08', stage: '生产制造' }) // 多产出未分配 → B1+B3
  const rowsC = await fetchPcfActivityData(projC.id)
  const checkC = await submitPcfCheck(projC.id)
  console.log(`  检测：${checkC.status}，问题 ${checkC.issues.length} 条：${checkC.issues.map((i: any) => `[${i.level}/${i.category}]${i.title}`).join('；')}`)
  await T('B1/B2/B3 异常被检测拦截（新增未填工序）', async () => {
    assert(checkC.status === 'failed', '应检测不通过')
    const cats = new Set(checkC.issues.map((i: any) => i.category))
    assert(cats.has('completeness'), '缺少完整性类问题（B1/B2）')
    assert(cats.has('allocation'), '缺少分配比例类问题（B3）')
    assert(checkC.issues.some((i: any) => i.title.includes('环保胶粘剂')), '未检出 GX-07 环保胶粘剂的因子未匹配')
    assert(checkC.issues.some((i: any) => i.title.includes('竹粉') || i.title.includes('分切')), '未检出 GX-08 分配比例问题')
  })
  // B4 演示：把「毛竹原竹(kg)」匹配到电力因子(kWh 口径)
  const rowMat = rowsC.find((r: any) => r.flowName === '毛竹原竹')
  if (!rowMat) throw new Error('未找到毛竹原竹填报行')
  await updatePcfActivityData(projC.id, [
    { id: rowMat.id, activityValues: rowMat.activityValues.map((av: any) => ({ factorName: av.factorName, value: 62 })), factorId: fElec.id },
  ])
  const checkC2 = await submitPcfCheck(projC.id)
  console.log(`  B4 演示：匹配电力因子后检测问题 ${checkC2.issues.length} 条`)
  await T('B4 拦截：活动量单位与因子分母单位不可换算', async () => {
    const b4 = checkC2.issues.find((i: any) => i.category === 'factorUnit')
    if (!b4) throw new Error('未检出因子单位不匹配')
    assert(b4.title.includes('毛竹原竹'), 'B4 定位数据项不正确')
    assert(b4.description.includes('kWh'), 'B4 描述应指出因子分母单位')
  })
  // 修复：因子改回毛竹因子，补齐 GX-07/GX-08 数据
  const allRows = await fetchPcfActivityData(projC.id)
  await updatePcfActivityData(projC.id, allRows.map((r: any) => {
    const base: Record<string, any> = {
      '环保胶粘剂': { values: [12], factor: fBamboo },
      '竹粉': { values: [4] },
    }
    const plan = fillA[r.flowName] ?? base[r.flowName]
    if (!plan) throw new Error(`未规划行 ${r.flowName}`)
    return {
      id: r.id,
      activityValues: r.activityValues.map((av: any, i: number) => ({ factorName: av.factorName, value: plan.values[i] ?? null })),
      factorId: plan.factor ? plan.factor.id : null,
      allocateRatio: r.direction === 'output' ? 100 : null,
    }
  }))
  const checkC3 = await submitPcfCheck(projC.id)
  await T('修复后检测通过并完成核算', async () => {
    assert(checkC3.status === 'passed', `仍未通过：${checkC3.issues.map((i: any) => i.title).join('；')}`)
    const calcC = await startPcfCalc(projC.id)
    const expected = 3.2 * 0.036 + 62 * 0.18 + 42 * 0.581 + 5 * 0.5 + 2.5 * 0.91 + 12 * 0.18 + 4 * 0.5
    near(calcC.totalEmission, expected, '场景三核算合计与手算不一致')
    console.log(`  场景三核算合计 ${calcC.totalEmission} kgCO₂e`)
  })
  // 删除工序链路
  const opGx08 = allRows.find((r: any) => r.flowName === '竹粉')
  if (!opGx08) throw new Error('未找到竹粉填报行')
  await T('removePcfOperation 同步清理填报行', async () => {
    await removePcfOperation(projC.id, opGx08.operationId)
    const after = await fetchPcfActivityData(projC.id)
    assert(!after.some((r: any) => r.flowName === '竹粉'), '删除工序后填报行未同步清理')
  })

  /* ============ ⑤ 场景四：我的产品库（组织自建 / 引用）能否发起核算 ============ */
  section('⑤ 场景四：我的产品库（组织自建 / 引用标准产品）与核算入口')
  const myProduct = await createMyProduct({
    code: 'ORG-P-001',
    name: '240mm 定制印花竹筷',
    categoryId: category.id,
    model: 'ZKM-240-DY',
    spec: '240mm 单支印花',
    unit: '双',
    industry: '竹制品制造',
    imageUrl: '',
    description: '组织自建：标准竹筷基础上增加印花与独立包装工序',
    processes: [{
      id: '', processCode: 'GY-02', processName: '包装工艺', lifecycleStage: '生产制造', seq: 1,
      operations: [opCopy('GX-04', '包装', 1,
        [pf('material', '成品筷（散）', 100, '双', '', 'excluded'), pf('material', '纸包装材料', 2.5, 'kg', fmMass.id)],
        [pf('product', '盒装竹筷', 1, '盒', '', 'excluded')])],
    }],
  })
  const refResult = await referenceBackendProducts([product.id])
  const myList = await fetchMyProducts()
  console.log(`  我的产品库：自建 ${myProduct.code} + 引用结果 ${JSON.stringify(refResult)}；列表 ${myList.length} 条（${myList.map((m: any) => `${m.name}[${m.source}]`).join('、')}）`)
  await T('我的产品库支持自建 + 引用（数据落库）', async () => {
    assert(myList.some((m: any) => m.id === myProduct.id && m.source === 'custom'), '自建产品未落库')
    assert(myList.some((m: any) => m.source === 'referenced'), '引用产品未落库')
  })
  await expectThrow('断点验证：组织自建产品无法直接作为核算项目产品', () =>
    createPcfProject({
      name: '自建产品核算尝试', ownerOrg: org.name, startDate: '2026-01-01', endDate: '2026-12-31',
      boundary: 'gate', remark: '', productSource: 'custom', refProductId: myProduct.id,
      productName: myProduct.name, productSpec: myProduct.spec, functionalUnit: myProduct.unit,
    }), '不存在')
  await T('引用记录反查（fetchMyProductRefProjects 返回空）', async () => {
    const refs = await fetchMyProductRefProjects(myProduct.id)
    assert(refs.length === 0, '自建产品不应有核算记录')
  })
  finding('F-01', '「我的产品库」（组织自建/引用）与核算入口未打通：createPcfProject 仅认 productStore（平台产品库），传自建产品 id 报「所选产品不存在」；且我的产品列表/详情页均无「发起核算」入口。')

  /* ============ ⑥ 场景五：前后台联动 ============ */
  section('⑥ 场景五：前后台联动（因子禁用 / 产品下架 / E13 回退重算 / 删除约束）')
  // 6.1 因子停用联动（前台自建因子可停用；后台新建因子写死 preset，停用被拦截）
  const fOrg = await createFactor({
    name: '组织自建电力排放因子', alias: '', category: 'energy', industries: ['竹制品制造'],
    scenario: '组织自建外购电力', value: 0.61, numeratorUnit: 'kgCO₂e', denominatorUnit: 'kWh',
    sourceCategory: '组织台账', publishYear: '2025', publishDate: '2025-03',
    publisherRegion: '中国', publisherFullName: '福建竹业集团', publisherShortName: '',
    dataSourceFile: '', description: '', source: 'custom',
  })
  await expectThrow('规则拦截：后台新建因子写死 preset、无法停用', () => updateFactorStatus(fBamboo.id, 'disabled'), '不可禁用')
  finding('F-04', '后台「排放因子库」页面新增因子时 source 写死为 preset（FactorFormPage 非前台模式固定 preset）：预置因子不可禁用 / 不可删除，后台因子库只有「新增」、没有「停用 / 删除」生命周期管理。')
  await updateFactorStatus(fOrg.id, 'disabled')
  const factorOptionsAfter = await fetchPcfFactorOptions()
  await T('前台自建因子停用 → 核算因子候选实时剔除', async () => {
    assert(!factorOptionsAfter.some((f: any) => f.id === fOrg.id), '停用因子仍出现在候选项')
    assert(factorOptionsAfter.length === 6, `候选应剩 6 条，实际 ${factorOptionsAfter.length}`)
  })
  await updateFactorStatus(fOrg.id, 'enabled')
  const projD = await createPcfProject({
    name: '240mm 全竹碳化筷·因子联动演练',
    ownerOrg: org.name, startDate: '2026-01-01', endDate: '2026-12-31',
    boundary: 'gate', remark: '', productSource: 'library',
    refProductId: product.id, productName: product.name, productSpec: product.spec,
    functionalUnit: product.unit,
  })
  await updatePcfProjectStepOne(projD.id, {
    name: projD.name, ownerOrg: projD.ownerOrg, startDate: projD.startDate, endDate: projD.endDate,
    remark: '', boundary: 'gate', methodId: 'STD-001', refProductId: product.id,
    productCode: product.code, productName: product.name, productModel: product.model,
    productSpec: product.spec, productCategory: '竹制餐具', productIndustry: product.industry,
    productVersion: 'V1.0', functionalUnit: product.unit, conversionFactor: 1,
    lifecycleStages: await deriveStages('gate', product.industry),
  })
  await fetchPcfLifecycleBundle(projD.id) // 触发项目工序副本懒初始化
  const rowsD = await fetchPcfActivityData(projD.id)
  await T('项目 D 填报完备数据 → 检测通过', async () => {
    await updatePcfActivityData(projD.id, rowsD.map((r: any) => {
      const plan = fillA[r.flowName]
      return {
        id: r.id,
        activityValues: r.activityValues.map((av: any, i: number) => ({ factorName: av.factorName, value: plan.values[i] ?? null })),
        factorId: plan.factor ? plan.factor.id : null,
        allocateRatio: r.direction === 'output' ? 100 : null,
      }
    }))
    const checkD = await submitPcfCheck(projD.id)
    assert(checkD.status === 'passed', `检测未通过：${checkD.issues.map((i: any) => i.title).join('；')}`)
  })
  // 清理演练项目
  await T('删除约束：已入流程项目（toCalc）不可删除；新建态可删除', async () => {
    const cur = await fetchPcfProject(projD.id)
    assert(cur.status === 'toCalc', `projD 状态应为 toCalc，实际 ${cur.status}`)
    await expectThrow('删除拦截：已入流程项目不可删除', () => deletePcfProject(projD.id), '不可删除')
    const tmp = await createPcfProject({
      name: '临时演练项目', ownerOrg: org.name, startDate: '2026-01-01', endDate: '2026-12-31',
      boundary: 'gate', remark: '', productSource: 'library',
      refProductId: product.id, productName: product.name, productSpec: product.spec,
      functionalUnit: product.unit,
    })
    await deletePcfProject(tmp.id)
    const gone = await fetchPcfProject(tmp.id).then(() => false, () => true)
    assert(gone, '新建态项目删除后仍可查到')
  })

  // 6.2 E13：已核算（calculated）项目修改步骤① → 回退重走检测与核算
  await T('E13：已核算项目修改目标与范围 → 回退「进行中」需重走检测与核算（版本递增）', async () => {
    const projE = await createPcfProject({
      name: '240mm 全竹碳化筷·E13 演练', ownerOrg: org.name, startDate: '2026-01-01', endDate: '2026-12-31',
      boundary: 'gate', remark: '', productSource: 'library',
      refProductId: product.id, productName: product.name, productSpec: product.spec,
      functionalUnit: product.unit,
    })
    await updatePcfProjectStepOne(projE.id, {
      name: projE.name, ownerOrg: projE.ownerOrg, startDate: projE.startDate, endDate: projE.endDate,
      remark: '', boundary: 'gate', methodId: 'STD-001', refProductId: product.id,
      productCode: product.code, productName: product.name, productModel: product.model,
      productSpec: product.spec, productCategory: '竹制餐具', productIndustry: product.industry,
      productVersion: 'V1.0', functionalUnit: product.unit, conversionFactor: 1,
      lifecycleStages: await deriveStages('gate', product.industry),
    })
    await fetchPcfLifecycleBundle(projE.id)
    const fillRows = async (pid: string) => {
      const rows = await fetchPcfActivityData(pid)
      return rows.map((r: any) => {
        const plan = fillA[r.flowName]
        return {
          id: r.id,
          activityValues: r.activityValues.map((av: any, i: number) => ({ factorName: av.factorName, value: plan.values[i] ?? null })),
          factorId: plan.factor ? plan.factor.id : null,
          allocateRatio: r.direction === 'output' ? 100 : null,
        }
      })
    }
    await updatePcfActivityData(projE.id, await fillRows(projE.id))
    const checkE1 = await submitPcfCheck(projE.id)
    assert(checkE1.status === 'passed', 'E13 演练：首轮检测未通过')
    const calcE1 = await startPcfCalc(projE.id)
    assert(calcE1.version === 1, '首轮版本应为 1')
    // E13：修改目标与范围 → 回退「进行中」步骤①
    const after = await updatePcfProjectStepOne(projE.id, {
      name: projE.name + '（修订）', ownerOrg: projE.ownerOrg, startDate: projE.startDate, endDate: projE.endDate,
      remark: '', boundary: 'gate', methodId: 'STD-001', refProductId: product.id,
      productCode: product.code, productName: product.name, productModel: product.model,
      productSpec: product.spec, productCategory: '竹制餐具', productIndustry: product.industry,
      productVersion: 'V1.0', functionalUnit: product.unit, conversionFactor: 1,
      lifecycleStages: await deriveStages('gate', product.industry),
    })
    assert(after.status === 'ongoing' && after.currentStep === 1, `回退异常：${after.status}/${after.currentStep}`)
    await updatePcfActivityData(projE.id, await fillRows(projE.id))
    const checkE2 = await submitPcfCheck(projE.id)
    assert(checkE2.status === 'passed', '回退后检测未通过')
    const calcE2 = await startPcfCalc(projE.id)
    assert(calcE2.version === 2, `重算应产出版本 2，实际 ${calcE2.version}`)
    near(calcE2.totalEmission, 40.4522, '重算结果与首版不一致')
    const reportE = await generatePcfReport(projE.id, 'RPT-PCF-001', { cover: coverFill, sections: sectionFill })
    assert(reportE.cover.productName === product.name, '重新生成报告异常')
    const confirmed = await confirmPcfReport(projE.id)
    assert(confirmed.status === 'done', '重新确认完成失败')
    console.log(`  E13 闭环完成：重算版本 V${calcE2.version}，报告 ${confirmed.reportNo} 重新锁定`)
  })

  // 6.3 产品下架
  await updateProductUseStatus(product.id, 'off')
  const projF = await createPcfProject({
    name: '下架联动演练', ownerOrg: org.name, startDate: '2026-01-01', endDate: '2026-12-31',
    boundary: 'gate', remark: '', productSource: 'library',
    refProductId: product.id, productName: product.name, productSpec: product.spec,
    functionalUnit: product.unit,
  }).catch((e: Error) => e)
  await T('产品下架 → 无法基于该产品新建核算项目', async () => {
    assert(projF instanceof Error, '下架后竟可新建项目')
    assert((projF as Error).message.includes('已下架'), `拦截信息异常：${(projF as Error).message}`)
  })
  await updateProductUseStatus(product.id, 'on')

  // 6.4 删除约束
  await expectThrow('删除约束：已完成项目不可删除', () => deletePcfProject(projA.id), '不可删除')

  // 6.5 核算列表两层视图
  await T('核算列表两层视图（产品维度分组 → 项目记录）', async () => {
    const groups = await fetchPcfProjectGroups()
    const g = groups.find((x: any) => x.productId === product.id)
    if (!g) throw new Error('产品维度分组缺少该产品')
    assert(g.projectCount >= 2, `该产品核算记录应 ≥ 2，实际 ${g.projectCount}`)
    const byProduct = await fetchPcfProjectsByProduct(product.id)
    assert(byProduct.length === g.projectCount, '两层列表数量不一致')
  })

  /* ============ ⑦ 选项断点：静态常量选项 vs Store ============ */
  section('⑦ 选项断点检查（表单下拉数据源是否随后台维护更新）')
  const [units, mats, enes, lcs] = await Promise.all([fetchUnits(), fetchMaterials(), fetchEnergies(), fetchLifecycleStages()])
  const optUnits = await fetchUnitOptions()
  const optMats = await fetchMaterialOptions()
  const optEnes = await fetchEnergyOptions()
  const optLcs = await fetchLifecycleOptions()
  const optInds = await fetchIndustryOptions()
  const optWeight = await fetchPcfWeightUnitOptions()
  const factorFormOpts = await fetchFactorFormOptions()
  console.log(`  单位库 ${units.length} 条 vs 单位选项 ${optUnits.length} 条；物料库 ${mats.length} vs 物料选项 ${optMats.length}；能源库 ${enes.length} vs 能源选项 ${optEnes.length}；阶段库 ${lcs.length} vs 阶段选项 ${optLcs.length}；行业库 1 vs 行业选项 ${optInds.length}`)
  await T('动态派生链路正常（核算候选来自 Store）', async () => {
    const prodOpts = await fetchPcfProductOptions()
    assert(prodOpts.length === 1 && prodOpts[0].id === product.id, '产品候选未动态派生')
    const factorOpts = await fetchPcfFactorOptions()
    assert(factorOpts.length === 7, `因子候选应 7 条（6 后台预置 + 1 组织自建），实际 ${factorOpts.length}`)
    assert(factorOpts.some((f: any) => f.code === fElec.code), '因子候选缺少电力因子')
  })
  await T('静态选项与 Store 脱钩（下拉不随后台维护更新）', async () => {
    const gaps: string[] = []
    if (optUnits.length === 0 && units.length > 0) gaps.push(`单位选项 ${optUnits.length}/${units.length}`)
    if (optMats.length === 0 && mats.length > 0) gaps.push(`物料选项 ${optMats.length}/${mats.length}`)
    if (optEnes.length === 0 && enes.length > 0) gaps.push(`能源选项 ${optEnes.length}/${enes.length}`)
    if (optLcs.length === 0 && lcs.length > 0) gaps.push(`阶段选项 ${optLcs.length}/${lcs.length}`)
    if (optInds.length === 0) gaps.push(`行业选项 ${optInds.length}/1`)
    if (optWeight.length === 0) gaps.push(`净重单位选项 ${optWeight.length}`)
    if (factorFormOpts.carbonUnits.length === 0) gaps.push(`因子表单碳单位 ${factorFormOpts.carbonUnits.length}`)
    if (factorFormOpts.industries.length === 0) gaps.push(`因子表单行业 ${factorFormOpts.industries.length}`)
    assert(gaps.length > 0, '未发现选项断点')
    console.log(`    断点清单：${gaps.join('；')}`)
  })
  finding('F-02', '表单选项类接口读取 mock 静态常量而非 Store：fetchUnitOptions/fetchMaterialOptions/fetchEnergyOptions/fetchIndustryOptions/fetchLifecycleOptions/fetchPcfWeightUnitOptions 及因子表单的碳单位/行业选项均不随后台维护更新。清空 mock 后这些下拉全空，且后台新增数据也不会进入下拉——新产品/新工序/新因子录入被阻断（P0）。')
  finding('F-03', '三项系统字典（核算主体组织、核算方法/标准文件、净重单位）无维护入口且仅存于种子常量：一旦清空即阻断「新建项目（核算主体必填）」与「保存步骤①（核算方法必填）」。')

  /* ============ 汇总 ============ */
  section('走查结果汇总')
  console.log(`  通过 ${stats.pass} 项，失败 ${stats.fail} 项`)
  if (failures.length > 0) {
    console.log('  失败明细：')
    failures.forEach((f) => console.log(`    - ${f}`))
  }
  console.log('  发现问题：')
  findings.forEach((f) => console.log(`    - ${f}`))
}

void main()
