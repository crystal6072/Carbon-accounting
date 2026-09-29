import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, FormField, Input, PageHeader, Select, Table, Tag, Textarea, useToast } from '@/shared/components'
import type { Column, SelectOption } from '@/shared/components'
import { buildFormulaLines } from '@/shared/formulaMeta'
import {
  createProduct,
  fetchCategories,
  fetchIndustryOptions,
  fetchOperationTemplates,
  fetchOperations,
  fetchProcessTemplates,
  fetchProduct,
  fetchUnitOptions,
  updateProduct,
} from '@/mock'
import type { ProductPayload } from '@/mock'
import type {
  CategoryItem,
  OperationItem,
  OperationTemplate,
  ProductItem,
  ProductOperationItem,
  ProductProcessItem,
  ProcessTemplate,
} from '@/types'
import ProductOperationViewModal from './ProductOperationViewModal'
import { flowTypeText } from './productMeta'
import './ProductPage.css'

let uid = 0
const nextId = (prefix: string) => `${prefix}-${Date.now().toString().slice(-6)}-${++uid}`

/** 由工序模板复制为产品内的工序副本（保留来源模板标识，C3 / C3b） */
function buildOperation(template: OperationTemplate, seq: number): ProductOperationItem {
  return {
    id: nextId('OP'),
    code: template.code,
    name: template.name,
    seq,
    sourceCode: template.code,
    sourceCopiedAt: '2026-09-20 10:00',
    sourceUpdated: false,
    origin: 'template',
    inputs: template.inputs.map((item) => ({
      ...item,
      id: nextId('I'),
      formulaId: '',
      formulaCode: '',
      formulaName: '',
      formulaExpression: '',
      disposal: 'formula',
    })),
    outputs: template.outputs.map((item) => ({
      ...item,
      id: nextId('O'),
      formulaId: '',
      formulaCode: '',
      formulaName: '',
      formulaExpression: '',
      disposal: 'formula',
    })),
  }
}

