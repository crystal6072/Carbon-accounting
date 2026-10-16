import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Table, Tag, useToast } from '@/shared/components'
import type { Column } from '@/shared/components'
import {
  exportPcfInventory,
  fetchPcfCalcResult,
  resumePcfCalc,
  startPcfCalc,
} from '@/mock'
import type {
  PcfCalcResult,
  PcfCalcStatus,
  PcfCaliberKey,
  PcfOperationSummary,
  PcfProject,
  PcfProjectStatus,
  PcfResultDetail,
  PcfStageSummary,
} from '@/types'
import { PCF_CALIBERS } from '@/types'
import PcfFlowCanvas from './PcfFlowCanvas'
import { FLOW_TYPE_TEXT, PCF_EDITABLE_STATUSES } from './pcfMeta'
import './PcfPage.css'

interface ProjectStepFourProps {
  project: PcfProject
  /** 只读（查看）模式：隐藏核算执行入口 */
  readOnly?: boolean
  onSaved: (project: PcfProject) => void
}

/** 排放量格式化：保留最多 4 位小数、去掉尾随 0 */
function formatEmission(value: number): string {
  return value.toFixed(4).replace(/\.?0+$/, '')
}

/** 占比色条（宽度 = 占比%） */
function RatioBar({ ratio }: { ratio: number }) {
  return (
    <div className="pcf-ratio-bar">
      <div className="pcf-ratio-bar-fill" style={{ width: `${Math.min(ratio, 100)}%` }} />
      <span className="pcf-ratio-bar-text">{ratio.toFixed(1)}%</span>
    </div>
  )
}

/**
 * 项目状态 → 核算状态（业务 PRD §5.2 映射）。
 * V0.8 报告环节移除后，末态即「已核算」；「已完成」（`done`，V1.1 起不锁定）有结果即视为「已核算」、无结果按「待核算」呈现；
 * 历史报告态（只读回看）不落在四态的「待核算」上。
 */
/**
 * 项目状态 → 核算执行态（步骤④状态卡四态口径）。
 * 2026-10-16：状态机收敛为 待处理 → 待检测 → 待核算 → 已完成，
 * 故 `toCheck` / `ongoing` 落在「待核算」占位上（步骤④实际不可达）；
 * 历史报告态（只读回看）不落在「待核算」上。
 */
function calcStatusOf(status: PcfProjectStatus, hasResult: boolean): PcfCalcStatus {
  switch (status) {
    case 'toCalc':
      return 'idle'
    case 'calculating':
      return 'calculating'
    case 'calculated':
      return 'done'
    case 'calcFailed':
      return 'failed'
    default:
      return hasResult ? 'done' : 'idle'
  }
}

/**
 * 工作台步骤④「碳足迹核算与结果」内容区（原步骤④核算 + 步骤⑤结果合并，V0.7）。
 * - 上区：核算执行状态卡（待核算 / 核算中 / 核算完成 / 核算失败）+ 执行动作；
 * - 下区：结果总览（每声明单位碳足迹 + 总排放 + 下载清册）、阶段汇总、数据项汇总（可下钻）、
 *   结果明细。
 * 2026-10-16：「待核算」→ 点「开始核算」→ 直接流转「已完成」（已移除手动「确认完成」）。
 */
