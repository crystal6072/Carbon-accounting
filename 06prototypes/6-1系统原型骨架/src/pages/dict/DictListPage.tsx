import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, FormField, Input, Modal, PageHeader, Table, Tag, Textarea, useToast } from '@/shared/components'
import type { Column, TagTone } from '@/shared/components'
import {
  createDictItem,
  createDictType,
  deleteDictItem,
  fetchDictItems,
  fetchDictTypes,
  updateDictItem,
  updateDictItemStatus,
} from '@/mock'
import type { DictItemPayload, DictTypePayload } from '@/mock'
import type { DictItem, DictType, EnableStatus } from '@/types'
import './DictPage.css'

const useStatusText: Record<EnableStatus, string> = { enabled: '启用', disabled: '禁用' }
const useStatusTone: Record<EnableStatus, TagTone> = { enabled: 'success', disabled: 'default' }

/** 新增字典项排序号默认值上限 */
const SORT_MAX = 999

interface ItemFormState {
  open: boolean
  mode: 'create' | 'edit'
  initial: DictItem | null
}

const EMPTY_QUERY = { code: '', label: '' }

/**
 * 组织与权限 · 数据字典：字典类型（左）+ 字典项（右）的轻量维护。
 * 本期内置「系统边界」类型，其字典项（大门到大门 / 摇篮到大门 / 摇篮到坟墓）供
 * 前台「核算边界」下拉与生命周期阶段「适用系统边界」复选引用。
 */
