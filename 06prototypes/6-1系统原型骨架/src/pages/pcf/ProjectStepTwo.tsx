import type { ReactNode } from 'react'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Button, CascaderSelect, Icon, Input, Modal, Select, Table, useToast, VoucherModal } from '@/shared/components'
import type { Column, SelectOption } from '@/shared/components'
import {
  fetchLifecycleStages,
  fetchMyFactorLibraries,
  fetchMyFactors,
  fetchPcfFactorOptions,
  fetchPcfProcessNodes,
  fetchPcfProject,
  fetchPcfStageData,
  fetchPublishedLibraries,
  fetchPublishedLibraryDetail,
  fetchUnitGroupOptions,
  savePcfProcessNodes,
  savePcfStageData,
} from '@/mock'
import type {
  FactorCalibers,
  FactorItem,
  LifecycleStageItem,
  PcfDataItemDirection,
  PcfDataItemType,
  PcfEmissionType,
  PcfFactorOption,
  PcfProcessNode,
  PcfProject,
  PcfVoucher,
  TreeOption,
} from '@/types'
import { downloadCsv, parseCsvText, toCsv } from '@/shared/utils/csv'
import FactorInfoPanel from '../factor/FactorInfoPanel'
import PcfFlowCanvas from './PcfFlowCanvas'
import {
  ALL_TYPE_OPTIONS,
  EMISSION_TYPE_OPTIONS,
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
  name: string
  itemType: PcfDataItemType
  emissionType: PcfEmissionType | null
  quantity: string
  unit: string
  factorId: string
  factorName: string
  factorValue: number | null
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
  name: '',
  itemType: 'material',
  emissionType: null,
  quantity: '',
  unit: '',
  factorId: '',
  factorName: '',
  factorValue: null,
  factorCalibers: null,
  vouchers: [],
})