export default function ProjectStepFour({ project, readOnly: readOnlyProp = false, onSaved }: ProjectStepFourProps) {
  const toast = useToast()

  const [result, setResult] = useState<PcfCalcResult | null>(null)
  const [loading, setLoading] = useState(false)
  // 「核算中」项目进入本步骤时即处于执行中（等待异步结果）
  const [running, setRunning] = useState(() => project.status === 'calculating')
  const [activeOpId, setActiveOpId] = useState('')
  /** 结果口径：GWP 四分量（总量（不含生物源CO₂）/ 化石 / 生物源 / 直接土地利用变化） */
  const [caliber, setCaliber] = useState<PcfCaliberKey>('total')
  const detailRef = useRef<HTMLDivElement>(null)
  const resumedRef = useRef('')
  /** 模型预览 · 流程画布 */
  const [canvasOpen, setCanvasOpen] = useState(false)

  // 点击「开始核算」后（running）立即进入「核算中」态，避免依赖 project 状态异步回传的延迟
  const status: PcfCalcStatus = running ? 'calculating' : calcStatusOf(project.status, !!result)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setResult(await fetchPcfCalcResult(project.id))
    } catch (error) {
      toast(error instanceof Error ? error.message : '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [project.id, toast])

  useEffect(() => {
    void load()
  }, [load])

  // 切换项目 / 项目状态变化时同步执行态与下钻态
  useEffect(() => {
    setRunning(project.status === 'calculating')
    setActiveOpId('')
  }, [project.id, project.status])

  /**
   * 项目处于「核算中」时（如预置样本 PJ05），进入本步骤即自动推进异步核算任务到完成，
   * 完成后结果区在同页展开（原型模拟异步，真实系统由服务端回调 / 轮询驱动）。
   */
  useEffect(() => {
    if (project.status !== 'calculating' || resumedRef.current === project.id) return
    resumedRef.current = project.id
    let cancelled = false
    void (async () => {
      try {
        const res = await resumePcfCalc(project.id)
        if (cancelled) return
        setResult(res)
        onSaved({ ...project, status: 'done', currentStep: 4 })
        toast('核算完成')
      } catch (error) {
        if (!cancelled) {
          toast(error instanceof Error ? error.message : '核算失败，请重试', 'error')
        }
      } finally {
        if (!cancelled) setRunning(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id, project.status])

  // 只读态：查看模式，或历史报告态，均不再提供核算执行入口
  const readOnly = readOnlyProp || !PCF_EDITABLE_STATUSES.includes(project.status)
  /**
   * 可执行核算的项目状态：
   * - `toCalc` 待核算 / `calcFailed` 核算失败：首次核算或失败重试；
   * - `calculated` 历史已核算（兼容旧数据）：在既有结果上重新计算；
   * - `done` 已完成：活动数据、排放因子或公式口径变更后**在既有结果上重新计算**，
   *   按版本号递增生成新结果版本，历史版本保留不可篡改（E13 之外的主动重算入口）。
   */
  const canCalc =
    !readOnly &&
    (project.status === 'toCalc' ||
      project.status === 'calcFailed' ||
      project.status === 'calculated' ||
      project.status === 'done')

  const handleCalc = async () => {
    if (running) return
    // 已完成状态下执行 = 重新计算（产出新版本，历史版本保留）
    const recalc = project.status === 'calculated' || project.status === 'done'
    setRunning(true)
    try {
      const res = await startPcfCalc(project.id)
      setResult(res)
      // 核算完成即置「已完成」，不再需要用户手动「确认完成」
      onSaved({ ...project, status: 'done', currentStep: 4 })
      toast(recalc ? `重新计算完成，已生成结果版本 V${res.version}` : '核算完成')
    } catch (error) {
      toast(error instanceof Error ? error.message : '核算失败，请重试', 'error')
      void load()
    } finally {
      setRunning(false)
    }
  }

  /** 按当前口径下载核算清册（Excel 多工作表：总表 + 每个最末级生命周期阶段一张表） */
  const handleExportInventory = async () => {
    try {
      const { filename, content, mime } = await exportPcfInventory(project.id, caliber)
      const blob = new Blob([content], { type: mime })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast(`已下载清册（${caliberDef.label}）`)
    } catch (error) {
      toast(error instanceof Error ? error.message : '清册导出失败', 'error')
    }
  }

  const detailRows = useMemo(() => {
    if (!result) return []
    if (!activeOpId) return result.details
    return result.details.filter((d) => d.operationId === activeOpId)
  }, [result, activeOpId])

  /** 明细行在指定口径下的排放值（兼容无四分量字段的历史结果） */
  const caliberValueOf = useCallback(
    (d: PcfResultDetail, key: PcfCaliberKey): number => {
      if (d.emissionBreakdown) return d.emissionBreakdown[key]
      if (key === 'fossil') return d.fossilEmission ?? d.emission
      if (key === 'biogenic') return d.biogenicEmission ?? 0
      if (key === 'luluc') return d.lulucEmission ?? 0
      return d.emission
    },
    [],
  )

  const caliberDef = PCF_CALIBERS.find((item) => item.key === caliber) ?? PCF_CALIBERS[0]
  /** 是否存在分项口径（无分项时仅按「总量」单口径呈现） */
  const hasCaliberSplit = (result?.details ?? []).some(
    (d) => (d.biogenicEmission ?? 0) !== 0 || (d.lulucEmission ?? 0) !== 0,
  )

  /** 四分量口径合计（逐行相加，与清册「总表-合计」同口径） */
  const caliberTotals = useMemo(() => {
    const totals = { total: 0, fossil: 0, biogenic: 0, luluc: 0 } as Record<PcfCaliberKey, number>
    ;(result?.details ?? []).forEach((d) => {
      PCF_CALIBERS.forEach((item) => {
        totals[item.key] += caliberValueOf(d, item.key)
      })
    })
    return totals
  }, [result, caliberValueOf])

  const displayUnitEmission = caliberTotals[caliber]
  /** 当前口径的占比（占该口径合计） */
  const ratioOf = (value: number) => (caliberTotals[caliber] > 0 ? (value / caliberTotals[caliber]) * 100 : 0)

  /** 点击工序 → 明细区按该工序过滤并滚动定位 */
  const toggleDetail = (operationId: string) => {
    const next = activeOpId === operationId ? '' : operationId
    setActiveOpId(next)
    if (next) {
      requestAnimationFrame(() => {
        detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }

  /** 阶段汇总 / 数据项汇总：均按当前口径从明细实时汇总（与清册同一口径） */
  const stageSummaryRows = useMemo<PcfStageSummary[]>(() => {
    const map = new Map<string, number>()
    ;(result?.details ?? []).forEach((d) => {
      map.set(d.stage, (map.get(d.stage) ?? 0) + caliberValueOf(d, caliber))
    })
    return [...map.entries()]
      .map(([stage, emission]) => ({ stage, emission, ratio: ratioOf(emission) }))
      .sort((a, b) => b.emission - a.emission)
  }, [result, caliber, caliberValueOf])

  const opSummaryRows = useMemo<PcfOperationSummary[]>(() => {
    return (result?.details ?? [])
      .map((d) => {
        const emission = caliberValueOf(d, caliber)
        return {
          operationId: d.operationId,
          processName: d.processName,
          opName: d.opName,
          stage: d.stage,
          stagePath: d.stagePath,
          emission,
          ratio: ratioOf(emission),
        }
      })
      .sort((a, b) => b.emission - a.emission)
  }, [result, caliber, caliberValueOf])

  const stageColumns: Column<PcfStageSummary>[] = [
    { key: 'stage', title: '生命周期阶段' },
    {
      key: 'emission',
      title: '排放量（kgCO₂e）',
      align: 'right',
      render: (row) => formatEmission(row.emission),
    },
    { key: 'ratio', title: '占比', render: (row) => <RatioBar ratio={row.ratio} /> },
  ]

  const opColumns: Column<PcfOperationSummary>[] = [
    { key: 'opName', title: '数据项' },
    { key: 'processName', title: '所属过程' },
    { key: 'stage', title: '所属阶段' },
    { key: 'stagePath', title: '最末级阶段', render: (row) => row.stagePath || row.stage },
    {
      key: 'emission',
      title: '排放量（kgCO₂e）',
      align: 'right',
      render: (row) => formatEmission(row.emission),
    },
    { key: 'ratio', title: '贡献率', render: (row) => <RatioBar ratio={row.ratio} /> },
    {
      key: 'action',
      title: '操作',
      render: (row) => (
        <button
          type="button"
          className={activeOpId === row.operationId ? 'pcf-check-fix is-active' : 'pcf-check-fix'}
          onClick={() => toggleDetail(row.operationId)}
        >
          {activeOpId === row.operationId ? '收起明细' : '查看明细'}
        </button>
      ),
    },
  ]

  const detailColumns: Column<PcfResultDetail>[] = [
    { key: 'flowName', title: '数据项名称', width: 140 },
    {
      key: 'flowType',
      title: '类别',
      width: 80,
      render: (row) => <Tag tone="default">{FLOW_TYPE_TEXT[row.flowType] ?? row.flowType}</Tag>,
    },
    { key: 'direction', title: '流向', width: 70, render: (row) => (row.direction === 'input' ? '投入' : '产出') },
    { key: 'activityText', title: '活动量', width: 140 },
    { key: 'stagePath', title: '最末级阶段', width: 180, render: (row) => row.stagePath || row.stage },
    { key: 'factorName', title: '排放因子', width: 160, render: (row) => row.factorName || '-' },
    {
      key: 'factorValue',
      title: '排放系数',
      width: 150,
      render: (row) => {
        const value = row.factorCaliberValues?.[caliber] ?? (caliber === 'total' ? row.factorValue : null)
        if (value == null) return '-'
        return (
          <span className="mono nowrap">
            {formatEmission(value)} {row.factorUnit ?? ''}
          </span>
        )
      },
    },
    {
      key: 'factorSource',
      title: '背景数据来源',
      width: 240,
      render: (row) => <span className="cell-ellipsis">{row.factorSource || '-'}</span>,
    },
    { key: 'processName', title: '所属过程', width: 140 },
    {
      key: 'emission',
      title: '排放量（kgCO₂e）',
      align: 'right',
      render: (row) => formatEmission(caliberValueOf(row, caliber)),
    },
    {
      key: 'biogenicEmission',
      title: '其中生物源',
      align: 'right',
      render: (row) => {
        const value = row.biogenicEmission ?? 0
        return value === 0 ? '-' : formatEmission(value)
      },
    },
    {
      key: 'lulucEmission',
      title: '其中土地利用',
      align: 'right',
      render: (row) => {
        const value = row.lulucEmission ?? 0
        return value === 0 ? '-' : formatEmission(value)
      },
    },
  ]

  return (
    <div className="pcf-step-form" data-ann-target="pcf.step4.page.global">
      {/* 核算说明 */}
      <div className="pcf-form-tip">
        检测通过后项目即进入「待核算」；点击「开始核算」，系统将按步骤②录入的数据项逐条计算
        「数量 × 排放因子」，汇总生成总碳足迹、阶段 / 数据项结果，项目状态**直接流转为「已完成」**
        （无需手动确认完成），结果同页展示并可下载清册。核算结果随项目版本化留存：
        已完成项目在数据或排放因子变更后，可点击「重新计算」按当前数据重算，
        系统按版本号递增生成新结果版本，历史版本保留不可篡改。
      </div>

      {/* 核算状态卡（四态） */}
      <div className={`pcf-calc-card pcf-calc-${status}`} data-ann-target="pcf.step4.card">
        <div className="pcf-calc-head">
          <span className="pcf-calc-icon" aria-hidden="true">
            {status === 'done' ? '✓' : status === 'failed' ? '!' : '○'}
          </span>
          <div className="pcf-calc-title">
            <div className="pcf-calc-title-main">
              {status === 'idle' && '尚未执行核算'}
              {status === 'calculating' && '核算中…'}
              {status === 'done' && '核算完成'}
              {status === 'failed' && '核算失败'}
            </div>
            <div className="pcf-calc-meta">
              {status === 'idle' &&
                (readOnly ? '核算已完成，结果仅供查看' : '检测已通过，可开始核算')}
              {status === 'calculating' && '正在按工序公式计算活动数据与排放因子…'}
              {status === 'done' &&
                `核算时间：${result?.calculatedAt ?? '-'} · 结果版本 V${result?.version ?? '-'}`}
              {status === 'failed' && '核算异常，请检查数据后重新核算'}
            </div>
          </div>
          <div className="pcf-calc-actions">
            {status === 'idle' && canCalc && (
              <Button variant="primary" onClick={handleCalc}>
                开始核算
              </Button>
            )}
            {status === 'calculating' && (
              <Button variant="primary" disabled>
                核算中…
              </Button>
            )}
            {status === 'failed' && canCalc && (
              <Button variant="primary" onClick={handleCalc}>
                重新核算
              </Button>
            )}
            {status === 'done' && canCalc && (
              <Button data-ann-target="pcf.step4.recalc" onClick={handleCalc} title="按当前活动数据与排放因子重新计算，生成新的结果版本">
                重新计算
              </Button>
            )}
            <Button data-ann-target="pcf.step4.canvas" onClick={() => setCanvasOpen(true)} title="以流程画布形式预览建模数据（输入 / 输出 + 追溯链路）">
              预览模型
            </Button>
          </div>
        </div>
      </div>

      {/* 核算结果区（核算完成后展示；只读态回看同样展示最近结果版本） */}
      {loading ? (
        <div className="pcf-placeholder">加载中…</div>
      ) : result ? (
        <>
          <div className="pcf-result-card" data-ann-target="pcf.step4.result">
            <div className="pcf-result-head">
              <div className="pcf-result-main">
                <div className="pcf-result-label">
                  单位产品碳足迹
                  {status !== 'done' && <Tag tone="warning">历史版本</Tag>}
                </div>
                <div className="pcf-result-value">
                  {formatEmission(displayUnitEmission)} <span>kgCO₂e / {result.unit}</span>
                </div>
                <div className="pcf-result-meta">
                  <span>核算时间 {result.calculatedAt}</span>
                </div>
              </div>
              <div className="pcf-result-actions">
                <Button
                  variant="primary"
                  data-ann-target="pcf.step4.inventory"
                  title={`按「${caliberDef.indicatorCn}」下载核算清册（总表 + 每个最末级生命周期阶段各 1 张表）`}
                  onClick={() => void handleExportInventory()}
                >
                  下载清册
                </Button>
              </div>
            </div>
            {/* 口径切换（卡片式）：一个口径 = 一套清册；无 GWP 分项时按单一口径呈现 */}
            {hasCaliberSplit ? (
              <div className="pcf-caliber-cards">
                {PCF_CALIBERS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={['pcf-caliber-card', caliber === item.key ? 'active' : '']
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => setCaliber(item.key)}
                  >
                    <span className="pcf-caliber-indicator">{item.indicator}</span>
                    <span className="pcf-caliber-value mono">
                      {formatEmission(caliberTotals[item.key])} kgCO₂e / {result.unit}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="pcf-result-meta">
                <span>口径：{caliberDef.label}（本项目所选因子未提供 GWP 分项，按单一口径核算）</span>
              </div>
            )}
          </div>

          {/* 阶段汇总 */}
          <div className="pcf-panel" data-ann-target="pcf.step4.summary">
            <div className="pcf-panel-head">
              <span className="pcf-panel-title">阶段汇总（{caliberDef.shortLabel}）</span>
              <span className="pcf-panel-tip">生命周期阶段按一级阶段上卷；随所选口径实时汇总</span>
            </div>
            <div className="pcf-table-wrap">
              <Table
                columns={stageColumns}
                data={stageSummaryRows}
                rowKey={(row) => row.stage}
                emptyText="暂无阶段结果"
              />
            </div>
          </div>

          {/* 工序汇总 */}
          <div className="pcf-panel">
            <div className="pcf-panel-head">
              <span className="pcf-panel-title">数据项汇总（{caliberDef.shortLabel}）</span>
              <span className="pcf-panel-tip">按排放量降序；点击「查看明细」可查看该项明细</span>
            </div>
            <div className="pcf-table-wrap">
              <Table
                columns={opColumns}
                data={opSummaryRows}
                rowKey={(row) => row.operationId}
                emptyText="暂无工序结果"
              />
            </div>
          </div>

          {/* 结果明细（下钻） */}
          <div className="pcf-panel" ref={detailRef} data-ann-target="pcf.step4.details">
            <div className="pcf-panel-head">
              <span className="pcf-panel-title">
                结果明细（{caliberDef.shortLabel}）
                {activeOpId && (
                  <Tag tone="info">
                    {opSummaryRows.find((o) => o.operationId === activeOpId)?.opName ?? ''}
                  </Tag>
                )}
              </span>
              <span className="pcf-panel-tip">
                数量 × 排放系数 = 排放量；系数按所选因子快照固化，同一行可切换「总量 / 化石 / 生物源 / 土地利用」查看
              </span>
            </div>
            <div className="pcf-table-wrap">
              <Table
                columns={detailColumns}
                data={detailRows}
                rowKey={(row) => row.id}
                emptyText="暂无结果明细"
              />
            </div>
          </div>
        </>
      ) : (
        <div className="pcf-placeholder">
          {status === 'failed'
            ? '核算失败，暂无可用结果'
            : readOnly
              ? '核算已完成，结果只读（当前无结果版本）'
              : '暂无核算结果，请先完成碳足迹核算'}
        </div>
      )}

      {/* 模型预览 · 流程画布（输入 / 输出 + 追溯链路） */}
      <PcfFlowCanvas open={canvasOpen} project={project} onClose={() => setCanvasOpen(false)} />
    </div>
  )
}
