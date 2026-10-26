import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, PageHeader, Table, Tag } from '@/shared/components'
import type { Column } from '@/shared/components'
import { fetchMenus } from '@/mock/menu'
import { fetchRole } from '@/mock/role'
import type { MenuFunction, Role, RoleMemberRef } from '@/types'
import { roleActions, roleScopeText, roleStatusText, roleStatusTone } from './roleMeta'
import RoleConfirmModal from './RoleConfirmModal'
import type { RoleConfirmMode } from './RoleConfirmModal'
import './RolePage.css'

/** 平台角色详情：角色信息 + 功能菜单 + 成员（查看 / 移除）。只展示归属类型为平台的角色 */
export default function RoleDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [role, setRole] = useState<Role | null>(null)
  const [functions, setFunctions] = useState<MenuFunction[]>([])
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState<{ mode: RoleConfirmMode; member?: { id: string; name: string } } | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [detail, list] = await Promise.all([fetchRole(id), fetchMenus()])
      setRole(detail)
      setFunctions(list)
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
        width: 160,
        render: (row) => <span className="nowrap">{parentNameOf(row.menuId)}</span>,
      },
      {
        key: 'name',
        title: '功能名称',
        width: 220,
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
        width: 110,
        render: (row) => <span className="nowrap">{fnOf(row.menuId)?.status === 'enabled' ? '启用' : '停用'}</span>,
      },
    ],
    // fnOf 依赖 functions，随加载完成重算
    [functions],
  )

  const memberColumns: Column<RoleMemberRef>[] = [
    { key: 'name', title: '成员', width: 140, render: (row) => <span className="nowrap">{row.name}</span> },
    {
      key: 'sub',
      title: role?.scope === 'platform' ? '登录名' : '部门',
      width: 160,
      render: (row) => <span className="nowrap mono">{row.sub}</span>,
    },
    {
      key: 'status',
      title: '成员状态',
      width: 110,
      render: (row) => <Tag tone={row.status === 'active' ? 'success' : 'warning'}>{row.status === 'active' ? '生效' : '已停用'}</Tag>,
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
        <PageHeader breadcrumb={['系统管理', '组织与权限', '平台角色管理']} title="角色详情" />
        <div className="card">
          <div className="empty">{loading ? '加载中…' : '角色不存在或已被删除'}</div>
        </div>
      </>
    )
  }

  // 平台侧只展示平台角色：租户角色由租户自建自管、只在租户内生效，不在此展示
  if (role.scope !== 'platform') {
    return (
      <>
        <PageHeader breadcrumb={['系统管理', '组织与权限', '平台角色管理']} title="角色详情" />
        <div className="card">
          <div className="empty" data-ann-target="role.boundary.platform">
            该角色为租户角色（{role.tenantName || '—'}），由租户自建自管，不在平台角色管理中展示
          </div>
        </div>
      </>
    )
  }

  const action = roleActions[role.status]
  const activeCount = role.members.filter((item) => item.status === 'active').length

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '组织与权限', '平台角色管理', role.name]}
        title={
          <span data-ann-target="role.detail.global">
            {role.name}（{role.code}）
          </span>
        }
        description={`${roleScopeText[role.scope]}角色 · 状态 ${roleStatusText[role.status]} · ${role.builtin ? '内置角色' : '自定义角色'} · 功能菜单 ${role.menuGrants.length} 个 · 生效成员 ${activeCount} 个`}
        actions={
          <>
            <Button onClick={() => navigate('/system/role')}>返回列表</Button>
            <Button data-ann-target="role.row.assign" onClick={() => navigate(`/system/role?assign=${role.id}`)}>
              授权
            </Button>
            {action.copy && (
              <Button data-ann-target="role.row.copy" onClick={() => navigate(`/system/role?edit=copy:${role.id}`)}>
                复制
              </Button>
            )}
            {action.edit && !role.builtin && (
              <Button data-ann-target="role.row.edit" onClick={() => navigate(`/system/role?edit=${role.id}`)}>
                修改
              </Button>
            )}
            {action.disable && !role.superAdmin && !role.protectedRole && (
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
            <span className="toolbar-tip">归属类型新建时固定，不可改</span>
          </div>
          <div className="role-section-body">
            <div className="detail-list" data-ann-target="role.detail.info">
              <div className="detail-item">
                <span className="detail-label">角色名称</span>
                <span className="detail-value">
                  {role.name}
                  {role.builtin && (
                    <span className="role-name-badges">
                      <span className={`role-name-badge${role.superAdmin ? ' protect' : ''}`}>
                        {role.superAdmin ? '保护角色' : '内置'}
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
                <span className="detail-label">归属类型</span>
                <span className="detail-value">{roleScopeText[role.scope]}</span>
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
              <div className="detail-item" data-ann-target="role.detail.meta">
                <span className="detail-label">创建人</span>
                <span className="detail-value">{role.createdBy}</span>
              </div>
              <div className="detail-item" data-ann-target="role.detail.meta">
                <span className="detail-label">创建时间</span>
                <span className="detail-value">{role.createdAt}</span>
              </div>
              <div className="detail-item" data-ann-target="role.detail.meta">
                <span className="detail-label">最近更新</span>
                <span className="detail-value">
                  {role.updatedBy} · {role.updatedAt}
                </span>
              </div>
            </div>
          </div>
          <div className="role-section-tip">
            {role.scope === 'platform'
              ? '平台角色挂平台账号；与租户角色互不引用。'
              : '租户角色属租户数据，不跨租户复用；超管默认不可见不可改，进入租户时只读。'}
          </div>
        </section>

        <section className="card">
          <div className="role-section-header">
            <span className="role-section-title">功能菜单权限</span>
            <span className="toolbar-tip">角色管理只配功能菜单，不配数据范围</span>
          </div>
          <div className="role-section-body role-table-wrap" data-ann-target="role.detail.functions">
            <Table columns={grantColumns} data={role.menuGrants} rowKey={(row) => row.menuId} loading={loading} />
          </div>
          <div className="role-section-tip">
            有效功能 = 角色勾选功能点；功能由代码注册、发布同步，后台不可新增。
          </div>
        </section>

        <section className="card">
          <div className="role-section-header">
            <span className="role-section-title">
              角色成员（{role.scope === 'platform' ? '平台账号' : '租户成员'}）
            </span>
            <span className="toolbar-tip">移除成员即收回该角色；指派入口在{role.scope === 'platform' ? '平台账号' : '成员管理'}</span>
          </div>
          <div className="role-section-body role-table-wrap" data-ann-target="role.detail.members">
            {role.members.length === 0 ? (
              <div className="empty">该角色暂无成员</div>
            ) : (
              <Table columns={memberColumns} data={role.members} rowKey={(row) => row.id} loading={loading} />
            )}
          </div>
          <div className="role-section-tip">
            {role.scope === 'platform'
              ? '平台账号持有平台角色 1 至 5 个；不可移除最后一个超管的超级管理员角色。'
              : '租户成员持有角色 1 至 5 个，至少 1 个；移除后成员下次请求重算权限。'}
          </div>
        </section>
      </div>

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
