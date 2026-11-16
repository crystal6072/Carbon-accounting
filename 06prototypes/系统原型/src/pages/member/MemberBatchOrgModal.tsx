import { useEffect, useState } from 'react'
import { Button, FormField, Modal, TreeSelect, useToast } from '@/shared/components'
import type { TreeOption } from '@/types'
import { fetchDeptOptions, moveMembersToDept } from '@/mock/member'
import './MemberPage.css'

interface MemberBatchOrgModalProps {
  open: boolean
  tenantId: string
  /** 待移动成员 id 列表 */
  memberIds: string[]
  onClose: () => void
  onDone: () => void
}

/** 批量调整所属组织：列表勾选多人 → 选目标组织 → 一次移动 */
export default function MemberBatchOrgModal({ open, tenantId, memberIds, onClose, onDone }: MemberBatchOrgModalProps) {
  const toast = useToast()
  const [deptOptions, setDeptOptions] = useState<TreeOption[]>([])
  const [deptId, setDeptId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    void (async () => {
      const tree = await fetchDeptOptions(tenantId)
      setDeptOptions(tree)
      setDeptId('')
    })()
  }, [open, tenantId])

  const handleSubmit = async () => {
    if (!deptId) {
      toast('请选择目标组织', 'error')
      return
    }
    setSubmitting(true)
    try {
      const moved = await moveMembersToDept(tenantId, memberIds, deptId)
      toast(`已移动 ${moved} 名成员至目标组织`)
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
      title={`批量调整所属组织（${memberIds.length} 人）`}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" disabled={submitting} onClick={() => void handleSubmit()}>
            确认移动
          </Button>
        </>
      }
    >
      <p className="form-tip" style={{ marginTop: 0 }}>
        将选中的 {memberIds.length} 名成员统一移动到同一目标组织；目标组织须为启用状态。移动后，成员的姓名 / 手机号 / 角色不变。
      </p>
      <FormField label="目标组织" required>
        <TreeSelect value={deptId} options={deptOptions} placeholder="请选择目标组织" onChange={(value) => setDeptId(value)} />
      </FormField>
    </Modal>
  )
}
