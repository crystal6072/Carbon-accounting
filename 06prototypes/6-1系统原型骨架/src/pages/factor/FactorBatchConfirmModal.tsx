import { Button, Icon, Modal } from '@/shared/components'

/** 批量操作类型：`reference` 引入后台因子 / `import` 模板导入（结果弹窗共用） */
export type FactorBatchMode = 'enable' | 'disable' | 'delete' | 'reference' | 'import'

interface FactorBatchConfirmModalProps {
  open: boolean
  mode: FactorBatchMode
  count: number
  submitting: boolean
  onClose: () => void
  onConfirm: () => void
}

const TITLE: Record<FactorBatchMode, string> = {
  enable: '批量启用',
  disable: '批量禁用',
  delete: '批量删除',
  reference: '引用因子库',
  import: '导入因子',
}

const TEXT: Record<FactorBatchMode, string> = {
  enable: '批量启用后，所选因子可重新参与因子匹配。',
  disable: '批量禁用后，所选因子不再参与新的因子匹配；命中「已冻结 / 草稿 / 已被引用」的条目将被跳过。',
  delete: '批量删除仅对「组织自建 + 草稿 + 已禁用 + 未被引用」的因子生效；其余条目将被跳过并返回原因。',
  reference: '引用后因子在本组织可见且只读，仍由后台统一维护。',
  import: '按模板导入的因子默认启用，因子编码由系统生成。',
}

/** 批量操作二次确认 */
export default function FactorBatchConfirmModal({
  open,
  mode,
  count,
  submitting,
  onClose,
  onConfirm,
}: FactorBatchConfirmModalProps) {
  return (
    <Modal
      open={open}
      title={TITLE[mode]}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button
            variant={mode === 'delete' ? 'danger' : 'primary'}
            disabled={submitting}
            onClick={onConfirm}
          >
            {submitting ? '处理中…' : `确认${TITLE[mode].replace('批量', '')}`}
          </Button>
        </>
      }
    >
      <div className="modal-confirm-text">
        <span style={{ color: mode === 'delete' ? 'var(--color-error)' : 'var(--color-warning)', display: 'flex' }}>
          <Icon name="warning" size={16} />
        </span>
        <div>
          <div>
            已选 <strong>{count}</strong> 条因子，是否执行「{TITLE[mode]}」？
          </div>
          <div className="modal-confirm-tip">{TEXT[mode]}</div>
        </div>
      </div>
    </Modal>
  )
}
