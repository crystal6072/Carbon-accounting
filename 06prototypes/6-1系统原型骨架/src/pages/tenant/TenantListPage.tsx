import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, PageHeader, Pagination, Select, Table, Tag, useToast } from '@/shared/components'
import type { Column, SelectOption } from '@/shared/components'
import { fetchTenants, isPlatformSuperAdmin } from '@/mock/tenant'
import type { Tenant, TenantStatus, TenantType } from '@/types'
import {
  tenantActions,
  tenantStatusText,
  tenantStatusTone,
  tenantTypeText,
  tenantValidState,
  tenantValidTone,
} from './tenantMeta'
import TenantStatusModal from './TenantStatusModal'
import TenantDeleteModal from './TenantDeleteModal'
import TenantModuleModal from './TenantModuleModal'
import TenantLimitModal from './TenantLimitModal'
import TenantEnterModal from './TenantEnterModal'
import './TenantPage.css'

const PAGE_SIZE = 20

interface QueryState {
  keyword: string
  type: '' | TenantType
  status: '' | TenantStatus
}

const EMPTY_QUERY: QueryState = { keyword: '', type: '', status: '' }

const TYPE_OPTIONS: SelectOption[] = [
  { label: '企业', value: 'enterprise' },
  { label: '政府单位', value: 'government' },
  { label: '机构', value: 'org' },
  { label: '园区', value: 'park' },
]

const STATUS_OPTIONS: SelectOption[] = [
  { label: '启用', value: 'enabled' },
  { label: '停用', value: 'disabled' },
]

