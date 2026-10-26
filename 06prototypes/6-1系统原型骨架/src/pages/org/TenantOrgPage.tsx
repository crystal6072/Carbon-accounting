import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, FormField, Icon, Modal, PageHeader, Select, Table, Tag, Tree, useToast } from '@/shared/components'
import type { Column, SelectOption, TreeNodeData } from '@/shared/components'
import { CURRENT_TENANT_ID } from '@/mock/member'
import {
  ORG_MAX_LEVEL,
  deleteOrgNode,
  ensureTenantRootOrg,
  fetchOrgNodes,
  moveOrgNode,
  orgSubtreeCount,
  orgTypesOf,
  updateOrgNodeStatus,
} from '@/mock/org'
import { deptMemberCount, fetchTenant, fetchTenantMembers } from '@/mock/tenant'
import type { OrgNode, Tenant, TenantMemberItem } from '@/types'
import { memberStatusText, memberStatusTone, tenantStatusText, tenantStatusTone } from '../tenant/tenantMeta'
import OrgNodeModal from './OrgNodeModal'
import { orgNodeStatusText, orgNodeStatusTone } from './orgMeta'
import './OrgPage.css'

/**
 * 租户端 · 组织架构（组织架构 PRD §4.1）：
 * 租户管理员维护本租户组织树与组织类型；平台侧不提供跨租户组织树只读查看，代配置须经「进入租户」。
 */
