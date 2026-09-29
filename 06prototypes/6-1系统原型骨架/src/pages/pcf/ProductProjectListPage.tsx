import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, FormField, Input, Modal, PageHeader, Select, Tag, Textarea, useToast } from '@/shared/components'
import {
  deletePcfProject,
  fetchCategories,
  fetchIndustryOptions,
  fetchMyProduct,
  fetchPcfProjectsByProduct,
  fetchProduct,
  fetchUnitOptions,
  updateMyProduct,
  updateProduct,
} from '@/mock'
import type { CategoryItem, MyProductSource, PcfProject, ProductItem } from '@/types'
import {
  PCF_BOUNDARY_TEXT,
  PCF_STATUS_TEXT,
  PCF_STATUS_TONE,
  canDelete,
  pcfProductLabel,
} from './pcfMeta'
import './PcfPage.css'

/** 产品档案解析：我的产品库（自建 / 引用）优先，其次平台产品库 */
interface ResolvedProduct {
  product: ProductItem
  /** 来源库：我的产品库 / 平台产品库 */
  kind: 'my' | 'library'
  /** 我的产品库内的来源二态（平台产品库为空） */
  source: MyProductSource | ''
}

async function resolveProduct(id: string): Promise<ResolvedProduct> {
  try {
    const my = await fetchMyProduct(id)
    return { product: my, kind: 'my', source: my.source }
  } catch {
    const lib = await fetchProduct(id)
    return { product: lib, kind: 'library', source: '' }
  }
}

/** 产品来源展示文案 */
const SOURCE_TEXT: Record<string, string> = {
  custom: '自己新增',
  referenced: '引用平台产品',
  library: '平台产品库',
}

/**
 * 产品核算记录（核算列表第二层，对齐竞品「产品详情」形态）：
 * 左侧产品基本信息面板 + 右侧该产品的核算记录卡片列表 + 顶部「新增核算」。
 * 一个产品可进行多次核算（1 : N），每次核算对应一条记录。
 */
