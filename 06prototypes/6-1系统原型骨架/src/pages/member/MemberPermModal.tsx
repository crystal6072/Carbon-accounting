import { useCallback, useEffect, useState } from 'react'
import { Button, Modal, Table, Tag, useToast } from '@/shared/components'
import type { Column } from '@/shared/components'
import type { MemberDetail, MemberPermissions, MemberPermissionRow } from '@/types'
import { fetchMemberPermissions } from '@/mock/member'

interface MemberPermModalProps {
  open: boolean
  tenantId: string
  member: MemberDetail | null
  onClose: () => void
}

/**
 * 成员管理 · 查看有效权限（§5.8）：所持角色清单 + 合并功能点数 + 按功能点分列读 / 写范围。
 * 有效功能 = 已开通模块内功能点 ∩ 角色勾选功能点（多角色取并集）；页面只读，不可编辑。
 * 每次打开写审计（服务端记录）。
 */
export default function MemberPermModal({ open, tenantId, member, onClose }: MemberPermModalProps) {
  const toast = useToast()
  const [data, setData] = useState<MemberPermissions | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!member) return
    setLoading(true)
    try {
      setData(await fetchMemberPermissions(tenantId, member.id))
    } catch (error) {
      toast(error instanceof Error ? error.message : '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [member, tenantId, toast])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  const columns: Column<MemberPermissionRow>[] = [
    { key: 'groupName', title: '所属功能', width: 130, render: (row) => <span className="nowrap">{row.groupName}</span> },
    { key: 'menuName', title: '功能点', width: 200, render: (row) => <span className="nowrap">{row.menuName}</span> },
    {
      key: 'read',
      title: '读范围',
      width: 100,
      align: 'center',
      render: (row) => (row.read ? <span className="member-perm-check">✓</span> : <span className="text-tertiary">—</span>),
    },
    {
      key: 'write',
      title: '写范围',
      width: 100,
      align: 'center',
      render: (row) => (row.write ? <span className="member-perm-check">✓</span> : <span className="text-tertiary">—</span>),
    },
  ]

  return (
    <Modal
      open={open}
      title={`有效权限 · ${member?.name ?? ''}`}
      size="lg"
      onClose={onClose}
      footer={
        <Button variant="primary" onClick={onClose}>
          关闭
        </Button>
      }
    >
      <p className="form-tip" style={{ marginTop: 0 }}>
        有效权限 = 已开通模块内的功能点 ∩ 所持角色勾选的功能点（多角色取并集、按最宽档合并）。本页只读，不可编辑。
      </p>

      <div className="detail-list">
        <div className="detail-item">
          <span className="detail-label">所持角色</span>
          <span className="detail-value member-perm-roles">
            {data?.roleNames.length ? (
              data.roleNames.map((name) => <Tag key={name}>{name}</Tag>)
            ) : (
              <span className="text-tertiary">—</span>
            )}
          </span>
        </div>
        <div className="detail-item">
          <span className="detail-label">角色共勾选功能点</span>
          <span className="detail-value">{data?.roleGrantedCount ?? 0} 个（含未开通模块内的勾选）</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">合并生效功能点</span>
          <span className="detail-value">{data?.effectiveCount ?? 0} 个</span>
        </div>
      </div>

      <div className="member-perm-table-wrap" data-ann-target="member.perm.table">
        <Table
          columns={columns}
          data={data?.rows ?? []}
          rowKey={(row) => row.menuId}
          loading={loading}
          emptyText="暂无生效功能点"
        />
      </div>
    </Modal>
  )
}