export default function TenantListPage() {
  const navigate = useNavigate()
  const toast = useToast()
  /** 超管专属动作（删除 / 进入租户）的判定，见 C-08；原型当前登录者恒为超管 */
  const superAdmin = isPlatformSuperAdmin()

  const [list, setList] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState<QueryState>(EMPTY_QUERY)
  const [page, setPage] = useState(1)
  /** 展开「更多」下拉的行 id */
  const [moreOpen, setMoreOpen] = useState<string | null>(null)

  const [statusTarget, setStatusTarget] = useState<{ tenant: Tenant; mode: 'disable' | 'enable' } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null)
  const [moduleTarget, setModuleTarget] = useState<Tenant | null>(null)
  const [limitTarget, setLimitTarget] = useState<Tenant | null>(null)
  const [enterTarget, setEnterTarget] = useState<Tenant | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setList(await fetchTenants())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // 点击「更多」面板外部时收起
  useEffect(() => {
    if (!moreOpen) return
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.tenant-more')) setMoreOpen(null)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [moreOpen])

  const rows = useMemo(() => {
    let data = list
    const keyword = query.keyword.trim().toLowerCase()
    if (keyword) {
      data = data.filter(
        (item) => item.name.includes(query.keyword.trim()) || item.unifiedCode.toLowerCase().includes(keyword),
      )
    }
    if (query.type) data = data.filter((item) => item.type === query.type)
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

  const openView = (id: string) => navigate(`/system/tenant/${id}`)

  const refresh = async () => {
    await load()
    setStatusTarget(null)
    setDeleteTarget(null)
    setModuleTarget(null)
    setLimitTarget(null)
    setEnterTarget(null)
    setMoreOpen(null)
  }

  /** 打开任一弹窗前先收起「更多」面板 */
  const openModal = (setter: (value: Tenant) => void, tenant: Tenant) => {
    setMoreOpen(null)
    setter(tenant)
  }

  const columns: Column<Tenant>[] = [
    {
      key: 'name',
      title: '租户名称',
      width: 220,
      render: (row) => (
        <button className="link" onClick={() => openView(row.id)}>
          {row.name}
        </button>
      ),
    },
    { key: 'type', title: '类型', width: 100, render: (row) => <Tag>{tenantTypeText[row.type]}</Tag> },
    {
      key: 'status',
      title: <span data-ann-target="tenant.col.status">状态</span>,
      width: 90,
      render: (row) => <Tag tone={tenantStatusTone[row.status]}>{tenantStatusText[row.status]}</Tag>,
    },
    {
      key: 'valid',
      title: <span data-ann-target="tenant.col.valid">有效期</span>,
      width: 130,
      render: (row) => {
        const state = tenantValidState(row)
        return <Tag tone={tenantValidTone(state)}>{state}</Tag>
      },
    },
    { key: 'createdAt', title: '创建时间', width: 165, render: (row) => <span className="nowrap">{row.createdAt}</span> },
    {
      key: 'actions',
      title: '操作',
      width: 280,
      render: (row) => {
        const action = tenantActions[row.status]
        return (
          <span className="row-actions">
            <button className="link" data-ann-target="tenant.row.view" onClick={() => openView(row.id)}>
              查看
            </button>
            {action.edit && (
              <button
                className="link"
                data-ann-target="tenant.row.edit"
                onClick={() => navigate(`/system/tenant/${row.id}/edit`)}
              >
                编辑
              </button>
            )}
            {action.module && (
              <button className="link" data-ann-target="tenant.row.authorize" onClick={() => openModal(setModuleTarget, row)}>
                授权
              </button>
            )}
            {action.disable && (
              <button
                className="link link-danger"
                data-ann-target="tenant.row.disable"
                onClick={() => openModal((t) => setStatusTarget({ tenant: t, mode: 'disable' }), row)}
              >
                停用
              </button>
            )}
            {action.enable && (
              <button
                className="link"
                data-ann-target="tenant.row.enable"
                onClick={() => openModal((t) => setStatusTarget({ tenant: t, mode: 'enable' }), row)}
              >
                启用
              </button>
            )}
            <span className="tenant-more">
              <button className="link" data-ann-target="tenant.row.more" onClick={() => setMoreOpen(moreOpen === row.id ? null : row.id)}>
                更多
                <span className="tenant-more-caret">▾</span>
              </button>
              {moreOpen === row.id && (
                <span className="tenant-more-panel">
                  {action.limit && (
                    <button className="tenant-more-item" data-ann-target="tenant.more.limit" onClick={() => openModal(setLimitTarget, row)}>
                      调整上限
                    </button>
                  )}
                  {/* 进入租户为超管专属动作（C-08） */}
                  {superAdmin && action.enter && (
                    <button className="tenant-more-item" data-ann-target="tenant.more.enter" onClick={() => openModal(setEnterTarget, row)}>
                      进入租户
                    </button>
                  )}
                  {/* 删除为超管专属动作（C-08）；启用状态不可删，须先停用 */}
                  {superAdmin &&
                    (action.delete ? (
                      <button
                        className="tenant-more-item tenant-more-item-danger"
                        data-ann-target="tenant.more.delete"
                        onClick={() => openModal(setDeleteTarget, row)}
                      >
                        删除
                      </button>
                    ) : (
                      <span className="tenant-more-item" style={{ color: 'var(--color-text-tertiary)', cursor: 'not-allowed' }}>
                        请先停用后再删除
                      </span>
                    ))}
                </span>
              )}
            </span>
          </span>
        )
      },
    },
  ]

  /** 查询：输入条件即时过滤；「搜索」按钮保留，点击执行一次当前条件筛选（与产品分类同口径） */
  const handleSearch = () => {
    setPage(1)
    toast('查询完成')
  }

  const enabledCount = rows.filter((item) => item.status === 'enabled').length

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '组织与权限', '租户管理']}
        title={<span data-ann-target="tenant.page.global">租户管理</span>}
        description="租户 = 租户主档（统一字段）+ 按类型扩展档案 + 模块授权。开户建档、编辑档案、停用启用、删除、授权与主管理员交接；删除为物理删除，不可恢复。"
        actions={
          <Button variant="primary" data-ann-target="tenant.add" onClick={() => navigate('/system/tenant/new')}>
            新建
          </Button>
        }
      />

      <div className="card">
        <div className="query-bar" data-ann-target="tenant.query.bar">
          <div className="query-item">
            <span className="query-label">租户名称 / 租户编号</span>
            <Input
              value={query.keyword}
              placeholder="请输入"
              onChange={(e) => setQuery((prev) => ({ ...prev, keyword: e.target.value }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">租户类型</span>
            <Select
              value={query.type}
              placeholder="全部"
              options={TYPE_OPTIONS}
              onChange={(e) => setQuery((prev) => ({ ...prev, type: e.target.value as '' | TenantType }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">租户状态</span>
            <Select
              value={query.status}
              placeholder="全部"
              options={STATUS_OPTIONS}
              onChange={(e) => setQuery((prev) => ({ ...prev, status: e.target.value as '' | TenantStatus }))}
            />
          </div>
          <div className="query-actions">
            <Button data-ann-target="tenant.query.reset" onClick={() => setQuery(EMPTY_QUERY)}>
              重置
            </Button>
            <Button variant="primary" data-ann-target="tenant.query.search" onClick={handleSearch}>
              搜索
            </Button>
          </div>
        </div>

        <div className="toolbar">
          <div className="flex gap-sm">
            <span className="toolbar-title">租户列表</span>
            <span className="toolbar-tip">共 {rows.length} 条 · 启用 {enabledCount} 条 · 删除须二次确认并输入租户全名，物理删除不可恢复</span>
          </div>
        </div>

        <div className="tenant-table-wrap" data-ann-target="tenant.page.list">
          <Table columns={columns} data={pagedRows} rowKey={(row) => row.id} loading={loading} />
        </div>

        <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      <TenantStatusModal
        open={!!statusTarget}
        tenant={statusTarget?.tenant ?? null}
        mode={statusTarget?.mode ?? 'disable'}
        onClose={() => setStatusTarget(null)}
        onDone={() => void refresh()}
      />

      <TenantDeleteModal
        open={!!deleteTarget}
        tenant={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDone={() => void refresh()}
      />

      <TenantModuleModal
        open={!!moduleTarget}
        tenant={moduleTarget}
        onClose={() => setModuleTarget(null)}
        onDone={() => void refresh()}
      />

      <TenantLimitModal
        open={!!limitTarget}
        tenant={limitTarget}
        onClose={() => setLimitTarget(null)}
        onDone={() => void refresh()}
      />

      <TenantEnterModal
        open={!!enterTarget}
        tenant={enterTarget}
        onClose={() => setEnterTarget(null)}
        onDone={() => void refresh()}
      />
    </>
  )
}