export default function ProductProjectListPage() {
  const { productId = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [product, setProduct] = useState<ProductItem | null>(null)
  const [resolved, setResolved] = useState<ResolvedProduct | null>(null)
  const [categoryName, setCategoryName] = useState('-')
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [unitOptions, setUnitOptions] = useState<string[]>([])
  const [industryOptions, setIndustryOptions] = useState<string[]>([])
  const [projects, setProjects] = useState<PcfProject[]>([])
  const [loading, setLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<PcfProject | null>(null)
  /* 产品信息修改（弹窗编辑） */
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    categoryId: '',
    model: '',
    spec: '',
    unit: '',
    industry: '',
    imageUrl: '',
    description: '',
  })
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})
  const [editSaving, setEditSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [resolvedItem, projectList] = await Promise.all([
        resolveProduct(productId),
        fetchPcfProjectsByProduct(productId),
      ])
      setProduct(resolvedItem.product)
      setResolved(resolvedItem)
      setProjects(projectList)
      const categoryList = await fetchCategories()
      setCategories(categoryList)
      setCategoryName(categoryList.find((c) => c.id === resolvedItem.product.categoryId)?.name ?? '-')
    } catch (error) {
      toast(error instanceof Error ? error.message : '产品不存在或已被删除', 'error')
      navigate('/pcf/project', { replace: true })
    } finally {
      setLoading(false)
    }
  }, [productId, navigate, toast])

  useEffect(() => {
    void load()
  }, [load])

  /**
   * 新增核算：进入草稿工作台 `/pcf/project/new/:productId`。
   * 草稿仅在内存中（不写入数据），步骤①点击「保存」才落库创建正式核算项目；
   * 未保存直接「返回」不产生任何核算记录。
   */
  const handleCreate = () => {
    if (!product) return
    navigate(`/pcf/project/new/${product.id}`)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deletePcfProject(deleteTarget.id)
      toast('删除成功')
      setDeleteTarget(null)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  /* ---------- 产品信息修改（弹窗编辑，工艺与工序组合保持不变） ---------- */

  const openEdit = async () => {
    if (!product) return
    setEditForm({
      name: product.name,
      categoryId: product.categoryId,
      model: product.model,
      spec: product.spec,
      unit: product.unit,
      industry: product.industry,
      imageUrl: product.imageUrl,
      description: product.description,
    })
    setEditErrors({})
    setEditOpen(true)
    if (!unitOptions.length) setUnitOptions(await fetchUnitOptions())
    if (!industryOptions.length) setIndustryOptions(await fetchIndustryOptions())
  }

  const validateEdit = (): boolean => {
    const errors: Record<string, string> = {}
    if (!editForm.name.trim()) errors.name = '请填写产品名称'
    if (!editForm.categoryId) errors.categoryId = '请选择产品分类'
    if (!editForm.unit) errors.unit = '请选择计量单位'
    setEditErrors(errors)
    if (Object.keys(errors).length) {
      toast(`请先完善 ${Object.keys(errors).length} 项必填信息`, 'error')
      return false
    }
    return true
  }

  /** 我的产品库 · 自己新增 → 走 updateMyProduct；平台产品库 → 走 updateProduct */
  const handleEditSave = async () => {
    if (!product || !validateEdit()) return
    setEditSaving(true)
    try {
      const payload = {
        code: product.code,
        ...editForm,
        processes: product.processes,
      }
      if (resolved?.kind === 'my') {
        await updateMyProduct(product.id, payload)
      } else {
        await updateProduct(product.id, payload)
      }
      toast('产品信息已保存')
      setEditOpen(false)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setEditSaving(false)
    }
  }

  /** 产品图片：本地读取为 data URL 预览（与产品库表单一致） */
  const handleEditImage = (file?: File) => {
    if (!file) {
      setEditForm((prev) => ({ ...prev, imageUrl: '' }))
      return
    }
    if (!file.type.startsWith('image/')) {
      toast('请选择图片文件（支持 jpg / png）', 'error')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast('图片大小不能超过 5MB', 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setEditForm((prev) => ({ ...prev, imageUrl: String(reader.result ?? '') }))
    reader.readAsDataURL(file)
  }

  if (!product) {
    return (
      <div className="card">
        <div className="pcf-placeholder">{loading ? '加载中…' : '产品不存在或已被删除'}</div>
      </div>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={['前台业务平台', '产品碳足迹核算', product.name]}
        title={product.name}
        description="一个产品可进行多次核算，右侧为该产品的全部核算记录"
        actions={
          <Button onClick={() => navigate('/pcf/project')}>返回</Button>
        }
      />

      <div className="pcf-product-layout">
        {/* 左侧：产品基本信息 */}
        <aside className="pcf-product-aside card">
          <div className="pcf-product-cover">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} />
            ) : (
              <span className="pcf-product-cover-empty">产品图</span>
            )}
          </div>

          <div className="pcf-product-name">{pcfProductLabel(product.name, product.spec)}</div>

          <div className="pcf-product-fields">
            <div className="pcf-product-field">
              <span className="pcf-product-field-label">产品编码：</span>
              <span className="mono">{product.code}</span>
            </div>
            <div className="pcf-product-field">
              <span className="pcf-product-field-label">所属行业：</span>
              <span>{product.industry || '-'}</span>
            </div>
            <div className="pcf-product-field">
              <span className="pcf-product-field-label">产品分类：</span>
              <span>{categoryName}</span>
            </div>
            <div className="pcf-product-field">
              <span className="pcf-product-field-label">上架状态：</span>
              <span>{product.useStatus === 'on' ? '已上架' : '已下架'}</span>
            </div>
            <div className="pcf-product-field">
              <span className="pcf-product-field-label">产品来源：</span>
              <span>{resolved ? SOURCE_TEXT[resolved.source || resolved.kind] : '-'}</span>
            </div>
            <div className="pcf-product-field">
              <span className="pcf-product-field-label">创建人：</span>
              <span>{product.createdBy || '-'}</span>
            </div>
            <div className="pcf-product-field">
              <span className="pcf-product-field-label">创建时间：</span>
              <span>{product.createdAt || '-'}</span>
            </div>
          </div>

          <div className="pcf-product-actions">
            {resolved?.kind === 'my' && resolved.source === 'referenced' ? (
              <span className="toolbar-tip">引用平台产品为只读项，不可修改</span>
            ) : (
              <Button onClick={() => void openEdit()}>修改</Button>
            )}
          </div>
        </aside>

        {/* 右侧：核算记录列表 */}
        <section className="pcf-product-main card">
          <div className="pcf-record-toolbar">
            <span className="pcf-record-toolbar-title">
              核算记录
              <Tag tone="info">{projects.length} 条</Tag>
            </span>
            {product.useStatus === 'on' ? (
              <Button variant="primary" onClick={handleCreate}>
                新增核算
              </Button>
            ) : (
              <Tag tone="warning">产品已下架，不可新增核算</Tag>
            )}
          </div>

          {projects.length === 0 ? (
            <div className="pcf-placeholder" style={{ margin: 'var(--space-md) var(--space-lg) var(--space-lg)' }}>
              该产品暂无核算记录，点击右上角「新增核算」开始第一次核算
            </div>
          ) : (
            <div className="pcf-record-list">
              {projects.map((project, index) => (
                <div key={project.id} className="pcf-record-card">
                  <div className="pcf-record-no">NO.{index + 1}</div>

                  <div className="pcf-record-main">
                    <div className="pcf-record-title">
                      <button className="link mono" onClick={() => navigate(`/pcf/project/${project.id}`)}>
                        {project.code}
                      </button>
                      <span className="pcf-record-name">{project.name}</span>
                      <Tag tone={PCF_STATUS_TONE[project.status]}>{PCF_STATUS_TEXT[project.status]}</Tag>
                      <Tag>{PCF_BOUNDARY_TEXT[project.boundary]}</Tag>
                    </div>
                    <div className="pcf-record-grid">
                      <span>
                        <span className="pcf-record-field-label">计算方法：</span>
                        {project.method || '--'}
                      </span>
                      <span>
                        <span className="pcf-record-field-label">统计时间：</span>
                        {project.startDate} ~ {project.endDate}
                      </span>
                      <span>
                        <span className="pcf-record-field-label">单位：</span>
                        {project.functionalUnit || '--'}
                      </span>
                      <span>
                        <span className="pcf-record-field-label">备注：</span>
                        {project.remark || '--'}
                      </span>
                      <span>
                        <span className="pcf-record-field-label">创建人：</span>
                        {project.createdBy || '--'}
                      </span>
                      <span>
                        <span className="pcf-record-field-label">更新时间：</span>
                        {project.updatedAt}
                      </span>
                    </div>
                  </div>

                  <div className="pcf-record-actions">
                    <Button variant="primary" onClick={() => navigate(`/pcf/project/${project.id}`)}>
                      编辑
                    </Button>
                    {canDelete(project.status) && (
                      <Button variant="danger" onClick={() => setDeleteTarget(project)}>
                        删除
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Modal
        open={!!deleteTarget}
        title="确认删除"
        size="sm"
        onClose={() => setDeleteTarget(null)}
        footer={
          <>
            <Button onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="danger" onClick={handleDelete}>
              确认删除
            </Button>
          </>
        }
      >
        删除后不可恢复（记录消失）。仅「新建 / 进行中」状态的核算记录可删除。确认删除「{deleteTarget?.name}」？
      </Modal>

      {/* 产品信息修改（弹窗编辑；产品编码 / 上架状态 / 工艺组合不在此次修改范围） */}
      <Modal
        open={editOpen}
        title="修改产品信息"
        size="lg"
        onClose={() => setEditOpen(false)}
        footer={
          <>
            <Button onClick={() => setEditOpen(false)} disabled={editSaving}>
              取消
            </Button>
            <Button variant="primary" onClick={() => void handleEditSave()} disabled={editSaving}>
              {editSaving ? '保存中…' : '保存'}
            </Button>
          </>
        }
      >
        <div className="form-grid">
          <FormField label="产品编码" hint="系统生成，不可修改">
            <span className="pcf-report-readonly mono">{product?.code ?? '——'}</span>
          </FormField>
          <FormField label="产品名称" required error={editErrors.name}>
            <Input
              value={editForm.name}
              invalid={!!editErrors.name}
              onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </FormField>
          <FormField label="产品分类" required error={editErrors.categoryId}>
            <Select
              value={editForm.categoryId}
              invalid={!!editErrors.categoryId}
              options={categories.map((item) => ({
                label: `${'　'.repeat(Math.max(item.level, 1) - 1)}${item.name}${
                  item.status === 'disabled' ? '（已禁用）' : ''
                }`,
                value: item.id,
              }))}
              onChange={(e) => setEditForm((prev) => ({ ...prev, categoryId: e.target.value }))}
            />
          </FormField>
          <FormField label="型号">
            <Input
              value={editForm.model}
              placeholder="选填"
              onChange={(e) => setEditForm((prev) => ({ ...prev, model: e.target.value }))}
            />
          </FormField>
          <FormField label="规格">
            <Input
              value={editForm.spec}
              placeholder="如 240mm 全竹碳化"
              onChange={(e) => setEditForm((prev) => ({ ...prev, spec: e.target.value }))}
            />
          </FormField>
          <FormField label="计量单位" required error={editErrors.unit}>
            <Select
              value={editForm.unit}
              invalid={!!editErrors.unit}
              options={unitOptions.map((item) => ({ label: item, value: item }))}
              onChange={(e) => setEditForm((prev) => ({ ...prev, unit: e.target.value }))}
            />
          </FormField>
          <FormField label="所属行业">
            <Select
              value={editForm.industry}
              options={industryOptions.map((item) => ({ label: item, value: item }))}
              onChange={(e) => setEditForm((prev) => ({ ...prev, industry: e.target.value }))}
            />
          </FormField>
          <FormField label="产品图片" full>
            <div className="image-upload">
              {editForm.imageUrl ? (
                <img className="image-thumb" src={editForm.imageUrl} alt="产品图片" />
              ) : (
                <div className="image-thumb image-thumb-empty">暂无图片</div>
              )}
              <div className="image-upload-actions">
                <label className="btn btn-sm">
                  选择图片
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      handleEditImage(e.target.files?.[0])
                      e.target.value = ''
                    }}
                  />
                </label>
                {editForm.imageUrl && (
                  <button
                    type="button"
                    className="link link-danger"
                    onClick={() => handleEditImage(undefined)}
                  >
                    移除
                  </button>
                )}
                <span className="toolbar-tip">选填；建议 jpg / png，单张 ≤ 5MB（原型本地预览）</span>
              </div>
            </div>
          </FormField>
          <FormField label="产品描述" full>
            <Textarea
              rows={3}
              value={editForm.description}
              placeholder="选填"
              onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
            />
          </FormField>
        </div>
      </Modal>
    </>
  )
}
