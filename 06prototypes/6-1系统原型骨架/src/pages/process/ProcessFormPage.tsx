import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, FormField, Icon, Input, PageHeader, Select, Table, Tag, Textarea, useToast } from '@/shared/components'
import type { Column, SelectOption } from '@/shared/components'
import { buildFormulaLines } from '@/shared/formulaMeta'
import {
  createProcess,
  fetchCategories,
  fetchIndustryOptions,
  fetchLifecycleOptions,
  fetchOperations,
  fetchProcess,
  fetchUnitOptions,
  updateProcess,
} from '@/mock'
import type { ProcessPayload } from '@/mock'
import type { CategoryItem, OperationItem, ProcessOperationItem } from '@/types'
import ProcessOperationViewModal from './ProcessOperationViewModal'
import {
  buildChainChecks,
  operationOptionLabel,
  sortOperations,
} from './processMeta'
import './ProcessPage.css'

let uid = 0
const nextRowId = () => `ROW-${Date.now().toString().slice(-6)}-${++uid}`

const emptyRow = (): ProcessOperationItem => ({
  id: nextRowId(),
  seq: 0,
  order: 0,
  opCode: '',
  opName: '',
  remark: '',
})

/** 按画布顺序重编序号与工序顺序（节点顺序即工序顺序，天然连续、不重复，D04） */
const reseq = (rows: ProcessOperationItem[]): ProcessOperationItem[] =>
  rows.map((row, index) => ({ ...row, seq: index + 1, order: index + 1 }))

