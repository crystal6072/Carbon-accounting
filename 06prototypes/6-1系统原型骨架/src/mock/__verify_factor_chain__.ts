/* ============================================================================
 * 链路验证：新增因子库 → 产品碳核算
 *
 * 覆盖两条来源：
 *   A. 前台「我的因子库」新建因子 → PCF 步骤②选用 → 核算
 *   B. 后台「因子库」新建库/因子 →（发布版本）→ PCF 步骤②选用 → 核算
 *
 * 运行：
 *   npx vite build --ssr src/mock/__verify_factor_chain__.ts --outDir dist-fc --emptyOutDir
 *   node dist-fc/__verify_factor_chain__.js
 * ========================================================================== */
import {
  createMyFactorLibrary,
  createMyFactor,
  fetchMyFactorLibraries,
  fetchMyFactors,
  createFactorLibrary,
  createLibraryFactor,
  publishLibraryVersion,
  fetchLibraryVersions,
  fetchPublishedLibraries,
  fetchPublishedLibraryDetail,
  fetchPcfFactorOptions,
  fetchPcfCurrentUserOrg,
  fetchLifecycleStages,
  createPcfProject,
  updatePcfProjectStepOne,
  savePcfStageData,
  submitPcfCheck,
  startPcfCalc,
} from './index'

const stats = { pass: 0, fail: 0 }
const failures: string[] = []
const notes: string[] = []
const log = (...a: unknown[]) => console.log(...a)
function near(a: number, b: number, msg: string, eps = 1e-6) {
  if (!(Math.abs(a - b) <= eps)) throw new Error(`${msg}（期望 ${b}，实际 ${a}）`)
}
async function T(name: string, fn: () => Promise<void> | void) {
  try { await fn(); stats.pass++; log(`  [PASS] ${name}`) }
  catch (e) { stats.fail++; const m = e instanceof Error ? e.message : String(e); failures.push(`${name} => ${m}`); log(`  [FAIL] ${name} => ${m}`) }
}

const ORG = { name: '' }
async function deriveStages(boundary: string) {
  const all = await fetchLifecycleStages()
  const nameOf = new Map(all.map((s) => [s.id, s.name]))
  return all
    .filter((s) => s.status === 'enabled' && (s.boundaries.length === 0 || s.boundaries.includes(boundary)))
    .sort((a, b) => a.order - b.order)
    .map((s) => ({ id: s.id, name: s.name, level: s.level, parentName: s.parentId ? nameOf.get(s.parentId) ?? '' : '', custom: false, description: s.description, included: true }))
}

/** 竹子因子：化石 0.0498 + 生物碳 -1.0083333333（案例原竹），总量 = -0.9585333333 */
const BAMBOO = {
  fossil: 0.0498,
  biogenic: -1.0083333333,
  total: 0.0498 + -1.0083333333,
}
const QTY = 10

