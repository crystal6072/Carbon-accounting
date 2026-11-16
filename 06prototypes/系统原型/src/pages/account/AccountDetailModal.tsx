import { useCallback, useEffect, useState } from 'react'
import { Button, Modal, SensitivePhone, Table, Tag } from '@/shared/components'
import type { Column } from '@/shared/components'
import {
  CURRENT_ACCOUNT_ID,
  fetchAccountDetail,
  fetchAccountOperations,
  fetchPlatformRoles,
  isBuiltinRootAccount,
  revealAccountMobile,
} from '@/mock/account'
import { membershipsOfAccount } from '@/mock/tenant'
import type { AccountOperationLog, PlatformAccount, PlatformRole } from '@/types'
import { PASSWORD_MASK, accountActions, accountStatusText, accountStatusTone, maskMobile } from './accountMeta'
import AccountAvatar from './AccountAvatar'
import AccountConfirmModal from './AccountConfirmModal'
import type { AccountConfirmMode } from './AccountConfirmModal'
import { AccountResetModal } from './AccountConfirmModal'
import AccountRoleModal from './AccountRoleModal'
import './AccountPage.css'

interface AccountDetailModalProps {
  open: boolean
  accountId: string | null
  onClose: () => void
  /** 右上角「编辑」入口：关闭详情并调出编辑弹窗 */
  onEdit: (account: PlatformAccount) => void
  /** 详情内操作（启停 / 重置 / 分配角色 / 注销）成功后的列表刷新 */
  onChanged: () => void
}

/**
 * 账号管理 · 查看详情（弹窗）。
 * 承接原账号详情页的全部信息：账号信息 + 名下租户身份 + 操作记录，
 * 写操作（编辑 / 分配角色 / 停用启用 / 重置密码 / 注销）在弹窗内就地完成。
 */
