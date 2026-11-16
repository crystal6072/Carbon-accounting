import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, FormField, Input, Modal, PageHeader, Textarea, useToast } from '@/shared/components'
import { createMyFactorLibrary, deleteMyFactorLibrary, fetchMyFactorLibraries, updateMyFactorLibrary } from '@/mock'
import type { MyFactorLibrary } from '@/types'
import './FactorPage.css'

/**
 * 前台 · 我的因子库：本组织私有的因子库集合（仅本人 / 本组织可见，不发布）。
 * 因子来源 = 手工新增 + 从已发布库收藏的副本。
 */
export default function MyFactorLibraryListPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [list, setList] = useState<MyFactorLibrary[]>([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; library: MyFactorLibrary | null } | null>(null)
  const [form, setForm] = useState({ name: '', description: '' })
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setList(await fetchMyFactorLibraries())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setForm({ name: '', description: '' })
    setModal({ mode: 'create', library: null })
  }

  const openEdit = (library: MyFactorLibrary) => {
    setForm({ name: library.name, description: library.description })
    setModal({ mode: 'edit', library })
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast('请输入库名称', 'error')
      return
    }
    setSubmitting(true)
    try {
      if (modal?.mode === 'edit' && modal.library) {
        await updateMyFactorLibrary(modal.library.id, form)
        toast('保存成功')
      } else {
        await createMyFactorLibrary(form.name, form.description)
        toast('新建成功')
      }
      setModal(null)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (library: MyFactorLibrary) => {
    if (!window.confirm(`确认删除「${library.name}」？库内因子副本将一并删除。`)) return
    try {
      await deleteMyFactorLibrary(library.id)
      toast('删除成功')
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    }
  }

  return (
    <>
      <PageHeader
        breadcrumb={['产品碳足迹', '因子管理', '我的因子库']}
        title={<span data-ann-target="pcf-factor.mylib.list">我的因子库</span>}
        actions={
          <Button variant="primary" onClick={openCreate} data-ann-target="pcf-factor.mylib.add">
            新建我的因子库
          </Button>
        }
      />

      <div className="factor-lib-grid">
        {loading && <div className="empty">加载中…</div>}
        {!loading && list.length === 0 && <div className="empty">暂无「我的因子库」，点击右上角新建</div>}
        {!loading &&
          list.map((library) => (
            <div className="factor-lib-card" key={library.id}>
              <div className="factor-lib-head">
                <button className="factor-lib-name link" onClick={() => navigate(`/pcf/my-factor/${library.id}`)}>
                  {library.name}
                </button>
              </div>
              <div className="factor-lib-desc">{library.description || '-'}</div>
              <div className="factor-lib-meta">
                <span>因子数：{library.factorCount}</span>
                <span>更新：{library.updatedAt}</span>
              </div>
              <div className="factor-lib-actions" data-ann-target="pcf-factor.mylib.card">
                <button className="link" onClick={() => navigate(`/pcf/my-factor/${library.id}`)}>
                  查看
                </button>
                <button className="link" onClick={() => openEdit(library)}>
                  重命名
                </button>
                <button className="link link-danger" onClick={() => handleDelete(library)}>
                  删除
                </button>
              </div>
            </div>
          ))}
      </div>

      <Modal
        open={!!modal}
        title={modal?.mode === 'edit' ? '编辑我的因子库' : '新建我的因子库'}
        onClose={() => setModal(null)}
        footer={
          <>
            <Button onClick={() => setModal(null)}>取消</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? '保存中…' : '保存'}
            </Button>
          </>
        }
      >
        <div className="form-grid">
          <FormField label="库名称" required full>
            <Input value={form.name} placeholder="如 熊宝组织因子库" onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
          </FormField>
          <FormField label="库描述" full>
            <Textarea rows={3} value={form.description} placeholder="请输入" onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
          </FormField>
        </div>
      </Modal>
    </>
  )
}
