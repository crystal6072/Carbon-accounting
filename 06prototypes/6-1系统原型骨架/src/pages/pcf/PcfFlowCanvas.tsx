import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Button, Modal, useToast } from '@/shared/components'
import { fetchPcfProcessNodes, fetchPcfStageData } from '@/mock'
import type { PcfLifecycleStage, PcfProcessNode, PcfProject, PcfStageDataItem } from '@/types'
import { PCF_EMISSION_TYPE_TEXT, PCF_ITEM_TYPE_TEXT, pcfDirectionOf } from './pcfItemMeta'
import './PcfFlowCanvas.css'

interface PcfFlowCanvasProps {
  open: boolean
  project: PcfProject
  onClose: () => void
}

/** 画布中的过程卡片（生命周期阶段根卡片 + 「继续追溯」生成的上游过程卡片） */
interface FlowCard {
  key: string
  title: string
  /** 副标题：阶段卡 = 所属一级阶段；节点卡 = 固定「上游过程」 */
  subtitle: string
  kind: 'stage' | 'node'
  /** 父卡片 key（空 = 根卡片，即末级生命周期阶段） */
  parentKey: string | null
  /** 入边标签 = 触发追溯的数据项名称（根卡片为空） */
  traceLabel: string
  inputs: PcfStageDataItem[]
  outputs: PcfStageDataItem[]
}

interface FlowEdge {
  key: string
  from: string
  to: string
  label: string
}

interface CardBox {
  x: number
  y: number
  w: number
  h: number
}

/* 布局常量（与 CSS 中卡片宽度保持一致） */
const CARD_W = 264
const GAP_X = 72
const GAP_Y = 18
const PAD = 48
const MIN_ZOOM = 0.2
const MAX_ZOOM = 2

/** 数据项行标签：排放物显示子类（废水 / 废渣 / 废气），其余显示数据项类型 */
function itemTagOf(item: PcfStageDataItem): string {
  if (item.itemType === 'emission') {
    return item.emissionType ? PCF_EMISSION_TYPE_TEXT[item.emissionType] : '排放物'
  }
  return PCF_ITEM_TYPE_TEXT[item.itemType]
}

/** 数量 + 单位展示（数量为空时仅展示单位） */
function qtyTextOf(item: PcfStageDataItem): string {
  if (item.quantity == null) return item.unit || '-'
  return `${item.quantity} ${item.unit}`.trim()
}

/**
 * 由项目建模数据构建画布卡片与连线：
 * - 根卡片 = 步骤①纳入的**末级生命周期阶段**（二级阶段，或没有下级的一级阶段）；
 * - 子卡片 = 「继续追溯」生成的**上游过程节点**，按 parentId 挂在父阶段 / 父节点下；
 * - 卡片内数据项按类型分「输入 / 输出」：原辅料、能源、自然资源为输入；
 *   产品、副产品、排放物为输出（与 `pcfDirectionOf` 同口径）；
 * - 连线 = 追溯关系（父卡片 → 上游过程卡片），标签为触发追溯的数据项名称。
 */
