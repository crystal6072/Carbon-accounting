import type { ReactNode } from 'react'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Button, CascaderSelect, Icon, Input, Modal, Select, Table, useToast, VoucherModal } from '@/shared/components'
import type { Column, SelectOption } from '@/shared/components'
import {
  fetchLifecycleStages,
  fetchMyFactorLibraries,
  fetchMyFactors,
  fetchOperations,
  fetchPcfFactorOptions,
  fetchPcfProcessNodes,
  fetchPcfProject,
  fetchPcfStageData,
  fetchPublishedLibraries,
  fetchPublishedLibraryDetail,
  fetchUnitGroupOptions,
  savePcfProcessNodes,
  savePcfStageData,
  savePcfStageMetadata,
} from '@/mock'
import { fetchCalcRules } from '@/mock/config'
import type { CalcRule } from '@/mock/config'
import type {
  FactorCalibers,
  FactorItem,
  LifecycleStageItem,
  PcfDataItemDirection,
  PcfDataItemType,
  PcfEmissionType,
  OperationItem,
  FlowItemType,
  PcfFactorOption,
  PcfProcessNode,
  PcfProject,
  PcfVoucher,
  TreeOption,
} from '@/types'
import { downloadCsv, parseCsvText, toCsv } from '@/shared/utils/csv'
import FactorInfoPanel from '../factor/FactorInfoPanel'
import StageParamModal from './StageParamModal'
import AllocationCalcModal, { allocDefaultToMethod } from './AllocationCalcModal'
import type { AllocationCalcRow } from './AllocationCalcModal'
import PcfFlowCanvas from './PcfFlowCanvas'
import {
  buildStageSeedsFromProcess,
  emissionCategoryToType,
  flowTypeToItemType,
} from './processImport'
import {
  ALL_TYPE_OPTIONS,
  PCF_EMISSION_BY_TEXT,
  PCF_EMISSION_TYPE_TEXT,
  PCF_ITEM_TYPE_TEXT,
  PCF_TYPE_BY_TEXT,
  pcfDirectionOf,
} from './pcfItemMeta'
import './PcfPage.css'

export interface ProjectStepTwoHandle {
  submit: () => void
}

interface ProjectStepTwoProps {
  project: PcfProject
  editable: boolean
  onSaved: (project: PcfProject) => void
  /** 保存成功后由工作台触发（「下一步」→ 进入步骤③） */
  onNext?: () => void
}

/* 数据项字典（类型 / 排放物类型 / 方向推导）统一取自 `./pcfItemMeta`，与模型「产品建模」共用 */

/** 本地编辑态（数量用字符串便于输入，保存时转数值） */
interface EditItem {
  id: string
  stageId: string
  stageName: string
  /** 所属过程节点（空 = 挂在阶段下） */
  nodeId: string | null
  /** 所属工序（引用「工序管理」库；空 = 自定义数据，未关联工序） */
  processName: string
  name: string
  itemType: PcfDataItemType
  emissionType: PcfEmissionType | null
  quantity: string
  unit: string
  factorId: string
  factorName: string
  factorValue: number | null
  /** 因子单位快照（如 `kgCO₂e/kg`，选中因子后回显） */
  factorUnit: string
  /** 因子口径快照（选填；用于「含 / 不含生物碳」双口径核算） */
  factorCalibers: FactorCalibers | null
  /** 数据凭证附件（**选填、可多个**） */
  vouchers: PcfVoucher[]
}

/** 导入解析结果 */
interface ImportValidRow {
  key: string
  name: string
  itemType: PcfDataItemType
  emissionType: PcfEmissionType | null
  quantity: string
  unit: string
}

interface ImportErrorRow {
  row: number
  name: string
  reason: string
}

let itemSeed = 0
let nodeSeed = 0
const nextItemId = () => `SD-${Date.now().toString().slice(-6)}-${itemSeed++}`
const nextNodeId = () => `PN-${Date.now().toString().slice(-6)}-${nodeSeed++}`

const blankItem = (stageId: string, stageName: string, nodeId: string | null): EditItem => ({
  id: nextItemId(),
  stageId,
  stageName,
  nodeId,
  processName: '',
  name: '',
  itemType: 'material',
  emissionType: null,
  quantity: '',
  unit: '',
  factorId: '',
  factorName: '',
  factorValue: null,
  factorUnit: '',
  factorCalibers: null,
  vouchers: [],
})

/** 选中因子回显文本：因子名称后追加油子值与单位（如「毛竹原材料排放因子（1.8 kgCO₂e/kg）」） */
const factorEchoOf = (name: string, value: number | null, unit: string) =>
  value == null ? name : `${name}（${value}${unit ? ` ${unit}` : ''}）`

/** 工序投入产出流类型中文（与「核算数据类型」口径一致） */
const flowTypeText = (flow: FlowItemType): string =>
  PCF_ITEM_TYPE_TEXT[flowTypeToItemType(flow)] ?? flow

/** 项目已纳入的生命周期阶段（步骤①勾选优先，未配置时按边界带出） */
function resolveStagesOf(project: PcfProject, allStages: LifecycleStageItem[]) {
  const included = (project.lifecycleStages ?? []).filter((s) => s.included)
  if (included.length > 0) {
    return included.map((s) => ({
      id: s.id,
      name: s.name,
      level: s.level,
      parentId: s.parentName ? included.find((p) => p.name === s.parentName)?.id ?? null : null,
    }))
  }
  return allStages
    .filter(
      (s) => s.status === 'enabled' && (s.boundaries.length === 0 || s.boundaries.includes(project.boundary)),
    )
    .sort((a, b) => a.order - b.order)
    .map((s) => ({ id: s.id, name: s.name, level: s.level, parentId: s.parentId }))
}

/**
 * 工作台步骤②「产品建模」内容区。
 *
 * - 左侧：步骤①勾选的生命周期阶段 + 各阶段下的**过程节点**（「继续追溯」生成）；
 * - 选中阶段 / 节点后，右侧为**统一的数据列表**（输入 / 输出合并在同一张表），默认保留一行空白行，支持新增 / 删除；
 * - 列：名称、数据项类型（原辅料 / 能源 / 自然资源 / 中间产品 / 产品 / 副产品 / 废弃物/排放物，取自「核算数据类型」字典）、数量、单位、上游过程名称、操作；
 * - **上游过程名称**列：未追溯时提供「引用因子 / 继续追溯」；点击「继续追溯」按数据项名称生成**子节点**并在其中录入数据；
 * - **导入**统一为「下载模板 → 上传 CSV → 校验 → 导入」，按当前作用域追加数据项。
 */
