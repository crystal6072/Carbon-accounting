import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Input,
  PageHeader,
  Pagination,
  Select,
  Table,
  Tag,
  Tree,
  collectExpandable,
  useToast,
} from '@/shared/components'
import type { Column, SelectOption } from '@/shared/components'
import {
  createIndustry,
  deriveIndustryLevel,
  fetchIndustries,
  updateIndustry,
  updateIndustryStatus,
} from '@/mock'
import type { IndustryPayload } from '@/mock'
import type { EnableStatus, IndustryItem } from '@/types'
import IndustryConfirmModal from './IndustryConfirmModal'
import IndustryDetailPanel from './IndustryDetailPanel'
import IndustryFormModal from './IndustryFormModal'
import IndustryViewModal from './IndustryViewModal'
import {
  INDUSTRY_ROOT_ID,
  INDUSTRY_ROOT_NAME,
  buildIndustryTree,
  collectDescendantIds,
  getDirectChildren,
  levelText,
  parentNameOf,
  useStatusText,
  useStatusTone,
} from './industryMeta'
import './IndustryPage.css'

const PAGE_SIZE = 20

interface QueryState {
  code: string
  name: string
  status: '' | EnableStatus
}

interface FormState {
  open: boolean
  mode: 'create' | 'edit'
  initial: IndustryItem | null
  defaultParentId: string | null
  lockParent: boolean
}

const EMPTY_QUERY: QueryState = { code: '', name: '', status: '' }

