import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, CascaderSelect, FormField, Input, PageHeader, Select, Textarea, useToast } from '@/shared/components'
import type { SelectOption } from '@/shared/components'
import {
  createOperation,
  fetchEnergyOptions,
  fetchMaterialOptions,
  fetchOperation,
  fetchUnitGroupOptions,
  updateOperation,
} from '@/mock'
import type { OperationFlowPayload, OperationPayload } from '@/mock'
import type {
  EmissionCategory,
  EnergyOption,
  FlowItemType,
  MaterialOption,
  OperationFlowItem,
  OperationItem,
  OperationType,
  TreeOption,
} from '@/types'
import {
  emissionCategoryOrder,
  emissionCategoryText,
  flowTypeText,
  inputFlowTypes,
  operationTypeOrder,
  operationTypeText,
  outputFlowTypes,
} from './operationMeta'
import './OperationPage.css'

let uid = 0
const nextId = (prefix: string) => `${prefix}-${Date.now().toString().slice(-6)}-${++uid}`

type TableKey = 'input' | 'output'

/** 投入项：只定义「有哪些」（流类型 + 物料 + 单位），不含数量 */
const emptyInputRow = (): OperationFlowItem => ({
  id: nextId('I'),
  seq: 0,
  flowType: 'material',
  refType: 'material',
  refCode: '',
  refName: '',
  unit: '',
  remark: '',
})

/** 产出项：只定义「有哪些」，排放物须标类别 */
const emptyOutputRow = (): OperationFlowItem => ({
  id: nextId('O'),
  seq: 0,
  flowType: 'semi',
  refType: 'material',
  refCode: '',
  refName: '',
  unit: '',
  emissionCategory: undefined,
  remark: '',
})

/** 子表按数组顺序重编行序（投入项 / 产出项各自独立编号） */
const reseq = (rows: OperationFlowItem[]): OperationFlowItem[] =>
  rows.map((row, index) => ({ ...row, seq: index + 1 }))

