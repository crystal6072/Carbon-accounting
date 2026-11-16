import { useEffect, useMemo, useState } from 'react'
import { Button, FormField, Icon, Modal, TreeSelect, useToast } from '@/shared/components'
import type { MemberDetail, TreeOption } from '@/types'
import { fetchDeptOptions, removeMember, updateMemberStatus } from '@/mock/member'
import { getAccountById } from '@/mock/account'
import { membershipsOfAccount } from '@/mock/tenant'

interface MemberStatusModalProps {
  open: boolean
  tenantId: string
  member: MemberDetail | null
  /** disable = 禁用（离岗）；enable = 启用（复岗）；remove = 移出（离职终态） */
  mode: 'disable' | 'enable' | 'remove'
  onClose: () => void
  onDone: () => void
  /**
   * 平台代管入口专用：移出时，若该账号已无其他生效租户身份、且不持任何平台角色，
   * 额外提供「同时注销该账号」。租户端成员管理不开启。
   */
  allowDeleteAccount?: boolean
}

/**
 * 成员管理 · 禁用 / 启用二次确认（成员状态管理规则）。
 * - 禁用：仅作用本租户（账号与其他租户身份不受影响），切断登录但保留历史业务数据与操作日志；角色关联保留；
 *   本人被禁用时弹窗明示但不阻断（D15）；唯一管理员由后端阻断（E07）。
 * - 启用：恢复本租户登录能力，原角色自动恢复生效；支持重新选择部门（应对调岗），确认后状态恢复为正常。
 */
export default function MemberStatusModal({ open, tenantId, member, mode, onClose, onDone, allowDeleteAccount = false }: MemberStatusModalProps) {
  const toast = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [ack, setAck] = useState(false)
  const [deptOptions, setDeptOptions] = useState<TreeOption[]>([])
  const [deptId, setDeptId] = useState<string>('')
  /** 移出时是否同时注销账号（仅平台代管入口、且账号已无其他归属时可选） */
  const [alsoDelete, setAlsoDelete] = useState(false)

  const isSelf = !!member?.self
  const needAck = mode === 'disable' && isSelf
  const isEnable = mode === 'enable'
  const isRemove = mode === 'remove'

  /** 账号已无其他生效租户身份、且不持任何平台角色 —— 注销后不会影响任何人 */
  const canDeleteAccount = useMemo(() => {
    if (!allowDeleteAccount || !isRemove || !member) return false
    const account = getAccountById(member.accountId)
    if (!account || account.roleIds.length > 0) return false
    // 以成员关系为唯一真相源：除本租户外不再有生效身份
    return membershipsOfAccount(member.accountId).every((item) => item.tenantId === tenantId)
  }, [allowDeleteAccount, isRemove, member, tenantId])

  useEffect(() => {
    if (!open) return
    setAck(false)
    setAlsoDelete(false)
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
      if (isRemove) {
        const withDelete = canDeleteAccount && alsoDelete
        await removeMember(tenantId, member.id, { alsoDeleteAccount: withDelete })
        toast(withDelete ? '已移出并注销账号，账号与手机号已释放' : '移出成功，成员记录与历史数据保留')
      } else {
        await updateMemberStatus(
          tenantId,
          member.id,
          isEnable ? 'enabled' : 'disabled',
          isEnable ? deptId || null : undefined,
        )
        toast(isEnable ? '启用成功，状态已恢复为正常' : '禁用成功')
      }
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
      title={isRemove ? '确认移出' : isEnable ? '确认复岗' : '确认禁用'}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" disabled={submitting} onClick={() => void handleConfirm()}>
            {isRemove ? '确认移出' : isEnable ? '确认复岗' : '确认禁用'}
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
            确认{isRemove ? '移出' : isEnable ? '复岗' : '禁用'}成员「{member?.name}」（{member?.loginName}）？
          </div>
          {isRemove ? (
            <div className="modal-confirm-tip">
              移出后该成员无法登录本租户、会话立即失效，本租户角色收回；成员记录、历史业务数据与操作日志均保留，可重新邀请加入。移出只作用本租户，不影响该账号在其他租户的成员关系与登录
              {canDeleteAccount ? '；该账号已无其他归属，可在下方一并注销。' : '，也不注销账号。'}
            </div>
          ) : isEnable ? (
            <div className="modal-confirm-tip">复岗后该成员恢复本租户登录能力，原角色自动恢复生效（账号状态不随之恢复，如账号已被平台停用需另行处理）。</div>
          ) : (
            <div className="modal-confirm-tip">
              禁用后该成员无法登录本租户、会话立即失效；成员记录、历史业务数据与操作日志均保留，角色关联保留，可重新启用。禁用只作用本租户，不影响该账号在其他租户的成员关系与登录，也不改变账号状态。
            </div>
          )}
        </div>
      </div>

      {canDeleteAccount && (
        <FormField label="账号处理" hint="该账号无其他租户身份、也无平台角色，注销后不影响任何人">
          <label className="member-ack">
            <input type="checkbox" checked={alsoDelete} onChange={(e) => setAlsoDelete(e.target.checked)} />
            <span>
              同时注销该账号：物理删除且不可恢复，账号与手机号立即释放（可重新注册），该成员的历史操作记录仅保留姓名快照。
            </span>
          </label>
        </FormField>
      )}

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
