import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, CascaderSelect, Icon, Input, Modal, Select, Table, useToast, VoucherModal } from '@/shared/components'
import type { Column } from '@/shared/components'
import { fetchUnitGroupOptions } from '@/mock'
import type {
  FactorCalibers,
  ModelDataItem,
  ModelProcessNode,
  PcfDataItemType,
  PcfEmissionType,
  PcfVoucher,
  TreeOption,
} from '@/types'
import { downloadCsv, parseCsvText, toCsv } from '@/shared/utils/csv'
import {
  ALL_TYPE_OPTIONS,
  EMISSION_TYPE_OPTIONS,
  PCF_EMISSION_BY_TEXT,
  PCF_EMISSION_TYPE_TEXT,
  PCF_ITEM_TYPE_TEXT,
  PCF_TYPE_BY_TEXT,
  pcfDirectionOf,
} from '@/pages/pcf/pcfItemMeta'
import FactorPickerModal from './FactorPickerModal'
import type { PickedFactor } from './FactorPickerModal'
import type { ModelDraft } from './modelDraft'
import '@/pages/pcf/PcfPage.css'

interface ModelStepTwoProps {
  draft: ModelDraft
  onChange: (patch: Partial<ModelDraft>) => void
  /** 只读态（查看页）：左树右表同版式，表格转为纯文本 */
  readOnly?: boolean
}

/** 本地编辑态（数量用字符串便于输入，回写草稿时转数值） */
interface EditItem {
  id: string
  stageId: string
  stageName: string
  nodeId: string | null
  name: string
  itemType: PcfDataItemType
  emissionType: PcfEmissionType | null
  quantity: string
  unit: string
  factorId: string
  factorName: string
  factorValue: number | null
  factorCalibers: FactorCalibers | null
  /** 数据凭证附件（**选填、可多个**） */
  vouchers: PcfVoucher[]
}

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
const nextItemId = () => `MI-${Date.now().toString().slice(-6)}-${itemSeed++}`
const nextNodeId = () => `MN-${Date.now().toString().slice(-6)}-${nodeSeed++}`

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

