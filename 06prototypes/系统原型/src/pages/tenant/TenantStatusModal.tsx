import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, FormField, Icon, Modal, useToast } from '@/shared/components'
import type { Tenant } from '@/types'
import { availableAdminCount, enabledMemberCount, memberUsage, updateTenantStatus } from '@/mock/tenant'

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
 *
 * 启用前置（E38）：停用期间管理员账号可能被平台停用、成员可能被禁用，
 * 启用后若「可用管理员数 = 0」，租户将无人可管 —— 此时阻断启用，并就地给出
 * 「启用管理员账号 / 指定主管理员」两个出口，避免把死锁从停用挪到启用。
 */
export default function TenantStatusModal({ open, tenant, mode, onClose, onDone }: TenantStatusModalProps) {
  const toast = useToast()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [ack, setAck] = useState(false)
  const [usage, setUsage] = useState(0)
  const [enabled, setEnabled] = useState(0)
  const [availableAdmin, setAvailableAdmin] = useState(0)

  useEffect(() => {
    if (open && tenant) {
      setAck(false)
      setUsage(memberUsage(tenant.id))
      setEnabled(enabledMemberCount(tenant.id))
      setAvailableAdmin(availableAdminCount(tenant.id))
    }
  }, [open, tenant])

  const isDisable = mode === 'disable'
  /** 启用被阻断：该租户已无可用管理员 */
  const noAdmin = !isDisable && availableAdmin === 0

  const handleConfirm = async () => {
    if (!tenant) return
    if (noAdmin) {
      toast('该租户无可用管理员，请先启用管理员账号或指定主管理员', 'error')
      return
    }
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
          {noAdmin && (
            <>
              <Button
                data-ann-target="tenant.status.goto-admin-account"
                onClick={() => navigate(tenant?.adminAccountId ? `/system/account/${tenant.adminAccountId}` : '/system/account-query')}
              >
                启用管理员账号
              </Button>
              <Button variant="primary" data-ann-target="tenant.status.goto-assign" onClick={() => navigate(`/system/tenant/${tenant?.id}`)}>
                去指定主管理员
              </Button>
            </>
          )}
          <Button variant="primary" disabled={submitting || noAdmin} onClick={() => void handleConfirm()}>
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

      {noAdmin && (
        <div className="tenant-impact" data-ann-target="tenant.status.no-admin">
          <div>
            <span className="tenant-impact-title">
              <Icon name="warning" size={14} />
              该租户当前无可用管理员，无法启用
            </span>
            <div className="tenant-impact-note">
              可用管理员指「成员状态正常 + 账号启用 + 持『租户管理员』角色」。
              停用期间管理员账号可能已被平台停用、或成员已被禁用，启用前须先补齐管理员，否则启用后无人可管。
            </div>
          </div>
        </div>
      )}

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
