import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, Icon, Tag } from '@/shared/components'
import type { TagTone } from '@/shared/components'
import {
  boundaryLabelOf,
  fetchMyProducts,
  fetchPcfCalcResult,
  fetchPcfCurrentUserOrg,
  fetchPcfProjects,
} from '@/mock'
import { fetchReports } from '@/mock/report'
import type { PcfCalcResult, PcfProject } from '@/types'
import type { PcfFootprintReport, ReportStatus } from '@/types/report'
import { PCF_STATUS_TEXT, PCF_STATUS_TONE } from '@/pages/pcf/pcfMeta'
import { REPORT_STATUS_TEXT } from '@/pages/report/reportMeta'
import './DashboardPage.css'

/** 报告状态 → 工作台 Tag 配色（复用自定义 Tag 的 tone 枚举） */
const REPORT_TONE: Record<ReportStatus, TagTone> = {
  reportGenerating: 'info',
  reportEditing: 'warning',
  reportReady: 'success',
  reportStale: 'warning',
}

/** 待计算状态（尚未产出核算结果；V0.8 起「已核算」为流程末态） */
/** 未完成态（在役状态机：新建 / 待处理 / 待检测 / 待核算，含历史兼容态） */
const PENDING_STATUSES = ['new', 'ongoing', 'toCheck', 'toCalc', 'calculating', 'calcFailed', 'checking']

/** 碳足迹概览卡片展示最近核算记录的条数 */
const FP_CARD_COUNT = 3

/** 数值展示：最多 4 位小数并去尾零（小量级不丢有效数字） */
function formatEmission(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '-'
  return String(Number(value.toFixed(4)))
}

/** 一条「项目 + 最新核算结果」记录 */
interface CalcRecord {
  project: PcfProject
  result: PcfCalcResult
}

/**
 * 工作台（2026-10-12 重设计，脱离竞品形态）：
 * - 欢迎行（不再提供「新增核算」入口，核算创建统一走「产品碳足迹核算」列表）；
 * - **碳排放总览**：仅展示最近一个已完成核算的产品碳足迹（产品名称 / 碳足迹 / 核算时间 / 各阶段构成）；
 * - 核算进度：待计算 / 已计算统计 + 最新待核算项目待办；
 * - 组织统计 + 碳足迹概览卡片 + 碳报告空态。
 */