export default function TenantOrgPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [nodes, setNodes] = useState<OrgNode[]>([])
  const [members, setMembers] = useState<TenantMemberItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState('')

  const [nodeModal, setNodeModal] = useState<{ parent: OrgNode | null; node: OrgNode | null } | null>(null)
  const [statusTarget, setStatusTarget] = useState<OrgNode | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<OrgNode | null>(null)
  const [moveTarget, setMoveTarget] = useState<OrgNode | null>(null)
  const [moveParentId, setMoveParentId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [detail, memberList] = await Promise.all([
        fetchTenant(CURRENT_TENANT_ID),
        fetchTenantMembers(CURRENT_TENANT_ID),
      ])
      // 根组织兜底：租户必有一个系统自动创建的根组织（名称 = 租户名称）
      await ensureTenantRootOrg(detail.id, detail.name, detail.type)
      const nodeList = await fetchOrgNodes(CURRENT_TENANT_ID)
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
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  /** 各节点直属成员数（原型按部门名称匹配） */
  const memberCounts = useMemo(() => {
    return members.reduce<Record<string, number>>((acc, item) => {
      acc[item.deptName] = (acc[item.deptName] ?? 0) + 1
      return acc
    }, {})
  }, [members])

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
        const count = memberCounts[item.name] ?? 0
        return {
          id: item.id,
          name: `${item.name}${item.status === 'disabled' ? '（停用）' : ''}${item.isRoot ? ' · 根组织' : ''}`,
          extra: `${item.typeName}${count > 0 ? ` · ${count} 人` : ''}`,
          children: children.length > 0 ? children : undefined,
        }
      })
    return build(null)
  }, [nodes, memberCounts])

  const expandedIds = useMemo(() => nodes.map((item) => item.id), [nodes])

  /** 租户根组织（系统自动创建，名称 = 租户名称；不可删除、不可移动，名称可改） */
  const rootNode = nodes.find((item) => item.isRoot) ?? null
  const selected = nodes.find((item) => item.id === selectedId) ?? null
  const selectedChildren = selected ? nodes.filter((item) => item.parentId === selected.id) : []
  const selectedMembers = selected ? members.filter((item) => item.deptName === selected.name) : []
  const selectedParent = selected?.parentId ? (nodes.find((item) => item.id === selected.parentId) ?? null) : null
  const siblingCount = selected ? nodes.filter((item) => item.parentId === selected.parentId).length : 0

  const typeOptions = useMemo(
    () => (tenant ? orgTypesOf(tenant.id, tenant.type) : ['部门']),
    [tenant, nodes],
  )

  /** 新增下级：租户内只有一个根组织，新增组织一律挂在选中节点下（默认根组织） */
  const openAdd = (parent: OrgNode) => setNodeModal({ parent, node: null })

  const handleStatus = async () => {
    if (!statusTarget) return
    const next = statusTarget.status === 'enabled' ? 'disabled' : 'enabled'
    setSubmitting(true)
    try {
      await updateOrgNodeStatus(statusTarget.id, next)
      toast(next === 'enabled' ? '节点已启用' : '节点已停用')
      setStatusTarget(null)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    } finally {
      setSubmitting(false)
    }
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

  /** 可移动目标：排除自身与自身子孙、停用节点；租户内只有一个根组织，故无「作为根节点」选项 */
  const moveOptions: SelectOption[] = useMemo(() => {
    if (!moveTarget) return []
    const blocked = new Set(
      nodes.filter((item) => item.path.startsWith(moveTarget.path)).map((item) => item.id),
    )
    return nodes
      .filter((item) => !blocked.has(item.id) && item.status === 'enabled' && !item.isRoot)
      .map((item) => ({ label: `${'　'.repeat(item.level - 1)}${item.name}（${item.typeName}）`, value: item.id }))
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
        <PageHeader breadcrumb={['系统管理', '组织与权限', '组织架构']} title="组织架构" />
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
  ]

  const canAddChild = !!selected && selected.status === 'enabled' && selected.level < ORG_MAX_LEVEL
  const deleteBlockedReason = !selected
    ? ''
    : selected.isRoot
      ? '根组织由系统自动创建，不可删除；可修改组织名称'
      : selectedChildren.length > 0
        ? '该节点下仍有下级节点，请先处理下级'
        : makeDeleteMemberTip(tenant.id, selected)
  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '组织与权限', '组织架构', tenant.name]}
        title={<span data-ann-target="org.page.global">组织架构</span>}
        actions={
          <>
            <Button onClick={() => navigate('/system/member')}>成员管理</Button>
            <Button
              variant="primary"
              disabled={!rootNode || !canAddChild}
              title={!canAddChild ? `已达 ${ORG_MAX_LEVEL} 层上限或节点已停用` : ''}
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

      <div className="org-layout">
        <section className="card org-panel">
          <div className="org-panel-head" data-ann-target="org.tip.global">
            <span className="org-panel-title">组织架构</span>
            <Tag tone={tenantStatusTone[tenant.status]}>{tenantStatusText[tenant.status]}</Tag>
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
            ) : (
              <Tree data={treeData} selectedId={selectedId} onSelect={(node) => setSelectedId(node.id)} defaultExpandedIds={expandedIds} />
            )}
          </div>
        </section>

        <section className="card org-panel">
          <div className="org-panel-head" data-ann-target="org.tip.platform">
            <span className="org-panel-title">{selected ? selected.name : '节点详情'}</span>
            {selected && <Tag tone={orgNodeStatusTone[selected.status]}>{orgNodeStatusText[selected.status]}</Tag>}
            {selected?.isRoot && <Tag tone="info">根组织</Tag>}
            <span className="org-panel-actions">
              {selected && (
                <>
                  <Button
                    size="small"
                    data-ann-target="org.btn.add"
                    disabled={!canAddChild}
                    title={canAddChild ? '' : `已达 ${ORG_MAX_LEVEL} 层上限或节点已停用`}
                    onClick={() => openAdd(selected)}
                  >
                    <Icon name="plus" size={14} />
                    新增下级
                  </Button>
                  <Button size="small" data-ann-target="org.btn.edit" onClick={() => setNodeModal({ parent: null, node: selected })}>
                    编辑
                  </Button>
                  <Button
                    size="small"
                    data-ann-target="org.btn.move"
                    disabled={selected.isRoot}
                    title={selected.isRoot ? '根组织由系统自动创建，不可移动' : ''}
                    onClick={() => openMove(selected)}
                  >
                    移动
                  </Button>
                  <Button size="small" data-ann-target="org.btn.status" onClick={() => setStatusTarget(selected)}>
                    {selected.status === 'enabled' ? '停用' : '启用'}
                  </Button>
                  <Button
                    size="small"
                    variant="danger"
                    data-ann-target="org.btn.delete"
                    disabled={!!deleteBlockedReason}
                    title={deleteBlockedReason}
                    onClick={() => setDeleteTarget(selected)}
                  >
                    删除
                  </Button>
                </>
              )}
            </span>
          </div>

          {!selected ? (
            <div className="org-detail-empty">请选择左侧组织架构节点查看详情</div>
          ) : (
            <>
              <div className="org-detail-body">
                <div className="detail-list" data-ann-target="org.detail">
                  <div className="detail-item" data-ann-target="org.detail.name">
                    <span className="detail-label">节点名称</span>
                    <span className="detail-value">{selected.name}</span>
                  </div>
                  <div className="detail-item" data-ann-target="org.detail.code">
                    <span className="detail-label">组织编码</span>
                    <span className="detail-value mono">{selected.code}</span>
                  </div>
                  <div className="detail-item" data-ann-target="org.detail.type">
                    <span className="detail-label">组织类型</span>
                    <span className="detail-value">{selected.typeName}</span>
                  </div>
                  <div className="detail-item" data-ann-target="org.detail.parent">
                    <span className="detail-label">上级节点</span>
                    <span className="detail-value">
                      {selectedParent ? selectedParent.name : selected.isRoot ? '—（租户根组织，由系统自动创建）' : '—（顶级节点）'}
                    </span>
                  </div>
                  <div className="detail-item" data-ann-target="org.detail.level">
                    <span className="detail-label">所在层级</span>
                    <span className="detail-value">
                      第 {selected.level} 层 / 上限 {ORG_MAX_LEVEL} 层
                    </span>
                  </div>
                  <div className="detail-item" data-ann-target="org.detail.path">
                    <span className="detail-label">层级路径</span>
                    <span className="detail-value mono">{selected.path}</span>
                  </div>
                  <div className="detail-item" data-ann-target="org.detail.leader">
                    <span className="detail-label">负责人</span>
                    <span className="detail-value">{selected.leader || <span className="text-tertiary">—</span>}</span>
                  </div>
                  <div className="detail-item" data-ann-target="org.detail.sort">
                    <span className="detail-label">同级排序</span>
                    <span className="detail-value">
                      第 {selected.sort} 位（同级共 {siblingCount} 个）
                    </span>
                  </div>
                  <div className="detail-item" data-ann-target="org.detail.counts">
                    <span className="detail-label">下级节点 / 直属成员</span>
                    <span className="detail-value">
                      {selectedChildren.length} 个 / {selectedMembers.length} 人
                    </span>
                  </div>
                  <div className="detail-item" data-ann-target="org.detail.subtree">
                    <span className="detail-label">含下级节点数</span>
                    <span className="detail-value">{orgSubtreeCount(selected.id)} 个（含自身）</span>
                  </div>
                  <div className="detail-item" data-ann-target="org.detail.updated">
                    <span className="detail-label">最近更新</span>
                    <span className="detail-value">{selected.updatedAt}</span>
                  </div>
                  <div className="detail-item" data-ann-target="org.detail.status">
                    <span className="detail-label">节点状态</span>
                    <span className="detail-value">
                      <Tag tone={orgNodeStatusTone[selected.status]}>{orgNodeStatusText[selected.status]}</Tag>
                    </span>
                  </div>
                </div>
              </div>

              <div className="org-member-block" data-ann-target="org.member">
                <div className="org-member-head">
                  <span className="org-panel-title">直属成员</span>
                </div>
                <div className="org-table-wrap">
                  <Table
                    columns={memberColumns}
                    data={selectedMembers}
                    rowKey={(row) => row.id}
                    loading={loading}
                    emptyText="该节点暂无直属成员"
                  />
                </div>
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
        open={!!statusTarget}
        title={statusTarget?.status === 'enabled' ? '停用节点' : '启用节点'}
        onClose={() => setStatusTarget(null)}
        footer={
          <>
            <Button onClick={() => setStatusTarget(null)}>取消</Button>
            <Button variant="primary" disabled={submitting} onClick={() => void handleStatus()}>
              确认
            </Button>
          </>
        }
      >
        <p data-ann-target="org.modal.status">
          {statusTarget?.status === 'enabled'
            ? `确认停用节点「${statusTarget?.name}」？停用后该节点不可挂新成员、不可新增下级，存量成员的数据范围不变。`
            : `确认启用节点「${statusTarget?.name}」？启用后该节点可继续新增下级与挂载成员。`}
        </p>
      </Modal>

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
              直属成员 {moveTarget ? deptMemberCount(tenant.id, moveTarget.name) : 0} 人的数据范围按新树生效；历史业务数据归属不变
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
            <li>节点下不能有下级节点（含已停用节点）</li>
            <li>节点下不能有成员挂载，需先在成员管理中调整所属组织</li>
            <li>被业务数据归属引用时不可删除，只能停用</li>
          </ul>
        </div>
      </Modal>
    </>
  )
}

/** 删除按钮禁用原因（有直属成员时给出具体人数） */
function makeDeleteMemberTip(tenantId: string, node: OrgNode): string {
  const count = deptMemberCount(tenantId, node.name)
  return count > 0 ? `该节点下仍有 ${count} 名成员，请先调整成员所属组织` : ''
}
