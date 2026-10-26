import { useEffect, useMemo, useState } from 'react'
import { Button, FormField, Input, Modal, useToast } from '@/shared/components'
import type { PlatformRole } from '@/types'
import { assignAccountRoles, fetchPlatformRoles } from '@/mock/account'

interface AccountRoleModalProps {
  open: boolean
  accountId: string | null
  accountName: string
  currentRoleIds: string[]
  onClose: () => void
  onSaved: () => void
}

/** 平台账号 · 分配平台角色：1 ~ 5 个，至少 1 个；超级管理员为保护角色，不可全部移除 */
export default function AccountRoleModal({
  open,
  accountId,
  accountName,
  currentRoleIds,
  onClose,
  onSaved,
}: AccountRoleModalProps) {
  const toast = useToast()
  const [roles, setRoles] = useState<PlatformRole[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setSelected(currentRoleIds)
    void fetchPlatformRoles().then(setRoles)
  }, [open, currentRoleIds])

  const toggle = (roleId: string) => {
    setSelected((prev) => (prev.includes(roleId) ? prev.filter((item) => item !== roleId) : [...prev, roleId]))
  }

  const tooFew = selected.length === 0
  const overLimit = selected.length > 5

  const selectedNames = useMemo(
    () => roles.filter((role) => selected.includes(role.id)).map((role) => role.name),
    [roles, selected],
  )

  const handleSave = async () => {
    if (!accountId) return
    if (tooFew) {
      toast('至少保留 1 个平台角色', 'error')
      return
    }
    if (overLimit) {
      toast('平台角色最多 5 个', 'error')
      return
    }
    setSaving(true)
    try {
      await assignAccountRoles(accountId, selected)
      toast('平台角色已更新')
      onSaved()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title={<span data-ann-target="account.role.modal">{`分配平台角色 · ${accountName}`}</span>}
      size="default"
      onClose={onClose}
      footer={
        <>
          <Button data-ann-target="account.role.cancel" onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" disabled={saving || tooFew || overLimit} data-ann-target="account.role.save" onClick={() => void handleSave()}>
            保存
          </Button>
        </>
      }
    >
      <p className="form-tip" style={{ marginTop: 0 }}>
        平台账号靠平台角色取权限，一人可挂多个角色按功能码取并集；角色定义见「平台角色管理」，此处只指派平台角色（租户角色不下发给平台账号）。
      </p>

      <div className="account-role-tags" style={{ marginBottom: 'var(--space-md)' }} data-ann-target="account.role.options">
        {roles.map((role) => (
          <label key={role.id} className="account-role-option">
            <input type="checkbox" checked={selected.includes(role.id)} onChange={() => toggle(role.id)} />
            <span>{role.name}</span>
            {role.superAdmin && <span className="account-role-badge">保护角色</span>}
            {role.builtin && !role.superAdmin && <span className="account-role-badge">内置</span>}
          </label>
        ))}
      </div>

      <FormField label="已选角色" required error={tooFew ? '至少分配 1 个平台角色' : overLimit ? '最多 5 个平台角色' : ''}>
        <Input value={selectedNames.join('、')} readOnly placeholder="未选择" />
      </FormField>

      <p className="form-tip">变更实时生效，目标账号会被踢下线重新取权限；操作记前后值。</p>
    </Modal>
  )
}