export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<PcfProject[]>([])
  const [results, setResults] = useState<CalcRecord[]>([])
  const [productCount, setProductCount] = useState(0)
  const [orgName, setOrgName] = useState('')
  const [reports, setReports] = useState<PcfFootprintReport[]>([])
  const todayText = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日`
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [projectList, myProducts, org, reportList] = await Promise.all([
        fetchPcfProjects(),
        fetchMyProducts(),
        fetchPcfCurrentUserOrg(),
        fetchReports(),
      ])
      setProjects(projectList)
      setProductCount(myProducts.length)
      setOrgName(org.name)
      setReports(reportList)
      // 逐条拉取最近一次核算结果：总览取「最近已完成」+ 概览卡片共用
      const pairs = await Promise.all(
        projectList.map(async (project) => {
          const result = await fetchPcfCalcResult(project.id)
          return result ? { project, result } : null
        }),
      )
      setResults(pairs.filter((item): item is CalcRecord => item !== null))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const resultOf = useMemo(() => new Map(results.map((item) => [item.project.id, item.result])), [results])

  /** 碳排放总览：最近一个「已完成核算」（`done`）项目的结果，按核算时间倒序取第一条 */
  const latestCalc = useMemo(() => {
    const done = results.filter(
      (item) => item.project.status === 'done' || item.project.status === 'calculated',
    )
    if (done.length === 0) return null
    return done
      .slice()
      .sort((a, b) => (b.result.calculatedAt ?? '').localeCompare(a.result.calculatedAt ?? ''))[0]
  }, [results])

  const pendingCount = projects.filter((item) => PENDING_STATUSES.includes(item.status)).length
  const calculatedCount = projects.filter(
    (item) => item.status === 'done' || item.status === 'calculated',
  ).length
  const reportCount = reports.length
  /** 待办：最近更新的待核算项目 */
  const pendingProject = projects.find((item) => PENDING_STATUSES.includes(item.status)) ?? null

  return (
    <>
      {/* 欢迎行 */}
      <div className="dash-intro">
        <div>
          <div className="dash-intro-title">
            <span data-ann-target="dashboard.intro.title">欢迎回来，{orgName || '—'}</span>
          </div>
          <div className="dash-intro-sub">
            <span data-ann-target="dashboard.intro.sub">产品碳足迹核算工作台 · {todayText}</span>
          </div>
        </div>
      </div>

      {/* 碳排放总览：最近一个已完成核算的产品碳足迹 */}
      <section className="dash-hero">
        <div className="dash-hero-head">
          <span className="dash-hero-title" data-ann-target="dashboard.hero">
            碳排放总览
          </span>
          <span className="dash-hero-hint">最近一个已完成核算的产品碳足迹</span>
        </div>
        {latestCalc ? (
          <div className="dash-hero-grid">
            <div className="dash-hero-total">
              <div
                className="dash-hero-product"
                data-ann-target="dashboard.hero.product"
                title={latestCalc.project.productName || latestCalc.project.name}
              >
                {latestCalc.project.productName || latestCalc.project.name}
              </div>
              <div className="dash-hero-value" data-ann-target="dashboard.hero.value">
                {formatEmission(latestCalc.result.unitEmission)}
                <span className="dash-hero-unit">kgCO₂e</span>
              </div>
              <div className="dash-hero-time" data-ann-target="dashboard.hero.time">
                核算时间 {latestCalc.result.calculatedAt || '—'}
              </div>
            </div>
            <div className="dash-hero-panel">
              <div className="dash-hero-panel-title" data-ann-target="dashboard.hero.stages">
                各阶段构成
              </div>
              <div className="dash-hero-stages">
                {latestCalc.result.stageSummary.map((item) => (
                  <div className="dash-bar" key={item.stage}>
                    <span className="dash-bar-label" title={item.stage}>
                      {item.stage}
                    </span>
                    <span className="dash-bar-track">
                      <span
                        className="dash-bar-fill"
                        style={{ width: `${item.emission > 0 ? Math.max(item.ratio, 2) : 0}%` }}
                      />
                    </span>
                    <span className="dash-bar-value">
                      {formatEmission(item.emission)}
                      <em>{item.ratio.toFixed(1)}%</em>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="dash-hero-blank" data-ann-target="dashboard.hero.blank">
            {loading ? '加载中…' : '暂无已完成核算的产品，完成首次核算后展示碳足迹与阶段构成'}
          </div>
        )}
      </section>

      {/* 核算进度 + 组织统计 */}
      <div className="dash-row">
        <Card title={<span data-ann-target="dashboard.progress">核算进度</span>}>
          <div className="dash-progress" data-ann-target="dashboard.progress">
            <div className="dash-progress-item is-pending">
              <div className="dash-progress-value">{loading ? '-' : pendingCount}</div>
              <div className="dash-progress-label">待计算产品</div>
            </div>
            <div className="dash-progress-item is-done">
              <div className="dash-progress-value">{loading ? '-' : calculatedCount}</div>
              <div className="dash-progress-label">已计算产品</div>
            </div>
          </div>

          {pendingProject ? (
            <Link className="dash-todo" to={`/pcf/project/${pendingProject.id}`} data-ann-target="dashboard.todo">
              <div className="dash-todo-main">
                <span className="dash-todo-icon">
                  <Icon name="leaf" size={18} />
                </span>
                <div className="dash-todo-text">
                  <div className="dash-todo-title">
                    <span className="dash-todo-name">{pendingProject.name}</span>
                    <span data-ann-target="dashboard.todo.status">
                      <Tag tone={PCF_STATUS_TONE[pendingProject.status]}>{PCF_STATUS_TEXT[pendingProject.status]}</Tag>
                    </span>
                  </div>
                  <div className="dash-todo-meta">
                    {[
                      pendingProject.productIndustry || '未填行业',
                      boundaryLabelOf(pendingProject.boundary),
                      pendingProject.updatedAt,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </div>
              </div>
              <span className="dash-todo-go" data-ann-target="dashboard.todo.go">
                去完成
              </span>
            </Link>
          ) : (
            <div className="dash-todo-empty" data-ann-target="dashboard.todo.empty">
              <span>{loading ? '加载中…' : '暂无待核算项目'}</span>
            </div>
          )}
        </Card>

        <Card title={<span data-ann-target="dashboard.org">{orgName || '我的组织'}</span>}>
          <div className="dash-org-stats">
            <div className="dash-org-stat">
              <div className="dash-org-value">{loading ? '-' : calculatedCount}</div>
              <div className="dash-org-label">已计算数量</div>
            </div>
            <div className="dash-org-stat">
              <div className="dash-org-value">{loading ? '-' : productCount}</div>
              <div className="dash-org-label">产品数量</div>
            </div>
            <div className="dash-org-stat">
              <div className="dash-org-value">{loading ? '-' : reportCount}</div>
              <div className="dash-org-label">报告数量</div>
            </div>
          </div>
        </Card>
      </div>

      {/* 碳足迹概览 + 碳报告 */}
      <div className="dash-row">
        <Card title={<span data-ann-target="dashboard.fp">碳足迹概览</span>}>
          {projects.length === 0 ? (
            <div className="dash-fp-empty" data-ann-target="dashboard.fp.empty">
              暂无核算记录，去「产品碳足迹核算」新增
            </div>
          ) : (
            <div className="dash-fp-grid">
              {projects.slice(0, FP_CARD_COUNT).map((project) => {
                const result = resultOf.get(project.id)
                return (
                  <Link
                    key={project.id}
                    className="dash-fp-card"
                    to={`/pcf/project/${project.id}`}
                    data-ann-target="dashboard.fp.card"
                  >
                    <div className="dash-fp-head">
                      <span className="dash-fp-name" data-ann-target="dashboard.fp.name">
                        {project.productName || project.name}
                      </span>
                      <Icon name="chevronRight" size={14} />
                    </div>
                    <div className="dash-fp-rows">
                      <div className="dash-fp-row">
                        <span>核算主体</span>
                        <span title={project.ownerOrg}>{project.ownerOrg || '-'}</span>
                      </div>
                      <div className="dash-fp-row">
                        <span>所属行业</span>
                        <span>{project.productIndustry || '-'}</span>
                      </div>
                      <div className="dash-fp-row">
                        <span>创建人</span>
                        <span>{project.createdBy || '-'}</span>
                      </div>
                    </div>
                    <div className="dash-fp-value" data-ann-target="dashboard.fp.value">
                      <Icon name="leaf" size={16} />
                      <span className="dash-fp-num">{formatEmission(result?.unitEmission)}</span>
                      <span className="dash-fp-unit">kg CO2-Eq</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </Card>

        <Card
          title={<span data-ann-target="dashboard.report">碳报告</span>}
          extra={
            <Link to="/report/prepare" className="dash-report-more" data-ann-target="dashboard.report.more">
              查看全部
            </Link>
          }
        >
          {reports.length === 0 ? (
            <div className="dash-report-empty">
              <span className="dash-report-icon">
                <Icon name="file" size={30} />
              </span>
              <span>{loading ? '加载中…' : '暂无数据'}</span>
            </div>
          ) : (
            <ul className="dash-report-list" data-ann-target="dashboard.report.list">
              {reports.slice(0, 4).map((report) => (
                <li key={report.id} className="dash-report-item-wrap">
                  <Link
                    className="dash-report-item"
                    to={`/report/prepare/${report.id}`}
                    data-ann-target="dashboard.report.item"
                  >
                    <span className="dash-report-main">
                      <span className="dash-report-name" title={report.productName}>
                        {report.productName}
                      </span>
                      <span className="dash-report-sub">{report.sourceProjectName || '-'}</span>
                    </span>
                    <span className="dash-report-meta">
                      <Tag tone={REPORT_TONE[report.status]}>{REPORT_STATUS_TEXT[report.status]}</Tag>
                      <span className="dash-report-date">{report.generatedAt || '—'}</span>
                      <Icon name="chevronRight" size={14} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}
