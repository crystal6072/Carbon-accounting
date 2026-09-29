import type { TagTone } from '@/shared/components'
import type { EnableStatus, OperationItem, ProcessOperationItem, Visibility } from '@/types'

/* ===================== 使用状态（启用 / 禁用，唯一状态维度） ===================== */

export const useStatusText: Record<EnableStatus, string> = {
  enabled: '启用',
  disabled: '禁用',
}

export const useStatusTone: Record<EnableStatus, TagTone> = {
  enabled: 'success',
  disabled: 'default',
}

/* ===================== 可见性（方案 §3.3.3） ===================== */

export const visibilityText: Record<Visibility, string> = {
  ORG: '组织内可见',
  PUBLIC: '全平台只读',
}

/* ===================== 工序链校验（首末规则 + 上下游衔接，已确认 Q03） ===================== */

/**
 * 工序链校验结果
 * **三条校验全部为提示级、均不阻断保存**（2026-09-21 业务确认）：
 * - 首道投入宜含原辅料 / 能源 / 自然资源输入（D05）
 * - 末道产出宜为成品（D06）
 * - 中间「上下游衔接」（D11）
 */
export interface ProcessChainCheck {
  rowId: string
  isFirst: boolean
  isLast: boolean
  /** first 首道无上游 / ok 衔接正常 / break 衔接断点 */
  linkStatus: 'first' | 'ok' | 'break'
  linkMessage: string
  /** 首道投入是否含原辅料 / 能源 / 自然资源输入（D05，非首道行恒为 true） */
  firstInputOk: boolean
  /** 末道产出是否含成品（D06，非末道行恒为 true） */
  lastOutputIsProduct: boolean
  /** 引用工序缺失或已禁用（A17 提示，不阻断历史引用） */
  opDisabled: boolean
}

/**
 * 逐行计算工序链校验：
 * 衔接判定按**物料对象一致**（物料编码一致），不按名称文本（A10）；
 * 上游仅取「中间品 / 成品」，副产品与排放物不参与衔接。
 */
export function buildChainChecks(rows: ProcessOperationItem[], operations: OperationItem[]): ProcessChainCheck[] {
  const opMap = new Map(operations.map((op) => [op.code, op]))
  const sorted = [...rows].sort((a, b) => a.order - b.order)

  return sorted.map((row, index) => {
    const op = opMap.get(row.opCode)
    const isFirst = index === 0
    const isLast = index === sorted.length - 1

    let linkStatus: ProcessChainCheck['linkStatus'] = 'first'
    let linkMessage = '首道工序：无上游衔接校验；投入应为原辅料 / 能源 / 自然资源输入'

    if (!isFirst) {
      const prev = sorted[index - 1]
      const prevOp = opMap.get(prev.opCode)
      const prevOutputs = (prevOp?.outputs ?? []).filter(
        (item) => item.flowType === 'semi' || item.flowType === 'product',
      )
      const prevCodes = new Set(prevOutputs.map((item) => item.refCode))
      const inputs = op?.inputs ?? []
      const hit = inputs.filter((item) => prevCodes.has(item.refCode))

      if (hit.length > 0) {
        linkStatus = 'ok'
        linkMessage = `上游「${prev.opName}」产出「${hit.map((item) => item.refName).join('、')}」与本工序投入衔接`
      } else {
        linkStatus = 'break'
        linkMessage = `上游「${prev.opName}」产出（${prevOutputs.map((item) => item.refName).join('、') || '-'}）与本工序投入（${
          inputs.map((item) => item.refName).join('、') || '-'
        }）未衔接`
      }
    }

    const inputs = op?.inputs ?? []

    return {
      rowId: row.id,
      isFirst,
      isLast,
      linkStatus,
      linkMessage,
      firstInputOk: !isFirst || inputs.length === 0 || inputs.some((item) => item.flowType !== 'semi'),
      lastOutputIsProduct: !isLast || (op?.outputs ?? []).some((item) => item.flowType === 'product'),
      opDisabled: !op || op.useStatus === 'disabled',
    }
  })
}

/** 首末道标识文案（单行工序时同时为首道与末道） */
export function firstLastText(check: ProcessChainCheck): string {
  if (check.isFirst && check.isLast) return '首道 / 末道'
  if (check.isFirst) return '首道'
  if (check.isLast) return '末道'
  return '-'
}

/** 衔接校验状态文案与色板（提示级） */
export const linkStatusText: Record<ProcessChainCheck['linkStatus'], string> = {
  first: '首道',
  ok: '已衔接',
  break: '衔接断点',
}

export const linkStatusTone: Record<ProcessChainCheck['linkStatus'], TagTone> = {
  first: 'default',
  ok: 'success',
  break: 'warning',
}

/** 工序下拉选项文案：名称 +（编码）+ 已禁用标记 */
export function operationOptionLabel(op: OperationItem): string {
  return `${op.name}（${op.code}）${op.useStatus === 'disabled' ? '（已禁用）' : ''}`
}

/** 按工序顺序排序的工序明细 */
export function sortOperations(rows: ProcessOperationItem[]): ProcessOperationItem[] {
  return [...rows].sort((a, b) => a.order - b.order)
}
