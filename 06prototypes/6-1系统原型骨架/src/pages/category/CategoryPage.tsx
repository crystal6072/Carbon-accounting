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
import { createCategory, deriveLevel, fetchCategories, updateCategory, updateCategoryStatus } from '@/mock'
import type { CategoryPayload } from '@/mock'
import type { CategoryItem, EnableStatus } from '@/types'
import { ROOT_ID, buildCategoryTree, collectDescendantIds, getDirectChildren, levelText } from '@/shared/utils/tree'
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

  const parentOptions = useMemo<SelectOption[]>(() => {
    const excluded = new Set<string>()
    if (form.mode === 'edit' && form.initial) {
      excluded.add(form.initial.id)
      collectDescendantIds(list, form.initial.id).forEach((id) => excluded.add(id))
    }
    return list
      .filter((item) => item.level < 3 && item.status === 'enabled' && !excluded.has(item.id))
      .sort((a, b) => a.level - b.level || (a.sortNo ?? 9999) - (b.sortNo ?? 9999))
      .map((item) => ({
        label: `${'　'.repeat(item.level - 1)}${item.name}（${item.code}）`,
        value: item.id,
      }))
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

  const handleExport = () => {
    toast(`导出任务已创建，共 ${rows.length} 条（原型模拟）`)
  }

  const columns: Column<CategoryItem>[] = [
    {
      key: 'code',
      title: '分类编码',
      width: 120,
      render: (row) => (
        <button className="link mono" onClick={() => setViewItem(row)}>
          {row.code}
        </button>
      ),
    },
    { key: 'name', title: '分类名称', width: 150 },
    { key: 'level', title: '分类层级', width: 90, render: (row) => levelText(row.level) },
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
          <button className="link" onClick={() => setViewItem(row)}>
            查看
          </button>
          <button className="link" onClick={() => openEdit(row)}>
            编辑
          </button>
          <button
            className={row.status === 'enabled' ? 'link link-danger' : 'link'}
            onClick={() =>
              setConfirm({ item: row, target: row.status === 'enabled' ? 'disabled' : 'enabled' })
            }
          >
            {row.status === 'enabled' ? '禁用' : '启用'}
          </button>
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        breadcrumb={['后台管理', '产品库', '产品分类']}
        title="产品分类"
        description="轻量配置 · 左树 + 右表 + 弹窗；V0.1 不提供删除与导入入口"
        actions={
          <Button variant="primary" onClick={() => openCreate(null, false)}>
            新增
          </Button>
        }
      />

      <div className="card workbench">
        <aside className="workbench-tree">
          <div className="workbench-tree-header">
            <span className="workbench-tree-title">分类树</span>
            <span className="toolbar-tip">三级</span>
          </div>
          <Tree
            data={treeData}
            selectedId={selectedId}
            defaultExpandedIds={expandedIds}
            onSelect={(node) => setSelectedId(node.id)}
          />
          <div className="workbench-tree-actions">
            <Button size="small" onClick={() => openCreate(null, true)}>
              + 新增一级分类
            </Button>
            {selectedId !== ROOT_ID && (
              <Button size="small" onClick={() => openCreate(selectedId, true)}>
                + 新增下级分类
              </Button>
            )}
          </div>
        </aside>

        <section className="workbench-main">
          <div className="query-bar">
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
              <Button onClick={() => setQuery(EMPTY_QUERY)}>重置</Button>
              <Button variant="primary" onClick={() => toast('查询完成')}>
                搜索
              </Button>
            </div>
          </div>

          <div className="toolbar">
            <div className="flex gap-sm">
              <span className="toolbar-title">{selectedName}</span>
              <span className="toolbar-tip">共 {rows.length} 条 · 展示所选节点的直接子级【待确认】</span>
            </div>
            <Button onClick={handleExport}>导出</Button>
          </div>

          <div className="workbench-table-wrap">
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