export default function DictListPage() {
  const toast = useToast()

  const [types, setTypes] = useState<DictType[]>([])
  const [activeTypeId, setActiveTypeId] = useState('')
  const [items, setItems] = useState<DictItem[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState(EMPTY_QUERY)

  const [itemForm, setItemForm] = useState<ItemFormState>({ open: false, mode: 'create', initial: null })
  const [typeFormOpen, setTypeFormOpen] = useState(false)
  const [typeForm, setTypeForm] = useState({ code: '', name: '', remark: '' })
  const [typeErrors, setTypeErrors] = useState<Record<string, string>>({})
  const [typeSubmitting, setTypeSubmitting] = useState(false)
  const [form, setForm] = useState({ code: '', label: '', sort: '', remark: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [confirm, setConfirm] = useState<{ item: DictItem; mode: 'enable' | 'disable' | 'delete' } | null>(null)

  const activeType = useMemo(() => types.find((item) => item.id === activeTypeId) ?? null, [types, activeTypeId])

  /** 字典项列表（按当前激活字典类型加载） */
  const reload = useCallback(async () => {
    if (!activeTypeId) {
      setItems([])
      return
    }
    setLoading(true)
    try {
      setItems(await fetchDictItems(activeTypeId))
    } finally {
      setLoading(false)
    }
  }, [activeTypeId])

  useEffect(() => {
    void (async () => {
      const list = await fetchDictTypes()
      setTypes(list)
      if (list.length > 0) setActiveTypeId((prev) => prev || list[0].id)
    })()
  }, [])

  useEffect(() => {
    setQuery(EMPTY_QUERY)
    void reload()
  }, [reload])

  const rows = useMemo(() => {
    let data = items
    if (query.code.trim()) {
      const keyword = query.code.trim().toLowerCase()
      data = data.filter((item) => item.code.toLowerCase().includes(keyword))
    }
    if (query.label.trim()) data = data.filter((item) => item.label.includes(query.label.trim()))
    return data
  }, [items, query])

  const openCreate = () => {
    const maxSort = items.reduce((acc, item) => Math.max(acc, item.sort), 0)
    setForm({ code: '', label: '', sort: String(Math.min(maxSort + 10, SORT_MAX)), remark: '' })
    setErrors({})
    setItemForm({ open: true, mode: 'create', initial: null })
  }

  const openEdit = (item: DictItem) => {
    setForm({ code: item.code, label: item.label, sort: String(item.sort), remark: item.remark })
    setErrors({})
    setItemForm({ open: true, mode: 'edit', initial: item })
  }

  const handleSubmit = async () => {
    const next: Record<string, string> = {}
    const sort = Number(form.sort)
    if (!form.code.trim()) next.code = '请输入字典项编码'
    if (!form.label.trim()) next.label = '请输入字典项名称'
    if (form.sort.trim() === '' || !Number.isInteger(sort) || sort < 0) {
      next.sort = '请输入不小于 0 的整数'
    }
    setErrors(next)
    if (Object.keys(next).length > 0) {
      toast('请先完善必填项', 'error')
      return
    }

    const payload: DictItemPayload = {
      typeId: activeTypeId,
      code: form.code.trim(),
      label: form.label.trim(),
      sort,
      remark: form.remark.trim(),
    }

    setSubmitting(true)
    try {
      if (itemForm.mode === 'edit' && itemForm.initial) {
        await updateDictItem(itemForm.initial.id, payload)
      } else {
        await createDictItem(payload)
      }
      toast('保存成功')
      setItemForm((prev) => ({ ...prev, open: false }))
      await reload()
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirm = async () => {
    if (!confirm) return
    try {
      if (confirm.mode === 'delete') {
        await deleteDictItem(confirm.item.id)
        toast('删除成功')
      } else {
        await updateDictItemStatus(confirm.item.id, confirm.mode === 'enable' ? 'enabled' : 'disabled')
        toast(confirm.mode === 'enable' ? '启用成功' : '禁用成功')
      }
      setConfirm(null)
      await reload()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  const openTypeCreate = () => {
    setTypeForm({ code: '', name: '', remark: '' })
    setTypeErrors({})
    setTypeFormOpen(true)
  }

  const handleTypeSubmit = async () => {
    const next: Record<string, string> = {}
    if (!typeForm.code.trim()) next.code = '请输入字典类型编码'
    if (!typeForm.name.trim()) next.name = '请输入字典类型名称'
    setTypeErrors(next)
    if (Object.keys(next).length > 0) {
      toast('请先完善必填项', 'error')
      return
    }
    const payload: DictTypePayload = {
      code: typeForm.code.trim(),
      name: typeForm.name.trim(),
      remark: typeForm.remark.trim(),
    }
    setTypeSubmitting(true)
    try {
      const created = await createDictType(payload)
      toast('字典类型已创建')
      setTypeFormOpen(false)
      const list = await fetchDictTypes()
      setTypes(list)
      setActiveTypeId(created.id)
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setTypeSubmitting(false)
    }
  }

  const columns: Column<DictItem>[] = [
    {
      key: 'code',
      title: '字典项编码',
      width: 160,
      render: (row) => <span className="mono">{row.code}</span>,
    },
    { key: 'label', title: '字典项名称', width: 160 },
    { key: 'sort', title: '排序号', width: 80, render: (row) => String(row.sort) },
    {
      key: 'remark',
      title: '说明',
      render: (row) => <span className="dict-remark">{row.remark || '-'}</span>,
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
      width: 150,
      render: (row) => <span className="nowrap">{row.updatedAt}</span>,
    },
    {
      key: 'actions',
      title: '操作',
      width: 150,
      render: (row) => (
        <span className="row-actions">
          <button className="link" onClick={() => openEdit(row)}>
            编辑
          </button>
          <button
            className={row.status === 'enabled' ? 'link link-danger' : 'link'}
            onClick={() => setConfirm({ item: row, mode: row.status === 'enabled' ? 'disable' : 'enable' })}
          >
            {row.status === 'enabled' ? '禁用' : '启用'}
          </button>
          <button className="link link-danger" onClick={() => setConfirm({ item: row, mode: 'delete' })}>
            删除
          </button>
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '组织与权限', '数据字典']}
        title="数据字典"
        description="平台级枚举口径维护：字典类型 + 字典项；「系统边界」字典供核算边界与生命周期阶段引用，「租户类型」字典供租户开户类型枚举引用"
      />

      <div className="card dict-workbench">
        <aside className="dict-types">
          <div className="dict-types-header">
            <span className="dict-types-title">字典类型</span>
            <span className="toolbar-tip">共 {types.length} 类</span>
          </div>
          <div style={{ padding: '0 0 var(--space-xs)' }}>
            <Button onClick={openTypeCreate}>新增类型</Button>
          </div>
          <ul className="dict-type-list">
            {types.map((type) => (
              <li key={type.id}>
                <button
                  className={['dict-type-btn', type.id === activeTypeId ? 'is-active' : ''].filter(Boolean).join(' ')}
                  onClick={() => setActiveTypeId(type.id)}
                >
                  <span className="dict-type-name">
                    {type.name}
                    {type.builtin && <Tag tone="info">内置</Tag>}
                  </span>
                  <span className="dict-type-code">{type.code}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="dict-main">
          <div className="query-bar">
            <div className="query-item">
              <span className="query-label">字典项编码</span>
              <Input
                value={query.code}
                placeholder="请输入"
                onChange={(e) => setQuery((prev) => ({ ...prev, code: e.target.value }))}
              />
            </div>
            <div className="query-item">
              <span className="query-label">字典项名称</span>
              <Input
                value={query.label}
                placeholder="请输入"
                onChange={(e) => setQuery((prev) => ({ ...prev, label: e.target.value }))}
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
              <span className="toolbar-title">{activeType?.name ?? '字典项'}</span>
              <span className="toolbar-tip">
                共 {rows.length} 项
                {activeType?.remark ? ` · ${activeType.remark}` : ''}
              </span>
            </div>
            <Button variant="primary" disabled={!activeTypeId} onClick={openCreate}>
              新增字典项
            </Button>
          </div>

          <div className="dict-table-wrap">
            <Table columns={columns} data={rows} rowKey={(row) => row.id} loading={loading} />
          </div>
        </section>
      </div>

      <Modal
        open={itemForm.open}
        title={itemForm.mode === 'edit' ? '编辑字典项' : '新增字典项'}
        onClose={() => setItemForm((prev) => ({ ...prev, open: false }))}
        footer={
          <>
            <Button onClick={() => setItemForm((prev) => ({ ...prev, open: false }))}>取消</Button>
            <Button variant="primary" disabled={submitting} onClick={handleSubmit}>
              {submitting ? '保存中…' : '保存'}
            </Button>
          </>
        }
      >
        <div className="dict-item-form">
          <FormField label="所属字典类型">
            <Input value={activeType ? `${activeType.name}（${activeType.code}）` : '-'} readOnly />
          </FormField>
          <FormField label="字典项编码" required error={errors.code} hint="同一字典类型下唯一，一经使用建议不再修改">
            <Input
              value={form.code}
              placeholder="如 gate_to_gate"
              invalid={!!errors.code}
              onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
            />
          </FormField>
          <FormField label="字典项名称" required error={errors.label}>
            <Input
              value={form.label}
              placeholder="如 大门到大门"
              invalid={!!errors.label}
              onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
            />
          </FormField>
          <FormField label="排序号" required error={errors.sort}>
            <Input
              type="number"
              min={0}
              value={form.sort}
              placeholder="数值越小越靠前"
              invalid={!!errors.sort}
              onChange={(e) => setForm((prev) => ({ ...prev, sort: e.target.value }))}
            />
          </FormField>
          <FormField label="说明">
            <Textarea
              value={form.remark}
              rows={2}
              maxLength={200}
              placeholder="选填，如口径 / 英文名"
              onChange={(e) => setForm((prev) => ({ ...prev, remark: e.target.value }))}
            />
          </FormField>
        </div>
      </Modal>

      <Modal
        open={typeFormOpen}
        title="新增字典类型"
        onClose={() => setTypeFormOpen(false)}
        footer={
          <>
            <Button onClick={() => setTypeFormOpen(false)}>取消</Button>
            <Button variant="primary" disabled={typeSubmitting} onClick={handleTypeSubmit}>
              {typeSubmitting ? '保存中…' : '保存'}
            </Button>
          </>
        }
      >
        <div className="dict-item-form">
          <FormField label="字典类型编码" required error={typeErrors.code} hint="全局唯一，大写字母开头，仅含大写字母 / 数字 / 下划线">
            <Input
              value={typeForm.code}
              placeholder="如 TENANT_TYPE"
              invalid={!!typeErrors.code}
              onChange={(e) => setTypeForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
            />
          </FormField>
          <FormField label="字典类型名称" required error={typeErrors.name}>
            <Input
              value={typeForm.name}
              placeholder="如 租户类型"
              invalid={!!typeErrors.name}
              onChange={(e) => setTypeForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </FormField>
          <FormField label="说明">
            <Textarea
              value={typeForm.remark}
              rows={2}
              maxLength={200}
              placeholder="选填，描述取值口径与引用方"
              onChange={(e) => setTypeForm((prev) => ({ ...prev, remark: e.target.value }))}
            />
          </FormField>
        </div>
      </Modal>

      <Modal
        open={!!confirm}
        title={confirm?.mode === 'delete' ? '确认删除' : confirm?.mode === 'enable' ? '确认启用' : '确认禁用'}
        size="sm"
        onClose={() => setConfirm(null)}
        footer={
          <>
            <Button onClick={() => setConfirm(null)}>取消</Button>
            <Button variant={confirm?.mode === 'delete' ? 'danger' : 'primary'} onClick={handleConfirm}>
              {confirm?.mode === 'delete' ? '删除' : confirm?.mode === 'enable' ? '启用' : '禁用'}
            </Button>
          </>
        }
      >
        <div className="modal-confirm-text">
          确认将字典项「{confirm?.item.label}」（{confirm?.item.code}）
          {confirm?.mode === 'delete' ? '删除' : confirm?.mode === 'enable' ? '启用' : '禁用'}？
          {confirm?.mode === 'delete' && (
            <div className="modal-confirm-tip">删除后不可恢复；已被生命周期阶段引用的字典项将被阻断删除。</div>
          )}
          {confirm?.mode === 'disable' && (
            <div className="modal-confirm-tip">禁用后该字典项不再出现在前台「核算边界」与阶段「适用系统边界」下拉中。</div>
          )}
        </div>
      </Modal>
    </>
  )
}