export default function OperationFormPage() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const toast = useToast()

  const [materialList, setMaterialList] = useState<MaterialOption[]>([])
  const [energyList, setEnergyList] = useState<EnergyOption[]>([])
  /** 计量单位多级选项（按单位类型分组） */
  const [unitTree, setUnitTree] = useState<TreeOption[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    code: '',
    name: '',
    type: '' as '' | OperationType,
    description: '',
  })
  const [iconUrl, setIconUrl] = useState('')
  const [inputs, setInputs] = useState<OperationFlowItem[]>([])
  const [outputs, setOutputs] = useState<OperationFlowItem[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [badRows, setBadRows] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [materials, energies, units] = await Promise.all([
        fetchMaterialOptions(),
        fetchEnergyOptions(),
        fetchUnitGroupOptions(),
      ])
      setMaterialList(materials)
      setEnergyList(energies)
      setUnitTree(units)

      if (isEdit && id) {
        const detail: OperationItem = await fetchOperation(id)
        setForm({
          code: detail.code,
          name: detail.name,
          type: detail.type,
          description: detail.description,
        })
        setIconUrl(detail.iconUrl)
        setInputs(reseq(detail.inputs))
        setOutputs(reseq(detail.outputs))
      } else {
        setInputs([emptyInputRow()])
        setOutputs([emptyOutputRow()])
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

  const unitOptions = useMemo<TreeOption[]>(() => unitTree, [unitTree])

  const inputTypeOptions = useMemo<SelectOption[]>(
    () => inputFlowTypes.map((type) => ({ label: flowTypeText[type], value: type })),
    [],
  )
  const outputTypeOptions = useMemo<SelectOption[]>(
    () => outputFlowTypes.map((type) => ({ label: flowTypeText[type], value: type })),
    [],
  )

  /** 物料选项：流类型 = 能源 引用能源库，其余（原辅料 / 自然资源输入 / 产出各项）引用物料库；禁用对象不可新选（F11 / R-020） */
  const refOptions = (row: OperationFlowItem): SelectOption[] => {
    const list = row.flowType === 'energy' ? energyList : materialList
    return list.map((item) => ({
      label: `${item.name}（${item.code}）${item.status === 'disabled' ? '（已禁用）' : ''}`,
      value: item.code,
      disabled: item.status === 'disabled',
    }))
  }

  const updateForm = (patch: Partial<typeof form>) => setForm((prev) => ({ ...prev, ...patch }))

  const setRows = (table: TableKey, updater: (rows: OperationFlowItem[]) => OperationFlowItem[]) => {
    if (table === 'input') setInputs((prev) => reseq(updater(prev)))
    else setOutputs((prev) => reseq(updater(prev)))
  }

  const updateRow = (table: TableKey, rowId: string, patch: Partial<OperationFlowItem>) => {
    setRows(table, (rows) => rows.map((row) => (row.id === rowId ? { ...row, ...patch } : row)))
  }

  const handleFlowTypeChange = (table: TableKey, rowId: string, flowType: FlowItemType) => {
    updateRow(table, rowId, {
      flowType,
      refType: table === 'input' && flowType === 'energy' ? 'energy' : 'material',
      refCode: '',
      refName: '',
      unit: '',
      // 排放物类别仅对「排放物」有意义，切换流类型时清空
      emissionCategory: undefined,
    })
  }

  /** 换物料时自动带出默认单位（可再手工覆盖） */
  const handleRefChange = (table: TableKey, rowId: string, refCode: string, row: OperationFlowItem) => {
    const list = row.flowType === 'energy' ? energyList : materialList
    const target = list.find((item) => item.code === refCode)
    updateRow(table, rowId, { refCode, refName: target?.name ?? '', unit: target?.unit ?? '' })
  }

  const handleAddRow = (table: TableKey) => {
    if (table === 'input') setInputs((prev) => reseq([...prev, emptyInputRow()]))
    else setOutputs((prev) => reseq([...prev, emptyOutputRow()]))
  }

  const handleRemoveRow = (table: TableKey, rowId: string) => {
    setRows(table, (rows) => rows.filter((row) => row.id !== rowId))
  }

  /** 工序图标：原型仅本地读取为 data URL 做预览，不做真实上传与存储 */
  const handleIconChange = (file?: File) => {
    if (!file) {
      setIconUrl('')
      return
    }
    if (!file.type.startsWith('image/')) {
      toast('请选择图片文件', 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setIconUrl(String(reader.result ?? ''))
    reader.readAsDataURL(file)
  }

  /** 校验：流类型 / 物料 / 单位 / 排放物类别 / 行内不重复 / 禁止自身闭环；**不含数量** */
  const validate = (): string => {
    const nextErrors: Record<string, string> = {}
    const bad = new Set<string>()

    if (!form.code.trim()) nextErrors.code = '请输入工序编码'
    if (!form.name.trim()) nextErrors.name = '请输入工序名称'
    if (!form.type) nextErrors.type = '请选择工序类型'
    if (outputs.length === 0) nextErrors.outputs = '产出项至少需要 1 条（F4）'

    const rows = [...inputs.map((row) => ({ row })), ...outputs.map((row) => ({ row }))]

    rows.forEach(({ row }) => {
      if (!row.flowType || !row.refCode || !row.unit) bad.add(row.id)
      // 排放物必须选择排放物类别（废气 / 废水 / 废渣）
      if (row.flowType === 'emission' && !row.emissionCategory) bad.add(row.id)
    })

    const seen = new Map<string, string>()
    rows.forEach(({ row }) => {
      if (!row.flowType || !row.refCode) return
      const key = `${row.flowType}:${row.refCode}`
      const first = seen.get(key)
      if (first) {
        bad.add(row.id)
        bad.add(first)
      } else {
        seen.set(key, row.id)
      }
    })

    const semiCodes = new Set(outputs.filter((row) => row.flowType === 'semi' && row.refCode).map((row) => row.refCode))
    inputs.forEach((row) => {
      if (semiCodes.has(row.refCode)) bad.add(row.id)
    })

    setErrors(nextErrors)
    setBadRows(bad)

    if (Object.keys(nextErrors).length > 0) return '请先完善必填项'
    if (bad.size > 0)
      return '存在校验未通过的明细行（已高亮）：流类型 / 物料 / 单位 / 排放物类别 / 行内不重复 / 禁止自身闭环'
    return ''
  }

  const toPayload = (rows: OperationFlowItem[], isOutput: boolean): OperationFlowPayload[] =>
    rows.map((row) => ({
      flowType: row.flowType,
      refType: row.refType,
      refCode: row.refCode,
      refName: row.refName,
      unit: row.unit,
      emissionCategory: isOutput ? row.emissionCategory : undefined,
      remark: row.remark,
    }))

  const handleSubmit = async () => {
    const message = validate()
    if (message) {
      toast(message, 'error')
      return
    }

    const payload: OperationPayload = {
      code: form.code.trim(),
      name: form.name.trim(),
      type: form.type as OperationType,
      iconUrl,
      description: form.description.trim(),
      inputs: toPayload(inputs, false),
      outputs: toPayload(outputs, true),
    }

    setSubmitting(true)
    try {
      if (isEdit && id) {
        await updateOperation(id, payload)
        toast('保存成功')
        navigate(`/basic/operation/${id}`)
      } else {
        const created = await createOperation(payload)
        toast('保存成功')
        navigate(`/basic/operation/${created.id}`)
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : '保存失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader breadcrumb={['系统管理', '工艺流程管理', '工序']} title={isEdit ? '编辑工序' : '新增工序'} />
        <div className="card">
          <div className="empty">加载中…</div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '工艺流程管理', '工序', isEdit ? '编辑工序' : '新增工序']}
        title={<span data-ann-target="operation.page.global">{isEdit ? '编辑工序' : '新增工序'}</span>}
        description="工序只维护输入 / 输出数据项与单位，不填数量；数量（工序单耗）在核算模型 / 数据录入阶段填写"
        actions={<Button onClick={() => navigate(-1)}>取消</Button>}
      />

      <div className="stack" data-ann-target="operation.form.root">
        <section className="card">
          <div className="section-header">
            <span className="section-title">基本信息</span>
            <span className="toolbar-tip">工序编码全租户唯一；名称允许重名（D01 / D02）</span>
          </div>
          <div className="form-block">
            <div className="form-grid">
              <FormField label="工序编码" required error={errors.code}>
                <Input
                  data-ann-target="operation.form.code"
                  value={form.code}
                  placeholder="如 GX-0701"
                  readOnly={isEdit}
                  invalid={!!errors.code}
                  onChange={(e) => updateForm({ code: e.target.value })}
                />
              </FormField>
              <FormField label="工序名称" required error={errors.name}>
                <Input
                  data-ann-target="operation.form.name"
                  value={form.name}
                  placeholder="请输入工序名称"
                  invalid={!!errors.name}
                  onChange={(e) => updateForm({ name: e.target.value })}
                />
              </FormField>
              <FormField label="工序类型" required error={errors.type}>
                <Select
                  data-ann-target="operation.form.type"
                  value={form.type}
                  placeholder="请选择"
                  options={operationTypeOrder.map((type) => ({ label: operationTypeText[type], value: type }))}
                  invalid={!!errors.type}
                  onChange={(e) => updateForm({ type: e.target.value as '' | OperationType })}
                />
              </FormField>
              <FormField label="工序图标">
                <div className="image-upload" data-ann-target="operation.form.icon">
                  {iconUrl ? (
                    <img className="image-thumb" src={iconUrl} alt="工序图标" />
                  ) : (
                    <div className="image-thumb image-thumb-empty">暂无图标</div>
                  )}
                  <div className="image-upload-actions">
                    <label className="btn btn-sm">
                      选择图片
                      <input type="file" accept="image/*" hidden onChange={(e) => handleIconChange(e.target.files?.[0])} />
                    </label>
                    {iconUrl && (
                      <button type="button" className="link link-danger" onClick={() => handleIconChange(undefined)}>
                        移除
                      </button>
                    )}
                    <span className="toolbar-tip">选填；仅支持本地上传（Q16），原型不做尺寸与格式校验</span>
                  </div>
                </div>
              </FormField>
              <FormField label="工序描述" full>
                <Textarea
                  data-ann-target="operation.form.description"
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
              工序只回答「有哪些数据项」，不回答「有多少」：不设「基准数量 / 基准单位」（Q02 / Q03 / Q04 关闭），
              数量在核算模型 / 数据录入阶段按「工序单耗」填写。
            </div>
          </div>
        </section>

        <section className="card" data-ann-target="operation.form.input">
          <div className="section-header">
            <span className="section-title">投入项</span>
            <span className="section-extra">
              <span className="toolbar-tip">流类型 ∈ 原辅料（物料库）/ 能源（能源库）/ 自然资源输入（物料库）；只填数据项与单位</span>
              <Button size="small" onClick={() => handleAddRow('input')}>
                + 添加投入项
              </Button>
            </span>
          </div>
          <div className="flow-editor-scroll">
            <div className="flow-row flow-row-input flow-row-head">
              <span>序号</span>
              <span>流类型</span>
              <span>物料（物料库 / 能源库）</span>
              <span>单位</span>
              <span>备注</span>
              <span />
            </div>
            {inputs.length === 0 && <div className="flow-editor-empty">暂无投入项，点击「+ 添加投入项」新增</div>}
            {inputs.map((row) => (
              <div
                className={['flow-row', 'flow-row-input', badRows.has(row.id) ? 'flow-row-error' : ''].filter(Boolean).join(' ')}
                key={row.id}
              >
                <span className="flow-seq">{row.seq}</span>
                <Select
                  value={row.flowType}
                  options={inputTypeOptions}
                  onChange={(e) => handleFlowTypeChange('input', row.id, e.target.value as FlowItemType)}
                />
                <Select
                  value={row.refCode}
                  placeholder="请选择物料"
                  options={refOptions(row)}
                  onChange={(e) => handleRefChange('input', row.id, e.target.value, row)}
                />
                <CascaderSelect
                  value={row.unit}
                  placeholder="单位"
                  options={unitOptions}
                  searchPlaceholder="搜索单位符号 / 名称"
                  onChange={(value) => updateRow('input', row.id, { unit: value })}
                />
                <Input
                  value={row.remark}
                  placeholder="选填"
                  onChange={(e) => updateRow('input', row.id, { remark: e.target.value })}
                />
                <span>
                  <button className="link link-danger" onClick={() => handleRemoveRow('input', row.id)}>
                    删除
                  </button>
                </span>
              </div>
            ))}
          </div>
          <div className="form-block">
            <div className="form-tip">
              「单位」取自物料的默认单位（引用计量单位库），可手工覆盖；它是该数据项的计量基准，与填报阶段的换算校验（E04）无关。
            </div>
          </div>
        </section>

        <section className="card" data-ann-target="operation.form.output">
          <div className="section-header">
            <span className="section-title">产出项</span>
            <span className="section-extra">
              <span className="toolbar-tip">
                流类型 ∈ 中间品 / 产品 / 副产品 / 排放物（均引用物料库）；排放物须标类别（废气 / 废水 / 废渣）；至少 1 条
              </span>
              <Button size="small" onClick={() => handleAddRow('output')}>
                + 添加产出项
              </Button>
            </span>
          </div>
          <div className="flow-editor-scroll">
            <div className="flow-row flow-row-output flow-row-head">
              <span>序号</span>
              <span>流类型</span>
              <span>物料（物料库）</span>
              <span>单位</span>
              <span>排放物类别</span>
              <span>备注</span>
              <span />
            </div>
            {outputs.length === 0 && <div className="flow-editor-empty">产出项至少需要 1 条，请点击「+ 添加产出项」</div>}
            {outputs.map((row) => (
              <div
                className={['flow-row', 'flow-row-output', badRows.has(row.id) ? 'flow-row-error' : ''].filter(Boolean).join(' ')}
                key={row.id}
              >
                <span className="flow-seq">{row.seq}</span>
                <Select
                  value={row.flowType}
                  options={outputTypeOptions}
                  onChange={(e) => handleFlowTypeChange('output', row.id, e.target.value as FlowItemType)}
                />
                <Select
                  value={row.refCode}
                  placeholder="请选择物料"
                  options={refOptions(row)}
                  onChange={(e) => handleRefChange('output', row.id, e.target.value, row)}
                />
                <CascaderSelect
                  value={row.unit}
                  placeholder="单位"
                  options={unitOptions}
                  searchPlaceholder="搜索单位符号 / 名称"
                  onChange={(value) => updateRow('output', row.id, { unit: value })}
                />
                {row.flowType === 'emission' ? (
                  <Select
                    value={row.emissionCategory ?? ''}
                    placeholder="必选"
                    options={emissionCategoryOrder.map((category) => ({
                      label: emissionCategoryText[category],
                      value: category,
                    }))}
                    onChange={(e) => updateRow('output', row.id, { emissionCategory: e.target.value as EmissionCategory })}
                  />
                ) : (
                  <span className="flow-static">-</span>
                )}
                <Input
                  value={row.remark}
                  placeholder="选填"
                  onChange={(e) => updateRow('output', row.id, { remark: e.target.value })}
                />
                <span>
                  <button className="link link-danger" onClick={() => handleRemoveRow('output', row.id)}>
                    删除
                  </button>
                </span>
              </div>
            ))}
          </div>
          <div className="form-block">
            <div className="form-tip">
              主产品与副产品由「流类型」区分（产品 / 副产品）；排放 / 负荷在两者之间的分配比例、分配方法（分摊法 / 替代法）
              由「分配规则管理」承载（F21），工序层不记录。
            </div>
          </div>
        </section>

        <section className="card">
          <div className="form-page-footer">
            <Button data-ann-target="operation.form.cancel" onClick={() => navigate(-1)}>取消</Button>
            <Button data-ann-target="operation.form.save" variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? '保存中…' : '保存'}
            </Button>
          </div>
        </section>
      </div>
    </>
  )
}
