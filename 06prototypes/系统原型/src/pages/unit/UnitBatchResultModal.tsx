import { Button, Modal, Table } from '@/shared/components'
import type { Column } from '@/shared/components'
import type { UnitBatchFailure, UnitBatchResult } from '@/mock'
import type { UnitBatchMode } from './UnitBatchConfirmModal'

interface UnitBatchResultModalProps {
  open: boolean
  mode: UnitBatchMode
  result: UnitBatchResult | null
  onClose: () => void
}

/** 批量启用 / 删除结果：成功条数 + 被跳过条目的原因清单 */
export default function UnitBatchResultModal({ open, mode, result, onClose }: UnitBatchResultModalProps) {
  const columns: Column<UnitBatchFailure>[] = [
    { key: 'name', title: '单位名称', width: 140, render: (row) => row.name || '-' },
    { key: 'symbol', title: '单位符号', width: 110, render: (row) => <span className="mono">{row.symbol}</span> },
    { key: 'reason', title: '跳过原因', render: (row) => row.reason },
  ]

  return (
    <Modal
      open={open}
      title="批量操作结果"
      onClose={onClose}
      footer={
        <Button variant="primary" onClick={onClose}>
          知道了
        </Button>
      }
    >
      <div className="modal-confirm-text" data-ann-target="unit.batch.result">
        <div>
          批量{mode === 'enable' ? '启用' : '删除'}完成：成功 <strong>{result?.success ?? 0}</strong> 条，跳过{' '}
          <strong>{result?.failed.length ?? 0}</strong> 条。跳过条目未做任何改动。
        </div>
      </div>
      <div style={{ marginTop: 'var(--space-md)' }}>
        <Table
          columns={columns}
          data={result?.failed ?? []}
          rowKey={(row) => row.id}
          emptyText="没有被跳过的单位"
        />
      </div>
    </Modal>
  )
}
