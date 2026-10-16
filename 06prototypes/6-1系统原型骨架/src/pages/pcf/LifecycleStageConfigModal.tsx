import { useEffect, useMemo, useState } from 'react'
import { Button, Modal } from '@/shared/components'
import type { PcfLifecycleStage } from '@/types'

interface LifecycleStageConfigModalProps {
  open: boolean
  /** 当前系统边界带出的生命周期阶段（含纳入状态） */
  stages: PcfLifecycleStage[]
  onClose: () => void
  onConfirm: (stages: PcfLifecycleStage[]) => void
}

/**
 * 步骤①「生命周期阶段配置」弹窗（对齐竞品交互）：
 * 四列表格「一级阶段名称 | 一级阶段描述 | 二级阶段名称 | 二级阶段描述」，
 * 一级 / 二级阶段均可勾选，勾选一级联动其下二级，可全选 / 全不选后确定回写。
 */
export default function LifecycleStageConfigModal({
  open,
  stages,
  onClose,
  onConfirm,
}: LifecycleStageConfigModalProps) {
  const [draft, setDraft] = useState<PcfLifecycleStage[]>([])

  useEffect(() => {
    if (open) setDraft(stages.map((stage) => ({ ...stage })))
  }, [open, stages])

  const groups = useMemo(() => {
    const primaries = draft.filter((stage) => stage.level === 1)
    return primaries.map((primary) => ({
      primary,
      children: draft.filter((stage) => stage.level === 2 && stage.parentName === primary.name),
    }))
  }, [draft])

  const includedCount = draft.filter((stage) => stage.included).length

  const toggle = (stage: PcfLifecycleStage) => {
    setDraft((prev) => {
      const nextIncluded = !prev.find((item) => item.id === stage.id)?.included
      return prev.map((item) => {
        if (item.id === stage.id) return { ...item, included: nextIncluded }
        // 一级阶段联动其下二级阶段
        if (stage.level === 1 && item.level === 2 && item.parentName === stage.name) {
          return { ...item, included: nextIncluded }
        }
        return item
      })
    })
  }

  const setAll = (included: boolean) => setDraft((prev) => prev.map((item) => ({ ...item, included })))

  return (
    <Modal
      open={open}
      title={<span data-ann-target="pcf.step1.stageConfig.modal">生命周期阶段配置</span>}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" onClick={() => onConfirm(draft)}>
            确定
          </Button>
        </>
      }
    >
      <div className="pcf-stage-config-toolbar">
        <span className="toolbar-tip">
          已纳入 {includedCount} / {draft.length} 个阶段；默认全部纳入，可按项目实际情况自定义
        </span>
        <span className="pcf-stage-config-actions">
          <button className="link" onClick={() => setAll(true)}>
            全选
          </button>
          <button className="link" onClick={() => setAll(false)}>
            全不选
          </button>
        </span>
      </div>

      <div className="pcf-stage-config-table-wrap">
        {groups.length === 0 ? (
          <div className="pcf-placeholder">当前系统边界下暂无可选生命周期阶段</div>
        ) : (
          <table className="pcf-stage-config-table">
            <thead>
              <tr>
                <th style={{ width: 150 }}>一级阶段名称</th>
                <th>一级阶段描述</th>
                <th style={{ width: 170 }}>二级阶段名称</th>
                <th>二级阶段描述</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(({ primary, children }) => {
                const rowSpan = Math.max(children.length, 1)
                return children.length === 0 ? (
                  <tr key={primary.id}>
                    <td rowSpan={rowSpan}>
                      <label className="pcf-stage-check">
                        <input type="checkbox" checked={primary.included} onChange={() => toggle(primary)} />
                        <span>{primary.name}</span>
                      </label>
                    </td>
                    <td rowSpan={rowSpan} className="pcf-stage-desc">
                      {primary.description || '-'}
                    </td>
                    <td className="pcf-stage-desc">-</td>
                    <td className="pcf-stage-desc">-</td>
                  </tr>
                ) : (
                  children.map((child, index) => (
                    <tr key={child.id}>
                      {index === 0 && (
                        <>
                          <td rowSpan={rowSpan}>
                            <label className="pcf-stage-check">
                              <input type="checkbox" checked={primary.included} onChange={() => toggle(primary)} />
                              <span>{primary.name}</span>
                            </label>
                          </td>
                          <td rowSpan={rowSpan} className="pcf-stage-desc">
                            {primary.description || '-'}
                          </td>
                        </>
                      )}
                      <td>
                        <label className="pcf-stage-check">
                          <input type="checkbox" checked={child.included} onChange={() => toggle(child)} />
                          <span>{child.name}</span>
                        </label>
                      </td>
                      <td className="pcf-stage-desc">{child.description || '-'}</td>
                    </tr>
                  ))
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="pcf-stage-config-note">
        注意：二级阶段为一级阶段的从属明细；取消勾选一级阶段将同步取消其下二级阶段。取消纳入的阶段可不填报活动数据。
      </div>
    </Modal>
  )
}
