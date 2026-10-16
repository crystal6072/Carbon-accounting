/* ============================================================================
 * 摇篮到坟墓（cradle-to-grave）真实案例验证脚本
 *   240mm 全竹碳化筷 · 2025 年度 · 摇篮到坟墓（原材料获取 / 生产 / 运输交付 / 使用 / 生命末期）
 * 按 UI 真实路径走：新建 → 步骤① → 步骤②（阶段数据项）→ 步骤③检测 → 步骤④核算 → 步骤⑤报告
 * 并测试「数据挂在二级阶段」时的行为。
 *
 * 运行：
 *   npx vite build --ssr src/mock/__verify_grave__.ts --outDir dist-grave --emptyOutDir
 *   node dist-grave/__verify_grave__.js
 * ========================================================================== */
import {
  fetchLifecycleStages,
  fetchPcfCurrentUserOrg,
  fetchPcfFactorOptions,
  createPcfProject,
  fetchPcfProject,
  updatePcfProjectStepOne,
  savePcfStageData,
  savePcfProcessNodes,
  submitPcfCheck,
  startPcfCalc,
  generatePcfReport,
  confirmPcfReport,
} from './index'

const log = (...a: unknown[]) => console.log(...a)
const near = (a: number, b: number, msg: string, eps = 1e-4) => {
  if (Math.abs(a - b) > eps) throw new Error(`${msg}（期望 ${b}，实际 ${a}）`)
}

async function deriveStages(boundary: string): Promise<any[]> {
  const all = await fetchLifecycleStages()
  return all
    .filter((s: any) => s.status === 'enabled' && (s.boundaries.length === 0 || s.boundaries.includes(boundary)))
    .sort((a: any, b: any) => a.order - b.order)
    .map((s: any) => ({ id: s.id, name: s.name, level: s.level, parentName: '', custom: false, included: true }))
}

