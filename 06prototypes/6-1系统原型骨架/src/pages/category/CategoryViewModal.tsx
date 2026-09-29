import type { ReactNode } from 'react'
import { Button, Modal, Tag } from '@/shared/components'
import type { CategoryItem } from '@/types'
import { levelText } from '@/shared/utils/tree'

interface CategoryViewModalProps {
  open: boolean
  item: CategoryItem | null
  parentName: string
  onClose: () => void
  onEdit: (item: CategoryItem) => void
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="detail-item">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{children}</span>
    </div>
  )
}

/** 查看分类弹窗：使用状态在内容区，底栏「关闭 + 编辑」 */
export default function CategoryViewModal({ open, item, parentName, onClose, onEdit }: CategoryViewModalProps) {
  return (
    <Modal
      open={open}
      title="查看分类"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>关闭</Button>
          <Button variant="primary" onClick={() => item && onEdit(item)}>
            编辑
          </Button>
        </>
      }
    >
      {item && (
        <div className="detail-list">
          <Row label="分类编码">
            <span className="mono">{item.code}</span>
          </Row>
          <Row label="分类名称">{item.name}</Row>
          <Row label="上级分类">{parentName}</Row>
          <Row label="分类层级">{levelText(item.level)}</Row>
          <Row label="排序号">{item.sortNo == null ? '-' : item.sortNo}</Row>
          <Row label="使用状态">
            <Tag tone={item.status === 'enabled' ? 'success' : 'default'}>
              {item.status === 'enabled' ? '启用' : '禁用'}
            </Tag>
          </Row>
          <Row label="创建人">{item.createdBy}</Row>
          <Row label="创建时间">{item.createdAt}</Row>
          <Row label="最后修改时间">{item.updatedAt}</Row>
          <Row label="备注">{item.remark || '-'}</Row>
        </div>
      )}
    </Modal>
  )
}
