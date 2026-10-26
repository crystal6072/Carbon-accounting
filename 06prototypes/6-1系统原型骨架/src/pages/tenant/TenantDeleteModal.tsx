import { useEffect, useState } from 'react'
import { Button, FormField, Icon, Input, Modal, useToast } from '@/shared/components'
import type { Tenant } from '@/types'
import { deleteTenant, memberUsage } from '@/mock/tenant'

interface TenantDeleteModalProps {
  open: boolean
  tenant: Tenant | null
  onClose: () => void
  onDone: () => void
}

/**
 * 租户 · 删除（真删，无冷静期、无双人复核，见交付说明偏离项）：
 * 仅允许停用状态的租户删除；二次确认输入租户当前全名后物理删除。
 * 级联范围（C-05 裁决 A「一并物理清除」/ PRD §4.8-7～11）：
 * 租户记录、扩展档案值、模块授权、状态变更记录、组织树与租户内业务数据一并清除；
 * 账号与成员关系记录保留（D03，成员关系置「已移出」便于追溯）。
 * 入口仅超管可见（C-08）。
 */
export default function TenantDeleteModal({ open, tenant, onClose, onDone }: TenantDeleteModalProps) {
  const toast = useToast()
  const [fullName, setFullName] = useState('')
  const [usage, setUsage] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open && tenant) {
      setFullName('')
      setUsage(memberUsage(tenant.id))
    }
  }, [open, tenant])

  const nameMatched = fullName.trim() === (tenant?.name ?? ' ')

  const handleDelete = async () => {
    if (!tenant) return
    setSubmitting(true)
    try {
      await deleteTenant(tenant.id, fullName)
      toast('删除成功，租户数据已物理清除')
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
      title={`删除租户 · ${tenant?.name ?? ''}`}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" disabled={!nameMatched || submitting} onClick={() => void handleDelete()}>
            确认删除
          </Button>
        </>
      }
    >
      <div className="modal-confirm-text" data-ann-target="tenant.modal.delete">
        <span style={{ color: 'var(--color-error)', display: 'flex' }}>
          <Icon name="warning" size={16} />
        </span>
        <div>
          <div>该租户已停用。删除为物理删除，不可恢复，无冷静期。</div>
          <div className="modal-confirm-tip">
            将清除租户记录、扩展档案值、{tenant?.moduleCodes.length ?? 0} 个模块授权、全部状态变更记录，以及该租户的组织树与租户内业务数据（产品库、核算项目、报告等）；账号记录与成员关系记录保留（成员关系置「已移出」便于追溯），该租户 {usage} 名成员的登录立即失效。
          </div>
        </div>
      </div>

      <FormField label="租户全名" required error={fullName && !nameMatched ? '与当前名称不一致' : ''}>
        <Input value={fullName} placeholder="请输入租户当前全名" onChange={(e) => setFullName(e.target.value)} />
      </FormField>
      <p className="form-tip">请输入租户当前全名「{tenant?.name}」以确认删除对象，输入需与实时名称完全一致。</p>
    </Modal>
  )
}
