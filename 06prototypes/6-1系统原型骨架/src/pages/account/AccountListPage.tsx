import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, PageHeader, Pagination, Select, Table, Tag } from '@/shared/components'
import type { Column, SelectOption } from '@/shared/components'
import { CURRENT_ACCOUNT_ID, fetchAccounts, fetchPlatformRoles } from '@/mock/account'
import type { AccountStatus, PlatformAccount, PlatformRole } from '@/types'
import { accountActions, accountStatusText, accountStatusTone, maskMobile } from './accountMeta'
import AccountConfirmModal from './AccountConfirmModal'
import type { AccountConfirmMode } from './AccountConfirmModal'
import { AccountResetModal } from './AccountConfirmModal'
import AccountRoleModal from './AccountRoleModal'
import './AccountPage.css'

interface RowAction {
  key: string
  label: string
  danger?: boolean
  onClick: () => void
}

/** 操作列：超过 3 个操作收起到「更多」下拉，避免列宽过宽 */
function AccountRowActions({ actions }: { actions: RowAction[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [open])

  const visible = actions.slice(0, 3)
  const overflow = actions.slice(3)
  /** 行操作批注锚点（account.row.*，与批注文档 B15-04~B15-12 对应） */
  const targetOf = (key: string) => `account.row.${key}`

  return (
    <span className="row-actions">
      {visible.map((a) => (
        <button
          key={a.key}
          type="button"
          className={`link${a.danger ? ' link-danger' : ''}`}
          data-ann-target={targetOf(a.key)}
          onClick={a.onClick}
        >
          {a.label}
        </button>
      ))}
      {overflow.length > 0 && (
        <span className="row-actions-more" ref={ref}>
          <button type="button" className="link" onClick={() => setOpen((v) => !v)}>
            更多 ▾
          </button>
          {open && (
            <span className="row-actions-menu">
              {overflow.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  className={`row-actions-menu-item${a.danger ? ' link-danger' : ''}`}
                  data-ann-target={targetOf(a.key)}
                  onClick={() => {
                    setOpen(false)
                    a.onClick()
                  }}
                >
                  {a.label}
                </button>
              ))}
            </span>
          )}
        </span>
      )}
    </span>
  )
}

const PAGE_SIZE = 20

interface QueryState {
  keyword: string
  roleId: string
  status: '' | AccountStatus
}

const EMPTY_QUERY: QueryState = { keyword: '', roleId: '', status: '' }

