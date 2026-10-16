import {
  createPcfProject,
  updatePcfProjectStepOne,
  fetchPcfProject,
  fetchPcfLifecycleBundle,
  fetchPcfActivityData,
  fetchPcfProductOptions,
  fetchLifecycleStages,
} from './index'

async function main() {
  const products = await fetchPcfProductOptions()
  const product = products.find((p) => p.id === 'P01')!
  const allStages = await fetchLifecycleStages()

  // 1. 创建项目（模拟列表页「新增产品」）
  const project = await createPcfProject({
    name: `${product.name}·碳足迹核算`,
    ownerOrg: '示例组织',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    boundary: 'gate',
    remark: '',
    productSource: 'library',
    refProductId: product.id,
    productName: product.name,
    productSpec: product.spec,
    functionalUnit: product.unit,
  })
  console.log('① 创建后 fetchPcfProject.lifecycleStages =', JSON.stringify((await fetchPcfProject(project.id)).lifecycleStages))

  // 2. 模拟步骤① deriveStages（gate 边界）
  const stages = allStages
    .filter(
      (s) =>
        s.status === 'enabled' &&
        (s.boundaries.length === 0 || s.boundaries.includes(project.boundary)),
    )
    .sort((a, b) => a.order - b.order)
    .map((s) => ({ id: s.id, name: s.name, level: s.level, parentName: '', custom: false, included: true }))
  console.log('② 步骤① deriveStages =', stages.map((s) => `${s.name}(included=${s.included})`).join('、'))

  // 3. 保存步骤①
  const saved = await updatePcfProjectStepOne(project.id, {
    name: project.name, ownerOrg: project.ownerOrg, startDate: project.startDate, endDate: project.endDate,
    remark: '', boundary: 'gate', methodId: 'STD-001', refProductId: product.id, productName: product.name,
    productSpec: product.spec, productIndustry: product.industry, functionalUnit: product.unit, conversionFactor: 1, lifecycleStages: stages,
  })
  console.log('③ 保存后 lifecycleStages =', JSON.stringify(saved.lifecycleStages?.map((s) => ({ name: s.name, included: s.included, level: s.level }))))

  // 4. 再 fetchPcfProject 确认
  const refetched = await fetchPcfProject(project.id)
  console.log('④ fetchPcfProject.lifecycleStages =', JSON.stringify(refetched.lifecycleStages?.map((s) => `${s.name}:${s.included}`)))

  // 5. 步骤② bundle
  const bundle = await fetchPcfLifecycleBundle(project.id)
  console.log('⑤ 步骤②工序 =', bundle.operations.map((op) => `[${op.processStage}]${op.opName}`).join('、'))

  // 6. 复刻 treeStages 计算（组件内逻辑）
  const stageGroups: Array<{ stage: string; processes: Array<{ processName: string }> }> = []
  bundle.operations.forEach((op) => {
    let g = stageGroups.find((x) => x.stage === op.processStage)
    if (!g) { g = { stage: op.processStage, processes: [] }; stageGroups.push(g) }
    if (!g.processes.find((p) => p.processName === op.processName)) g.processes.push({ processName: op.processName })
  })
  const included = (refetched.lifecycleStages ?? []).filter((s) => s.included && s.level === 1)
  const treeStages = included.length === 0
    ? stageGroups.map((g) => ({ name: g.stage, processes: g.processes }))
    : included.map((stage) => ({ name: stage.name, processes: stageGroups.find((g) => g.stage === stage.name)?.processes ?? [] }))
  console.log('⑥ treeStages（左树应显示的分组）:')
  treeStages.forEach((t) => console.log(`   - ${t.name} | 工艺数=${t.processes.length} ${t.processes.map((p) => p.processName).join('/')}`))
}

void main()
