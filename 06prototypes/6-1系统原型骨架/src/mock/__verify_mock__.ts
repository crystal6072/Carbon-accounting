/* ============================================================================
 * Mock 数据一致性 + 前后台串联 校验脚本
 *
 * 覆盖两件事：
 *  A. **前后台数据是否串起来**：两个演示项目（PJ01 摇篮到大门 / PJ02 摇篮到坟墓）的
 *     步骤① 引用是否全部可解析（产品 / 组织 / 标准 / 生命周期阶段），
 *     步骤② 阶段数据项是否落在项目纳入的阶段内、排放因子与单位是否可用。
 *  B. **完整链路是否跑得通**：检测已通过 → 核算（与手算一致，含阶段汇总）→ 报告生成 → 报告确认。
 *
 * 运行：
 *   npx vite build --ssr src/mock/__verify_mock__.ts --outDir dist-mock --emptyOutDir
 *   node dist-mock/__verify_mock__.js
 * ========================================================================== */
import {
  confirmPcfReport,
  fetchEnergyOptions,
  fetchLifecycleStages,
  fetchMaterials,
  fetchPcfCheckResult,
  fetchPcfFactorOptions,
  fetchPcfMyProductOptions,
  fetchPcfOrgOptions,
  fetchPcfProject,
  fetchPcfStandardOptions,
  fetchPcfStageData,
  fetchUnitOptions,
  generatePcfReport,
  startPcfCalc,
  fetchPcfReportTemplates,
} from './index'
import { listPublishedFormulaOptions } from '@/pages/formula/formulaMeta'

const stats = { pass: 0, fail: 0 }
const failures: string[] = []
const log = (...a: unknown[]) => console.log(...a)
function near(a: number, b: number, msg: string, eps = 1e-6) {
  if (Math.abs(a - b) > eps) throw new Error(`${msg}（期望 ${b}，实际 ${a}）`)
}
/** 与核算引擎一致的结果取整口径（4 位小数） */
const R = (v: number) => Math.round(v * 1e4) / 1e4
async function T(name: string, fn: () => Promise<void> | void) {
  try {
    await fn()
    stats.pass++
    log(`  [PASS] ${name}`)
  } catch (e) {
    stats.fail++
    const m = e instanceof Error ? e.message : String(e)
    failures.push(`${name} => ${m}`)
    log(`  [FAIL] ${name} => ${m}`)
  }
}

/** 两个演示项目的预期（手算，数量口径） */
const PROJECTS: Array<{
  id: string
  label: string
  boundary: string
  expectedTotal: number
  expectedStages: Record<string, number>
}> = [
  {
    id: 'PJ01',
    label: '摇篮到大门',
    boundary: 'gate',
    expectedTotal: 0.037981,
    expectedStages: { 原材料获取: 0.011304, 生产: 0.026677 },
  },
  {
    id: 'PJ02',
    label: '摇篮到坟墓',
    boundary: 'grave',
    expectedTotal: 0.03898756,
    expectedStages: {
      原材料获取: 0.011304,
      生产: 0.026677,
      '运输/交付': 0.0001296,
      使用: 0,
      生命末期: 0.00087696,
    },
  },
]

