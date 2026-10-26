import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Input, PageHeader, Pagination, Select, Table, Tag } from '@/shared/components'
import type { Column, SelectOption } from '@/shared/components'
import type { MemberDetail, Role, Tenant, TenantMemberItem, TenantMemberStatus } from '@/types'
import {
  CURRENT_MEMBER_ID,
  CURRENT_TENANT_ID,
  fetchMemberDetail,
  fetchMembers,
  fetchTenantRoleOptions,
} from '@/mock/member'
import { TENANT_ADMIN_ROLE_NAME } from '@/mock/role'
import { fetchTenant, memberUsage } from '@/mock/tenant'
import { joinedViaText, memberActions, memberStatusText, memberStatusTone } from './memberMeta'
import MemberDetailModal from './MemberDetailModal'
import MemberFormModal from './MemberFormModal'
import type { MemberFormMode } from './MemberFormModal'
import MemberPermModal from './MemberPermModal'
import MemberResetModal from './MemberResetModal'
import MemberStatusModal from './MemberStatusModal'
import { maskMobile } from '../account/accountMeta'
import './MemberPage.css'

interface RowAction {
  key: string
  label: string
  danger?: boolean
  disabled?: boolean
  title?: string
  annTarget?: string
  onClick: () => void
}

/** 操作列：超过 3 个操作收起到「更多」下拉，避免列宽过宽 */
function MemberRowActions({ actions }: { actions: RowAction[] }) {
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

  const renderButton = (a: RowAction, extraClass = '') => (
    <button
      key={a.key}
      type="button"
      className={`link${a.danger ? ' link-danger' : ''}${extraClass}`}
      disabled={a.disabled}
      title={a.title}
      data-ann-target={a.annTarget}
      onClick={() => {
        if (a.disabled) return
        a.onClick()
      }}
    >
      {a.label}
    </button>
  )

  return (
    <span className="row-actions">
      {visible.map((a) => renderButton(a))}
      {overflow.length > 0 && (
        <span className="row-actions-more" ref={ref}>
          <button type="button" className="link" onClick={() => setOpen((v) => !v)}>
            更多 ▾
          </button>
          {open && (
            <span className="row-actions-menu">
              {overflow.map((a) => (
                <span
                  key={a.key}
                  className={`row-actions-menu-item${a.danger ? ' link-danger' : ''}${a.disabled ? ' is-disabled' : ''}`}
                  title={a.title}
                  data-ann-target={a.annTarget}
                  onClick={() => {
                    if (a.disabled) return
                    setOpen(false)
                    a.onClick()
                  }}
                >
                  {a.label}
                </span>
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
  roleName: string
  status: '' | TenantMemberStatus
}

/** 状态筛选默认选中「正常」，可切换查看「已禁用」（成员状态管理规则） */
const EMPTY_QUERY: QueryState = { keyword: '', roleName: '', status: 'enabled' }

/**
 * 成员管理（租户端 · 系统管理）：本租户成员全生命周期维护。
 * 入职（新建 / 关联已有账号）、调岗与配角色（编辑）、离岗（停用）、复岗（启用）、
 * 离职（移出）、凭证遗失（重置密码）、核查权限（查看有效权限）。
 */
export default function MemberListPage() {
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [list, setList] = useState<TenantMemberItem[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState<QueryState>(EMPTY_QUERY)
  const [page, setPage] = useState(1)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<MemberFormMode>('create')
  const [editing, setEditing] = useState<TenantMemberItem | null>(null)
  const [detailTarget, setDetailTarget] = useState<MemberDetail | null>(null)
  const [statusTarget, setStatusTarget] = useState<{ member: MemberDetail; mode: 'disable' | 'enable' } | null>(null)
  const [resetTarget, setResetTarget] = useState<MemberDetail | null>(null)
  const [permTarget, setPermTarget] = useState<MemberDetail | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [tenantData, members, roleList] = await Promise.all([
        fetchTenant(CURRENT_TENANT_ID),
        fetchMembers(CURRENT_TENANT_ID),
        fetchTenantRoleOptions(),
      ])
      setTenant(tenantData)
      setList(members)
      setRoles(roleList)
    } catch {
      setTenant(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // 「本人」固定为默认当前用户（演示视角切换已移除）
  const selfId = CURRENT_MEMBER_ID

  /** 行操作前按需加载成员详情（派生主管理员 / 本人标记） */
  const openWithDetail = async (row: TenantMemberItem, action: 'view' | 'edit' | 'status' | 'remove' | 'reset' | 'perm') => {
    const detail = await fetchMemberDetail(CURRENT_TENANT_ID, row.id)
    if (action === 'view') setDetailTarget(detail)
    else if (action === 'edit') {
      setEditing(row)
      setFormMode('edit')
      setFormOpen(true)
    }     else if (action === 'status') setStatusTarget({ member: detail, mode: detail.status === 'enabled' ? 'disable' : 'enable' })
    else if (action === 'reset') setResetTarget(detail)
    else if (action === 'perm') setPermTarget(detail)
  }

  const roleOptions: SelectOption[] = useMemo(() => roles.map((role) => ({ label: role.name, value: role.name })), [roles])

  const rows = useMemo(() => {
    let data = list
    const keyword = query.keyword.trim().toLowerCase()
    if (keyword) {
      data = data.filter(
        (item) =>
          item.name.includes(query.keyword.trim()) ||
          item.loginName.toLowerCase().includes(keyword) ||
          item.mobile.includes(query.keyword.trim()),
      )
    }
    if (query.roleName) data = data.filter((item) => item.roleNames.includes(query.roleName))
    if (query.status) data = data.filter((item) => item.status === query.status)
    // 启用在前，停用次之，已移出靠后；同状态按加入时间倒序
    const order: Record<TenantMemberStatus, number> = { enabled: 0, disabled: 1, removed: 2 }
    return [...data].sort((a, b) => order[a.status] - order[b.status] || b.joinedAt.localeCompare(a.joinedAt))
  }, [list, query])

  useEffect(() => {
    setPage(1)
  }, [query])

  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const columns: Column<TenantMemberItem>[] = [
    {
      key: 'name',
      title: <span data-ann-target="member.col.name">姓名</span>,
      width: 130,
      render: (row) => (
        <button className="link" onClick={() => void openWithDetail(row, 'view')}>
          {row.name}
          {tenant?.adminAccountId === row.accountId && <span className="member-primary-tag">主管理员</span>}
          {row.id === selfId && <span className="member-self-tag">本人</span>}
        </button>
      ),
    },
    { key: 'loginName', title: <span data-ann-target="member.col.loginName">登录名</span>, width: 120, render: (row) => <span className="mono nowrap">{row.loginName}</span> },
    { key: 'mobile', title: <span data-ann-target="member.col.mobile">手机号</span>, width: 130, render: (row) => <span className="nowrap">{maskMobile(row.mobile)}</span> },
    {
      key: 'deptName',
      title: <span data-ann-target="member.col.dept">部门</span>,
      width: 120,
      render: (row) => (row.deptName ? <span className="nowrap">{row.deptName}</span> : <span className="text-tertiary">未挂组织</span>),
    },
    {
      key: 'roleNames',
      title: <span data-ann-target="member.col.role">角色</span>,
      width: 170,
      render: (row) => (
        <span className="member-role-tags">
          {row.roleNames.map((name) => (
            <Tag key={name}>{name}</Tag>
          ))}
        </span>
      ),
    },
    {
      key: 'status',
      title: <span data-ann-target="member.col.status">成员状态</span>,
      width: 100,
      render: (row) => <Tag tone={memberStatusTone[row.status]}>{memberStatusText[row.status]}</Tag>,
    },
    { key: 'joinedVia', title: <span data-ann-target="member.col.joinedVia">加入方式</span>, width: 110, render: (row) => <span className="nowrap">{joinedViaText[row.joinedVia]}</span> },
    { key: 'joinedAt', title: <span data-ann-target="member.col.joinedAt">加入时间</span>, width: 150, render: (row) => <span className="nowrap">{row.joinedAt}</span> },
    {
      key: 'actions',
      title: '操作',
      width: 210,
      render: (row) => {
        const action = memberActions[row.status]
        const isPrimary = tenant?.adminAccountId === row.accountId
        // 唯一管理员保护：租户仅剩 1 名在任管理员时，禁止禁用该成员（防止误操作）
        const isSoleAdmin =
          action.disable && !isPrimary && row.status === 'enabled' && row.roleNames.includes(TENANT_ADMIN_ROLE_NAME) && enabledAdminCount <= 1
        const items: RowAction[] = [
          { key: 'view', label: '详情', annTarget: 'member.row.view', onClick: () => void openWithDetail(row, 'view') },
          ...(action.edit ? [{ key: 'edit', label: '编辑', annTarget: 'member.row.edit', onClick: () => void openWithDetail(row, 'edit') }] : []),
          ...(action.disable
            ? isPrimary
              ? []
              : [
                  {
                    key: 'disable',
                    label: '禁用',
                    danger: true,
                    disabled: isSoleAdmin,
                    title: isSoleAdmin ? '当前租户仅剩该名管理员，禁用后无人可管理租户，请先添加其他管理员' : undefined,
                    annTarget: 'member.row.disable',
                    onClick: () => void openWithDetail(row, 'status'),
                  },
                ]
            : []),
          ...(action.enable ? [{ key: 'enable', label: '启用', annTarget: 'member.row.enable', onClick: () => void openWithDetail(row, 'status') }] : []),
          ...(action.reset && !isPrimary
            ? [{ key: 'reset', label: '重置密码', danger: true, annTarget: 'member.row.reset', onClick: () => void openWithDetail(row, 'reset') }]
            : []),
          ...(action.permission ? [{ key: 'perm', label: '有效权限', annTarget: 'member.row.perm', onClick: () => void openWithDetail(row, 'perm') }] : []),
        ]
        return <MemberRowActions actions={items} />
      },
    },
  ]

  const usage = tenant ? memberUsage(tenant.id) : 0
  const enabledCount = rows.filter((item) => item.status === 'enabled').length
  /** 在任管理员数（按租户管理员角色且状态为正常计），用于唯一管理员保护 */
  const enabledAdminCount = list.filter(
    (item) => item.status === 'enabled' && item.roleNames.includes(TENANT_ADMIN_ROLE_NAME),
  ).length

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '组织与权限', '成员管理']}
        title={<span data-ann-target="member.page.global">成员管理</span>}
        description={`维护「${tenant?.name ?? '—'}」成员全生命周期：入职（新建）、调岗与配角色（编辑）、离岗（禁用，仅切断登录、保留历史业务数据与操作日志）、复岗（启用，可重新选择部门）、凭证遗失（重置密码）、核查权限。成员数含主管理员与已禁用。`}
        actions={
          <>
            <Button variant="primary" data-ann-target="member.btn.create" onClick={() => { setFormMode('create'); setFormOpen(true) }}>
              新建成员
            </Button>
          </>
        }
      />

      <div className="card">
        <div className="query-bar" data-ann-target="member.query">
          <div className="query-item">
            <span className="query-label">姓名 / 登录名 / 手机号</span>
            <Input
              value={query.keyword}
              placeholder="请输入"
              onChange={(e) => setQuery((prev) => ({ ...prev, keyword: e.target.value }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">角色</span>
            <Select
              value={query.roleName}
              placeholder="全部"
              options={roleOptions}
              onChange={(e) => setQuery((prev) => ({ ...prev, roleName: e.target.value }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">成员状态</span>
            <Select
              value={query.status}
              placeholder="全部"
              options={[
                { label: '全部', value: '' },
                { label: '正常', value: 'enabled' },
                { label: '已禁用', value: 'disabled' },
              ]}
              onChange={(e) => setQuery((prev) => ({ ...prev, status: e.target.value as '' | TenantMemberStatus }))}
            />
          </div>
          <div className="query-actions">
            <Button onClick={() => setQuery(EMPTY_QUERY)}>重置</Button>
            <Button variant="primary">搜索</Button>
          </div>
        </div>

        <div className="toolbar" data-ann-target="member.toolbar">
          <div className="flex gap-sm">
            <span className="toolbar-title">成员列表</span>
            <span className="toolbar-tip">
              共 {rows.length} 条 · 正常 {enabledCount} 条 · 用量 {usage}/{tenant?.memberLimit ?? 0}（已达上限时禁新增）
            </span>
          </div>
          <span className="toolbar-tip">主管理员不可禁用 / 重置密码，须先在平台「租户管理」更换；租户仅剩 1 名管理员时禁止禁用该唯一管理员</span>
        </div>

        <div className="member-table-wrap">
          <Table
            columns={columns}
            data={pagedRows}
            rowKey={(row) => row.id}
            loading={loading}
            rowClassName={(row) => (row.status !== 'enabled' ? 'member-row-disabled' : '')}
          />
        </div>

        <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      <MemberFormModal
        open={formOpen}
        tenantId={CURRENT_TENANT_ID}
        mode={formMode}
        member={editing}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        onDone={() => {
          setFormOpen(false)
          setEditing(null)
          void load()
        }}
      />

      <MemberDetailModal open={!!detailTarget} member={detailTarget} onClose={() => setDetailTarget(null)} />

      <MemberStatusModal
        open={!!statusTarget}
        tenantId={CURRENT_TENANT_ID}
        member={statusTarget?.member ?? null}
        mode={statusTarget?.mode ?? 'disable'}
        onClose={() => setStatusTarget(null)}
        onDone={() => {
          setStatusTarget(null)
          void load()
        }}
      />

      <MemberResetModal
        open={!!resetTarget}
        tenantId={CURRENT_TENANT_ID}
        member={resetTarget}
        onClose={() => setResetTarget(null)}
      />

      <MemberPermModal
        open={!!permTarget}
        tenantId={CURRENT_TENANT_ID}
        member={permTarget}
        onClose={() => setPermTarget(null)}
      />
    </>
  )
}
