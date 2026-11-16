import { fetchMyProcesses, fetchOperations, fetchProcesses } from '@/mock'
import type {
  EmissionCategory,
  FlowItemType,
  PcfDataItemType,
  PcfEmissionType,
  ProcessItem,
} from '@/types'

/**
 * 「所属工艺」→「产品建模」自动带入：
 * 进入产品建模时，若目标与范围已选工艺流程，则把该工艺流程下各工序的投入产出流
 * 带入到工艺流程所属生命周期阶段，生成可编辑的数据项。
 *
 * 说明：
 * - 「我的工艺」优先，其次平台工艺库（产品可能引用的是平台工艺）；
 * - 一个工艺流程只对应一个生命周期阶段，按名称匹配到步骤①纳入的阶段；
 * - 数量留空（原型口径：实际核算时填写），排放因子留空（可后续引用）。
 */

/** 工序投入产出流类型 → 核算数据项类型（resource→natural、semi→intermediate 为编码差异映射） */
export function flowTypeToItemType(flow: FlowItemType): PcfDataItemType {
  return flow === 'resource' ? 'natural' : flow === 'semi' ? 'intermediate' : (flow as PcfDataItemType)
}

/** 工序排放物类别 → 核算排放物类型 */
export function emissionCategoryToType(cat?: EmissionCategory): PcfEmissionType | null {
  if (!cat) return null
  return cat === 'gas' ? 'wasteGas' : cat === 'wastewater' ? 'wastewater' : 'wasteSolid'
}

export interface ProcessStageSeed {
  stageId: string
  stageName: string
  /** 所属工序名称 */
  processName: string
  name: string
  itemType: PcfDataItemType
  emissionType: PcfEmissionType | null
  unit: string
}

/**
 * 工艺流程所属生命周期阶段 → 项目 / 模型已纳入的阶段。
 * 名称精确优先，其次按业务近义词 / 包含关系匹配（如「生产」→「加工阶段」）。
 */
export function matchStageByName(
  stageName: string,
  stages: Array<{ id: string; name: string }>,
): { id: string; name: string } | null {
  if (!stageName) return null
  const exact = stages.find((stage) => stage.name === stageName)
  if (exact) return exact

  const aliases: Record<string, string[]> = {
    采伐: ['采伐', '原材料', '获取'],
    生产: ['加工', '生产', '制造'],
    加工: ['加工', '生产', '制造'],
    运输: ['运输', '物流'],
    使用: ['使用'],
    废弃: ['废弃', '循环', '生命末期'],
  }
  const keywords = aliases[stageName] ?? [stageName]
  for (const keyword of keywords) {
    const hit = stages.find(
      (stage) => stage.name.includes(keyword) || keyword.includes(stage.name),
    )
    if (hit) return hit
  }
  return null
}

/** 按工艺流程名称解析可用的工艺流程（我的工艺优先，其次平台工艺库） */
export async function resolveProcessByName(processName: string): Promise<ProcessItem | null> {
  if (!processName) return null
  const [mine, all] = await Promise.all([fetchMyProcesses(), fetchProcesses()])
  const pool: ProcessItem[] = [...mine, ...all]
  return (
    pool.find((item) => item.name === processName && item.useStatus === 'enabled') ??
    pool.find((item) => item.name === processName) ??
    null
  )
}

/** 按工艺流程构建「阶段 + 工序投入产出流」数据项（带回阶段归属） */
export async function buildStageSeedsFromProcess(
  processName: string,
  stages: Array<{ id: string; name: string }>,
): Promise<ProcessStageSeed[]> {
  if (!processName || stages.length === 0) return []
  const process = await resolveProcessByName(processName)
  if (!process) return []
  const stage = matchStageByName(process.lifecycleStage, stages)
  if (!stage) return []

  const operations = await fetchOperations()
  const seeds: ProcessStageSeed[] = []
  ;[...process.operations]
    .sort((a, b) => a.order - b.order)
    .forEach((processOp) => {
      const operation = operations.find((item) => item.code === processOp.opCode)
      if (!operation) return
      const flows = [
        ...operation.inputs.map((flow) => ({ flow, direction: 'in' as const })),
        ...operation.outputs.map((flow) => ({ flow, direction: 'out' as const })),
      ]
      flows.forEach(({ flow, direction }) => {
        seeds.push({
          stageId: stage.id,
          stageName: stage.name,
          processName: operation.name,
          name: flow.refName,
          itemType: flowTypeToItemType(flow.flowType),
          emissionType:
            direction === 'out' && flow.flowType === 'emission'
              ? emissionCategoryToType(flow.emissionCategory)
              : null,
          unit: flow.unit,
        })
      })
    })
  return seeds
}
