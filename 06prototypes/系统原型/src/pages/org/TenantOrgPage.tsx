import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Button, FormField, Icon, Modal, PageHeader, Select, Table, Tag, Tree, useToast } from '@/shared/components'
import type { Column, SelectOption, TreeNodeData } from '@/shared/components'
import { CURRENT_TENANT_ID, fetchMemberDetail } from '@/mock/member'
import {
  ORG_MAX_LEVEL,
  deleteOrgNode,
  ensureTenantRootOrg,
  fetchOrgNodes,
  moveOrgNode,
  orgSubtreeCount,
  orgTypesOf,
} from '@/mock/org'
import { deptMemberCount, fetchTenant, fetchTenantMembers } from '@/mock/tenant'
import { TENANT_ADMIN_ROLE_NAME } from '@/mock/role'
import type { MemberDetail, OrgNode, Tenant, TenantMemberItem } from '@/types'
import { memberStatusText, memberStatusTone, tenantStatusText, tenantStatusTone } from '../tenant/tenantMeta'
import OrgNodeModal from './OrgNodeModal'
import MemberFormModal, { type MemberFormMode } from '@/pages/member/MemberFormModal'
import MemberStatusModal from '@/pages/member/MemberStatusModal'
import './OrgPage.css'

/** 下拉菜单项 */
interface OrgMenuItem {
  key: string
  label: ReactNode
  onClick: () => void
  disabled?: boolean
  title?: string
  danger?: boolean
  /** 批注锚点（保留原按钮的锚点，供批注层定位） */
  annTarget?: string
}

/**
 * 轻量下拉菜单：菜单面板 Portal 到 body 并用 fixed 定位，
 * 避免被 `overflow: hidden / overflow-y: auto` 的树容器裁剪。
 * 悬浮在树节点上的「+」与右栏「··· 更多操作」共用。
 */