export default function AccountListPage() {
  const navigate = useNavigate()

  const [list, setList] = useState<PlatformAccount[]>([])
  const [roles, setRoles] = useState<PlatformRole[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState<QueryState>(EMPTY_QUERY)
  const [page, setPage] = useState(1)

  const [confirm, setConfirm] = useState<{ account: PlatformAccount; mode: AccountConfirmMode } | null>(null)
  const [resetTarget, setResetTarget] = useState<PlatformAccount | null>(null)
  const [roleTarget, setRoleTarget] = useState<PlatformAccount | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [accounts, roleList] = await Promise.all([fetchAccounts(), fetchPlatformRoles()])
      setList(accounts)
      setRoles(roleList)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const roleName = (roleId: string) => roles.find((role) => role.id === roleId)?.name ?? roleId

  const roleOptions: SelectOption[] = useMemo(() => roles.map((role) => ({ label: role.name, value: role.id })), [roles])

  const rows = useMemo(() => {
    let data = list
    const keyword = query.keyword.trim().toLowerCase()
    if (keyword) {
      data = data.filter(
        (item) => item.displayName.includes(query.keyword.trim()) || item.loginName.toLowerCase().includes(keyword),
      )
    }
    if (query.roleId) data = data.filter((item) => item.roleIds.includes(query.roleId))
    if (query.status) data = data.filter((item) => item.status === query.status)
    // 启用在前，其余按更新时间倒序
    return [...data].sort((a, b) => {
      if (a.status !== b.status) return a.status === 'enabled' ? -1 : 1
      return b.updatedAt.localeCompare(a.updatedAt)
    })
  }, [list, query])

  useEffect(() => {
    setPage(1)
  }, [query])

  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const openView = (id: string) => navigate(`/system/account/${id}`)

  const refresh = async () => {
    await load()
    setConfirm(null)
    setResetTarget(null)
    setRoleTarget(null)
  }

  const columns: Column<PlatformAccount>[] = [
    {
      key: 'displayName',
      title: <span data-ann-target="account.col.name">姓名</span>,
      width: 110,
      render: (row) => (
        <button className="link" onClick={() => openView(row.id)}>
          {row.displayName}
          {row.id === CURRENT_ACCOUNT_ID && <span className="account-self-tag">本人</span>}
        </button>
      ),
    },
    {
      key: 'loginName',
      title: <span data-ann-target="account.col.loginName">登录名</span>,
      width: 110,
      render: (row) => <span className="mono nowrap">{row.loginName}</span>,
    },
    {
      key: 'mobile',
      title: <span data-ann-target="account.col.mobile">手机号</span>,
      width: 130,
      render: (row) => <span className="nowrap">{maskMobile(row.mobile)}</span>,
    },
    {
      key: 'email',
      title: <span data-ann-target="account.col.email">邮箱</span>,
      width: 180,
      render: (row) => (row.email ? <span className="nowrap">{row.email}</span> : <span className="text-tertiary">—</span>),
    },
    {
      key: 'roleIds',
      title: <span data-ann-target="account.col.roles">平台角色</span>,
      width: 180,
      render: (row) => (
        <span className="account-role-tags">
          {row.roleIds.map((roleId) => (
            <Tag key={roleId} tone={roleName(roleId) === '超级管理员' ? 'error' : 'default'}>
              {roleName(roleId)}
            </Tag>
          ))}
        </span>
      ),
    },
    {
      key: 'status',
      title: <span data-ann-target="account.col.status">账号状态</span>,
      width: 90,
      render: (row) => <Tag tone={accountStatusTone[row.status]}>{accountStatusText[row.status]}</Tag>,
    },
    {
      key: 'lastLoginAt',
      title: <span data-ann-target="account.col.lastLogin">最近登录时间</span>,
      width: 150,
      render: (row) => (row.lastLoginAt ? <span className="nowrap">{row.lastLoginAt}</span> : <span className="text-tertiary">未登录</span>),
    },
    {
      key: 'createdBy',
      title: <span data-ann-target="account.col.createdBy">创建人</span>,
      width: 140,
      render: (row) => <span className="nowrap">{row.createdBy}</span>,
    },
    {
      key: 'createdAt',
      title: <span data-ann-target="account.col.createdAt">创建时间</span>,
      width: 150,
      render: (row) => <span className="nowrap">{row.createdAt}</span>,
    },
    {
      key: 'actions',
      title: '操作',
      width: 200,
      render: (row) => {
        const action = accountActions[row.status]
        const isSelf = row.id === CURRENT_ACCOUNT_ID
        const items: RowAction[] = [
          { key: 'view', label: '查看', onClick: () => openView(row.id) },
          ...(action.edit
            ? [{ key: 'edit', label: '编辑', onClick: () => navigate(`/system/account/${row.id}/edit`) }]
            : []),
          ...(action.assign ? [{ key: 'assign', label: '分配角色', onClick: () => setRoleTarget(row) }] : []),
          ...(action.disable
            ? [{ key: 'disable', label: '停用', danger: true, onClick: () => setConfirm({ account: row, mode: 'disable' }) }]
            : []),
          ...(action.enable
            ? [{ key: 'enable', label: '启用', onClick: () => setConfirm({ account: row, mode: 'enable' }) }]
            : []),
          ...(action.reset && !isSelf
            ? [{ key: 'reset', label: '重置密码', danger: true, onClick: () => setResetTarget(row) }]
            : []),
          ...(action.cancel
            ? [{ key: 'cancel', label: '注销', danger: true, onClick: () => setConfirm({ account: row, mode: 'cancel' }) }]
            : []),
        ]
        return <AccountRowActions actions={items} />
      },
    },
  ]

  const enabledCount = rows.filter((item) => item.status === 'enabled').length

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '组织与权限', '平台账号']}
        title={<span data-ann-target="account.page.global">平台账号</span>}
        description="平台自有账号的建档与维护：建号授角色、改档、停用启用、重置密码、注销。账号不占租户名额，权限取自平台角色。"
        actions={
          <Button variant="primary" data-ann-target="account.add.new" onClick={() => navigate('/system/account/new')}>
            新建
          </Button>
        }
      />

      <div className="card">
        <div className="query-bar" data-ann-target="account.query.bar">
          <div className="query-item">
            <span className="query-label">姓名 / 登录名</span>
            <Input
              value={query.keyword}
              placeholder="请输入"
              onChange={(e) => setQuery((prev) => ({ ...prev, keyword: e.target.value }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">平台角色</span>
            <Select
              value={query.roleId}
              placeholder="全部"
              options={roleOptions}
              onChange={(e) => setQuery((prev) => ({ ...prev, roleId: e.target.value }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">账号状态</span>
            <Select
              value={query.status}
              placeholder="全部"
              options={[
                { label: '启用', value: 'enabled' },
                { label: '停用', value: 'disabled' },
              ]}
              onChange={(e) => setQuery((prev) => ({ ...prev, status: e.target.value as '' | AccountStatus }))}
            />
          </div>
          <div className="query-actions">
            <Button onClick={() => setQuery(EMPTY_QUERY)}>重置</Button>
            <Button variant="primary">搜索</Button>
          </div>
        </div>

        <div className="toolbar" data-ann-target="account.toolbar">
          <div className="flex gap-sm">
            <span className="toolbar-title">平台账号列表</span>
            <span className="toolbar-tip">
              共 {rows.length} 条 · 启用 {enabledCount} 条 · 不可停用或注销最后一个启用状态的超管，也不可重置自己的密码
            </span>
          </div>
        </div>

        <div className="account-table-wrap" data-ann-target="account.page.list">
          <Table columns={columns} data={pagedRows} rowKey={(row) => row.id} loading={loading} />
        </div>

        <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      <AccountConfirmModal
        open={!!confirm}
        account={confirm?.account ?? null}
        mode={confirm?.mode ?? 'disable'}
        onClose={() => setConfirm(null)}
        onDone={() => void refresh()}
      />

      <AccountResetModal open={!!resetTarget} account={resetTarget} onClose={() => setResetTarget(null)} />

      <AccountRoleModal
        open={!!roleTarget}
        accountId={roleTarget?.id ?? null}
        accountName={roleTarget?.displayName ?? ''}
        currentRoleIds={roleTarget?.roleIds ?? []}
        onClose={() => setRoleTarget(null)}
        onSaved={() => void refresh()}
      />
    </>
  )
}
