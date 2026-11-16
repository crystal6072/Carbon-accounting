import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button, Icon, Input, MultiSelect, PageHeader, Pagination, RowActions, Select, Table, Tag, Tooltip, TreeSelect, useToast } from '@/shared/components'
import type { Column, MultiSelectOption, RowAction, SelectOption } from '@/shared/components'
import type { MemberFormMode } from './MemberFormModal'
import type { MemberDetail, Role, Tenant, TenantMemberItem, TreeOption } from '@/types'
import {
  CURRENT_TENANT_ID,
  fetchDeptOptions,
  fetchMemberDetail,
  fetchMembers,
  fetchTenantRoleOptions,
} from '@/mock/member'
import { TENANT_ADMIN_ROLE_NAME } from '@/mock/role'
import { fetchTenant as fetchTenantInfo } from '@/mock/tenant'
import { memberStatusText, memberStatusTone } from '../tenant/tenantMeta'
import { memberActions } from './memberMeta'
import MemberFormModal from './MemberFormModal'
import MemberDetailModal from './MemberDetailModal'
import MemberPermModal from './MemberPermModal'
import MemberStatusModal from './MemberStatusModal'
import MemberResetModal from './MemberResetModal'
import MemberBatchOrgModal from './MemberBatchOrgModal'
import './MemberPage.css'

const PAGE_SIZE = 10

