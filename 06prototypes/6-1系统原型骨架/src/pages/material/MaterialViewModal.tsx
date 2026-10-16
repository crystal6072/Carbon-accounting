import { useCallback, useEffect, useState } from 'react'
import { Button, Modal, Tag, useToast } from '@/shared/components'
import { fetchMaterial } from '@/mock'
import type { MaterialItem } from '@/types'
import {
  industriesText,
  materialFlowTypeText,
  materialFlowTypeTone,
  materialSubCategoryText,
  useStatusText,
  useStatusTone,
} from './materialMeta'

interface MaterialViewModalProps {
  open: boolean
  materialId: string | null
  onClose: () => void
  /** 点击「编辑」：由调用页关闭查看弹窗并打开编辑弹窗 */
  onEdit: (materialId: string) => void
}

/** 物料查看弹窗（只读）：使用状态画在内容区，不做标题栏 Badge */
export default function MaterialViewModal({ open, materialId, onClose, onEdit }: MaterialViewModalProps) {
  const toast = useToast()

  const [material, setMaterial] = useState<MaterialItem | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!open || !materialId) return
    setLoading(true)
    try {
      setMaterial(await fetchMaterial(materialId))
    } catch (error) {
      toast(error instanceof Error ? error.message : '物料加载失败', 'error')
      setMaterial(null)
    } finally {
      setLoading(false)
    }
  }, [open, materialId, toast])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <Modal
      open={open}
      title="查看物料"
      onClose={onClose}
      footer={
        <>
          <Button data-ann-target="material.view.close" onClick={onClose}>关闭</Button>
          <Button variant="primary" data-ann-target="material.view.edit" disabled={!material} onClick={() => material && onEdit(material.id)}>
            编辑
          </Button>
        </>
      }
    >
      {loading && <div className="empty">加载中…</div>}
      {!loading && !material && <div className="empty">物料不存在或已被删除</div>}
      {!loading && material && (
        <>
          <div className="view-block" data-ann-target="material.view.body">
            <div className="view-block-title">基本信息</div>
            <div className="detail-list">
              <div className="detail-item">
                <span className="detail-label">物料编码</span>
                <span className="detail-value mono">{material.code}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">物料名称</span>
                <span className="detail-value">{material.name}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">物料类型</span>
                <span className="detail-value">
                  <span className="flex gap-xs">
                    <Tag tone={materialFlowTypeTone[material.flowType]}>
                      {materialFlowTypeText[material.flowType]}
                    </Tag>
                    {material.subCategory && <Tag>{materialSubCategoryText[material.subCategory]}</Tag>}
                  </span>
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">适用行业</span>
                <span className="detail-value">{industriesText(material.industries)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">使用状态</span>
                <span className="detail-value">
                  <Tag tone={useStatusTone[material.status]}>{useStatusText[material.status]}</Tag>
                </span>
              </div>
              <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                <span className="detail-label">物料描述</span>
                <span className="detail-value">{material.description || '-'}</span>
              </div>
            </div>
          </div>

          <div className="view-block" data-ann-target="material.view.meta">
            <div className="view-block-title">制单信息</div>
            <div className="detail-list">
              <div className="detail-item">
                <span className="detail-label">创建人</span>
                <span className="detail-value">{material.createdBy}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">创建时间</span>
                <span className="detail-value">{material.createdAt}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">更新人</span>
                <span className="detail-value">{material.updatedBy}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">更新时间</span>
                <span className="detail-value">{material.updatedAt}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </Modal>
  )
}