const ProjectStepTwo = forwardRef<ProjectStepTwoHandle, ProjectStepTwoProps>(
  function ProjectStepTwo({ project, editable, onSaved, onNext }, ref) {
    const toast = useToast()
    const importFileRef = useRef<HTMLInputElement>(null)

    const [items, setItems] = useState<EditItem[]>([])
    const [nodes, setNodes] = useState<PcfProcessNode[]>([])
    /** 计量单位多级选项（按单位类型分组） */
    const [unitTree, setUnitTree] = useState<TreeOption[]>([])
    const [factors, setFactors] = useState<PcfFactorOption[]>([])
    const [allStages, setAllStages] = useState<LifecycleStageItem[]>([])
    const [activeStageId, setActiveStageId] = useState('')
    /** 当前过程节点（空 = 生命周期阶段根） */
    const [activeNodeId, setActiveNodeId] = useState('')
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    /** 阶段基础参数（JSON 扩展字段）本地落库快照：保存后立即反映到摘要，无需整项目重载 */
    const [stageMetaOverrides, setStageMetaOverrides] = useState<
      Record<string, Record<string, string | number> | null>
    >({})

    /* 排放因子选择弹窗（「引用因子」） */
    const [factorDraft, setFactorDraft] = useState<Record<string, string>>({})
    const [factorPickerRowId, setFactorPickerRowId] = useState('')
    const [factorPickedId, setFactorPickedId] = useState('')
    const [factorKeyword, setFactorKeyword] = useState('')
    const [pickerLibraries, setPickerLibraries] = useState<Array<{ id: string; name: string; group: string }>>([])
    const [pickerLibId, setPickerLibId] = useState('')
    const [pickerLibFactors, setPickerLibFactors] = useState<FactorItem[]>([])
    const [pickerLoading, setPickerLoading] = useState(false)
    const [pickerViewFactorId, setPickerViewFactorId] = useState('')

    /* 数据凭证附件（操作列入口：上传 / 查看凭证，非必填） */
    const [voucherRowId, setVoucherRowId] = useState('')

    /* 导入（下载模板 → 上传 → 校验 → 导入） */
    const [importOpen, setImportOpen] = useState(false)
    const [importFileName, setImportFileName] = useState('')
    const [importValid, setImportValid] = useState<ImportValidRow[]>([])
    const [importErrors, setImportErrors] = useState<ImportErrorRow[]>([])
    const [importParsed, setImportParsed] = useState(false)

    /* 添加数据：自定义数据 / 从工序添加（二选一） */
    const [addOpen, setAddOpen] = useState(false)
    const [addMode, setAddMode] = useState<'custom' | 'process'>('custom')
    /* 自定义数据表单：活动数据名称 / 类型 / 单位 */
    const [customName, setCustomName] = useState('')
    const [customType, setCustomType] = useState<PcfDataItemType>('material')
    const [customUnit, setCustomUnit] = useState('')
    /* 工序选择：引用「工序管理」库，回填其投入产出流 */
    const [operations, setOperations] = useState<OperationItem[]>([])
    const [opKeyword, setOpKeyword] = useState('')
    const [opLoading, setOpLoading] = useState(false)
    /** 已选工序（支持多选） */
    const [selectedOpIds, setSelectedOpIds] = useState<string[]>([])

    /* 模型预览 · 流程画布 */
    const [canvasOpen, setCanvasOpen] = useState(false)

    /* 分配计算 */
    const [allocOpen, setAllocOpen] = useState(false)
    /** 项目所选核算规则：决定是否展示「分配计算」入口 */
    const [calcRule, setCalcRule] = useState<CalcRule | null>(null)
    /** 落库基线快照：用于判断「数据是否真的变更」（无变更时不再弹「数据变更」提示、不重复保存） */
    const baselineRef = useRef('')

    const load = useCallback(async () => {
      setLoading(true)
      try {
        const [data, nodeList, unitTreeList, factorList, stageList] = await Promise.all([
          fetchPcfStageData(project.id),
          fetchPcfProcessNodes(project.id),
          fetchUnitGroupOptions(),
          fetchPcfFactorOptions(),
          fetchLifecycleStages(),
        ])
        setUnitTree(unitTreeList)
        setFactors(factorList)
        setAllStages(stageList)
        setNodes(nodeList)
        let mapped: EditItem[] = data.map((item) => ({
          id: item.id,
          stageId: item.stageId,
          stageName: item.stageName,
          nodeId: item.nodeId ?? null,
          processName: item.processName ?? '',
          name: item.name,
          itemType: item.itemType,
          emissionType: item.emissionType ?? null,
          quantity: item.quantity == null ? '' : String(item.quantity),
          unit: item.unit,
          factorId: item.factorId ?? '',
          factorName: item.factorName,
          factorValue: item.factorValue,
          factorUnit: item.factorUnit ?? '',
          factorCalibers: item.factorCalibers ?? null,
          vouchers: item.vouchers ?? [],
        }))
        /**
         * 所属工艺带入（首次进入产品建模且尚无数据时）：
         * 若步骤①已选工艺流程，把工艺流程下各工序的投入产出流带入其所属生命周期阶段，可继续编辑。
         */
        if (mapped.length === 0 && project.processName && project.currentStep <= 2) {
          const seeds = await buildStageSeedsFromProcess(
            project.processName,
            resolveStagesOf(project, stageList),
          )
          if (seeds.length > 0) {
            mapped = seeds.map((seed) => ({
              ...blankItem(seed.stageId, seed.stageName, null),
              processName: seed.processName,
              name: seed.name,
              itemType: seed.itemType,
              emissionType: seed.emissionType,
              unit: seed.unit,
            }))
            toast(`已按所属工艺「${project.processName}」带入 ${seeds.length} 条工序数据，请核对`)
          }
        }
        setItems(mapped)
        baselineRef.current = JSON.stringify({ items: mapped, nodes: nodeList })
        setFactorDraft({})
      } catch (error) {
        toast(error instanceof Error ? error.message : '加载失败', 'error')
      } finally {
        setLoading(false)
      }
    }, [project.id, project.processName, project.currentStep, project.lifecycleStages, project.boundary, toast])

    useEffect(() => {
      void load()
    }, [load])

    /**
     * 拉取步骤①所选核算规则：
     * 「分配计算」仅在规则允许分配且副产品处理方式为「分摊法」时展示；
     * 项目未关联规则时不做限制（保持默认可用）。
     */
    useEffect(() => {
      let alive = true
      void (async () => {
        if (!project.calcRuleNo) {
          setCalcRule(null)
          return
        }
        try {
          const rules = await fetchCalcRules()
          if (!alive) return
          setCalcRule(rules.find((rule) => rule.id === project.calcRuleNo) ?? null)
        } catch {
          /* 规则加载失败时按「不限制」处理，避免阻断步骤②录入 */
          if (alive) setCalcRule(null)
        }
      })()
      return () => {
        alive = false
      }
    }, [project.calcRuleNo])

    /**
     * 是否展示「分配计算」入口：
     * - 步骤①未关联核算规则（calcRuleNo 为空）：保持默认可用，不限制；
     * - 已关联规则但查不到（如新建规则尚未落库、编号不匹配）：保守隐藏，避免「已选规则却仍提示可分配」；
     * - 已关联且查到：须满足「允许分配」才展示。
     */
    const allowAllocation = project.calcRuleNo
      ? calcRule
        ? calcRule.allowAllocate === 'yes'
        : false
      : true

    /** 左侧阶段：默认取步骤①勾选纳入的生命周期阶段；未配置时按边界带出 */
    const stages = useMemo(
      () => resolveStagesOf(project, allStages),
      [project.lifecycleStages, project.boundary, allStages],
    )

    /** 末级生命周期阶段：二级阶段恒为末级；一级阶段无下级阶段时才是末级（**仅末级可点击录入**） */
    const leafStageIds = useMemo(() => {
      const parents = new Set(stages.map((s) => s.parentId).filter(Boolean) as string[])
      return new Set(stages.filter((s) => s.level === 2 || !parents.has(s.id)).map((s) => s.id))
    }, [stages])

    useEffect(() => {
      const firstLeaf = stages.find((s) => leafStageIds.has(s.id))
      if (!firstLeaf) {
        setActiveStageId('')
        return
      }
      setActiveStageId((prev) => (leafStageIds.has(prev) ? prev : firstLeaf.id))
    }, [stages, leafStageIds])

    const activeStage = stages.find((s) => s.id === activeStageId) ?? null
    const activeNode = nodes.find((n) => n.id === activeNodeId) ?? null

    /** 各阶段基础参数映射（含本地落库快照），供「过程参数维护」弹窗初始化表单 */
    const stageMetaMap = useMemo(() => {
      const map: Record<string, Record<string, string | number> | null> = {}
      stages.forEach((stage) => {
        map[stage.id] =
          stageMetaOverrides[stage.id] ??
          project.lifecycleStages?.find((s) => s.id === stage.id)?.stageMetadata ??
          null
      })
      return map
    }, [stages, stageMetaOverrides, project.lifecycleStages])

    /** 「过程参数维护」弹窗固定阶段（写死）：采伐阶段 / 运输阶段 / 废弃与循环；id 优先对齐真实阶段以便参数落库 */
    const paramStages = useMemo(() => {
      const pickId = (...keywords: string[]) => {
        for (const keyword of keywords) {
          const found = stages.find((stage) => stage.name.includes(keyword))
          if (found) return found.id
        }
        return ''
      }
      return [
        { id: pickId('采伐', '原材料获取') || 'harvest', name: '采伐阶段' },
        { id: pickId('运输') || 'transport', name: '运输阶段' },
        { id: pickId('使用') || 'use', name: '使用阶段' },
        { id: pickId('废弃', '循环', '生命末期') || 'endoflife', name: '废弃与循环' },
      ]
    }, [stages])

    /** 弹窗默认预选阶段：当前活动阶段命中固定列表则预选之，否则默认「采伐阶段」 */
    const defaultParamStageId =
      paramStages.find((stage) => stage.id === activeStage?.id)?.id ?? paramStages[0].id

    /** 「过程参数维护」弹窗开关 */
    const [paramModalOpen, setParamModalOpen] = useState(false)

    /** 保存阶段基础参数：打包为 JSON 写入阶段节点 `stageMetadata`（不参与活动数据计算） */
    const handleSaveStageParams = async (
      stageId: string,
      metadata: Record<string, string | number> | null,
    ) => {
      if (!project.id) {
        toast('请先保存项目后再录入阶段基础参数', 'error')
        return
      }
      await savePcfStageMetadata(project.id, stageId, metadata)
      setStageMetaOverrides((prev) => ({ ...prev, [stageId]: metadata }))
    }

    /**
     * 一键生成：仅由「阶段基础参数」推导结果并在弹窗面板内显示，不回填活动数据列表。
     */

    /** 默认保留一行空白行（当前作用域） */
    useEffect(() => {
      if (!editable || !activeStage) return
      setItems((prev) => {
        const exists = prev.some(
          (item) => item.stageId === activeStage.id && (item.nodeId ?? '') === activeNodeId,
        )
        return exists ? prev : [...prev, blankItem(activeStage.id, activeStage.name, activeNodeId || null)]
      })
    }, [editable, activeStage, activeNodeId])

    const scopeItems = items.filter(
      (item) => item.stageId === activeStageId && (item.nodeId ?? '') === activeNodeId,
    )

    const unitOptions = useMemo<TreeOption[]>(() => unitTree, [unitTree])

    const updateItem = (id: string, patch: Partial<EditItem>) => {
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
      promptIfCompletedChanged()
    }

    const handleAdd = () => {
      if (!activeStage) {
        toast('请先选择生命周期阶段', 'error')
        return
      }
      setCustomName('')
      setCustomType('material')
      setCustomUnit('')
      setSelectedOpIds([])
      setOpKeyword('')
      setAddMode('custom')
      setAddOpen(true)
    }

    /** 进入「从工序添加」时拉取启用中的工序库，供选择回填 */
    useEffect(() => {
      if (!addOpen || addMode !== 'process') return
      let alive = true
      void (async () => {
        setOpLoading(true)
        try {
          const list = await fetchOperations()
          if (!alive) return
          setOperations(list.filter((item) => item.useStatus === 'enabled'))
        } catch {
          if (alive) setOperations([])
        } finally {
          if (alive) setOpLoading(false)
        }
      })()
      return () => {
        alive = false
      }
    }, [addOpen, addMode])

    /** 确认「自定义数据」：回填名称 / 类型 / 单位，新增一行 */
    const handleAddCustomConfirm = () => {
      if (!activeStage) return
      if (!customName.trim()) {
        toast('请输入活动数据名称', 'error')
        return
      }
      setItems((prev) => [
        ...prev,
        {
          ...blankItem(activeStage.id, activeStage.name, activeNodeId || null),
          name: customName.trim(),
          itemType: customType,
          unit: customUnit,
          processName: '',
        },
      ])
      setAddOpen(false)
      toast('已新增一行自定义活动数据，请补充数量并引用因子')
      promptIfCompletedChanged()
    }

    /** 确认「从工序添加」：回填所选多道工序的投入产出流为多条数据项 */
    const handleAddProcessConfirm = () => {
      if (!activeStage) return
      const pickedOps = operations.filter((item) => selectedOpIds.includes(item.id))
      if (pickedOps.length === 0) {
        toast('请至少选择一道工序', 'error')
        return
      }
      const additions: EditItem[] = pickedOps.flatMap((op) =>
        [...op.inputs, ...op.outputs].map((flow) => ({
          ...blankItem(activeStage.id, activeStage.name, activeNodeId || null),
          name: flow.refName,
          itemType: flowTypeToItemType(flow.flowType),
          emissionType: flow.flowType === 'emission' ? emissionCategoryToType(flow.emissionCategory) : null,
          unit: flow.unit,
          processName: op.name,
        })),
      )
      setItems((prev) => [...prev, ...additions])
      setAddOpen(false)
      toast(`已回填 ${pickedOps.length} 道工序的 ${additions.length} 条活动数据，请核对`)
      promptIfCompletedChanged()
    }

    const handleDelete = (id: string) => {
      setItems((prev) => prev.filter((item) => item.id !== id))
      promptIfCompletedChanged()
    }

    /** 应用「分配计算」：在当前作用域追加当前产品一行 */
    const handleAllocationApply = (row: AllocationCalcRow) => {
      if (!activeStage) {
        toast('请先选择生命周期阶段', 'error')
        return
      }
      const addition: EditItem = {
        ...blankItem(activeStage.id, activeStage.name, activeNodeId || null),
        name: row.name,
        itemType: row.itemType,
        quantity: String(row.quantity),
        unit: row.unit,
      }
      setItems((prev) => [...prev, addition])
      setAllocOpen(false)
      toast('已成功应用并回填当前产品分配数据，请核对')
      promptIfCompletedChanged()
    }

    /* ---------- 过程节点（继续追溯） ---------- */

    const handleTrace = (item: EditItem) => {
      if (!item.name.trim()) {
        toast('请先填写数据项名称，再继续追溯', 'error')
        return
      }
      const exists = nodes.find((node) => node.sourceItemId === item.id)
      if (exists) {
        setActiveNodeId(exists.id)
        return
      }
      const node: PcfProcessNode = {
        id: nextNodeId(),
        projectId: project.id,
        stageId: item.stageId,
        parentId: item.nodeId ?? null,
        name: item.name.trim(),
        sourceItemId: item.id,
      }
      setNodes((prev) => [...prev, node])
      setActiveNodeId(node.id)
      toast(`已生成子节点「${node.name}」，请录入其数据`)
      promptIfCompletedChanged()
    }

    const handleDeleteNode = (nodeId: string) => {
      const collect = (id: string): string[] => [
        id,
        ...nodes.filter((n) => n.parentId === id).flatMap((n) => collect(n.id)),
      ]
      const ids = collect(nodeId)
      setNodes((prev) => prev.filter((node) => !ids.includes(node.id)))
      setItems((prev) => prev.filter((item) => !ids.includes(item.nodeId ?? '')))
      setActiveNodeId((prev) => (ids.includes(prev) ? '' : prev))
      toast('节点已删除')
      promptIfCompletedChanged()
    }

    /* ---------- 导入：下载模板 → 上传 CSV → 校验 → 导入 ---------- */

    const downloadTemplate = () => {
      downloadCsv(
        '产品建模数据导入模板.csv',
        toCsv([
          ['名称', '数据项类型', '数量', '单位', '排放物类型'],
          ['竹板材', '原辅料', '0.1', 'kg', ''],
          ['电力', '能源', '1.5', 'kWh', ''],
          ['废水', '废弃物/排放物', '0.03', 'm³', '废水'],
        ]),
      )
    }

    const openImport = () => {
      setImportFileName('')
      setImportValid([])
      setImportErrors([])
      setImportParsed(false)
      setImportOpen(true)
    }

    const handleImportFile = async (file: File) => {
      setImportFileName(file.name)
      setImportValid([])
      setImportErrors([])
      setImportParsed(false)
      try {
        const text = await file.text()
        const rows = parseCsvText(text)
        if (rows.length <= 1) {
          toast('文件为空或缺少数据行', 'error')
          setImportParsed(true)
          return
        }
        const valid: ImportValidRow[] = []
        const errors: ImportErrorRow[] = []
        rows.slice(1).forEach((row, index) => {
          const lineNo = index + 2
          const name = (row[0] ?? '').trim()
          const typeText = (row[1] ?? '').trim()
          const qtyText = (row[2] ?? '').trim()
          const unit = (row[3] ?? '').trim()
          const emissionText = (row[4] ?? '').trim()

          if (!name) {
            errors.push({ row: lineNo, name: '（空）', reason: '名称不能为空' })
            return
          }
          const itemType = PCF_TYPE_BY_TEXT[typeText]
          if (!itemType) {
            errors.push({ row: lineNo, name, reason: `数据项类型无效：${typeText || '（空）'}` })
            return
          }
          const quantity = Number(qtyText)
          if (qtyText === '' || !Number.isFinite(quantity)) {
            errors.push({ row: lineNo, name, reason: '数量须为数值（可为负数，表示扣减 / 流出）' })
            return
          }
          let emissionType: PcfEmissionType | null = null
          if (itemType === 'emission') {
            emissionType = PCF_EMISSION_BY_TEXT[emissionText] ?? null
            if (!emissionType) {
              errors.push({ row: lineNo, name, reason: `排放物类型无效：${emissionText || '（空）'}` })
              return
            }
          }
          valid.push({ key: `v-${lineNo}`, name, itemType, emissionType, quantity: String(quantity), unit })
        })
        setImportValid(valid)
        setImportErrors(errors)
        setImportParsed(true)
      } catch (error) {
        toast(error instanceof Error ? error.message : '文件解析失败', 'error')
        setImportParsed(true)
      }
    }

    const handleImportConfirm = () => {
      if (!activeStage || importValid.length === 0) return
      const nodeId = activeNodeId || null
      const additions: EditItem[] = importValid.map((row) => ({
        ...blankItem(activeStage.id, activeStage.name, nodeId),
        name: row.name,
        itemType: row.itemType,
        emissionType: row.emissionType,
        quantity: row.quantity,
        unit: row.unit,
      }))
      // 导入前移除当前作用域下的空白行，避免与导入项混排
      setItems((prev) => [
        ...prev.filter(
          (item) =>
            !(
              item.stageId === activeStage.id &&
              (item.nodeId ?? '') === activeNodeId &&
              item.name.trim() === ''
            ),
        ),
        ...additions,
      ])
      setImportOpen(false)
      toast(`已导入 ${additions.length} 条数据项`)
      promptIfCompletedChanged()
    }

    /* ---------- 排放因子：弹窗选择（「引用因子」） ---------- */

    const factorValueOf = (item: EditItem) => factorDraft[item.id] ?? item.factorId

    const factorDisplayOf = (item: EditItem) => {
      const id = factorValueOf(item)
      if (!id) return null
      const option = factors.find((x) => x.id === id)
      if (option) {
        return {
          name: option.name,
          value: option.value,
          unit: `${option.numeratorUnit}/${option.denominatorUnit}`,
        }
      }
      return { name: item.factorName || id, value: item.factorValue, unit: item.factorUnit ?? '' }
    }

    const loadPickerFactors = useCallback(async (libKey: string) => {
      if (!libKey) {
        setPickerLibFactors([])
        return
      }
      setPickerLoading(true)
      try {
        if (libKey.startsWith('MY:')) {
          setPickerLibFactors(await fetchMyFactors(libKey.slice(3)))
        } else {
          const detail = await fetchPublishedLibraryDetail(libKey.slice(4))
          setPickerLibFactors(detail.factors)
        }
      } catch {
        setPickerLibFactors([])
      } finally {
        setPickerLoading(false)
      }
    }, [])

    const selectPickerLib = async (libKey: string) => {
      setPickerLibId(libKey)
      await loadPickerFactors(libKey)
    }

    const openFactorPicker = async (item: EditItem) => {
      setFactorPickedId(factorDisplayOf(item) ? factorValueOf(item) : '')
      setFactorKeyword('')
      setFactorPickerRowId(item.id)
      setPickerLoading(true)
      try {
        const [published, mine] = await Promise.all([fetchPublishedLibraries(), fetchMyFactorLibraries()])
        const libraries = [
          ...published.map((lib) => ({ id: `LIB:${lib.id}`, name: lib.name, group: '背景数据库' })),
          ...mine.map((lib) => ({ id: `MY:${lib.id}`, name: lib.name, group: '我的因子库' })),
        ]
        setPickerLibraries(libraries)
        const first = libraries[0]?.id ?? ''
        setPickerLibId(first)
        await loadPickerFactors(first)
      } catch (error) {
        toast(error instanceof Error ? error.message : '因子库加载失败', 'error')
      } finally {
        setPickerLoading(false)
      }
    }

    const factorPickerRows = useMemo(() => {
      const kw = factorKeyword.trim().toLowerCase()
      if (!kw) return pickerLibFactors
      return pickerLibFactors.filter(
        (item) => item.name.toLowerCase().includes(kw) || item.code.toLowerCase().includes(kw),
      )
    }, [pickerLibFactors, factorKeyword])

    const pickerViewFactor = pickerLibFactors.find((item) => item.id === pickerViewFactorId) ?? null

    const handleFactorConfirm = () => {
      if (!factorPickerRowId) return
      if (!factorPickedId) {
        toast('请选择一条排放因子', 'error')
        return
      }
      setFactorDraft((prev) => ({ ...prev, [factorPickerRowId]: factorPickedId }))
      setFactorPickerRowId('')
      setFactorPickedId('')
      toast('排放因子已匹配')
      promptIfCompletedChanged()
    }

    /** 撤回因子选择：恢复为「引用因子 / 继续追溯」二选一 */
    const handleCancelFactor = (itemId: string) => {
      setFactorDraft((prev) => ({ ...prev, [itemId]: '' }))
      updateItem(itemId, { factorId: '', factorName: '', factorValue: null, factorUnit: '', factorCalibers: null })
      toast('已撤回因子选择')
    }

    const factorPickerColumns: Column<FactorItem>[] = [
      {
        key: 'pick',
        title: '',
        width: 48,
        render: (row) => (
          <input
            type="radio"
            name="pcf-stage-factor-pick"
            checked={factorPickedId === row.id}
            onChange={() => setFactorPickedId(row.id)}
          />
        ),
      },
      { key: 'name', title: '因子名称', width: 240 },
      { key: 'value', title: '因子值', width: 120 },
      { key: 'unit', title: '因子单位', render: (row) => `${row.numeratorUnit}/${row.denominatorUnit}` },
      {
        key: 'view',
        title: '操作',
        width: 90,
        render: (row) => (
          <button
            type="button"
            className="link"
            onClick={(e) => {
              e.stopPropagation()
              setPickerViewFactorId(row.id)
            }}
          >
            查看
          </button>
        ),
      },
    ]

    /* ---------- 保存 ---------- */

    /** 已完成项目改数据：先弹「数据变更」提示，确认后再落库并回退重算 */
    const [recalcConfirm, setRecalcConfirm] = useState(false)

    /** 已完成/已核算项目：用户发起数据变更时立即弹出「需重新核算」确认 */
    const promptIfCompletedChanged = useCallback(() => {
      if ((project.status === 'done' || project.status === 'calculated') && !recalcConfirm) {
        setRecalcConfirm(true)
      }
    }, [project.status, recalcConfirm])

    /** 取消变更：回退到最近一次落库基线 */
    const revertToBaseline = useCallback(() => {
      if (baselineRef.current) {
        try {
          const { items: baseItems, nodes: baseNodes } = JSON.parse(baselineRef.current)
          setItems(baseItems)
          setNodes(baseNodes)
          setFactorDraft({})
        } catch {
          // ignore parse error
        }
      }
    }, [])

    const performSave = async (fromChange = false) => {
      // 空白行（未填名称）不落库，仅校验已填写的数据项
      const meaningful = items.filter(
        (item) => item.name.trim() !== '' && stages.some((s) => s.id === item.stageId),
      )
      setSaving(true)
      try {
        await savePcfStageData(
          project.id,
          meaningful.map((item) => {
            const fid = factorDraft[item.id] !== undefined ? factorDraft[item.id] : item.factorId
            const picked = factors.find((x) => x.id === fid)
            return {
              id: item.id,
              projectId: project.id,
              stageId: item.stageId,
              stageName: stages.find((s) => s.id === item.stageId)?.name ?? item.stageName,
              nodeId: item.nodeId ?? null,
              processName: item.processName || null,
              direction: pcfDirectionOf(item.itemType),
              name: item.name.trim(),
              itemType: item.itemType,
              emissionType: item.itemType === 'emission' ? item.emissionType : null,
              quantity: Number(item.quantity),
              unit: item.unit,
              factorId: fid ? fid : null,
              factorName: picked ? picked.name : fid ? item.factorName : '',
              factorValue: picked ? picked.value : fid ? item.factorValue : null,
              factorUnit: picked
                ? picked.numeratorUnit && picked.denominatorUnit
                  ? `${picked.numeratorUnit}/${picked.denominatorUnit}`
                  : picked.numeratorUnit || picked.denominatorUnit || ''
                : fid
                  ? item.factorUnit
                  : '',
              factorCalibers: picked ? picked.calibers ?? null : fid ? item.factorCalibers : null,
              vouchers: item.vouchers,
            }
          }),
        )
        await savePcfProcessNodes(project.id, nodes)
        await load()
        // 保存后回读项目（服务端在回改数据后会回退「待检测」，需重走一键检测 → 核算）
        onSaved(await fetchPcfProject(project.id))
        if (!fromChange) {
          onNext?.()
        }
        toast(fromChange ? '保存成功（请重新检测并核算）' : '保存成功')
      } catch (error) {
        toast(error instanceof Error ? error.message : '保存失败', 'error')
      } finally {
        setSaving(false)
      }
    }

    const handleSubmit = async () => {
      if (!editable || saving) return

      const meaningful = items.filter(
        (item) => item.name.trim() !== '' && stages.some((s) => s.id === item.stageId),
      )
      const missingQty = meaningful.filter((item) => item.quantity.trim() === '')
      if (missingQty.length > 0) {
        toast(`还有 ${missingQty.length} 条数据项未填写数量`, 'error')
        return
      }

      // 数据未变更：无需重复保存，直接推进（「下一步」由工作台跳转）
      const current = JSON.stringify({ items, nodes })
      if (baselineRef.current && current === baselineRef.current) {
        onNext?.()
        return
      }

      // 已完成（或历史已核算）项目修改数据：先提示「数据变更，请重新核算」，确认后再落库
      if (project.status === 'done' || project.status === 'calculated') {
        setRecalcConfirm(true)
        return
      }

      await performSave()
    }

    useImperativeHandle(ref, () => ({
      submit: () => {
        void handleSubmit()
      },
    }))

    /** 工序选择弹窗：可选工序列表（按名称 / 编码搜索） */
    const filteredOperations = useMemo(() => {
      const kw = opKeyword.trim().toLowerCase()
      if (!kw) return operations
      return operations.filter(
        (item) => item.name.toLowerCase().includes(kw) || item.code.toLowerCase().includes(kw),
      )
    }, [operations, opKeyword])

    /** 已选工序（多选） */
    const selectedOperations = useMemo(
      () => operations.filter((item) => selectedOpIds.includes(item.id)),
      [operations, selectedOpIds],
    )

    /** 切换工序选中态（支持多选） */
    const toggleOperation = (id: string) => {
      setSelectedOpIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
    }

    /** 已选工序的投入产出流（合并投入 / 产出，用于预览与回填），统一类型 → 核算数据项类型 */
    const selectedOperationFlows = useMemo(
      () =>
        selectedOperations.flatMap((operation) => [
          ...operation.inputs.map((flow) => ({
            flowId: `${operation.id}-I-${flow.id}`,
            processName: operation.name,
            direction: '投入',
            flowType: flow.flowType,
            name: flow.refName,
            unit: flow.unit,
          })),
          ...operation.outputs.map((flow) => ({
            flowId: `${operation.id}-O-${flow.id}`,
            processName: operation.name,
            direction: '产出',
            flowType: flow.flowType,
            name: flow.refName,
            unit: flow.unit,
          })),
        ]),
      [selectedOperations],
    )

    const opColumns: Column<OperationItem>[] = [
      {
        key: 'code',
        title: '工序编码',
        width: 120,
        render: (row) => <span className="mono nowrap">{row.code}</span>,
      },
      { key: 'name', title: '工序名称', width: 180, render: (row) => <span className="cell-ellipsis" title={row.name}>{row.name}</span> },
      {
        key: 'type',
        title: '工序类型',
        width: 110,
        render: (row) =>
          <span className="nowrap">
            {row.type === 'main' ? '主工序' : row.type === 'disposal' ? '处置工序' : '辅助工序'}
          </span>,
      },
      {
        key: 'count',
        title: '投入/产出',
        width: 120,
        render: (row) => (
          <span className="nowrap">
            {row.inputs.length} 投 / {row.outputs.length} 产
          </span>
        ),
      },
    ]

    const opFlowColumns: Column<{
      flowId: string
      processName: string
      direction: string
      flowType: FlowItemType
      name: string
      unit: string
    }>[] = [
      {
        key: 'processName',
        title: '工序',
        width: 150,
        render: (row) => <span className="cell-ellipsis" title={row.processName}>{row.processName}</span>,
      },
      {
        key: 'direction',
        title: '方向',
        width: 80,
        render: (row) => (
          <span className={row.direction === '投入' ? 'pcf-dir-in' : 'pcf-dir-out'}>{row.direction}</span>
        ),
      },
      { key: 'flowType', title: '类型', width: 140, render: (row) => flowTypeText(row.flowType) },
      { key: 'name', title: '名称', width: 240, render: (row) => <span className="cell-ellipsis" title={row.name}>{row.name}</span> },
      { key: 'unit', title: '单位', width: 100, render: (row) => row.unit || '-' },
    ]

    /** 数据列表列：名称 / 数据项类型 / 数量 / 单位 / 所属工序 / 上游过程名称 / 操作 */
    const columns: Column<EditItem>[] = [
      {
        key: 'name',
        title: '名称',
        width: 170,
        render: (row) => (
          <Input
            value={row.name}
            placeholder="请输入"
            readOnly={!editable}
            onChange={(e) => updateItem(row.id, { name: e.target.value })}
          />
        ),
      },
      {
        key: 'itemType',
        title: '数据项类型',
        width: 270,
        render: (row) => (
          <div className="pcf-inline">
            <Select
              value={row.itemType}
              options={ALL_TYPE_OPTIONS}
              disabled={!editable}
              onChange={(e) =>
                updateItem(row.id, {
                  itemType: e.target.value as PcfDataItemType,
                  emissionType: e.target.value === 'emission' ? row.emissionType : null,
                })
              }
            />
          </div>
        ),
      },
      {
        key: 'quantity',
        title: '数量',
        width: 150,
        render: (row) => (
          <Input
            value={row.quantity}
            inputMode="decimal"
            placeholder="请输入"
            readOnly={!editable}
            onChange={(e) => updateItem(row.id, { quantity: e.target.value })}
          />
        ),
      },
      {
        key: 'unit',
        title: '单位',
        width: 110,
        render: (row) => (
          <CascaderSelect
            value={row.unit}
            placeholder="请选择"
            options={unitOptions}
            searchPlaceholder="搜索单位符号 / 名称"
            disabled={!editable}
            onChange={(value) => updateItem(row.id, { unit: value })}
          />
        ),
      },
      {
        key: 'processName',
        title: '所属工序',
        width: 150,
        render: (row) =>
          row.processName ? (
            <span className="pcf-process-tag" title={row.processName}>
              {row.processName}
            </span>
          ) : (
            <span className="pcf-op-flow">-</span>
          ),
      },
      {
        key: 'upstream',
        title: '上游过程名称',
        width: 240,
        render: (row) => {
          const node = nodes.find((n) => n.sourceItemId === row.id)
          if (node) {
            return (
              <button
                type="button"
                className="link"
                title="查看该上游过程节点数据"
                onClick={() => setActiveNodeId(node.id)}
              >
                {node.name} ↗
              </button>
            )
          }
          const display = factorDisplayOf(row)
          if (!editable) {
            return display ? (
              <span className="pcf-factor-cell">
                <span className="pcf-factor-name">{factorEchoOf(display.name, display.value, display.unit)}</span>
              </span>
            ) : (
              <span className="pcf-op-flow">-</span>
            )
          }
          return (
            <span className="pcf-inline">
              {display ? (
                /* 已引用因子：不再支持继续追溯，仅可更换因子或撤回 */
                <>
                  <button
                    type="button"
                    className="link"
                    title={`已引用因子：${factorEchoOf(display.name, display.value, display.unit)}，点击更换`}
                    onClick={() => void openFactorPicker(row)}
                  >
                    {factorEchoOf(display.name, display.value, display.unit)}
                  </button>
                  <button
                    type="button"
                    className="pcf-icon-btn"
                    title="撤回因子选择（撤回后可重新选择因子或继续追溯）"
                    aria-label="撤回因子选择"
                    onClick={() => handleCancelFactor(row.id)}
                  >
                    <Icon name="close" size={13} />
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="link" data-ann-target="pcf.step2.factor" onClick={() => void openFactorPicker(row)}>
                    引用因子
                  </button>
                  <button type="button" className="link" data-ann-target="pcf.step2.trace" onClick={() => handleTrace(row)}>
                    继续追溯
                  </button>
                </>
              )}
            </span>
          )
        },
      },
      {
        key: 'actions',
        title: '操作',
        width: 160,
        render: (row) => (
          <span className="pcf-inline">
            <button type="button" className="link" data-ann-target="pcf.step2.voucher" onClick={() => setVoucherRowId(row.id)}>
              数据凭证{row.vouchers.length > 0 ? `（${row.vouchers.length}）` : ''}
            </button>
            {editable && (
              <button type="button" className="link link-danger" onClick={() => handleDelete(row.id)}>
                删除
              </button>
            )}
          </span>
        ),
      },
    ]

    /** 导入校验结果列 */
    const importErrorColumns: Column<ImportErrorRow>[] = [
      { key: 'row', title: '行号', width: 80, render: (row) => `第 ${row.row} 行` },
      { key: 'name', title: '名称', width: 160 },
      { key: 'reason', title: '失败原因' },
    ]

    const importValidColumns: Column<ImportValidRow>[] = [
      { key: 'name', title: '名称', width: 160 },
      { key: 'itemType', title: '数据项类型', width: 150, render: (row) => PCF_ITEM_TYPE_TEXT[row.itemType] },
      { key: 'quantity', title: '数量', width: 120 },
      { key: 'unit', title: '单位', width: 90 },
      {
        key: 'emissionType',
        title: '排放物类型',
        width: 100,
        render: (row) => (row.emissionType ? PCF_EMISSION_TYPE_TEXT[row.emissionType] : '-'),
      },
    ]

    /**
     * 左树：**以「数据项」为层级**递归渲染「继续追溯」链路。
     * 生命周期阶段（末级，可点）下展示**已追溯的数据项**，追溯生成的上游过程挂在**该数据项下**（可继续递归），
     * 不再把追溯子节点直接挂在生命周期阶段下；未追溯的数据项不进入左树（右侧数据列表已展示，保持树简洁）。
     */
    const renderStageTrace = (stageId: string, parentNodeId: string | null, depth: number): ReactNode => {
      const traced = items
        .filter(
          (item) =>
            item.stageId === stageId && (item.nodeId ?? '') === (parentNodeId ?? '') && item.name.trim() !== '',
        )
        .map((item) => ({ item, node: nodes.find((n) => n.sourceItemId === item.id) }))
        .filter((entry): entry is { item: EditItem; node: PcfProcessNode } => !!entry.node)
      if (traced.length === 0) return null
      return traced.map(({ item, node }) => (
        <div key={node.id}>
          <div
            className={[
              'pcf-tree-node',
              depth <= 1 ? 'pcf-tree-level2' : 'pcf-tree-level3',
              'is-clickable',
              node.id === activeNodeId ? 'is-active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => setActiveNodeId(node.id)}
          >
            <span className="pcf-inline">
              <span className="nowrap">◈ {item.name}</span>
              <span className="pcf-tree-tag">已追溯</span>
            </span>
            {editable && (
              <button
                type="button"
                className="pcf-tree-remove"
                title="取消追溯（同时移除该数据项上游过程内已录入的数据）"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteNode(node.id)
                }}
              >
                取消追溯
              </button>
            )}
          </div>
          {renderStageTrace(stageId, node.id, depth + 1)}
        </div>
      ))
    }

    if (loading) {
      return <div className="pcf-placeholder">加载中…</div>
    }

    const scopeTitle = activeStage
      ? activeNode
        ? `${activeStage.name} / ${activeNode.name}`
        : `${activeStage.name} · 全部`
      : '请选择生命周期阶段'

    return (
      <div className="pcf-step-form" data-ann-target="pcf.step2.page.global">
        <div className="pcf-fill-layout">
            <aside className="pcf-fill-tree" data-ann-target="pcf.step2.tree">
            <div className="pcf-fill-tree-head">
              生命周期阶段 / 追溯链路
              <span className="pcf-panel-tip">共 {stages.length} 个阶段</span>
            </div>
            {stages.length === 0 && (
              <div className="pcf-tree-empty">步骤①未勾选生命周期阶段，请先在「目标与范围」配置后再返回建模</div>
            )}
            {stages.map((stage) => {
              const isLeaf = leafStageIds.has(stage.id)
              const count = items.filter((item) => item.stageId === stage.id && item.name.trim() !== '').length
              const isActiveStage = stage.id === activeStageId
              return (
                <div key={stage.id}>
                  <div
                    className={[
                      'pcf-tree-node',
                      stage.level === 2 ? 'pcf-tree-level2' : 'pcf-tree-level1',
                      isLeaf ? 'is-clickable' : 'is-group',
                      isActiveStage && !activeNodeId ? 'is-active' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => {
                      if (!isLeaf) return
                      setActiveStageId(stage.id)
                      setActiveNodeId('')
                    }}
                  >
                    <span className="nowrap">{stage.name}</span>
                    {isLeaf && <span className="pcf-tree-tag">{count} 项</span>}
                  </div>
                  {isLeaf && isActiveStage && renderStageTrace(stage.id, null, 1)}
                </div>
              )
            })}
          </aside>

          <section className="pcf-fill-main">
            <div className="pcf-fill-head">
              <div className="pcf-content-title">
                数据列表
                <span className="pcf-panel-tip" style={{ marginLeft: 8 }}>
                  {scopeTitle}
                </span>
              </div>
              {editable && (
                <span className="pcf-inline">
                  <Button
                    data-ann-target="pcf.step2.stageParam.open"
                    onClick={() => setParamModalOpen(true)}
                    title="按生命周期阶段维度维护阶段基础参数（不直接参与活动数据计算）"
                  >
                    过程参数维护
                  </Button>
                  <Button disabled={!activeStage} data-ann-target="pcf.step2.import" onClick={openImport}>
                    导入
                  </Button>
                  <Button variant="primary" disabled={!activeStage} onClick={handleAdd}>
                    添加数据
                  </Button>
                  {allowAllocation && (
                    <Button
                      disabled={!activeStage}
                      data-ann-target="pcf.step2.alloc"
                      onClick={() => setAllocOpen(true)}
                      title="按当前产品占比，把总活动数据折算为实际填报数量"
                    >
                      分配计算
                    </Button>
                  )}
                  <Button disabled={!project.id} data-ann-target="pcf.step2.canvas" onClick={() => setCanvasOpen(true)} title="以流程画布形式预览已保存的建模数据">
                    预览模型
                  </Button>
                </span>
              )}
            </div>

            {activeStage ? (
              <>
                <div className="pcf-table-wrap" data-ann-target="pcf.step2.table">
                  <Table
                    columns={columns}
                    data={scopeItems}
                    rowKey={(row) => row.id}
                    emptyText="暂无数据项，点击右上角「添加数据」录入或「导入」批量导入"
                  />
                </div>
              </>
            ) : (
              <div className="pcf-placeholder">请先在左侧选择一个生命周期阶段</div>
            )}
          </section>
        </div>

        {/* 导入：下载模板 → 上传 CSV → 校验 → 导入 */}
        <Modal
          open={importOpen}
          title="导入数据"
          size="lg"
          onClose={() => setImportOpen(false)}
          footer={
            <>
              <Button onClick={() => setImportOpen(false)}>取消</Button>
              <Button
                variant="primary"
                disabled={!importParsed || importValid.length === 0}
                onClick={handleImportConfirm}
              >
                {`确认导入（${importValid.length}）`}
              </Button>
            </>
          }
        >
          <div className="view-block">
            <div className="view-block-title flex-between">
              <span>第 1 步：下载模板并填写</span>
              <Button size="small" onClick={downloadTemplate}>
                下载 CSV 模板
              </Button>
            </div>
            <ol className="pcf-import-steps">
              <li>模板列：名称、数据项类型、数量、单位、排放物类型；</li>
              <li>数据项类型填「原辅料、能源、自然资源、中间产品、产品、副产品、废弃物/排放物」（取自「核算数据类型」字典）；</li>
              <li>类型为「废弃物/排放物」时须填排放物类型「废水 / 废渣 / 废气」；</li>
              <li>保存为 CSV 后在下方上传，校验通过即导入当前作用域「{scopeTitle}」。</li>
            </ol>
          </div>

          <div className="view-block">
            <div className="view-block-title">第 2 步：上传文件</div>
            <input
              ref={importFileRef}
              type="file"
              accept=".csv,text/csv"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleImportFile(file)
                e.target.value = ''
              }}
            />
            <Button onClick={() => importFileRef.current?.click()}>选择文件</Button>
            {importFileName && (
              <span className="toolbar-tip" style={{ marginLeft: 8 }}>
                {importFileName}
              </span>
            )}
          </div>

          {importParsed && (
            <div className="view-block">
              <div className="view-block-title flex-between">
                <span>第 3 步：校验结果</span>
                <span className="toolbar-tip">
                  可导入 {importValid.length} 条 · 失败 {importErrors.length} 条
                </span>
              </div>
              {importErrors.length > 0 && (
                <div className="pcf-table-wrap" style={{ marginBottom: 'var(--space-sm)' }}>
                  <Table
                    columns={importErrorColumns}
                    data={importErrors}
                    rowKey={(row) => String(row.row)}
                    emptyText="无"
                  />
                </div>
              )}
              {importValid.length > 0 ? (
                <div className="pcf-table-wrap">
                  <Table columns={importValidColumns} data={importValid} rowKey={(row) => row.key} />
                </div>
              ) : (
                <div className="empty">没有可导入的数据行</div>
              )}
            </div>
          )}
        </Modal>

        {/* 添加数据：自定义数据 / 从工序添加（二选一） */}
        <Modal
          open={addOpen}
          title="添加数据"
          size="lg"
          onClose={() => setAddOpen(false)}
          footer={
            <>
              <Button onClick={() => setAddOpen(false)}>取消</Button>
              <Button
                variant="primary"
                disabled={addMode === 'process' && selectedOpIds.length === 0}
                onClick={() => (addMode === 'custom' ? handleAddCustomConfirm() : handleAddProcessConfirm())}
              >
                {addMode === 'process' && selectedOpIds.length > 0
                  ? `确认添加（${selectedOpIds.length} 道工序）`
                  : '确认添加'}
              </Button>
            </>
          }
        >
          <div className="pcf-add-tabs">
            <button
              type="button"
              className={['pcf-add-tab', addMode === 'custom' ? 'is-active' : ''].filter(Boolean).join(' ')}
              onClick={() => setAddMode('custom')}
            >
              自定义数据
            </button>
            <button
              type="button"
              className={['pcf-add-tab', addMode === 'process' ? 'is-active' : ''].filter(Boolean).join(' ')}
              onClick={() => setAddMode('process')}
            >
              从工序添加
            </button>
          </div>

          {addMode === 'custom' ? (
            <div className="view-block">
              <div className="query-bar">
                <div className="query-item">
                  <span className="query-label">活动数据名称</span>
                  <Input
                    value={customName}
                    placeholder="如：毛竹原竹"
                    onChange={(e) => setCustomName(e.target.value)}
                  />
                </div>
                <div className="query-item">
                  <span className="query-label">类型</span>
                  <Select
                    value={customType}
                    options={ALL_TYPE_OPTIONS}
                    onChange={(e) => setCustomType(e.target.value as PcfDataItemType)}
                  />
                </div>
                <div className="query-item">
                  <span className="query-label">单位</span>
                  <CascaderSelect
                    value={customUnit}
                    placeholder="请选择"
                    options={unitOptions}
                    searchPlaceholder="搜索单位符号 / 名称"
                    onChange={(value) => setCustomUnit(value)}
                  />
                </div>
              </div>
              <div className="pcf-add-tip">
                确定后将新增一行，名称、类型、单位已回填，请补充数量并引用排放因子（所属工序留空）。
              </div>
            </div>
          ) : (
            <div className="view-block">
              <div className="pcf-picker-query">
                <Input
                  value={opKeyword}
                  placeholder="输入工序名称 / 编码搜索（支持多选）"
                  onChange={(e) => setOpKeyword(e.target.value)}
                />
              </div>
              <div className="pcf-table-wrap" style={{ maxHeight: 260, overflow: 'auto' }}>
                <Table
                  columns={opColumns}
                  data={filteredOperations}
                  rowKey={(row) => row.id}
                  loading={opLoading}
                  emptyText="暂无可用工序"
                  onRowClick={(row) => toggleOperation(row.id)}
                  rowClassName={(row) => (selectedOpIds.includes(row.id) ? 'is-picked' : '')}
                  rowSelection={{ selectedKeys: selectedOpIds, onChange: setSelectedOpIds }}
                />
              </div>
              {selectedOperations.length > 0 && (
                <div className="pcf-op-preview">
                  <div className="view-block-title">
                    已选 {selectedOperations.length} 道工序，投入产出流预览（共 {selectedOperationFlows.length} 条）
                  </div>
                  <div className="pcf-table-wrap">
                    <Table
                      columns={opFlowColumns}
                      data={selectedOperationFlows}
                      rowKey={(row) => row.flowId}
                      emptyText="所选工序暂无投入产出流"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* 排放因子选择（引用因子） */}
        <Modal
          open={!!factorPickerRowId}
          title={<span data-ann-target="pcf.step2.factor.modal">选择排放因子</span>}
          size="xl"
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
          <div className="pcf-factor-picker-layout">
            <div className="pcf-lib-list">
              {pickerLibraries.length === 0 && <div className="pcf-lib-group">暂无因子库</div>}
              {['背景数据库', '我的因子库'].map((group) => {
                const groupItems = pickerLibraries.filter((item) => item.group === group)
                if (groupItems.length === 0) return null
                return (
                  <div key={group}>
                    <div className="pcf-lib-group">{group}</div>
                    {groupItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={['pcf-lib-item', pickerLibId === item.id ? 'is-active' : '']
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => void selectPickerLib(item.id)}
                      >
                        <span className="cell-ellipsis">{item.name}</span>
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>

            <div>
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
                  loading={pickerLoading}
                  emptyText="该库暂无因子"
                  onRowClick={(row) => setFactorPickedId(row.id)}
                  rowClassName={(row) => (factorPickedId === row.id ? 'is-picked' : '')}
                />
              </div>
            </div>
          </div>
          <div className="pcf-factor-tip">
            左侧选择「背景数据库」或「我的因子库」，右侧单选因子；点击「查看」可查看因子详情。确认后因子将回显到「上游过程名称」列。
          </div>
        </Modal>

        <Modal
          open={!!pickerViewFactor}
          title="因子详情"
          size="lg"
          onClose={() => setPickerViewFactorId('')}
          footer={<Button onClick={() => setPickerViewFactorId('')}>关闭</Button>}
        >
          {pickerViewFactor && <FactorInfoPanel factor={pickerViewFactor} />}
        </Modal>

        {/* 数据凭证（操作列入口）：上传 / 查看凭证附件，非必填 */}
        <VoucherModal
          open={!!voucherRowId}
          subject={items.find((item) => item.id === voucherRowId)?.name ?? ''}
          value={items.find((item) => item.id === voucherRowId)?.vouchers ?? []}
          readOnly={!editable}
          onClose={() => setVoucherRowId('')}
          onConfirm={(vouchers) => updateItem(voucherRowId, { vouchers })}
        />

        {/* 数据变更提示：已完成项目修改数据后需重新检测 → 核算 */}
        <Modal
          open={recalcConfirm}
          title="数据变更提示"
          size="sm"
          onClose={() => {
            setRecalcConfirm(false)
            revertToBaseline()
          }}
          footer={
            <>
              <Button
                onClick={() => {
                  setRecalcConfirm(false)
                  revertToBaseline()
                }}
              >
                取消
              </Button>
              <Button
                variant="primary"
                disabled={saving}
                onClick={() => {
                  setRecalcConfirm(false)
                  void performSave(true)
                }}
              >
                确认
              </Button>
            </>
          }
        >
          数据发生变更，请重新进行核算。
        </Modal>

        {/* 分配计算：应用后回填当前产品一行 */}
        <AllocationCalcModal
          open={allocOpen}
          onClose={() => setAllocOpen(false)}
          onApply={handleAllocationApply}
          defaultMethod={calcRule ? allocDefaultToMethod(calcRule.allocDefault) : undefined}
        />

        {/* 过程参数维护：多选生命周期阶段，按阶段维度维护基础参数 + 一键折算 */}
        <StageParamModal
          open={paramModalOpen}
          stages={paramStages}
          stageMetaMap={stageMetaMap}
          defaultStageId={defaultParamStageId}
          editable={editable}
          onClose={() => setParamModalOpen(false)}
          onSaveParam={handleSaveStageParams}
        />

        {/* 模型预览 · 流程画布（输入 / 输出 + 追溯链路） */}
        <PcfFlowCanvas open={canvasOpen} project={project} onClose={() => setCanvasOpen(false)} />
      </div>
    )
  },
)

export default ProjectStepTwo
