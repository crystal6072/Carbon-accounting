import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, PageHeader, Pagination, Select, Table, Tag } from '@/shared/components'
import type { Column, SelectOption } from '@/shared/components'
import { accountKindOf, fetchAllAccounts } from '@/mock/account'
import type { AccountStatus, PlatformAccount } from '@/types'
import { accountStatusText, accountStatusTone, maskMobile } from './accountMeta'
import './AccountPage.css'

const PAGE_SIZE = 20

type AccountKind = 'platform' | 'tenant'

interface QueryState {
  keyword: string
  kind: '' | AccountKind
  status: '' | AccountStatus
}

const EMPTY_QUERY: QueryState = { keyword: '', kind: '', status: '' }

const KIND_TEXT: Record<AccountKind, string> = {
  platform: '平台账号',
  tenant: '租户成员',
}

const KIND_TONE: Record<AccountKind, 'info' | 'default'> = {
  platform: 'info',
  tenant: 'default',
}

/**
 * 账号查询（平台管理员视角）：跨域查看**全局所有账号**——
 * 既含平台后台「平台账号」（持平台角色），也含租户端「租户成员」（不持平台角色）。
 * 只读查询，不提供任何编辑入口；平台账号可下钻到平台账号详情。
 */
export default function AccountQueryPage() {
  const navigate = useNavigate()

  const [list, setList] = useState<PlatformAccount[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState<QueryState>(EMPTY_QUERY)
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const accounts = await fetchAllAccounts()
      setList(accounts)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const rows = useMemo(() => {
    let data = list
    const keyword = query.keyword.trim().toLowerCase()
    if (keyword) {
      data = data.filter(
        (item) =>
          item.displayName.includes(query.keyword.trim()) ||
          item.loginName.toLowerCase().includes(keyword) ||
          item.mobile.includes(query.keyword.trim()),
      )
    }
    if (query.kind) data = data.filter((item) => accountKindOf(item) === query.kind)
    if (query.status) data = data.filter((item) => item.status === query.status)
    // 平台账号在前，其余（租户成员）在后；同为平台账号按更新时间倒序
    return [...data].sort((a, b) => {
      if (accountKindOf(a) !== accountKindOf(b)) return accountKindOf(a) === 'platform' ? -1 : 1
      if (a.status !== b.status) return a.status === 'enabled' ? -1 : 1
      return b.updatedAt.localeCompare(a.updatedAt)
    })
  }, [list, query])

  useEffect(() => {
    setPage(1)
  }, [query])

  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const platformCount = rows.filter((item) => accountKindOf(item) === 'platform').length
  const tenantCount = rows.length - platformCount

  const columns: Column<PlatformAccount>[] = [
    {
      key: 'displayName',
      title: '姓名',
      width: 120,
      render: (row) => (
        <button className="link" onClick={() => navigate(`/system/account/${row.id}`)}>
          {row.displayName}
        </button>
      ),
    },
    { key: 'loginName', title: '登录名', width: 120, render: (row) => <span className="mono nowrap">{row.loginName}</span> },
    { key: 'mobile', title: '手机号', width: 130, render: (row) => <span className="nowrap">{maskMobile(row.mobile)}</span> },
    {
      key: 'email',
      title: '邮箱',
      width: 180,
      render: (row) => (row.email ? <span className="nowrap">{row.email}</span> : <span className="text-tertiary">—</span>),
    },
    {
      key: 'kind',
      title: '账号类型',
      width: 100,
      render: (row) => {
        const kind = accountKindOf(row)
        return <Tag tone={KIND_TONE[kind]}>{KIND_TEXT[kind]}</Tag>
      },
    },
    {
      key: 'status',
      title: '账号状态',
      width: 90,
      render: (row) => <Tag tone={accountStatusTone[row.status]}>{accountStatusText[row.status]}</Tag>,
    },
    {
      key: 'lastLoginAt',
      title: '最近登录时间',
      width: 150,
      render: (row) => (row.lastLoginAt ? <span className="nowrap">{row.lastLoginAt}</span> : <span className="text-tertiary">未登录</span>),
    },
    {
      key: 'orgs',
      title: '所属组织',
      width: 200,
      render: (row) => {
        const active = row.tenantMemberships.filter((item) => item.status === 'active')
        if (active.length === 0) return <span className="text-tertiary">—</span>
        return (
          <span className="account-org-links">
            {active.map((item, index) => (
              <span key={item.id}>
                {index > 0 ? '、' : ''}
                {item.tenantName}
              </span>
            ))}
          </span>
        )
      },
    },
    { key: 'createdBy', title: '创建人', width: 140, render: (row) => <span className="nowrap">{row.createdBy}</span> },
    { key: 'createdAt', title: '创建时间', width: 150, render: (row) => <span className="nowrap">{row.createdAt}</span> },
  ]

  const kindOptions: SelectOption[] = [
    { label: '平台账号', value: 'platform' },
    { label: '租户成员', value: 'tenant' },
  ]

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '组织与权限', '账号查询']}
        title={<span data-ann-target="account.querypage.global">账号查询</span>}
        description="平台管理员全局账号视图：跨域查看所有账号（含平台账号与租户成员），只读不编辑。平台账号可下钻到平台账号详情。"
      />

      <div className="card">
        <div className="query-bar" data-ann-target="account.querypage.query.bar">
          <div className="query-item">
            <span className="query-label">姓名 / 登录名 / 手机号</span>
            <Input
              value={query.keyword}
              placeholder="请输入"
              onChange={(e) => setQuery((prev) => ({ ...prev, keyword: e.target.value }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">账号类型</span>
            <Select
              value={query.kind}
              placeholder="全部"
              options={kindOptions}
              onChange={(e) => setQuery((prev) => ({ ...prev, kind: e.target.value as '' | AccountKind }))}
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

        <div className="toolbar">
          <div className="flex gap-sm">
            <span className="toolbar-title">全部账号列表</span>
            <span className="toolbar-tip">
              共 {rows.length} 条 · 平台账号 {platformCount} 条 · 租户成员 {tenantCount} 条（账号表全局唯一一份，两域共享）
            </span>
          </div>
        </div>

        <div className="account-table-wrap" data-ann-target="account.querypage.list">
          <Table columns={columns} data={pagedRows} rowKey={(row) => row.id} loading={loading} />
        </div>

        <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>
    </>
  )
}
