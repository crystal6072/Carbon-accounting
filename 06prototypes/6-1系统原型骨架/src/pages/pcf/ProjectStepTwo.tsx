import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { Button, FormField, Icon, Input, Modal, Select, Table, Tag, useToast } from '@/shared/components'
import type { Column, SelectOption } from '@/shared/components'
import {
  addPcfOperation,
  addPcfProcess,
  fetchCalcFormulas,
  fetchLifecycleStages,
  fetchOperationTemplates,
  fetchPcfActivityData,
  fetchPcfFactorOptions,
  fetchPcfLifecycleBundle,
  fetchProcessTemplates,
  fetchUnitOptions,
  removePcfOperation,
  updatePcfActivityData,
  updatePcfActivityFormula,
} from '@/mock'
import type {
  CalcFormula,
  LifecycleStageItem,
  OperationTemplate,
  PcfActivityData,
  PcfActivityValue,
  PcfFactorOption,
  PcfOperationConfig,
  PcfProject,
  ProcessTemplate,
} from '@/types'
import { FLOW_TYPE_TEXT } from './pcfMeta'
import './PcfPage.css'

export interface ProjectStepTwoHandle {
  submit: () => void
}

interface ProjectStepTwoProps {
  project: PcfProject
  editable: boolean
  onSaved: (project: PcfProject) => void
}

/**
 * 工作台步骤②「工序与数据」内容区。
 *
 * - 工序由所选产品**引用即复制**带入，并按步骤①勾选纳入的**生命周期阶段**过滤对齐；
 * - 支持**新增工序**（从工序库选择，挂载到已有工艺流程）与**删除工序**；
 * - 对选中工序的投入 / 产出填报**活动量**（录入框 + 单位下拉）；
 * - **手动匹配排放来源（排放因子）**——需因子的投入项必选；多产出工序填写**分配比例**（合计 100%）。
 */