async function main() {
  log('\n=========== 链路验证：新增因子库 → 产品碳核算 ===========')
  ORG.name = (await fetchPcfCurrentUserOrg()).name

  /* ---------------- A. 我的因子库 ---------------- */
  log('\n-- A. 前台「我的因子库」路径')
  const myLib = await createMyFactorLibrary('熊宝实测因子库', '案例实测')
  log(`     新建我的因子库：${myLib.id} / ${myLib.name}`)

  const myFactor = await createMyFactor(myLib.id, {
    name: '原竹（实测）', alias: 'bamboo raw material', scenario: '毛竹原竹获取',
    value: BAMBOO.total,
    calibers: { gwpTotal: BAMBOO.total, gwpFossil: BAMBOO.fossil, gwpBiogenic: BAMBOO.biogenic, gwpLuluc: 0 },
    numeratorUnit: 'kgCO₂e', denominatorUnit: 'kg', description: '熊宝实测原竹因子（含生物碳四分量）',
  } as any)
  log(`     新建我的因子：${myFactor.id} / ${myFactor.name} / value=${myFactor.value}`)

  await T('A1 我的因子库出现在库列表', async () => {
    const libs = await fetchMyFactorLibraries()
    if (!libs.some((l) => l.id === myLib.id)) throw new Error('库未出现')
  })
  await T('A2 我的因子出现在库内因子列表', async () => {
    const list = await fetchMyFactors(myLib.id)
    if (!list.some((f) => f.id === myFactor.id)) throw new Error('因子未出现')
  })
  await T('A3 我的因子出现在步骤② 因子选项（含四分量口径）', async () => {
    const opts = await fetchPcfFactorOptions()
    const hit = opts.find((o) => o.id === myFactor.id)
    if (!hit) throw new Error('因子未进入 PCF 因子选项')
    if (hit.value !== BAMBOO.total) throw new Error(`因子值不通：${hit.value}`)
    if (!hit.calibers || hit.calibers.gwpFossil !== BAMBOO.fossil) throw new Error('四分量口径未带出')
  })
  await T('A4 口径不闭合时被拒（总量 ≠ 化石+生物碳+土地利用）', async () => {
    let thrown = ''
    try {
      await createMyFactor(myLib.id, {
        name: '错误口径因子', alias: '', scenario: 'x', value: 10,
        calibers: { gwpTotal: 10, gwpFossil: 1, gwpBiogenic: 1, gwpLuluc: 0 },
        numeratorUnit: 'kgCO₂e', denominatorUnit: 'kg', description: '',
      } as any)
    } catch (e) { thrown = e instanceof Error ? e.message : String(e) }
    if (!thrown.includes('口径不闭合')) throw new Error(`未拦截：${thrown || '未报错'}`)
  })

  /* ---------------- B. 后台因子库 ---------------- */
  log('\n-- B. 后台「因子库」路径')
  const beLib = await createFactorLibrary({ name: '熊宝自建背景库', type: 'self', description: '', maintainer: '熊宝' } as any)
  const versions = await fetchLibraryVersions(beLib.id)
  const draft = versions[0]
  log(`     新建后台库：${beLib.id} / 初始版本 ${draft.versionNo}（状态 ${draft.status}）`)

  await T('B1 未发布版本前，后台库不出现在前台可选（发布门槛）', async () => {
    const published = await fetchPublishedLibraries()
    if (published.some((l) => l.id === beLib.id)) throw new Error('草稿库提前可见')
    const opts = await fetchPcfFactorOptions()
    if (opts.some((o) => o.libraryId === beLib.id)) throw new Error('草稿库因子提前可见')
  })

  const beFactor = await createLibraryFactor(beLib.id, draft.id, {
    name: '原竹（自建背景库）', alias: '', scenario: '毛竹原竹获取',
    value: BAMBOO.total,
    calibers: { gwpTotal: BAMBOO.total, gwpFossil: BAMBOO.fossil, gwpBiogenic: BAMBOO.biogenic, gwpLuluc: 0 },
    numeratorUnit: 'kgCO₂e', denominatorUnit: 'kg', description: '后台库新增（带四分量口径）',
  } as any)
  log(`     后台库新增因子：${beFactor.id} / calibers=${JSON.stringify(beFactor.calibers)}`)

  await publishLibraryVersion(draft.id)
  await T('B2 发布版本后，后台库出现在前台已发布库', async () => {
    const published = await fetchPublishedLibraries()
    if (!published.some((l) => l.id === beLib.id)) throw new Error('发布后仍不可见')
    const detail = await fetchPublishedLibraryDetail(beLib.id)
    if (!detail.factors.some((f) => f.id === beFactor.id)) throw new Error('库内因子未随发布可见')
  })
  await T('B3 发布后，因子进入步骤② 因子选项', async () => {
    const opts = await fetchPcfFactorOptions()
    if (!opts.some((o) => o.id === beFactor.id)) throw new Error('因子未进入 PCF 因子选项')
  })
  await T('B4 【口径透传】后台库新增因子应保留四分量 calibers', async () => {
    const opts = await fetchPcfFactorOptions()
    const hit = opts.find((o) => o.id === beFactor.id)!
    if (!hit.calibers || hit.calibers.gwpFossil !== BAMBOO.fossil) {
      throw new Error(`后台库因子丢失 calibers（实际 ${JSON.stringify(hit.calibers)}）→ 双口径核算将失效`)
    }
  })

  /* ---------------- C. 端到端核算 ---------------- */
  log('\n-- C. 端到端：用「新因子」做产品碳核算')
  const stages = await deriveStages('gate')
  const project = await createPcfProject({
    name: '新因子库链路验证项目', ownerOrg: ORG.name, startDate: '2025-01-01', endDate: '2025-12-31',
    boundary: 'gate', remark: '', productSource: 'library', refProductId: 'P01',
    productName: '重竹地板', functionalUnit: '块',
  } as any)
  await updatePcfProjectStepOne(project.id, {
    name: project.name, ownerOrg: ORG.name, startDate: '2025-01-01', endDate: '2025-12-31', remark: '',
    boundary: 'gate', methodId: 'STD-001', refProductId: 'P01',
    productName: '重竹地板', productCategory: '竹制地板', productIndustry: '竹制品制造',
    functionalUnit: '块', functionalUnitValue: 1, lifecycleStages: stages,
  } as any)

  // 模拟「步骤② 选择因子」：从因子选项快照 value + calibers
  const opts = await fetchPcfFactorOptions()
  const pickMy = opts.find((o) => o.id === myFactor.id)!
  const pickBe = opts.find((o) => o.id === beFactor.id)!
  const mkItem = (id: string, pick: any) => ({
    id, projectId: project.id, stageId: 'LS01', stageName: '原材料获取', nodeId: null,
    direction: 'input', name: id, itemType: 'material', emissionType: null,
    quantity: QTY, unit: 'kg', factorId: pick.id, factorName: pick.name,
    factorValue: pick.value, factorCalibers: pick.calibers ?? null,
  })
  const lv1 = stages.filter((s) => s.level === 1)
  log(`     gate 边界一级阶段：${lv1.map((s) => `${s.id}:${s.name}`).join('、')}`)
  const rows: any[] = [mkItem('ROW-MY', pickMy), mkItem('ROW-BE', pickBe)]
  // 其余一级阶段补 0 行，满足 B5（每个一级阶段须有数据项）
  lv1.filter((s) => s.id !== 'LS01').forEach((s) => {
    rows.push({
      id: `ZERO-${s.id}`, projectId: project.id, stageId: s.id, stageName: s.name, nodeId: null,
      direction: 'input', name: `${s.name}（占位）`, itemType: 'material', emissionType: null,
      quantity: 0, unit: 'kg', factorId: 'F-PLACEHOLDER', factorName: '占位', factorValue: 0, factorCalibers: null,
    })
  })
  await savePcfStageData(project.id, rows)
  const check = await submitPcfCheck(project.id)
  log(`     检测：${check.status}，阻断 ${check.blockingCount}，提示 ${check.warningCount}`)
  check.issues.slice(0, 8).forEach((i: any) => log(`       · [${i.level}] ${i.title}`))
  const calc = await startPcfCalc(project.id)
  log(`     明细：${calc.details.map((d: any) => `${d.opName}{emission=${d.emission},fossil=${d.emissionBreakdown?.fossil}}`).join(' | ')}`)

  await T('C1 我的因子参与核算：四分量口径正确', () => {
    const d = calc.details.find((x: any) => x.id === 'ROW-MY')!
    near(d.emission, QTY * BAMBOO.total, 'MY 净值')
    near(d.emissionBreakdown!.fossil, QTY * BAMBOO.fossil, 'MY 化石')
    near(d.emissionBreakdown!.biogenic, QTY * BAMBOO.biogenic, 'MY 生物碳')
  })
  await T('C2 后台库因子参与核算：四分量口径正确（若失败=calibers 丢失）', () => {
    const d = calc.details.find((x: any) => x.id === 'ROW-BE')!
    near(d.emissionBreakdown!.fossil, QTY * BAMBOO.fossil, 'BE 化石')
    near(d.emissionBreakdown!.biogenic, QTY * BAMBOO.biogenic, 'BE 生物碳')
  })

  log(`\n=========== 汇总：通过 ${stats.pass} / 失败 ${stats.fail} ===========`)
  failures.forEach((f) => log(`  - ${f}`))
  if (notes.length) notes.forEach((n) => log(`  ! ${n}`))
}

void main()