export default function ProcessFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const isEdit = !!id

  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [operations, setOperations] = useState<OperationItem[]>([])
  const [units, setUnits] = useState<string[]>([])
  const [industries, setIndustries] = useState<string[]>([])
  const [lifecycles, setLifecycles] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    code: '',
    name: '',
    categoryId: '',
    industry: '',
    lifecycleStage: '',
    baseQty: '',
    baseUnit: '',
    description: '',
  })
  const [rows, setRows] = useState<ProcessOperationItem[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  /** 工序明细展示模式：流程画布 / 列表（与产品信息库一致） */
  const [viewMode, setViewMode] = useState<'canvas' | 'list'>('canvas')
  /** 工序画布全屏 */
  const [fullscreen, setFullscreen] = useState(false)
  /** 待查看详情的节点（选中节点后查看其引用工序的只读详情） */
  const [viewRowId, setViewRowId] = useState<string>('')
  /** 拖拽排序：起点节点下标 / 当前悬停的落点下标（rows.length 表示落在末尾） */
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [badRows, setBadRows] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [categoryList, operationList, unitList, industryList, lifecycleList] = await Promise.all([
        fetchCategories(),
        fetchOperations(),
        fetchUnitOptions(),
        fetchIndustryOptions(),
        fetchLifecycleOptions(),
      ])
      setCategories(categoryList)
      setOperations(operationList)
      setUnits(unitList)
      setIndustries(industryList)
      setLifecycles(lifecycleList)

      if (!id) {
        setRows(reseq([emptyRow()]))
        return
      }

      const detail = await fetchProcess(id)
      setForm({
        code: detail.code,
        name: detail.name,
        categoryId: detail.categoryId,
        industry: detail.industry,
        lifecycleStage: detail.lifecycleStage,
        baseQty: detail.baseQty === null ? '' : String(detail.baseQty),
        baseUnit: detail.baseUnit,
        description: detail.description,
      })
      setRows(
        detail.operations.map((row) => ({
          id: nextRowId(),
          seq: row.seq,
          order: row.order,
          opCode: row.opCode,
          opName: row.opName,
          remark: row.remark,
        })),
      )
    } catch (error) {
      toast(error instanceof Error ? error.message : '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  useEffect(() => {
    void load()
  }, [load])

  /** 工序下拉：仅可选启用中的工序（A1 / D02）；已禁用工序以禁用项展示，便于识别历史引用 */
  const operationOptions = useMemo<SelectOption[]>(
    () =>
      operations.map((op) => ({
        label: operationOptionLabel(op),
        value: op.code,
        disabled: op.useStatus === 'disabled',
      })),
    [operations],
  )

  const categoryOptions = useMemo<SelectOption[]>(
    () =>
      categories
        .slice()
        .sort((a, b) => a.level - b.level || (a.sortNo ?? 9999) - (b.sortNo ?? 9999))
        .map((item) => ({
          label: `${'　'.repeat(item.level - 1)}${item.name}${item.status === 'disabled' ? '（已禁用）' : ''}`,
          value: item.id,
        })),
    [categories],
  )

  const unitOptions = useMemo<SelectOption[]>(() => units.map((unit) => ({ label: unit, value: unit })), [units])
  const industryOptions = useMemo<SelectOption[]>(
    () => industries.map((item) => ({ label: item, value: item })),
    [industries],
  )
  const lifecycleOptions = useMemo<SelectOption[]>(
    () => lifecycles.map((item) => ({ label: item, value: item })),
    [lifecycles],
  )

  const chainChecks = useMemo(() => buildChainChecks(rows, operations), [rows, operations])
  const breakCount = chainChecks.filter((check) => check.linkStatus === 'break').length
  const firstCheck = chainChecks.find((check) => check.isFirst)
  const lastCheck = chainChecks.find((check) => check.isLast)
  const firstRowName = rows.find((row) => row.id === firstCheck?.rowId)?.opName ?? ''
  const lastRowName = rows.find((row) => row.id === lastCheck?.rowId)?.opName ?? ''

  /** 当前选中的节点与其引用的工序（用于「查看工序」） */
  const selectedRow = rows.find((row) => row.id === selectedId)
  const selectedOperation = operations.find((op) => op.code === selectedRow?.opCode) ?? null
  const viewOperation = operations.find((op) => op.code === rows.find((row) => row.id === viewRowId)?.opCode) ?? null

  const handleViewSelected = () => {
    if (!selectedRow) {
      toast('请先选中一个工序节点', 'error')
      return
    }
    if (!selectedRow.opCode) {
      toast('该节点尚未选择工序，无法查看工序详情', 'error')
      return
    }
    setViewRowId(selectedRow.id)
  }

  const updateForm = (patch: Partial<typeof form>) => setForm((prev) => ({ ...prev, ...patch }))

  /** 所有画布变更直接落行序（节点顺序即工序顺序，与产品信息库画布操作一致） */
  const mutateRows = (updater: (prev: ProcessOperationItem[]) => ProcessOperationItem[]) => {
    setRows((prev) => reseq(updater(prev)))
  }

  const handleInsert = (atIndex: number) => {
    const newRow = emptyRow()
    mutateRows((prev) => {
      const next = [...prev]
      next.splice(atIndex, 0, newRow)
      return next
    })
    setSelectedId(newRow.id)
  }

  const handleRemoveRow = (rowId: string) => {
    mutateRows((prev) => prev.filter((row) => row.id !== rowId))
    if (selectedId === rowId) setSelectedId('')
  }

  /** 拖拽排序：把 from 位置的节点移动到 to 位置（to 为落点节点下标，rows.length 表示末尾） */
  const handleReorder = (from: number, to: number) => {
    if (from < 0 || to < 0 || from === to || from === to - 1) {
      setDragIndex(null)
      setDragOverIndex(null)
      return
    }
    const movedId = rows[from]?.id ?? ''
    mutateRows((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to > from ? to - 1 : to, 0, moved)
      return next
    })
    if (movedId) setSelectedId(movedId)
    setDragIndex(null)
    setDragOverIndex(null)
  }

  const updateRow = (rowId: string, patch: Partial<ProcessOperationItem>) =>
    setRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, ...patch } : row)))

  const handleOperationChange = (rowId: string, opCode: string) => {
    const op = operations.find((item) => item.code === opCode)
    updateRow(rowId, { opCode, opName: op?.name ?? '' })
  }

  /** 列表视图（与产品信息库列表列一致）：工序 / 工序类型 / 投入项 / 产出项 / 计算公式 */
  const listColumns: Column<ProcessOperationItem>[] = [
    {
      key: 'opCode',
      title: '工序',
      width: 220,
      render: (row) => (
        <Select
          value={row.opCode}
          placeholder="请选择工序"
          options={operationOptions}
          onChange={(e) => handleOperationChange(row.id, e.target.value)}
        />
      ),
    },
    {
      key: 'opType',
      title: '工序类型',
      width: 100,
      render: (row) => {
        const op = operations.find((item) => item.code === row.opCode)
        if (!op) return '-'
        const text = op.type === 'main' ? '主工序' : op.type === 'auxiliary' ? '辅助工序' : '处置工序'
        const tone = op.type === 'main' ? 'info' : op.type === 'auxiliary' ? 'default' : 'warning'
        return <Tag tone={tone}>{text}</Tag>
      },
    },
    {
      key: 'inputs',
      title: '投入项',
      width: 220,
      render: (row) => {
        const op = operations.find((item) => item.code === row.opCode)
        const list = op?.inputs ?? []
        if (list.length === 0) return '-'
        return (
          <div className="flow-list">
            {list.map((item) => (
              <span key={item.id} className="flow-chip flow-chip-in">
                {item.refName}
              </span>
            ))}
          </div>
        )
      },
    },
    {
      key: 'outputs',
      title: '产出项',
      width: 220,
      render: (row) => {
        const op = operations.find((item) => item.code === row.opCode)
        const list = op?.outputs ?? []
        if (list.length === 0) return '-'
        return (
          <div className="flow-list">
            {list.map((item) => (
              <span key={item.id} className="flow-chip flow-chip-out">
                {item.refName}
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
        const op = operations.find((item) => item.code === row.opCode)
        if (!op) return '-'
        const lines = buildFormulaLines([
          ...op.inputs.map((item) => ({
            name: item.refName,
            flowType: item.flowType,
            formulaName: item.formulaName,
            formulaCode: item.formulaCode,
            disposal: item.disposal,
          })),
          ...op.outputs.map((item) => ({
            name: item.refName,
            flowType: item.flowType,
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
        <button className="link link-danger" onClick={() => handleRemoveRow(row.id)}>
          删除
        </button>
      ),
    },
  ]

  /** 本地校验：与 Mock 侧阻断级规则一致；工序链三条校验为提示级，不阻断 */
  const validate = (): string => {
    const nextErrors: Record<string, string> = {}
    const bad = new Set<string>()

    if (!form.code.trim()) nextErrors.code = '请输入工艺流程编码'
    if (!form.name.trim()) nextErrors.name = '请输入工艺流程名称'
    if (!form.categoryId) nextErrors.categoryId = '请选择适用产品分类'
    if (!form.industry) nextErrors.industry = '请选择所属行业'
    if (!form.lifecycleStage) nextErrors.lifecycleStage = '请选择所属生命周期阶段'
    if (rows.length === 0) nextErrors.operations = '工序明细至少需要 1 个工序节点（D02）'

    rows.forEach((row) => {
      if (!row.opCode) bad.add(row.id)
    })

    setErrors(nextErrors)
    setBadRows(bad)
    if (Object.keys(nextErrors).length > 0) return '请先完善必填项'
    if (bad.size > 0) return '存在未选择工序的节点（已高亮）'
    return ''
  }

  const handleSubmit = async () => {
    const message = validate()
    if (message) {
      toast(message, 'error')
      return
    }

    const sorted = sortOperations(rows)
    const payload: ProcessPayload = {
      code: form.code.trim(),
      name: form.name.trim(),
      categoryId: form.categoryId,
      industry: form.industry,
      lifecycleStage: form.lifecycleStage,
      description: form.description.trim(),
      baseQty: form.baseQty.trim() === '' ? null : Number(form.baseQty),
      baseUnit: form.baseUnit,
      operations: sorted.map((row, index) => ({
        order: index + 1,
        opCode: row.opCode,
        opName: row.opName,
        remark: row.remark,
      })),
    }

    setSubmitting(true)
    try {
      if (isEdit && id) {
        await updateProcess(id, payload)
        toast('保存成功')
        navigate(`/basic/process/${id}`)
      } else {
        const created = await createProcess(payload)
        toast('保存成功')
        navigate(`/basic/process/${created.id}`)
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const title = isEdit ? '编辑工艺流程' : '新增工艺流程'

  /** 工序画布（画布视图与全屏共用） */
  const renderCanvas = () => (
    <div className="flow-canvas">
      <div className="flow-canvas-toolbar">
        <Button size="small" onClick={handleViewSelected} disabled={!selectedOperation}>
          查看工序
        </Button>
        <span className="toolbar-tip">
          拖拽节点左上角手柄可调整顺序，点击节点间「+」插入工序；双击节点或点「查看工序」查看详情 · 共 {rows.length} 道工序
        </span>
      </div>

      <div className="flow-canvas-stage">
        <div className="flow-track">
          {rows.length === 0 && (
            <div className="flow-empty">工序明细至少需要 1 个节点，请点击「+ 添加工序」</div>
          )}
          {rows.map((row, index) => {
            const op = operations.find((item) => item.code === row.opCode)
            return (
              <Fragment key={row.id}>
                {index > 0 && (
                  <div className="flow-link">
                    <button
                      className="flow-link-insert"
                      type="button"
                      title="在此处插入工序"
                      onClick={() => handleInsert(index)}
                    >
                      +
                    </button>
                  </div>
                )}
                <div
                  className={[
                    'flow-node',
                    selectedId === row.id ? 'flow-node-selected' : '',
                    badRows.has(row.id) ? 'flow-node-error' : '',
                    dragIndex === index ? 'flow-node-dragging' : '',
                    dragOverIndex === index && dragIndex !== null ? 'flow-node-drop-target' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => setSelectedId(row.id)}
                  onDoubleClick={() => row.opCode && setViewRowId(row.id)}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    setDragOverIndex(index)
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (dragIndex !== null) handleReorder(dragIndex, index)
                  }}
                >
                  <span className="flow-node-anchor flow-node-anchor-top" />
                  <div className="flow-node-head">
                    <span
                      className="flow-node-drag"
                      title="按住拖拽可调整工序顺序"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'move'
                        e.dataTransfer.setData('text/plain', row.id)
                        setDragIndex(index)
                      }}
                      onDragEnd={() => {
                        setDragIndex(null)
                        setDragOverIndex(null)
                      }}
                    >
                      ⠿
                    </span>
                    <span className="flow-node-seq">{index + 1}</span>
                    <span className="flow-node-name">{row.opName || '未选择工序'}</span>
                    <button
                      className="flow-node-close"
                      type="button"
                      title="删除该节点"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveRow(row.id)
                      }}
                    >
                      ×
                    </button>
                  </div>
                  <Select
                    value={row.opCode}
                    placeholder="请选择工序"
                    options={operationOptions}
                    onChange={(e) => handleOperationChange(row.id, e.target.value)}
                  />
                  <div className="flow-node-flow">
                    <span className="flow-node-flow-line">
                      投入：{op ? op.inputs.map((item) => item.refName).join('、') || '-' : '-'}
                    </span>
                    <span className="flow-node-flow-line">
                      产出：{op ? op.outputs.map((item) => item.refName).join('、') || '-' : '-'}
                    </span>
                  </div>
                  <span className="flow-node-anchor flow-node-anchor-bottom" />
                </div>
              </Fragment>
            )
          })}
          <button
            className={[
              'flow-node-add',
              dragOverIndex === rows.length && dragIndex !== null ? 'flow-node-add-drop' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            type="button"
            onClick={() => handleInsert(rows.length)}
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
              setDragOverIndex(rows.length)
            }}
            onDrop={(e) => {
              e.preventDefault()
              if (dragIndex !== null) handleReorder(dragIndex, rows.length)
            }}
          >
            + 添加工序
          </button>
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <>
        <PageHeader breadcrumb={['后台管理', '工艺流程管理', '工艺流程']} title={title} />
        <div className="card">
          <div className="empty">加载中…</div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={['后台管理', '工艺流程管理', '工艺流程', title]}
        title={title}
        description="工艺流程 = 基本信息 + 有序的工序链（不做版本化）：模板间引用工序、被产品引用时复制并冻结（R-010）"
        actions={<Button onClick={() => navigate(-1)}>取消</Button>}
      />

      <div className="stack">
        {isEdit && (
          <div className="notice notice-info">
            <Icon name="warning" size={16} />
            <span>
              模板可自由编辑（R-008）：即使本工艺流程已被产品复制，编辑保存也「不回写」已建副本；副本仅标记「模板已更新」。
            </span>
          </div>
        )}

        <section className="card">
          <div className="section-header">
            <span className="section-title">基本信息</span>
            <span className="toolbar-tip">
              编码唯一（【待确认 Q07】唯一范围）；标注「引用」的字段选项来自对应基础库；使用状态不在表单内编辑
            </span>
          </div>
          <div className="form-block">
            <div className="form-grid">
              <FormField label="工艺流程编码" required error={errors.code}>
                <Input
                  value={form.code}
                  placeholder="如 GY-08"
                  readOnly={isEdit}
                  invalid={!!errors.code}
                  onChange={(e) => updateForm({ code: e.target.value })}
                />
              </FormField>
              <FormField label="工艺流程名称" required error={errors.name}>
                <Input
                  value={form.name}
                  placeholder="请输入工艺流程名称"
                  invalid={!!errors.name}
                  onChange={(e) => updateForm({ name: e.target.value })}
                />
              </FormField>
              <FormField label="适用产品分类" required error={errors.categoryId}>
                <Select
                  value={form.categoryId}
                  placeholder="请选择（引用产品分类库）"
                  options={categoryOptions}
                  invalid={!!errors.categoryId}
                  onChange={(e) => updateForm({ categoryId: e.target.value })}
                />
              </FormField>
              <FormField label="所属行业" required error={errors.industry}>
                <Select
                  value={form.industry}
                  placeholder="请选择（引用行业库）"
                  options={industryOptions}
                  invalid={!!errors.industry}
                  onChange={(e) => updateForm({ industry: e.target.value })}
                />
              </FormField>
              <FormField label="所属生命周期阶段" required error={errors.lifecycleStage}>
                <Select
                  value={form.lifecycleStage}
                  placeholder="请选择（引用生命周期阶段库）"
                  options={lifecycleOptions}
                  invalid={!!errors.lifecycleStage}
                  onChange={(e) => updateForm({ lifecycleStage: e.target.value })}
                />
              </FormField>
              <FormField label="基准单位">
                <Select
                  value={form.baseUnit}
                  placeholder="请选择（引用计量单位库）"
                  options={unitOptions}
                  onChange={(e) => updateForm({ baseUnit: e.target.value })}
                />
              </FormField>
              <FormField label="基准数量">
                <Input
                  type="number"
                  min={0}
                  value={form.baseQty}
                  placeholder="选填"
                  onChange={(e) => updateForm({ baseQty: e.target.value })}
                />
              </FormField>
              <FormField label="工艺流程描述" full>
                <Textarea
                  value={form.description}
                  rows={2}
                  placeholder="选填"
                  onChange={(e) => updateForm({ description: e.target.value })}
                />
              </FormField>
            </div>
          </div>
          <div className="form-block">
            <div className="form-tip">
              「所属行业」「所属生命周期阶段」为必填（引用对应基础库）；「基准数量 / 基准单位」按「单位产品」口径（已确认 Q04）；
              「是否主工艺」已取消（Q06）；不做版本化，故无版本号 / 版本状态 / 生效日期字段（Q05）。
              「适用产品分类」仅作说明性字段用于检索与分类展示、不构成引用约束（A14）；「适用产品」按业务确认不在任何页面展示只读反查（A13）。
            </div>
          </div>
        </section>

        <section className="card">
          <div className="section-header">
            <span className="section-title">工序明细</span>
            <span className="section-extra">
              <span className="toolbar-tip">
                节点自左向右即工序顺序（自动连续不重复）；仅可选「启用」状态的工序（A1）；首道投入 / 末道产出 / 中间衔接三条校验均为提示级
              </span>
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
              {!fullscreen && (
                <Button size="small" onClick={() => setFullscreen(true)}>
                  全屏
                </Button>
              )}
            </span>
          </div>

          {viewMode === 'canvas' ? renderCanvas() : (
            <div>
              <div className="section-body section-body-flush">
                <div className="process-table-wrap">
                  <Table
                    columns={listColumns}
                    data={rows}
                    rowKey={(row) => row.id}
                    emptyText="工序明细至少需要 1 个节点，请点击「+ 添加工序」"
                  />
                </div>
              </div>
              <div className="form-block">
                <button className="link" type="button" onClick={() => handleInsert(rows.length)}>
                  + 添加工序
                </button>
              </div>
            </div>
          )}

          <div className="form-block">
            <div className="form-tip">
              本模块只做工序的「引用与排序」，不在此新增工序定义、不维护工序投入产出流（A3 / A4）；
              同一工序允许重复出现，以节点序号区分（A6 / 已确认 Q02）。节点内「投入 / 产出」为工序的只读投影，维护归属「工序管理」。
            </div>
            {firstCheck && !firstCheck.firstInputOk && (
              <div className="form-tip form-tip-warning">
                提示（不阻断保存）：首道工序「{firstRowName}」的投入全部为中间品，建议含原辅料 / 能源 / 自然资源输入（D05 提示级）。
              </div>
            )}
            {lastCheck && !lastCheck.lastOutputIsProduct && (
              <div className="form-tip form-tip-warning">
                提示（不阻断保存）：末道工序「{lastRowName}」的产出未包含「成品」，建议核对工序链（D06 提示级）。
              </div>
            )}
            {breakCount > 0 && (
              <div className="form-tip form-tip-warning">
                上下游衔接校验为提示级（A9）：当前存在 {breakCount} 处衔接断点 ——
                {chainChecks
                  .filter((check) => check.linkStatus === 'break')
                  .map((check) => {
                    const row = rows.find((item) => item.id === check.rowId)
                    return ` 「${row?.opName}」`
                  })
                  .join('')}
                ，保存不阻断，但建议核对工序链（校验按物料引用编码判定）。
              </div>
            )}
            {errors.operations && <div className="form-tip form-tip-warning">{errors.operations}</div>}
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
              <span className="pcf-fullscreen-title">工序明细 · 流程画布</span>
              <div className="flex gap-sm">
                <Button size="small" onClick={handleViewSelected} disabled={!selectedOperation}>
                  查看工序
                </Button>
                <Button size="small" onClick={() => setFullscreen(false)}>
                  退出全屏
                </Button>
              </div>
            </div>
            <div className="pcf-fullscreen-body">{renderCanvas()}</div>
          </div>,
          document.body,
        )}

      <ProcessOperationViewModal
        open={viewRowId !== ''}
        operation={viewOperation}
        onClose={() => setViewRowId('')}
      />
    </>
  )
}