const toEdit = (items: ModelDataItem[]): EditItem[] =>
  items.map((item) => ({
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

/**
 * 模型向导步骤②「产品建模」（与 PCF 步骤② 同款：左树右表）：
 * 左侧为「生命周期阶段 / 追溯链路」，右侧为统一数据项表（名称 / 类型 / 数量 / 单位 / 上游过程名称）；
 * 支持「导入」「添加数据」与「引用因子 / 继续追溯」。
 */
export default function ModelStepTwo({ draft, onChange, readOnly = false }: ModelStepTwoProps) {
  const toast = useToast()
  const importFileRef = useRef<HTMLInputElement>(null)

  const [items, setItems] = useState<EditItem[]>(() => toEdit(draft.items))
  const [unitTree, setUnitTree] = useState<TreeOption[]>([])
  const [activeStageId, setActiveStageId] = useState('')
  const [activeNodeId, setActiveNodeId] = useState('')
  const [factorPickerRowId, setFactorPickerRowId] = useState('')
  /** 数据凭证附件（操作列入口：上传 / 查看凭证，非必填） */
  const [voucherRowId, setVoucherRowId] = useState('')

  const [importOpen, setImportOpen] = useState(false)
  const [importFileName, setImportFileName] = useState('')
  const [importValid, setImportValid] = useState<ImportValidRow[]>([])
  const [importErrors, setImportErrors] = useState<ImportErrorRow[]>([])
  const [importParsed, setImportParsed] = useState(false)

  useEffect(() => {
    void (async () => setUnitTree(await fetchUnitGroupOptions()))()
  }, [])

  const stages = useMemo(() => {
    const included = draft.lifecycleStages.filter((stage) => stage.included)
    return included.map((stage) => ({
      id: stage.id,
      name: stage.name,
      level: stage.level,
      parentId: stage.parentName ? included.find((p) => p.name === stage.parentName)?.id ?? null : null,
    }))
  }, [draft.lifecycleStages])
  const nodes = draft.nodes

  /** 末级生命周期阶段：二级阶段恒为末级；一级阶段无下级阶段时才是末级（**仅末级可点击录入**） */
  const leafStageIds = useMemo(() => {
    const parents = new Set(stages.map((stage) => stage.parentId).filter(Boolean) as string[])
    return new Set(stages.filter((stage) => stage.level === 2 || !parents.has(stage.id)).map((stage) => stage.id))
  }, [stages])

  useEffect(() => {
    const firstLeaf = stages.find((stage) => leafStageIds.has(stage.id))
    if (!firstLeaf) {
      setActiveStageId('')
      return
    }
    setActiveStageId((prev) => (leafStageIds.has(prev) ? prev : firstLeaf.id))
  }, [stages, leafStageIds])

  const activeStage = stages.find((stage) => stage.id === activeStageId) ?? null
  const activeNode = nodes.find((node) => node.id === activeNodeId) ?? null

  /** 默认保留一行空白行（当前作用域）；只读态不补空行 */
  useEffect(() => {
    if (readOnly) return
    if (!activeStage) return
    setItems((prev) =>
      prev.some((item) => item.stageId === activeStage.id && (item.nodeId ?? '') === activeNodeId)
        ? prev
        : [...prev, blankItem(activeStage.id, activeStage.name, activeNodeId || null)],
    )
  }, [activeStage, activeNodeId, readOnly])

  /** 回写草稿：空白行不落库（仅本地保留，切回步骤②时自动补一行） */
  const commit = (next: EditItem[]) => {
    setItems(next)
    onChange({
      items: next
        .filter((item) => item.name.trim() !== '')
        .map((item) => ({
          id: item.id,
          stageId: item.stageId,
          stageName: stages.find((stage) => stage.id === item.stageId)?.name ?? item.stageName,
          nodeId: item.nodeId,
          direction: pcfDirectionOf(item.itemType),
          name: item.name.trim(),
          itemType: item.itemType,
          emissionType: item.itemType === 'emission' ? item.emissionType : null,
          quantity: item.quantity.trim() === '' ? null : Number(item.quantity),
          unit: item.unit,
          factorId: item.factorId || null,
          factorName: item.factorId ? item.factorName : '',
          factorValue: item.factorId ? item.factorValue : null,
          factorCalibers: item.factorId ? item.factorCalibers : null,
          vouchers: item.vouchers,
        })),
    })
  }

  const updateItem = (id: string, patch: Partial<EditItem>) =>
    commit(items.map((item) => (item.id === id ? { ...item, ...patch } : item)))

  const scopeItems = items.filter((item) => item.stageId === activeStageId && (item.nodeId ?? '') === activeNodeId)

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
    const node: ModelProcessNode = {
      id: nextNodeId(),
      stageId: item.stageId,
      parentId: item.nodeId ?? null,
      name: item.name.trim(),
      sourceItemId: item.id,
    }
    onChange({ nodes: [...nodes, node] })
    setActiveNodeId(node.id)
    toast(`已生成子节点「${node.name}」，请录入其数据`)
  }

  const handleDeleteNode = (nodeId: string) => {
    const collect = (id: string): string[] => [id, ...nodes.filter((node) => node.parentId === id).flatMap((node) => collect(node.id))]
    const ids = collect(nodeId)
    onChange({ nodes: nodes.filter((node) => !ids.includes(node.id)) })
    commit(items.filter((item) => !ids.includes(item.nodeId ?? '')))
    setActiveNodeId((prev) => (ids.includes(prev) ? '' : prev))
    toast('节点已删除')
  }

  /* ---------- 导入：下载模板 → 上传 CSV → 校验 → 导入 ---------- */

  const downloadTemplate = () => {
    downloadCsv(
      '模型产品建模导入模板.csv',
      toCsv([
        ['名称', '数据项类型', '数量', '单位', '排放物类型'],
        ['毛竹原竹', '原辅料', '0.062', 'kg', ''],
        ['电力', '能源及能源介质', '0.042', 'kWh', ''],
        ['废水', '排放物', '0.03', 'm³', '废水'],
      ]),
    )
  }

  const handleImportFile = async (file: File) => {
    setImportFileName(file.name)
    setImportValid([])
    setImportErrors([])
    setImportParsed(false)
    try {
      const rows = parseCsvText(await file.text())
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
          errors.push({ row: lineNo, name, reason: '数量须为数值（可为负数）' })
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
    const additions: EditItem[] = importValid.map((row) => ({
      ...blankItem(activeStage.id, activeStage.name, activeNodeId || null),
      name: row.name,
      itemType: row.itemType,
      emissionType: row.emissionType,
      quantity: row.quantity,
      unit: row.unit,
    }))
    commit([
      ...items.filter(
        (item) =>
          !(item.stageId === activeStage.id && (item.nodeId ?? '') === activeNodeId && item.name.trim() === ''),
      ),
      ...additions,
    ])
    setImportOpen(false)
    toast(`已导入 ${additions.length} 条数据项`)
  }

  /* ---------- 数据表 ---------- */

  const factorPickerRow = items.find((item) => item.id === factorPickerRowId) ?? null

  const columns: Column<EditItem>[] = [
    {
      key: 'name',
      title: '名称',
      width: 170,
      render: (row) => (
        <Input value={row.name} placeholder="请输入" onChange={(e) => updateItem(row.id, { name: e.target.value })} />
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
              onChange={(e) => updateItem(row.id, { emissionType: (e.target.value || null) as PcfEmissionType | null })}
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
          options={unitTree}
          searchPlaceholder="搜索单位符号 / 名称"
          onChange={(value) => updateItem(row.id, { unit: value })}
        />
      ),
    },
    {
      key: 'upstream',
      title: '上游过程名称',
      width: 250,
      render: (row) => {
        const node = nodes.find((item) => item.sourceItemId === row.id)
        if (node) {
          return (
            <button type="button" className="link" title="查看该上游过程节点数据" onClick={() => setActiveNodeId(node.id)}>
              {node.name} ↗
            </button>
          )
        }
        if (row.factorId) {
          return (
            <span className="pcf-inline">
              <button
                type="button"
                className="link"
                title={`已引用因子：${row.factorName}，点击更换`}
                onClick={() => setFactorPickerRowId(row.id)}
              >
                {row.factorName || row.factorId}
              </button>
              <button
                type="button"
                className="pcf-icon-btn"
                title="撤回因子选择"
                aria-label="撤回因子选择"
                onClick={() => updateItem(row.id, { factorId: '', factorName: '', factorValue: null, factorCalibers: null })}
              >
                <Icon name="close" size={13} />
              </button>
            </span>
          )
        }
        return (
          <span className="pcf-inline">
            <button type="button" className="link" onClick={() => setFactorPickerRowId(row.id)}>
              引用因子
            </button>
            <button type="button" className="link" onClick={() => handleTrace(row)}>
              继续追溯
            </button>
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
          <button type="button" className="link" onClick={() => setVoucherRowId(row.id)}>
            数据凭证{row.vouchers.length > 0 ? `（${row.vouchers.length}）` : ''}
          </button>
          <button
            type="button"
            className="link link-danger"
            onClick={() => commit(items.filter((item) => item.id !== row.id))}
          >
            删除
          </button>
        </span>
      ),
    },
  ]

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
      .filter((entry): entry is { item: EditItem; node: ModelProcessNode } => !!entry.node)
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
        </div>
        {renderStageTrace(stageId, node.id, depth + 1)}
      </div>
    ))
  }

  const scopeTitle = activeStage
    ? activeNode
      ? `${activeStage.name} / ${activeNode.name}`
      : `${activeStage.name} · 全部`
    : '请选择生命周期阶段'

  /* ===================== 只读态（查看页：与新建 / 编辑同版式） ===================== */

  if (readOnly) {
    const readonlyScope = draft.items.filter(
      (item) => item.stageId === activeStageId && (item.nodeId ?? '') === activeNodeId,
    )

    const readonlyColumns: Column<ModelDataItem>[] = [
      { key: 'name', title: '名称', width: 190 },
      {
        key: 'itemType',
        title: '数据项类型',
        width: 170,
        render: (row) =>
          row.itemType === 'emission' && row.emissionType
            ? `${PCF_ITEM_TYPE_TEXT[row.itemType]}（${PCF_EMISSION_TYPE_TEXT[row.emissionType]}）`
            : PCF_ITEM_TYPE_TEXT[row.itemType],
      },
      {
        key: 'quantity',
        title: '数量',
        width: 130,
        render: (row) => (row.quantity == null ? '-' : String(row.quantity)),
      },
      { key: 'unit', title: '单位', width: 90 },
      {
        key: 'upstream',
        title: '上游过程 / 排放因子',
        render: (row) => {
          const node = nodes.find((item) => item.sourceItemId === row.id)
          if (node) return <span>{node.name}</span>
          return <span>{row.factorName || '-'}</span>
        },
      },
      {
        key: 'vouchers',
        title: '数据凭证',
        width: 160,
        render: (row) => {
          const list = row.vouchers ?? []
          if (list.length === 0) return <span>-</span>
          return (
            <span className="pcf-inline">
              {list.map((voucher) => (
                <a
                  key={voucher.id}
                  className="link"
                  href={voucher.url}
                  target="_blank"
                  rel="noreferrer"
                  download={voucher.name}
                >
                  {voucher.name}
                </a>
              ))}
            </span>
          )
        },
      },
    ]

    const renderReadonlyTrace = (stageId: string, parentNodeId: string | null, depth: number): ReactNode => {
      const traced = draft.items
        .filter(
          (item) =>
            item.stageId === stageId && (item.nodeId ?? '') === (parentNodeId ?? '') && item.name.trim() !== '',
        )
        .map((item) => ({ item, node: nodes.find((n) => n.sourceItemId === item.id) }))
        .filter((entry): entry is { item: ModelDataItem; node: ModelProcessNode } => !!entry.node)
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
          </div>
          {renderReadonlyTrace(stageId, node.id, depth + 1)}
        </div>
      ))
    }

    return (
      <div className="pcf-step-form">
        <div className="pcf-fill-layout">
          <aside className="pcf-fill-tree">
            <div className="pcf-fill-tree-head">
              生命周期阶段 / 追溯链路
              <span className="pcf-panel-tip">共 {stages.length} 个阶段</span>
            </div>
            {stages.length === 0 && <div className="pcf-tree-empty">该模型未纳入生命周期阶段</div>}
            {stages.map((stage) => {
              const isLeaf = leafStageIds.has(stage.id)
              const count = draft.items.filter((item) => item.stageId === stage.id).length
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
                  {isLeaf && isActiveStage && renderReadonlyTrace(stage.id, null, 1)}
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
            </div>
            {activeStage ? (
              <div className="pcf-table-wrap">
                <Table
                  columns={readonlyColumns}
                  data={readonlyScope}
                  rowKey={(row) => row.id}
                  emptyText="该作用域暂无数据项"
                />
              </div>
            ) : (
              <div className="pcf-placeholder">该模型暂无产品建模数据</div>
            )}
          </section>
        </div>

        <div className="pcf-form-tip">
          数据项按「每 1 个声明单位」的消耗 / 产出填报；「上游过程 / 排放因子」列展示已引用的因子或已追溯的子过程，「数据凭证」列可查看该数据项的凭证附件。
        </div>
      </div>
    )
  }

  return (
    <div className="pcf-step-form">
      <div className="pcf-fill-layout">
        <aside className="pcf-fill-tree">
          <div className="pcf-fill-tree-head">
            生命周期阶段 / 追溯链路
            <span className="pcf-panel-tip">共 {stages.length} 个阶段</span>
          </div>
          {stages.length === 0 && (
            <div className="pcf-tree-empty">步骤①未纳入生命周期阶段，请先在「目标与范围」配置后再返回建模</div>
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
            <span className="pcf-inline">
              <Button disabled={!activeStage} onClick={() => setImportOpen(true)}>
                导入
              </Button>
              <Button
                variant="primary"
                disabled={!activeStage}
                onClick={() =>
                  activeStage && commit([...items, blankItem(activeStage.id, activeStage.name, activeNodeId || null)])
                }
              >
                添加数据
              </Button>
            </span>
          </div>

          {activeStage ? (
            <div className="pcf-table-wrap">
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
        左侧生命周期阶段<b>仅末级可点击</b>；「继续追溯」按数据项生成的上游过程挂在<b>该数据项下</b>（可继续递归）。
        数据项按「每 1 个声明单位」的消耗 / 产出填报（如「0.062 kg / 双」）；「上游过程名称」列<b>引用因子与继续追溯二选一</b>，
        已引用因子时点击<b>撤回</b>图标可清除因子。名称与<b>数量</b>为必填；「操作」列可上传<b>数据凭证</b>附件（非必填），空白行不落库。
      </div>

      <Modal
        open={importOpen}
        title="导入数据"
        size="lg"
        onClose={() => setImportOpen(false)}
        footer={
          <>
            <Button onClick={() => setImportOpen(false)}>取消</Button>
            <Button variant="primary" disabled={!importParsed || importValid.length === 0} onClick={handleImportConfirm}>
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
                <Table columns={importErrorColumns} data={importErrors} rowKey={(row) => String(row.row)} emptyText="无" />
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

      <FactorPickerModal
        open={!!factorPickerRow}
        currentFactorId={factorPickerRow?.factorId ?? ''}
        onClose={() => setFactorPickerRowId('')}
        onConfirm={(factor: PickedFactor) => {
          updateItem(factorPickerRowId, {
            factorId: factor.id,
            factorName: factor.name,
            factorValue: factor.value,
            factorCalibers: factor.calibers,
          })
          setFactorPickerRowId('')
          toast('排放因子已匹配')
        }}
      />

      {/* 数据凭证（操作列入口）：上传 / 查看凭证附件，非必填 */}
      <VoucherModal
        open={!!voucherRowId}
        subject={items.find((item) => item.id === voucherRowId)?.name ?? ''}
        value={items.find((item) => item.id === voucherRowId)?.vouchers ?? []}
        onClose={() => setVoucherRowId('')}
        onConfirm={(vouchers) => updateItem(voucherRowId, { vouchers })}
      />
    </div>
  )
}
