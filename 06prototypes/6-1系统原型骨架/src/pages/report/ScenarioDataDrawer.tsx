import { useMemo, useState } from 'react'
import {
  Button,
  Drawer,
  Empty,
  Input,
  InputNumber,
  MessagePlugin,
  Radio,
  RadioGroup,
  Space,
  Table,
  Tabs,
  Tree,
} from 'tdesign-react'
import { calcScenario } from '@/mock/sensitivity'
import type { PcfCaliberKey } from '@/types'
import type { SensitivityAnalysis, SensitivityBaselineItem, SensitivityScenario } from '@/types/sensitivity'
import { SA_ITEM_TYPE_TEXT, formatEmission } from './sensitivityMeta'
import './SensitivityPage.css'

interface DrawerNode {
  label: string
  value: string
  children?: DrawerNode[]
}

interface Props {
  analysis: SensitivityAnalysis
  scenario: SensitivityScenario
  caliber: PcfCaliberKey
  onClose: () => void
  onCalculated: () => void | Promise<void>
}

const SCOPE_ALL = 'all'

/**
 * 填写情景数据抽屉（《敏感性分析_Demo》§五）。
 * 阶段一级用 Tabs、二级用 RadioGroup、数据项定位用 Tree、数量编辑用 InputNumber。
 */
