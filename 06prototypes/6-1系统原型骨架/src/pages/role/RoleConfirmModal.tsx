import { useEffect, useState } from 'react'
import { Button, Icon, Modal, useToast } from '@/shared/components'
import { countActiveMembers, deleteRole, removeRoleMember, updateRoleStatus } from '@/mock/role'
import type { Role, RoleStatus } from '@/types'

export type RoleConfirmMode = 'disable' | 'enable' | 'delete' | 'remove-member'

interface RoleConfirmModalProps {
  open: boolean
  role: Role | null
  mode: RoleConfirmMode
  /** 移除成员模式下的目标成员 */
  member?: { id: string; name: string } | null
  /** 批量删除模式下的角色列表（与 role 二选一，批量优先） */
  batchRoles?: Role[]
  onClose: () => void
  onDone: () => void
}

const TITLE: Record<RoleConfirmMode, string> = {
  disable: '确认停用角色',
  enable: '确认启用角色',
  delete: '确认删除角色',
  'remove-member': '确认移除成员',
}

/**
 * 角色管理 · 停用 / 启用 / 删除 / 移除成员二次确认。
 * 停用与删除为影响面操作：弹窗明示生效成员数（PRD §3.3 / §3.5 / §3.6）；
 * 删除支持列表页勾选后的批量删除。
 */
export default function RoleConfirmModal({
  open,
  role,
  mode,
  member,
  batchRoles,
  onClose,
  onDone,
}: RoleConfirmModalProps) {
  const toast = useToast()
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) setSubmitting(false)
  }, [open])

  if (!role) return null

  const activeCount = countActiveMembers(role)
  const nextStatus: RoleStatus | null = mode === 'disable' ? 'disabled' : mode === 'enable' ? 'enabled' : null
  const isBatchDelete = mode === 'delete' && !!batchRoles && batchRoles.length > 0
  const batchList = batchRoles ?? []

  const handleConfirm = async () => {
    setSubmitting(true)
    try {
      if (isBatchDelete) {
        const failures: string[] = []
        for (const item of batchList) {
          try {
            await deleteRole(item.id)
          } catch (error) {
            failures.push(error instanceof Error ? error.message : `「${item.name}」删除失败`)
          }
        }
        if (failures.length > 0) {
          toast(failures.join('；'), 'error')
        } else {
          toast(`已删除 ${batchList.length} 个角色（软删，记录保留供审计）`)
        }
      } else if (mode === 'disable' || mode === 'enable') {
        await updateRoleStatus(role.id, nextStatus as RoleStatus)
        toast(mode === 'disable' ? '角色已停用，持有者下次请求重算权限' : '角色已启用，关联与勾选已恢复')
      } else if (mode === 'delete') {
        await deleteRole(role.id)
        toast('角色已删除（软删，记录保留供审计）')
      } else if (mode === 'remove-member' && member) {
        await removeRoleMember(role.id, member.id)
        toast(`已收回「${member.name}」的「${role.name}」角色`)
      }
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
      title={TITLE[mode]}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button variant="primary" disabled={submitting} onClick={() => void handleConfirm()}>
            确认
          </Button>
        </>
      }
    >
      <div className="modal-confirm-text" data-ann-target={`role.confirm.${mode}`}>
        <span style={{ color: 'var(--color-warning)', display: 'flex' }}>
          <Icon name="warning" size={16} />
        </span>
        <div>
          {mode === 'remove-member' ? (
            <>
              <div>
                确认移除成员「{member?.name}」的「{role.name}」角色？
              </div>
              <div className="modal-confirm-tip">移除即收回该角色，不影响该成员的其他角色；超级管理员角色不可移除最后一个持有人。</div>
            </>
          ) : isBatchDelete ? (
            <>
              <div>确认删除所选 {batchList.length} 个角色？</div>
              <div className="modal-confirm-tip">
                删除为软删，记录与功能勾选、成员历史保留供审计，名称与标识不释放；内置角色与仍有生效成员的角色将被跳过。
              </div>
              <ul className="account-impact-list">
                {batchList.map((item) => (
                  <li key={item.id}>
                    {item.name}（{item.code}）
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <div>
                确认{mode === 'delete' ? '删除' : mode === 'disable' ? '停用' : '启用'}角色「{role.name}」？
              </div>
              {mode === 'disable' && (
                <div className="modal-confirm-tip">
                  停用立即生效，{activeCount} 个生效成员将失去该角色权限（下次请求重算）；成员关联与功能勾选保留，恢复后自动生效。
                </div>
              )}
              {mode === 'enable' && <div className="modal-confirm-tip">启用后该角色的关联与勾选恢复，成员权限同步恢复。</div>}
              {mode === 'delete' && (
                <div className="modal-confirm-tip">
                  删除为软删，记录与功能勾选、成员历史保留供审计，名称与标识不释放；有生效成员引用时不可删。
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