function buildFlow(project: PcfProject, items: PcfStageDataItem[], nodes: PcfProcessNode[]) {
  const included = (project.lifecycleStages ?? []).filter((s) => s.included)
  /** 末级阶段判定（与步骤②左树同规则）：二级阶段恒为末级；一级阶段无下级阶段时才是末级 */
  const parentIds = new Set(
    included
      .filter((s) => s.parentName)
      .map((s) => included.find((p) => p.name === s.parentName)?.id)
      .filter(Boolean) as string[],
  )
  const isLeaf = (s: PcfLifecycleStage) => s.level === 2 || !parentIds.has(s.id)

  const cards: FlowCard[] = []
  const cardKeys = new Set<string>()

  const ensureStageCard = (stage: PcfLifecycleStage) => {
    const key = `stage:${stage.id}`
    if (cardKeys.has(key)) return key
    cardKeys.add(key)
    cards.push({
      key,
      title: stage.name,
      subtitle: stage.level === 2 && stage.parentName ? stage.parentName : '生命周期阶段',
      kind: 'stage',
      parentKey: null,
      traceLabel: '',
      inputs: [],
      outputs: [],
    })
    return key
  }

  // 根卡片：纳入的末级阶段（保持项目阶段顺序）
  included.filter(isLeaf).forEach(ensureStageCard)

  // 子卡片：追溯节点；父节点缺失时回退到所属阶段
  const nodeKeyOf = (node: PcfProcessNode) => `node:${node.id}`
  nodes.forEach((node) => {
    const key = nodeKeyOf(node)
    if (cardKeys.has(key)) return
    cardKeys.add(key)
    const parentNode = node.parentId ? nodes.find((n) => n.id === node.parentId) : undefined
    const parentKey = parentNode ? nodeKeyOf(parentNode) : `stage:${node.stageId}`
    const sourceItem = node.sourceItemId ? items.find((i) => i.id === node.sourceItemId) : undefined
    cards.push({
      key,
      title: node.name,
      subtitle: '上游过程',
      kind: 'node',
      parentKey: cardKeys.has(parentKey) || parentNode ? parentKey : `stage:${node.stageId}`,
      traceLabel: sourceItem?.name ?? node.name,
      inputs: [],
      outputs: [],
    })
  })

  // 阶段名兜底：数据项 / 节点挂在未纳入阶段时，补一张阶段卡，避免数据丢失
  const stageById = new Map((project.lifecycleStages ?? []).map((s) => [s.id, s]))
  const scopeKeyOf = (item: PcfStageDataItem) =>
    item.nodeId && cardKeys.has(`node:${item.nodeId}`) ? `node:${item.nodeId}` : `stage:${item.stageId}`
  items.forEach((item) => {
    const key = scopeKeyOf(item)
    if (!cardKeys.has(key)) {
      const stage = stageById.get(item.stageId)
      if (stage) ensureStageCard(stage)
      else {
        cardKeys.add(key)
        cards.push({
          key,
          title: item.stageName || '未命名阶段',
          subtitle: '生命周期阶段',
          kind: 'stage',
          parentKey: null,
          traceLabel: '',
          inputs: [],
          outputs: [],
        })
      }
    }
  })

  // 数据项入卡：按类型推导输入 / 输出（原辅料、能源、自然资源 = 输入；产品、副产品、排放物 = 输出）
  items.forEach((item) => {
    const card = cards.find((c) => c.key === scopeKeyOf(item))
    if (!card) return
    if (pcfDirectionOf(item.itemType) === 'input') card.inputs.push(item)
    else card.outputs.push(item)
  })

  /**
   * 聚焦有内容的卡片：**既无数据项、也无追溯子链路**的阶段 / 节点不进画布（空过程无预览价值），
   * 但内容卡片的祖先链始终保留，保证追溯连线完整。
   */
  const cardByKey = new Map(cards.map((c) => [c.key, c]))
  const kept = new Set<string>()
  const markKeep = (key: string) => {
    if (kept.has(key)) return
    kept.add(key)
    const parentKey = cardByKey.get(key)?.parentKey
    if (parentKey && cardByKey.has(parentKey)) markKeep(parentKey)
  }
  cards.forEach((c) => {
    if (c.inputs.length > 0 || c.outputs.length > 0) markKeep(c.key)
  })
  const visibleCards = cards.filter((c) => kept.has(c.key))

  // 父子均存在的连线（追溯关系）
  const edges: FlowEdge[] = visibleCards
    .filter((c) => c.parentKey && kept.has(c.parentKey))
    .map((c) => ({ key: `${c.parentKey}->${c.key}`, from: c.parentKey as string, to: c.key, label: c.traceLabel }))

  return { cards: visibleCards, edges }
}

/**
 * 横向布局：**每个末级阶段独占一列**（按阶段顺序左→右排布），
 * 列内「阶段卡 → 其追溯节点（DFS 父前子后）」纵向堆叠，追溯连线为同列竖向曲线。
 */
