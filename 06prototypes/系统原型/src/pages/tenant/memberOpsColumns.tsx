import { Button, Tag } from '@/shared/components'
import type { Column } from '@/shared/components'
import type { TenantMemberItem } from '@/types'
import { getAccountById } from '@/mock/account'

/**
 * 租户详情内的成员账号列（平台代管口径），供「租户概况 · 成员与用量」与「组织与成员」两处表格共用，
 * 避免两个入口的操作口径漂移。
 *
 * 术语约定（成员管理 B16-23）：账号层用「停用 / 启用」，成员层用「禁用 / 复岗」。
 * 因此这里的操作是**账号级**兜底，不提供成员的禁用 / 复岗。
 */

/** 账号状态列：账号被平台停用后成员状态不变，必须并列展示两层状态 */
export function accountStatusColumn(): Column<TenantMemberItem> {
  return {
    key: 'accountStatus',
    title: '账号状态',
    width: 100,
    render: (row) => {
      const account = getAccountById(row.accountId)
      if (!account) return <span className="text-tertiary">已注销</span>
      return (
        <Tag tone={account.status === 'enabled' ? 'success' : 'default'}>
          {account.status === 'enabled' ? '启用' : '停用'}
        </Tag>
      )
    },
  }
}

export interface MemberOpHandlers {
  /** 在任主管理员账号 id：该行不给「重置密码」（单点入口在「主管理员」区块） */
  adminAccountId?: string
  /** 重置密码：账号级操作，跨该账号全部租户生效 */
  onReset: (accountId: string) => void
  /** 停用 / 启用账号 */
  onToggle: (accountId: string, mode: 'disable' | 'enable') => void
  /** 移出本租户（账号无其他归属时可一并注销） */
  onRemove: (row: TenantMemberItem) => void
  /** 批注锚点（仅「成员与用量」卡片挂载） */
  annTarget?: string
}

/** 操作列：账号级兜底运维 + 移出 */
export function memberOpsColumn({ adminAccountId, onReset, onToggle, onRemove, annTarget }: MemberOpHandlers): Column<TenantMemberItem> {
  return {
    key: 'ops',
    title: '操作',
    width: 220,
    render: (row) => {
      if (row.status === 'removed') return <span className="text-tertiary">—</span>
      const account = getAccountById(row.accountId)
      if (!account) return <span className="text-tertiary">账号已注销</span>
      const isPrimary = row.accountId === adminAccountId
      const accountEnabled = account.status === 'enabled'
      return (
        <span className="tenant-member-ops" data-ann-target={annTarget}>
          {accountEnabled && !isPrimary && (
            <Button size="small" onClick={() => onReset(row.accountId)}>
              重置密码
            </Button>
          )}
          {accountEnabled ? (
            <Button size="small" onClick={() => onToggle(row.accountId, 'disable')}>
              停用账号
            </Button>
          ) : (
            <Button size="small" onClick={() => onToggle(row.accountId, 'enable')}>
              启用账号
            </Button>
          )}
          <Button size="small" variant="danger" onClick={() => onRemove(row)}>
            移出
          </Button>
        </span>
      )
    },
  }
}
