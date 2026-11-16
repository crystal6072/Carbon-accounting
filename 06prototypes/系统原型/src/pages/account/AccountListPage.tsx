import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button, Input, PageHeader, Pagination, RowActions, Select, Table, Tag, Tooltip } from '@/shared/components'
import type { Column, RowAction, SelectOption } from '@/shared/components'
import {
  CURRENT_ACCOUNT_ID,
  fetchAccount,
  fetchAllAccounts,
  fetchPlatformRoles,
  isBuiltinRootAccount,
} from '@/mock/account'
import { membershipsOfAccount } from '@/mock/tenant'
import type { AccountStatus, PlatformAccount, PlatformRole } from '@/types'
import { accountActions, accountStatusText, accountStatusTone, maskMobile } from './accountMeta'
import AccountConfirmModal from './AccountConfirmModal'
import type { AccountConfirmMode } from './AccountConfirmModal'
import { AccountResetModal } from './AccountConfirmModal'
import AccountRoleModal from './AccountRoleModal'
import AccountFormModal from './AccountFormModal'
import type { AccountFormMode } from './AccountFormModal'
import AccountDetailModal from './AccountDetailModal'
import './AccountPage.css'

const PAGE_SIZE = 20
const LIST_PATH = '/system/account'

/** 身份筛选：账号本身没有类型，只有挂在账号上的身份 */
type IdentityFilter = '' | 'platform' | 'tenant'

interface QueryState {
  keyword: string
  identity: IdentityFilter
  roleId: string
  status: '' | AccountStatus
}

const EMPTY_QUERY: QueryState = { keyword: '', identity: '', roleId: '', status: '' }

const IDENTITY_OPTIONS: SelectOption[] = [
  { label: '持有平台角色', value: 'platform' },
  { label: '有租户成员关系', value: 'tenant' },
]

/**
 * 账号管理（全系统账号唯一列表）。
 *
 * 数据模型：账号是唯一实体；「平台角色」与「租户成员关系」是挂在账号上的两类**身份**，
 * 二者不互斥（存量双身份账号可同时命中两类身份筛选），因此筛选维度叫「身份」而不是「账号类型」。
 *
 * 操作口径（账号级能力统一在本页，不在租户管理里做跨租户操作）：
 * - 平台身份账号：编辑（含平台角色）、停用/启用、重置密码、注销；
 * - 租户成员账号：编辑账号级资料（姓名/手机号/邮箱）、停用/启用、重置密码、注销；
 * - 部门、租户角色、成员状态属租户内事实，仍归租户端成员管理，本页不提供。
 */
interface AccountRow {
  account: PlatformAccount
  roles: PlatformRole[]
  tenantIdentities: Array<{
    tenantId: string
    tenantName: string
    primary: boolean
    deptName: string
    roleNames: string[]
  }>
}