async function main() {
  log('\n================ Mock 数据一致性 + 前后台串联校验 ================')
  const [products, orgs, standards, formulas, stages, units, factors, materials, energies] =
    await Promise.all([
      fetchPcfMyProductOptions(),
      fetchPcfOrgOptions(),
      fetchPcfStandardOptions(),
      Promise.resolve(listPublishedFormulaOptions()),
      fetchLifecycleStages(),
      fetchUnitOptions(),
      fetchPcfFactorOptions(),
      fetchMaterials(),
      fetchEnergyOptions(),
    ])
  log(
    `后台基础数据：组织 ${orgs.length} / 现行标准 ${standards.filter((s) => s.status === '现行').length} / ` +
      `已发布公式 ${formulas.length} / 阶段 ${stages.length} / 单位字典 ${units.length} / ` +
      `可匹配因子 ${factors.length} / 物料 ${materials.length} / 能源 ${energies.length}`,
  )

  /* ---------------- A. 前后台串联 ---------------- */
  for (const spec of PROJECTS) {
    log(`\n---------- ${spec.id} · ${spec.label} ----------`)
    const project = await fetchPcfProject(spec.id)
    const items = await fetchPcfStageData(spec.id)

    await T(`${spec.id}｜步骤① 引用全部可解析（产品 / 组织 / 标准 / 阶段）`, () => {
      const problems: string[] = []
      if (!products.some((p) => p.id === project.refProductId)) problems.push(`引用产品 ${project.refProductId} 不在我的产品库`)
      if (!orgs.some((o) => o.name === project.ownerOrg)) problems.push(`核算主体 ${project.ownerOrg} 不在组织字典`)
      if (!standards.some((s) => s.id === project.methodId && s.status === '现行')) problems.push(`核算标准 ${project.methodId} 非现行`)
      const libIds = new Set(stages.map((s) => s.id))
      project.lifecycleStages?.forEach((s) => {
        if (!libIds.has(s.id)) problems.push(`阶段 ${s.id} 不在生命周期阶段库`)
      })
      if (project.boundary !== spec.boundary) problems.push(`边界应为 ${spec.boundary}，实际 ${project.boundary}`)
      if (problems.length) throw new Error(problems.join('；'))
    })

    await T(`${spec.id}｜生命周期阶段与核算边界自洽（纳入阶段 ⊆ 边界可用阶段）`, () => {
      const lib = new Map(stages.map((s) => [s.id, s]))
      const problems: string[] = []
      project.lifecycleStages?.filter((s) => s.included).forEach((s) => {
        const def = lib.get(s.id)
        if (!def) return
        if (!def.boundaries.includes(project.boundary)) {
          problems.push(`阶段「${s.name}」(${s.id}) 不适用于边界 ${project.boundary}`)
        }
        if (s.level === 2 && def.parentId && s.parentName !== lib.get(def.parentId)?.name) {
          problems.push(`二级阶段「${s.name}」的父阶段名与阶段库不一致`)
        }
      })
      if (problems.length) throw new Error(problems.join('；'))
    })

    await T(`${spec.id}｜步骤② 数据项落在纳入阶段内、因子与单位均可用`, () => {
      const problems: string[] = []
      const lv1 = new Set(
        (project.lifecycleStages ?? []).filter((s) => s.included && s.level === 1).map((s) => s.name),
      )
      const parentOf = new Map((project.lifecycleStages ?? []).map((s) => [s.id, s.parentName ?? '']))
      const factorById = new Map(factors.map((f) => [f.id, f]))
      items.forEach((item) => {
        const parent = parentOf.get(item.stageId) ?? ''
        const lv1Name = lv1.has(item.stageName) ? item.stageName : parent
        if (!lv1.has(lv1Name)) problems.push(`「${item.name}」所属阶段未纳入（${item.stageName}）`)
        if (!units.includes(item.unit)) problems.push(`「${item.name}」单位「${item.unit}」不在单位字典`)
        if (item.quantity == null) problems.push(`「${item.name}」未填数量`)
        if (item.factorId) {
          const f = factorById.get(item.factorId)
          if (!f) problems.push(`「${item.name}」因子 ${item.factorId} 不可用`)
          else if (f.value !== item.factorValue) problems.push(`「${item.name}」因子值快照与因子库不一致`)
        } else if (item.direction === 'input' && ['material', 'natural', 'energy'].includes(item.itemType)) {
          problems.push(`投入项「${item.name}」未匹配排放因子`)
        }
      })
      if (problems.length) throw new Error(problems.join('；'))
    })

    /* ---------------- B. 端到端 ---------------- */
    const check = await fetchPcfCheckResult(spec.id)
    await T(`${spec.id}｜步骤③ 预置检测已通过（阻断 0）`, () => {
      if (check.status !== 'passed' || check.blockingCount !== 0) {
        throw new Error(`检测 ${check.status}，阻断 ${check.blockingCount}`)
      }
    })

    const calc = await startPcfCalc(spec.id)
    await T(`${spec.id}｜步骤④ 核算结果 = 手算 ${spec.expectedTotal} kgCO₂e/双`, () => {
      near(calc.totalEmission, R(spec.expectedTotal), '总量不一致')
      near(calc.unitEmission, R(spec.expectedTotal), '单位产品碳足迹不一致')
    })

    await T(`${spec.id}｜步骤④ 阶段汇总与手算一致`, () => {
      const got = new Map(calc.stageSummary.map((s) => [s.stage, s.emission]))
      const want = Object.keys(spec.expectedStages)
      if (got.size !== want.length) {
        throw new Error(`阶段数应为 ${want.length}，实际 ${got.size}（${[...got.keys()].join('、')}）`)
      }
      Object.entries(spec.expectedStages).forEach(([stage, value]) => {
        if (!got.has(stage)) throw new Error(`缺少阶段「${stage}」`)
        near(got.get(stage)!, R(value), `阶段「${stage}」不一致`)
      })
    })

    await T(`${spec.id}｜步骤④ 换算口径（单位转换系数）生效`, () => {
      const kg = calc.unitEmissionBreakdown.find((b) => b.unit === 'kg')
      if (!kg) throw new Error('缺少 kg 换算口径')
      near(kg.value, R(spec.expectedTotal * project.conversionFactor!), 'kg 口径不一致')
    })

    const templates = await fetchPcfReportTemplates()
    const report = await generatePcfReport(spec.id, templates[0].templateId, {
      sections: { S06A: `${spec.label}：排放集中在生产阶段的电力消耗，建议推进节能改造与绿电采购。` },
    })
    await T(`${spec.id}｜步骤⑤ 报告生成并带出核算结果`, () => {
      near(report.system.unitEmission, R(spec.expectedTotal), '报告结果不一致')
      if (report.system.stageSummary.length !== Object.keys(spec.expectedStages).length) {
        throw new Error('报告阶段汇总条数与核算结果不一致')
      }
    })
    const confirmed = await confirmPcfReport(spec.id)
    await T(`${spec.id}｜步骤⑤ 报告确认 → 项目「已完成」并锁定`, () => {
      if (!confirmed.locked) throw new Error('报告未锁定')
    })

    log(
      `    结果：${calc.unitEmission} kgCO₂e/${project.functionalUnit}｜ ` +
        `阶段 ${calc.stageSummary.map((s) => `${s.stage}=${s.emission}`).join('、')}`,
    )
  }

  log(`\n================ 汇总：通过 ${stats.pass} / 失败 ${stats.fail} ================`)
  failures.forEach((f) => log(`  - ${f}`))
}

void main()
