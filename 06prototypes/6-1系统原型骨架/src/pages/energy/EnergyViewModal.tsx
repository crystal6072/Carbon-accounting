import { useCallback, useEffect, useState } from 'react'
import { Button, Modal, Tag, useToast } from '@/shared/components'
import { fetchEnergy } from '@/mock'
import type { EnergyItem } from '@/types'
import { energyTypeText, energyTypeTone, industriesText, useStatusText, useStatusTone } from './energyMeta'

interface EnergyViewModalProps {
  open: boolean
  energyId: string | null
  onClose: () => void
  /** 点击「编辑」：由调用页关闭查看弹窗并打开编辑弹窗 */
  onEdit: (energyId: string) => void
}

/** 能源查看弹窗（只读）：使用状态画在内容区，不做标题栏 Badge */
export default function EnergyViewModal({ open, energyId, onClose, onEdit }: EnergyViewModalProps) {
  const toast = useToast()

  const [energy, setEnergy] = useState<EnergyItem | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!open || !energyId) return
    setLoading(true)
    try {
      setEnergy(await fetchEnergy(energyId))
    } catch (error) {
      toast(error instanceof Error ? error.message : '能源加载失败', 'error')
      setEnergy(null)
    } finally {
      setLoading(false)
    }
  }, [open, energyId, toast])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <Modal
      open={open}
      title="查看能源"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>关闭</Button>
          <Button variant="primary" disabled={!energy} onClick={() => energy && onEdit(energy.id)}>
            编辑
          </Button>
        </>
      }
    >
      {loading && <div className="empty">加载中…</div>}
      {!loading && !energy && <div className="empty">能源不存在或已被删除</div>}
      {!loading && energy && (
        <>
          <div className="view-block">
            <div className="view-block-title">基本信息</div>
            <div className="detail-list">
              <div className="detail-item">
                <span className="detail-label">能源编码</span>
                <span className="detail-value mono">{energy.code}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">能源名称</span>
                <span className="detail-value">{energy.name}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">能源类型</span>
                <span className="detail-value">
                  <Tag tone={energyTypeTone[energy.energyType]}>{energyTypeText[energy.energyType]}</Tag>
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">使用状态</span>
                <span className="detail-value">
                  <Tag tone={useStatusTone[energy.status]}>{useStatusText[energy.status]}</Tag>
                </span>
              </div>
              <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                <span className="detail-label">适用行业</span>
                <span className="detail-value">{industriesText(energy.industries)}</span>
              </div>
              <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                <span className="detail-label">能源描述</span>
                <span className="detail-value">{energy.description || '-'}</span>
              </div>
            </div>
          </div>

          <div className="view-block">
            <div className="view-block-title">制单信息</div>
            <div className="detail-list">
              <div className="detail-item">
                <span className="detail-label">创建人</span>
                <span className="detail-value">{energy.createdBy}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">创建时间</span>
                <span className="detail-value">{energy.createdAt}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">更新人</span>
                <span className="detail-value">{energy.updatedBy}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">更新时间</span>
                <span className="detail-value">{energy.updatedAt}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </Modal>
  )
}
