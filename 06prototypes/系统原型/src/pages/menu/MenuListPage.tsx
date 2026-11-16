import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Icon, Input, Modal, PageHeader, Select, Tag, useToast } from '@/shared/components'
import type { Column, SelectOption } from '@/shared/components'
import {
  deleteMenu,
  fetchMenus,
  updateMenuStatus,
} from '@/mock/menu'
import { fetchRolesByMenu } from '@/mock/role'
import type { EnableStatus, MenuFunction, Role } from '@/types'
import { menuStatusText, menuStatusTone } from './menuMeta'
import './MenuPage.css'

interface QueryState {
  keyword: string
  status: '' | EnableStatus
}

/** 树表行：菜单 + 层级深度 + 直接子级数 */
interface TreeRow {
  menu: MenuFunction
  depth: number
  childCount: number
}

const EMPTY_QUERY: QueryState = { keyword: '', status: '' }

/** 层级文案：一级功能 / 二级功能 / 三级功能 …… */
function levelText(depth: number): string {
  return ['一级功能', '二级功能', '三级功能', '四级功能', '五级功能'][depth] ?? `${depth + 1} 级功能`
}

/**
 * 菜单管理：树形配置界面。
 * 一级菜单为分组，下级菜单挂在分组之下；支持逐级展开 / 折叠、按层级缩进展示，
 * 并可在任意节点上直接「新增下级」。
 */
