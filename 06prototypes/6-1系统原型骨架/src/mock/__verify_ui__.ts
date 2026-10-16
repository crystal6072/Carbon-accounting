/* ============================================================================
 * 产品碳足迹核算 · UI 真实路径端到端验证脚本（方案 A：阶段数据项模型）
 *
 * 严格按前端页面实际调用的 mock API 顺序，模拟真实填报人操作：
 *   新建项目 → 步骤①目标与范围 → 步骤②产品建模（阶段数据项）→ 步骤③数据检测
 *   → 步骤④核算与结果，并核对系统结果与独立手算是否一致。
 *   （V0.8 起报告环节已移出核算流程，改由「报告管理」承载，本脚本不再覆盖。）
 *
 * 运行：
 *   npx vite build --ssr src/mock/__verify_ui__.ts --outDir dist-ui --emptyOutDir
 *   node dist-ui/__verify_ui__.js
 * ========================================================================== */
import {
  fetchLifecycleStages,
  fetchPcfCurrentUserOrg,
  fetchPcfFactorOptions,
  createPcfProject,
  fetchPcfProject,
  updatePcfProjectStepOne,
  fetchPcfStageData,
  savePcfStageData,
  savePcfProcessNodes,
  fetchPcfCheckResult,
  submitPcfCheck,
  startPcfCalc,
  fetchPcfCalcResult,
} from './index'

const stats = { pass: 0, fail: 0 }
const failures: string[] = []
function log(...a: unknown[]) { console.log(...a) }
function near(a: number, b: number, msg: string, eps = 1e-4) {
  if (Math.abs(a - b) > eps) throw new Error(`${msg}（期望 ${b}，实际 ${a}）`)
}
async function T(name: string, fn: () => Promise<void> | void) {
  try { await fn(); stats.pass++; log(`  [PASS] ${name}`) }
  catch (e) { stats.fail++; const m = e instanceof Error ? e.message : String(e); failures.push(`${name} => ${m}`); log(`  [FAIL] ${name} => ${m}`) }
}

async function deriveStages(boundary: string): Promise<any[]> {
  const all = await fetchLifecycleStages()
  return all
    .filter((s: any) => s.status === 'enabled' && (s.boundaries.length === 0 || s.boundaries.includes(boundary)))
    .sort((a: any, b: any) => a.order - b.order)
    .map((s: any) => ({ id: s.id, name: s.name, level: s.level, parentName: '', custom: false, included: true }))
}

/* 真实案例数据（240mm 全竹碳化筷 · 摇篮到大门）；口径：**数量**（每 1 个声明单位「双」的用量） */
const CASE_PLAN: Record<string, { stage: string; quantity: number; unit: string; direction: 'input' | 'output'; itemType: any; factorId: string | null; expected: number }> = {
  毛竹原竹厂外运输: { stage: '原材料获取', quantity: 0.0045, unit: 't·km', direction: 'input', itemType: 'material', factorId: 'FAC04', expected: 0.0045 * 0.036 },
  毛竹原竹: { stage: '原材料获取', quantity: 0.07, unit: 'kg', direction: 'input', itemType: 'material', factorId: 'FAC03', expected: 0.07 * 0.18 },
  电力: { stage: '生产', quantity: 0.048, unit: 'kWh', direction: 'input', itemType: 'energy', factorId: 'FAC01', expected: 0.048 * 0.581 },
  纸包装材料: { stage: '生产', quantity: 0.003, unit: 'kg', direction: 'input', itemType: 'material', factorId: 'FAC06', expected: 0.003 * 0.91 },
  竹屑: { stage: '生产', quantity: 0.006, unit: 'kg', direction: 'output', itemType: 'byproduct', factorId: null, expected: 0 },
}
const EXPECT_TOTAL = Object.values(CASE_PLAN).reduce((s, v) => s + v.expected, 0)

