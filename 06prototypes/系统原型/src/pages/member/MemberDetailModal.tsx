import { useEffect, useState } from 'react'
import { Button, Modal, SensitivePhone, Table, Tag } from '@/shared/components'
import type { Column } from '@/shared/components'
import type { MemberDetail, MemberOperationLog } from '@/types'
import { CURRENT_TENANT_ID, fetchMemberOperations, revealMemberMobile } from '@/mock/member'
import { PASSWORD_MASK } from '../account/accountMeta'

interface MemberDetailModalProps {
  open: boolean
  member: MemberDetail | null
  onClose: () => void
  /** 右上角「编辑」入口：调出编辑弹窗修改（手机号不可在详情内直改，§手机号专项） */
  onEdit?: (member: MemberDetail) => void
}

/**
 * 成员管理 · 成员详情（§4 查看列表与详情）。
 * 展示成员关系投影与账号级字段（掩码）、加入 / 移出信息与操作记录（审计）。
 */
export default function MemberDetailModal({ open, member, onClose, onEdit }: MemberDetailModalProps) {
  const [operations, setOperations] = useState<MemberOperationLog[]>([])

  useEffect(() => {
    if (!open || !member) return
    void fetchMemberOperations(member.id).then(setOperations)
  }, [open, member])

  const logColumns: Column<MemberOperationLog>[] = [
    { key: 'createdAt', title: '时间', width: 150, render: (row) => <span className="nowrap">{row.createdAt}</span> },
    {
      key: 'action',
      title: '操作',
      width: 110,
      render: (row) => (
        <Tag
          tone={
            row.action === 'disable'
              ? 'error'
              : row.action === 'reset_password'
                ? 'warning'
                : 'default'
          }
        >
          {row.actionText}
        </Tag>
      ),
    },
    { key: 'operatorName', title: '操作人', width: 150, render: (row) => <span className="nowrap">{row.operatorName}</span> },
    { key: 'summary', title: '变更摘要', render: (row) => <span>{row.summary}</span> },
  ]

  return (
    <Modal
      open={open}
      title={`成员详情 · ${member?.name ?? ''}`}
      size="lg"
      onClose={onClose}
      footer={
        <>
          {onEdit && (
            <Button
              variant="primary"
              disabled={member?.accountStatus === 'disabled'}
              onClick={() => member && onEdit(member)}
            >
              编辑
            </Button>
          )}
          <Button onClick={onClose}>关闭</Button>
        </>
      }
    >
      <div className="detail-list">
        <div className="detail-item">
          <span className="detail-label">姓名</span>
          <span className="detail-value">
            {member?.name}
            {member?.primaryAdmin && <span className="member-primary-tag">主管理员</span>}
            {member?.self && <span className="member-self-tag">本人</span>}
          </span>
        </div>
        <div className="detail-item">
          <span className="detail-label">账号</span>
          <span className="detail-value mono">{member?.loginName}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">手机号</span>
          <span className="detail-value">
            <SensitivePhone masked={member?.mobile ?? ''} onReveal={() => revealMemberMobile(CURRENT_TENANT_ID, member!.id)} />
          </span>
        </div>
        <div className="detail-item" data-ann-target="member.detail.email">
          <span className="detail-label">邮箱</span>
          <span className="detail-value">{member?.email || <span className="text-tertiary">—</span>}</span>
        </div>
        <div className="detail-item" data-ann-target="member.detail.password">
          <span className="detail-label">密码</span>
          <span className="detail-value mono">{PASSWORD_MASK}</span>
        </div>
        <div className="detail-item" data-ann-target="member.detail.dept">
          <span className="detail-label">部门</span>
          <span className="detail-value">{member?.deptName || <span className="text-tertiary">未挂组织</span>}</span>
        </div>
        <div className="detail-item" data-ann-target="member.detail.role">
          <span className="detail-label">角色</span>
          <span className="detail-value member-role-tags">
            {member?.roleNames.map((name) => (
              <Tag key={name}>{name}</Tag>
            ))}
          </span>
        </div>
        <div className="detail-item" data-ann-target="member.detail.joinedAt">
          <span className="detail-label">加入时间</span>
          <span className="detail-value">{member?.joinedAt}</span>
        </div>
      </div>

      <div className="member-detail-logs">
        <div className="toolbar">
          <span className="toolbar-title">操作记录</span>
          <span className="toolbar-tip">审计只增不改不删</span>
        </div>
        <Table columns={logColumns} data={operations} rowKey={(row) => row.id} />
      </div>
    </Modal>
  )
}