function layoutCards(cards: FlowCard[], measure: Map<string, { w: number; h: number }>) {
  const boxes = new Map<string, CardBox>()
  const childrenOf = (key: string) => cards.filter((c) => c.parentKey === key)

  const place = (card: FlowCard, x: number, cursor: { y: number }) => {
    const m = measure.get(card.key) ?? { w: CARD_W, h: 120 }
    const y = cursor.y
    boxes.set(card.key, { x, y, w: m.w, h: m.h })
    cursor.y = y + m.h + GAP_Y
    // 追溯节点挂在父卡片下方（同列），先父后子
    childrenOf(card.key).forEach((child) => place(child, x, cursor))
  }

  // 根卡片（末级阶段）逐列横向排布
  const roots = cards.filter((c) => !c.parentKey)
  roots.forEach((root, index) => {
    place(root, PAD + index * (CARD_W + GAP_X), { y: PAD })
  })

  // 防御：父卡片缺失的孤立节点补在最后一列，避免不渲染
  const lastX = PAD + roots.length * (CARD_W + GAP_X)
  cards.forEach((c) => {
    if (boxes.has(c.key)) return
    const m = measure.get(c.key) ?? { w: CARD_W, h: 120 }
    boxes.set(c.key, { x: lastX, y: PAD, w: m.w, h: m.h })
  })
  return boxes
}

/** 溯源链路高亮：点击画布卡片后高亮其祖先链（根因路径） */
function ancestorChain(card: FlowCard, byKey: Map<string, FlowCard>): Set<string> {
  const chain = new Set<string>()
  let cur: FlowCard | undefined = card
  while (cur) {
    chain.add(cur.key)
    cur = cur.parentKey ? byKey.get(cur.parentKey) : undefined
  }
  return chain
}

/**
 * 模型预览 · 流程画布（步骤②③④ 共用）：
 * 以「生命周期阶段 / 上游过程」为节点、数据项输入输出为内容、追溯关系为连线，
 * 支持拖拽平移、按钮 / 滚轮缩放、适应画布、逐个聚焦与右下角小地图。
 */
