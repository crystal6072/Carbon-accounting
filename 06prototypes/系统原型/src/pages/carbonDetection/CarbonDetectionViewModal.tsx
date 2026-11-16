import { useCallback, useEffect, useState } from 'react'
import { Button, Modal, Tag, VoucherUpload, useToast } from '@/shared/components'
import { fetchCarbonDetection } from '@/mock'
import type { CarbonDetectionItem } from '@/types'
import { shelfStatusText, shelfStatusTone } from './carbonDetectionMeta'

interface CarbonDetectionViewModalProps {
  open: boolean
  detectionId: string | null
  onClose: () => void
  /** 点击「编辑」：由调用页关闭查看弹窗并打开编辑弹窗 */
  onEdit: (id: string) => void
}

/** 含碳量检测查看弹窗（只读）：使用状态画在内容区，不做标题栏 Badge */
export default function CarbonDetectionViewModal({ open, detectionId, onClose, onEdit }: CarbonDetectionViewModalProps) {
  const toast = useToast()

  const [item, setItem] = useState<CarbonDetectionItem | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!open || !detectionId) return
    setLoading(true)
    try {
      setItem(await fetchCarbonDetection(detectionId))
    } catch (error) {
      toast(error instanceof Error ? error.message : '检测记录加载失败', 'error')
      setItem(null)
    } finally {
      setLoading(false)
    }
  }, [open, detectionId, toast])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <Modal
      open={open}
      title="查看含碳量检测"
      onClose={onClose}
      footer={
        <>
          <Button data-ann-target="carbon.view.close" onClick={onClose}>
            关闭
          </Button>
          <Button variant="primary" data-ann-target="carbon.view.edit" disabled={!item} onClick={() => item && onEdit(item.id)}>
            编辑
          </Button>
        </>
      }
    >
      {loading && <div className="empty">加载中…</div>}
      {!loading && !item && <div className="empty">检测记录不存在或已被删除</div>}
      {!loading && item && (
        <>
          <div className="view-block" data-ann-target="carbon.view.body">
            <div className="view-block-title">样品信息</div>
            <div className="detail-list">
              <div className="detail-item">
                <span className="detail-label">报告编号</span>
                <span className="detail-value">{item.reportNo}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">样品名称</span>
                <span className="detail-value">{item.sampleName}</span>
              </div>
              <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                <span className="detail-label">样品描述</span>
                <span className="detail-value">{item.sampleDesc || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">委托单位</span>
                <span className="detail-value">{item.clientUnit}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">样品数量</span>
                <span className="detail-value">{item.quantity}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">收样日期</span>
                <span className="detail-value">{item.receiveDate}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">检测周期</span>
                <span className="detail-value">
                  {item.detectionCycleStart} 至 {item.detectionCycleEnd}
                </span>
              </div>
            </div>
          </div>

          <div className="view-block">
            <div className="view-block-title">检测信息</div>
            <div className="detail-list">
              <div className="detail-item">
                <span className="detail-label">检测机构</span>
                <span className="detail-value">{item.detectionAgency || '-'}</span>
              </div>
              <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                <span className="detail-label">检测项目及结果</span>
                <span className="detail-value" style={{ whiteSpace: 'pre-wrap' }}>{item.detectionItems || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">报告日期</span>
                <span className="detail-value">{item.reportDate}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">检测标准</span>
                <span className="detail-value">{item.standard}</span>
              </div>
              <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                <span className="detail-label">客户信息</span>
                <span className="detail-value">{item.customerInfo || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">使用状态</span>
                <span className="detail-value">
                  <Tag tone={shelfStatusTone[item.status]}>{shelfStatusText[item.status]}</Tag>
                </span>
              </div>
            </div>
          </div>

          <div className="view-block">
            <div className="view-block-title">报告附件</div>
            <div className="detail-list">
              <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                <span className="detail-label">附件</span>
                <span className="detail-value">
                  <VoucherUpload value={item.attachments ?? []} disabled onChange={() => {}} />
                </span>
              </div>
            </div>
          </div>

          <div className="view-block">
            <div className="view-block-title">制单信息</div>
            <div className="detail-list">
              <div className="detail-item">
                <span className="detail-label">创建人</span>
                <span className="detail-value">{item.createdBy}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">创建时间</span>
                <span className="detail-value">{item.createdAt}</span>
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