export default function IndustryListPage() {
  const toast = useToast()

  const [list, setList] = useState<IndustryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string>(INDUSTRY_ROOT_ID)
  const [query, setQuery] = useState<QueryState>(EMPTY_QUERY)
  const [page, setPage] = useState(1)

  const [viewItem, setViewItem] = useState<IndustryItem | null>(null)
  const [confirm, setConfirm] = useState<{ item: IndustryItem; target: EnableStatus } | null>(null)
  const [form, setForm] = useState<FormState>({
    open: false,
    mode: 'create',
    initial: null,
    defaultParentId: null,
    lockParent: false,
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setList(await fetchIndustries())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const treeData = useMemo(() => buildIndustryTree(list), [list])
  const expandedIds = useMemo(() => collectExpandable(treeData), [treeData])

  const isRootSelected = selectedId === INDUSTRY_ROOT_ID

  const selectedName = useMemo(() => {
    if (isRootSelected) return INDUSTRY_ROOT_NAME
    return list.find((item) => item.id === selectedId)?.name ?? INDUSTRY_ROOT_NAME
  }, [list, selectedId, isRootSelected])

  /** 右表 = 所选节点的直接子级（选中「全部行业」时展示一级行业） */
  const rows = useMemo(() => {
    const parentId = selectedId === INDUSTRY_ROOT_ID ? null : selectedId
    let data = getDirectChildren(list, parentId)
    if (query.code.trim()) {
      const keyword = query.code.trim().toLowerCase()
      data = data.filter((item) => item.code.toLowerCase().includes(keyword))
    }
    if (query.name.trim()) {
      data = data.filter((item) => item.name.includes(query.name.trim()))
    }
    if (query.status) {
      data = data.filter((item) => item.status === query.status)
    }
    return data
  }, [list, selectedId, query])

  useEffect(() => {
    setPage(1)
  }, [selectedId, query])

  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  /** 上级行业候选：仅一级行业（仅两级），编辑时排除自身与其后代 */
  const parentOptions = useMemo<SelectOption[]>(() => {
    const excluded = new Set<string>()
    if (form.mode === 'edit' && form.initial) {
      excluded.add(form.initial.id)
      collectDescendantIds(list, form.initial.id).forEach((id) => excluded.add(id))
    }
    return list
      .filter((item) => item.level === 1 && !excluded.has(item.id))
      .sort((a, b) => (a.sortNo ?? 9999) - (b.sortNo ?? 9999))
      .map((item) => ({
        label: `${item.name}（${item.code}）`,
        value: item.id,
      }))
  }, [list, form.mode, form.initial])

  const openCreate = (parentId: string | null, lockParent: boolean) => {
    setForm({ open: true, mode: 'create', initial: null, defaultParentId: parentId, lockParent })
  }

  /** 上级行业锁定时展示的文案：一级行业为「无上级（一级行业）」 */
  const lockedParentLabel = useMemo(() => {
    if (!form.lockParent) return undefined
    if (!form.defaultParentId) return '无上级（一级行业）'
    return list.find((item) => item.id === form.defaultParentId)?.name ?? '—'
  }, [form.lockParent, form.defaultParentId, list])

  const openEdit = (item: IndustryItem) => {
    setViewItem(null)
    setForm({ open: true, mode: 'edit', initial: item, defaultParentId: item.parentId, lockParent: false })
  }

  const handleSubmit = async (payload: IndustryPayload) => {
    try {
      if (form.mode === 'edit' && form.initial) {
        await updateIndustry(form.initial.id, payload)
      } else {
        await createIndustry(payload)
      }
      toast('保存成功')
      setForm((prev) => ({ ...prev, open: false }))
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    }
  }

  const handleConfirm = async () => {
    if (!confirm) return
    try {
      await updateIndustryStatus(confirm.item.id, confirm.target)
      toast(confirm.target === 'enabled' ? '启用成功' : '禁用成功')
      setConfirm(null)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  const handleExport = () => {
    toast(`导出任务已创建，共 ${rows.length} 条（原型模拟）`)
  }

  const columns: Column<IndustryItem>[] = [
    {
      key: 'code',
      title: '行业编码',
      width: 120,
      render: (row) => (
        <button className="link mono" onClick={() => setViewItem(row)}>
          {row.code}
        </button>
      ),
    },
    { key: 'name', title: '行业名称', width: 180 },
    { key: 'level', title: '行业层级', width: 90, render: (row) => levelText(row.level) },
    {
      key: 'sortNo',
      title: '排序号',
      width: 80,
      render: (row) => (row.sortNo == null ? '-' : String(row.sortNo)),
    },
    {
      key: 'status',
      title: '使用状态',
      width: 90,
      render: (row) => <Tag tone={useStatusTone[row.status]}>{useStatusText[row.status]}</Tag>,
    },
    {
      key: 'updatedAt',
      title: '最后修改时间',
      width: 140,
      render: (row) => <span className="nowrap">{row.updatedAt}</span>,
    },
    {
      key: 'actions',
      title: '操作',
      width: 140,
      render: (row) => (
        <span className="row-actions">
          <button className="link" onClick={() => setViewItem(row)}>
            查看
          </button>
          <button className="link" onClick={() => openEdit(row)}>
            编辑
          </button>
          <button
            className={row.status === 'enabled' ? 'link link-danger' : 'link'}
            onClick={() => setConfirm({ item: row, target: row.status === 'enabled' ? 'disabled' : 'enabled' })}
          >
            {row.status === 'enabled' ? '禁用' : '启用'}
          </button>
        </span>
      ),
    },
  ]

  /** 选中的是一级行业时才允许「新增下级行业」（仅两级） */
  const selectedItem = list.find((item) => item.id === selectedId)
  const canAddChild = !!selectedItem && selectedItem.level === 1

  return (
    <>
      <PageHeader
        breadcrumb={['后台管理', '基础库', '行业库']}
        title="行业库"
        description="轻量行业字典 · 左树 + 右表 + 弹窗；仅维护行业分类（一级 / 二级），行业参数由各模块按「适用行业」关联"
        actions={
          <Button variant="primary" onClick={() => openCreate(null, false)}>
            新增
          </Button>
        }
      />

      <div className="card workbench">
        <aside className="workbench-tree">
          <div className="workbench-tree-header">
            <span className="workbench-tree-title">行业树</span>
            <span className="toolbar-tip">两级</span>
          </div>
          <Tree
            data={treeData}
            selectedId={selectedId}
            defaultExpandedIds={expandedIds}
            onSelect={(node) => setSelectedId(node.id)}
          />
          <div className="workbench-tree-actions">
            <Button size="small" onClick={() => openCreate(null, true)}>
              + 新增一级行业
            </Button>
            {canAddChild && (
              <Button size="small" onClick={() => openCreate(selectedId, true)}>
                + 新增下级行业
              </Button>
            )}
          </div>
        </aside>

        <section className="workbench-main">
          {isRootSelected || !selectedItem ? (
            <>
              <div className="query-bar">
                <div className="query-item">
                  <span className="query-label">行业编码</span>
                  <Input
                    value={query.code}
                    placeholder="请输入"
                    onChange={(e) => setQuery((prev) => ({ ...prev, code: e.target.value }))}
                  />
                </div>
                <div className="query-item">
                  <span className="query-label">行业名称</span>
                  <Input
                    value={query.name}
                    placeholder="请输入"
                    onChange={(e) => setQuery((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="query-item">
                  <span className="query-label">使用状态</span>
                  <Select
                    value={query.status}
                    placeholder="全部"
                    options={[
                      { label: '启用', value: 'enabled' },
                      { label: '禁用', value: 'disabled' },
                    ]}
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

              <div className="toolbar">
                <div className="flex gap-sm">
                  <span className="toolbar-title">{selectedName}</span>
                  <span className="toolbar-tip">
                    共 {rows.length} 条 · 展示一级行业；点击左侧行业树节点查看该行业详情
                  </span>
                </div>
                <Button onClick={handleExport}>导出</Button>
              </div>

              <div className="workbench-table-wrap">
                <Table columns={columns} data={pagedRows} rowKey={(row) => row.id} loading={loading} />
              </div>

              <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
            </>
          ) : (
            <IndustryDetailPanel
              item={selectedItem}
              parentName={parentNameOf(list, selectedItem.parentId)}
              onOpenParent={setSelectedId}
              onEdit={openEdit}
              onToggleStatus={(item) =>
                setConfirm({ item, target: item.status === 'enabled' ? 'disabled' : 'enabled' })
              }
            />
          )}
        </section>
      </div>

      <IndustryViewModal
        open={!!viewItem}
        item={viewItem}
        parentName={viewItem ? parentNameOf(list, viewItem.parentId) : '-'}
        onClose={() => setViewItem(null)}
        onEdit={openEdit}
      />

      <IndustryFormModal
        open={form.open}
        mode={form.mode}
        initial={form.initial}
        defaultParentId={form.defaultParentId}
        lockParent={form.lockParent}
        lockedParentLabel={lockedParentLabel}
        parentOptions={parentOptions}
        resolveLevel={deriveIndustryLevel}
        onClose={() => setForm((prev) => ({ ...prev, open: false }))}
        onSubmit={handleSubmit}
      />

      <IndustryConfirmModal
        open={!!confirm}
        item={confirm?.item ?? null}
        target={confirm?.target ?? 'enabled'}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
      />
    </>
  )
}
