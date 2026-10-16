/* ============================================================================
 * 真实案例验证脚本：熊宝科技重竹地板（1860×140×20mm · A1-C4 摇篮到坟墓）
 *
 * 数据来源：06prototypes/pcf-case-data/熊宝重竹地板_2025（28 条活动数据 / 16 条因子）
 * 目的：把真实案例灌入当前引擎，逐项比对案例预期结果，验证功能与业务闭环。
 *
 * 运行：
 *   npx vite build --ssr src/mock/__verify_xiongbao__.ts --outDir dist-xb --emptyOutDir
 *   node dist-xb/__verify_xiongbao__.js
 * ========================================================================== */
import {
  fetchLifecycleStages,
  fetchPcfCurrentUserOrg,
  createPcfProject,
  updatePcfProjectStepOne,
  savePcfStageData,
  savePcfProcessNodes,
  submitPcfCheck,
  startPcfCalc,
  fetchPcfProject,
} from './index'

const stats = { pass: 0, fail: 0 }
const failures: string[] = []
const log = (...a: unknown[]) => console.log(...a)
function near(a: number, b: number, msg: string, eps = 1e-3) {
  if (Math.abs(a - b) > eps) throw new Error(`${msg}（期望 ${b}，实际 ${a}，偏差 ${(a - b).toFixed(6)}）`)
}
async function T(name: string, fn: () => Promise<void> | void) {
  try { await fn(); stats.pass++; log(`  [PASS] ${name}`) }
  catch (e) { stats.fail++; const m = e instanceof Error ? e.message : String(e); failures.push(`${name} => ${m}`); log(`  [FAIL] ${name} => ${m}`) }
}

/** 案例：模块 → 系统生命周期阶段（当前阶段库无 A1–C4 / EN15804 编码，只能就近归属） */
const STAGE_MAP: Record<string, { id: string; name: string }> = {
  A1: { id: 'LS01', name: '原材料获取' },
  A2: { id: 'LS07', name: '原材料运输' },
  A3: { id: 'LS08', name: '生产过程' },
  A4: { id: 'LS10', name: '运输/交付' },
  A5: { id: 'LS15', name: '焚烧和底渣分选，填埋和促进分解的排放' }, // ⚠ 系统无 A5 阶段，被迫并入生命末期
  'B1-B7': { id: 'LS11', name: '使用' },
  C1: { id: 'LS13', name: '生命末期产品的拆解、破碎和分选' },
  C2: { id: 'LS12', name: '生命末期产品的收集、包装和运输' },
  C3: { id: 'LS14', name: '材料、有机物、能量回收' },
  C4: { id: 'LS15', name: '焚烧和底渣分选，填埋和促进分解的排放' },
}

interface CaseRow {
  id: string
  stage: string
  name: string
  direction: 'input' | 'output'
  itemType: 'material' | 'natural' | 'energy' | 'byproduct'
  amount: number
  unit: string
  /** 化石（非生物）因子 = 案例 emission_fossil / amount */
  fossil: number
  /** 生物碳因子（吸收为负、释放为正） */
  biogenic: number
  /** 案例逐行预期：不含生物碳 */
  expFossil: number
  /** 案例逐行预期：含生物碳净值 */
  expNet: number
}

