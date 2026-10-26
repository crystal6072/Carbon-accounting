import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, FormField, Input, Modal, PageHeader, Select, Tag, Textarea, useToast } from '@/shared/components'
import type { SelectOption } from '@/shared/components'
import {
  createFactorLibrary,
  deleteFactorLibrary,
  fetchFactorLibraries,
  offlineFactorLibrary,
  onlineFactorLibrary,
  updateFactorLibrary,
} from '@/mock'
import type { FactorLibrary, FactorLibraryType } from '@/types'
import { libraryStatusText, libraryStatusTone, libraryTypeSubText, libraryTypeText, libraryTypeTone, resolveLibraryStatus } from './factorMeta'
import './FactorPage.css'

interface LibFormState {
  name: string
  type: FactorLibraryType
  maintainer: string
  description: string
}

const EMPTY_FORM: LibFormState = { name: '', type: 'builtin', maintainer: '平台运营', description: '' }

/**
 * 后台 · 因子库管理（多库模型）：
 * 因子库列表（库来源：商业数据库 / 自建库），支持新建库 / 编辑 / 删除 / 进入库详情。
 * 交互采用「库列表 → 库详情」层级导航，以支撑库数量持续增长（不用顶部 Tab 切库）。
 */
export default function BackendLibraryListPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [list, setList] = useState<FactorLibrary[]>([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [type, setType] = useState<'' | FactorLibraryType>('')
  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; library: FactorLibrary | null } | null>(null)
  const [form, setForm] = useState<LibFormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setList(await fetchFactorLibraries())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const rows = useMemo(() => {
    const text = keyword.trim().toLowerCase()
    return list.filter((item) => {
      if (type && item.type !== type) return false
      if (!text) return true
      return item.name.toLowerCase().includes(text) || item.code.toLowerCase().includes(text)
    })
  }, [list, keyword, type])

  const typeOptions: SelectOption[] = [
    { label: '商业数据库', value: 'external' },
    { label: '自建库', value: 'builtin' },
  ]

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setModal({ mode: 'create', library: null })
  }

  const openEdit = (library: FactorLibrary) => {
    setForm({ name: library.name, type: library.type, maintainer: library.maintainer, description: library.description })
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
        await updateFactorLibrary(modal.library.id, {
          name: form.name,
          maintainer: form.maintainer,
          description: form.description,
        })
        toast('保存成功')
      } else {
        await createFactorLibrary(form)
        toast('新建成功，已自动创建草稿版本 V1.0')
      }
      setModal(null)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (library: FactorLibrary) => {
    if (!window.confirm(`确认删除因子库「${library.name}」？将同时删除其全部版本与库内因子，不可恢复。`)) return
    try {
      await deleteFactorLibrary(library.id)
      toast('删除成功')
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    }
  }

  /** 整库下架 / 上架（前台不可见 / 恢复可见；不改变库内版本状态） */
  const handleToggleOffline = async (library: FactorLibrary) => {
    if (library.offline) {
      if (!window.confirm(`确认上架因子库「${library.name}」？上架后前台恢复可见并参与因子匹配。`)) return
      try {
        await onlineFactorLibrary(library.id)
        toast('已上架，前台可见')
        await load()
      } catch (error) {
        toast(error instanceof Error ? error.message : '上架失败', 'error')
      }
      return
    }
    if (
      !window.confirm(
        `确认下架因子库「${library.name}」？下架后前台不可见、不参与因子匹配；库数据与版本保留，可随时重新上架。`,
      )
    )
      return
    try {
      await offlineFactorLibrary(library.id)
      toast('已下架，前台不可见')
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '下架失败', 'error')
    }
  }

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '模型管理', '因子库管理']}
        title={<span data-ann-target="factor.page.global">因子库管理</span>}
        description="平台可维护多个因子库：商业数据库（整库导入、库内只读、带 ISIC 门类分类）+ 自建库（可维护）；发布后前台可见。"
        actions={
          <Button variant="primary" data-ann-target="factor.add" onClick={openCreate}>
            新建因子库
          </Button>
        }
      />

      <div className="card">
        <div className="query-bar" data-ann-target="factor.query.bar">
          <div className="query-item">
            <span className="query-label">库名称 / 编码</span>
            <Input value={keyword} placeholder="请输入" onChange={(e) => setKeyword(e.target.value)} />
          </div>
          <div className="query-item">
            <span className="query-label">库来源</span>
            <Select
              value={type}
              placeholder="全部"
              options={typeOptions}
              onChange={(e) => setType(e.target.value as '' | FactorLibraryType)}
            />
          </div>
          <div className="query-actions">
            <Button
              onClick={() => {
                setKeyword('')
                setType('')
              }}
            >
              重置
            </Button>
            <Button variant="primary" onClick={() => toast('查询完成')}>
              搜索
            </Button>
          </div>
        </div>
      </div>

      <div className="factor-lib-grid" data-ann-target="factor.page.list">
        {loading && <div className="empty">加载中…</div>}
        {!loading && rows.length === 0 && <div className="empty">暂无因子库</div>}
        {!loading &&
          rows.map((library) => (
            <div className="factor-lib-card" key={library.id}>
              <div className="factor-lib-head">
                <button className="factor-lib-name link" onClick={() => navigate(`/model/factor-lib/${library.id}`)}>
                  {library.name}
                </button>
                <span data-ann-target="factor.library.type">
                  <Tag tone={libraryTypeTone[library.type]}>{libraryTypeText[library.type]}</Tag>
                </span>
              </div>
              <div className="factor-lib-code mono">{library.code}</div>
              <div className="factor-lib-desc">{library.description || '-'}</div>
              <div className="factor-lib-meta">
                <span>维护方：{library.maintainer}</span>
                <span>版本数：{library.versionCount}</span>
                <span>因子数：{library.factorCount}</span>
                <span data-ann-target="factor.library.status">
                  <Tag tone={libraryStatusTone[resolveLibraryStatus(library)]}>
                    {libraryStatusText[resolveLibraryStatus(library)]}
                  </Tag>
                </span>
              </div>
              <div className="factor-lib-meta factor-lib-sub">
                <span>{libraryTypeSubText[library.type]}</span>
                <span>更新：{library.updatedAt}</span>
              </div>
              <div className="factor-lib-actions">
                <button className="link" onClick={() => navigate(`/model/factor-lib/${library.id}`)}>
                  查看
                </button>
                <button className="link" data-ann-target="factor.row.edit" onClick={() => openEdit(library)}>
                  编辑
                </button>
                {library.currentVersionId && !library.offline && (
                  <button className="link" data-ann-target="factor.row.offline" onClick={() => void handleToggleOffline(library)}>
                    下架
                  </button>
                )}
                {library.offline && (
                  <>
                    <button className="link" data-ann-target="factor.row.online" onClick={() => void handleToggleOffline(library)}>
                      上架
                    </button>
                    <button className="link link-danger" data-ann-target="factor.row.delete" onClick={() => handleDelete(library)}>
                      删除
                    </button>
                  </>
                )}
                {!library.currentVersionId && (
                  <button className="link link-danger" data-ann-target="factor.row.delete" onClick={() => handleDelete(library)}>
                    删除
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>

      <Modal
        open={!!modal}
        title={modal?.mode === 'edit' ? '编辑因子库' : '新建因子库'}
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
          <FormField label="库名称" required>
            <Input
              value={form.name}
              placeholder="如 Ecoinvent 3.11 / 中国官方排放因子库"
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </FormField>
          <FormField label="库来源" required hint={libraryTypeSubText[form.type]}>
            <Select
              value={form.type}
              options={typeOptions}
              disabled={modal?.mode === 'edit'}
              onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as FactorLibraryType }))}
            />
          </FormField>
          <FormField label="维护方">
            <Input
              value={form.maintainer}
              placeholder="如 平台运营 / Ecoinvent"
              onChange={(e) => setForm((prev) => ({ ...prev, maintainer: e.target.value }))}
            />
          </FormField>
          <FormField label="库描述" full>
            <Textarea
              rows={3}
              value={form.description}
              placeholder="请输入"
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            />
          </FormField>
        </div>
      </Modal>
    </>
  )
}
