import { useEffect, useState } from 'react'
import { Button, FormField, Input, Modal, useToast } from '@/shared/components'
import type { Tenant } from '@/types'
import { DEFAULT_MEMBER_LIMIT, memberUsage, MEMBER_LIMIT_MAX, updateMemberLimit } from '@/mock/tenant'

interface TenantLimitModalProps {
  open: boolean
  tenant: Tenant | null
  onClose: () => void
  onDone: () => void
}

/** 租户 · 调整成员数上限（§4.3）：取值 1 至 10000，新建默认 10000；下调不强制移出，只禁新增 */
export default function TenantLimitModal({ open, tenant, onClose, onDone }: TenantLimitModalProps) {
  const toast = useToast()
  const [value, setValue] = useState('')
  const [usage, setUsage] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open && tenant) {
      setValue(String(tenant.memberLimit))
      setUsage(memberUsage(tenant.id))
    }
  }, [open, tenant])

  const parsed = Number(value.trim())
  const invalid = !Number.isInteger(parsed) || parsed < 1 || parsed > MEMBER_LIMIT_MAX

  const handleSubmit = async () => {
    if (!tenant) return
    if (invalid) {
      toast(`成员数上限取值 1 至 ${MEMBER_LIMIT_MAX}（E03）`, 'error')
      return
    }
    setSubmitting(true)
    try {
      await updateMemberLimit(tenant.id, parsed)
      toast('成员数上限已调整')
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
      title={`调整成员数上限 · ${tenant?.name ?? ''}`}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" disabled={submitting || invalid} onClick={() => void handleSubmit()}>
            保存
          </Button>
        </>
      }
    >
      <p className="form-tip" style={{ marginTop: 0 }}>
        当前用量 {usage} 名（含主管理员、停用与已移出成员）· 当前上限 {tenant?.memberLimit} 名。新建租户时成员数上限默认为 {DEFAULT_MEMBER_LIMIT}。
      </p>
      <FormField
        label="成员数上限"
        required
        error={invalid && value ? `取值 1 至 ${MEMBER_LIMIT_MAX} 的整数` : ''}
        hint="下调至低于当前用量时，仅禁止新增成员，不强制移出存量成员"
      >
        <Input
          value={value}
          placeholder={`请输入 1 至 ${MEMBER_LIMIT_MAX} 的整数`}
          data-ann-target="tenant.modal.limit"
          onChange={(e) => setValue(e.target.value)}
        />
      </FormField>
      {!invalid && parsed < usage && (
        <p className="form-tip">新上限低于当前用量 {usage} 名：保存后禁止新增成员，存量成员保留。</p>
      )}
    </Modal>
  )
}