async function main() {
  log('\n================ UI 真实路径端到端验证（方案 A：阶段数据项） ================')
  const org = await fetchPcfCurrentUserOrg()
  const stages = await deriveStages('gate')
  const nameOf = (n: string) => (n === '毛竹原竹厂外运输' ? '毛竹原竹（厂外运输）' : n)

  const factorOptions = await fetchPcfFactorOptions()
  log(`因子候选 ${factorOptions.length} 条；含电力因子=${factorOptions.some((f: any) => f.id === 'FAC01')}（R-01 修复后前台可选基础因子）`)

  const lv1 = (name: string) => stages.find((s) => s.name === name && s.level === 1)

  // ① 新建项目
  const project = await createPcfProject({
    name: '真实填报·240mm 全竹碳化筷 · 2025 年度',
    ownerOrg: org.name, startDate: '2025-01-01', endDate: '2025-12-31',
    boundary: 'gate', remark: '', productSource: 'library', refProductId: 'P01',
    productName: '240mm 全竹碳化筷', productSpec: '240mm·100 双/盒', functionalUnit: '双',
  })
  log(`① 新建项目：${project.code}`)

  // ② 步骤①
  await updatePcfProjectStepOne(project.id, {
    name: project.name, ownerOrg: org.name, startDate: '2025-01-01', endDate: '2025-12-31', remark: '',
    boundary: 'gate', methodId: 'STD-001',
    refProductId: 'P01', productName: '240mm 全竹碳化筷',
    productSpec: '240mm·100 双/盒', productCategory: '竹制餐具', productIndustry: '竹制品制造',
    functionalUnit: '双', functionalUnitValue: 1, conversionFactor: 1, lifecycleStages: stages,
  })
  log(`② 步骤①保存：纳入 ${stages.filter((s) => s.level === 1).map((s) => s.name).join('、')}`)

  // ③ 步骤② 录入阶段数据项并保存
  const items = Object.entries(CASE_PLAN).map(([key, v], i) => ({
    id: `VERIFY-SD-${i + 1}`, projectId: project.id, stageId: lv1(v.stage)!.id, stageName: v.stage, nodeId: null,
    direction: v.direction, name: nameOf(key), itemType: v.itemType, emissionType: null,
    quantity: v.quantity, unit: v.unit,
    factorId: v.factorId, factorName: '', factorValue: v.factorId ? null : null,
  })) as any[]
  // 因子值快照：由候选补全（模拟页面选择因子时写入 factorName/factorValue）
  items.forEach((it) => {
    if (it.factorId) {
      const f = factorOptions.find((x: any) => x.id === it.factorId)!
      it.factorName = f.name
      it.factorValue = f.value
    }
  })
  await savePcfStageData(project.id, items)
  await savePcfProcessNodes(project.id, [])
  await T('步骤②：阶段数据项保存并回读一致', async () => {
    const back = await fetchPcfStageData(project.id)
    if (back.length !== items.length) throw new Error(`回读 ${back.length} 条，期望 ${items.length} 条`)
  })

  // ④ 步骤③ 检测
  const check = await submitPcfCheck(project.id)
  await T('步骤③：检测通过（阻断 0）', async () => {
    if (check.status !== 'passed') throw new Error(`检测 ${check.status}，阻断 ${check.blockingCount}：${check.issues.map((i) => i.title).join('；')}`)
  })
  const afterCheck = await fetchPcfProject(project.id)
  await T('步骤③：检测后项目转「待核算」并推进到步骤④', async () => {
    if (afterCheck.status !== 'toCalc' || afterCheck.currentStep !== 4) throw new Error(`状态 ${afterCheck.status}/step ${afterCheck.currentStep}`)
  })

  // ⑤ 步骤④ 核算
  const calc = await startPcfCalc(project.id)
  await T(`步骤④：核算结果与手算一致（${EXPECT_TOTAL.toFixed(4)} kgCO₂e/双）`, async () => {
    near(calc.totalEmission, EXPECT_TOTAL, '总量不一致')
  })
  await T('步骤④：逐条明细与手算一致', async () => {
    for (const it of items) {
      const d = calc.details.find((x: any) => x.id === it.id)!
      const exp = CASE_PLAN[it.name === '毛竹原竹（厂外运输）' ? '毛竹原竹厂外运输' : it.name].expected
      near(d.emission, exp, `数据项「${it.name}」不一致`)
    }
  })
  await T('步骤④：阶段汇总一致', async () => {
    const raw = calc.stageSummary.find((s: any) => s.stage === '原材料获取')!
    const prod = calc.stageSummary.find((s: any) => s.stage === '生产')!
    near(raw.emission, CASE_PLAN['毛竹原竹厂外运输'].expected + CASE_PLAN['毛竹原竹'].expected, '原材料获取阶段不一致')
    near(prod.emission, CASE_PLAN['电力'].expected + CASE_PLAN['纸包装材料'].expected, '生产阶段不一致')
  })
  await T('步骤④：核算结果结构（阶段 + 数据项 + 明细，无排放源维度）', async () => {
    assert(Array.isArray(calc.stageSummary) && calc.stageSummary.length > 0, '阶段汇总缺失')
    assert(Array.isArray(calc.operationSummary) && calc.operationSummary.length > 0, '数据项汇总缺失')
    assert(Array.isArray(calc.details) && calc.details.length > 0, '结果明细缺失')
    assert(!('sourceSummary' in calc), '不应再输出排放源汇总')
  })
  log(`    结果：总量 ${calc.totalEmission}，阶段 ${calc.stageSummary.map((s: any) => `${s.stage}=${s.emission}`).join('、')}`)

  // ⑥ 种子项目 PJ01（摇篮到大门，供页面演示）
  const pj01 = await startPcfCalc('PJ01')
  await T('种子项目 PJ01：按阶段数据项核算 = 0.037981', async () => {
    near(pj01.totalEmission, 0.037981, 'PJ01 结果不一致')
  })

  /* ============ 需求验证：负数 / 编辑回退重算 / 重新核算 ============ */
  log('\n================ 需求验证 ================')

  const stepOnePayload = () => ({
    name: '需求验证项目', ownerOrg: org.name, startDate: '2025-01-01', endDate: '2025-12-31', remark: '',
    boundary: 'gate', methodId: 'STD-001',
    refProductId: 'P01', productName: '240mm 全竹碳化筷', productSpec: '240mm·100 双/盒',
    productCategory: '竹制餐具', productIndustry: '竹制品制造', functionalUnit: '双',
    functionalUnitValue: 1, conversionFactor: 1, lifecycleStages: stages,
  })

  const pReq = await createPcfProject({
    name: '需求验证项目', ownerOrg: org.name, startDate: '2025-01-01', endDate: '2025-12-31',
    boundary: 'gate', remark: '', productSource: 'library', refProductId: 'P01',
    productName: '240mm 全竹碳化筷', functionalUnit: '双',
  })

  // 需求 3（V0.8 起移除）：步骤①不再有「核算公式」字段，无需公式必填校验
  await updatePcfProjectStepOne(pReq.id, stepOnePayload() as any)

  // 需求 1：负数活动量
  const mixItems = [
    { id: 'REQ-1', stageId: lv1('原材料获取')!.id, stageName: '原材料获取', direction: 'input', name: '毛竹原竹', itemType: 'material', quantity: 0.07, unit: 'kg', factorId: 'FAC03' },
    { id: 'REQ-2', stageId: lv1('原材料获取')!.id, stageName: '原材料获取', direction: 'input', name: '竹粉（扣减）', itemType: 'material', quantity: -0.02, unit: 'kg', factorId: 'FAC03' },
    { id: 'REQ-3', stageId: lv1('生产')!.id, stageName: '生产', direction: 'input', name: '电力', itemType: 'energy', quantity: 0.048, unit: 'kWh', factorId: 'FAC01' },
  ].map((it) => {
    const f = factorOptions.find((x: any) => x.id === it.factorId)!
    return { ...it, projectId: pReq.id, nodeId: null, emissionType: null, factorName: f.name, factorValue: f.value }
  }) as any[]
  await savePcfStageData(pReq.id, mixItems)
  const mixCheck = await submitPcfCheck(pReq.id)
  await T('需求1：含负数活动量可通过检测', async () => {
    if (mixCheck.status !== 'passed') throw new Error(`检测 ${mixCheck.status}：${mixCheck.issues.map((i) => i.title).join('；')}`)
  })
  const mixCalc = await startPcfCalc(pReq.id)
  await T('需求1：负数活动量参与计算并扣减（0.0126 − 0.0036 + 0.027888 = 0.036888）', async () => {
    near(mixCalc.totalEmission, 0.036888, '负数未正确扣减')
    near(mixCalc.details.find((d: any) => d.id === 'REQ-2')!.emission, -0.0036, '负排放明细不一致')
  })

  // 需求 2：重新核算（版本递增）
  const mixCalc2 = await startPcfCalc(pReq.id)
  await T('需求2：已核算项目可重新核算且版本递增（V1 → V2）', async () => {
    if (mixCalc2.version !== 2) throw new Error(`版本应为 2，实际 ${mixCalc2.version}`)
    near(mixCalc2.totalEmission, 0.036888, '重算结果不一致')
  })

  // 需求 2：已核算后仍可编辑（回改数据即回退重算）
  await savePcfStageData(pReq.id, mixItems.map((it) => ({ ...it, quantity: it.id === 'REQ-3' ? 0.06 : it.quantity })))
  const afterEdit = await fetchPcfProject(pReq.id)
  await T('需求2：回改步骤②数据 → 项目回退「进行中」步骤③', async () => {
    if (afterEdit.status !== 'ongoing' || afterEdit.currentStep !== 3) throw new Error(`状态 ${afterEdit.status}/step ${afterEdit.currentStep}`)
  })
  const reCheck = await submitPcfCheck(pReq.id)
  await T('需求2：回改后可重新检测通过', async () => {
    if (reCheck.status !== 'passed') throw new Error(`检测 ${reCheck.status}`)
  })
  const reCalc = await startPcfCalc(pReq.id)
  await T('需求2：重新检测后可再次核算，版本继续递增（V3）', async () => {
    if (reCalc.version !== 3) throw new Error(`版本应为 3，实际 ${reCalc.version}`)
  })

  log(`\n================ 汇总：通过 ${stats.pass} / 失败 ${stats.fail} ================`)
  failures.forEach((f) => log(`  - ${f}`))
}

void main()