/**
 * 工作台步骤②「产品建模」内容区。
 *
 * - 左侧：步骤①勾选的生命周期阶段 + 各阶段下的**过程节点**（「继续追溯」生成）；
 * - 选中阶段 / 节点后，右侧为**统一的数据列表**（输入 / 输出合并在同一张表），默认保留一行空白行，支持新增 / 删除；
 * - 列：名称、数据项类型（原辅料 / 自然资源 / 能源及能源介质 / 产品 / 中间产品 / 副产品 / 排放物）、数量、单位、上游过程名称、操作；
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

    /* 模型预览 · 流程画布 */
    const [canvasOpen, setCanvasOpen] = useState(false)
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
        const mapped = data.map((item) => ({
          id: item.id,
          stageId: item.stageId,
          stageName: item.stageName,
          nodeId: item.nodeId ?? null,
          name: item.name,
          itemType: item.itemType,
          emissionType: item.emissionType ?? null,
          quantity: item.quantity == null ? '' : String(item.quantity),
          unit: item.unit,
          factorId: item.factorId ?? '',
          factorName: item.factorName,
          factorValue: item.factorValue,
          factorCalibers: item.factorCalibers ?? null,
          vouchers: item.vouchers ?? [],
        }))
        setItems(mapped)
        baselineRef.current = JSON.stringify({ items: mapped, nodes: nodeList })
        setFactorDraft({})
      } catch (error) {
        toast(error instanceof Error ? error.message : '加载失败', 'error')
      } finally {
        setLoading(false)
      }
    }, [project.id, toast])

    useEffect(() => {
      void load()
    }, [load])

    /** 左侧阶段：默认取步骤①勾选纳入的生命周期阶段；未配置时按边界带出 */
    const stages = useMemo(() => {
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
    }, [project.lifecycleStages, project.boundary, allStages])

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
      setItems((prev) => [...prev, blankItem(activeStage.id, activeStage.name, activeNodeId || null)])
      promptIfCompletedChanged()
    }

    const handleDelete = (id: string) => {
      setItems((prev) => prev.filter((item) => item.id !== id))
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
          ['电力', '能源及能源介质', '1.5', 'kWh', ''],
          ['废水', '排放物', '0.03', 'm³', '废水'],
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
      return { name: item.factorName || id, value: item.factorValue, unit: '' }
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
      updateItem(itemId, { factorId: '', factorName: '', factorValue: null })
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
              direction: pcfDirectionOf(item.itemType),
              name: item.name.trim(),
              itemType: item.itemType,
              emissionType: item.itemType === 'emission' ? item.emissionType : null,
              quantity: Number(item.quantity),
              unit: item.unit,
              factorId: fid ? fid : null,
              factorName: picked ? picked.name : fid ? item.factorName : '',
              factorValue: picked ? picked.value : fid ? item.factorValue : null,
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

    /** 数据列表列：名称 / 数据项类型 / 数量 / 单位 / 上游过程名称 / 操作 */
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
            {row.itemType === 'emission' && (
              <Select
                className="pcf-unit-select"
                value={row.emissionType ?? ''}
                placeholder="废水/废渣/废气"
                options={EMISSION_TYPE_OPTIONS}
                disabled={!editable}
                onChange={(e) =>
                  updateItem(row.id, { emissionType: (e.target.value || null) as PcfEmissionType | null })
                }
              />
            )}
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
                <span className="pcf-factor-name">{display.name}</span>
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
                    title={`已引用因子：${display.name}，点击更换`}
                    onClick={() => void openFactorPicker(row)}
                  >
                    {display.name}
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
                  <Button disabled={!activeStage} data-ann-target="pcf.step2.import" onClick={openImport}>
                    导入
                  </Button>
                  <Button variant="primary" disabled={!activeStage} onClick={handleAdd}>
                    添加数据
                  </Button>
                  <Button disabled={!project.id} data-ann-target="pcf.step2.canvas" onClick={() => setCanvasOpen(true)} title="以流程画布形式预览已保存的建模数据">
                    预览模型
                  </Button>
                </span>
              )}
            </div>

            {activeStage ? (
              <div className="pcf-table-wrap" data-ann-target="pcf.step2.table">
                <Table
                  columns={columns}
                  data={scopeItems}
                  rowKey={(row) => row.id}
                  emptyText="暂无数据项，点击右上角「添加数据」录入或「导入」批量导入"
                />
              </div>
            ) : (
              <div className="pcf-placeholder">请先在左侧选择一个生命周期阶段</div>
            )}
          </section>
        </div>

        <div className="pcf-form-tip">
          左侧为步骤①勾选的生命周期阶段（<b>仅末级阶段可点击</b>）及其<b>继续追溯链路</b>；选中阶段 / 数据项后，右侧为统一数据列表（输入、输出合并在同一张表），
          默认保留一行空白行，支持添删。「上游过程名称」列<b>引用因子与继续追溯二选一</b>：点击继续追溯会按数据项名称生成一个上游过程，并挂在<b>该数据项下</b>（出现在左侧树，可继续递归），
          可在其中录入其数据；已引用因子时点击<b>撤回</b>图标可清除因子，恢复为可重新选择因子或继续追溯。名称与<b>数量</b>为必填，
          数量按<b>每 1 个声明单位</b>的消耗 / 产出计（如「0.062 kg / 双」，声明单位即步骤①选的单位）。「操作」列可上传<b>数据凭证</b>附件（非必填）；空白行不落库。
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
              <li>数据项类型填「原辅料 / 自然资源 / 能源及能源介质 / 产品 / 中间产品 / 副产品 / 排放物」；</li>
              <li>类型为「排放物」时须填排放物类型「废水 / 废渣 / 废气」；</li>
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

        {/* 模型预览 · 流程画布（输入 / 输出 + 追溯链路） */}
        <PcfFlowCanvas open={canvasOpen} project={project} onClose={() => setCanvasOpen(false)} />
      </div>
    )
  },
)

export default ProjectStepTwo
