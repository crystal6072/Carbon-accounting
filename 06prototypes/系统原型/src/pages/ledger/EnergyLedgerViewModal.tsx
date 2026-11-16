import { Button, Modal, Tag, VoucherUpload } from '@/shared/components'
import type { EnergyLedgerItem } from '@/types'
import { energyTypeText, energyTypeTone, ledgerPeriodText, waterSourceText, electricitySourceText } from './energyLedgerMeta'

interface EnergyLedgerViewModalProps {
  open: boolean
  item: EnergyLedgerItem | null
  onClose: () => void
  onEdit: (item: EnergyLedgerItem) => void
}

/** 加工能耗台账查看弹窗（只读） */
export default function EnergyLedgerViewModal({ open, item, onClose, onEdit }: EnergyLedgerViewModalProps) {
  return (
    <Modal
      open={open}
      title="查看加工能耗台账"
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
            <div className="view-block-title">能耗信息</div>
            <div className="detail-list">
              <div className="detail-item">
                <span className="detail-label">所属工序/车间</span>
                <span className="detail-value">{item.processName}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">所属周期</span>
                <span className="detail-value nowrap">{ledgerPeriodText(item)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">能源类型</span>
                <span className="detail-value">
                  <Tag tone={energyTypeTone[item.energyType]}>{energyTypeText[item.energyType]}</Tag>
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">消耗数量</span>
                <span className="detail-value">
                  {item.consumptionAmount} {item.unit}
                </span>
              </div>
              {item.energyType === 'electricity' && (
                <div className="detail-item">
                  <span className="detail-label">用电类型</span>
                  <span className="detail-value">{item.electricitySource ? electricitySourceText[item.electricitySource] : '-'}</span>
                </div>
              )}
              {item.energyType === 'water' && (
                <div className="detail-item">
                  <span className="detail-label">水源类型</span>
                  <span className="detail-value">{item.waterSource ? waterSourceText[item.waterSource] : '-'}</span>
                </div>
              )}
              <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                <span className="detail-label">备注</span>
                <span className="detail-value">{item.remark || '-'}</span>
              </div>
              <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                <span className="detail-label">数据源凭证</span>
                <span className="detail-value">
                  <VoucherUpload value={item.vouchers ?? []} disabled onChange={() => {}} />
                </span>
              </div>

              <div className="detail-item">
                <span className="detail-label">更新时间</span>
                <span className="detail-value">{item.updatedAt}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </Modal>
  )
}
