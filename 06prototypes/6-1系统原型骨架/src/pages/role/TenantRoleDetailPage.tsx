import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, PageHeader, Table, Tag } from '@/shared/components'
import type { Column } from '@/shared/components'
import { fetchMenus } from '@/mock/menu'
import { CURRENT_TENANT, CURRENT_TENANT_ID, fetchDeptScopeOptions, fetchRole } from '@/mock/role'
import type { MenuFunction, Role, RoleMemberRef } from '@/types'
import { dataScopeText, roleActions, roleStatusText, roleStatusTone, scopeTextOf } from './roleMeta'
import RoleConfirmModal from './RoleConfirmModal'
import type { RoleConfirmMode } from './RoleConfirmModal'
import TenantRoleAssignModal from './TenantRoleAssignModal'
import './RolePage.css'

/**
 * 租户端「角色管理」详情：角色信息 + 功能菜单（含读写数据范围）+ 成员（查看 / 移除）。
 * 只展示本租户角色；租户管理员为保护角色，功能与范围可收窄，但不可停用、不可删除（§5.1-10）。
 */
export default function TenantRoleDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [role, setRole] = useState<Role | null>(null)
  const [functions, setFunctions] = useState<MenuFunction[]>([])
  const [deptNames, setDeptNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState<{ mode: RoleConfirmMode; member?: { id: string; name: string } } | null>(null)
  const [assignOpen, setAssignOpen] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [detail, list, depts] = await Promise.all([fetchRole(id), fetchMenus(), fetchDeptScopeOptions()])
      setRole(detail)
      setFunctions(list)
      setDeptNames(Object.fromEntries(depts.map((item) => [item.value, item.label])))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const fnOf = (menuId: string) => functions.find((item) => item.id === menuId)
  const parentNameOf = (menuId: string) => {
    const menu = functions.find((item) => item.id === menuId)
    if (!menu || !menu.parentId) return '一级菜单'
    return functions.find((item) => item.id === menu.parentId)?.name ?? '一级菜单'
  }

  const grantColumns: Column<Role['menuGrants'][number]>[] = useMemo(
    () => [
      {
        key: 'parent',
        title: '上级菜单',
        width: 150,
        render: (row) => <span className="nowrap">{parentNameOf(row.menuId)}</span>,
      },
      {
        key: 'name',
        title: '功能名称',
        width: 200,
        render: (row) => (
          <span>
            {fnOf(row.menuId)?.name ?? row.menuId}
            {fnOf(row.menuId)?.route && (
              <span className="role-fn-code mono" style={{ marginLeft: 8 }}>
                {fnOf(row.menuId)?.route}
              </span>
            )}
          </span>
        ),
      },
      {
        key: 'status',
        title: '状态',
        width: 90,
        render: (row) => <span className="nowrap">{fnOf(row.menuId)?.status === 'enabled' ? '启用' : '停用'}</span>,
      },
      { key: 'read', title: '读范围', width: 130, render: (row) => <span className="nowrap">{scopeTextOf(row, 'read')}</span> },
      { key: 'write', title: '写范围', width: 130, render: (row) => <span className="nowrap">{scopeTextOf(row, 'write')}</span> },
      {
        key: 'depts',
        title: '指定部门',
        width: 200,
        render: (row) => {
          const ids = row.scopeDeptIds ?? []
          if (ids.length === 0) return <span className="text-tertiary">—</span>
          return <span className="nowrap">{ids.map((item) => deptNames[item] ?? item).join('、')}</span>
        },
      },
    ],
    // fnOf / deptNames 随加载完成重算
    [functions, deptNames],
  )

  const memberColumns: Column<RoleMemberRef>[] = [
    { key: 'name', title: '成员', width: 130, render: (row) => <span className="nowrap">{row.name}</span> },
    { key: 'sub', title: '部门', width: 150, render: (row) => <span className="nowrap">{row.sub}</span> },
    {
      key: 'status',
      title: '成员状态',
      width: 110,
      render: (row) => (
        <Tag tone={row.status === 'active' ? 'success' : 'warning'}>{row.status === 'active' ? '生效' : '已停用'}</Tag>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      width: 110,
      render: (row) => (
        <button
          className="link link-danger"
          data-ann-target="role.detail.removeMember"
          onClick={() => setConfirm({ mode: 'remove-member', member: { id: row.id, name: row.name } })}
        >
          移除成员
        </button>
      ),
    },
  ]

  if (!role) {
    return (
      <>
        <PageHeader breadcrumb={['系统管理', '组织与权限', '角色管理']} title="角色详情" />
        <div className="card">
          <div className="empty">{loading ? '加载中…' : '角色不存在或已被删除'}</div>
        </div>
      </>
    )
  }

  // 租户端只展示本租户角色：平台角色与其他租户角色均不可见（§1.6 R4 / R6）
  if (role.scope !== 'tenant' || role.tenantId !== CURRENT_TENANT_ID) {
    return (
      <>
        <PageHeader breadcrumb={['系统管理', '组织与权限', '角色管理']} title="角色详情" />
        <div className="card">
          <div className="empty" data-ann-target="trole.boundary">
            该角色不属于本租户（{role.tenantName || '平台角色'}），租户端角色管理只展示本租户自建角色
          </div>
        </div>
      </>
    )
  }

  const action = roleActions[role.status]
  const activeCount = role.members.filter((item) => item.status === 'active').length
  const readOnly = role.builtin && !role.protectedRole

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '组织与权限', '角色管理', role.name]}
        title={
          <span data-ann-target="trole.detail.global">
            {role.name}（{role.code}）
          </span>
        }
        description={`${role.tenantName || CURRENT_TENANT} · 状态 ${roleStatusText[role.status]} · ${
          role.builtin ? (role.protectedRole ? '内置保护角色' : '内置角色') : '自定义角色'
        } · 功能菜单 ${role.menuGrants.length} 个 · 生效成员 ${activeCount} 个`}
        actions={
          <>
            <Button onClick={() => navigate('/system/tenant-role')}>返回列表</Button>
            <Button
              data-ann-target="trole.row.assign"
              onClick={() => setAssignOpen(true)}
              title={readOnly ? '内置角色只读，请走「复制」后调整' : '分配功能菜单与数据范围'}
            >
              授权
            </Button>
            <Button data-ann-target="role.row.copy" onClick={() => navigate(`/system/tenant-role?edit=copy:${role.id}`)}>
              复制
            </Button>
            {action.edit && !role.builtin && (
              <Button data-ann-target="role.row.edit" onClick={() => navigate(`/system/tenant-role?edit=${role.id}`)}>
                修改
              </Button>
            )}
            {action.disable && !role.protectedRole && (
              <Button data-ann-target="role.row.disable" onClick={() => setConfirm({ mode: 'disable' })}>
                停用
              </Button>
            )}
            {action.enable && (
              <Button data-ann-target="role.row.enable" onClick={() => setConfirm({ mode: 'enable' })}>
                启用
              </Button>
            )}
            {action.delete && !role.builtin && (
              <Button
                variant="primary"
                data-ann-target="role.row.delete"
                disabled={activeCount > 0}
                title={activeCount > 0 ? `该角色下仍有 ${activeCount} 个生效成员，请先移除成员` : '删除角色'}
                onClick={() => setConfirm({ mode: 'delete' })}
              >
                删除
              </Button>
            )}
          </>
        }
      />

      <div className="role-stack">
        <section className="card">
          <div className="role-section-header">
            <span className="role-section-title">角色信息</span>
            <span className="toolbar-tip">归属类型新建时固定为租户，不可改；租户角色只在租户内生效</span>
          </div>
          <div className="role-section-body">
            <div className="detail-list" data-ann-target="trole.detail.info">
              <div className="detail-item">
                <span className="detail-label">角色名称</span>
                <span className="detail-value">
                  {role.name}
                  {role.builtin && (
                    <span className="role-name-badges">
                      <span className={`role-name-badge${role.protectedRole ? ' protect' : ''}`}>
                        {role.protectedRole ? '保护角色' : '内置'}
                      </span>
                    </span>
                  )}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">角色标识</span>
                <span className="detail-value mono">{role.code}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">生效租户</span>
                <span className="detail-value">{role.tenantName || CURRENT_TENANT}</span>
              </div>
              <div className="detail-item" data-ann-target="role.detail.status">
                <span className="detail-label">角色状态</span>
                <span className="detail-value">
                  <Tag tone={roleStatusTone[role.status]}>{roleStatusText[role.status]}</Tag>
                </span>
              </div>
              <div className="detail-item full" data-ann-target="role.detail.description">
                <span className="detail-label">角色描述</span>
                <span className="detail-value">{role.description || '—'}</span>
              </div>
              <div className="detail-item" data-ann-target="trole.detail.meta">
                <span className="detail-label">创建人</span>
                <span className="detail-value">{role.createdBy}</span>
              </div>
              <div className="detail-item" data-ann-target="trole.detail.meta">
                <span className="detail-label">创建时间</span>
                <span className="detail-value">{role.createdAt}</span>
              </div>
              <div className="detail-item" data-ann-target="trole.detail.meta">
                <span className="detail-label">最近更新</span>
                <span className="detail-value">
                  {role.updatedBy} · {role.updatedAt}
                </span>
              </div>
            </div>
          </div>
          <div className="role-section-tip">
            租户管理员为租户内置保护角色：不可删除、不可停用，功能勾选与数据范围可由租户管理员收窄；其余内置角色只读，需「复制」后调整。
          </div>
        </section>

        <section className="card">
          <div className="role-section-header">
            <span className="role-section-title">功能菜单权限与数据范围</span>
            <span className="toolbar-tip">
              五档：{Object.values(dataScopeText).join(' / ')}；读写各配一档，写不宽于读
            </span>
          </div>
          <div className="role-section-body role-table-wrap" data-ann-target="trole.detail.functions">
            <Table columns={grantColumns} data={role.menuGrants} rowKey={(row) => row.menuId} loading={loading} />
          </div>
          <div className="role-section-tip">
            有效功能 = 已开通模块内功能点 ∩ 角色勾选功能点；多角色按功能点取并集，数据范围取最宽一档。系统管理类功能不适用数据范围。
          </div>
        </section>

        <section className="card">
          <div className="role-section-header">
            <span className="role-section-title">角色成员（{role.members.length}）</span>
            <span className="toolbar-tip">移除成员即收回该角色；指派入口在「成员管理」</span>
          </div>
          <div className="role-section-body role-table-wrap" data-ann-target="trole.detail.members">
            {role.members.length === 0 ? (
              <div className="empty">该角色暂无成员</div>
            ) : (
              <Table columns={memberColumns} data={role.members} rowKey={(row) => row.id} loading={loading} />
            )}
          </div>
          <div className="role-section-tip">租户成员持有角色 1 至 5 个，至少 1 个；移除后成员下次请求重算权限。</div>
        </section>
      </div>

      {/* 分配权限：功能菜单 + 数据范围（内置非保护角色只读） */}
      <TenantRoleAssignModal
        open={assignOpen}
        role={role}
        onClose={() => setAssignOpen(false)}
        onSaved={() => {
          setAssignOpen(false)
          void load()
        }}
      />

      <RoleConfirmModal
        open={!!confirm}
        role={role}
        mode={confirm?.mode ?? 'disable'}
        member={confirm?.member ?? null}
        onClose={() => setConfirm(null)}
        onDone={() => {
          setConfirm(null)
          void load()
        }}
      />
    </>
  )
}
