import { Button, Modal, Table, Tag } from '@/shared/components'
import type { Column, TagTone } from '@/shared/components'
import { resolveFormulaText } from '@/shared/formulaMeta'
import type { EmissionCategory, FlowItemType, OperationFlowItem, OperationItem, OperationType } from '@/types'
import './ProcessPage.css'

interface ProcessOperationViewModalProps {
  open: boolean
  /** 当前选中的工序（画布节点引用工序），为空时不展示内容 */
  operation: OperationItem | null
  onClose: () => void
}

const operationTypeText: Record<OperationType, string> = {
  main: '主工序',
  auxiliary: '辅助工序',
  disposal: '处置工序',
}

const operationTypeTone: Record<OperationType, TagTone> = {
  main: 'info',
  auxiliary: 'default',
  disposal: 'warning',
}

const flowTypeText: Record<FlowItemType, string> = {
  material: '原辅料',
  energy: '能源',
  resource: '自然资源输入',
  semi: '中间品',
  product: '产品',
  byproduct: '副产品',
  emission: '排放物',
}

const flowTypeTone: Record<FlowItemType, TagTone> = {
  material: 'info',
  energy: 'warning',
  resource: 'info',
  semi: 'default',
  product: 'success',
  byproduct: 'default',
  emission: 'error',
}

const emissionCategoryText: Record<EmissionCategory, string> = {
  gas: '废气',
  wastewater: '废水',
  residue: '废渣',
}

/**
 * 查看工序（只读）
 * 字段口径与「工序详情页」一致，且**仅展示**：工序编码、名称、类型、描述、投入项、产出项（2026-09-21 确认）。
 * 投入产出流维护归属「工序管理」（A4），此处只读引用。
 */
export default function ProcessOperationViewModal({
  open,
  operation,
  onClose,
}: ProcessOperationViewModalProps) {
  const flowColumns: Column<OperationFlowItem>[] = [
    { key: 'seq', title: '序号', width: 56, align: 'center' },
    {
      key: 'flowType',
      title: '流类型',
      width: 116,
      render: (row) => <Tag tone={flowTypeTone[row.flowType]}>{flowTypeText[row.flowType]}</Tag>,
    },
    {
      key: 'refName',
      title: '物料',
      width: 170,
      render: (row) => (
        <span className="flex gap-xs">
          <span>{row.refName}</span>
          <span className="mono toolbar-tip">{row.refCode}</span>
        </span>
      ),
    },
    { key: 'unit', title: '单位', width: 80 },
    {
      key: 'formula',
      title: '计算公式',
      width: 210,
      render: (row) => {
        const { text, excluded } = resolveFormulaText(
          row.flowType,
          row.refName,
          row.formulaName,
          row.formulaCode,
          row.disposal,
        )
        return excluded ? (
          <Tag tone="default">{text}</Tag>
        ) : (
          <span className="toolbar-tip" title={row.formulaExpression}>
            {text}
          </span>
        )
      },
    },
    {
      key: 'emissionCategory',
      title: '排放物类别',
      width: 104,
      render: (row) =>
        row.flowType === 'emission' && row.emissionCategory ? (
          <Tag tone="error">{emissionCategoryText[row.emissionCategory]}</Tag>
        ) : (
          '-'
        ),
    },
    { key: 'remark', title: '备注', render: (row) => row.remark || '-' },
  ]

  return (
    <Modal
      open={open}
      title="查看工序"
      size="lg"
      onClose={onClose}
      footer={<Button onClick={onClose}>关闭</Button>}
    >
      {!operation ? (
        <div className="empty">该节点尚未选择工序，请先在节点中选择工序后再查看。</div>
      ) : (
        <>
          <div className="detail-list">
            <div className="detail-item">
              <span className="detail-label">工序编码</span>
              <span className="detail-value mono">{operation.code}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">工序名称</span>
              <span className="detail-value">{operation.name}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">工序类型</span>
              <span className="detail-value">
                <Tag tone={operationTypeTone[operation.type]}>{operationTypeText[operation.type]}</Tag>
              </span>
            </div>
            <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
              <span className="detail-label">工序描述</span>
              <span className="detail-value">{operation.description || '-'}</span>
            </div>
          </div>

          <div className="op-view-block">
            <div className="section-header">
              <span className="section-title">投入项</span>
            </div>
            <div className="process-table-wrap">
              <Table
                columns={flowColumns}
                data={operation.inputs}
                rowKey={(row) => row.id}
                emptyText="暂无投入项"
              />
            </div>
          </div>

          <div className="op-view-block">
            <div className="section-header">
              <span className="section-title">产出项</span>
            </div>
            <div className="process-table-wrap">
              <Table
                columns={flowColumns}
                data={operation.outputs}
                rowKey={(row) => row.id}
                emptyText="暂无产出项"
              />
            </div>
          </div>
        </>
      )}
    </Modal>
  )
}
