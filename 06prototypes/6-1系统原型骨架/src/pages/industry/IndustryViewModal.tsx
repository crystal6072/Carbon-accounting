import type { ReactNode } from 'react'
import { Button, Modal, Tag } from '@/shared/components'
import type { IndustryItem } from '@/types'
import { levelText, useStatusText, useStatusTone } from './industryMeta'

interface IndustryViewModalProps {
  open: boolean
  item: IndustryItem | null
  parentName: string
  onClose: () => void
  onEdit: (item: IndustryItem) => void
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="detail-item">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{children}</span>
    </div>
  )
}

/** 查看行业弹窗：使用状态在内容区，底栏「关闭 + 编辑」 */
export default function IndustryViewModal({ open, item, parentName, onClose, onEdit }: IndustryViewModalProps) {
  return (
    <Modal
      open={open}
      title="查看行业"
      onClose={onClose}
      footer={
        <>
          <Button data-ann-target="industry.view.close" onClick={onClose}>关闭</Button>
          <Button variant="primary" data-ann-target="industry.view.edit" onClick={() => item && onEdit(item)}>
            编辑
          </Button>
        </>
      }
    >
      {item && (
        <>
          <div className="detail-list" data-ann-target="industry.view.body">
            <Row label="行业编码">
              <span className="mono">{item.code}</span>
            </Row>
            <Row label="行业名称">{item.name}</Row>
            <Row label="上级行业">{parentName}</Row>
            <Row label="行业层级">{levelText(item.level)}</Row>
            <Row label="排序号">{item.sortNo == null ? '-' : item.sortNo}</Row>
            <Row label="使用状态">
              <Tag tone={useStatusTone[item.status]}>{useStatusText[item.status]}</Tag>
            </Row>
            <Row label="创建人">{item.createdBy}</Row>
            <Row label="创建时间">{item.createdAt}</Row>
            <Row label="最后修改时间">{item.updatedAt}</Row>
          </div>
          <div className="view-block" style={{ marginTop: 'var(--space-md)' }}>
            <div className="view-block-title">行业描述</div>
            <div>{item.description || '-'}</div>
          </div>
        </>
      )}
    </Modal>
  )
}
