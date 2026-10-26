import { useEffect, useMemo, useState } from 'react'
import { Button, FormField, Icon, Modal, TreeSelect, useToast } from '@/shared/components'
import type { MemberDetail, TreeOption } from '@/types'
import { fetchDeptOptions, updateMemberStatus } from '@/mock/member'

interface MemberStatusModalProps {
  open: boolean
  tenantId: string
  member: MemberDetail | null
  /** disable = 禁用（离岗）；enable = 启用（复岗） */
  mode: 'disable' | 'enable'
  onClose: () => void
  onDone: () => void
}

/**
 * 成员管理 · 禁用 / 启用二次确认（成员状态管理规则）。
 * - 禁用：仅作用本租户（账号与其他租户身份不受影响），切断登录但保留历史业务数据与操作日志；角色关联保留；
 *   本人被禁用时弹窗明示但不阻断（D15）；唯一管理员由后端阻断（E07）。
 * - 启用：恢复本租户登录能力，原角色自动恢复生效；支持重新选择部门（应对调岗），确认后状态恢复为正常。
 */
export default function MemberStatusModal({ open, tenantId, member, mode, onClose, onDone }: MemberStatusModalProps) {
  const toast = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [ack, setAck] = useState(false)
  const [deptOptions, setDeptOptions] = useState<TreeOption[]>([])
  const [deptId, setDeptId] = useState<string>('')

  const isSelf = !!member?.self
  const needAck = mode === 'disable' && isSelf
  const isEnable = mode === 'enable'

  useEffect(() => {
    if (!open) return
    setAck(false)
    setDeptId(member?.deptId ?? '')
    if (isEnable) {
      void fetchDeptOptions(tenantId).then(setDeptOptions)
    }
  }, [open, isEnable, tenantId, member])

  const handleConfirm = async () => {
    if (!member) return
    if (needAck && !ack) {
      toast('请先确认「本人将被禁用」', 'error')
      return
    }
    setSubmitting(true)
    try {
      await updateMemberStatus(
        tenantId,
        member.id,
        isEnable ? 'enabled' : 'disabled',
        isEnable ? deptId || null : undefined,
      )
      toast(isEnable ? '启用成功，状态已恢复为正常' : '禁用成功')
      onDone()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const deptLabel = useMemo(() => {
    if (!deptId) return '未挂组织'
    const find = (nodes: TreeOption[]): string => {
      for (const node of nodes) {
        if (node.value === deptId) return node.label
        if (node.children?.length) {
          const hit = find(node.children)
          if (hit) return hit
        }
      }
      return ''
    }
    return find(deptOptions) || member?.deptName || '未挂组织'
  }, [deptId, deptOptions, member])

  return (
    <Modal
      open={open}
      title={isEnable ? '确认启用' : '确认禁用'}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" disabled={submitting} onClick={() => void handleConfirm()}>
            {isEnable ? '确认启用' : '确认禁用'}
          </Button>
        </>
      }
    >
      <div className="modal-confirm-text" data-ann-target="member.status.confirm">
        <span style={{ color: 'var(--color-warning)', display: 'flex' }}>
          <Icon name="warning" size={16} />
        </span>
        <div>
          <div>
            确认{isEnable ? '启用' : '禁用'}成员「{member?.name}」（{member?.loginName}）？
          </div>
          {isEnable ? (
            <div className="modal-confirm-tip">启用后该成员恢复本租户登录能力，原角色自动恢复生效。</div>
          ) : (
            <div className="modal-confirm-tip">
              禁用后该成员无法登录本租户、会话立即失效；成员记录、历史业务数据与操作日志均保留，角色关联保留，可重新启用。禁用只作用本租户，不影响该账号在其他租户的成员关系与登录，也不改变账号状态。
            </div>
          )}
        </div>
      </div>

      {isEnable && (
        <FormField label="部门" hint="应对调岗场景：启用时可重新选择部门，不影响历史业务数据上的部门快照">
          <TreeSelect
            value={deptId}
            options={deptOptions}
            noneLabel="未挂组织（数据范围仅本人）"
            placeholder="请选择部门"
            onChange={setDeptId}
          />
        </FormField>
      )}

      {isEnable && deptId !== (member?.deptId ?? '') && (
        <div className="modal-confirm-tip" style={{ marginTop: 'var(--space-sm)' }}>
          部门将由「{member?.deptName || '未挂组织'}」调整为「{deptLabel}」。
        </div>
      )}

      {needAck && (
        <FormField label="确认影响" required>
          <label className="member-ack">
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
            <span>已知悉：将被禁用的成员正是本人，禁用后本人立即失去本租户访问能力，需由其他管理员恢复。</span>
          </label>
        </FormField>
      )}
    </Modal>
  )
}
