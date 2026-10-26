import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Icon, Input, PageHeader, Pagination, Table, Tag } from '@/shared/components'
import type { Column } from '@/shared/components'
import { fetchRoles } from '@/mock/role'
import type { Role } from '@/types'
import { roleActions, roleStatusText, roleStatusTone } from './roleMeta'
import RoleModal from './RoleModal'
import RoleAssignModal from './RoleAssignModal'
import RoleConfirmModal from './RoleConfirmModal'
import type { RoleConfirmMode } from './RoleConfirmModal'
import './RolePage.css'

const PAGE_SIZE = 20

interface QueryState {
  keyword: string
}

const EMPTY_QUERY: QueryState = { keyword: '' }

/**
 * 平台角色管理列表（对齐参考图：筛选 + 新增 / 批量删除 + 角色名称 / 标识 / 描述 / 创建时间 + 修改 / 授权 / 删除）。
 * 只展示归属类型为平台的角色：平台角色只授予平台人员，不下发给租户；
 * 租户角色由租户自建自管、只在租户内生效，不在本页展示（租户管理 PRD V0.9 §1.4 / 角色管理 PRD V0.2 §1.6）。
 */
export default function RoleListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const editId = searchParams.get('edit')
  const assignId = searchParams.get('assign')

  const [list, setList] = useState<Role[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState<QueryState>(EMPTY_QUERY)
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [confirm, setConfirm] = useState<{ mode: RoleConfirmMode; role?: Role; batch?: Role[] } | null>(null)

  // 只加载平台角色：租户角色不在平台侧展示
  const load = useCallback(async () => {
    setLoading(true)
    try {
      setList(await fetchRoles('platform'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const rows = useMemo(() => {
    const keyword = query.keyword.trim()
    const data = keyword
      ? list.filter((item) => item.name.includes(keyword) || item.code.includes(keyword.toUpperCase()))
      : list
    return [...data].sort((a, b) => {
      // 启用在前，其余按创建时间倒序
      if (a.status !== b.status) return a.status === 'enabled' ? -1 : 1
      return b.createdAt.localeCompare(a.createdAt)
    })
  }, [list, query])

  useEffect(() => {
    setPage(1)
  }, [query])

  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const closeModal = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('edit')
    next.delete('assign')
    setSearchParams(next, { replace: true })
  }

  const openEdit = (role: Role) => setSearchParams(withParam('edit', role.id), { replace: true })
  const openCopy = (role: Role) => setSearchParams(withParam('edit', `copy:${role.id}`), { replace: true })
  const openAssign = (role: Role) => setSearchParams(withParam('assign', role.id), { replace: true })

  function withParam(key: string, value: string): URLSearchParams {
    const next = new URLSearchParams(searchParams)
    next.delete('edit')
    next.delete('assign')
    next.set(key, value)
    return next
  }

  const modalRole = useMemo(() => {
    if (!editId) return null
    if (editId.startsWith('copy:')) return null
    return list.find((item) => item.id === editId) ?? null
  }, [editId, list])

  const copySource = useMemo(() => {
    if (!editId?.startsWith('copy:')) return null
    const id = editId.slice(5)
    return list.find((item) => item.id === id) ?? null
  }, [editId, list])

  const assignRole = useMemo(() => (assignId ? list.find((item) => item.id === assignId) ?? null : null), [assignId, list])

  const refresh = async () => {
    await load()
    setSelectedIds([])
    setConfirm(null)
  }

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const toggleAll = () => {
    const selectable = pagedRows.filter((row) => rowActions(row)).map((row) => row.id)
    setSelectedIds((prev) => (prev.length === selectable.length ? [] : selectable))
  }

  // 可勾选删除的行：非内置
  const rowActions = (row: Role) => !row.builtin

  const selectedRoles = useMemo(() => list.filter((item) => selectedIds.includes(item.id)), [list, selectedIds])
  const pageSelectableIds = pagedRows.filter((row) => !row.builtin).map((row) => row.id)
  const allPageSelected = pageSelectableIds.length > 0 && pageSelectableIds.every((id) => selectedIds.includes(id))

  const columns: Column<Role>[] = [
    {
      key: 'select',
      title: (
        <span data-ann-target="role.row.select">
          <input
            type="checkbox"
            checked={allPageSelected}
            onChange={toggleAll}
            aria-label="全选本页"
          />
        </span>
      ),
      width: 44,
      align: 'center',
      render: (row) =>
        row.builtin ? (
          <span className="text-tertiary">—</span>
        ) : (
          <input
            type="checkbox"
            checked={selectedIds.includes(row.id)}
            onChange={() => toggleRow(row.id)}
            aria-label={`选择 ${row.name}`}
          />
        ),
    },
    {
      key: 'index',
      title: '#',
      width: 56,
      align: 'center',
      render: (_row, index) => (page - 1) * PAGE_SIZE + index + 1,
    },
    {
      key: 'name',
      title: <span data-ann-target="role.col.name">角色名称</span>,
      width: 180,
      render: (row) => (
        <span className="role-name-cell">
          <button className="link" onClick={() => navigate(`/system/role/${row.id}`)}>
            {row.name}
          </button>
          <span className="role-name-badges">
            {row.builtin ? (
              <span className={`role-name-badge${row.superAdmin || row.protectedRole ? ' protect' : ''}`}>
                {row.superAdmin || row.protectedRole ? '保护角色' : '内置'}
              </span>
            ) : (
              <span className="role-name-badge">自定义</span>
            )}
          </span>
        </span>
      ),
    },
    {
      key: 'code',
      title: <span data-ann-target="role.col.code">角色标识</span>,
      width: 190,
      render: (row) => <span className="nowrap mono">{row.code}</span>,
    },
    {
      key: 'status',
      title: <span data-ann-target="role.col.status">状态</span>,
      width: 90,
      render: (row) => <Tag tone={roleStatusTone[row.status]}>{roleStatusText[row.status]}</Tag>,
    },
    { key: 'createdAt', title: '创建时间', width: 170, render: (row) => <span className="nowrap">{row.createdAt}</span> },
    {
      key: 'actions',
      title: '操作',
      width: 240,
      render: (row) => {
        const action = roleActions[row.status]
        return (
          <span className="row-actions">
            {action.edit && !row.builtin && (
              <button className="link" data-ann-target="role.row.edit" onClick={() => openEdit(row)}>
                修改
              </button>
            )}
            {action.copy && (
              <button className="link" data-ann-target="role.row.assign" onClick={() => openAssign(row)}>
                授权
              </button>
            )}
            {action.copy && (
              <button className="link" data-ann-target="role.row.copy" onClick={() => openCopy(row)}>
                复制
              </button>
            )}
            {action.disable && !row.superAdmin && !row.protectedRole && (
              <button
                className="link link-danger"
                data-ann-target="role.row.disable"
                onClick={() => setConfirm({ mode: 'disable', role: row })}
              >
                停用
              </button>
            )}
            {action.enable && (
              <button className="link" data-ann-target="role.row.enable" onClick={() => setConfirm({ mode: 'enable', role: row })}>
                启用
              </button>
            )}
            {action.delete && !row.builtin && (
              <button
                className="link link-danger"
                data-ann-target="role.row.delete"
                onClick={() => setConfirm({ mode: 'delete', role: row })}
              >
                删除
              </button>
            )}
          </span>
        )
      },
    },
  ]

  const builtinCount = rows.filter((item) => item.builtin).length
  const customCount = rows.length - builtinCount

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '组织与权限', '平台角色管理']}
        title={<span data-ann-target="role.page.global">平台角色管理</span>}
        description="维护平台角色与功能菜单授权：平台角色只授予平台人员（平台账号），不下发给租户；租户角色由租户自建自管、只在租户内生效，不在本页展示。"
      />

      <div className="card">
        <div className="query-bar" data-ann-target="role.query.bar">
          <div className="query-item">
            <span className="query-label">角色名称</span>
            <Input
              value={query.keyword}
              placeholder="请输入角色名称"
              onChange={(e) => setQuery((prev) => ({ ...prev, keyword: e.target.value }))}
            />
          </div>
          <div className="query-actions">
            <Button data-ann-target="role.query.reset" onClick={() => setQuery(EMPTY_QUERY)}>
              重置
            </Button>
            <Button variant="primary" data-ann-target="role.query.search">
              <Icon name="search" size={14} />
              查询
            </Button>
          </div>
        </div>

        <div className="toolbar">
          <div className="flex gap-sm">
            <Button
              variant="primary"
              data-ann-target="role.add"
              onClick={() => setSearchParams(withParam('edit', 'new'), { replace: true })}
            >
              <Icon name="plus" size={14} />
              新增
            </Button>
            <Button
              variant="danger"
              data-ann-target="role.batch.delete"
              disabled={selectedIds.length === 0}
              onClick={() => setConfirm({ mode: 'delete', batch: selectedRoles })}
            >
              <Icon name="trash" size={14} />
              删除{selectedIds.length > 0 ? `（${selectedIds.length}）` : ''}
            </Button>
          </div>
          <div className="flex gap-sm">
            <span className="toolbar-tip">
              共 {rows.length} 条 · 内置 {builtinCount} 条 · 自定义 {customCount} / 20 · 本页只维护平台角色；租户角色由租户自建自管、只在租户内生效，与本页完全隔离、不混用
            </span>
            <button className="link" onClick={() => void load()} title="刷新">
              <Icon name="export" size={14} />
            </button>
          </div>
        </div>

        <div className="role-table-wrap" data-ann-target="role.page.list">
          <Table columns={columns} data={pagedRows} rowKey={(row) => row.id} loading={loading} />
        </div>

        <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      {/* 新增 / 修改 / 复制 */}
      <RoleModal
        open={editId === 'new' || !!modalRole || !!copySource}
        role={modalRole}
        source={copySource}
        scope="platform"
        onClose={closeModal}
        onSaved={() => {
          closeModal()
          void refresh()
        }}
      />

      {/* 分配权限 */}
      <RoleAssignModal
        open={!!assignRole}
        role={assignRole}
        onClose={closeModal}
        onSaved={() => {
          closeModal()
          void refresh()
        }}
      />

      {/* 停用 / 启用 / 删除（含批量） */}
      <RoleConfirmModal
        open={!!confirm}
        role={confirm?.role ?? selectedRoles[0] ?? null}
        mode={confirm?.mode ?? 'disable'}
        batchRoles={confirm?.batch}
        onClose={() => setConfirm(null)}
        onDone={() => void refresh()}
      />
    </>
  )
}
