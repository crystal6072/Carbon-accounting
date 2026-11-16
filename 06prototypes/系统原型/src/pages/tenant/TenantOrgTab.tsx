import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Icon, Pagination, Table, Tag, Tree, useToast } from '@/shared/components'
import type { Column, TreeNodeData } from '@/shared/components'
import { fetchOrgNodes } from '@/mock/org'
import { ROUTE_TO_MENU_ID } from '@/mock/menu'
import { maskMobile } from '@/mock/member'
import { fetchTenantMembers } from '@/mock/tenant'
import type { OrgNode, Tenant, TenantMemberItem } from '@/types'
import { memberStatusText, memberStatusTone, tenantStatusText, tenantStatusTone } from './tenantMeta'
import { accountStatusColumn, memberOpsColumn } from './memberOpsColumns'
import '../org/OrgPage.css'

/** 成员表分页大小（租户管理 PRD §4.19-7：每页 20 条） */
const PAGE_SIZE = 20

/** 「组织架构」功能菜单 id：据此判断该租户是否已开通组织架构模块（§4.19-2 / E40） */
const ORG_MENU_ID = ROUTE_TO_MENU_ID['/system/org'] ?? ''

interface TenantOrgTabProps {
  tenant: Tenant
  /** 未开通组织架构模块时的就地出口：打开模块授权弹窗（§4.19-2 / E40） */
  onRequestModuleAuth?: () => void
  /** 代管：从当前选中节点代建成员（预置所属组织），传空则不展示入口 */
  onRequestCreateMember?: (deptId?: string) => void
  /** 外部数据刷新信号（新增 / 移出成员后由父级递增，触发本页重新拉取） */
  refreshToken?: number
  /** 代管：成员账号级运维与移出（弹窗由父级统一承载，避免两处口径漂移） */
  onResetMember?: (accountId: string) => void
  onToggleMemberAccount?: (accountId: string, mode: 'disable' | 'enable') => void
  onRemoveMember?: (row: TenantMemberItem) => void
}

/**
 * 平台后台 · 租户详情「组织与成员」Tab（租户管理 PRD V0.13 §4.19、组织架构 PRD V0.2 §5.10）。
 *
 * 界面与租户端「系统管理 → 组织架构」（TenantOrgPage）保持完全一致：左树搜索 + 右侧节点核心信息 /
 * 更多详情折叠 + 直属 / 含下级成员页签；本页为**只读视图**——
 * 不提供新增下级 / 编辑 / 移动 / 删除等组织写操作，也不做受控代配置。
 * 成员维度例外：平台可在选中节点就地「新增成员」（预置所属组织，代管场景用）；
 * 账号级运维（重置密码 / 停用 / 启用 / 移出）仍在「租户概况 → 成员与用量」进行。
 * 三条硬口径：
 * 1. 成员一律按 `dept_id` 关联（D54 / 字段清单 D08），组织改名不影响归属；
 * 2. 未授权 org 模块展示空态而非空树（E40）；根组织缺失展示异常态且不自动补建（E41）；
 * 3. 查看不写审计，仅导出让用户感知「已写平台审计」（§4.19-13、-14）。
 */
