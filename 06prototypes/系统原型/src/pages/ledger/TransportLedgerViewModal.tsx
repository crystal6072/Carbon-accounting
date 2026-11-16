import { Button, Modal, Tag } from '@/shared/components'
import type { TransportLedgerItem } from '@/types'
import {
  transportDateText,
  transportModeText,
  transportModeTone,
  transportSegments,
  transportTypeText,
  transportTypeTone,
} from './transportLedgerMeta'

interface TransportLedgerViewModalProps {
  open: boolean
  item: TransportLedgerItem | null
  onClose: () => void
  onEdit: (item: TransportLedgerItem) => void
}

/** 运输台账查看弹窗（只读）：记录级汇总信息 + 运输分段明细 */
export default function TransportLedgerViewModal({ open, item, onClose, onEdit }: TransportLedgerViewModalProps) {
  const segments = item ? transportSegments(item) : []

  return (
    <Modal
      open={open}
      title="查看运输台账"
      size="xl"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>关闭</Button>
          <Button variant="primary" disabled={!item} onClick={() => item && onEdit(item)}>
            编辑
          </Button>
        </>
      }
    >
      {!item && <div className="empty">记录不存在或已被删除</div>}
      {item && (
        <>
          <div className="view-block">
            <div className="view-block-title">运输信息</div>
            <div className="detail-list">
              <div className="detail-item">
                <span className="detail-label">运输类型</span>
                <span className="detail-value">
                  <Tag tone={transportTypeTone[item.transportType]}>{transportTypeText[item.transportType]}</Tag>
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">运输段数</span>
                <span className="detail-value">
                  {segments.length} 段{segments.length > 1 ? '（多式联运）' : ''}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">运输方式</span>
                <span className="detail-value">
                  <span className="segment-mode-chain">
                    {segments.map((seg, index) => (
                      <span key={seg.id}>
                        <Tag tone={transportModeTone[seg.transportMode]}>{transportModeText[seg.transportMode]}</Tag>
                        {index < segments.length - 1 && <span className="segment-arrow"> → </span>}
                      </span>
                    ))}
                  </span>
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">总运输距离</span>
                <span className="detail-value">{item.distance} km</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">运输日期</span>
                <span className="detail-value">{transportDateText(item)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">更新时间</span>
                <span className="detail-value">{item.updatedAt || '-'}</span>
              </div>
            </div>
          </div>

          <div className="view-block">
            <div className="view-block-title">运输分段明细（共 {segments.length} 段）</div>
            <div className="material-table-wrap segment-detail-table">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>段序</th>
                    <th>运输方式</th>
                    <th>起点 → 终点</th>
                    <th>距离(km)</th>
                    <th>实际载重(t)</th>
                    <th>装载率(%)</th>
                    <th>能耗(L)</th>
                    <th>承运商</th>
                    <th>关联单据号</th>
                  </tr>
                </thead>
                <tbody>
                  {segments.map((seg, index) => (
                    <tr key={seg.id}>
                      <td>第 {index + 1} 段</td>
                      <td>
                        <Tag tone={transportModeTone[seg.transportMode]}>{transportModeText[seg.transportMode]}</Tag>
                      </td>
                      <td>
                        {seg.startPoint || '-'} → {seg.endPoint || '-'}
                      </td>
                      <td>{seg.distance}</td>
                      <td>{seg.loadWeight}</td>
                      <td>{seg.loadingRate != null ? seg.loadingRate : '-'}</td>
                      <td>{seg.fuelConsumption}</td>
                      <td>{seg.carrier || '-'}</td>
                      <td className="mono">{seg.relatedOrder || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </Modal>
  )
}