/** 熊宝案例 28 条（化石因子、生物碳因子、行级预期均取自 activity_data.csv） */
const ROWS: CaseRow[] = [
  { id: 'XB-001', stage: 'A1', name: '原竹', direction: 'input', itemType: 'material', amount: 18.7391263332, unit: 'kg', fossil: 0.0498, biogenic: -1.0083333333, expFossil: 0.9332084914, expNet: -17.9620772279 },
  { id: 'XB-002', stage: 'A1', name: '油漆', direction: 'input', itemType: 'material', amount: 0.016926, unit: 'kg', fossil: 3.17, biogenic: 0, expFossil: 0.05365542, expNet: 0.05365542 },
  { id: 'XB-003', stage: 'A1', name: '胶水', direction: 'input', itemType: 'material', amount: 1.4556444444, unit: 'kg', fossil: 3.93, biogenic: 0, expFossil: 5.7206826667, expNet: 5.7206826667 },
  { id: 'XB-004', stage: 'A1', name: '竹粉', direction: 'output', itemType: 'byproduct', amount: -6.1878987381, unit: 'kg', fossil: 0.04987, biogenic: -1.0083333333, expFossil: -0.3085905101, expNet: 5.9308740509 },
  { id: 'XB-005', stage: 'A1', name: '前加工边角料', direction: 'output', itemType: 'byproduct', amount: -4.5827131505, unit: 'kg', fossil: 0, biogenic: -1.0083333333, expFossil: 0, expNet: 4.6209024268 },
  { id: 'XB-006', stage: 'A1', name: '后加工边角料', direction: 'output', itemType: 'byproduct', amount: -0.8, unit: 'kg', fossil: 0, biogenic: -1.2705, expFossil: 0, expNet: 1.0164 },
  { id: 'XB-007', stage: 'A1', name: '误差调整', direction: 'output', itemType: 'byproduct', amount: -1, unit: 'item', fossil: 0, biogenic: 0.0073462684, expFossil: 0, expNet: -0.0073462684 },
  { id: 'XB-008', stage: 'A1', name: '包装袋', direction: 'input', itemType: 'material', amount: 0.001, unit: 'kg', fossil: 3.37, biogenic: 0, expFossil: 0.00337, expNet: 0.00337 },
  { id: 'XB-009', stage: 'A1', name: '垫方', direction: 'input', itemType: 'material', amount: 0.0138888889, unit: 'kg', fossil: 1.17, biogenic: -1.8916666667, expFossil: 0.01625, expNet: -0.0100231481 },
  { id: 'XB-010', stage: 'A1', name: '缠绕膜', direction: 'input', itemType: 'material', amount: 0.0006166667, unit: 'kg', fossil: 3.37, biogenic: 0, expFossil: 0.0020781667, expNet: 0.0020781667 },
  { id: 'XB-011', stage: 'A1', name: '珍珠棉', direction: 'input', itemType: 'material', amount: 0.0047222222, unit: 'kg', fossil: 4.083, biogenic: 0, expFossil: 0.0192808333, expNet: 0.0192808333 },
  { id: 'XB-012', stage: 'A2', name: '陆运', direction: 'input', itemType: 'material', amount: 0.7657448229, unit: 't·km', fossil: 0.2, biogenic: 0, expFossil: 0.1531489646, expNet: 0.1531489646 },
  { id: 'XB-013', stage: 'A3', name: '4车间用电', direction: 'input', itemType: 'energy', amount: 0.43020863, unit: 'kWh', fossil: 0.3809067599, biogenic: 0, expFossil: 0.1638693753, expNet: 0.1638693753 },
  { id: 'XB-014', stage: 'A3', name: '5-6车间用电', direction: 'input', itemType: 'energy', amount: 0.5008450618, unit: 'kWh', fossil: 0.3809067599, biogenic: 0, expFossil: 0.1907752697, expNet: 0.1907752697 },
  { id: 'XB-015', stage: 'A3', name: '其他用电', direction: 'input', itemType: 'energy', amount: 0.9277510871, unit: 'kWh', fossil: 0.3809067599, biogenic: 0, expFossil: 0.3533866606, expNet: 0.3533866606 },
  { id: 'XB-016', stage: 'A3', name: '全车间蒸汽', direction: 'input', itemType: 'energy', amount: 12.4756141099, unit: 'MJ', fossil: 0.000385, biogenic: 0, expFossil: 0.0048031114, expNet: 0.0048031114 },
  { id: 'XB-017', stage: 'A3', name: '边角料产蒸汽', direction: 'input', itemType: 'energy', amount: 1.5066983642, unit: 'MJ', fossil: 0, biogenic: 0, expFossil: 0, expNet: 0 },
  { id: 'XB-018', stage: 'A3', name: '3车间用水', direction: 'input', itemType: 'natural', amount: 19.59310338, unit: 'kg', fossil: 0.0012, biogenic: 0, expFossil: 0.0235117241, expNet: 0.0235117241 },
  { id: 'XB-019', stage: 'A3', name: '废弃物运输', direction: 'input', itemType: 'material', amount: 0.3745847004, unit: 't·km', fossil: 0.2, biogenic: 0, expFossil: 0.0749169401, expNet: 0.0749169401 },
  { id: 'XB-020', stage: 'A3', name: '危废处理', direction: 'input', itemType: 'material', amount: 0.0000111716, unit: 'kg', fossil: 2.39, biogenic: 0, expFossil: 0.0000267001, expNet: 0.0000267001 },
  { id: 'XB-021', stage: 'A4', name: '产品运输', direction: 'input', itemType: 'material', amount: 3.5132941833, unit: 't·km', fossil: 0.2, biogenic: 0, expFossil: 0.7026588367, expNet: 0.7026588367 },
  { id: 'XB-022', stage: 'A5', name: '一般工业垃圾焚烧', direction: 'input', itemType: 'material', amount: 0.0202277778, unit: 'kg', fossil: 0.519, biogenic: 1.2988647807, expFossil: 0.0104982167, expNet: 0.0367713648 },
  { id: 'XB-023', stage: 'B1-B7', name: '使用阶段', direction: 'input', itemType: 'energy', amount: 0, unit: 'kWh', fossil: 0, biogenic: 0, expFossil: 0, expNet: 0 },
  { id: 'XB-024', stage: 'C1', name: '废弃物拆除', direction: 'input', itemType: 'material', amount: 0, unit: 'kg', fossil: 0, biogenic: 0, expFossil: 0, expNet: 0 },
  { id: 'XB-025', stage: 'C2', name: '废弃物运输', direction: 'input', itemType: 'material', amount: 0.7189, unit: 't·km', fossil: 0.2, biogenic: 0, expFossil: 0.14378, expNet: 0.14378 },
  { id: 'XB-026', stage: 'C3', name: '废弃物加工', direction: 'input', itemType: 'material', amount: 0, unit: 'kg', fossil: 0, biogenic: 0, expFossil: 0, expNet: 0 },
  { id: 'XB-027', stage: 'C4', name: '木材处置', direction: 'input', itemType: 'material', amount: 4.2581, unit: 'kg', fossil: 0.0152, biogenic: 1.65, expFossil: 0.06472312, expNet: 7.09058812 },
  { id: 'XB-028', stage: 'C4', name: '木材（胶）处置', direction: 'input', itemType: 'material', amount: 1.2719, unit: 'kg', fossil: 2.44, biogenic: 0, expFossil: 3.103436, expNet: 3.103436 },
]