const ProjectStepTwo = forwardRef<ProjectStepTwoHandle, ProjectStepTwoProps>(
  function ProjectStepTwo({ project, editable, onSaved }, ref) {
    const toast = useToast()

    const [operations, setOperations] = useState<PcfOperationConfig[]>([])
    const [rows, setRows] = useState<PcfActivityData[]>([])
    const [draft, setDraft] = useState<Record<string, string>>({})
    const [unitDraft, setUnitDraft] = useState<Record<string, string>>({})
    const [ratioDraft, setRatioDraft] = useState<Record<string, string>>({})
    const [factorDraft, setFactorDraft] = useState<Record<string, string>>({})
    const [factorOptions, setFactorOptions] = useState<PcfFactorOption[]>([])
    /* 排放因子选择弹窗：目标数据行 + 弹窗内单选项 + 搜索关键字 */
    const [factorPickerRowId, setFactorPickerRowId] = useState('')
    const [factorPickedId, setFactorPickedId] = useState('')
    const [factorKeyword, setFactorKeyword] = useState('')
    const [units, setUnits] = useState<string[]>([])
    const [formulas, setFormulas] = useState<CalcFormula[]>([])
    const [operationTemplates, setOperationTemplates] = useState<OperationTemplate[]>([])
    const [processTemplates, setProcessTemplates] = useState<ProcessTemplate[]>([])
    const [allStages, setAllStages] = useState<LifecycleStageItem[]>([])
    const [activeOpId, setActiveOpId] = useState('')
    const [keyword, setKeyword] = useState('')
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)

    /* 新增 / 删除工序 / 工艺流程 */
    const [addOpen, setAddOpen] = useState(false)
    const [addForm, setAddForm] = useState<{ opCode: string; processCode: string; stage: string }>({
      opCode: '',
      processCode: '',
      stage: '',
    })
    const [addProcessOpen, setAddProcessOpen] = useState(false)
    const [addProcessCode, setAddProcessCode] = useState('')
    const [addProcessStage, setAddProcessStage] = useState('')
    const [deleteOpId, setDeleteOpId] = useState('')
    const [opBusy, setOpBusy] = useState(false)
    const [formulaBusy, setFormulaBusy] = useState(false)

    const load = useCallback(async () => {
      setLoading(true)
      try {
        const [bundle, activities, factors] = await Promise.all([
          fetchPcfLifecycleBundle(project.id),
          fetchPcfActivityData(project.id),
          fetchPcfFactorOptions(),
        ])
        setOperations(bundle.operations)
        setRows(activities)
        setFactorOptions(factors)
        setDraft({})
        setUnitDraft({})
        setRatioDraft({})
        setFactorDraft({})
        setFactorPickerRowId('')
        setFactorPickedId('')
        // 保持当前选中工序；若已被删除 / 过滤则回到首个
        setActiveOpId((prev) =>
          bundle.operations.some((op) => op.id === prev) ? prev : bundle.operations[0]?.id ?? '',
        )
      } catch (error) {
        toast(error instanceof Error ? error.message : '加载失败', 'error')
      } finally {
        setLoading(false)
      }
    }, [project.id, toast])

    useEffect(() => {
      void load()
      // 重选产品后需按新产品重新复制工序与生成填报行
    }, [load, project.refProductId])

    /* 单位选项、公式库、工序库模板、工艺流程库模板与生命周期阶段库（静态，加载一次） */
    useEffect(() => {
      void (async () => {
        const [unitList, formulaList, templates, processList, stageList] = await Promise.all([
          fetchUnitOptions(),
          fetchCalcFormulas(),
          fetchOperationTemplates(),
          fetchProcessTemplates(),
          fetchLifecycleStages(),
        ])
        setUnits(unitList)
        setFormulas(formulaList)
        setOperationTemplates(templates)
        setProcessTemplates(processList)
        setAllStages(stageList)
      })()
    }, [])

    /** 左树：工艺流程 → 工序（阶段随工艺带出，仅作标签展示） */
    const processGroups = useMemo(() => {
      const buckets: Array<{
        processCode: string
        processName: string
        processStage: string
        rows: PcfOperationConfig[]
      }> = []
      operations.forEach((op) => {
        let group = buckets.find((item) => item.processCode === op.processCode)
        if (!group) {
          group = {
            processCode: op.processCode,
            processName: op.processName,
            processStage: op.processStage,
            rows: [],
          }
          buckets.push(group)
        }
        group.rows.push(op)
      })
      return buckets
    }, [operations])

    /** 左树按「生命周期阶段 → 工艺流程 → 工序」分组（仅含匹配到工序的阶段）；自定义工艺（CUSTOM-）不显示工艺层级 */
    const stageGroups = useMemo(() => {
      const buckets: Array<{
        stage: string
        processes: Array<{ processCode: string; processName: string; custom: boolean; rows: PcfOperationConfig[] }>
      }> = []
      operations.forEach((op) => {
        let stage = buckets.find((item) => item.stage === op.processStage)
        if (!stage) {
          stage = { stage: op.processStage, processes: [] }
          buckets.push(stage)
        }
        let proc = stage.processes.find((item) => item.processCode === op.processCode)
        if (!proc) {
          proc = {
            processCode: op.processCode,
            processName: op.processName,
            custom: op.processCode.startsWith('CUSTOM-'),
            rows: [],
          }
          stage.processes.push(proc)
        }
        proc.rows.push(op)
      })
      return buckets
    }, [operations])

    /** 步骤①勾选纳入的一级阶段：左树分组来源，**未匹配到工艺流程的阶段也显示（空分组）** */
    const treeStages = useMemo(() => {
      let included = (project.lifecycleStages ?? []).filter((s) => s.included && s.level === 1)
      if (included.length === 0) {
        // 项目未配置生命周期阶段（兼容旧数据 / 未保存步骤①）：按边界 + 行业带出默认阶段
        const ruleOf = (s: LifecycleStageItem) => (project.boundary === 'gate' ? s.gateRule : s.graveRule)
        included = allStages
          .filter(
            (s) =>
              s.status === 'enabled' &&
              ruleOf(s) !== 'excluded' &&
              (s.industries.length === 0 || s.industries.includes(project.productIndustry ?? '')),
          )
          .sort((a, b) => a.order - b.order)
          .map((s) => ({
            id: s.id,
            name: s.name,
            level: s.level,
            parentName: '',
            custom: false,
            rule: ruleOf(s),
            included: true,
          }))
      }
      return included.map((stage) => ({
        id: stage.id,
        name: stage.name,
        processes: stageGroups.find((g) => g.stage === stage.name)?.processes ?? [],
      }))
    }, [project, allStages, stageGroups])

    const activeOp = operations.find((item) => item.id === activeOpId) ?? null
    const multiOutput = (activeOp?.outputs.length ?? 0) > 1

    const opRows = useMemo(() => {
      const list = rows.filter((item) => item.operationId === activeOpId)
      const kw = keyword.trim()
      if (!kw) return list
      return list.filter((item) => item.flowName.includes(kw))
    }, [rows, activeOpId, keyword])

    /** 当前工序数据行中活动量变量的并集（按出现顺序）：每个变量一列，列名 = 变量名 */
    const activityColumnNames = useMemo(() => {
      const names: string[] = []
      rows
        .filter((row) => row.operationId === activeOpId)
        .forEach((row) =>
          row.activityValues.forEach((av) => {
            if (!names.includes(av.factorName)) names.push(av.factorName)
          }),
        )
      return names
    }, [rows, activeOpId])

    const qtyValue = (rowId: string, av: PcfActivityValue) =>
      draft[`${rowId}::${av.factorName}`] ?? (av.value == null ? '' : String(av.value))

    /** 活动量单位当前值：草稿优先，其次已保存值 */
    const unitValueOf = (rowId: string, av: PcfActivityValue) =>
      unitDraft[`${rowId}::${av.factorName}`] ?? av.unit

    const ratioValue = (row: PcfActivityData) =>
      ratioDraft[row.id] ?? (row.allocateRatio == null ? '' : String(row.allocateRatio))

    /** 排放来源（因子）当前值：草稿优先，其次已保存值 */
    const factorValueOf = (row: PcfActivityData) => factorDraft[row.id] ?? (row.factorId ?? '')

    /**
     * 排放来源回显：优先取因子库候选项；因子已停用 / 已删除时回退到项目内保存的因子快照。
     * 返回 null = 未匹配。
     */
    const factorDisplayOf = (row: PcfActivityData) => {
      const id = factorValueOf(row)
      if (!id) return null
      const option = factorOptions.find((item) => item.id === id)
      if (option) {
        return {
          name: option.name,
          value: option.value,
          unit: `${option.numeratorUnit}/${option.denominatorUnit}`,
        }
      }
      return { name: row.factorName || id, value: row.factorValue, unit: '' }
    }

    /** 排放因子弹窗候选项：**全量启用态因子，不做自动推荐、不做预选**（本版手动匹配），支持按名称 / 编码过滤 */
    const factorPickerRows = useMemo(() => {
      const kw = factorKeyword.trim().toLowerCase()
      if (!kw) return factorOptions
      return factorOptions.filter(
        (item) => item.name.toLowerCase().includes(kw) || item.code.toLowerCase().includes(kw),
      )
    }, [factorOptions, factorKeyword])

    /** 打开排放因子弹窗：带入该数据项当前已匹配的因子（未匹配 = 空选） */
    const openFactorPicker = (row: PcfActivityData) => {
      setFactorPickedId(factorDisplayOf(row) ? factorValueOf(row) : '')
      setFactorKeyword('')
      setFactorPickerRowId(row.id)
    }

    /** 确认选择：写入草稿，因子名称与因子值即时回显到数据项列表（保存时随活动数据一并提交） */
    const handleFactorConfirm = () => {
      if (!factorPickerRowId) return
      if (!factorPickedId) {
        toast('请选择一条排放因子', 'error')
        return
      }
      setFactorDraft((prev) => ({ ...prev, [factorPickerRowId]: factorPickedId }))
      setFactorPickerRowId('')
      setFactorPickedId('')
      toast('排放来源已匹配')
    }

    const unitOptions = useMemo<SelectOption[]>(
      () => units.map((item) => ({ label: item, value: item })),
      [units],
    )

    /** 活动量单位候选：计量单位库 + 当前数据行公式变量单位（保证默认单位一定可显示） */
    const unitSelectOptions = useMemo<SelectOption[]>(() => {
      const set = new Set<string>(units)
      rows.forEach((row) => row.activityValues.forEach((av) => av.unit && set.add(av.unit)))
      return [...set].map((item) => ({ label: item, value: item }))
    }, [units, rows])

    /** 公式候选（启用态）：数据项可修改绑定公式 */
    const formulaOptions = useMemo<SelectOption[]>(
      () =>
        formulas
          .filter((item) => item.status === 'enabled')
          .map((item) => ({ label: `${item.name}（${item.code}）`, value: item.id })),
      [formulas],
    )

    /** 某行是否已完成：每个活动量均已填 + **需因子的投入项已匹配排放来源** */
    const rowDone = useCallback(
      (row: PcfActivityData) => {
        const allFilled = row.activityValues.every((av) => {
          const raw = draft[`${row.id}::${av.factorName}`]
          return raw !== undefined ? raw.trim() !== '' : av.value != null
        })
        const factorOk =
          row.requiresFactor && row.direction === 'input' ? !!factorValueOf(row) : true
        return allFilled && factorOk
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [draft, factorDraft],
    )

    /** 分配比例合计（多产出工序） */
    const ratioTotal = useMemo(() => {
      if (!activeOp || !multiOutput) return 100
      return rows
        .filter((row) => row.operationId === activeOpId && row.direction === 'output')
        .reduce((sum, row) => {
          const raw = ratioValue(row)
          const num = Number(raw)
          return sum + (raw.trim() === '' || Number.isNaN(num) ? 0 : num)
        }, 0)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rows, activeOpId, multiOutput, ratioDraft])

    /** 填报进度：`pending` 用于前置校验（数量必填 + 投入项排放来源必选，未填全不得保存） */
    const progress = useMemo(() => {
      const filled = rows.filter((row) => rowDone(row)).length
      return { filled, total: rows.length, pending: rows.length - filled }
    }, [rows, rowDone])

    const opFilled = (operationId: string) =>
      rows.some((row) => row.operationId === operationId && rowDone(row))

    const columns = useMemo<Column<PcfActivityData>[]>(() => {
      const base: Column<PcfActivityData>[] = [
        { key: 'flowName', title: '数据项名称', width: 170 },
        {
          key: 'flowType',
          title: '数据项类别',
          width: 90,
          render: (row) => <Tag tone="default">{FLOW_TYPE_TEXT[row.flowType] ?? row.flowType}</Tag>,
        },
        {
          key: 'formula',
          title: '绑定公式',
          width: 200,
          render: (row) => (
            <Select
              value={row.formulaId}
              options={formulaOptions}
              disabled={!editable || formulaBusy}
              onChange={(e) => handleFormulaChange(row.id, e.target.value)}
            />
          ),
        },
        // 按绑定公式中的变量动态成列（如运输公式 = 运输重量 × 运输距离 × 运输因子 → 「运输重量」「运输距离」两列）
        ...activityColumnNames.map((name) => ({
          key: `activity-${name}`,
          title: `${name} *`,
          width: 190,
          render: (row: PcfActivityData) => {
            const av = row.activityValues.find((v) => v.factorName === name)
            if (!av) return <span className="pcf-op-flow">-</span>
            return (
              <div className="pcf-activity-item">
                <Input
                  type="number"
                  min={0}
                  value={qtyValue(row.id, av)}
                  placeholder="请输入"
                  readOnly={!editable}
                  invalid={editable && qtyValue(row.id, av).trim() === ''}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, [`${row.id}::${av.factorName}`]: e.target.value }))
                  }
                />
                <Select
                  className="pcf-unit-select"
                  value={unitValueOf(row.id, av)}
                  options={unitSelectOptions}
                  disabled={!editable}
                  onChange={(e) =>
                    setUnitDraft((prev) => ({
                      ...prev,
                      [`${row.id}::${av.factorName}`]: e.target.value,
                    }))
                  }
                />
              </div>
            )
          },
        })),
        {
          key: 'factorId',
          title: '排放来源',
          width: 240,
          render: (row) => {
            if (!row.requiresFactor) return <span className="pcf-op-flow">-</span>
            const required = row.direction === 'input'
            const display = factorDisplayOf(row)
            const matched = display ? (
              <>
                <span className="pcf-factor-name">{display.name}</span>
                {display.value != null && (
                  <span className="pcf-factor-value">
                    {`${display.value}${display.unit ? ` ${display.unit}` : ''}`}
                  </span>
                )}
              </>
            ) : null
            if (!editable) {
              return matched ? (
                <span className="pcf-factor-cell">{matched}</span>
              ) : (
                <span className="pcf-op-flow">未匹配</span>
              )
            }
            return (
              <button
                type="button"
                className={[
                  'pcf-factor-picker',
                  display ? '' : 'is-empty',
                  required && !display ? 'is-invalid' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                title="点击从排放因子库中选择"
                onClick={() => openFactorPicker(row)}
              >
                {matched ?? (
                  <span className="pcf-factor-name">{required ? '请选择排放因子' : '选填'}</span>
                )}
                <Icon name="chevronDown" size={14} />
              </button>
            )
          },
        },
      ]

      if (multiOutput) {
        base.push({
          key: 'allocateRatio',
          title: '分配比例（%）',
          width: 150,
          render: (row) =>
            row.direction === 'input' ? (
              <span className="pcf-op-flow">-</span>
            ) : (
              <Input
                type="number"
                min={0}
                max={100}
                value={ratioValue(row)}
                placeholder="请输入比例"
                readOnly={!editable}
                onChange={(e) => setRatioDraft((prev) => ({ ...prev, [row.id]: e.target.value }))}
              />
            ),
        })
      }
      return base
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editable, formulaBusy, activityColumnNames, draft, unitDraft, ratioDraft, factorDraft, factorOptions, formulaOptions, unitSelectOptions, multiOutput])

    /** 排放因子弹窗表格：单选列 + 因子名称 / 因子值 / 因子单位（仅「启用」态因子） */
    const factorPickerColumns: Column<PcfFactorOption>[] = [
      {
        key: 'pick',
        title: '',
        width: 48,
        render: (row) => (
          <input
            type="radio"
            name="pcf-factor-pick"
            checked={factorPickedId === row.id}
            onChange={() => setFactorPickedId(row.id)}
          />
        ),
      },
      { key: 'name', title: '因子名称', width: 240 },
      { key: 'value', title: '因子值', width: 120 },
      {
        key: 'unit',
        title: '因子单位',
        render: (row) => `${row.numeratorUnit}/${row.denominatorUnit}`,
      },
    ]

    const handleSubmit = async () => {
      if (!editable || saving) return

      const missingQty = rows.filter((row) =>
        row.activityValues.some((av) => {
          const raw = draft[`${row.id}::${av.factorName}`]
          return raw !== undefined ? raw.trim() === '' : av.value == null
        }),
      )
      if (missingQty.length > 0) {
        toast(`还有 ${missingQty.length} 条数据项存在未填写的活动量，活动数据为必填`, 'error')
        return
      }
      const missingFactor = rows.filter(
        (row) => row.requiresFactor && row.direction === 'input' && !factorValueOf(row),
      )
      if (missingFactor.length > 0) {
        toast(`还有 ${missingFactor.length} 条投入项未匹配排放来源，请手动选择排放因子`, 'error')
        return
      }
      if (multiOutput && Math.abs(ratioTotal - 100) > 0.01) {
        toast(`工序「${activeOp?.opName ?? ''}」的分配比例合计须为 100%（当前 ${ratioTotal}%）`, 'error')
        return
      }

      setSaving(true)
      try {
        await updatePcfActivityData(
          project.id,
          rows.map((row) => {
            const rawRatio = ratioDraft[row.id]
            const toNum = (raw: string | undefined, fallback: number | null) => {
              if (raw === undefined) return fallback
              const trimmed = raw.trim()
              if (trimmed === '') return null
              const num = Number(trimmed)
              return Number.isNaN(num) ? null : num
            }
            return {
              id: row.id,
              activityValues: row.activityValues.map((av) => ({
                factorName: av.factorName,
                value: toNum(draft[`${row.id}::${av.factorName}`], av.value),
                unit: unitDraft[`${row.id}::${av.factorName}`] ?? av.unit,
              })),
              factorId:
                factorDraft[row.id] !== undefined ? factorDraft[row.id] || null : row.factorId,
              allocateRatio: toNum(rawRatio, row.allocateRatio),
            }
          }),
        )

        await load()
        onSaved({ ...project, currentStep: Math.max(project.currentStep, 3) })
        toast('保存成功')
      } catch (error) {
        toast(error instanceof Error ? error.message : '保存失败', 'error')
      } finally {
        setSaving(false)
      }
    }

    useImperativeHandle(ref, () => ({
      submit: () => {
        void handleSubmit()
      },
    }))

    /* ---------- 新增 / 删除工序 ---------- */

    const opTemplateOptions = useMemo<SelectOption[]>(
      () => operationTemplates.map((item) => ({ label: `${item.name}（${item.code}）`, value: item.code })),
      [operationTemplates],
    )

    const processOptions = useMemo<SelectOption[]>(
      () => processGroups.map((group) => ({ label: group.processName, value: group.processCode })),
      [processGroups],
    )

    const processTemplateOptions = useMemo<SelectOption[]>(
      () =>
        processTemplates.map((item) => ({
          label: `${item.name}（${item.lifecycleStage}）`,
          value: item.code,
        })),
      [processTemplates],
    )

    const stageOptions = useMemo<SelectOption[]>(
      () => treeStages.map((stage) => ({ label: stage.name, value: stage.name })),
      [treeStages],
    )

    const handleAddProcess = async () => {
      if (opBusy) return
      if (!addProcessStage) {
        toast('请选择所属生命周期阶段', 'error')
        return
      }
      if (!addProcessCode) {
        toast('请选择工艺流程', 'error')
        return
      }
      setOpBusy(true)
      try {
        await addPcfProcess(project.id, addProcessCode, addProcessStage)
        setAddProcessOpen(false)
        setAddProcessCode('')
        setAddProcessStage('')
        await load()
        toast('工艺流程已新增')
      } catch (error) {
        toast(error instanceof Error ? error.message : '新增失败', 'error')
      } finally {
        setOpBusy(false)
      }
    }

    /** 修改数据项绑定公式：重建变量列并重置默认因子（本地更新，不整页刷新） */
    const handleFormulaChange = async (rowId: string, formulaId: string) => {
      if (formulaBusy) return
      setFormulaBusy(true)
      try {
        const updated = await updatePcfActivityFormula(project.id, rowId, formulaId)
        setRows((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))
        toast('绑定公式已更新')
      } catch (error) {
        toast(error instanceof Error ? error.message : '修改失败', 'error')
      } finally {
        setFormulaBusy(false)
      }
    }

    const handleAddOperation = async () => {
      if (opBusy) return
      if (!addForm.opCode) {
        toast('请选择工序', 'error')
        return
      }
      if (!addForm.processCode && !addForm.stage) {
        toast('请选择所属工艺流程或生命周期阶段', 'error')
        return
      }
      if (addForm.processCode && addForm.stage) {
        toast('所属工艺流程与生命周期阶段只能二选一', 'error')
        return
      }
      setOpBusy(true)
      try {
        await addPcfOperation(project.id, {
          opCode: addForm.opCode,
          processCode: addForm.processCode || undefined,
          stage: addForm.stage || undefined,
        })
        setAddOpen(false)
        setAddForm({ opCode: '', processCode: '', stage: '' })
        await load()
        toast('工序已新增')
      } catch (error) {
        toast(error instanceof Error ? error.message : '新增失败', 'error')
      } finally {
        setOpBusy(false)
      }
    }

    const handleRemoveOperation = async () => {
      if (!deleteOpId || opBusy) return
      setOpBusy(true)
      try {
        await removePcfOperation(project.id, deleteOpId)
        setDeleteOpId('')
        await load()
        toast('工序已删除')
      } catch (error) {
        toast(error instanceof Error ? error.message : '删除失败', 'error')
      } finally {
        setOpBusy(false)
      }
    }

    const deleteTargetOp = operations.find((item) => item.id === deleteOpId) ?? null

    if (loading) {
      return <div className="pcf-placeholder">加载中…</div>
    }

    return (
      <div className="pcf-step-form">
        <div className="pcf-fill-layout">
          <aside className="pcf-fill-tree">
            <div className="pcf-fill-tree-head">
              生命周期阶段 / 工序
              <span className={progress.pending > 0 ? 'pcf-ratio-warn' : 'pcf-panel-tip'}>
                已填 {progress.filled}/{progress.total}
                {progress.pending > 0 ? `（待填 ${progress.pending}）` : '（已填全）'}
              </span>
              {editable && (
                <div className="pcf-inline" style={{ flexWrap: 'wrap' }}>
                  <Button
                    onClick={() => {
                      setAddProcessCode('')
                      setAddProcessStage('')
                      setAddProcessOpen(true)
                    }}
                  >
                    新增工艺流程
                  </Button>
                  <Button
                    onClick={() => {
                      setAddForm({ opCode: '', processCode: '', stage: '' })
                      setAddOpen(true)
                    }}
                  >
                    新增工序
                  </Button>
                </div>
              )}
            </div>
            {treeStages.map((stage) => (
              <div key={stage.id}>
                <div className="pcf-tree-node pcf-tree-level1">
                  <span className="nowrap">{stage.name}</span>
                  {stage.processes.length === 0 && (
                    <span className="pcf-tree-tag">未匹配</span>
                  )}
                </div>
                {stage.processes.length === 0 ? (
                  <div className="pcf-tree-empty">
                    未匹配到该阶段的工艺流程，可点击上方「新增工艺流程 / 新增工序」补充
                  </div>
                ) : (
                  stage.processes.map((proc) =>
                    proc.custom ? (
                      /* 自定义工艺（按阶段新增）：不显示工艺层级，工序直接挂在阶段下 */
                      proc.rows.map((op) => (
                        <div
                          key={op.id}
                          className={[
                            'pcf-tree-node',
                            'pcf-tree-level2',
                            'is-clickable',
                            op.id === activeOpId ? 'is-active' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          onClick={() => {
                            setActiveOpId(op.id)
                            setKeyword('')
                          }}
                        >
                          <span className="nowrap">{op.opName}</span>
                          {opFilled(op.id) && <span className="pcf-tree-dot">已填</span>}
                          {editable && (
                            <button
                              className="pcf-tree-remove"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeleteOpId(op.id)
                              }}
                            >
                              删除
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <div key={proc.processCode}>
                        <div className="pcf-tree-node pcf-tree-level2">
                          <span className="nowrap">{proc.processName}</span>
                        </div>
                        {proc.rows.map((op) => (
                          <div
                            key={op.id}
                            className={[
                              'pcf-tree-node',
                              'pcf-tree-level3',
                              op.id === activeOpId ? 'is-active' : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            onClick={() => {
                              setActiveOpId(op.id)
                              setKeyword('')
                            }}
                          >
                            <span className="nowrap">{op.opName}</span>
                            {opFilled(op.id) && <span className="pcf-tree-dot">已填</span>}
                            {editable && (
                              <button
                                className="pcf-tree-remove"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDeleteOpId(op.id)
                                }}
                              >
                                删除
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ),
                  )
                )}
              </div>
            ))}
          </aside>

          <section className="pcf-fill-main">
            <div className="pcf-fill-head">
              <div className="pcf-content-title">
                {activeOp
                  ? activeOp.processCode.startsWith('CUSTOM-')
                    ? activeOp.opName
                    : `${activeOp.processName} / ${activeOp.opName}`
                  : '请选择核算工序'}
              </div>
              <div className="pcf-inline" style={{ maxWidth: 240 }}>
                <Input
                  value={keyword}
                  placeholder="输入数据项名称搜索"
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>
            </div>

            {activeOp && (
              <>
                <div className="pcf-op-group">
                  <div className="pcf-op-group-title">
                    投入项（{opRows.filter((r) => r.direction === 'input').length}）
                  </div>
                  <div className="pcf-table-wrap">
                    <Table
                      columns={columns}
                      data={opRows.filter((r) => r.direction === 'input')}
                      rowKey={(row) => row.id}
                      emptyText="暂无投入项"
                    />
                  </div>
                </div>

                <div className="pcf-op-group">
                  <div className="pcf-op-group-title">
                    产出项（{opRows.filter((r) => r.direction === 'output').length}）
                    {multiOutput ? (
                      <span className={ratioTotal === 100 ? 'pcf-panel-tip' : 'pcf-ratio-warn'}>
                        分配比例合计 {ratioTotal}%（须为 100%）
                      </span>
                    ) : (
                      <span className="pcf-panel-tip">单产出，分配比例固定 100%</span>
                    )}
                  </div>
                  <div className="pcf-table-wrap">
                    <Table
                      columns={columns}
                      data={opRows.filter((r) => r.direction === 'output')}
                      rowKey={(row) => row.id}
                      emptyText="暂无产出项"
                    />
                  </div>
                </div>
              </>
            )}
            {!activeOp && (
              <div className="pcf-placeholder">
                当前没有与「步骤①勾选的生命周期阶段」匹配的工艺流程或工序：可点击左侧「新增工艺流程 / 新增工序」补充
              </div>
            )}
          </section>
        </div>

        <div className="pcf-form-tip">
          工序已按「引用即复制」从产品带入本项目；步骤①勾选的生命周期阶段全部展示，产品工艺未匹配到的阶段显示为空，
          可通过「新增工艺流程 / 新增工序」补充。活动量为必填（单位可切换），需匹配排放来源的投入项须点击「排放来源」
          单元格，在弹窗中从排放因子库单选匹配；多产出工序的分配比例合计须为 100%。
        </div>

        <Modal
          open={addProcessOpen}
          title="新增工艺流程"
          onClose={() => setAddProcessOpen(false)}
          footer={
            <>
              <Button onClick={() => setAddProcessOpen(false)}>取消</Button>
              <Button variant="primary" disabled={opBusy} onClick={handleAddProcess}>
                确认新增
              </Button>
            </>
          }
        >
          <div className="pcf-step-form">
            <FormField label="所属生命周期阶段" required hint="选择该工艺流程归属的生命周期阶段（默认取步骤①勾选的阶段）">
              <Select
                value={addProcessStage}
                placeholder="请选择阶段"
                options={stageOptions}
                onChange={(e) => setAddProcessStage(e.target.value)}
              />
            </FormField>
            <FormField label="选择工艺流程" required hint="仅工艺流程库中「启用」的工艺可选">
              <Select
                value={addProcessCode}
                placeholder="请选择工艺流程"
                options={processTemplateOptions}
                onChange={(e) => setAddProcessCode(e.target.value)}
              />
            </FormField>
          </div>
        </Modal>

        <Modal
          open={addOpen}
          title="新增工序"
          onClose={() => setAddOpen(false)}
          footer={
            <>
              <Button onClick={() => setAddOpen(false)}>取消</Button>
              <Button variant="primary" disabled={opBusy} onClick={handleAddOperation}>
                确认新增
              </Button>
            </>
          }
        >
          <div className="pcf-step-form">
            <FormField label="选择工序" required hint="仅工序库中「启用」的工序可选">
              <Select
                value={addForm.opCode}
                placeholder="请选择工序"
                options={opTemplateOptions}
                onChange={(e) => setAddForm((prev) => ({ ...prev, opCode: e.target.value }))}
              />
            </FormField>
            <FormField
              label="所属工艺流程"
              hint="与「所属生命周期阶段」二选一：挂到已有工艺流程下"
            >
              <Select
                value={addForm.processCode}
                placeholder="可选：请选择工艺流程"
                options={processOptions}
                onChange={(e) => setAddForm((prev) => ({ ...prev, processCode: e.target.value }))}
              />
            </FormField>
            <FormField
              label="所属生命周期阶段"
              hint="与「所属工艺流程」二选一：直接归属到该阶段（自动创建自定义工艺）"
            >
              <Select
                value={addForm.stage}
                placeholder="可选：请选择生命周期阶段"
                options={stageOptions}
                onChange={(e) => setAddForm((prev) => ({ ...prev, stage: e.target.value }))}
              />
            </FormField>
          </div>
        </Modal>

        <Modal
          open={!!deleteOpId}
          title="确认删除工序"
          size="sm"
          onClose={() => setDeleteOpId('')}
          footer={
            <>
              <Button onClick={() => setDeleteOpId('')}>取消</Button>
              <Button variant="danger" disabled={opBusy} onClick={handleRemoveOperation}>
                确认删除
              </Button>
            </>
          }
        >
          删除后该工序及其活动数据填报行将一并移除，确认删除工序「{deleteTargetOp?.opName ?? ''}」？
        </Modal>

        <Modal
          open={!!factorPickerRowId}
          title="选择排放因子"
          size="lg"
          onClose={() => setFactorPickerRowId('')}
          footer={
            <>
              <Button onClick={() => setFactorPickerRowId('')}>取消</Button>
              <Button variant="primary" disabled={!factorPickedId} onClick={handleFactorConfirm}>
                确认选择
              </Button>
            </>
          }
        >
          <div className="pcf-picker-query">
            <Input
              value={factorKeyword}
              placeholder="输入因子名称 / 因子编码搜索"
              onChange={(e) => setFactorKeyword(e.target.value)}
            />
          </div>
          <div className="pcf-table-wrap pcf-factor-table">
            <Table
              columns={factorPickerColumns}
              data={factorPickerRows}
              rowKey={(row) => row.id}
              emptyText="未找到匹配的排放因子"
              onRowClick={(row) => setFactorPickedId(row.id)}
              rowClassName={(row) => (factorPickedId === row.id ? 'is-picked' : '')}
            />
          </div>
          <div className="pcf-factor-tip">
            仅展示排放因子库中「启用」的因子，单选；确认后因子名称与因子值将回显到数据项列表。
          </div>
        </Modal>
      </div>
    )
  },
)

export default ProjectStepTwo