export default function TenantOrgTab({
  tenant,
  onRequestModuleAuth,
  onRequestCreateMember,
  refreshToken = 0,
  onResetMember,
  onToggleMemberAccount,
  onRemoveMember,
}: TenantOrgTabProps) {
  const toast = useToast()

  const [nodes, setNodes] = useState<OrgNode[]>([])
  const [members, setMembers] = useState<TenantMemberItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState('')
  /** 左树搜索关键词：部门名称 / 成员姓名（含手机号、账号）模糊匹配，口径同租户端 */
  const [keyword, setKeyword] = useState('')
  /** 直属成员查看范围：直属 / 含下级（同租户端页签） */
  const [memberScope, setMemberScope] = useState<'direct' | 'subtree'>('direct')
  /** 「更多详情」折叠面板（系统字段默认不展示，同租户端） */
  const [moreDetailOpen, setMoreDetailOpen] = useState(false)
  /** 搜索态下用户手动展开/收起的节点；null = 跟随搜索结果自动展开 */
  const [searchExpanded, setSearchExpanded] = useState<string[] | null>(null)
  const [page, setPage] = useState(1)

  /** 模块授权判定：未开通组织架构时整块展示空态 */
  const hasOrgModule = tenant.moduleCodes.includes(ORG_MENU_ID)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [nodeList, memberList] = await Promise.all([
        fetchOrgNodes(tenant.id),
        fetchTenantMembers(tenant.id),
      ])
      setNodes(nodeList)
      setMembers(memberList)
      setSelectedId((prev) =>
        nodeList.some((item) => item.id === prev)
          ? prev
          : (nodeList.find((item) => item.isRoot)?.id ?? nodeList[0]?.id ?? ''),
      )
    } catch {
      setNodes([])
      setMembers([])
    } finally {
      setLoading(false)
    }
    // refreshToken：父级新增 / 移出成员后递增，触发重新拉取
  }, [tenant.id, refreshToken])

  useEffect(() => {
    void load()
  }, [load])

  /** 切换租户时重置筛选与选中态 */
  useEffect(() => {
    setKeyword('')
    setMemberScope('direct')
    setMoreDetailOpen(false)
    setSearchExpanded(null)
    setPage(1)
  }, [tenant.id])

  /** 各节点直属人数（口径同租户端：按 dept_id 关联，含停用与已移出） */
  const directCounts = useMemo(
    () =>
      members.reduce<Record<string, number>>((acc, item) => {
        if (!item.deptId) return acc
        acc[item.deptId] = (acc[item.deptId] ?? 0) + 1
        return acc
      }, {}),
    [members],
  )

  /** 各节点含下级人数（按 org_path 前缀匹配，口径同租户端） */
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

  /** 左树：仅保留部门名称，类型 / 人数后缀收进 Hover Tooltip 气泡（同租户端） */
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

  /** 搜索关键词（大小写不敏感）：部门名称命中，或该节点下存在姓名 / 手机号 / 账号命中的成员 */
  const kw = keyword.trim().toLowerCase()
  const matchedIds = useMemo(() => {
    const ids = new Set<string>()
    if (!kw) return ids
    nodes.forEach((item) => {
      if (item.name.toLowerCase().includes(kw)) ids.add(item.id)
    })
    members.forEach((item) => {
      if (!item.deptId || !nodeById.has(item.deptId)) return
      const hit =
        item.name.toLowerCase().includes(kw) ||
        item.mobile.includes(kw) ||
        item.loginName.toLowerCase().includes(kw)
      if (hit) ids.add(item.deptId)
    })
    return ids
  }, [kw, nodes, members, nodeById])

  /** 命中节点 + 其完整祖先链 = 搜索结果可见节点 */
  const visibleIds = useMemo(() => {
    const ids = new Set<string>()
    if (!kw) return ids
    matchedIds.forEach((id) => {
      let cursor = nodeById.get(id)
      while (cursor) {
        ids.add(cursor.id)
        cursor = cursor.parentId ? nodeById.get(cursor.parentId) : undefined
      }
    })
    return ids
  }, [kw, matchedIds, nodeById])

  /** 搜索结果树：只保留可见节点，并自动展开其祖先链 */
  const filteredTreeData = useMemo(() => {
    if (!kw) return treeData
    const prune = (list: TreeNodeData[]): TreeNodeData[] =>
      list.flatMap((node) => {
        if (!visibleIds.has(node.id)) return []
        const children = node.children ? prune(node.children) : []
        return [{ ...node, children: children.length > 0 ? children : undefined }]
      })
    return prune(treeData)
  }, [kw, treeData, visibleIds])

  const expandedIds = useMemo(() => nodes.map((item) => item.id), [nodes])
  const searchExpandedIds = useMemo(() => Array.from(visibleIds), [visibleIds])
  const effectiveExpandedIds = kw ? (searchExpanded ?? searchExpandedIds) : undefined

  // 关键词变化时清除手动展开态，重新按搜索结果自动展开
  useEffect(() => {
    setSearchExpanded(null)
  }, [keyword])

  const rootNode = nodes.find((item) => item.isRoot) ?? null
  const selected = nodes.find((item) => item.id === selectedId) ?? null
  const selectedParent = selected?.parentId ? (nodes.find((item) => item.id === selected.parentId) ?? null) : null

  /** 选中节点范围内的成员：直属 / 含下级（org_path 前缀匹配，同租户端） */
  const selectedMembers = useMemo(() => {
    if (!selected) return []
    if (memberScope === 'direct') return members.filter((item) => item.deptId === selected.id)
    return members.filter((item) => {
      if (!item.deptId) return false
      const memberNode = nodeById.get(item.deptId)
      return memberNode ? memberNode.path.startsWith(selected.path) : false
    })
  }, [members, selected, memberScope, nodeById])

  useEffect(() => {
    setPage(1)
  }, [selectedId, memberScope])

  const pagedMembers = selectedMembers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  /** 成员表：同租户端列结构；手机号按平台口径脱敏，并追加账号状态与账号级兜底操作 */
  const memberColumns: Column<TenantMemberItem>[] = [
    { key: 'name', title: '姓名', width: 100, render: (row) => <span className="nowrap">{row.name}</span> },
    {
      key: 'mobile',
      title: '手机号',
      width: 130,
      render: (row) => <span className="nowrap mono">{maskMobile(row.mobile)}</span>,
    },
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
    accountStatusColumn(),
    ...(onResetMember && onToggleMemberAccount && onRemoveMember
      ? [
          memberOpsColumn({
            adminAccountId: tenant.adminAccountId,
            onReset: onResetMember,
            onToggle: onToggleMemberAccount,
            onRemove: onRemoveMember,
          }),
        ]
      : []),
  ]

  const handleExport = () => {
    toast(
      `已导出 ${nodes.length} 个组织节点（名称 / 类型 / 层级 / 编码 / 负责人 / 直属与含下级人数），不含成员个人信息；本次导出已写入平台审计`,
    )
  }

  return (
    <div data-ann-target="tenant.detail.org">
      {!hasOrgModule ? (
        <div className="card">
          <div className="tenant-section-body">
            <div className="tenant-org-empty" data-ann-target="tenant.detail.org.noModule">
              该租户尚未开通组织架构模块
              <br />
              开通后此处可查看该租户的组织树与组织下成员（只读）。
              {onRequestModuleAuth && (
                <div style={{ marginTop: 'var(--space-sm)' }}>
                  <Button variant="primary" onClick={onRequestModuleAuth}>
                    去开通模块授权
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {!loading && !rootNode && (
            <div className="tenant-org-warn" data-ann-target="tenant.detail.org.noRoot">
              <Icon name="warning" size={14} />
              该租户根组织缺失，请核查开户初始化（根组织随开户自动创建）。此处按只读兜底展示已存在节点，系统不会自动补建。
            </div>
          )}

          {/* 双栏布局与租户端组织架构一致：左树 + 右详情，全部只读 */}
          <div className="org-layout">
            <section className="card org-panel">
              <div className="org-panel-head" data-ann-target="tenant.detail.org.title">
                <span className="org-panel-title">组织架构</span>
                <Tag tone="info">组织只读</Tag>
                <Tag tone={tenantStatusTone[tenant.status]}>{tenantStatusText[tenant.status]}</Tag>
              </div>

              {/* 左树搜索：部门名称 / 成员姓名模糊匹配，自动展开命中节点（同租户端） */}
              <div className="org-tree-search">
                <Icon name="search" size={14} />
                <input
                  className="input org-tree-search-input"
                  value={keyword}
                  placeholder="搜索部门名称 / 成员姓名"
                  aria-label="搜索部门名称或成员姓名"
                  onChange={(e) => setKeyword(e.target.value)}
                />
                {keyword && (
                  <button type="button" className="org-tree-search-clear" aria-label="清空搜索" onClick={() => setKeyword('')}>
                    <Icon name="close" size={12} />
                  </button>
                )}
              </div>

              <div className="org-tree-body" data-ann-target="tenant.detail.org.tree">
                {loading ? (
                  <div className="org-tree-empty">加载中…</div>
                ) : treeData.length === 0 ? (
                  <div className="org-tree-empty">
                    该租户尚未搭建下级组织
                    <br />
                    组织树维护在租户端「系统管理 → 组织架构」
                  </div>
                ) : kw && filteredTreeData.length === 0 ? (
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
                  />
                )}
              </div>
            </section>

            <section className="card org-panel">
              <div className="org-panel-head">
                <span className="org-panel-title">{selected ? selected.name : '节点详情'}</span>
                {selected?.isRoot && <Tag tone="info">根组织</Tag>}
                <span className="org-panel-actions">
                  {hasOrgModule && nodes.length > 0 && (
                    <Button size="small" data-ann-target="tenant.detail.org.export" onClick={handleExport}>
                      导出
                    </Button>
                  )}
                </span>
              </div>

              {!selected ? (
                <div className="org-detail-empty">请选择左侧组织架构节点查看详情</div>
              ) : (
                <>
                  <div className="org-detail-body">
                    {/* 核心信息：节点名称 / 人数统计加粗突出（同租户端） */}
                    <div className="org-core" data-ann-target="tenant.detail.org.node">
                      <div className="org-core-row">
                        <span className="org-core-label">节点名称</span>
                        <strong className="org-core-value org-core-name">{selected.name}</strong>
                      </div>
                      <div className="org-core-row">
                        <span className="org-core-label">人数统计</span>
                        <strong className="org-core-value">
                          直属 <b>{directCounts[selected.id] ?? 0}</b> 人
                          <span className="org-core-divider">·</span>
                          含下级 <b>{subtreeCounts[selected.id] ?? 0}</b> 人
                        </strong>
                      </div>
                    </div>

                    {/* 系统字段默认收进「更多详情」折叠面板（同租户端） */}
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
                          <div className="detail-item">
                            <span className="detail-label">组织编码</span>
                            <span className="detail-value mono">{selected.code}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">组织类型</span>
                            <span className="detail-value">{selected.typeName}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">上级节点</span>
                            <span className="detail-value">
                              {selectedParent ? selectedParent.name : selected.isRoot ? '—（租户根组织，由系统自动创建）' : '—（顶级节点）'}
                            </span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">所在层级</span>
                            <span className="detail-value">第 {selected.level} 层</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">最近更新</span>
                            <span className="detail-value">{selected.updatedAt}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 成员区块：直属 / 含下级页签切换（同租户端），本页只读；新增与账号级运维在「租户概况 → 成员与用量」 */}
                  <div className="org-member-block" data-ann-target="tenant.detail.org.member">
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
                          data-ann-target="tenant.detail.org.subtree"
                          onClick={() => setMemberScope('subtree')}
                        >
                          含下级成员 <span className="org-tab-count">({subtreeCounts[selected.id] ?? 0})</span>
                        </button>
                      </div>
                      {onRequestCreateMember && (
                        <Button
                          variant="primary"
                          data-ann-target="tenant.detail.org.member.create"
                          onClick={() => onRequestCreateMember(selected.id)}
                        >
                          新增成员
                        </Button>
                      )}
                    </div>
                    {selectedMembers.length === 0 && !loading ? (
                      <div className="org-member-empty">
                        <span className="org-member-empty-icon"><Icon name="user" size={26} /></span>
                        <p className="org-member-empty-text">
                          {memberScope === 'direct' ? '该节点暂无直属成员' : '该节点及下级暂无成员'}
                        </p>
                      </div>
                    ) : (
                      <div className="org-table-wrap">
                        <Table
                          columns={memberColumns}
                          data={pagedMembers}
                          rowKey={(row) => row.id}
                          loading={loading}
                          emptyText={memberScope === 'direct' ? '该节点暂无直属成员' : '该节点及下级暂无成员'}
                        />
                      </div>
                    )}
                    {selectedMembers.length > PAGE_SIZE && (
                      <div className="org-member-head" style={{ justifyContent: 'flex-end' }}>
                        <Pagination total={selectedMembers.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  )
}