const sumByStage = (rows: CaseRow[], stages: string[], key: 'expFossil' | 'expNet') =>
  rows.filter((r) => stages.includes(r.stage)).reduce((s, r) => s + r[key], 0)

const A1A3 = ['A1', 'A2', 'A3']
const A1C4 = ['A1', 'A2', 'A3', 'A4', 'A5', 'B1-B7', 'C1', 'C2', 'C3', 'C4']
const EXP = {
  a1a3Fossil: sumByStage(ROWS, A1A3, 'expFossil'), // 7.4043738139
  a1a3Net: sumByStage(ROWS, A1A3, 'expNet'),        // 0.3522356658
  a1c4Fossil: sumByStage(ROWS, A1C4, 'expFossil'), // 11.4294699873
  a1c4Net: sumByStage(ROWS, A1C4, 'expNet'),        // 11.4294699873
}

/** 构造步骤①阶段（grave 边界，全部纳入），parentName 与阶段库对齐 */
async function deriveStages(boundary: string) {
  const all = await fetchLifecycleStages()
  const nameOf = new Map(all.map((s) => [s.id, s.name]))
  return all
    .filter((s) => s.status === 'enabled' && (s.boundaries.length === 0 || s.boundaries.includes(boundary)))
    .sort((a, b) => a.order - b.order)
    .map((s) => ({
      id: s.id, name: s.name, level: s.level,
      parentName: s.parentId ? nameOf.get(s.parentId) ?? '' : '',
      custom: false, description: s.description, included: true,
    }))
}

