import { Button, Modal } from '@/shared/components'
import type { CarbonDetectionItem, ShelfStatus } from '@/types'

export type ConfirmMode = 'shelf_on' | 'shelf_off' | 'delete'

interface CarbonDetectionConfirmModalProps {
  open: boolean
  /** 单行操作为记录对象；批量操作传 null，用 count 展示数量 */
  item: CarbonDetectionItem | null
  mode: ConfirmMode
  count?: number
  submitting?: boolean
  onClose: () => void
  onConfirm: () => void
}

interface ModeConfig {
  title: string
  body: (item: CarbonDetectionItem | null, count?: number) => string
  confirmText: string
  danger?: boolean
}

const CONFIG: Record<ConfirmMode, ModeConfig> = {
  shelf_on: {
    title: '确认上架',
    body: (item) =>
      item
        ? `上架后「${item.sampleName}」（${item.code}）可被业务使用。`
        : '上架后所选记录可被业务使用。',
    confirmText: '确认上架',
  },
  shelf_off: {
    title: '确认下架',
    body: (item) =>
      item
        ? `下架后「${item.sampleName}」（${item.code}）停止对外提供；已引用数据保留，不影响查看 / 编辑 / 导出（R-008 / R-009）。`
        : '下架后所选记录停止对外提供；已引用数据保留，不影响查看 / 编辑 / 导出（R-008 / R-009）。',
    confirmText: '确认下架',
  },
  delete: {
    title: '确认删除',
    body: (item) =>
      item
        ? `删除「${item.sampleName}」（${item.code}）为物理删除，不可恢复（R-010）。`
        : '删除为物理删除，不可恢复（R-010）。',
    confirmText: '确认删除',
    danger: true,
  },
}

/** 上架 / 下架 / 删除 二次确认（语义化按钮，禁止「确定」，R-008 / R-010） */
export default function CarbonDetectionConfirmModal({
  open,
  item,
  mode,
  count,
  submitting,
  onClose,
  onConfirm,
}: CarbonDetectionConfirmModalProps) {
  const cfg = CONFIG[mode]
  return (
    <Modal
      open={open}
      title={cfg.title}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button data-ann-target="carbon.confirm.cancel" onClick={onClose}>取消</Button>
          <Button data-ann-target="carbon.confirm.ok" variant={cfg.danger ? 'danger' : 'primary'} disabled={submitting} onClick={onConfirm}>
            {submitting ? '处理中…' : cfg.confirmText}
          </Button>
        </>
      }
    >
      <p className="confirm-body">{cfg.body(item, count)}</p>
    </Modal>
  )
}