async function main() {
  const org = await fetchPcfCurrentUserOrg()
  const stages = await deriveStages('grave')
  const factors = await fetchPcfFactorOptions()
  const fv = (id: string) => factors.find((f: any) => f.id === id)!
  const stage = (name: string, level = 1) => stages.find((s) => s.name === name && s.level === level)!

  log('\n================ 摇篮到坟墓 · 阶段带出 ================')
  log(`纳入阶段（一级）：${stages.filter((s) => s.level === 1).map((s) => s.name).join('、')}`)
  log(`纳入阶段（二级）：${stages.filter((s) => s.level === 2).map((s) => s.name).join('、')}`)

  /* ---------- 场景 A：数据挂在「一级阶段」 ---------- */
  log('\n================ 场景 A：数据挂在一级阶段 ================')
  const project = await createPcfProject({
    name: '摇篮到坟墓·240mm 全竹碳化筷 · 2025 年度', ownerOrg: org.name,
    startDate: '2025-01-01', endDate: '2025-12-31', boundary: 'grave', remark: '',
    productSource: 'library', refProductId: 'P01', productName: '240mm 全竹碳化筷',
    productSpec: '240mm·100 双/盒', functionalUnit: '双',
  })
  await updatePcfProjectStepOne(project.id, {
    name: project.name, ownerOrg: org.name, startDate: '2025-01-01', endDate: '2025-12-31', remark: '',
    boundary: 'grave', methodId: 'STD-001',
    refProductId: 'P01', productName: '240mm 全竹碳化筷', productSpec: '240mm·100 双/盒',
    productCategory: '竹制餐具', productIndustry: '竹制品制造', functionalUnit: '双',
    functionalUnitValue: 1, conversionFactor: 1, lifecycleStages: stages,
  })

  /* 口径：数量（每 1 个声明单位「双」的用量） */
  const plan: Array<{ stage: string; name: string; type: any; qty: number; unit: string; factor: string | null; dir: 'input' | 'output'; exp: number }> = [
    { stage: '原材料获取', name: '毛竹原竹', type: 'material', qty: 0.07, unit: 'kg', factor: 'FAC03', dir: 'input', exp: 0.07 * 0.18 },
    { stage: '原材料获取', name: '毛竹原竹（厂外运输）', type: 'material', qty: 0.0045, unit: 't·km', factor: 'FAC04', dir: 'input', exp: 0.0045 * 0.036 },
    { stage: '生产', name: '电力', type: 'energy', qty: 0.048, unit: 'kWh', factor: 'FAC01', dir: 'input', exp: 0.048 * 0.581 },
    { stage: '生产', name: '纸包装材料', type: 'material', qty: 0.003, unit: 'kg', factor: 'FAC06', dir: 'input', exp: 0.003 * 0.91 },
    { stage: '运输/交付', name: '成品运输', type: 'material', qty: 0.005, unit: 't·km', factor: 'FAC04', dir: 'input', exp: 0.005 * 0.036 },
    { stage: '使用', name: '使用阶段能耗', type: 'energy', qty: 0, unit: 'kWh', factor: 'FAC01', dir: 'input', exp: 0 },
    { stage: '生命末期', name: '废弃物运输', type: 'material', qty: 0.002, unit: 't·km', factor: 'FAC04', dir: 'input', exp: 0.002 * 0.036 },
  ]
  const expectTotal = plan.reduce((s, p) => s + p.exp, 0)
  const items = plan.map((p, i) => {
    const st = stage(p.stage)
    const f = p.factor ? fv(p.factor) : null
    return {
      id: `GRAVE-A-${i + 1}`, projectId: project.id, stageId: st.id, stageName: p.stage, nodeId: null,
      direction: p.dir, name: p.name, itemType: p.type, emissionType: null, quantity: p.qty, unit: p.unit,
      factorId: p.factor, factorName: f?.name ?? '', factorValue: f?.value ?? null,
    }
  }) as any[]
  await savePcfStageData(project.id, items)
  await savePcfProcessNodes(project.id, [])

  const check = await submitPcfCheck(project.id)
  log(`检测：${check.status}（阻断 ${check.blockingCount}）`)
  check.issues.forEach((i: any) => log(`   [${i.level}] ${i.title}`))

  const calc = await startPcfCalc(project.id)
  log(`核算：总量 ${calc.totalEmission} kgCO₂e/双（手算 ${expectTotal.toFixed(4)}）`)
  log(`阶段汇总：${calc.stageSummary.map((s: any) => `${s.stage}=${s.emission}(${s.ratio}%)`).join('、')}`)
  try {
    near(calc.totalEmission, expectTotal, '场景A总量与手算不一致')
    log('  [OK] 场景A：摇篮到坟墓全链路核算与手算一致')
  } catch (e) { log(`  [PROBLEM] ${(e as Error).message}`) }

  const report = await generatePcfReport(project.id, 'RPT-PCF-001', {
    cover: { reportDate: '2026-10-09', issuer: org.name },
    sections: { S06A: '摇篮到坟墓：覆盖原材料获取、生产、运输交付、使用与生命末期五个阶段。' },
  })
  await confirmPcfReport(project.id)
  const done = await fetchPcfProject(project.id)
  log(`  报告 ${report.reportNo} → 项目状态 ${done.status}`)

  /* ---------- 场景 B：数据全部挂在「二级阶段」（验证上卷到一级阶段） ---------- */
  log('\n================ 场景 B：数据挂在二级阶段（上卷验证） ================')
  const p2 = await createPcfProject({
    name: '摇篮到坟墓·二级阶段', ownerOrg: org.name,
    startDate: '2025-01-01', endDate: '2025-12-31', boundary: 'grave', remark: '',
    productSource: 'library', refProductId: 'P01', productName: '240mm 全竹碳化筷', functionalUnit: '双',
  })
  await updatePcfProjectStepOne(p2.id, {
    name: p2.name, ownerOrg: org.name, startDate: '2025-01-01', endDate: '2025-12-31', remark: '',
    boundary: 'grave', methodId: 'STD-001',
    refProductId: 'P01', productName: '240mm 全竹碳化筷', functionalUnit: '双',
    functionalUnitValue: 1, conversionFactor: 1, lifecycleStages: stages,
  })
  const lv2 = (name: string) => stages.find((s) => s.name === name && s.level === 2)!
  const planB = [
    { stage: '原材料运输', name: '毛竹原竹（厂外运输）', qty: 0.0045, unit: 't·km', factor: 'FAC04', exp: 0.0045 * 0.036 },
    { stage: '生产过程', name: '电力', qty: 0.048, unit: 'kWh', factor: 'FAC01', exp: 0.048 * 0.581 },
    { stage: '运输/交付', name: '成品运输', qty: 0.005, unit: 't·km', factor: 'FAC04', exp: 0.005 * 0.036 },
    { stage: '使用', name: '使用阶段能耗', qty: 0, unit: 'kWh', factor: 'FAC01', exp: 0 },
    { stage: '生命末期产品的收集、包装和运输', name: '废弃物运输', qty: 0.002, unit: 't·km', factor: 'FAC04', exp: 0.002 * 0.036 },
  ]
  const expectB = planB.reduce((s, p) => s + p.exp, 0)
  const itemsB = planB.map((p, i) => {
    const st = lv2(p.stage)
    const f = fv(p.factor)
    return {
      id: `GRAVE-B-${i + 1}`, projectId: p2.id, stageId: st.id, stageName: st.name, nodeId: null,
      direction: 'input', name: p.name, itemType: p.name.includes('电力') ? 'energy' : 'material',
      emissionType: null, quantity: p.qty, unit: p.unit,
      factorId: p.factor, factorName: f.name, factorValue: f.value,
    }
  }) as any[]
  await savePcfStageData(p2.id, itemsB)
  await savePcfProcessNodes(p2.id, [])
  const checkB = await submitPcfCheck(p2.id)
  log(`检测：${checkB.status}（阻断 ${checkB.blockingCount}）`)
  checkB.issues.forEach((i: any) => log(`   [${i.level}] ${i.title}`))
  if (checkB.status === 'passed') {
    const calcB = await startPcfCalc(p2.id)
    log(`核算：总量 ${calcB.totalEmission}（手算 ${expectB.toFixed(4)}）；明细行数 ${calcB.details.length}`)
    log(`阶段汇总（应为一级阶段）：${calcB.stageSummary.map((s: any) => `${s.stage}=${s.emission}`).join('、')}`)
    try {
      near(calcB.totalEmission, expectB, '场景B总量与手算不一致')
      if (calcB.details.length !== planB.length) throw new Error(`明细行数应为 ${planB.length}，实际 ${calcB.details.length}`)
      log('  [OK] 场景B：二级阶段数据已上卷到一级阶段并纳入核算')
    } catch (e) { log(`  [PROBLEM] ${(e as Error).message}`) }
  } else {
    log('  [PROBLEM] 二级阶段数据未通过检测（上卷失败）')
  }
}

void main()