function OrgMenu({
  trigger,
  items,
  minWidth = 168,
}: {
  trigger: (state: { open: boolean; toggle: (e: ReactMouseEvent<HTMLButtonElement>) => void }) => ReactNode
  items: OrgMenuItem[]
  minWidth?: number
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!pos) return
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      // 触发按钮自身不算「外部点击」：否则先关后开会导致二次点击无法收起
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      setPos(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPos(null)
    }
    const onScroll = () => setPos(null)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [pos])

  const toggle = (e: ReactMouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    if (pos) {
      setPos(null)
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    setPos({ top: rect.bottom + 4, left: Math.max(8, rect.right - minWidth) })
  }

  return (
    <>
      <span className="org-menu-trigger" ref={triggerRef}>{trigger({ open: !!pos, toggle })}</span>
      {pos &&
        createPortal(
          <div ref={menuRef} className="org-menu-panel" style={{ top: pos.top, left: pos.left, minWidth }}>
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                className={['org-menu-item', item.danger ? 'is-danger' : ''].filter(Boolean).join(' ')}
                disabled={item.disabled}
                title={item.title}
                {...(item.annTarget ? { 'data-ann-target': item.annTarget } : {})}
                onClick={() => {
                  setPos(null)
                  item.onClick()
                }}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  )
}

interface TenantOrgPageProps {
  /** 目标租户：缺省为当前登录租户；平台后台从租户列表进入时传入目标租户 id */
  tenantId?: string
  /** 内嵌到租户详情页时隐藏自身页头（由外层提供面包屑与返回入口） */
  embedded?: boolean
}

/**
 * 组织架构（组织架构 PRD §4.1）：
 * 维护租户组织树与组织类型，左侧树 + 右侧节点信息 / 成员，支持新增下级、编辑、移动、删除与成员维护。
 * 两种用法：
 * 1. 租户端「系统管理 → 组织架构」：`<TenantOrgPage />`，自带页头；
 * 2. 平台后台租户列表「组织架构」：`<TenantOrgPage tenantId={id} embedded />`，编辑能力完全一致。
 */
export default function TenantOrgPage({ tenantId = CURRENT_TENANT_ID, embedded = false }: TenantOrgPageProps = {}) {
  const navigate = useNavigate()
  const toast = useToast()

  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [nodes, setNodes] = useState<OrgNode[]>([])
  const [members, setMembers] = useState<TenantMemberItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState('')

  const [nodeModal, setNodeModal] = useState<{ parent: OrgNode | null; node: OrgNode | null } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<OrgNode | null>(null)
  const [moveTarget, setMoveTarget] = useState<OrgNode | null>(null)
  const [moveParentId, setMoveParentId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  /** 直属成员查看范围：直属 / 含下级 */
  const [memberScope, setMemberScope] = useState<'direct' | 'subtree'>('direct')
  /** 顶部软引导：树只有根组织时提示建部门层级（可关闭） */
  const [showOrgTip, setShowOrgTip] = useState(true)
  /** 左树搜索关键词：部门名称 / 成员姓名（含手机号、账号）模糊匹配 */
  const [treeKeyword, setTreeKeyword] = useState('')
  /** 搜索态下用户手动展开/收起的节点；null = 跟随搜索结果自动展开 */
  const [searchExpanded, setSearchExpanded] = useState<string[] | null>(null)
  /** 「更多详情」折叠面板（系统字段默认不展示） */
  const [moreDetailOpen, setMoreDetailOpen] = useState(false)
  /** 新建成员时预置的所属组织节点（从哪个节点点新增就带入哪个节点） */
  const [createMemberDeptId, setCreateMemberDeptId] = useState('')

  /** 直属成员区块复用的成员侧弹窗 */
  const [memberFormOpen, setMemberFormOpen] = useState(false)
  const [memberFormMode, setMemberFormMode] = useState<MemberFormMode>('edit')
  const [editingMember, setEditingMember] = useState<TenantMemberItem | null>(null)
  /** 成员停用 / 启用 / 移出（三态确认弹窗，复用成员模块） */
  const [statusTarget, setStatusTarget] = useState<{
    member: MemberDetail
    mode: 'disable' | 'enable' | 'remove'
  } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [detail, memberList] = await Promise.all([
        fetchTenant(tenantId),
        fetchTenantMembers(tenantId),
      ])
      // 根组织兜底：租户必有一个系统自动创建的根组织（名称 = 租户名称）
      await ensureTenantRootOrg(detail.id, detail.name, detail.type)
      const nodeList = await fetchOrgNodes(tenantId)
      setTenant(detail)
      setNodes(nodeList)
      setMembers(memberList)
      setSelectedId((prev) =>
        nodeList.some((item) => item.id === prev)
          ? prev
          : (nodeList.find((item) => item.isRoot)?.id ?? nodeList[0]?.id ?? ''),
      )
    } catch {
      setTenant(null)
      setNodes([])
      setMembers([])
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    void load()
  }, [load])

  /** 各节点直属成员数（按节点 id 关联，组织改名不失效） */
  const directCounts = useMemo(() => {
    return members.reduce<Record<string, number>>((acc, item) => {
      if (!item.deptId) return acc
      acc[item.deptId] = (acc[item.deptId] ?? 0) + 1
      return acc
    }, {})
  }, [members])

  /** 各节点含下级成员数（含自身子树，按 path 前缀匹配） */
  const nodeById = useMemo(() => new Map(nodes.map((item) => [item.id, item])), [nodes])
  const subtreeCounts = useMemo(() => {
    const acc: Record<string, number> = {}
    members.forEach((item) => {
      if (!item.deptId) return
      const memberNode = nodeById.get(item.deptId)
      if (!memberNode) return
      nodes.forEach((node) => {
        if (memberNode.path.startsWith(node.path)) acc[node.id] = (acc[node.id] ?? 0) + 1
      })
    })
    return acc
  }, [members, nodes, nodeById])

  /**
   * 左树：仅保留部门名称，冗长的类型 / 人数后缀全部收进 Hover Tooltip 气泡。
   * 根节点的标识同样放进气泡，不再往名称后拼文字。
   */
  const treeData = useMemo<TreeNodeData[]>(() => {
    const childrenMap = new Map<string | null, OrgNode[]>()
    nodes.forEach((item) => {
      const arr = childrenMap.get(item.parentId) ?? []
      arr.push(item)
      childrenMap.set(item.parentId, arr)
    })
    childrenMap.forEach((arr) => arr.sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name)))

    const build = (parentId: string | null): TreeNodeData[] =>
      (childrenMap.get(parentId) ?? []).map((item) => {
        const children = build(item.id)
        const direct = directCounts[item.id] ?? 0
        const subtree = subtreeCounts[item.id] ?? 0
        return {
          id: item.id,
          name: item.name,
          tooltip: (
            <span className="org-tree-tip">
              <strong className="org-tree-tip-title">{item.name}</strong>
              <span>直属 {direct} 人 · 含下级 {subtree} 人</span>
              {item.isRoot ? <span>租户根组织</span> : null}
            </span>
          ),
          children: children.length > 0 ? children : undefined,
        }
      })
    return build(null)
  }, [nodes, directCounts, subtreeCounts])

  const expandedIds = useMemo(() => nodes.map((item) => item.id), [nodes])

  /** 搜索关键词（大小写不敏感） */
  const keyword = treeKeyword.trim().toLowerCase()

  /** 命中节点：部门名称命中，或该节点下存在姓名 / 手机号 / 账号命中的成员 */
  const matchedIds = useMemo(() => {
    const ids = new Set<string>()
    if (!keyword) return ids
    nodes.forEach((item) => {
      if (item.name.toLowerCase().includes(keyword)) ids.add(item.id)
    })
    members.forEach((item) => {
      if (!item.deptId || !nodeById.has(item.deptId)) return
      const hit =
        item.name.toLowerCase().includes(keyword) ||
        item.mobile.includes(keyword) ||
        item.loginName.toLowerCase().includes(keyword)
      if (hit) ids.add(item.deptId)
    })
    return ids
  }, [keyword, nodes, members, nodeById])

  /** 命中节点 + 其完整祖先链 = 搜索结果可见节点 */
  const visibleIds = useMemo(() => {
    const ids = new Set<string>()
    if (!keyword) return ids
    matchedIds.forEach((id) => {
      let cursor = nodeById.get(id)
      while (cursor) {
        ids.add(cursor.id)
        cursor = cursor.parentId ? nodeById.get(cursor.parentId) : undefined
      }
    })
    return ids
  }, [keyword, matchedIds, nodeById])

  /** 搜索结果树：只保留可见节点，并自动展开其祖先链 */
  const filteredTreeData = useMemo(() => {
    if (!keyword) return treeData
    const prune = (list: TreeNodeData[]): TreeNodeData[] =>
      list.flatMap((node) => {
        if (!visibleIds.has(node.id)) return []
        const children = node.children ? prune(node.children) : []
        return [{ ...node, children: children.length > 0 ? children : undefined }]
      })
    return prune(treeData)
  }, [keyword, treeData, visibleIds])

  const searchExpandedIds = useMemo(() => Array.from(visibleIds), [visibleIds])
  const effectiveExpandedIds = keyword ? (searchExpanded ?? searchExpandedIds) : undefined

  // 关键词变化时清除手动展开态，重新按搜索结果自动展开
  useEffect(() => {
    setSearchExpanded(null)
  }, [treeKeyword])

  /** 租户根组织（系统自动创建，名称 = 租户名称；不可删除、不可移动，名称可改） */
  const rootNode = nodes.find((item) => item.isRoot) ?? null
  const selected = nodes.find((item) => item.id === selectedId) ?? null
  const selectedChildren = selected ? nodes.filter((item) => item.parentId === selected.id) : []
  const selectedMembers = useMemo(() => {
    if (!selected) return []
    if (memberScope === 'direct') return members.filter((item) => item.deptId === selected.id)
    return members.filter((item) => {
      if (!item.deptId) return false
      const memberNode = nodeById.get(item.deptId)
      return memberNode ? memberNode.path.startsWith(selected.path) : false
    })
  }, [members, selected, memberScope, nodeById])
  const selectedParent = selected?.parentId ? (nodes.find((item) => item.id === selected.parentId) ?? null) : null
  const siblingCount = selected ? nodes.filter((item) => item.parentId === selected.parentId).length : 0

  /** 在任管理员数（租户管理员角色且成员正常），用于唯一管理员保护（与成员管理、后端 E07 同口径） */
  const enabledAdminCount = useMemo(
    () => members.filter((item) => item.status === 'enabled' && item.roleNames.includes(TENANT_ADMIN_ROLE_NAME)).length,
    [members],
  )

  const typeOptions = useMemo(
    () => (tenant ? orgTypesOf(tenant.id, tenant.type) : ['部门']),
    [tenant, nodes],
  )

  /** 新增下级：租户内只有一个根组织，新增组织一律挂在选中节点下（默认根组织） */
  const openAdd = (parent: OrgNode) => setNodeModal({ parent, node: null })

  /** 新增成员：从哪个组织节点点击，就把该节点带入弹窗的「所属组织」（可编辑） */
  const openCreateMember = (deptId: string) => {
    setEditingMember(null)
    setMemberFormMode('create')
    setCreateMemberDeptId(deptId)
    setMemberFormOpen(true)
  }

  /** 左树节点悬浮快捷操作：一个「+」下拉，含新增下级部门 / 新增成员 */
  const renderTreeActions = (node: TreeNodeData) => {
    const target = nodeById.get(node.id)
    if (!target) return null
    const childDisabled = target.level >= ORG_MAX_LEVEL
    return (
      <OrgMenu
        minWidth={150}
        trigger={({ open, toggle }) => (
          <button
            type="button"
            className={['tree-actions-btn', open ? 'is-open' : ''].filter(Boolean).join(' ')}
            title="快捷新增下级部门 / 成员"
            aria-label="快捷新增"
            onClick={toggle}
          >
            <Icon name="plus" size={14} />
          </button>
        )}
        items={[
          {
            key: 'child',
            label: '新增下级部门',
            annTarget: 'org.btn.add',
            disabled: childDisabled,
            title: childDisabled ? `已达 ${ORG_MAX_LEVEL} 层上限` : '',
            onClick: () => openAdd(target),
          },
          {
            key: 'member',
            label: '新增成员',
            annTarget: 'org.btn.addMember',
            onClick: () => openCreateMember(target.id),
          },
        ]}
      />
    )
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSubmitting(true)
    try {
      await deleteOrgNode(deleteTarget.id)
      toast('节点已删除')
      setDeleteTarget(null)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const openMove = (node: OrgNode) => {
    setMoveTarget(node)
    setMoveParentId(node.parentId ?? '')
  }

  /** 从组织树「直属成员」打开成员编辑弹窗（复用成员模块表单，仅开放「所属组织 + 角色」两项） */
  const openMemberEdit = (row: TenantMemberItem) => {
    setEditingMember(row)
    setMemberFormMode('edit')
    setCreateMemberDeptId('')
    setMemberFormOpen(true)
  }

  /** 停用（离岗）/ 启用（复岗）/ 移出（离职）：先取成员详情，弹窗需 primaryAdmin、self 等派生标记 */
  const openMemberStatus = async (row: TenantMemberItem, mode: 'disable' | 'enable' | 'remove') => {
    try {
      setStatusTarget({ member: await fetchMemberDetail(tenantId, row.id), mode })
    } catch (error) {
      toast(error instanceof Error ? error.message : '加载失败', 'error')
    }
  }

  /** 可移动目标：排除自身与自身子孙；租户内只有一个根组织，故无「作为根节点」选项 */
  const moveOptions: SelectOption[] = useMemo(() => {
    if (!moveTarget) return []
    const blocked = new Set(
      nodes.filter((item) => item.path.startsWith(moveTarget.path)).map((item) => item.id),
    )
    return nodes
      .filter((item) => !blocked.has(item.id) && !item.isRoot)
      .map((item) => ({ label: `${'　'.repeat(item.level - 1)}${item.name}`, value: item.id }))
  }, [moveTarget, nodes])

  const handleMove = async () => {
    if (!moveTarget) return
    setSubmitting(true)
    try {
      await moveOrgNode(moveTarget.id, moveParentId || null)
      toast('节点已移动，层级与路径已重算')
      setMoveTarget(null)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '移动失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (!tenant) {
    return (
      <>
        {!embedded && <PageHeader breadcrumb={['系统管理', '组织与权限', '组织架构']} title="组织架构" />}
        <div className="card">
          <div className="empty">{loading ? '加载中…' : '当前租户不存在或已被删除'}</div>
        </div>
      </>
    )
  }

  const memberColumns: Column<TenantMemberItem>[] = [
    { key: 'name', title: '姓名', width: 100, render: (row) => <span className="nowrap">{row.name}</span> },
    { key: 'mobile', title: '手机号', width: 130, render: (row) => <span className="nowrap">{row.mobile}</span> },
    {
      key: 'roleNames',
      title: '角色',
      render: (row) => (
        <span className="org-role-tags">
          {row.roleNames.map((role) => (
            <Tag key={role}>{role}</Tag>
          ))}
        </span>
      ),
    },
    {
      key: 'status',
      title: '成员状态',
      width: 100,
      render: (row) => <Tag tone={memberStatusTone[row.status]}>{memberStatusText[row.status]}</Tag>,
    },
    {
      key: 'actions',
      title: '操作',
      width: 180,
      render: (row) => {
        // 已移出为终态：不再提供任何操作
        if (row.status === 'removed') return <span className="text-tertiary">—</span>
        // 主管理员由平台在租户管理中维护：操作按钮照常展示，但停用 / 移出置灰不可点
        const isPrimary = !!tenant.adminAccountId && tenant.adminAccountId === row.accountId
        // 唯一管理员保护：本租户仅剩 1 名在任管理员时禁止停用（防止无人可管理）
        const isSoleAdmin =
          row.status === 'enabled' && row.roleNames.includes(TENANT_ADMIN_ROLE_NAME) && enabledAdminCount <= 1
        return (
          <span className="row-actions">
            <button type="button" className="link" onClick={() => openMemberEdit(row)}>
              编辑
            </button>
            {row.status === 'enabled' && (
              <button
                type="button"
                className="link"
                disabled={isPrimary || isSoleAdmin}
                title={
                  isPrimary
                    ? '主管理员不可停用，须先在租户管理中更换主管理员'
                    : isSoleAdmin
                      ? '当前租户仅剩该名管理员，停用后无人可管理租户，请先添加其他管理员'
                      : ''
                }
                onClick={() => void openMemberStatus(row, 'disable')}
              >
                停用
              </button>
            )}
            {row.status === 'disabled' && (
              <button type="button" className="link" onClick={() => void openMemberStatus(row, 'enable')}>
                启用
              </button>
            )}
            <button
              type="button"
              className="link link-danger"
              disabled={isPrimary}
              title={isPrimary ? '主管理员不可移出，须先在租户管理中更换主管理员' : ''}
              onClick={() => void openMemberStatus(row, 'remove')}
            >
              移出
            </button>
          </span>
        )
      },
    },
  ]

  const canAddChild = !!selected && selected.level < ORG_MAX_LEVEL
  const deleteBlockedReason = !selected
    ? ''
    : selected.isRoot
      ? '根组织由系统自动创建，不可删除；可修改组织名称'
      : selectedChildren.length > 0
        ? '该节点下仍有下级节点，请先处理下级'
        : makeDeleteMemberTip(tenant.id, selected)
  return (
    <>
      {!embedded && (
        <PageHeader
          breadcrumb={['系统管理', '组织与权限', '组织架构', tenant.name]}
          title={<span data-ann-target="org.page.global">组织架构</span>}
          actions={
            <>
              <Button onClick={() => navigate('/system/member')}>成员管理</Button>
              <Button
                variant="primary"
                disabled={!rootNode || !canAddChild}
                title={!canAddChild ? `已达 ${ORG_MAX_LEVEL} 层上限` : ''}
                onClick={() => {
                  if (selected) openAdd(selected)
                  else if (rootNode) openAdd(rootNode)
                }}
              >
                新增下级
              </Button>
            </>
          }
        />
      )}

      {nodes.length === 1 && showOrgTip && (
        <div className="soft-tip org-soft-tip">
          <span className="soft-tip-dot" />
          <span>建议先建立部门层级，便于按组织查看和管理成员</span>
          <button type="button" className="soft-tip-close" onClick={() => setShowOrgTip(false)} aria-label="关闭">
            <Icon name="close" size={12} />
          </button>
        </div>
      )}

      <div className="org-layout">
        <section className="card org-panel">
          <div className="org-panel-head" data-ann-target="org.tip.global">
            <span className="org-panel-title">组织架构</span>
            <Tag tone={tenantStatusTone[tenant.status]}>{tenantStatusText[tenant.status]}</Tag>
          </div>

          {/* 左树搜索：部门名称 / 成员姓名模糊匹配，自动展开命中节点 */}
          <div className="org-tree-search">
            <Icon name="search" size={14} />
            <input
              className="input org-tree-search-input"
              value={treeKeyword}
              placeholder="搜索部门名称 / 成员姓名"
              aria-label="搜索部门名称或成员姓名"
              onChange={(e) => setTreeKeyword(e.target.value)}
            />
            {treeKeyword && (
              <button type="button" className="org-tree-search-clear" aria-label="清空搜索" onClick={() => setTreeKeyword('')}>
                <Icon name="close" size={12} />
              </button>
            )}
          </div>

          <div className="org-tree-body" data-ann-target="org.tree">
            {loading ? (
              <div className="org-tree-empty">加载中…</div>
            ) : treeData.length === 0 ? (
              <div className="org-tree-empty">
                本租户尚未配置组织架构
                <br />
                请联系平台重新初始化根组织
              </div>
            ) : keyword && filteredTreeData.length === 0 ? (
              <div className="org-tree-empty">
                未找到匹配的部门或成员
                <br />
                请更换关键词后重试
              </div>
            ) : (
              <Tree
                data={filteredTreeData}
                selectedId={selectedId}
                onSelect={(node) => setSelectedId(node.id)}
                defaultExpandedIds={expandedIds}
                expandedIds={effectiveExpandedIds}
                onExpandedChange={setSearchExpanded}
                renderActions={renderTreeActions}
              />
            )}
          </div>
        </section>

        <section className="card org-panel">
          <div className="org-panel-head" data-ann-target="org.tip.platform">
            <span className="org-panel-title">{selected ? selected.name : '节点详情'}</span>
            {selected?.isRoot && <Tag tone="info">根组织</Tag>}
            <span className="org-panel-actions">
              {selected && (
                <>
                  <Button
                    size="small"
                    variant="primary"
                    data-ann-target="org.btn.add"
                    disabled={!canAddChild}
                    title={canAddChild ? '' : `已达 ${ORG_MAX_LEVEL} 层上限`}
                    onClick={() => openAdd(selected)}
                  >
                    <Icon name="plus" size={14} />
                    新增下级
                  </Button>
                  <Button
                    size="small"
                    variant="primary"
                    data-ann-target="org.btn.addMember"
                    onClick={() => openCreateMember(selected.id)}
                  >
                    <Icon name="user" size={14} />
                    新增成员
                  </Button>
                  {/* 低频操作收纳进「··· 更多操作」 */}
                  <OrgMenu
                    minWidth={140}
                    trigger={({ open, toggle }) => (
                      <Button
                        size="small"
                        className={open ? 'org-more-trigger is-open' : 'org-more-trigger'}
                        aria-label="更多操作"
                        onClick={toggle}
                      >
                        ··· 更多操作
                      </Button>
                    )}
                    items={[
                      {
                        key: 'edit',
                        label: '编辑',
                        annTarget: 'org.btn.edit',
                        onClick: () => setNodeModal({ parent: null, node: selected }),
                      },
                      {
                        key: 'move',
                        label: '移动',
                        annTarget: 'org.btn.move',
                        disabled: selected.isRoot,
                        title: selected.isRoot ? '根组织由系统自动创建，不可移动' : '',
                        onClick: () => openMove(selected),
                      },
                      {
                        key: 'delete',
                        label: '删除',
                        danger: true,
                        annTarget: 'org.btn.delete',
                        disabled: !!deleteBlockedReason,
                        title: deleteBlockedReason,
                        onClick: () => setDeleteTarget(selected),
                      },
                    ]}
                  />
                </>
              )}
            </span>
          </div>

          {!selected ? (
            <div className="org-detail-empty">请选择左侧组织架构节点查看详情</div>
          ) : (
            <>
              <div className="org-detail-body">
                {/* 核心信息：只保留节点名称 / 人数统计，加粗突出 */}
                <div className="org-core" data-ann-target="org.detail">
                  <div className="org-core-row" data-ann-target="org.detail.name">
                    <span className="org-core-label">节点名称</span>
                    <strong className="org-core-value org-core-name">{selected.name}</strong>
                  </div>
                  <div className="org-core-row" data-ann-target="org.detail.counts">
                    <span className="org-core-label">人数统计</span>
                    <strong className="org-core-value">
                      直属 <b>{directCounts[selected.id] ?? 0}</b> 人
                      <span className="org-core-divider">·</span>
                      含下级 <b>{subtreeCounts[selected.id] ?? 0}</b> 人
                    </strong>
                  </div>
                </div>

                {/* 系统字段默认收进「更多详情」折叠面板 */}
                <div className="org-more-detail">
                  <button
                    type="button"
                    className="org-more-toggle"
                    aria-expanded={moreDetailOpen}
                    onClick={() => setMoreDetailOpen((prev) => !prev)}
                  >
                    <Icon name={moreDetailOpen ? 'chevronDown' : 'chevronRight'} size={14} />
                    更多详情
                    <span className="org-more-hint">组织编码、层级路径等系统字段</span>
                  </button>
                  {moreDetailOpen && (
                    <div className="detail-list org-more-list">
                      <div className="detail-item" data-ann-target="org.detail.code">
                        <span className="detail-label">组织编码</span>
                        <span className="detail-value mono">{selected.code}</span>
                      </div>
                      <div className="detail-item" data-ann-target="org.detail.parent">
                        <span className="detail-label">上级节点</span>
                        <span className="detail-value">
                          {selectedParent ? selectedParent.name : selected.isRoot ? '—（租户根组织，由系统自动创建）' : '—（顶级节点）'}
                        </span>
                      </div>
                      <div className="detail-item" data-ann-target="org.detail.sort">
                        <span className="detail-label">同级排序</span>
                        <span className="detail-value">
                          第 {selected.sort} 位（同级共 {siblingCount} 个）
                        </span>
                      </div>
                      <div className="detail-item" data-ann-target="org.detail.subtree">
                        <span className="detail-label">下级 / 含下级节点</span>
                        <span className="detail-value">
                          {selectedChildren.length} 个 / {orgSubtreeCount(selected.id)} 个（含自身）
                        </span>
                      </div>
                      <div className="detail-item" data-ann-target="org.detail.updated">
                        <span className="detail-label">最近更新</span>
                        <span className="detail-value">{selected.updatedAt}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="org-member-block" data-ann-target="org.member">
                <div className="org-member-head">
                  <div className="org-member-tabs">
                    <button
                      type="button"
                      className={memberScope === 'direct' ? 'active' : ''}
                      onClick={() => setMemberScope('direct')}
                    >
                      直属成员 <span className="org-tab-count">({directCounts[selected.id] ?? 0})</span>
                    </button>
                    <button
                      type="button"
                      className={memberScope === 'subtree' ? 'active' : ''}
                      onClick={() => setMemberScope('subtree')}
                    >
                      含下级成员 <span className="org-tab-count">({subtreeCounts[selected.id] ?? 0})</span>
                    </button>
                  </div>
                </div>
                {selectedMembers.length === 0 && !loading ? (
                  <div className="org-member-empty">
                    <span className="org-member-empty-icon"><Icon name="user" size={26} /></span>
                    <p className="org-member-empty-text">
                      {memberScope === 'direct' ? '该节点暂无直属成员' : '该节点及下级暂无成员'}
                    </p>
                    <Button variant="primary" onClick={() => openCreateMember(selected.id)}>
                      <Icon name="plus" size={14} />
                      添加成员
                    </Button>
                  </div>
                ) : (
                  <div className="org-table-wrap">
                    <Table
                      columns={memberColumns}
                      data={selectedMembers}
                      rowKey={(row) => row.id}
                      loading={loading}
                      emptyText={memberScope === 'direct' ? '该节点暂无直属成员' : '该节点及下级暂无成员'}
                    />
                  </div>
                )}
              </div>
            </>
          )}

        </section>
      </div>

      <OrgNodeModal
        open={!!nodeModal}
        orgId={tenant.id}
        parent={nodeModal?.parent ?? null}
        node={nodeModal?.node ?? null}
        typeOptions={typeOptions}
        suggestedSort={
          nodeModal?.node
            ? nodeModal.node.sort
            : nodes.filter((item) => item.parentId === (nodeModal?.parent?.id ?? null)).length + 1
        }
        onClose={() => setNodeModal(null)}
        onDone={() => void load()}
      />

      <Modal
        open={!!moveTarget}
        title={`移动节点 · ${moveTarget?.name ?? ''}`}
        onClose={() => setMoveTarget(null)}
        footer={
          <>
            <Button onClick={() => setMoveTarget(null)}>取消</Button>
            <Button variant="primary" disabled={submitting} onClick={() => void handleMove()}>
              确认移动
            </Button>
          </>
        }
      >
        <FormField label="移动到" required hint="不可移动到自身或自身下级；移动后层级与路径自动重算">
          <Select value={moveParentId} options={moveOptions} onChange={(e) => setMoveParentId(e.target.value)} />
        </FormField>
        <div className="org-impact" data-ann-target="org.modal.move">
          <span className="org-impact-title">
            <Icon name="warning" size={14} />
            移动影响
          </span>
          <ul className="org-impact-list">
            <li>本节点与全部下级（共 {moveTarget ? orgSubtreeCount(moveTarget.id) : 0} 个节点）的层级与路径将重算</li>
            <li>
              直属成员 {moveTarget ? deptMemberCount(tenant.id, moveTarget.id) : 0} 人的数据范围按新树生效；历史业务数据归属不变
            </li>
          </ul>
        </div>
      </Modal>

      <Modal
        open={!!deleteTarget}
        title="删除节点"
        onClose={() => setDeleteTarget(null)}
        footer={
          <>
            <Button onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="danger" disabled={submitting} onClick={() => void handleDelete()}>
              确认删除
            </Button>
          </>
        }
      >
        <p>确认删除节点「{deleteTarget?.name}」？删除后不可恢复。</p>
        <div className="org-impact" data-ann-target="org.modal.delete">
          <span className="org-impact-title">
            <Icon name="warning" size={14} />
            删除前置条件
          </span>
          <ul className="org-impact-list">
            <li>节点下不能有下级节点，请先删除或移走全部下级</li>
            <li>节点下不能有成员挂载，需先在成员管理中调整所属组织</li>
          </ul>
        </div>
      </Modal>

      <MemberFormModal
        open={memberFormOpen}
        tenantId={tenantId}
        mode={memberFormMode}
        member={editingMember}
        initialDeptId={createMemberDeptId}
        editScope="orgRole"
        onClose={() => {
          setMemberFormOpen(false)
          setEditingMember(null)
        }}
        onDone={() => {
          setMemberFormOpen(false)
          setEditingMember(null)
          void load()
        }}
      />

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
    </>
  )
}

/** 删除按钮禁用原因（有直属成员时给出具体人数） */
function makeDeleteMemberTip(tenantId: string, node: OrgNode): string {
  const count = deptMemberCount(tenantId, node.id)
  return count > 0 ? `该节点下仍有 ${count} 名成员，请先调整成员所属组织` : ''
}
