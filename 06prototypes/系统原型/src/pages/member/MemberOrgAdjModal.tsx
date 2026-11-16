import { useEffect, useState } from 'react'
import { Button, FormField, Modal, TreeSelect, useToast } from '@/shared/components'
import type { TenantMemberItem, TreeOption } from '@/types'
import { fetchDeptOptions, updateMember } from '@/mock/member'
import './MemberPage.css'

interface MemberOrgAdjModalProps {
  open: boolean
  tenantId: string
  /** 目标成员（来自组织树「直属成员」或成员列表） */
  member: TenantMemberItem | null
  onClose: () => void
  onDone: () => void
}

/**
 * 调整所属组织（组织树「直属成员」区块与成员列表共用）：
 * 复用成员域更新能力，仅改 deptId / deptName，不影响账号级字段与角色。
 */
export default function MemberOrgAdjModal({ open, tenantId, member, onClose, onDone }: MemberOrgAdjModalProps) {
  const toast = useToast()
  const [deptOptions, setDeptOptions] = useState<TreeOption[]>([])
  const [deptId, setDeptId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    void (async () => {
      const tree = await fetchDeptOptions(tenantId)
      setDeptOptions(tree)
      setDeptId(member?.deptId ?? '')
    })()
  }, [open, tenantId, member])

  const handleSubmit = async () => {
    if (!member) return
    if (!deptId) {
      toast('请选择所属组织', 'error')
      return
    }
    setSubmitting(true)
    try {
      await updateMember(tenantId, member.id, {
        displayName: member.name,
        mobile: member.mobile,
        email: member.email,
        roleNames: [...member.roleNames],
        deptId,
      })
      toast('已调整所属组织')
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
      title={`调整所属组织 · ${member?.name ?? ''}`}
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
        仅调整该成员的组织归属，不影响姓名 / 手机号 / 角色等其它信息；停用组织不可选。
      </p>
      <FormField label="所属组织" required>
        <TreeSelect
          value={deptId}
          options={deptOptions}
          placeholder="请选择所属组织"
          onChange={(value) => setDeptId(value)}
        />
      </FormField>
    </Modal>
  )
}