export default function AccountDetailModal({ open, accountId, onClose, onEdit, onChanged }: AccountDetailModalProps) {
  const [account, setAccount] = useState<PlatformAccount | null>(null)
  const [roles, setRoles] = useState<PlatformRole[]>([])
  const [operations, setOperations] = useState<AccountOperationLog[]>([])
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState<{ mode: AccountConfirmMode } | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [roleOpen, setRoleOpen] = useState(false)

  const load = useCallback(async () => {
    if (!open || !accountId) return
    setLoading(true)
    try {
      const [detail, roleList, opList] = await Promise.all([
        fetchAccountDetail(accountId),
        fetchPlatformRoles(),
        fetchAccountOperations(accountId),
      ])
      setAccount(detail)
      setRoles(roleList)
      setOperations(opList)
    } catch {
      setAccount(null)
    } finally {
      setLoading(false)
    }
  }, [open, accountId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!open) {
      setConfirm(null)
      setResetOpen(false)
      setRoleOpen(false)
    }
  }, [open])

  const roleName = (roleId: string) => roles.find((role) => role.id === roleId)?.name ?? roleId
  /** 租户身份以成员关系为真相源（账号侧投影可能缺失 / 滞后） */
  const tenantIdentities = account ? membershipsOfAccount(account.id) : []

  const operationColumns: Column<AccountOperationLog>[] = [
    { key: 'createdAt', title: '时间', width: 150, render: (row) => <span className="nowrap">{row.createdAt}</span> },
    {
      key: 'action',
      title: '操作',
      width: 110,
      render: (row) => (
        <Tag
          tone={
            row.action === 'reset_password'
              ? 'warning'
              : row.action === 'cancel' || row.action === 'disable'
                ? 'error'
                : 'default'
          }
        >
          {row.actionText}
        </Tag>
      ),
    },
    { key: 'operatorName', title: '操作人', width: 130, render: (row) => <span className="nowrap">{row.operatorName}</span> },
    { key: 'summary', title: '变更摘要', render: (row) => <span>{row.summary}</span> },
  ]

  const action = account ? accountActions[account.status] : null
  const isSelf = account?.id === CURRENT_ACCOUNT_ID
  const isPlatform = (account?.roleIds.length ?? 0) > 0
  const builtinRoot = !!account && isBuiltinRootAccount(account)

  /** 刷新详情并通知列表刷新 */
  const refresh = () => {
    void load()
    onChanged()
  }

  return (
    <>
      <Modal
        open={open}
        title={
          <span data-ann-target="account.detail.global">
            {account ? `账号详情 · ${account.displayName}（${account.loginName}）` : '账号详情'}
          </span>
        }
        size="lg"
        onClose={onClose}
        footer={
          <>
            {account && !builtinRoot && action?.edit && (
              <Button variant="primary" data-ann-target="account.detail.edit" onClick={() => onEdit(account)}>
                编辑
              </Button>
            )}
            {account && !builtinRoot && (
              <>
                {isPlatform && action?.assign && (
                  <Button data-ann-target="account.detail.assign" onClick={() => setRoleOpen(true)}>
                    分配角色
                  </Button>
                )}
                {action?.reset && !isSelf && (
                  <Button data-ann-target="account.detail.reset" onClick={() => setResetOpen(true)}>
                    重置密码
                  </Button>
                )}
                {action?.disable && (
                  <Button data-ann-target="account.detail.disable" onClick={() => setConfirm({ mode: 'disable' })}>
                    停用
                  </Button>
                )}
                {action?.enable && (
                  <Button data-ann-target="account.detail.enable" onClick={() => setConfirm({ mode: 'enable' })}>
                    启用
                  </Button>
                )}
                {action?.cancel && (
                  <Button data-ann-target="account.detail.cancel" onClick={() => setConfirm({ mode: 'cancel' })}>
                    注销
                  </Button>
                )}
              </>
            )}
            {account && builtinRoot && isSelf && (
              <Button data-ann-target="account.detail.reset" onClick={() => setResetOpen(true)}>
                重置密码
              </Button>
            )}
            <Button onClick={onClose}>关闭</Button>
          </>
        }
      >
        {!account ? (
          <div className="empty">{loading ? '加载中…' : '账号不存在或已被删除'}</div>
        ) : (
          <>
            <div className="account-detail-head">
              <AccountAvatar value={account.avatarUrl ?? ''} name={account.displayName} size="md" />
              <div className="account-detail-head-main">
                <div className="account-detail-name">
                  {account.displayName}
                  {isSelf && <span className="account-self-tag">本人</span>}
                  {builtinRoot && <span className="account-builtin-tag">系统内置</span>}
                  {!isPlatform && <Tag tone="info">租户成员</Tag>}
                </div>
                <div className="account-detail-sub">
                  <Tag tone={accountStatusTone[account.status]}>{accountStatusText[account.status]}</Tag>
                  {isPlatform ? (
                    <span className="account-role-tags">
                      {account.roleIds.map((roleId) => (
                        <Tag key={roleId} tone={roleName(roleId) === '超级管理员' ? 'error' : 'default'}>
                          {roleName(roleId)}
                        </Tag>
                      ))}
                    </span>
                  ) : (
                    <span className="text-tertiary">无平台角色（租户成员）</span>
                  )}
                </div>
              </div>
            </div>

            <div className="detail-list">
              <div className="detail-item">
                <span className="detail-label">手机号</span>
                <span className="detail-value">
                  <SensitivePhone masked={maskMobile(account.mobile)} onReveal={() => revealAccountMobile(account.id)} />
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">账号</span>
                <span className="detail-value mono">{account.loginName}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">邮箱</span>
                <span className="detail-value">{account.email || <span className="text-tertiary">—</span>}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">密码</span>
                <span className="detail-value account-password">{account.passwordMask || PASSWORD_MASK}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">首次登录强制改密</span>
                <span className="detail-value">{account.mustChangePassword ? '是（待改密）' : '否（已改密）'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">创建人</span>
                <span className="detail-value">{account.createdBy}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">创建时间</span>
                <span className="detail-value">{account.createdAt}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">最近更新</span>
                <span className="detail-value">
                  {account.updatedBy} · {account.updatedAt}
                </span>
              </div>
              {tenantIdentities.length > 0 && (
                <div className="detail-item full">
                  <span className="detail-label">租户身份</span>
                  <span className="detail-value account-org-links">
                    {tenantIdentities.map((item, index) => (
                      <span key={item.tenantId}>
                        {index > 0 ? '、' : ''}
                        {item.tenantName}
                        {item.primary ? '（主管理员）' : ''}
                      </span>
                    ))}
                  </span>
                </div>
              )}
            </div>

            <div className="account-detail-tip">
              {builtinRoot
                ? '系统内置根账号由初始化脚本写入，账号管理中只读：不可编辑、不可分配角色、不可启停、不可注销。唯一例外是本人可重置自己的密码。'
                : isPlatform
                  ? '平台账号靠平台角色取权限，不占租户名额；同一账号可同时持有平台角色与租户成员关系（身份可并存）。'
                  : '租户成员账号：账号级资料、停用/启用、重置密码、注销在本页处理；部门、租户角色、成员状态属租户内事实，仍归租户端成员管理。'}
            </div>

            <div className="account-detail-logs">
              <div className="toolbar">
                <span className="toolbar-title">操作记录</span>
                <span className="toolbar-tip">账号级操作的审计轨迹，不含密码明细</span>
              </div>
              <div className="account-table-wrap" data-ann-target="account.detail.operations">
                <Table columns={operationColumns} data={operations} rowKey={(row) => row.id} loading={loading} />
              </div>
            </div>
          </>
        )}
      </Modal>

      {account && (
        <AccountConfirmModal
          open={!!confirm}
          account={account}
          mode={confirm?.mode ?? 'disable'}
          onClose={() => setConfirm(null)}
          onDone={(m) => {
            setConfirm(null)
            if (m === 'cancel') onClose()
            refresh()
          }}
        />
      )}

      {account && <AccountResetModal open={resetOpen} account={account} onClose={() => { setResetOpen(false); refresh() }} />}

      {account && (
        <AccountRoleModal
          open={roleOpen}
          accountId={account.id}
          accountName={account.displayName}
          currentRoleIds={account.roleIds}
          onClose={() => setRoleOpen(false)}
          onSaved={() => {
            setRoleOpen(false)
            refresh()
          }}
        />
      )}
    </>
  )
}
