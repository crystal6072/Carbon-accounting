import { Button, Modal, Table } from '@/shared/components'
import type { Column } from '@/shared/components'
import type { EnergyBatchFailure, EnergyBatchResult } from '@/mock'
import type { EnableStatus } from '@/types'

interface EnergyBatchResultModalProps {
  open: boolean
  /** 本次批量操作的目标状态 */
  status: EnableStatus
  result: EnergyBatchResult | null
  onClose: () => void
}

/** 批量启停结果：成功条数 + 被跳过条目的原因清单 */
export default function EnergyBatchResultModal({ open, status, result, onClose }: EnergyBatchResultModalProps) {
  const columns: Column<EnergyBatchFailure>[] = [
    { key: 'code', title: '能源编码', width: 120, render: (row) => <span className="mono">{row.code}</span> },
    { key: 'name', title: '能源名称', width: 140, render: (row) => row.name || '-' },
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
      <div className="modal-confirm-text" data-ann-target="energy.batch.result">
        <div>
          批量{status === 'enabled' ? '启用' : '停用'}完成：成功 <strong>{result?.success ?? 0}</strong> 条，
          跳过 <strong>{result?.failed.length ?? 0}</strong> 条。跳过条目未做任何改动。
        </div>
      </div>
      <div style={{ marginTop: 'var(--space-md)' }}>
        <Table
          columns={columns}
          data={result?.failed ?? []}
          rowKey={(row) => row.id}
          emptyText="没有被跳过的能源"
        />
      </div>
    </Modal>
  )
}