export default function MemberListPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const tenantId = CURRENT_TENANT_ID

  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [members, setMembers] = useState<TenantMemberItem[]>([])
  const [loading, setLoading] = useState(false)
  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [roleOptions, setRoleOptions] = useState<Role[]>([])
  const [roleFilter, setRoleFilter] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [deptOptions, setDeptOptions] = useState<TreeOption[]>([])
  const [deptFilter, setDeptFilter] = useState('')
  const [rootOrgId, setRootOrgId] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<MemberFormMode>('create')
  const [formMember, setFormMember] = useState<TenantMemberItem | null>(null)
  const [initialDeptId, setInitialDeptId] = useState('')

  const [detailMember, setDetailMember] = useState<MemberDetail | null>(null)
  const [permMember, setPermMember] = useState<MemberDetail | null>(null)
  const [resetMember, setResetMember] = useState<MemberDetail | null>(null)
  const [statusTarget, setStatusTarget] = useState<{
    member: MemberDetail
    mode: 'disable' | 'enable' | 'remove'
  } | null>(null)

  const [batchOrgOpen, setBatchOrgOpen] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [showMemberTip, setShowMemberTip] = useState(true)

  /** 单条新建入口；所属组织必填、可搜索树形单选，默认带入路由 / 组织树选中节点 */
  const openCreate = useCallback(() => {
    setFormMember(null)
    setFormMode('create')
    setInitialDeptId('')
    setFormOpen(true)
  }, [])

  const openEdit = useCallback((member: TenantMemberItem) => {
    setFormMember(member)
    setFormMode('edit')
    setInitialDeptId('')
    setFormOpen(true)
  }, [])

  const openDetail = useCallback(
    async (member: TenantMemberItem) => {
      try {
        setDetailMember(await fetchMemberDetail(tenantId, member.id))
      } catch (error) {
        toast(error instanceof Error ? error.message : '加载失败', 'error')
      }
    },
    [tenantId, toast],
  )

  const openPerm = useCallback(
    async (member: TenantMemberItem) => {
      try {
        setPermMember(await fetchMemberDetail(tenantId, member.id))
      } catch (error) {
        toast(error instanceof Error ? error.message : '加载失败', 'error')
      }
    },
    [tenantId, toast],
  )

  /** 重置密码（§5.7）：仅「正常」成员可重置，主管理员由超管在租户管理重置，故入口按状态矩阵 + isPrimary 收敛 */
  const openReset = useCallback(
    async (member: TenantMemberItem) => {
      try {
        setResetMember(await fetchMemberDetail(tenantId, member.id))
      } catch (error) {
        toast(error instanceof Error ? error.message : '加载失败', 'error')
      }
    },
    [tenantId, toast],
  )

  /** 停用（离岗）/ 启用（复岗）/ 移出（离职）：先取成员详情，弹窗需 primaryAdmin、self 等派生标记 */
  const openStatus = useCallback(
    async (member: TenantMemberItem, mode: 'disable' | 'enable' | 'remove') => {
      try {
        setStatusTarget({ member: await fetchMemberDetail(tenantId, member.id), mode })
      } catch (error) {
        toast(error instanceof Error ? error.message : '加载失败', 'error')
      }
    },
    [tenantId, toast],
  )

  const closeForm = () => {
    setFormOpen(false)
    setFormMember(null)
    setInitialDeptId('')
  }
  const doneForm = () => {
    closeForm()
    void load()
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // 查询条件交由后端过滤（含手机号脱敏），前端只持有脱敏结果（§防坑指南）
      const [tenantData, list] = await Promise.all([
        fetchTenantInfo(tenantId),
        fetchMembers(tenantId, { keyword, roleFilter, statusFilter, deptFilter }),
      ])
      setTenant(tenantData)
      setMembers(list)
      setSelectedKeys([])
    } finally {
      setLoading(false)
    }
  }, [tenantId, keyword, roleFilter, statusFilter, deptFilter])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void (async () => {
      const tree = await fetchDeptOptions(tenantId)
      setDeptOptions(tree)
      setRootOrgId(tree[0]?.value ?? '')
    })()
  }, [tenantId])

  /** 从组织树「新增成员」跳转而带 orgId 时，自动打开新建表单并预置所属组织，随后清除路由 state */
  const initRef = useRef(false)
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
    const orgId = (location.state as { orgId?: string } | null)?.orgId
    if (orgId) {
      setFormMember(null)
      setFormMode('create')
      setInitialDeptId(orgId)
      setFormOpen(true)
      navigate(location.pathname, { replace: true, state: null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 查询过滤已在后端完成（fetchMembers 按条件过滤 + 手机号脱敏），此处无需前端二次过滤
  useEffect(() => {
    setPage(1)
  }, [keyword, roleFilter, statusFilter, deptFilter])

  const list = useMemo(() => members.slice((page - 1) * pageSize, page * pageSize), [members, page, pageSize])

  useEffect(() => {
    void (async () => {
      const roles = await fetchTenantRoleOptions(tenantId)
      setRoleOptions(roles)
    })()
  }, [tenantId])

  const creatingDisabled = tenant?.status === 'disabled'
  const allUnderRoot = members.length > 1 && members.every((m) => m.deptId === rootOrgId)
  /** 在任管理员数（租户管理员角色且状态正常），用于唯一管理员保护（与后端 E07 同口径） */
  const enabledAdminCount = members.filter(
    (item) => item.status === 'enabled' && item.roleNames.includes(TENANT_ADMIN_ROLE_NAME),
  ).length

  const columns: Column<TenantMemberItem>[] = [
    { key: 'name', title: '姓名', width: 90, render: (row) => <span className="nowrap">{row.name}</span> },
    {
      key: 'mobile',
      title: '手机号',
      width: 150,
      align: 'right',
      // 列表默认脱敏展示（138****1002）；按需求不在列表提供明文眼睛，明文仅在详情页经授权查看
      render: (row) => <span className="mono member-phone-mask">{row.mobile}</span>,
    },
    { key: 'deptName', title: '所属组织', width: 140, render: (row) => <span className="nowrap">{row.deptName || '—'}</span> },
    {
      key: 'roleNames',
      title: '角色',
      render: (row) => (
        <span className="member-role-tags">
          {row.roleNames.map((role) => (
            <Tag key={role}>{role}</Tag>
          ))}
        </span>
      ),
    },
    { key: 'status', title: '状态', width: 90, render: (row) => <Tag tone={memberStatusTone[row.status]}>{memberStatusText[row.status]}</Tag> },
    {
      key: 'createdAt',
      title: '加入时间',
      width: 150,
      align: 'right',
      render: (row) => <span className="nowrap">{row.createdAt}</span>,
    },
    {
      key: 'actions',
      title: '操作',
      width: 172,
      render: (row) => {
        // 已移出为终态：仅保留详情查看，其余操作全部收敛
        if (row.status === 'removed') {
          return (
            <RowActions
              actions={[{ key: 'view', label: '查看', annTarget: 'member.row.view', onClick: () => void openDetail(row) }]}
            />
          )
        }
        const isPrimary = !!tenant?.adminAccountId && tenant.adminAccountId === row.accountId
        // 唯一管理员保护：租户仅剩 1 名在任管理员时禁止停用该成员（防止误操作导致无人可管理）
        const isSoleAdmin =
          row.status === 'enabled' && row.roleNames.includes(TENANT_ADMIN_ROLE_NAME) && enabledAdminCount <= 1
        const action = memberActions[row.status]
        /**
         * 操作列口径（高频直出 + 低频收进「更多」，可见性取 memberActions 状态矩阵）：
         * - 直出：查看 / 编辑 / 停用·启用（日常操作，一屏可点）；
         * - 更多：权限 / 重置密码 / 移出（低频或破坏性操作）。
         * 主管理员不提供停用、移出、重置密码（改由超管在租户管理执行）；唯一管理员禁停用（E07）。
         */
        // 操作列口径（高频直出 + 低频收进「更多」+ 高危独立红色）：
        // - 直出：编辑（日常高频）；
        // - 更多：查看 / 权限 / 停用·启用 / 重置密码（低频或破坏性，且停用·启用按状态联动显示）；
        // - 移出：高危操作独立红色展示，点击走二次确认弹窗（§操作列防误触）。
        const actions: RowAction[] = [
          ...(action.edit
            ? [{ key: 'edit', label: '编辑', annTarget: 'member.row.edit', onClick: () => openEdit(row) }]
            : []),
          { key: 'view', label: '查看', annTarget: 'member.row.view', onClick: () => void openDetail(row) },
          ...(action.permission
            ? [{ key: 'perm', label: '权限', annTarget: 'member.row.perm', onClick: () => void openPerm(row) }]
            : []),
          ...(action.disable && !isPrimary
            ? [
                {
                  key: 'disable',
                  label: '停用',
                  danger: true,
                  disabled: isSoleAdmin,
                  title: isSoleAdmin ? '当前租户仅剩该名管理员，停用后无人可管理租户，请先添加其他管理员' : undefined,
                  annTarget: 'member.row.disable',
                  onClick: () => void openStatus(row, 'disable'),
                },
              ]
            : []),
          ...(action.enable
            ? [
                {
                  key: 'enable',
                  label: '启用',
                  annTarget: 'member.row.enable',
                  onClick: () => void openStatus(row, 'enable'),
                },
              ]
            : []),
          ...(action.reset && !isPrimary
            ? [
                {
                  key: 'reset',
                  label: '重置密码',
                  annTarget: 'member.row.reset',
                  onClick: () => void openReset(row),
                },
              ]
            : []),
        ]
        return (
          <>
            <RowActions actions={actions} maxVisible={action.edit ? 1 : 0} />
            {action.remove && !isPrimary && (
              <span
                className="link link-danger member-remove-link"
                role="button"
                tabIndex={0}
                onClick={() => void openStatus(row, 'remove')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void openStatus(row, 'remove')
                }}
              >
                移出
              </span>
            )}
          </>
        )
      },
    },
  ]

  const statusOptions: SelectOption[] = [
    { label: '启用', value: 'enabled' },
    { label: '停用', value: 'disabled' },
  ]
  const roleSelectOptions: MultiSelectOption[] = roleOptions.map((role) => ({ label: role.name, value: role.name }))

  return (
    <div className="page-container member-page">
      <PageHeader breadcrumb={['系统管理', '成员管理']} title="成员管理" />

      {allUnderRoot && showMemberTip && (
        <div className="soft-tip member-soft-tip">
          <span className="soft-tip-dot" />
          <span>当前成员均挂在根组织下，建议先建立部门层级，便于按组织查看和管理成员</span>
          <button type="button" className="soft-tip-close" onClick={() => setShowMemberTip(false)} aria-label="关闭">
            <Icon name="close" size={12} />
          </button>
        </div>
      )}

      <div className="toolbar">
        <div className="toolbar-left">
          <span className="member-search">
            <Icon name="search" size={14} className="member-search-icon" />
            <Input
              className="member-search-input"
              value={keywordInput}
              placeholder="搜索姓名/手机号/账号"
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setKeyword(keywordInput)
              }}
            />
          </span>
          <MultiSelect
            value={roleFilter}
            options={roleSelectOptions}
            placeholder="全部角色"
            onChange={(value) => setRoleFilter(value)}
          />
          <Select
            value={statusFilter}
            options={statusOptions}
            placeholder="全部状态"
            onChange={(e) => setStatusFilter(e.target.value)}
          />
          <TreeSelect
            value={deptFilter}
            options={deptOptions}
            allowClear
            placeholder="全部组织"
            onChange={(value) => setDeptFilter(value)}
          />
          <Button variant="primary" onClick={() => setKeyword(keywordInput)}>
            查询
          </Button>
          <Button
            onClick={() => {
              setKeywordInput('')
              setKeyword('')
              setRoleFilter([])
              setStatusFilter('')
              setDeptFilter('')
            }}
          >
            重置
          </Button>
        </div>
        <div className="toolbar-right">
          <Button onClick={() => toast('已导出（演示）')}>导出</Button>
          {selectedKeys.length === 0 ? (
            <Tooltip content="请先勾选需要操作的成员">
              <Button disabled>批量调整所属组织</Button>
            </Tooltip>
          ) : (
            <Button onClick={() => setBatchOrgOpen(true)}>批量调整所属组织（{selectedKeys.length}）</Button>
          )}
          <Button variant="primary" data-ann-target="member.btn.create" disabled={creatingDisabled} onClick={openCreate}>
            <Icon name="plus" size={14} />
            新建成员
          </Button>
        </div>
      </div>

      {members.length === 0 ? (
        <div className="table-card member-empty-state">
          <div className="empty-illustration" aria-hidden>
            <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
              <circle cx="48" cy="48" r="44" fill="#f3f6f9" />
              <rect x="30" y="34" width="36" height="30" rx="4" fill="#dbe4ec" />
              <rect x="38" y="42" width="20" height="3" rx="1.5" fill="#b6c4d2" />
              <rect x="38" y="50" width="14" height="3" rx="1.5" fill="#b6c4d2" />
              <circle cx="64" cy="64" r="14" fill="#fff" stroke="#9bb0c3" strokeWidth="3" />
              <line x1="74" y1="74" x2="84" y2="84" stroke="#9bb0c3" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          <div className="empty-title">暂无相关成员</div>
          <div className="empty-tip">未找到符合条件的成员，请调整筛选条件后重试</div>
          <Button
            onClick={() => {
              setKeywordInput('')
              setKeyword('')
              setRoleFilter([])
              setStatusFilter('')
              setDeptFilter('')
            }}
          >
            重置筛选条件
          </Button>
        </div>
      ) : (
        <>
          <div className="table-card">
            <Table
              columns={columns}
              data={list}
              rowKey={(row) => row.id}
              loading={loading}
              emptyText="暂无成员"
              rowClassName={(row) => (row.status !== 'enabled' ? 'member-row-disabled' : '')}
              rowSelection={{
                selectedKeys,
                onChange: setSelectedKeys,
                disabled: (row) => row.status === 'removed',
              }}
            />
          </div>

          <Pagination
            total={members.length}
            page={page}
            pageSize={pageSize}
            onChange={setPage}
            pageSizeOptions={[10, 20, 50]}
            showJump
            onPageSizeChange={(s) => {
              setPageSize(s)
              setPage(1)
            }}
          />
        </>
      )}

      <MemberFormModal
        open={formOpen}
        tenantId={tenantId}
        mode={formMode}
        member={formMember}
        initialDeptId={initialDeptId}
        onClose={closeForm}
        onDone={doneForm}
      />

      <MemberDetailModal open={!!detailMember} member={detailMember}
          onClose={() => setDetailMember(null)}
          onEdit={(m) => {
            setDetailMember(null)
            openEdit(m)
          }}
        />

      <MemberPermModal open={!!permMember} tenantId={tenantId} member={permMember} onClose={() => setPermMember(null)} />

      <MemberStatusModal
        open={!!statusTarget}
        tenantId={tenantId}
        member={statusTarget?.member ?? null}
        mode={statusTarget?.mode ?? 'disable'}
        onClose={() => setStatusTarget(null)}
        onDone={() => {
          setStatusTarget(null)
          void load()
        }}
      />

      <MemberResetModal
        open={!!resetMember}
        tenantId={tenantId}
        member={resetMember}
        onClose={() => setResetMember(null)}
      />

      <MemberBatchOrgModal
        open={batchOrgOpen}
        tenantId={tenantId}
        memberIds={selectedKeys}
        onClose={() => setBatchOrgOpen(false)}
        onDone={() => {
          setBatchOrgOpen(false)
          setSelectedKeys([])
          void load()
        }}
      />
    </div>
  )
}
