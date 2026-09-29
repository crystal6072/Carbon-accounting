import { Button, Modal, Table, Tag } from '@/shared/components'
import type { Column, TagTone } from '@/shared/components'
import { resolveFormulaText } from '@/shared/formulaMeta'
import type { EmissionCategory, FlowItemType, ProductFlowItem, ProductOperationItem } from '@/types'
import { flowTypeText } from './productMeta'
import './ProductPage.css'

interface ProductOperationViewModalProps {
  open: boolean
  /** 当前选中的产品工序副本，为空时不展示内容 */
  operation: ProductOperationItem | null
  onClose: () => void
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
 * 查看产品工序（只读）
 * 仅展示：工序编码、名称、来源（模板复制 / 产品自建）、来源模板、复制时点、投入项、产出项。
 * 投入产出流为产品引用工艺时复制的副本，维护归属「工序管理」，此处只读。
 */
export default function ProductOperationViewModal({
  open,
  operation,
  onClose,
}: ProductOperationViewModalProps) {
  const flowColumns: Column<ProductFlowItem>[] = [
    { key: 'seq', title: '序号', width: 56, align: 'center' },
    {
      key: 'type',
      title: '流类型',
      width: 120,
      render: (row) => <Tag tone={flowTypeTone[row.type]}>{flowTypeText[row.type]}</Tag>,
    },
    { key: 'name', title: '物料', width: 180, render: (row) => row.name },
    { key: 'qty', title: '数量', width: 90, align: 'right', render: (row) => String(row.qty) },
    { key: 'unit', title: '单位', width: 80 },
    {
      key: 'formula',
      title: '计算公式',
      width: 210,
      render: (row) => {
        const { text, excluded } = resolveFormulaText(
          row.type,
          row.name,
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
      width: 110,
      render: (row) =>
        row.type === 'emission' && row.emissionCategory ? (
          <Tag tone="error">{emissionCategoryText[row.emissionCategory]}</Tag>
        ) : (
          '-'
        ),
    },
  ]

  return (
    <Modal open={open} title="查看工序" size="lg" onClose={onClose} footer={<Button onClick={onClose}>关闭</Button>}>
      {!operation ? (
        <div className="empty">暂无工序数据</div>
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
              <span className="detail-label">来源</span>
              <span className="detail-value">
                <span className="flex gap-xs">
                  <Tag tone={operation.origin === 'custom' ? 'info' : 'default'}>
                    {operation.origin === 'custom' ? '产品自建' : '模板复制'}
                  </Tag>
                  {operation.sourceUpdated && <span className="template-flag">模板已更新</span>}
                </span>
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">来源模板</span>
              <span className="detail-value mono">{operation.sourceCode || '-'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">复制时点</span>
              <span className="detail-value">{operation.sourceCopiedAt || '-'}</span>
            </div>
          </div>

          <div className="op-view-block">
            <div className="section-header">
              <span className="section-title">投入项</span>
            </div>
            <div className="process-table-wrap">
              <Table columns={flowColumns} data={operation.inputs} rowKey={(row) => row.id} emptyText="暂无投入项" />
            </div>
          </div>

          <div className="op-view-block">
            <div className="section-header">
              <span className="section-title">产出项</span>
            </div>
            <div className="process-table-wrap">
              <Table columns={flowColumns} data={operation.outputs} rowKey={(row) => row.id} emptyText="暂无产出项" />
            </div>
          </div>
        </>
      )}
    </Modal>
  )
}
