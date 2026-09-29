import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Table, Tag, useToast } from '@/shared/components'
import type { Column, TagTone } from '@/shared/components'
import { exportPcfResult, fetchPcfCalcResult, resumePcfCalc, startPcfCalc } from '@/mock'
import type {
  PcfCalcResult,
  PcfCalcStatus,
  PcfOperationSummary,
  PcfProject,
  PcfProjectStatus,
  PcfResultDetail,
  PcfSourceSummary,
  PcfStageSummary,
} from '@/types'
import { FLOW_TYPE_TEXT, PCF_EDITABLE_STATUSES } from './pcfMeta'
import './PcfPage.css'

interface ProjectStepFourProps {
  project: PcfProject
  onSaved: (project: PcfProject) => void
}

/** 排放源分类文案（界面口径，见字段清单 §5） */
const SOURCE_TEXT: Record<string, string> = {
  material: '材料',
  energy: '能源',
  transport: '运输',
  waste: '废弃物',
  eol: '末期处理',
  biocarbon: '生物碳',
}

/** 排放源分类 Tag 配色 */
const SOURCE_TONE: Record<string, TagTone> = {
  material: 'info',
  energy: 'warning',
  transport: 'default',
  waste: 'default',
  eol: 'default',
  biocarbon: 'success',
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
 * 报告生成中及之后（只读回看）不落在四态的「待核算」上：有结果即视为「已核算」，无结果按「待核算」呈现。
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
 * - 下区：结果总览（单位产品碳足迹 + 总排放 + 导出）、阶段汇总、工序汇总（可下钻）、
 *   排放源汇总、结果明细。
 */
export default function ProjectStepFour({ project, onSaved }: ProjectStepFourProps) {
  const toast = useToast()

  const [result, setResult] = useState<PcfCalcResult | null>(null)
  const [loading, setLoading] = useState(false)
  // 「核算中」项目进入本步骤时即处于执行中（等待异步结果）
  const [running, setRunning] = useState(() => project.status === 'calculating')
  const [activeOpId, setActiveOpId] = useState('')
  const detailRef = useRef<HTMLDivElement>(null)
  const resumedRef = useRef('')

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
        onSaved({ ...project, status: 'calculated', currentStep: 4 })
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

  // 只读态：报告生成中及之后不再提供核算执行入口（业务 PRD §5.3）
  const readOnly = !PCF_EDITABLE_STATUSES.includes(project.status)
  /**
   * 可执行核算的项目状态：
   * - `toCalc` 待核算 / `calcFailed` 核算失败：首次核算或失败重试；
   * - `calculated` 已核算：活动数据、排放因子或公式口径变更后**在既有结果上重新计算**，
   *   按版本号递增生成新结果版本，历史版本保留不可篡改（E13 之外的主动重算入口）。
   */
  const canCalc =
    !readOnly &&
    (project.status === 'toCalc' ||
      project.status === 'calcFailed' ||
      project.status === 'calculated')

  const handleCalc = async () => {
    if (running) return
    // 已核算状态下执行 = 重新计算（产出新版本，历史版本保留）
    const recalc = project.status === 'calculated'
    setRunning(true)
    try {
      const res = await startPcfCalc(project.id)
      setResult(res)
      onSaved({ ...project, status: 'calculated', currentStep: 4 })
      toast(recalc ? `重新计算完成，已生成结果版本 V${res.version}` : '核算完成')
    } catch (error) {
      toast(error instanceof Error ? error.message : '核算失败，请重试', 'error')
      void load()
    } finally {
      setRunning(false)
    }
  }

  const handleExport = async () => {
    try {
      const { filename, content } = await exportPcfResult(project.id)
      const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast('已导出核算结果明细')
    } catch (error) {
      toast(error instanceof Error ? error.message : '导出失败', 'error')
    }
  }

  const detailRows = useMemo(() => {
    if (!result) return []
    if (!activeOpId) return result.details
    return result.details.filter((d) => d.operationId === activeOpId)
  }, [result, activeOpId])

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
    { key: 'processName', title: '工艺流程' },
    { key: 'opName', title: '工序' },
    { key: 'stage', title: '所属阶段' },
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

  const sourceColumns: Column<PcfSourceSummary>[] = [
    {
      key: 'source',
      title: '排放源',
      render: (row) => (
        <Tag tone={SOURCE_TONE[row.source] ?? 'default'}>{SOURCE_TEXT[row.source] ?? row.source}</Tag>
      ),
    },
    {
      key: 'emission',
      title: '排放量（kgCO₂e）',
      align: 'right',
      render: (row) => formatEmission(row.emission),
    },
    { key: 'ratio', title: '占比', render: (row) => <RatioBar ratio={row.ratio} /> },
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
    { key: 'factorName', title: '排放因子', width: 160, render: (row) => row.factorName || '-' },
    { key: 'formulaName', title: '绑定公式', width: 140 },
    {
      key: 'emission',
      title: '排放量（kgCO₂e）',
      align: 'right',
      render: (row) => formatEmission(row.emission),
    },
  ]

  return (
    <div className="pcf-step-form">
      {/* 核算说明 */}
      <div className="pcf-form-tip">
        系统将按工序绑定的公式，对已填报的活动数据与匹配的排放因子进行计算，汇总生成总碳足迹、
        阶段 / 工序 / 排放源结果；核算完成后结果直接展示在本页并可导出。核算结果随项目版本化留存：
        已核算项目在活动数据、排放因子或公式口径变更后，可点击「重新计算」按当前数据重算，
        系统按版本号递增生成新结果版本，历史版本保留不可篡改。
      </div>

      {/* 核算状态卡（四态） */}
      <div className={`pcf-calc-card pcf-calc-${status}`}>
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
                (readOnly ? '项目已进入报告阶段，核算结果仅供查看' : '检测已通过，可开始核算')}
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
              <Button onClick={handleCalc} title="按当前活动数据与排放因子重新计算，生成新的结果版本">
                重新计算
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 核算结果区（核算完成后展示；只读态回看同样展示最近结果版本） */}
      {loading ? (
        <div className="pcf-placeholder">加载中…</div>
      ) : result ? (
        <>
          <div className="pcf-result-card">
            <div className="pcf-result-main">
              <div className="pcf-result-label">单位产品碳足迹</div>
              <div className="pcf-result-value">
                {formatEmission(result.unitEmission)} <span>kgCO₂e / {result.unit}</span>
              </div>
              <div className="pcf-result-meta">
                <span>总排放量 {formatEmission(result.totalEmission)} kgCO₂e</span>
                <span>核算时间 {result.calculatedAt}</span>
                <span>结果版本 V{result.version}</span>
                {status !== 'done' && <Tag tone="warning">历史版本</Tag>}
              </div>
            </div>
            <div className="pcf-result-actions">
              <Button onClick={handleExport}>导出结果</Button>
            </div>
          </div>

          {/* 阶段汇总 */}
          <div className="pcf-panel">
            <div className="pcf-panel-head">
              <span className="pcf-panel-title">阶段汇总</span>
            </div>
            <div className="pcf-table-wrap">
              <Table
                columns={stageColumns}
                data={result.stageSummary}
                rowKey={(row) => row.stage}
                emptyText="暂无阶段结果"
              />
            </div>
          </div>

          {/* 工序汇总 */}
          <div className="pcf-panel">
            <div className="pcf-panel-head">
              <span className="pcf-panel-title">工序汇总</span>
              <span className="pcf-panel-tip">点击「查看明细」可下钻到该工序的数据项</span>
            </div>
            <div className="pcf-table-wrap">
              <Table
                columns={opColumns}
                data={result.operationSummary}
                rowKey={(row) => row.operationId}
                emptyText="暂无工序结果"
              />
            </div>
          </div>

          {/* 排放源汇总 */}
          <div className="pcf-panel">
            <div className="pcf-panel-head">
              <span className="pcf-panel-title">排放源汇总</span>
            </div>
            <div className="pcf-table-wrap">
              <Table
                columns={sourceColumns}
                data={result.sourceSummary}
                rowKey={(row) => row.source}
                emptyText="暂无排放源结果"
              />
            </div>
          </div>

          {/* 结果明细（下钻） */}
          <div className="pcf-panel" ref={detailRef}>
            <div className="pcf-panel-head">
              <span className="pcf-panel-title">
                结果明细
                {activeOpId && (
                  <Tag tone="info">
                    {result.operationSummary.find((o) => o.operationId === activeOpId)?.opName ?? ''}
                  </Tag>
                )}
              </span>
              <span className="pcf-panel-tip">活动量 × 因子（× 常量）= 排放量；因子已按选择时快照固化</span>
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
              ? '项目已进入报告阶段，核算结果仅供查看（当前无结果版本）'
              : '暂无核算结果，请先完成碳足迹核算'}
        </div>
      )}
    </div>
  )
}