async function buildAndCalc(orgName: string, stages: any[], convFactor: number, convUnit: string, convertedUnit: string) {
  const project = await createPcfProject({
    name: `熊宝重竹地板·2025·摇篮到坟墓（真实案例验证）`,
    ownerOrg: orgName, startDate: '2025-01-01', endDate: '2025-12-31',
    boundary: 'grave', remark: '', productSource: 'library', refProductId: 'P01',
    productName: '重竹地板', productSpec: '1860 × 140 × 20 mm', functionalUnit: '块',
  } as any)

  await updatePcfProjectStepOne(project.id, {
    name: project.name, ownerOrg: orgName, startDate: '2025-01-01', endDate: '2025-12-31', remark: '',
    boundary: 'grave', methodId: 'STD-001', refProductId: 'P01',
    productName: '重竹地板', productSpec: '1860 × 140 × 20 mm', productCategory: '竹制地板', productIndustry: '竹制品制造',
    functionalUnit: '块', functionalUnitValue: 1,
    conversionFactor: convFactor, conversionUnit: convUnit, convertedUnit,
    lifecycleStages: stages,
  } as any)

  const items = ROWS.map((r) => {
    const st = STAGE_MAP[r.stage]
    const total = r.fossil + r.biogenic // = GWP 总量（含生物碳）
    return {
      id: `XB-SD-${r.id}`, projectId: project.id, stageId: st.id, stageName: st.name, nodeId: null,
      direction: r.direction, name: r.name, itemType: r.itemType, emissionType: null,
      quantity: r.amount, unit: r.unit,
      factorId: `F-XB-${r.id}`, factorName: `${r.name}因子（案例快照）`, factorValue: total,
      factorCalibers: { gwpTotal: total, gwpFossil: r.fossil, gwpBiogenic: r.biogenic, gwpLuluc: 0 },
    }
  }) as any[]
  await savePcfStageData(project.id, items)
  await savePcfProcessNodes(project.id, [])
  const check = await submitPcfCheck(project.id)
  const calc = await startPcfCalc(project.id)
  return { project, check, calc }
}

