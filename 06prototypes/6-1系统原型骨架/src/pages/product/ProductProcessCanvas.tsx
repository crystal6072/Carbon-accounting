import { Fragment, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, Tag } from '@/shared/components'
import type { ProductOperationItem, ProductProcessItem } from '@/types'
import ProductOperationViewModal from './ProductOperationViewModal'
import './ProductPage.css'

interface ProductProcessCanvasProps {
  processes: ProductProcessItem[]
}

/**
 * 产品工艺与工序「流程画布」（只读）：
 * 每个工艺流程渲染为一组横向节点流，节点自左向右即工序顺序；
 * 单击选中节点，双击或点「查看工序」打开工序详情；支持画布全屏展示。
 */
export default function ProductProcessCanvas({ processes }: ProductProcessCanvasProps) {
  const [selectedId, setSelectedId] = useState('')
  const [viewOperation, setViewOperation] = useState<ProductOperationItem | null>(null)
  const [fullscreen, setFullscreen] = useState(false)

  const allOperations = useMemo(() => processes.flatMap((process) => process.operations), [processes])
  const selectedOperation = useMemo(
    () => allOperations.find((op) => op.id === selectedId) ?? null,
    [allOperations, selectedId],
  )

  const handleViewSelected = () => {
    if (selectedOperation) setViewOperation(selectedOperation)
  }

  const renderToolbar = () => (
    <div className="pcf-canvas-toolbar">
      <Button size="small" onClick={handleViewSelected} disabled={!selectedOperation}>
        查看工序
      </Button>
      {!fullscreen && (
        <Button size="small" onClick={() => setFullscreen(true)}>
          全屏
        </Button>
      )}
      <span className="toolbar-tip">单击选中节点，双击节点或点「查看工序」查看详情 · 共 {allOperations.length} 道工序</span>
    </div>
  )

  const renderBlocks = () =>
    processes.map((process) => (
      <div className="sub-block" key={process.id}>
        <div className="sub-block-header">
          <span className="sub-block-title">
            <span>
              工艺顺序 {process.seq}：{process.processName}
            </span>
            <Tag>{process.processCode}</Tag>
          </span>
          <span className="sub-block-actions">
            <span className="toolbar-tip">
              {process.lifecycleStage} · 工序 {process.operations.length} 道
            </span>
          </span>
        </div>
        <div className="pcf-flow-stage">
          <div className="flow-track">
            {process.operations.length === 0 ? (
              <div className="flow-empty">暂无工序</div>
            ) : (
              process.operations.map((op, index) => (
                <Fragment key={op.id}>
                  {index > 0 && <div className="flow-link" />}
                  <div
                    className={['flow-node', selectedId === op.id ? 'flow-node-selected' : ''].filter(Boolean).join(' ')}
                    onClick={() => setSelectedId(op.id)}
                    onDoubleClick={() => setViewOperation(op)}
                  >
                    <span className="flow-node-anchor flow-node-anchor-top" />
                    <div className="flow-node-head">
                      <span className="flow-node-seq">{op.seq}</span>
                      <span className="flow-node-name">{op.name}</span>
                      {op.sourceUpdated && <span className="template-flag">模板已更新</span>}
                    </div>
                    <div className="flow-node-meta">
                      <span className="mono">{op.code}</span>
                      {op.origin === 'custom' && <Tag tone="info">产品自建</Tag>}
                    </div>
                    <div className="flow-node-flow">
                      <span className="flow-node-flow-line">
                        投入：{op.inputs.map((item) => item.name).join('、') || '-'}
                      </span>
                      <span className="flow-node-flow-line">
                        产出：{op.outputs.map((item) => item.name).join('、') || '-'}
                      </span>
                    </div>
                    <span className="flow-node-anchor flow-node-anchor-bottom" />
                  </div>
                </Fragment>
              ))
            )}
          </div>
        </div>
      </div>
    ))

  return (
    <>
      <div className="pcf-canvas">
        {renderToolbar()}
        <div className="pcf-canvas-body">{renderBlocks()}</div>
      </div>

      {fullscreen &&
        createPortal(
          <div className="pcf-fullscreen">
            <div className="pcf-fullscreen-header">
              <span className="pcf-fullscreen-title">产品工艺与工序 · 流程画布</span>
              <Button size="small" onClick={() => setFullscreen(false)}>
                退出全屏
              </Button>
            </div>
            <div className="pcf-fullscreen-body">
              {renderToolbar()}
              <div className="pcf-canvas-body">{renderBlocks()}</div>
            </div>
          </div>,
          document.body,
        )}

      <ProductOperationViewModal
        open={viewOperation !== null}
        operation={viewOperation}
        onClose={() => setViewOperation(null)}
      />
    </>
  )
}