export default function ProductFormPage() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const toast = useToast()

  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [unitList, setUnitList] = useState<string[]>([])
  const [industryList, setIndustryList] = useState<string[]>([])
  const [processList, setProcessList] = useState<ProcessTemplate[]>([])
  const [operationList, setOperationList] = useState<OperationTemplate[]>([])
  /** 工序库（用于列表展示「工序类型」） */
  const [operations, setOperations] = useState<OperationItem[]>([])
  const [origin, setOrigin] = useState<ProductItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    code: '',
    name: '',
    categoryId: '',
    model: '',
    spec: '',
    unit: '',
    industry: '',
    imageUrl: '',
    description: '',
  })
  const [processes, setProcesses] = useState<ProductProcessItem[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  /** 工艺与工序组合展示模式：流程画布 / 列表 */
  const [viewMode, setViewMode] = useState<'canvas' | 'list'>('canvas')
  /** 当前选中的工序节点（画布模式，跨工艺） */
  const [selectedOpId, setSelectedOpId] = useState('')
  /** 待查看详情的工序 */
  const [viewOperation, setViewOperation] = useState<ProductOperationItem | null>(null)
  /** 工艺与工序组合画布全屏 */
  const [fullscreen, setFullscreen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [categoryList, units, industries, templates, operationTemplates, operationList] = await Promise.all([
        fetchCategories(),
        fetchUnitOptions(),
        fetchIndustryOptions(),
        fetchProcessTemplates(),
        fetchOperationTemplates(),
        fetchOperations(),
      ])
      setCategories(categoryList)
      setUnitList(units)
      setIndustryList(industries)
      setProcessList(templates)
      setOperationList(operationTemplates)
      setOperations(operationList)

      if (isEdit && id) {
        const product = await fetchProduct(id)
        setOrigin(product)
        setForm({
          code: product.code,
          name: product.name,
          categoryId: product.categoryId,
          model: product.model,
          spec: product.spec,
          unit: product.unit,
          industry: product.industry,
          imageUrl: product.imageUrl,
          description: product.description,
        })
        setProcesses(product.processes)
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [id, isEdit, toast])

  useEffect(() => {
    void load()
  }, [load])

  /** 分类选项：仅可选启用中的分类；编辑时保留原分类（即便已禁用）以便展示（R-003） */
  const categoryOptions = useMemo<SelectOption[]>(() => {
    const options = categories
      .filter((item) => item.status === 'enabled' || item.id === origin?.categoryId)
      .sort((a, b) => a.level - b.level || (a.sortNo ?? 9999) - (b.sortNo ?? 9999))
      .map((item) => ({
        label: `${'　'.repeat(item.level - 1)}${item.name}${item.status === 'disabled' ? '（已禁用）' : ''}`,
        value: item.id,
      }))
    return options
  }, [categories, origin])

  const processOptions: SelectOption[] = processList.map((item) => ({
    label: `${item.name}（${item.code}）`,
    value: item.code,
  }))

  const updateForm = (patch: Partial<typeof form>) => setForm((prev) => ({ ...prev, ...patch }))

  /** 产品图片：原型仅本地读取为 data URL 做预览，不做真实上传与存储 */
  const handleImageChange = (file?: File) => {
    if (!file) {
      updateForm({ imageUrl: '' })
      return
    }
    if (!file.type.startsWith('image/')) {
      toast('请选择图片文件', 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = () => updateForm({ imageUrl: String(reader.result ?? '') })
    reader.readAsDataURL(file)
  }

  const handleAddProcess = () => {
    setProcesses((prev) => [
      ...prev,
      {
        id: nextId('PR'),
        processCode: '',
        processName: '',
        lifecycleStage: '',
        seq: prev.length + 1,
        operations: [],
      },
    ])
  }

  const handleProcessTemplateChange = (processId: string, code: string) => {
    const template = processList.find((item) => item.code === code)
    // 校验：同一生命周期阶段只能挂一个工艺流程（避免同一阶段重复选择工艺）
    if (template?.lifecycleStage) {
      const conflict = processes.find(
        (p) => p.id !== processId && p.lifecycleStage === template.lifecycleStage,
      )
      if (conflict) {
        toast(
          `生命周期阶段「${template.lifecycleStage}」已绑定工艺流程「${conflict.processName}」，同一阶段不能重复选择工艺`,
          'error',
        )
        return
      }
    }
    setProcesses((prev) =>
      prev.map((process) =>
        process.id === processId
          ? {
              ...process,
              processCode: template?.code ?? '',
              processName: template?.name ?? '',
              // 所属生命周期阶段随工艺流程带出（一个工艺流程对应一个阶段）
              lifecycleStage: template?.lifecycleStage ?? '',
              operations: template ? template.operations.map((op, index) => buildOperation(op, index + 1)) : [],
            }
          : process,
      ),
    )
  }

  const handleAddOperation = (processId: string) => {
    setProcesses((prev) =>
      prev.map((process) => {
        if (process.id !== processId) return process
        const template = operationList[0]
        if (!template) return process
        return {
          ...process,
          operations: [...process.operations, buildOperation(template, process.operations.length + 1)],
        }
      }),
    )
  }

  const handleOperationChange = (processId: string, operationId: string, code: string) => {
    const template = operationList.find((item) => item.code === code)
    if (!template) return
    setProcesses((prev) =>
      prev.map((process) => {
        if (process.id !== processId) return process
        return {
          ...process,
          operations: process.operations.map((op) =>
            op.id === operationId ? buildOperation(template, op.seq) : op,
          ),
        }
      }),
    )
  }

  const handleRemoveOperation = (processId: string, operationId: string) => {
    setProcesses((prev) =>
      prev.map((process) => {
        if (process.id !== processId) return process
        return {
          ...process,
          operations: process.operations
            .filter((op) => op.id !== operationId)
            .map((op, index) => ({ ...op, seq: index + 1 })),
        }
      }),
    )
  }

  const handleRemoveProcess = (processId: string) => {
    setProcesses((prev) =>
      prev.filter((process) => process.id !== processId).map((process, index) => ({ ...process, seq: index + 1 })),
    )
  }

  /** 工序类型（来自工序库，按工序编码匹配） */
  const opTypeOf = (code: string) => operations.find((item) => item.code === code)?.type

  /** 列表视图列（与工艺流程列表列一致）：工序 / 工序类型 / 投入项 / 产出项 / 计算公式（不展示数量） */
  const listColumnsOf = (processId: string): Column<ProductOperationItem>[] => [
    {
      key: 'code',
      title: '工序',
      width: 220,
      render: (row) => (
        <Select
          value={row.code}
          options={operationList.map((item) => ({ label: `${item.name}（${item.code}）`, value: item.code }))}
          onChange={(e) => handleOperationChange(processId, row.id, e.target.value)}
        />
      ),
    },
    {
      key: 'opType',
      title: '工序类型',
      width: 100,
      render: (row) => {
        const type = opTypeOf(row.code)
        if (!type) return '-'
        const text = type === 'main' ? '主工序' : type === 'auxiliary' ? '辅助工序' : '处置工序'
        const tone = type === 'main' ? 'info' : type === 'auxiliary' ? 'default' : 'warning'
        return <Tag tone={tone}>{text}</Tag>
      },
    },
    {
      key: 'inputs',
      title: '投入项',
      width: 200,
      render: (row) => {
        if (row.inputs.length === 0) return '-'
        return (
          <div className="flow-list">
            {row.inputs.map((item) => (
              <span key={item.id} className="flow-chip flow-chip-in">
                {item.name}
              </span>
            ))}
          </div>
        )
      },
    },
    {
      key: 'outputs',
      title: '产出项',
      width: 200,
      render: (row) => {
        if (row.outputs.length === 0) return '-'
        return (
          <div className="flow-list">
            {row.outputs.map((item) => (
              <span key={item.id} className="flow-chip flow-chip-out">
                {item.name}
              </span>
            ))}
          </div>
        )
      },
    },
    {
      key: 'formula',
      title: '计算公式',
      render: (row) => {
        const lines = buildFormulaLines([
          ...row.inputs.map((item) => ({
            name: item.name,
            flowType: item.type,
            formulaName: item.formulaName,
            formulaCode: item.formulaCode,
            disposal: item.disposal,
          })),
          ...row.outputs.map((item) => ({
            name: item.name,
            flowType: item.type,
            formulaName: item.formulaName,
            formulaCode: item.formulaCode,
            disposal: item.disposal,
          })),
        ])
        if (lines.length === 0) return '-'
        return (
          <div className="flow-detail">
            {lines.map((line) => (
              <span key={line} className="flow-detail-line">
                {line}
              </span>
            ))}
          </div>
        )
      },
    },
    {
      key: 'action',
      title: '',
      width: 64,
      render: (row) => (
        <button className="link link-danger" onClick={() => handleRemoveOperation(processId, row.id)}>
          删除
        </button>
      ),
    },
  ]

  /** 画布中当前选中的工序（跨工艺查找） */
  const selectedOperation = useMemo(() => {
    for (const process of processes) {
      const found = process.operations.find((item) => item.id === selectedOpId)
      if (found) return found
    }
    return null
  }, [processes, selectedOpId])

  const handleViewSelected = () => {
    if (selectedOperation) setViewOperation(selectedOperation)
  }

  const handleSubmit = async () => {
    const nextErrors: Record<string, string> = {}
    if (!form.code.trim()) nextErrors.code = '请输入产品编码'
    if (!form.name.trim()) nextErrors.name = '请输入产品名称'
    if (!form.categoryId) nextErrors.categoryId = '请选择产品分类'
    if (!form.unit) nextErrors.unit = '请选择单位'
    if (!form.industry) nextErrors.industry = '请选择所属行业'
    // 同一生命周期阶段只允许绑定一个工艺流程（2026-09-29）
    const stageOwner = new Map<string, string>()
    for (const process of processes) {
      if (!process.lifecycleStage) continue
      const owner = stageOwner.get(process.lifecycleStage)
      if (owner) {
        nextErrors.processes = `生命周期阶段「${process.lifecycleStage}」已绑定工艺流程「${owner}」，同一阶段只允许绑定一个工艺流程`
        break
      }
      stageOwner.set(process.lifecycleStage, process.processName)
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      toast(nextErrors.processes ?? '请先完善必填项', 'error')
      return
    }
    setErrors({})

    const payload: ProductPayload = {
      code: form.code.trim(),
      name: form.name.trim(),
      categoryId: form.categoryId,
      model: form.model.trim(),
      spec: form.spec.trim(),
      unit: form.unit,
      industry: form.industry,
      imageUrl: form.imageUrl,
      description: form.description.trim(),
      processes,
    }

    setSubmitting(true)
    try {
      if (isEdit && id) {
        await updateProduct(id, payload)
        toast('保存成功')
        navigate(`/basic/product/${id}`)
      } else {
        const created = await createProduct(payload)
        toast('保存成功')
        navigate(`/basic/product/${created.id}`)
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  /** 工艺与工序组合：画布 / 列表两种模式共用渲染（全屏时复用） */
  const renderProcessBlocks = () => (
    <>
      {processes.length === 0 && (
        <div className="compose-empty">产品至少需要 1 个工艺流程（D05），请点击「添加工艺流程」</div>
      )}
      {processes.map((process) => (
        <div className="sub-block" key={process.id}>
          <div className="sub-block-header">
            <span className="sub-block-title">
              <span className="compose-seq">工艺顺序 {process.seq}</span>
              <div style={{ minWidth: 260 }}>
                <Select
                  value={process.processCode}
                  placeholder="请选择工艺流程（引用工艺流程库）"
                  options={processOptions}
                  onChange={(e) => handleProcessTemplateChange(process.id, e.target.value)}
                />
              </div>
              {process.lifecycleStage && <Tag tone="info">生命周期：{process.lifecycleStage}</Tag>}
            </span>
            <span className="sub-block-actions">
              <Button size="small" onClick={() => handleAddOperation(process.id)}>
                + 添加工序
              </Button>
              <button className="link link-danger" onClick={() => handleRemoveProcess(process.id)}>
                删除工艺
              </button>
            </span>
          </div>

          <div style={{ padding: 12 }}>
            {viewMode === 'canvas' ? (
              <div className="pcf-flow-stage">
                <div className="flow-track">
                  {process.operations.length === 0 && (
                    <div className="flow-empty">请选择工艺流程以带出工序，或点击「+ 添加工序」</div>
                  )}
                  {process.operations.map((operation, index) => (
                    <Fragment key={operation.id}>
                      {index > 0 && <div className="flow-link" />}
                      <div
                        className={['flow-node', selectedOpId === operation.id ? 'flow-node-selected' : '']
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => setSelectedOpId(operation.id)}
                        onDoubleClick={() => setViewOperation(operation)}
                      >
                        <span className="flow-node-anchor flow-node-anchor-top" />
                        <div className="flow-node-head">
                          <span className="flow-node-seq">{operation.seq}</span>
                          <span className="flow-node-name">{operation.name}</span>
                          <button
                            className="flow-node-close"
                            type="button"
                            title="删除该工序"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (selectedOpId === operation.id) setSelectedOpId('')
                              handleRemoveOperation(process.id, operation.id)
                            }}
                          >
                            ×
                          </button>
                        </div>
                        <Select
                          value={operation.code}
                          options={operationList.map((item) => ({
                            label: `${item.name}（${item.code}）`,
                            value: item.code,
                          }))}
                          onChange={(e) => handleOperationChange(process.id, operation.id, e.target.value)}
                        />
                        {operation.origin === 'custom' && (
                          <div className="flow-node-meta">
                            <Tag tone="info">产品自建</Tag>
                          </div>
                        )}
                        <div className="flow-node-flow">
                          <span className="flow-node-flow-line">
                            投入：{operation.inputs.map((item) => item.name).join('、') || '-'}
                          </span>
                          <span className="flow-node-flow-line">
                            产出：{operation.outputs.map((item) => item.name).join('、') || '-'}
                          </span>
                        </div>
                        <span className="flow-node-anchor flow-node-anchor-bottom" />
                      </div>
                    </Fragment>
                  ))}
                  <button className="flow-node-add" type="button" onClick={() => handleAddOperation(process.id)}>
                    + 添加工序
                  </button>
                </div>
              </div>
            ) : process.operations.length === 0 ? (
              <div className="compose-empty">请选择工艺流程以带出工序，或手动添加工序</div>
            ) : (
              <Table
                columns={listColumnsOf(process.id)}
                data={process.operations}
                rowKey={(row) => row.id}
              />
            )}
          </div>
        </div>
      ))}
    </>
  )

  if (loading) {
    return (
      <>
        <PageHeader breadcrumb={['后台管理', '产品库', '产品信息库']} title={isEdit ? '编辑产品' : '新增产品'} />
        <div className="card">
          <div className="empty">加载中…</div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={['后台管理', '产品库', '产品信息库', isEdit ? '编辑产品' : '新增产品']}
        title={isEdit ? '编辑产品' : '新增产品'}
        description={
          isEdit
            ? '产品不版本化，保存后直接覆盖；通过组合校验后可在列表上架'
            : '保存后产品为下架状态，通过组合校验后可在列表上架'
        }
        actions={<Button onClick={() => navigate(-1)}>取消</Button>}
      />

      <div className="stack">
        <section className="card">
          <div className="section-header">
            <span className="section-title">基本信息</span>
          </div>
          <div className="form-block">
            <div className="form-grid">
              <FormField label="产品编码" required error={errors.code}>
                <Input
                  value={form.code}
                  placeholder="如 PD-2026-007"
                  invalid={!!errors.code}
                  onChange={(e) => updateForm({ code: e.target.value })}
                />
              </FormField>
              <FormField label="产品名称" required error={errors.name}>
                <Input
                  value={form.name}
                  placeholder="请输入产品名称"
                  invalid={!!errors.name}
                  onChange={(e) => updateForm({ name: e.target.value })}
                />
              </FormField>
              <FormField label="产品分类" required error={errors.categoryId}>
                <Select
                  value={form.categoryId}
                  placeholder="仅可选择启用中的分类"
                  options={categoryOptions}
                  invalid={!!errors.categoryId}
                  onChange={(e) => updateForm({ categoryId: e.target.value })}
                />
              </FormField>
              <FormField label="型号">
                <Input value={form.model} placeholder="选填" onChange={(e) => updateForm({ model: e.target.value })} />
              </FormField>
              <FormField label="规格">
                <Input value={form.spec} placeholder="如 240mm 全竹碳化" onChange={(e) => updateForm({ spec: e.target.value })} />
              </FormField>
              <FormField label="单位" required error={errors.unit}>
                <Select
                  value={form.unit}
                  placeholder="引用计量单位库"
                  options={unitList.map((unit) => ({ label: unit, value: unit }))}
                  invalid={!!errors.unit}
                  onChange={(e) => updateForm({ unit: e.target.value })}
                />
              </FormField>
              <FormField label="所属行业" required error={errors.industry}>
                <Select
                  value={form.industry}
                  placeholder="引用行业库"
                  options={industryList.map((item) => ({ label: item, value: item }))}
                  invalid={!!errors.industry}
                  onChange={(e) => updateForm({ industry: e.target.value })}
                />
              </FormField>
              <FormField label="产品图片" full>
                <div className="image-upload">
                  {form.imageUrl ? (
                    <img className="image-thumb" src={form.imageUrl} alt="产品图片" />
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
                        onChange={(e) => handleImageChange(e.target.files?.[0])}
                      />
                    </label>
                    {form.imageUrl && (
                      <button type="button" className="link link-danger" onClick={() => handleImageChange(undefined)}>
                        移除
                      </button>
                    )}
                    <span className="toolbar-tip">选填；原型仅做本地预览，不校验尺寸与格式</span>
                  </div>
                </div>
              </FormField>
              <FormField label="产品描述" full>
                <Textarea
                  value={form.description}
                  rows={3}
                  placeholder="选填"
                  onChange={(e) => updateForm({ description: e.target.value })}
                />
              </FormField>
            </div>
          </div>
          <div className="form-block">
            <div className="form-tip">
              「单位」引用计量单位库，同时承载核算结果的比较基准口径（D04）；「所属行业」引用行业库（A1-4），
              用于匹配行业阶段基线与核算模型；产品图片为选填字段。
            </div>
          </div>
        </section>

        <section className="card">
          <div className="section-header">
            <span className="section-title">工艺与工序组合</span>
            <span className="section-extra">
              <span className="toolbar-tip">工序随工艺流程带出并复制为副本（C3 / C3b）</span>
              <div className="pcf-view-switch" role="tablist" aria-label="展示方式">
                <button
                  type="button"
                  className={viewMode === 'canvas' ? 'active' : ''}
                  onClick={() => setViewMode('canvas')}
                >
                  画布
                </button>
                <button
                  type="button"
                  className={viewMode === 'list' ? 'active' : ''}
                  onClick={() => setViewMode('list')}
                >
                  列表
                </button>
              </div>
              <Button size="small" onClick={handleViewSelected} disabled={!selectedOperation}>
                查看工序
              </Button>
              {!fullscreen && (
                <Button size="small" onClick={() => setFullscreen(true)}>
                  全屏
                </Button>
              )}
              <Button size="small" onClick={handleAddProcess}>
                + 添加工艺流程
              </Button>
            </span>
          </div>
          <div className="section-body">{renderProcessBlocks()}</div>
          {errors.processes && <div className="form-error">{errors.processes}</div>}
          <div className="form-block">
            <div className="form-tip">
              组合校验（R-004 / R-005）：至少 1 个工艺流程、每个工艺流程至少 1 道工序、末道工序产出必须为「成品」；同一生命周期阶段只允许绑定一个工艺流程；投入产出流
              {flowTypeText.material} / {flowTypeText.energy} / {flowTypeText.semi} / {flowTypeText.product} /{' '}
              {flowTypeText.byproduct} 在本模块为副本，可修改；新增行须标注「产品自建」（【待确认 Q18】）。
            </div>
          </div>
        </section>

        <section className="card">
          <div className="form-page-footer">
            <Button onClick={() => navigate(-1)}>取消</Button>
            <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? '保存中…' : '保存'}
            </Button>
          </div>
        </section>
      </div>

      {fullscreen &&
        createPortal(
          <div className="pcf-fullscreen">
            <div className="pcf-fullscreen-header">
              <span className="pcf-fullscreen-title">工艺与工序组合 · 流程画布</span>
              <div className="flex gap-sm">
                <Button size="small" onClick={handleViewSelected} disabled={!selectedOperation}>
                  查看工序
                </Button>
                <Button size="small" onClick={() => setFullscreen(false)}>
                  退出全屏
                </Button>
              </div>
            </div>
            <div className="pcf-fullscreen-body">{renderProcessBlocks()}</div>
          </div>,
          document.body,
        )}

      <ProductOperationViewModal
        open={viewOperation !== null}
        operation={viewOperation}
        onClose={() => setViewOperation(null)}
      />
    </>
  )
}
