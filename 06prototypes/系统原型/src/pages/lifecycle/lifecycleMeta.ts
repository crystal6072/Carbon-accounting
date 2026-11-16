import type { TagTone } from '@/shared/components'
import type { EnableStatus, LifecycleLevel, LifecycleStageItem } from '@/types'

/* ===================== 阶段层级（仅一级 / 二级，D03） ===================== */

export const levelText: Record<LifecycleLevel, string> = {
  1: '一级',
  2: '二级',
}

export const levelTone: Record<LifecycleLevel, TagTone> = {
  1: 'info',
  2: 'default',
}

/* ===================== 使用状态（启用 / 禁用） ===================== */

export const useStatusText: Record<EnableStatus, string> = {
  enabled: '启用',
  disabled: '禁用',
}

export const useStatusTone: Record<EnableStatus, TagTone> = {
  enabled: 'success',
  disabled: 'default',
}

/* ===================== 行操作可用性 ===================== */

/**
 * 删除入口可用性：**仅「已禁用」的阶段可删除**（启用态隐藏入口）。
 * 轻量基础数据不设数据来源与引用状态：编辑与启用 / 禁用对所有阶段开放。
 */
export const canDeleteStage = (item: Pick<LifecycleStageItem, 'status'>) => item.status === 'disabled'

/* ===================== 展示格式化 ===================== */

/** 适用系统边界：为空 = 全边界通用（引用「数据字典 · 系统边界」字典项编码） */
export const isCommonBoundary = (item: Pick<LifecycleStageItem, 'boundaries'>) => item.boundaries.length === 0

/* ===================== 排序与分组 ===================== */

const byOrder = (a: LifecycleStageItem, b: LifecycleStageItem) => a.order - b.order || a.code.localeCompare(b.code)

export interface LifecycleGroup {
  primary: LifecycleStageItem
  children: LifecycleStageItem[]
}

/** 按「一级阶段（按阶段顺序）+ 其下二级阶段（按阶段顺序）」分组 */
export function groupStages(list: LifecycleStageItem[]): LifecycleGroup[] {
  const primaries = list.filter((item) => item.level === 1).slice().sort(byOrder)
  return primaries.map((primary) => ({
    primary,
    children: list.filter((item) => item.parentId === primary.id).slice().sort(byOrder),
  }))
}

/** 同级排序默认值：同级最大值 + 10（【待确认 Q04】） */
export function suggestOrder(list: LifecycleStageItem[], level: LifecycleLevel, parentId: string | null): number {
  const scope = list.filter((item) => item.level === level && (level === 1 || item.parentId === parentId))
  const max = scope.reduce((acc, item) => Math.max(acc, item.order), 0)
  return Math.min(max + 10, 99)
}