export default function ScenarioDataDrawer({ analysis, scenario, caliber, onClose, onCalculated }: Props) {
  const [activeStage, setActiveStage] = useState('')
  const [activeSubStage, setActiveSubStage] = useState('')
  const [activeNode, setActiveNode] = useState(SCOPE_ALL)
  const [keyword, setKeyword] = useState('')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    scenario.items.forEach((item) => {
      if (item.scenarioQty !== null) init[item.dataItemId] = String(item.scenarioQty)
    })
    return init
  })
  const [calculating, setCalculating] = useState(false)

  /** 一级阶段（按基准清单出现顺序） */
  const stageNames = useMemo(() => {
    const names: string[] = []
    analysis.baselineItems.forEach((item) => {
      if (!names.includes(item.stageName)) names.push(item.stageName)
    })
    return names
  }, [analysis.baselineItems])

  const currentStage = activeStage || stageNames[0] || ''

  /** 当前一级阶段下的二级阶段路径（按出现顺序） */
  const subStages = useMemo(() => {
    const paths: string[] = []
    analysis.baselineItems
      .filter((item) => item.stageName === currentStage)
      .forEach((item) => {
        if (!paths.includes(item.stagePath)) paths.push(item.stagePath)
      })
    return paths
  }, [analysis.baselineItems, currentStage])

  /** 搜索过滤后的数据项（树与表格同源） */
  const filteredItems = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    if (!kw) return analysis.baselineItems
    return analysis.baselineItems.filter(
      (item) => item.name.toLowerCase().includes(kw) || (item.nodeName ?? '').toLowerCase().includes(kw),
    )
  }, [analysis.baselineItems, keyword])

  /** 左树：全部 → 一级阶段 → 二级阶段 → 过程节点 → 数据项 */
  const treeData = useMemo<DrawerNode[]>(() => {
    const stageNodes = new Map<string, DrawerNode>()
    const subNodes = new Map<string, DrawerNode>()
    const nodeNodes = new Map<string, DrawerNode>()

    filteredItems.forEach((item) => {
      let stageNode = stageNodes.get(item.stageName)
      if (!stageNode) {
        stageNode = { label: item.stageName, value: `stage:${item.stageName}`, children: [] }
        stageNodes.set(item.stageName, stageNode)
      }
      const subKey = `sub:${item.stagePath}`
      let subNode = subNodes.get(subKey)
      if (!subNode) {
        subNode = { label: item.stagePath, value: subKey, children: [] }
        subNodes.set(subKey, subNode)
        stageNode.children!.push(subNode)
      }
      if (item.nodeId) {
        const nodeKey = `node:${item.nodeId}`
        let nodeNode = nodeNodes.get(nodeKey)
        if (!nodeNode) {
          nodeNode = { label: item.nodeName ?? '上游过程', value: nodeKey, children: [] }
          nodeNodes.set(nodeKey, nodeNode)
          subNode.children!.push(nodeNode)
        }
        nodeNode.children!.push({ label: item.name, value: `item:${item.dataItemId}` })
      } else {
        subNode.children!.push({ label: item.name, value: `item:${item.dataItemId}` })
      }
    })

    return [{ label: '全部', value: SCOPE_ALL, children: Array.from(stageNodes.values()) }]
  }, [filteredItems])

  /** 当前作用域数据项 */
  const scopedItems = useMemo(() => {
    if (activeNode === SCOPE_ALL) return filteredItems
    if (activeNode.startsWith('stage:')) {
      const stage = activeNode.slice('stage:'.length)
      return filteredItems.filter((item) => item.stageName === stage)
    }
    if (activeNode.startsWith('sub:')) {
      const sub = activeNode.slice('sub:'.length)
      return filteredItems.filter((item) => item.stagePath === sub)
    }
    if (activeNode.startsWith('node:')) {
      const nodeId = activeNode.slice('node:'.length)
      return filteredItems.filter((item) => item.nodeId === nodeId)
    }
    const dataItemId = activeNode.slice('item:'.length)
    return filteredItems.filter((item) => item.dataItemId === dataItemId)
  }, [activeNode, filteredItems])

  const listName = scopedItems[0]?.listName ?? '-'
  const caliberLabel = caliber === 'total' ? '总量（不含生物源CO₂）' : caliber

  const draftNumber = (item: SensitivityBaselineItem): number | null => {
    const raw = draft[item.dataItemId]
    if (raw === undefined || raw.trim() === '') return null
    const value = Number(raw)
    return Number.isFinite(value) ? value : null
  }

  const draftDelta = (item: SensitivityBaselineItem): number | null => {
    const value = draftNumber(item)
    if (value === null || item.baselineQty === null) return null
    return value - item.baselineQty
  }

  const changedCount = useMemo(
    () =>
      analysis.baselineItems.filter((item) => {
        const value = draftNumber(item)
        return value !== null && value !== item.baselineQty
      }).length,
    // draftNumber 依赖 draft，此处显式列出依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [analysis.baselineItems, draft],
  )

  const handleCalc = async () => {
    setCalculating(true)
    try {
      await calcScenario(
        analysis.id,
        scenario.id,
        analysis.baselineItems.map((item) => ({
          dataItemId: item.dataItemId,
          baselineQty: item.baselineQty,
          scenarioQty: draftNumber(item),
        })),
      )
      MessagePlugin.success(changedCount === 0 ? '未修改任何数据，结果与基准一致' : '核算完成')
      await onCalculated()
      onClose()
    } catch (error) {
      MessagePlugin.error(error instanceof Error ? error.message : '核算失败')
    } finally {
      setCalculating(false)
    }
  }

  const columns = [
    {
      colKey: 'name',
      title: '流名称',
      width: 200,
      cell: ({ row }: { row: SensitivityBaselineItem }) => (
        <span title={`${row.name}（${SA_ITEM_TYPE_TEXT[row.itemType] ?? row.itemType}）`}>{row.name}</span>
      ),
    },
    {
      colKey: 'baselineQty',
      title: '基准情景数量',
      width: 130,
      cell: ({ row }: { row: SensitivityBaselineItem }) => (
        <span className="sa-num">{row.baselineQty === null ? '-' : formatEmission(row.baselineQty)}</span>
      ),
    },
    {
      colKey: 'scenarioQty',
      title: '情景数量',
      width: 150,
      cell: ({ row }: { row: SensitivityBaselineItem }) => {
        if (!editing) {
          const value = draftNumber(row)
          return (
            <span className={`sa-num${value !== null && value !== row.baselineQty ? ' sa-num-changed' : ''}`}>
              {value === null ? '-' : formatEmission(value)}
            </span>
          )
        }
        return (
          <InputNumber
            value={draft[row.dataItemId]}
            placeholder="继承基准"
            theme="normal"
            decimalPlaces={4}
            onChange={(value) =>
              setDraft((prev) => ({
                ...prev,
                [row.dataItemId]: value === undefined || value === null ? '' : String(value),
              }))
            }
          />
        )
      },
    },
    {
      colKey: 'delta',
      title: '差值',
      width: 110,
      cell: ({ row }: { row: SensitivityBaselineItem }) => {
        const delta = draftDelta(row)
        if (delta === null || delta === 0) return <span className="sa-empty-cell">-</span>
        return (
          <span className={`sa-num ${delta > 0 ? 'sa-delta--up' : 'sa-delta--down'}`}>
            {`(${delta > 0 ? '+' : ''}${delta.toFixed(4)})`}
          </span>
        )
      },
    },
    {
      colKey: 'unit',
      title: '单位',
      width: 90,
      cell: ({ row }: { row: SensitivityBaselineItem }) => row.unit || '-',
    },
    {
      colKey: 'upstreamProcess',
      title: '上游过程名称',
      cell: ({ row }: { row: SensitivityBaselineItem }) => (
        <span className="sa-ellipsis" title={row.upstreamProcess || '-'}>
          {row.upstreamProcess || '-'}
        </span>
      ),
    },
  ]

  return (
    <Drawer
      visible
      header={`填写情景 ${scenario.seq} 数据`}
      size="960px"
      onClose={onClose}
      footer={
        <div className="sa-drawer-footer">
          <span className="sa-drawer-tip">
            当前口径：{caliberLabel} · 已变更 {changedCount} 项
          </span>
          <Space size="small">
            <Button variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button theme="primary" loading={calculating} onClick={() => void handleCalc()}>
              核算碳足迹
            </Button>
          </Space>
        </div>
      }
    >
      <Space size="small" className="sa-drawer-meta">
        <span>
          核算项目：<b>{analysis.sourceProjectName}</b>
        </span>
        <span>
          产品名称：<b>{analysis.productName}</b>
        </span>
      </Space>

      <Tabs
        value={currentStage}
        onChange={(value) => {
          setActiveStage(String(value))
          setActiveSubStage('')
          setActiveNode(SCOPE_ALL)
        }}
      >
        {stageNames.map((stage) => (
          <Tabs.TabPanel key={stage} value={stage} label={stage} />
        ))}
      </Tabs>

      {subStages.length > 1 ? (
        <div className="sa-substage">
          <span className="sa-substage-label">二级阶段</span>
          <RadioGroup
            value={activeSubStage}
            variant="default-filled"
            onChange={(value) => {
              setActiveSubStage(String(value))
              setActiveNode(`sub:${String(value)}`)
            }}
          >
            {subStages.map((path) => (
              <Radio key={path} value={path}>
                {path}
              </Radio>
            ))}
          </RadioGroup>
        </div>
      ) : null}

      <div className="sa-drawer-body">
        <div className="sa-drawer-tree">
          <Input
            value={keyword}
            placeholder="搜索数据项"
            clearable
            onChange={(value) => setKeyword(String(value ?? ''))}
          />
          <Tree
            data={treeData}
            activable
            value={activeNode ? [activeNode] : []}
            onActive={(value) => {
              const next = Array.isArray(value) ? String(value[0] ?? SCOPE_ALL) : String(value ?? SCOPE_ALL)
              setActiveNode(next || SCOPE_ALL)
            }}
            className="sa-tree"
          />
        </div>

        <div className="sa-drawer-table">
          <div className="sa-list-head">
            <div>
              <div className="sa-list-product">产品产出：{analysis.productName}</div>
              <div className="sa-list-name">数据列表：{listName}</div>
            </div>
            <Button variant="text" onClick={() => setEditing((prev) => !prev)}>
              {editing ? '完成编辑' : '编辑'}
            </Button>
          </div>

          {scopedItems.length === 0 ? (
            <Empty description="该作用域暂无数据项" />
          ) : (
            <Table rowKey="dataItemId" data={scopedItems} columns={columns} size="small" />
          )}
        </div>
      </div>
    </Drawer>
  )
}