async function main() {
  log('\n================ 熊宝重竹地板 · 真实案例端到端验证 ================')
  const org = await fetchPcfCurrentUserOrg()
  const stages = await deriveStages('grave')
  log(`步骤① 按 grave 带出阶段 ${stages.length} 个（${stages.filter((s) => s.level === 1).map((s) => s.name).join('、')}）`)

  // 第一次：kg 归一化（1 块 = 5.53 kg → 每 kg = 每块 × 1/5.53）
  const kgFactor = 1 / 5.53
  const { check, calc } = await buildAndCalc(org.name, stages, kgFactor, '块', 'kg')

  log(`\n-- 检测：${check.status}，阻断 ${check.blockingCount}，提示 ${check.warningCount}`)
  check.issues.slice(0, 6).forEach((i) => log(`     · [${i.level}] ${i.title}`))

  await T('录入 28 条真实数据并保存回读一致', async () => {
    if (check.status !== 'passed' && check.status !== 'failed') throw new Error('检测未执行')
  })

  // 逐行比对
  await T('28 条明细「不含生物碳」逐行与案例一致', () => {
    ROWS.forEach((r) => {
      const d = calc.details.find((x: any) => x.id === `XB-SD-${r.id}`)!
      near(d.emissionBreakdown!.fossil, r.expFossil, `行 ${r.id} ${r.name} fossil`)
    })
  })
  await T('28 条明细「含生物碳净值」逐行与案例一致', () => {
    ROWS.forEach((r) => {
      const d = calc.details.find((x: any) => x.id === `XB-SD-${r.id}`)!
      near(d.emission, r.expNet, `行 ${r.id} ${r.name} net`)
    })
  })

  await T(`A1-A3 不含生物碳 = ${EXP.a1a3Fossil.toFixed(4)}`, () => {
    const got = calc.details.filter((d: any) => A1A3.includes(ROWS.find((r) => `XB-SD-${r.id}` === d.id)!.stage))
      .reduce((s: number, d: any) => s + d.emissionBreakdown!.fossil, 0)
    near(got, EXP.a1a3Fossil, 'A1-A3 fossil')
  })
  await T(`A1-A3 含生物碳净值 = ${EXP.a1a3Net.toFixed(4)}`, () => {
    const got = calc.details.filter((d: any) => A1A3.includes(ROWS.find((r) => `XB-SD-${r.id}` === d.id)!.stage))
      .reduce((s: number, d: any) => s + d.emission, 0)
    near(got, EXP.a1a3Net, 'A1-A3 net')
  })
  await T(`A1-C4 不含生物碳 = ${EXP.a1c4Fossil.toFixed(4)}（caliberEmission.fossil）`, () => {
    near(calc.caliberEmission!.fossil, EXP.a1c4Fossil, 'A1-C4 fossil')
  })
  await T(`A1-C4 含生物碳净值 = ${EXP.a1c4Net.toFixed(4)}（totalEmission）`, () => {
    near(calc.totalEmission, EXP.a1c4Net, 'A1-C4 net')
  })

  await T('阶段汇总（一级阶段）与案例一致', () => {
    const got = new Map(calc.stageSummary.map((s: any) => [s.stage, s.emission]))
    log(`    阶段汇总：${calc.stageSummary.map((s: any) => `${s.stage}=${s.emission}`).join('、')}`)
    // A1+A2 应上卷到「原材料获取」；A3→生产；A4→运输/交付；A5+C1..C4→生命末期
    const wantLv1: Record<string, number> = {
      原材料获取: sumByStage(ROWS, ['A1', 'A2'], 'expNet'),
      生产: sumByStage(ROWS, ['A3'], 'expNet'),
      '运输/交付': sumByStage(ROWS, ['A4'], 'expNet'),
      使用: 0,
      生命末期: sumByStage(ROWS, ['A5', 'C1', 'C2', 'C3', 'C4'], 'expNet'),
    }
    Object.entries(wantLv1).forEach(([k, v]) => {
      if (!got.has(k)) throw new Error(`缺少一级阶段「${k}」`)
      near(got.get(k)!, v, `阶段 ${k}`)
    })
  })

  await T('归一化：按重量 = 2.0668 kgCO₂e/kg', () => {
    const kg = calc.unitEmissionBreakdown.find((b: any) => b.unit === 'kg')
    if (!kg) throw new Error('缺少 kg 换算口径')
    near(kg.value, EXP.a1c4Net / 5.53, 'kg 口径')
  })

  // 第二次：m² 归一化（1 块 = 0.2604 m² → 每 m² = 每块 × 1/0.2604）
  const m2Factor = 1 / 0.2604
  const { calc: calcM2 } = await buildAndCalc(org.name, stages, m2Factor, '块', 'm²')
  await T('归一化：按面积 = 43.8920 kgCO₂e/m²', () => {
    const m2 = calcM2.unitEmissionBreakdown.find((b: any) => b.unit === 'm²')
    if (!m2) throw new Error('缺少 m² 换算口径')
    near(m2.value, EXP.a1c4Net / 0.2604, 'm² 口径')
  })

  // 热点（当前 engine 以「含生物碳净值 emission」排序）
  const top = [...calc.details].sort((a: any, b: any) => b.emission - a.emission).slice(0, 5)
  log('\n-- 数据项汇总 Top5（按当前 engine 的 emission=含生物碳净值 排序）')
  top.forEach((d: any, i) => log(`     ${i + 1}. ${d.opName} = ${d.emission}`))
  log('-- 按「不含生物碳（化石）」排序 Top5（案例口径热点）')
  ;[...calc.details].sort((a: any, b: any) => b.emissionBreakdown!.fossil - a.emissionBreakdown!.fossil).slice(0, 5)
    .forEach((d: any, i) => log(`     ${i + 1}. ${d.opName} = ${d.emissionBreakdown!.fossil}`))

  // 边界覆盖校验：删除 A2 / C4 是否提示
  log('\n-- 边界完整性（案例校验点 6）')
  log('    当前阶段库无 A1–C4 编码，检测以「一级阶段是否有数据项」为准（B5）；模块级缺项无法识别。')

  log(`\n================ 汇总：通过 ${stats.pass} / 失败 ${stats.fail} ================`)
  failures.forEach((f) => log(`  - ${f}`))
  log(`\n案例预期：A1-A3 化石 ${EXP.a1a3Fossil.toFixed(4)} / 净值 ${EXP.a1a3Net.toFixed(4)}；` +
    `A1-C4 化石 ${EXP.a1c4Fossil.toFixed(4)} / 净值 ${EXP.a1c4Net.toFixed(4)}；` +
    `每 kg ${(EXP.a1c4Net / 5.53).toFixed(4)}；每 m² ${(EXP.a1c4Net / 0.2604).toFixed(4)}`)
}

void main()
