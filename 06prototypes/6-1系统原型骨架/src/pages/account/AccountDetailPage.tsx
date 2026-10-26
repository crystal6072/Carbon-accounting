import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, PageHeader, Table, Tag } from '@/shared/components'
import type { Column } from '@/shared/components'
import { CURRENT_ACCOUNT_ID, fetchAccountDetail, fetchAccountOperations, fetchPlatformRoles } from '@/mock/account'
import type { AccountOperationLog, PlatformAccount, PlatformRole } from '@/types'
import { PASSWORD_MASK, accountActions, accountStatusText, accountStatusTone, maskMobile } from './accountMeta'
import AccountAvatar from './AccountAvatar'
import AccountConfirmModal from './AccountConfirmModal'
import type { AccountConfirmMode } from './AccountConfirmModal'
import { AccountResetModal } from './AccountConfirmModal'
import AccountRoleModal from './AccountRoleModal'
import './AccountPage.css'

export default function AccountDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [account, setAccount] = useState<PlatformAccount | null>(null)
  const [roles, setRoles] = useState<PlatformRole[]>([])
  const [operations, setOperations] = useState<AccountOperationLog[]>([])
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState<{ mode: AccountConfirmMode } | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [roleOpen, setRoleOpen] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [detail, roleList, opList] = await Promise.all([
        fetchAccountDetail(id),
        fetchPlatformRoles(),
        fetchAccountOperations(id),
      ])
      setAccount(detail)
      setRoles(roleList)
      setOperations(opList)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const roleName = (roleId: string) => roles.find((role) => role.id === roleId)?.name ?? roleId
  const activeMemberships = account?.tenantMemberships.filter((item) => item.status === 'active') ?? []

  const operationColumns: Column<AccountOperationLog>[] = [
    { key: 'createdAt', title: '时间', width: 150, render: (row) => <span className="nowrap">{row.createdAt}</span> },
    {
      key: 'action',
      title: '操作',
      width: 120,
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
    { key: 'operatorName', title: '操作人', width: 150, render: (row) => <span className="nowrap">{row.operatorName}</span> },
    { key: 'summary', title: '变更摘要', render: (row) => <span>{row.summary}</span> },
    { key: 'clientIp', title: '客户端 IP', width: 130, render: (row) => <span className="mono nowrap">{row.clientIp}</span> },
  ]

  if (!account) {
    return (
      <>
        <PageHeader breadcrumb={['系统管理', '组织与权限', '平台账号']} title="账号详情" />
        <div className="card">
          <div className="empty">{loading ? '加载中…' : '账号不存在或已被删除'}</div>
        </div>
      </>
    )
  }

  const action = accountActions[account.status]
  const isSelf = account.id === CURRENT_ACCOUNT_ID
  /** 是否平台账号（持有平台角色）；租户成员在此页仅作只读查看 */
  const isPlatform = account.roleIds.length > 0

  return (
    <>
      <PageHeader
        breadcrumb={isPlatform ? ['系统管理', '组织与权限', '平台账号', account.displayName] : ['系统管理', '组织与权限', '账号查询', account.displayName]}
        title={<span data-ann-target="account.detail.global">{`${account.displayName}（${account.loginName}）`}</span>}
        description={
          isPlatform
            ? `账号状态 ${accountStatusText[account.status]} · 平台角色 ${account.roleIds.length} 个`
            : `账号状态 ${accountStatusText[account.status]} · 无平台角色（租户成员） · 名下有效租户身份 ${activeMemberships.length} 个`
        }
        actions={
          isPlatform ? (
            <>
              <Button onClick={() => navigate('/system/account')}>返回列表</Button>
              {action.assign && (
                <Button data-ann-target="account.detail.assign" onClick={() => setRoleOpen(true)}>
                  分配平台角色
                </Button>
              )}
              {action.disable && (
                <Button data-ann-target="account.detail.disable" onClick={() => setConfirm({ mode: 'disable' })}>
                  停用
                </Button>
              )}
              {action.enable && (
                <Button data-ann-target="account.detail.enable" onClick={() => setConfirm({ mode: 'enable' })}>
                  启用
                </Button>
              )}
              {action.reset && !isSelf && (
                <Button data-ann-target="account.detail.reset" onClick={() => setResetOpen(true)}>
                  重置密码
                </Button>
              )}
              {action.edit && (
                <Button variant="primary" data-ann-target="account.detail.edit" onClick={() => navigate(`/system/account/${account.id}/edit`)}>
                  编辑
                </Button>
              )}
              {action.cancel && (
                <Button data-ann-target="account.detail.cancel" onClick={() => setConfirm({ mode: 'cancel' })}>
                  注销
                </Button>
              )}
            </>
          ) : (
            <>
              <Button onClick={() => navigate('/system/account-query')}>返回账号查询</Button>
              <Tag tone="info">只读 · 租户成员</Tag>
            </>
          )
        }
      />

      <div className="account-stack">
        <section className="card" data-ann-target="account.detail.info">
          <div className="account-section-header">
            <span className="account-section-title">账号信息</span>
            <span className="toolbar-tip">登录名与手机号全局唯一；密码只呈现掩码</span>
          </div>
          <div className="account-section-body">
            <div className="detail-list">
              <div className="detail-item">
                <span className="detail-label">头像</span>
                <span className="detail-value">
                  <AccountAvatar value={account.avatarUrl ?? ''} name={account.displayName} size="md" />
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">登录名</span>
                <span className="detail-value mono">{account.loginName}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">手机号</span>
                <span className="detail-value">{maskMobile(account.mobile)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">邮箱</span>
                <span className="detail-value">{account.email || <span className="text-tertiary">—</span>}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">姓名</span>
                <span className="detail-value">
                  {account.displayName}
                  {isSelf && <span className="account-self-tag">本人</span>}
                </span>
              </div>
              <div className="detail-item full">
                <span className="detail-label">平台角色</span>
                <span className="detail-value account-role-tags">
                  {isPlatform ? (
                    account.roleIds.map((roleId) => (
                      <Tag key={roleId} tone={roleName(roleId) === '超级管理员' ? 'error' : 'default'}>
                        {roleName(roleId)}
                      </Tag>
                    ))
                  ) : (
                    <span className="text-tertiary">无（租户成员，不在此维护平台角色）</span>
                  )}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">密码</span>
                <span className="detail-value account-password">{account.passwordMask || PASSWORD_MASK}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">首次登录强制修改密码</span>
                <span className="detail-value">{account.mustChangePassword ? '是（待改密）' : '否（已改密）'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">账号状态</span>
                <span className="detail-value">
                  <Tag tone={accountStatusTone[account.status]}>{accountStatusText[account.status]}</Tag>
                </span>
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
              {!isPlatform && (
                <div className="detail-item full">
                  <span className="detail-label">所属组织</span>
                  <span className="detail-value account-org-links">
                    {activeMemberships.length === 0 ? (
                      <span className="text-tertiary">—</span>
                    ) : (
                      activeMemberships.map((item, index) => (
                        <span key={item.id}>
                          {index > 0 ? '、' : ''}
                          {item.tenantName}
                          {item.primary ? '（主管理员）' : ''}
                        </span>
                      ))
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="account-section-tip">
            {isPlatform
              ? '平台账号靠平台角色取权限，不建成员关系、不占租户名额；同一账号可同时持有平台角色与租户成员关系。'
              : '租户成员账号由租户端成员管理维护，平台角色不在此分配；其租户身份、租户角色与部门请在对应租户中管理。'}
          </div>
        </section>

        {!isPlatform && (
          <section className="card" data-ann-target="account.detail.memberships">
            <div className="account-section-header">
              <span className="account-section-title">名下租户身份</span>
              <span className="toolbar-tip">停用或注销该账号时，以下身份将同时失效</span>
            </div>
            <div className="account-section-body">
              {activeMemberships.length === 0 ? (
                <div className="empty">该账号暂无有效租户身份</div>
              ) : (
                <ul className="account-impact-list" style={{ paddingLeft: 18 }}>
                  {activeMemberships.map((item) => (
                    <li key={item.id}>
                      {item.tenantName}
                      {item.primary ? '（主管理员）' : ''}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="account-section-tip">
              停用为账号级操作：平台端与租户端登录同时失效，租户成员关系记录保留，不收回平台角色。
            </div>
          </section>
        )}

        <section className="card" data-ann-target="account.detail.operations">
          <div className="account-section-header">
            <span className="account-section-title">操作记录</span>
            <span className="toolbar-tip">账号级操作的审计轨迹，不含密码明细</span>
          </div>
          <div className="account-section-body account-table-wrap">
            <Table columns={operationColumns} data={operations} rowKey={(row) => row.id} loading={loading} />
          </div>
          <div className="account-section-tip">
            仅记录账号级操作（创建 / 编辑 / 分配角色 / 停用 / 启用 / 注销 / 重置密码）；明文密码不在任何记录中留存。
          </div>
        </section>
      </div>

      <AccountConfirmModal
        open={!!confirm}
        account={account}
        mode={confirm?.mode ?? 'disable'}
        onClose={() => setConfirm(null)}
        onDone={(m) => {
          setConfirm(null)
          if (m === 'cancel') navigate('/system/account')
          else void load()
        }}
      />

      <AccountResetModal open={resetOpen} account={account} onClose={() => setResetOpen(false)} />

      <AccountRoleModal
        open={roleOpen}
        accountId={account.id}
        accountName={account.displayName}
        currentRoleIds={account.roleIds}
        onClose={() => setRoleOpen(false)}
        onSaved={() => {
          setRoleOpen(false)
          void load()
        }}
      />
    </>
  )
}
