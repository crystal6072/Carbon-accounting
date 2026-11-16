import { useState } from 'react'
import type { PcfLifecycleStage } from '@/types'
import './PcfPage.css'

interface LifecycleTreeProps {
  stages: PcfLifecycleStage[]
  emptyText: string
}

/**
 * 生命周期阶段树形展示：一级可展开 / 收起，二级缩进带引导点。
 * PCF 步骤①「目标与范围」与模型「目标与范围」共用（仅展示，不含编辑）。
 */
export default function LifecycleTree({ stages, emptyText }: LifecycleTreeProps) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())

  const primaries = stages.filter((s) => s.level === 1)
  if (primaries.length === 0) return <div className="pcf-placeholder">{emptyText}</div>

  const toggle = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="pcf-lifecycle-tree">
      {primaries.map((primary) => {
        const children = stages.filter((s) => s.level === 2 && s.parentName === primary.name)
        const open = !collapsedIds.has(primary.id)
        return (
          <div className="pcf-lifecycle-branch" key={primary.id}>
            <button
              type="button"
              className={['pcf-lifecycle-primary', open ? 'open' : ''].filter(Boolean).join(' ')}
              onClick={() => children.length > 0 && toggle(primary.id)}
              disabled={children.length === 0}
            >
              {children.length > 0 ? (
                <span className="pcf-lifecycle-arrow" aria-hidden>
                  ▸
                </span>
              ) : (
                <span className="pcf-lifecycle-arrow is-leaf" aria-hidden />
              )}
              <span className="pcf-lifecycle-name">{primary.name}</span>
              {children.length > 0 && <span className="pcf-lifecycle-badge">{children.length} 项</span>}
            </button>
            {open &&
              children.map((child) => (
                <div className="pcf-lifecycle-child" key={child.id}>
                  <span className="pcf-lifecycle-dot" aria-hidden />
                  <span className="pcf-lifecycle-name">{child.name}</span>
                </div>
              ))}
          </div>
        )
      })}
    </div>
  )
}
