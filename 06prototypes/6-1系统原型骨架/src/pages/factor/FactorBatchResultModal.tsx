import { Button, Modal, Table } from '@/shared/components'
import type { Column } from '@/shared/components'
import type { FactorBatchResult } from '@/mock'
import type { FactorBatchMode } from './FactorBatchConfirmModal'

interface FactorBatchResultModalProps {
  open: boolean
  mode: FactorBatchMode
  result: FactorBatchResult | null
  onClose: () => void
}

const MODE_LABEL: Record<FactorBatchMode, string> = {
  enable: '批量启用',
  disable: '批量禁用',
  delete: '批量删除',
  reference: '引用因子库',
  import: '导入因子',
}

/** 批量操作结果：成功 N 条 + 跳过清单与原因 */
export default function FactorBatchResultModal({ open, mode, result, onClose }: FactorBatchResultModalProps) {
  const columns: Column<FactorBatchResult['failed'][number]>[] = [
    { key: 'code', title: mode === 'import' ? '行标识' : '因子编码', width: 110 },
    { key: 'name', title: '因子名称', width: 200 },
    { key: 'reason', title: '跳过原因', render: (row) => row.reason },
  ]

  return (
    <Modal
      open={open}
      title={`${MODE_LABEL[mode]}结果`}
      size="lg"
      onClose={onClose}
      footer={
        <Button variant="primary" onClick={onClose}>
          知道了
        </Button>
      }
    >
      <div className="view-block">
        <div className="view-block-title">处理结果</div>
        <div className="factor-batch-summary">
          <span>
            成功 <strong>{result?.success ?? 0}</strong> 条
          </span>
          <span>
            跳过 <strong>{result?.failed.length ?? 0}</strong> 条
          </span>
        </div>
      </div>
      {result && result.failed.length > 0 && (
        <div className="view-block">
          <div className="view-block-title">跳过清单</div>
          <div className="factor-table-wrap">
            <Table columns={columns} data={result.failed} rowKey={(row) => row.id} />
          </div>
        </div>
      )}
    </Modal>
  )
}
