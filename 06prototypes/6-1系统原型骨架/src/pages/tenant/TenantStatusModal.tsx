import { useEffect, useState } from 'react'
import { Button, FormField, Icon, Modal, useToast } from '@/shared/components'
import type { Tenant } from '@/types'
import { enabledMemberCount, memberUsage, updateTenantStatus } from '@/mock/tenant'

interface TenantStatusModalProps {
  open: boolean
  tenant: Tenant | null
  /** disable 停用 / enable 启用（业务 PRD C06 选 B：两者均二次确认） */
  mode: 'disable' | 'enable'
  onClose: () => void
  onDone: () => void
}

/**
 * 租户 · 停用 / 启用二次确认。
 * 停用：全员掉线、数据冻结、拒绝登录（§4.4）；启用：恢复登录，不启用此前单独停用的成员（§4.5）。
 */
export default function TenantStatusModal({ open, tenant, mode, onClose, onDone }: TenantStatusModalProps) {
  const toast = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [ack, setAck] = useState(false)
  const [usage, setUsage] = useState(0)
  const [enabled, setEnabled] = useState(0)

  useEffect(() => {
    if (open && tenant) {
      setAck(false)
      setUsage(memberUsage(tenant.id))
      setEnabled(enabledMemberCount(tenant.id))
    }
  }, [open, tenant])

  const isDisable = mode === 'disable'

  const handleConfirm = async () => {
    if (!tenant) return
    if (isDisable && !ack) {
      toast('请先确认停用影响', 'error')
      return
    }
    setSubmitting(true)
    try {
      await updateTenantStatus(tenant.id, isDisable ? 'disabled' : 'enabled')
      toast(isDisable ? '停用成功' : '启用成功')
      onDone()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      title={isDisable ? '确认停用' : '确认启用'}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" disabled={submitting} onClick={() => void handleConfirm()}>
            {isDisable ? '确认停用' : '确认启用'}
          </Button>
        </>
      }
    >
      <div className="modal-confirm-text" data-ann-target="tenant.modal.status">
        <span style={{ color: 'var(--color-warning)', display: 'flex' }}>
          <Icon name="warning" size={16} />
        </span>
        <div>
          <div>
            确认{isDisable ? '停用' : '启用'}租户「{tenant?.name}」？
          </div>
          {isDisable && (
            <div className="modal-confirm-tip">停用即全员掉线、数据冻结：该租户全部成员会话立即失效，拒绝登录与一切写操作，数据保留。</div>
          )}
          {!isDisable && <div className="modal-confirm-tip">启用后恢复登录能力；此前被单独停用的成员不随租户恢复而启用。</div>}
        </div>
      </div>

      {isDisable && usage > 0 && (
        <div className="tenant-impact">
          <span className="tenant-impact-title">
            <Icon name="warning" size={14} />
            {usage} 名成员将全部掉线
          </span>
        </div>
      )}

      {!isDisable && enabled > 0 && (
        <div className="tenant-impact">
          <span className="tenant-impact-title">
            <Icon name="check" size={14} />
            恢复后 {enabled} 名成员可登录
          </span>
        </div>
      )}

      {isDisable && (
        <FormField label="确认影响" required>
          <label className="tenant-ack">
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
            <span>已知悉：停用后该租户 {usage} 名成员全部掉线，数据冻结，需重新启用方可登录。</span>
          </label>
        </FormField>
      )}
    </Modal>
  )
}