export default function MenuListPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [list, setList] = useState<MenuFunction[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState<QueryState>(EMPTY_QUERY)
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<MenuFunction | null>(null)
  const [statusTarget, setStatusTarget] = useState<MenuFunction | null>(null)
  const [references, setReferences] = useState<Role[]>([])
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const menus = await fetchMenus()
      setList(menus)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  /** 父子关系索引：parentId → 同级菜单（按排序号） */
  const childrenMap = useMemo(() => {
    const map = new Map<string | null, MenuFunction[]>()
    list.forEach((menu) => {
      const arr = map.get(menu.parentId) ?? []
      arr.push(menu)
      map.set(menu.parentId, arr)
    })
    map.forEach((arr) => arr.sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name)))
    return map
  }, [list])

  // 查询条件变化时自动展开全部命中分支
  useEffect(() => {
    setCollapsedIds(new Set())
  }, [query])

  const rows = useMemo<TreeRow[]>(() => {
    const keyword = query.keyword.trim().toLowerCase()
    const filtered = !!keyword || !!query.status
    const keep = new Set<string>()

    if (!filtered) {
      list.forEach((menu) => keep.add(menu.id))
    } else {
      // 命中节点 + 其全部祖先都保留，保证树形结构不被打散
      const byId = new Map(list.map((menu) => [menu.id, menu] as const))
      list
        .filter(
          (menu) =>
            (!keyword || menu.name.toLowerCase().includes(keyword) || menu.route.toLowerCase().includes(keyword)) &&
            (!query.status || menu.status === query.status),
        )
        .forEach((menu) => {
          let cursor: string | null = menu.id
          while (cursor) {
            keep.add(cursor)
            cursor = byId.get(cursor)?.parentId ?? null
          }
        })
    }

    const out: TreeRow[] = []
    const walk = (parentId: string | null, depth: number) => {
      ;(childrenMap.get(parentId) ?? []).forEach((menu) => {
        if (!keep.has(menu.id)) return
        const children = childrenMap.get(menu.id) ?? []
        out.push({ menu, depth, childCount: children.length })
        if (!collapsedIds.has(menu.id)) walk(menu.id, depth + 1)
      })
    }
    walk(null, 0)
    return out
  }, [list, childrenMap, query, collapsedIds])

  const groupIds = useMemo(
    () => list.filter((menu) => (childrenMap.get(menu.id) ?? []).length > 0).map((menu) => menu.id),
    [list, childrenMap],
  )

  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const statusOptions: SelectOption[] = [
    { label: '启用', value: 'enabled' },
    { label: '停用', value: 'disabled' },
  ]

  const columns: Column<TreeRow>[] = [
    {
      key: 'name',
      title: '功能名称',
      render: ({ menu, depth, childCount }) => {
        const expanded = !collapsedIds.has(menu.id)
        const isGroup = childCount > 0 || !menu.route
        return (
          <span className="menu-tree-name" style={{ paddingLeft: depth * 22 }}>
            <button
              type="button"
              className={[
                'menu-tree-caret',
                expanded ? 'expanded' : '',
                childCount > 0 ? '' : 'leaf',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-label={expanded ? '折叠' : '展开'}
              onClick={() => {
                if (childCount > 0) toggleCollapse(menu.id)
              }}
            >
              <Icon name="chevronRight" size={14} />
            </button>
            {isGroup ? (
              <span className="menu-tree-group-icon">
                <Icon name="layers" size={14} />
              </span>
            ) : (
              <span className="menu-tree-leaf-icon">
                <Icon name="file" size={14} />
              </span>
            )}
            <span className={['menu-tree-label', isGroup ? 'is-group' : ''].filter(Boolean).join(' ')}>
              {menu.name}
            </span>
            {childCount > 0 && <span className="menu-tree-badge">分组 · {childCount}</span>}
          </span>
        )
      },
    },
    {
      key: 'level',
      title: <span data-ann-target="menu.col.level">层级</span>,
      width: 100,
      render: ({ depth, childCount }) => (
        <span className={childCount > 0 ? 'menu-tree-level is-group' : 'menu-tree-level'}>
          {levelText(depth)}
        </span>
      ),
    },
    {
      key: 'route',
      title: '路由',
      width: 240,
      render: ({ menu }) => <span className="mono nowrap">{menu.route || '—'}</span>,
    },
    {
      key: 'sort',
      title: '排序',
      width: 90,
      render: ({ menu }) => <span>{menu.sort}</span>,
    },
    {
      key: 'status',
      title: <span data-ann-target="menu.col.status">状态</span>,
      width: 100,
      render: ({ menu }) => <Tag tone={menuStatusTone[menu.status]}>{menuStatusText[menu.status]}</Tag>,
    },
    {
      key: 'actions',
      title: '操作',
      width: 240,
      render: ({ menu, childCount }) => (
        <span className="row-actions">
          <button
            className="link"
            data-ann-target="menu.row.edit"
            onClick={() => navigate(`/system/menu/${menu.id}/edit`)}
          >
            编辑
          </button>
          <button
            className="link"
            data-ann-target="menu.row.addChild"
            onClick={() => navigate(`/system/menu/new?parentId=${menu.id}`)}
          >
            新增下级
          </button>
          <button className="link" data-ann-target="menu.row.status" onClick={() => setStatusTarget(menu)}>
            {menu.status === 'enabled' ? '停用' : '启用'}
          </button>
          {childCount > 0 ? (
            <span className="link link-disabled" title="请先删除或移出其下级菜单">
              删除
            </span>
          ) : (
            <button className="link link-danger" data-ann-target="menu.row.delete" onClick={() => setDeleteTarget(menu)}>
              删除
            </button>
          )}
        </span>
      ),
    },
  ]

  const handleStatus = async () => {
    if (!statusTarget) return
    const next: EnableStatus = statusTarget.status === 'enabled' ? 'disabled' : 'enabled'
    try {
      await updateMenuStatus(statusTarget.id, next)
      toast(next === 'enabled' ? '已启用' : '已停用')
      setStatusTarget(null)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSubmitting(true)
    try {
      await deleteMenu(deleteTarget.id)
      toast('删除成功')
      setDeleteTarget(null)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // 停用 / 删除前提示被引用角色
  useEffect(() => {
    const target = statusTarget ?? deleteTarget
    if (!target) {
      setReferences([])
      return
    }
    let alive = true
    void fetchRolesByMenu(target.id).then((roles) => {
      if (alive) setReferences(roles)
    })
    return () => {
      alive = false
    }
  }, [statusTarget, deleteTarget])

  const enabledCount = list.filter((item) => item.status === 'enabled').length

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '组织与权限', '菜单管理']}
        title={<span data-ann-target="menu.page.global">菜单管理</span>}
        description="以树形结构维护全站功能 / 菜单：一级功能（业务域）→ 二级功能（功能分组）→ 三级 / 末级功能（可进入页面），按层级缩进展示；配置功能名称、路由、排序与启停。角色的功能菜单权限（平台角色管理 / 租户端角色管理）均从此树勾选，两侧各取所需、互不影响。"
        actions={
          <Button variant="primary" data-ann-target="menu.add.top" onClick={() => navigate('/system/menu/new')}>
            新增一级菜单
          </Button>
        }
      />

      <div className="card">
        <div className="query-bar" data-ann-target="menu.query.bar">
          <div className="query-item">
            <span className="query-label">功能名称 / 路由</span>
            <Input
              value={query.keyword}
              placeholder="请输入"
              onChange={(e) => setQuery((prev) => ({ ...prev, keyword: e.target.value }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">状态</span>
            <Select
              value={query.status}
              placeholder="全部"
              options={statusOptions}
              onChange={(e) => setQuery((prev) => ({ ...prev, status: e.target.value as '' | EnableStatus }))}
            />
          </div>
          <div className="query-actions">
            <Button onClick={() => setQuery(EMPTY_QUERY)}>重置</Button>
            <Button variant="primary" onClick={() => toast('查询完成')}>
              搜索
            </Button>
          </div>
        </div>

        <div className="toolbar" data-ann-target="menu.toolbar">
          <div className="flex gap-sm">
            <span className="toolbar-title">菜单目录</span>
            <span className="toolbar-tip">
              共 {list.length} 项 · 启用 {enabledCount} 项 · 当前展示 {rows.length} 项
            </span>
          </div>
          <div className="flex gap-sm">
            <Button size="small" onClick={() => setCollapsedIds(new Set())}>
              全部展开
            </Button>
            <Button size="small" onClick={() => setCollapsedIds(new Set(groupIds))}>
              全部折叠
            </Button>
          </div>
        </div>

        <div className="menu-tree-wrap" data-ann-target="menu.page.list">
          <table className="data-table menu-tree-table">
            <colgroup>
              {columns.map((col) => (
                <col key={col.key} style={col.width ? { width: col.width } : undefined} />
              ))}
            </colgroup>
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key}>{col.title}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="cell-empty" colSpan={columns.length}>
                    加载中…
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td className="cell-empty" colSpan={columns.length}>
                    暂无菜单
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((row) => (
                  <tr key={row.menu.id} className={row.childCount > 0 ? 'menu-tree-row is-group' : 'menu-tree-row'}>
                    {columns.map((col) => (
                      <td key={col.key}>{col.render ? col.render(row, 0) : null}</td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={!!deleteTarget}
        title="删除菜单"
        onClose={() => setDeleteTarget(null)}
        footer={
          <>
            <Button onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="primary" disabled={submitting} data-ann-target="menu.confirm.delete" onClick={() => void handleDelete()}>
              确认删除
            </Button>
          </>
        }
      >
        <p>
          确认删除菜单「{deleteTarget?.name}」？删除后该菜单从目录移除，引用它的角色授权关系将在下次保存时清理。
        </p>
        {references.length > 0 && (
          <div className="fn-impact">
            <div>
              <div className="fn-impact-title">⚠ 仍有 {references.length} 个启用角色引用该菜单</div>
              <ul className="fn-impact-list">
                {references.map((role) => (
                  <li key={role.id}>
                    {role.name}（{role.scope === 'platform' ? '平台' : '租户'}）
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!statusTarget}
        title={statusTarget?.status === 'enabled' ? '停用菜单' : '启用菜单'}
        onClose={() => setStatusTarget(null)}
        footer={
          <>
            <Button onClick={() => setStatusTarget(null)}>取消</Button>
            <Button variant="primary" data-ann-target="menu.confirm.status" onClick={() => void handleStatus()}>
              确认
            </Button>
          </>
        }
      >
        <p>
          {statusTarget?.status === 'enabled'
            ? `确认停用菜单「${statusTarget?.name}」？停用后该菜单不渲染、不出现在角色勾选树中。`
            : `确认启用菜单「${statusTarget?.name}」？`}
        </p>
        {statusTarget?.status === 'enabled' && references.length > 0 && (
          <div className="fn-impact">
            <div>
              <div className="fn-impact-title">⚠ 仍有 {references.length} 个启用角色引用该菜单</div>
              <ul className="fn-impact-list">
                {references.map((role) => (
                  <li key={role.id}>
                    {role.name}（{role.scope === 'platform' ? '平台' : '租户'}）
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
