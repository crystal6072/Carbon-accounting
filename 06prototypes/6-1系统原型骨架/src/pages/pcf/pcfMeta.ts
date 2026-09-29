import type { TagTone } from '@/shared/components'
import type { FlowItemType, PcfBoundary, PcfProjectStatus } from '@/types'

/**
 * 项目状态文案（**界面口径唯一来源**，《核算项目业务 PRD》§5.1）：
 * 收敛自整体设计方案 §5.2 的工程态名，面向用户通俗化。
 * **已移除「已作废」**：取消项目统一走「删除」，不保留失效记录。
 */
export const PCF_STATUS_TEXT: Record<PcfProjectStatus, string> = {
  new: '新建',
  ongoing: '进行中',
  checking: '检测中',
  toCalc: '待核算',
  calculating: '核算中',
  calcFailed: '核算失败',
  calculated: '已核算',
  reportGenerating: '报告生成中',
  reportEditing: '报告编制中',
  done: '已完成',
  archived: '已归档',
}

/** 项目状态 Tag 配色（进行中=蓝 / 待办=橙 / 完成=绿 / 失败=红） */
export const PCF_STATUS_TONE: Record<PcfProjectStatus, TagTone> = {
  new: 'default',
  ongoing: 'info',
  checking: 'warning',
  toCalc: 'info',
  calculating: 'info',
  calcFailed: 'error',
  calculated: 'success',
  reportGenerating: 'warning',
  reportEditing: 'warning',
  done: 'success',
  archived: 'default',
}

/** 核算边界文案（方案 §1.4） */
export const PCF_BOUNDARY_TEXT: Record<PcfBoundary, string> = {
  gate: '摇篮到大门',
  grave: '摇篮到坟墓',
}

/** 投入 / 产出项类别文案（数据填报用） */
export const FLOW_TYPE_TEXT: Record<FlowItemType, string> = {
  material: '原料',
  energy: '能源',
  semi: '中间品',
  product: '成品',
  byproduct: '副产品',
  emission: '排放物',
  resource: '资源',
}

/**
 * 工作台步骤定义（骨架 §4.3）。
 * **V0.7：原 ④碳足迹核算 + ⑤核算结果 合并为 ④「碳足迹核算与结果」**，6 步收敛为 5 步：
 * 核算执行与结果查看是同一个闭环（核算完成即产出结果版本），不再拆成两个步骤节点；
 * 合并后步骤④ 上半区为核算执行状态卡，下半区为结果总览 / 阶段 / 工序 / 排放源 / 明细。
 * `batch` = 交付批次，用于未交付步骤的占位说明。
 */
export interface PcfStepDef {
  seq: number
  name: string
  batch: number
  /** 是否已交付：交付后步骤条不再标注「待交付」 */
  delivered?: boolean
}

export const PCF_STEPS: PcfStepDef[] = [
  { seq: 1, name: '目标与范围', batch: 1, delivered: true },
  { seq: 2, name: '工序与数据', batch: 3, delivered: true },
  { seq: 3, name: '数据检测', batch: 5, delivered: true },
  { seq: 4, name: '碳足迹核算与结果', batch: 5, delivered: true },
  { seq: 5, name: '报告', batch: 6, delivered: true },
]

/**
 * 可编辑状态：**核算完成前均可编辑**（V0.3 放宽）。
 * - `new` / `ongoing` / `checking` / `toCalc` / `calcFailed`：可直接编辑；
 * - `calculated`：可编辑，但保存后回退「进行中」并需重走检测 → 核算（E13）；
 * - `calculating` / `reportGenerating` / `reportEditing` / `done` / `archived`：只读。
 */
export const PCF_EDITABLE_STATUSES: PcfProjectStatus[] = [
  'new',
  'ongoing',
  'checking',
  'toCalc',
  'calcFailed',
  'calculated',
]

/** 需要「编辑即回退重算」的状态（保存后回到「进行中」） */
export const PCF_REVERT_STATUSES: PcfProjectStatus[] = ['calculated']

/** 是否可物理删除：仅「新建 / 进行中」 */
export function canDelete(status: PcfProjectStatus): boolean {
  return status === 'new' || status === 'ongoing'
}

/** 产品展示文案：名称｜规格 */
export function pcfProductLabel(name: string, spec: string): string {
  if (!name) return '-'
  return spec ? `${name}｜${spec}` : name
}

/** 状态 → 步骤完成态（用于步骤条的 ✓ / ● / ○） */
export function stepStateOf(seq: number, currentStep: number): 'done' | 'active' | 'todo' {
  if (seq < currentStep) return 'done'
  if (seq === currentStep) return 'active'
  return 'todo'
}

/** 核算年度选项（原型固定近 3 年） */
export const PCF_YEAR_OPTIONS: Array<{ label: string; value: string }> = [
  { label: '2026 年', value: '2026' },
  { label: '2025 年', value: '2025' },
  { label: '2024 年', value: '2024' },
]

/** 核算边界选项（一项目一边界，创建后不可修改） */
export const PCF_BOUNDARY_OPTIONS: Array<{ label: string; value: PcfBoundary }> = [
  { label: PCF_BOUNDARY_TEXT.gate, value: 'gate' },
  { label: PCF_BOUNDARY_TEXT.grave, value: 'grave' },
]
