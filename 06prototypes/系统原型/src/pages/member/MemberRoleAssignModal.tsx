import { useEffect, useState } from 'react'
import { Button, FormField, Modal, MultiSelect, useToast } from '@/shared/components'
import type { MultiSelectOption } from '@/shared/components'
import type { Role, TenantMemberItem } from '@/types'
import { fetchTenantRoleOptions, updateMember } from '@/mock/member'
import { ROLE_MAX } from './memberMeta'
import './MemberPage.css'

interface MemberRoleAssignModalProps {
  open: boolean
  tenantId: string
  /** 目标成员（来自组织树「直属成员」或成员列表） */
  member: TenantMemberItem | null
  onClose: () => void
  onDone: () => void
}

/**
 * 分配角色（组织树「直属成员」区块与成员列表共用）：
 * 复用成员域更新能力，仅改 roleNames；仅可指派本租户启用状态的租户角色。
 */
export default function MemberRoleAssignModal({ open, tenantId, member, onClose, onDone }: MemberRoleAssignModalProps) {
  const toast = useToast()
  const [roles, setRoles] = useState<Role[]>([])
  const [roleNames, setRoleNames] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const roleOptions: MultiSelectOption[] = roles.map((role) => ({ label: role.name, value: role.name }))

  useEffect(() => {
    if (!open) return
    void (async () => {
      const list = await fetchTenantRoleOptions(tenantId)
      setRoles(list)
      setRoleNames([...(member?.roleNames ?? [])])
    })()
  }, [open, tenantId, member])

  const handleSubmit = async () => {
    if (!member) return
    if (roleNames.length < 1) {
      toast('至少指派 1 个角色', 'error')
      return
    }
    if (roleNames.length > ROLE_MAX) {
      toast(`角色最多 ${ROLE_MAX} 个`, 'error')
      return
    }
    setSubmitting(true)
    try {
      await updateMember(tenantId, member.id, {
        displayName: member.name,
        mobile: member.mobile,
        email: member.email,
        roleNames,
        deptId: member.deptId,
      })
      toast('已更新角色')
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
      title={`分配角色 · ${member?.name ?? ''}`}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" disabled={submitting} onClick={() => void handleSubmit()}>
            确认
          </Button>
        </>
      }
    >
      <p className="form-tip" style={{ marginTop: 0 }}>
        仅调整该成员的角色，不影响其它信息；仅可指派本租户启用状态的租户角色（1 至 {ROLE_MAX} 个）。
      </p>
      <FormField label="角色" required hint={`1 至 ${ROLE_MAX} 个，至少 1 个`}>
        <MultiSelect
          value={roleNames}
          options={roleOptions}
          placeholder="请选择角色"
          onChange={(value) => setRoleNames(value)}
        />
      </FormField>
    </Modal>
  )
}
