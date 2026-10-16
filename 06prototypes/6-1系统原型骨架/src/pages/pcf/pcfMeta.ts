import type { TagTone } from '@/shared/components'
import type { FlowItemType, PcfProjectStatus } from '@/types'

/**
 * 项目状态文案（**界面口径唯一来源**，2026-10-16 收敛）。
 *
 * **在役状态机**：新建 →（步骤①下一步）→ 待处理 →（步骤②下一步）→ 待检测 →（一键检测通过）→ 待核算 →（开始核算）→ 已完成；
 * 检测不通过 → 回退「待处理」。
 *
 * **已移除**：检测中（`checking`）、核算中（`calculating`）、已核算（`calculated`）、
 * 已作废、已归档 —— 枚举保留以兼容既有数据与 mock，工作流不再产生，界面不展示。
 */
export const PCF_STATUS_TEXT: Record<PcfProjectStatus, string> = {
  new: '新建',
  ongoing: '待处理',
  toCheck: '待检测',
  toCalc: '待核算',
  checking: '检测中',
  calculating: '核算中',
  calcFailed: '核算失败',
  calculated: '已完成',
  reportGenerating: '报告生成中',
  reportEditing: '报告编制中',
  done: '已完成',
}

/**
 * 核算列表「状态」筛选项（界面口径）：
 * 仅含已落库的在役状态；不含草稿态「新建」（草稿不产生核算记录）、
 * 不含已移除的「检测中 / 核算中 / 已核算」与历史报告态。
 */
export const PCF_STATUS_OPTIONS: PcfProjectStatus[] = [
  'ongoing',
  'toCheck',
  'toCalc',
  'done',
]

/** 项目状态 Tag 配色（待处理=蓝 / 待检测=橙 / 待核算=蓝 / 完成=绿） */
export const PCF_STATUS_TONE: Record<PcfProjectStatus, TagTone> = {
  new: 'default',
  ongoing: 'info',
  toCheck: 'warning',
  toCalc: 'info',
  checking: 'warning',
  calculating: 'info',
  calcFailed: 'error',
  calculated: 'success',
  reportGenerating: 'warning',
  reportEditing: 'warning',
  done: 'success',
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
 * **V0.8：移除步骤⑤「报告」（2026-10-12）** —— 报告环节从核算流程中去掉，
 * **核算结果为最后一个节点**；报告相关能力改由「产品碳足迹 · 报告管理」承载
 * （企业信息维护 / 报告编制 / 敏感性分析 / 数据质量评价，暂占位待完善）。
 * 历史口径：V0.7 原 ④碳足迹核算 + ⑤核算结果 合并为 ④「碳足迹核算与结果」
 * （核算执行与结果查看是同一个闭环，不再拆成两个步骤节点）。
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
  { seq: 2, name: '产品建模', batch: 3, delivered: true },
  { seq: 3, name: '数据检测', batch: 5, delivered: true },
  { seq: 4, name: '碳足迹核算与结果', batch: 5, delivered: true },
]

/**
 * 可编辑状态（2026-10-16）：
 * - `new` / `ongoing` / `toCheck` / `toCalc` / `calcFailed`：可直接编辑；
 * - `calculated`：历史态，可编辑，保存后回退「待处理」并需重走检测 → 核算（E13）；
 * - `done`（已完成）：**结果不锁定**——仍可编辑 / 重新检测 / 重新核算 / 重新计算；
 *   但**步骤①「目标与范围」锁定只读**（仅步骤②「产品建模」可改），
 *   改数据保存时弹「数据变更」提示并回退「待检测」重走检测 → 核算。
 */
export const PCF_EDITABLE_STATUSES: PcfProjectStatus[] = [
  'new',
  'ongoing',
  'toCheck',
  'toCalc',
  'calcFailed',
  'calculated',
  'done',
]

/**
 * 需要「编辑即回退重跑」的状态（2026-10-16）：保存后回退「待检测」，
 * 需重走一键检测 → 核算（V0.8 起不含历史报告态）。
 */
export const PCF_REVERT_STATUSES: PcfProjectStatus[] = [
  'toCheck',
  'toCalc',
  'calculating',
  'calcFailed',
  'calculated',
  'done',
]

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
