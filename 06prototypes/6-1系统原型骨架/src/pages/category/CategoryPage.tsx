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
import type { Column } from '@/shared/components'
import { createCategory, deriveLevel, fetchCategories, updateCategory, updateCategoryStatus } from '@/mock'
import type { CategoryPayload } from '@/mock'
import type { CategoryItem, EnableStatus, TreeOption } from '@/types'
import {
  CATEGORY_MAX_LEVEL,
  ROOT_ID,
  buildCategoryTree,
  collectDescendantIds,
  getDirectChildren,
  levelText,
} from '@/shared/utils/tree'
import CategoryFormModal from './CategoryFormModal'
import CategoryViewModal from './CategoryViewModal'
import CategoryConfirmModal from './CategoryConfirmModal'
import './CategoryPage.css'

const PAGE_SIZE = 20

interface QueryState {
  code: string
  name: string
  status: '' | EnableStatus
}

interface FormState {
  open: boolean
  mode: 'create' | 'edit'
  initial: CategoryItem | null
  defaultParentId: string | null
  lockParent: boolean
}

const EMPTY_QUERY: QueryState = { code: '', name: '', status: '' }

export default function CategoryPage() {
  const toast = useToast()
  const [list, setList] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string>(ROOT_ID)
  const [query, setQuery] = useState<QueryState>(EMPTY_QUERY)
  const [page, setPage] = useState(1)

  const [viewItem, setViewItem] = useState<CategoryItem | null>(null)
  const [confirm, setConfirm] = useState<{ item: CategoryItem; target: EnableStatus } | null>(null)
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
      setList(await fetchCategories())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const treeData = useMemo(() => buildCategoryTree(list), [list])
  const expandedIds = useMemo(() => collectExpandable(treeData), [treeData])

  const selectedName = useMemo(() => {
    if (selectedId === ROOT_ID) return '全部分类'
    return list.find((item) => item.id === selectedId)?.name ?? '全部分类'
  }, [list, selectedId])

  /**
   * 选中节点是否还能新增下级：层级未达上限（六级）时提供入口。
   * 选中「全部分类」不提供（新增一级分类另有常驻入口）。
   */
  const selectedLevel = useMemo(() => list.find((item) => item.id === selectedId)?.level ?? 0, [list, selectedId])
  const canAddChild = selectedId !== ROOT_ID && selectedLevel < CATEGORY_MAX_LEVEL

  const rows = useMemo(() => {
    const parentId = selectedId === ROOT_ID ? null : selectedId
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

  /**
   * 上级分类候选（分级树）：
   * - 层级未达上限（六级）的分类，**不限启用 / 禁用**；
   * - 编辑时排除自身及其全部下级，禁止形成环。
   */
  const parentOptions = useMemo<TreeOption[]>(() => {
    const excluded = new Set<string>()
    if (form.mode === 'edit' && form.initial) {
      excluded.add(form.initial.id)
      collectDescendantIds(list, form.initial.id).forEach((id) => excluded.add(id))
    }
    const usable = list.filter((item) => item.level < CATEGORY_MAX_LEVEL && !excluded.has(item.id))
    const byParent = new Map<string | null, CategoryItem[]>()
    usable.forEach((item) => {
      const key = item.parentId ?? null
      const arr = byParent.get(key) ?? []
      arr.push(item)
      byParent.set(key, arr)
    })
    const build = (parentId: string | null): TreeOption[] =>
      (byParent.get(parentId) ?? [])
        .sort(
          (a, b) =>
            a.level - b.level ||
            (a.sortNo ?? Number.MAX_SAFE_INTEGER) - (b.sortNo ?? Number.MAX_SAFE_INTEGER) ||
            a.code.localeCompare(b.code),
        )
        .map((item) => {
          const children = build(item.id)
          return {
            value: item.id,
            label: item.name,
            extra: item.code,
            children: children.length > 0 ? children : undefined,
          }
        })
    return build(null)
  }, [list, form.mode, form.initial])

  const parentName = (parentId: string | null) => {
    if (!parentId) return '-'
    return list.find((item) => item.id === parentId)?.name ?? '-'
  }

  const openCreate = (parentId: string | null, lockParent: boolean) => {
    setForm({ open: true, mode: 'create', initial: null, defaultParentId: parentId, lockParent })
  }

  /** 上级分类锁定时展示的文案：一级分类为「无上级（一级分类）」，否则为所选上级名称 */
  const lockedParentLabel = useMemo(() => {
    if (!form.lockParent) return undefined
    if (!form.defaultParentId) return '无上级（一级分类）'
    return list.find((item) => item.id === form.defaultParentId)?.name ?? '—'
  }, [form.lockParent, form.defaultParentId, list])

  const openEdit = (item: CategoryItem) => {
    setViewItem(null)
    setForm({ open: true, mode: 'edit', initial: item, defaultParentId: item.parentId, lockParent: false })
  }

  const handleSubmit = async (payload: CategoryPayload) => {
    try {
      if (form.mode === 'edit' && form.initial) {
        await updateCategory(form.initial.id, payload)
        toast('保存成功')
      } else {
        await createCategory(payload)
        toast('保存成功')
      }
      setForm((prev) => ({ ...prev, open: false }))
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    }
  }

  const handleConfirm = async () => {
    if (!confirm) return
    try {
      await updateCategoryStatus(confirm.item.id, confirm.target)
      toast(confirm.target === 'enabled' ? '启用成功' : '禁用成功')
      setConfirm(null)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  /** 查询：输入条件即时过滤；「搜索」按钮保留，点击执行一次当前条件筛选 */
  const handleSearch = () => {
    setPage(1)
    toast('查询完成')
  }

  const columns: Column<CategoryItem>[] = [
    {
      key: 'code',
      title: <span data-ann-target="category.col.code">分类编码</span>,
      width: 120,
      render: (row) => (
        <button
          className="link mono"
          data-ann-target="category.row.code"
          onClick={() => setViewItem(row)}
        >
          {row.code}
        </button>
      ),
    },
    { key: 'name', title: <span data-ann-target="category.col.name">分类名称</span>, width: 150 },
    {
      key: 'level',
      title: <span data-ann-target="category.col.level">分类层级</span>,
      width: 90,
      render: (row) => levelText(row.level),
    },
    {
      key: 'sortNo',
      title: <span data-ann-target="category.col.sortNo">排序号</span>,
      width: 80,
      render: (row) => (row.sortNo == null ? '-' : String(row.sortNo)),
    },
    {
      key: 'status',
      title: <span data-ann-target="category.col.status">使用状态</span>,
      width: 90,
      render: (row) => (
        <Tag tone={row.status === 'enabled' ? 'success' : 'default'}>
          {row.status === 'enabled' ? '启用' : '禁用'}
        </Tag>
      ),
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
          <button className="link" data-ann-target="category.row.view" onClick={() => setViewItem(row)}>
            查看
          </button>
          <button className="link" data-ann-target="category.row.edit" onClick={() => openEdit(row)}>
            编辑
          </button>
          {row.status === 'enabled' ? (
            <button
              className="link link-danger"
              data-ann-target="category.row.disable"
              onClick={() => setConfirm({ item: row, target: 'disabled' })}
            >
              禁用
            </button>
          ) : (
            <button
              className="link"
              data-ann-target="category.row.enable"
              onClick={() => setConfirm({ item: row, target: 'enabled' })}
            >
              启用
            </button>
          )}
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '产品库', '产品分类']}
        title={<span data-ann-target="category.page.global">产品分类</span>}
        actions={
          <Button variant="primary" data-ann-target="category.add.level1" onClick={() => openCreate(null, false)}>
            新增
          </Button>
        }
      />

      <div className="card workbench">
        <aside className="workbench-tree" data-ann-target="category.page.tree">
          <div className="workbench-tree-header">
            <span className="workbench-tree-title">分类树</span>
          </div>
          <Tree
            data={treeData}
            selectedId={selectedId}
            defaultExpandedIds={expandedIds}
            onSelect={(node) => setSelectedId(node.id)}
          />
          <div className="workbench-tree-actions">
            <Button size="small" data-ann-target="category.add.level1" onClick={() => openCreate(null, true)}>
              + 新增一级分类
            </Button>
            {canAddChild && (
              <Button size="small" data-ann-target="category.add.child" onClick={() => openCreate(selectedId, true)}>
                + 新增下级分类
              </Button>
            )}
          </div>
        </aside>

        <section className="workbench-main">
          <div className="query-bar" data-ann-target="category.query.bar">
            <div className="query-item">
              <span className="query-label">分类编码</span>
              <Input
                value={query.code}
                placeholder="请输入"
                onChange={(e) => setQuery((prev) => ({ ...prev, code: e.target.value }))}
              />
            </div>
            <div className="query-item">
              <span className="query-label">分类名称</span>
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
              <Button data-ann-target="category.query.reset" onClick={() => setQuery(EMPTY_QUERY)}>
                重置
              </Button>
              <Button variant="primary" data-ann-target="category.query.search" onClick={handleSearch}>
                搜索
              </Button>
            </div>
          </div>

          <div className="toolbar">
            <div className="flex gap-sm">
              <span className="toolbar-title">{selectedName}</span>
              <span className="toolbar-tip">共 {rows.length} 条</span>
            </div>
          </div>

          <div className="workbench-table-wrap" data-ann-target="category.page.list">
            <Table columns={columns} data={pagedRows} rowKey={(row) => row.id} loading={loading} />
          </div>

          <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
        </section>
      </div>

      <CategoryViewModal
        open={!!viewItem}
        item={viewItem}
        parentName={viewItem ? parentName(viewItem.parentId) : '-'}
        onClose={() => setViewItem(null)}
        onEdit={openEdit}
      />

      <CategoryFormModal
        open={form.open}
        mode={form.mode}
        initial={form.initial}
        defaultParentId={form.defaultParentId}
        lockParent={form.lockParent}
        lockedParentLabel={lockedParentLabel}
        parentOptions={parentOptions}
        resolveLevel={deriveLevel}
        onClose={() => setForm((prev) => ({ ...prev, open: false }))}
        onSubmit={handleSubmit}
      />

      <CategoryConfirmModal
        open={!!confirm}
        item={confirm?.item ?? null}
        target={confirm?.target ?? 'enabled'}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
      />
    </>
  )
}