export default function PcfFlowCanvas({ open, project, onClose }: PcfFlowCanvasProps) {
  const toast = useToast()
  const [items, setItems] = useState<PcfStageDataItem[]>([])
  const [nodes, setNodes] = useState<PcfProcessNode[]>([])
  const [loading, setLoading] = useState(false)

  const [boxes, setBoxes] = useState<Map<string, CardBox> | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [focusIndex, setFocusIndex] = useState(-1)
  const [activeKey, setActiveKey] = useState('')

  const viewportRef = useRef<HTMLDivElement | null>(null)
  /** 视口元素state化：数据加载完成后视口才挂载，滚轮监听需在其就绪后附加 */
  const [viewportEl, setViewportEl] = useState<HTMLDivElement | null>(null)
  const cardRefs = useRef(new Map<string, HTMLDivElement | null>())
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)

  const { cards, edges } = useMemo(() => buildFlow(project, items, nodes), [project, items, nodes])
  const byKey = useMemo(() => new Map(cards.map((c) => [c.key, c])), [cards])
  /** 聚焦顺序：先按层级、再按纵向位置 */
  const orderedKeys = useMemo(() => {
    if (!boxes) return []
    return [...boxes.entries()].sort((a, b) => a[1].x - b[1].x || a[1].y - b[1].y).map(([key]) => key)
  }, [boxes])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [data, nodeList] = await Promise.all([fetchPcfStageData(project.id), fetchPcfProcessNodes(project.id)])
      setItems(data)
      setNodes(nodeList)
    } catch (error) {
      toast(error instanceof Error ? error.message : '建模数据加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [project.id, toast])

  useEffect(() => {
    if (!open) return
    cardRefs.current = new Map()
    setBoxes(null)
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setFocusIndex(-1)
    setActiveKey('')
    void load()
  }, [open, load])

  /** 卡片挂载后测量真实高度并计算分层布局 */
  useLayoutEffect(() => {
    if (loading || cards.length === 0) {
      if (!loading) setBoxes(new Map())
      return
    }
    const measure = new Map<string, { w: number; h: number }>()
    cardRefs.current.forEach((el, key) => {
      if (el) measure.set(key, { w: el.offsetWidth, h: el.offsetHeight })
    })
    setBoxes(layoutCards(cards, measure))
  }, [loading, cards])

  const worldSize = useMemo(() => {
    if (!boxes) return { w: 0, h: 0 }
    let w = 0
    let h = 0
    boxes.forEach((b) => {
      w = Math.max(w, b.x + b.w)
      h = Math.max(h, b.y + b.h)
    })
    return { w: w + PAD, h: h + PAD }
  }, [boxes])

  /** 适应画布：缩放至完整可见并居中 */
  const fitView = useCallback(() => {
    const vp = viewportRef.current
    if (!vp || !boxes || worldSize.w === 0) return
    const vw = vp.clientWidth
    const vh = vp.clientHeight
    const next = Math.min(vw / worldSize.w, vh / worldSize.h, 1.2)
    const z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next))
    setZoom(z)
    setPan({ x: (vw - worldSize.w * z) / 2, y: (vh - worldSize.h * z) / 2 })
  }, [boxes, worldSize])

  /** 布局就绪后默认适应一次 */
  useEffect(() => {
    if (boxes && boxes.size > 0) fitView()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boxes])

  /** 将指定卡片移至视口中心（上一步 / 下一步 / 小地图跳转） */
  const centerOn = useCallback(
    (key: string) => {
      const vp = viewportRef.current
      const box = boxes?.get(key)
      if (!vp || !box) return
      setActiveKey(key)
      setPan({
        x: vp.clientWidth / 2 - (box.x + box.w / 2) * zoom,
        y: vp.clientHeight / 2 - (box.y + box.h / 2) * zoom,
      })
    },
    [boxes, zoom],
  )

  const stepFocus = (delta: number) => {
    if (orderedKeys.length === 0) return
    const next = (focusIndex + delta + orderedKeys.length) % orderedKeys.length
    setFocusIndex(next)
    centerOn(orderedKeys[next])
  }

  const zoomBy = (factor: number) => {
    const vp = viewportRef.current
    if (!vp) return
    const cx = vp.clientWidth / 2
    const cy = vp.clientHeight / 2
    const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * factor))
    const worldX = (cx - pan.x) / zoom
    const worldY = (cy - pan.y) / zoom
    setZoom(next)
    setPan({ x: cx - worldX * next, y: cy - worldY * next })
  }

  /** 滚轮缩放（以光标为中心；原生监听 + passive:false 以阻止页面滚动） */
  useEffect(() => {
    if (!open || !viewportEl) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const vp = viewportEl
      const rect = vp.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
      setZoom((prevZoom) => {
        const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prevZoom * factor))
        setPan((prevPan) => {
          const worldX = (cx - prevPan.x) / prevZoom
          const worldY = (cy - prevPan.y) / prevZoom
          return { x: cx - worldX * next, y: cy - worldY * next }
        })
        return next
      })
    }
    viewportEl.addEventListener('wheel', onWheel, { passive: false })
    return () => viewportEl.removeEventListener('wheel', onWheel)
  }, [open, viewportEl])

  /** 拖拽平移 */
  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    dragRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
  }
  const onMouseMove = (e: React.MouseEvent) => {
    const drag = dragRef.current
    if (!drag) return
    setPan({ x: drag.panX + (e.clientX - drag.x), y: drag.panY + (e.clientY - drag.y) })
  }
  const onMouseUp = () => {
    dragRef.current = null
  }

  /** 小地图：点击跳转 */
  const MM_W = 180
  const MM_H = 120
  const mmScale = worldSize.w > 0 ? Math.min(MM_W / worldSize.w, MM_H / worldSize.h) : 1
  const onMinimapClick = (e: React.MouseEvent) => {
    const vp = viewportRef.current
    if (!vp || worldSize.w === 0) return
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
    const worldX = (e.clientX - rect.left) / mmScale
    const worldY = (e.clientY - rect.top) / mmScale
    setPan({ x: vp.clientWidth / 2 - worldX * zoom, y: vp.clientHeight / 2 - worldY * zoom })
  }

  const totalItems = items.length
  const chain = activeKey ? ancestorChain(byKey.get(activeKey) as FlowCard, byKey) : new Set<string>()

  return (
    <Modal
      open={open}
      title="模型预览"
      size="xl"
      onClose={onClose}
      footer={
        <>
          <span className="toolbar-tip" style={{ marginRight: 'auto' }}>
            共 {cards.length} 个过程 · {totalItems} 项数据（输入：原辅料 / 能源 / 自然资源；输出：产品 / 副产品 / 排放物）
          </span>
          <Button onClick={onClose}>关闭</Button>
        </>
      }
    >
      {loading ? (
        <div className="pcf-placeholder">加载中…</div>
      ) : cards.length === 0 ? (
        <div className="pcf-placeholder">暂无建模数据：请先在步骤②「产品建模」中录入数据项或继续追溯上游过程</div>
      ) : (
        <div className="pcf-flow">
          {/* 视口：拖拽平移 + 滚轮缩放 */}
          <div
            className="pcf-flow-viewport"
            ref={(el) => {
              viewportRef.current = el
              setViewportEl(el)
            }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            <div
              className="pcf-flow-world"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                visibility: boxes ? 'visible' : 'hidden',
              }}
            >
              {/* 连线层（追溯关系） */}
              <svg className="pcf-flow-edges" width={worldSize.w} height={worldSize.h}>
                <defs>
                  <marker id="pcf-flow-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M0 0L10 5L0 10z" fill="var(--color-text-placeholder)" />
                  </marker>
                </defs>
                {boxes &&
                  edges.map((edge) => {
                    const from = boxes.get(edge.from)
                    const to = boxes.get(edge.to)
                    if (!from || !to) return null
                    const active = chain.has(edge.from) && chain.has(edge.to)
                    // 同列（阶段 → 列内追溯节点）：父卡片底边 → 子卡片顶边的竖向曲线
                    // 跨列（防御）：父卡片右边 → 子卡片左边的横向曲线
                    const sameColumn = Math.abs(from.x - to.x) < 1
                    const x1 = sameColumn ? from.x + from.w / 2 : from.x + from.w
                    const y1 = sameColumn ? from.y + from.h : from.y + from.h / 2
                    const x2 = sameColumn ? to.x + to.w / 2 : to.x
                    const y2 = sameColumn ? to.y : to.y + to.h / 2
                    const d = sameColumn
                      ? `M ${x1} ${y1} C ${x1} ${y1 + 28}, ${x2} ${y2 - 28}, ${x2} ${y2}`
                      : `M ${x1} ${y1} C ${x1 + 28} ${y1}, ${x2 - 28} ${y2}, ${x2} ${y2}`
                    return (
                      <g key={edge.key} className={active ? 'is-active' : undefined}>
                        <path className="pcf-flow-edge" d={d} markerEnd="url(#pcf-flow-arrow)" />
                        {edge.label && (
                          <text className="pcf-flow-edge-label" x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 6}>
                            {edge.label}
                          </text>
                        )}
                      </g>
                    )
                  })}
              </svg>

              {/* 过程卡片 */}
              {cards.map((card) => {
                const box = boxes?.get(card.key)
                return (
                  <div
                    key={card.key}
                    ref={(el) => {
                      cardRefs.current.set(card.key, el)
                    }}
                    className={[
                      'pcf-flow-card',
                      card.kind === 'node' ? 'is-node' : 'is-stage',
                      chain.has(card.key) ? 'is-chain' : '',
                      activeKey === card.key ? 'is-focus' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={box ? { left: box.x, top: box.y, width: box.w } : { left: 0, top: 0, width: CARD_W }}
                    onClick={() => setActiveKey((prev) => (prev === card.key ? '' : card.key))}
                  >
                    <div className="pcf-flow-card-head">
                      <div className="pcf-flow-card-title" title={card.title}>
                        {card.title}
                      </div>
                      <span className="pcf-flow-card-kind">{card.kind === 'node' ? '上游过程' : '阶段'}</span>
                    </div>
                    <div className="pcf-flow-card-subtitle">{card.subtitle}</div>

                    <div className="pcf-flow-section">
                      <div className="pcf-flow-section-title is-input">输入（{card.inputs.length}）</div>
                      {card.inputs.length === 0 ? (
                        <div className="pcf-flow-empty">无</div>
                      ) : (
                        card.inputs.map((item) => (
                          <div className="pcf-flow-item" key={item.id} title={`${item.name}（${itemTagOf(item)}）`}>
                            <span className="pcf-flow-dot is-input" />
                            <span className="pcf-flow-item-name">{item.name}</span>
                            <span className="pcf-flow-item-tag">{itemTagOf(item)}</span>
                            <span className="pcf-flow-item-qty mono">{qtyTextOf(item)}</span>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="pcf-flow-section">
                      <div className="pcf-flow-section-title is-output">输出（{card.outputs.length}）</div>
                      {card.outputs.length === 0 ? (
                        <div className="pcf-flow-empty">无</div>
                      ) : (
                        card.outputs.map((item) => (
                          <div className="pcf-flow-item" key={item.id} title={`${item.name}（${itemTagOf(item)}）`}>
                            <span className="pcf-flow-dot is-output" />
                            <span className="pcf-flow-item-name">{item.name}</span>
                            <span className="pcf-flow-item-tag">{itemTagOf(item)}</span>
                            <span className="pcf-flow-item-qty mono">{qtyTextOf(item)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 右上工具栏：缩放 / 适应 / 逐步聚焦 */}
            <div className="pcf-flow-toolbar">
              <button type="button" title="放大" onClick={() => zoomBy(1.2)}>
                放大
              </button>
              <button type="button" title="缩小" onClick={() => zoomBy(1 / 1.2)}>
                缩小
              </button>
              <span className="pcf-flow-zoom-text mono">{Math.round(zoom * 100)}%</span>
              <button type="button" title="适应画布" onClick={fitView}>
                适应
              </button>
              <span className="pcf-flow-toolbar-sep" />
              <button type="button" title="上一个过程" onClick={() => stepFocus(-1)}>
                上一步
              </button>
              <button type="button" title="下一个过程" onClick={() => stepFocus(1)}>
                下一步
              </button>
            </div>

            {/* 右下小地图 */}
            {worldSize.w > 0 && (
              <div
                className="pcf-flow-minimap"
                style={{ width: MM_W, height: MM_H }}
                onClick={onMinimapClick}
                title="点击跳转"
              >
                {boxes &&
                  [...boxes.entries()].map(([key, b]) => (
                    <div
                      key={key}
                      className="pcf-flow-minimap-card"
                      style={{
                        left: b.x * mmScale,
                        top: b.y * mmScale,
                        width: Math.max(3, b.w * mmScale),
                        height: Math.max(2, b.h * mmScale),
                      }}
                    />
                  ))}
                <div
                  className="pcf-flow-minimap-view"
                  style={{
                    left: (-pan.x / zoom) * mmScale,
                    top: (-pan.y / zoom) * mmScale,
                    width: ((viewportRef.current?.clientWidth ?? 0) / zoom) * mmScale,
                    height: ((viewportRef.current?.clientHeight ?? 0) / zoom) * mmScale,
                  }}
                />
              </div>
            )}
          </div>

          <div className="pcf-flow-legend">
            <span>
              <i className="pcf-flow-dot is-input" />
              输入（原辅料 / 能源 / 自然资源）
            </span>
            <span>
              <i className="pcf-flow-dot is-output" />
              输出（产品 / 副产品 / 排放物）
            </span>
            <span className="pcf-flow-legend-tip">拖拽平移 · 滚轮缩放 · 点击卡片高亮溯源链</span>
          </div>
        </div>
      )}
    </Modal>
  )
}