export default function AccountListPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id: routeId } = useParams()

  /** 兼容旧链接：/system/account/new、/system/account/:id、/system/account/:id/edit 直接弹窗 */
  const isNewRoute = location.pathname.endsWith('/new')
  const isEditRoute = location.pathname.endsWith('/edit')

  const [accounts, setAccounts] = useState<PlatformAccount[]>([])
  const [roles, setRoles] = useState<PlatformRole[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState<QueryState>(EMPTY_QUERY)
  const [page, setPage] = useState(1)

  const [confirm, setConfirm] = useState<{ account: PlatformAccount; mode: AccountConfirmMode } | null>(null)
  const [resetTarget, setResetTarget] = useState<PlatformAccount | null>(null)
  const [roleTarget, setRoleTarget] = useState<PlatformAccount | null>(null)
  const [formState, setFormState] = useState<{ mode: AccountFormMode; account: PlatformAccount | null } | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [allAccounts, roleList] = await Promise.all([fetchAllAccounts(), fetchPlatformRoles()])
      setAccounts(allAccounts)
      setRoles(roleList)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  /** 旧链接进入：按路径自动打开对应弹窗 */
  useEffect(() => {
    if (isNewRoute) {
      setFormState({ mode: 'create', account: null })
      setDetailId(null)
      return
    }
    if (routeId && isEditRoute) {
      // 平台账号与租户成员账号共用同一套编辑弹窗（成员账号的角色区只读）
      void fetchAccount(routeId)
        .then((account) => setFormState({ mode: 'edit', account }))
        .catch(() => setFormState(null))
      setDetailId(null)
      return
    }
    if (routeId) {
      setDetailId(routeId)
      setFormState(null)
    }
  }, [isNewRoute, isEditRoute, routeId])

  const isRouteModal = isNewRoute || !!routeId
  const backToListPath = () => {
    if (isRouteModal) navigate(LIST_PATH, { replace: true })
  }

  const closeDetail = () => {
    setDetailId(null)
    backToListPath()
  }
  const closeForm = () => {
    setFormState(null)
    backToListPath()
  }

  const roleName = (roleId: string) => roles.find((role) => role.id === roleId)?.name ?? roleId

  const roleOptions: SelectOption[] = useMemo(() => roles.map((role) => ({ label: role.name, value: role.id })), [roles])

  /** 全部账号 + 两类身份投影（租户身份以成员关系为真相源，不依赖账号侧冗余字段） */
  const rows: AccountRow[] = useMemo(
    () =>
      accounts.map((account) => ({
        account,
        roles: roles.filter((role) => account.roleIds.includes(role.id)),
        tenantIdentities: membershipsOfAccount(account.id),
      })),
    [accounts, roles],
  )

  const filtered = useMemo(() => {
    let data = rows
    const raw = query.keyword.trim()
    const keyword = raw.toLowerCase()
    if (keyword) {
      data = data.filter(
        (row) =>
          row.account.displayName.includes(raw) ||
          row.account.loginName.toLowerCase().includes(keyword) ||
          row.account.mobile.includes(raw),
      )
    }
    if (query.identity === 'platform') data = data.filter((row) => row.account.roleIds.length > 0)
    if (query.identity === 'tenant') data = data.filter((row) => row.tenantIdentities.length > 0)
    if (query.roleId) data = data.filter((row) => row.account.roleIds.includes(query.roleId))
    if (query.status) data = data.filter((row) => row.account.status === query.status)
    // 启用在前，其余按更新时间倒序
    return [...data].sort((a, b) => {
      if (a.account.status !== b.account.status) return a.account.status === 'enabled' ? -1 : 1
      return b.account.updatedAt.localeCompare(a.account.updatedAt)
    })
  }, [rows, query])

  useEffect(() => {
    setPage(1)
  }, [query])

  const pagedRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const refresh = async () => {
    await load()
    setConfirm(null)
    setResetTarget(null)
    setRoleTarget(null)
  }

  const columns: Column<AccountRow>[] = [
    {
      key: 'displayName',
      title: <span data-ann-target="account.col.name">姓名</span>,
      width: 120,
      render: ({ account }) => (
        <button className="link" onClick={() => setDetailId(account.id)}>
          {account.displayName}
          {account.id === CURRENT_ACCOUNT_ID && <span className="account-self-tag">本人</span>}
          {isBuiltinRootAccount(account) && <span className="account-builtin-tag">系统内置</span>}
        </button>
      ),
    },
    {
      key: 'loginName',
      title: <span data-ann-target="account.col.loginName">账号</span>,
      width: 110,
      render: ({ account }) => <span className="mono nowrap">{account.loginName}</span>,
    },
    {
      key: 'mobile',
      title: <span data-ann-target="account.col.mobile">手机号</span>,
      width: 130,
      render: ({ account }) => <span className="mono nowrap">{maskMobile(account.mobile)}</span>,
    },
    {
      key: 'email',
      title: <span data-ann-target="account.col.email">邮箱</span>,
      width: 170,
      render: ({ account }) =>
        account.email ? <span className="nowrap">{account.email}</span> : <span className="text-tertiary">—</span>,
    },
    {
      key: 'roles',
      title: <span data-ann-target="account.col.roles">平台角色</span>,
      width: 160,
      render: ({ roles: rowRoles }) =>
        rowRoles.length === 0 ? (
          <span className="text-tertiary">—</span>
        ) : (
          <span className="account-role-tags">
            {rowRoles.map((role) => (
              <Tag key={role.id} tone={role.name === '超级管理员' ? 'error' : 'default'}>
                {role.name}
              </Tag>
            ))}
          </span>
        ),
    },
    {
      key: 'tenantIdentities',
      title: '所属组织',
      width: 180,
      render: ({ tenantIdentities }) => {
        if (tenantIdentities.length === 0) return <span className="text-tertiary">—</span>
        // 单元格只展示「所在租户」；多于一个时折叠为「首个租户 等 N 个」
        const label =
          tenantIdentities.length === 1
            ? tenantIdentities[0].tenantName
            : `${tenantIdentities[0].tenantName} 等 ${tenantIdentities.length} 个`
        return (
          <Tooltip
            placement="bottom"
            content={
              <span>
                {tenantIdentities.map((item, index) => (
                  <span key={item.tenantId}>
                    {index > 0 && <br />}
                    {item.tenantName} · {item.deptName || '未挂组织'}
                  </span>
                ))}
              </span>
            }
          >
            <span className="account-org-cell nowrap">{label}</span>
          </Tooltip>
        )
      },
    },
    {
      key: 'status',
      title: <span data-ann-target="account.col.status">账号状态</span>,
      width: 90,
      render: ({ account }) => <Tag tone={accountStatusTone[account.status]}>{accountStatusText[account.status]}</Tag>,
    },
    {
      key: 'lastLoginAt',
      title: <span data-ann-target="account.col.lastLogin">最近登录时间</span>,
      width: 150,
      render: ({ account }) =>
        account.lastLoginAt ? <span className="nowrap">{account.lastLoginAt}</span> : <span className="text-tertiary">未登录</span>,
    },
    {
      key: 'actions',
      title: '操作',
      width: 220,
      render: ({ account }) => {
        const action = accountActions[account.status]
        const isSelf = account.id === CURRENT_ACCOUNT_ID
        const hasPlatformRole = account.roleIds.length > 0
        /**
         * 操作列口径：
         * - 系统内置根账号：**只读**，仅「查看」+「重置密码」（唯一例外：根账号**本人**可重置自己的密码）；
         * - 平台身份账号：查看 / 编辑（含平台角色）/ 分配角色 / 停用·启用 / 重置密码 / 注销；
         * - 租户成员账号：查看 / 编辑账号级资料 / 停用·启用 / 重置密码 / 注销（无平台角色可分配）。
         */
        const items: RowAction[] = isBuiltinRootAccount(account)
          ? [
              { key: 'view', label: '查看', onClick: () => setDetailId(account.id) },
              ...(isSelf ? [{ key: 'reset', label: '重置密码', danger: true, onClick: () => setResetTarget(account) }] : []),
            ]
          : [
              { key: 'view', label: '查看', onClick: () => setDetailId(account.id) },
              ...(action.edit
                ? [
                    {
                      key: 'edit',
                      label: '编辑',
                      // 平台账号与租户成员共用编辑弹窗，成员账号的角色区只读
                      onClick: () => setFormState({ mode: 'edit', account }),
                    },
                  ]
                : []),
              ...(hasPlatformRole && action.assign
                ? [{ key: 'assign', label: '分配角色', onClick: () => setRoleTarget(account) }]
                : []),
              ...(action.disable
                ? [{ key: 'disable', label: '停用', danger: true, onClick: () => setConfirm({ account, mode: 'disable' }) }]
                : []),
              ...(action.enable ? [{ key: 'enable', label: '启用', onClick: () => setConfirm({ account, mode: 'enable' }) }] : []),
              ...(action.reset && !isSelf
                ? [{ key: 'reset', label: '重置密码', danger: true, onClick: () => setResetTarget(account) }]
                : []),
              ...(action.cancel
                ? [{ key: 'cancel', label: '注销', danger: true, onClick: () => setConfirm({ account, mode: 'cancel' }) }]
                : []),
            ]
        return <RowActions actions={items} annPrefix="account.row." />
      },
    },
  ]

  const enabledCount = filtered.filter((item) => item.account.status === 'enabled').length
  const platformCount = filtered.filter((item) => item.account.roleIds.length > 0).length
  const tenantCount = filtered.filter((item) => item.tenantIdentities.length > 0).length

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '组织与权限', '账号管理']}
        title={<span data-ann-target="account.page.global">账号管理</span>}
        description="全系统账号唯一列表：账号 / 手机号全局唯一，账号不占租户名额。平台角色与租户成员关系是挂在账号上的两类身份，可并存；账号级运维（停用启用 / 重置密码 / 注销）统一在本页处理。"
        actions={
          <Button
            variant="primary"
            data-ann-target="account.add.new"
            onClick={() => setFormState({ mode: 'create', account: null })}
          >
            新建
          </Button>
        }
      />

      <div className="card">
        <div className="query-bar" data-ann-target="account.query.bar">
          <div className="query-item">
            <span className="query-label">姓名 / 账号 / 手机号</span>
            <Input
              value={query.keyword}
              placeholder="请输入"
              onChange={(e) => setQuery((prev) => ({ ...prev, keyword: e.target.value }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">身份</span>
            <Select
              value={query.identity}
              placeholder="全部"
              options={IDENTITY_OPTIONS}
              onChange={(e) => setQuery((prev) => ({ ...prev, identity: e.target.value as IdentityFilter }))}
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
          <div className="query-item">
            <span className="query-label">平台角色</span>
            <Select
              value={query.roleId}
              placeholder="全部"
              options={roleOptions}
              onChange={(e) => setQuery((prev) => ({ ...prev, roleId: e.target.value }))}
            />
          </div>
          <div className="query-actions">
            <Button onClick={() => setQuery(EMPTY_QUERY)}>重置</Button>
            <Button variant="primary">搜索</Button>
          </div>
        </div>

        <div className="toolbar" data-ann-target="account.toolbar">
          <div className="flex gap-sm">
            <span className="toolbar-title">账号列表</span>
            <span className="toolbar-tip">
              共 {filtered.length} 条 · 启用 {enabledCount} 条 · 持平台角色 {platformCount} 条 · 有租户身份 {tenantCount} 条；
              系统内置根账号只读（仅可查看与重置自己的密码）
            </span>
          </div>
        </div>

        <div className="account-table-wrap" data-ann-target="account.page.list">
          <Table columns={columns} data={pagedRows} rowKey={(row) => row.account.id} loading={loading} />
        </div>

        <Pagination total={filtered.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      <AccountConfirmModal
        open={!!confirm}
        account={confirm?.account ?? null}
        mode={confirm?.mode ?? 'disable'}
        onClose={() => setConfirm(null)}
        onDone={() => void refresh()}
      />

      <AccountResetModal
        open={!!resetTarget}
        account={resetTarget}
        onClose={() => {
          setResetTarget(null)
          void refresh()
        }}
      />

      <AccountRoleModal
        open={!!roleTarget}
        accountId={roleTarget?.id ?? null}
        accountName={roleTarget?.displayName ?? ''}
        currentRoleIds={roleTarget?.roleIds ?? []}
        onClose={() => setRoleTarget(null)}
        onSaved={() => void refresh()}
      />

      <AccountFormModal
        open={!!formState}
        mode={formState?.mode ?? 'create'}
        account={formState?.account ?? null}
        onClose={closeForm}
        onDone={() => {
          closeForm()
          void refresh()
        }}
      />

      <AccountDetailModal
        open={!!detailId}
        accountId={detailId}
        onClose={closeDetail}
        onChanged={() => void refresh()}
        onEdit={(account) => {
          setDetailId(null)
          setFormState({ mode: 'edit', account })
        }}
      />
    </>
  )
}
