import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Modal, useToast } from '@/shared/components'
import StageParamPanel, { type StageParamPanelHandle } from './StageParamPanel'
import './PcfPage.css'

interface StageParamModalProps {
  open: boolean
  /** 可选的生命周期阶段（多选） */
  stages: { id: string; name: string }[]
  /** 各阶段已保存的基础参数（用于表单初始化） */
  stageMetaMap: Record<string, Record<string, string | number> | null | undefined>
  /** 默认预选中的阶段（如当前活动阶段） */
  defaultStageId?: string
  /** 是否可编辑 */
  editable: boolean
  onClose: () => void
  /** 保存某阶段的基础参数 */
  onSaveParam: (stageId: string, metadata: Record<string, string | number> | null) => Promise<void>
}

/**
 * 「过程参数维护」弹窗：
 * - 先多选生命周期阶段；
 * - 按所选阶段逐个渲染「阶段基础参数」表单卡片（字段 / 生成按钮随阶段联动）；
 * - 点击生成按钮仅在面板内显示结果，不回填活动数据；
 * - 底部统一【清空 / 取消 / 保存】操作当前已选阶段。
 */
export default function StageParamModal({
  open,
  stages,
  stageMetaMap,
  defaultStageId,
  editable,
  onClose,
  onSaveParam,
}: StageParamModalProps) {
  const toast = useToast()
  const [selectedIds, setSelectedIds] = useState<string[]>(defaultStageId ? [defaultStageId] : [])

  /** 每次打开弹窗时按当前活动阶段重置预选，关闭后不影响其它状态 */
  useEffect(() => {
    if (open) setSelectedIds(defaultStageId ? [defaultStageId] : [])
  }, [open, defaultStageId])

  /** 按所选顺序过滤出实际要渲染的阶段卡片 */
  const orderedSelected = useMemo(
    () => stages.filter((stage) => selectedIds.includes(stage.id)),
    [stages, selectedIds],
  )

  const toggleStage = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const selectAll = () => setSelectedIds(stages.map((stage) => stage.id))
  const clearAll = () => setSelectedIds([])

  /** 各阶段面板暴露的命令式句柄（用于统一保存 / 清空） */
  const panelRefs = useRef<Record<string, StageParamPanelHandle>>({})
  const [savingAll, setSavingAll] = useState(false)

  /** 清空当前已选阶段的所有表单（重置为初始值） */
  const handleClear = () => {
    if (!editable) return
    selectedIds.forEach((id) => panelRefs.current[id]?.reset())
  }

  /** 统一保存当前已选全部阶段的参数 */
  const handleSaveAll = async () => {
    if (!editable || savingAll) return
    setSavingAll(true)
    try {
      for (const id of selectedIds) {
        const panel = panelRefs.current[id]
        if (panel) await panel.save()
      }
      toast('过程参数已保存')
      onClose()
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSavingAll(false)
    }
  }

  return (
    <Modal
      open={open}
      title="过程参数维护"
      size="xl"
      onClose={onClose}
      footer={
        <div className="pcf-param-modal-footer">
          <Button variant="default" disabled={!editable} onClick={handleClear}>
            清空
          </Button>
          <div className="pcf-inline">
            <Button variant="default" onClick={onClose}>
              取消
            </Button>
            <Button variant="primary" disabled={!editable || savingAll} onClick={handleSaveAll}>
              保存
            </Button>
          </div>
        </div>
      }
    >
      <div className="pcf-param-modal">
        <div className="pcf-param-stages" data-ann-target="pcf.step2.stageParam.select">
          <div className="pcf-param-stages-head">
            <span className="view-block-title">选择生命周期阶段（可多选）</span>
            <span className="pcf-inline">
              <button type="button" className="link" onClick={selectAll}>
                全选
              </button>
              <button type="button" className="link" onClick={clearAll}>
                清空
              </button>
            </span>
          </div>
          <div className="pcf-param-stage-chips">
            {stages.map((stage) => {
              const checked = selectedIds.includes(stage.id)
              return (
                <label
                  key={stage.id}
                  className={`pcf-param-stage-chip ${checked ? 'is-checked' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!editable}
                    onChange={() => toggleStage(stage.id)}
                  />
                  <span className="nowrap">{stage.name}</span>
                </label>
              )
            })}
          </div>
        </div>

        <div className="pcf-param-forms">
          {orderedSelected.length === 0 ? (
            <div className="pcf-placeholder">请勾选需要维护过程参数的生命周期阶段</div>
          ) : (
            orderedSelected.map((stage) => (
              <StageParamPanel
                key={stage.id}
                ref={(el) => {
                  if (el) panelRefs.current[stage.id] = el
                  else delete panelRefs.current[stage.id]
                }}
                stageId={stage.id}
                stageName={stage.name}
                metadata={stageMetaMap[stage.id] ?? null}
                editable={editable}
                onSave={onSaveParam}
              />
            ))
          )}
        </div>
      </div>
    </Modal>
  )
}
