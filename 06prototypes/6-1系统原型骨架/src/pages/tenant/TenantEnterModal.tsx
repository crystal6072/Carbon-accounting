import { useEffect, useState } from 'react'
import { Button, FormField, Input, Modal, useToast } from '@/shared/components'
import type { Tenant } from '@/types'
import { enterTenant } from '@/mock/tenant'

interface TenantEnterModalProps {
  open: boolean
  tenant: Tenant | null
  onClose: () => void
  onDone: () => void
}

/**
 * 租户 · 进入租户（§4.10）：仅超管、原因必填、顶部常驻横幅、业务数据只读、进出写审计且租户侧可见。
 * 启用与停用状态均可进入（D15 / D25）。
 */
export default function TenantEnterModal({ open, tenant, onClose, onDone }: TenantEnterModalProps) {
  const toast = useToast()
  const [reason, setReason] = useState('')
  const [entered, setEntered] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setReason('')
      setEntered(false)
    }
  }, [open])

  const handleEnter = async () => {
    if (!tenant) return
    setSubmitting(true)
    try {
      await enterTenant(tenant.id, reason)
      setEntered(true)
      toast('已进入租户（只读）')
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      title={`进入租户 · ${tenant?.name ?? ''}`}
      size="sm"
      onClose={onClose}
      footer={
        entered ? (
          <Button
            variant="primary"
            onClick={() => {
              onDone()
              onClose()
            }}
          >
            退出租户
          </Button>
        ) : (
          <>
            <Button onClick={onClose}>取消</Button>
            <Button variant="primary" disabled={submitting || !reason.trim()} onClick={() => void handleEnter()}>
              进入租户
            </Button>
          </>
        )
      }
    >
      {!entered ? (
        <>
          <p className="form-tip" style={{ marginTop: 0 }}>
            进入后顶部常驻横幅，业务数据只读，写操作全禁（前端禁用、接口拒绝）。进入与退出均写平台审计并同步租户侧，客户可查。
          </p>
          <FormField label="进入原因" required error={!reason.trim() ? '原因必填' : ''}>
            <Input
              value={reason}
              placeholder="请输入进入原因，如排查客户反馈的核算数据异常"
              data-ann-target="tenant.modal.enter"
              onChange={(e) => setReason(e.target.value)}
            />
          </FormField>
        </>
      ) : (
        <>
          <div className="tenant-enter-banner">已进入租户 · 只读模式（模拟租户内顶部常驻横幅）</div>
          <p className="form-tip" style={{ marginTop: 0 }}>
            当前以只读身份浏览「{tenant?.name}」，全部写操作被禁。退出后横幅消失，进入与退出记录已写审计并同步租户侧。
          </p>
        </>
      )}
    </Modal>
  )
}
