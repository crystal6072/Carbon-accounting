import { Button, Icon, Modal } from '@/shared/components'
import type { EnableStatus } from '@/types'

export type LifecycleConfirmMode = 'enable' | 'disable' | 'delete'

interface LifecycleConfirmTarget {
  code: string
  name: string
  level: 1 | 2
  status: EnableStatus
}

interface LifecycleConfirmModalProps {
  open: boolean
  stage: LifecycleConfirmTarget | null
  mode: LifecycleConfirmMode
  /** 删除一级阶段时其下二级阶段数量；> 0 时阻断删除并在弹窗中明示 */
  childCount?: number
  /** 禁用一级阶段时将同步禁用的二级阶段数量（启用态）；> 0 时在禁用提示中明示级联 */
  cascadeCount?: number
  onClose: () => void
  onConfirm: () => void
}

const TITLE: Record<LifecycleConfirmMode, string> = {
  enable: '确认启用',
  disable: '确认禁用',
  delete: '确认删除',
}

/** 启用 / 禁用 / 删除二次确认：确认按钮语义化，禁止用「确定」 */
export default function LifecycleConfirmModal({
  open,
  stage,
  mode,
  childCount = 0,
  cascadeCount = 0,
  onClose,
  onConfirm,
}: LifecycleConfirmModalProps) {
  const level = stage?.level === 2 ? '二级' : '一级'
  /** 删除被阻断：一级阶段下仍有二级阶段（与 mock 层 deleteLifecycleStage 校验口径一致） */
  const deleteBlocked = mode === 'delete' && (childCount ?? 0) > 0
  /** 禁用级联提示：一级阶段且存在启用态二级阶段时，明示同步禁用 */
  const cascadeTip = mode === 'disable' && stage?.level === 1 && cascadeCount > 0

  return (
    <Modal
      open={open}
      title={TITLE[mode]}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button data-ann-target="lifecycle.confirm.cancel" onClick={onClose}>取消</Button>
          <Button
            variant={mode === 'delete' ? 'danger' : 'primary'}
            onClick={onConfirm}
            disabled={deleteBlocked}
            data-ann-target="lifecycle.confirm.ok"
          >
            {TITLE[mode]}
          </Button>
        </>
      }
    >
      <div className="modal-confirm-text">
        <span style={{ color: 'var(--color-warning)', display: 'flex' }}>
          <Icon name="warning" size={16} />
        </span>
        <div>
          <div>
            确认将{level}阶段「{stage?.name}」（{stage?.code}）
            {mode === 'enable' ? '启用' : mode === 'disable' ? '禁用' : '删除'}？
          </div>
          {mode === 'enable' && (
            <div className="modal-confirm-tip">启用后该阶段可被新项目按「系统边界」加载。</div>
          )}
          {mode === 'disable' && (
            <div className="modal-confirm-tip">
              禁用后该阶段不可被新项目加载；
              {cascadeTip ? `其下 ${cascadeCount} 个二级阶段将同步禁用；` : ''}
              已加载该阶段的在途项目按基线快照运行、不受影响。禁用后可执行删除。
            </div>
          )}
          {mode === 'delete' && (
            <div className="modal-confirm-tip">
              删除后不可恢复。仅「已禁用」的阶段可删除；当前使用状态为「
              {stage?.status === 'disabled' ? '禁用' : '启用'}」。
            </div>
          )}
          {deleteBlocked && (
            <div className="modal-confirm-tip" style={{ color: 'var(--color-danger)' }}>
              删除失败：该一级阶段下存在 {childCount} 个二级阶段，请先处理其下二级阶段后再删除。
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
