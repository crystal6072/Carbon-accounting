import { Modal, Table, useToast } from '@/shared/components'
import type { Column } from '@/shared/components'
import type { CalcRule } from '@/mock/config'

export default function ChangeLogModal({ open, rule, onClose }: { open: boolean; rule: CalcRule | null; onClose: () => void }) {
  const toast = useToast()
  const logs = rule?.changeLogs ?? []
  const columns: Column<CalcRule['changeLogs'][number]>[] = [
    { key: 'time', title: '变更时间', width: 170, render: (r) => <span className="nowrap">{r.time}</span> },
    { key: 'operator', title: '操作人', width: 90, render: (r) => r.operator },
    { key: 'field', title: '字段', width: 130, render: (r) => r.field },
    { key: 'before', title: '前值', render: (r) => r.before || '-' },
    { key: 'after', title: '后值', render: (r) => r.after || '-' },
    { key: 'reason', title: '变更原因', render: (r) => r.reason || '-' },
  ]
  return (
    <Modal open={open} title="变更留痕" size="lg" onClose={onClose} footer={<button className="btn" onClick={onClose}>关闭</button>}>
      {logs.length === 0 ? (
        <div className="empty">暂无变更记录</div>
      ) : (
        <Table columns={columns} data={logs} rowKey={(r) => r.id} />
      )}
      {rule && <div className="toolbar-tip" style={{ marginTop: 12 }}>仅展示关键参数变更留痕；导出摘要首段亦声明本配置不参与核算求值。</div>}
    </Modal>
  )
}
