import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  FormField,
  Input,
  Modal,
  PageHeader,
  Pagination,
  Select,
  Table,
  Tag,
  useToast,
} from '@/shared/components'
import type { Column } from '@/shared/components'
import type { CarbonRecord } from '@/types/dataset'
import type { DataReport, ReportStatus } from '@/types/dataReport'
import {
  canWithdrawReport,
  deleteReportDraft,
  fetchReportByRecord,
  fetchReports,
  submitReport,
  withdrawReport,
} from '@/mock/dataReport'
import { fetchRecords } from '@/mock/dataset'
import DrawerShell from './DrawerShell'
import ReportSubmitModal from './ReportSubmitModal'
import {
  REPORT_FLOW,
  REPORT_STATUS_TEXT,
  REPORT_STATUS_TONE,
  flowIndex,
  numFmt,
  regionGroupText,
  reportPeriodText,
  reportStatusText,
  staleTextOf,
} from './dataReportMeta'
import { BOUNDARY_TEXT, emissionUnitLabel, numText, periodText } from './datasetMeta'
import './DatasetPage.css'
import './DataReport.css'

/**
 * 企业数据上报（前台 · 数据管理）。
 *
 * 定位：企业把「已核算完成的碳数据」一键上报平台的唯一入口。
 * 只上报「结果」：核算记录里的活动数据（耗电量 / 物料用量 / 运输明细）不进上报单，
 * 系统提取各阶段排放量 + 总碳排放量 + 行业 / 工艺等标签（工艺缺失时由企业在上报环节补充），企业补充区域与数据质量说明。
 * 状态：草稿 → 审核中 → 已驳回 / 已入库；平台开始审核前企业可撤回，撤回后回到草稿；
 * 核算记录重算后提示重新上报。企业端状态统一为「草稿 / 审核中 / 已驳回 / 已入库」，不设「待公示」。
 * 列表查询支持产品名称 / 产品类别 / 系统边界 / 行业模糊匹配。
 */

const PAGE_SIZE = 20
/** 一键上报弹窗每页条数 */
const PICKER_PAGE_SIZE = 8

/** 列表查询：状态 + 产品名称 / 产品类别 / 系统边界 / 行业（均为模糊匹配） */
interface ReportQuery {
  status: string
  productName: string
  category: string
  boundary: string
  industry: string
}

const EMPTY_QUERY: ReportQuery = {
  status: 'all',
  productName: '',
  category: '',
  boundary: '',
  industry: '',
}

const TEXT_QUERY_FIELDS: {
  key: 'productName' | 'category' | 'boundary' | 'industry'
  label: string
  placeholder: string
}[] = [
  { key: 'productName', label: '产品名称', placeholder: '输入名称模糊搜索' },
  { key: 'category', label: '产品类别', placeholder: '输入类别模糊搜索' },
  { key: 'boundary', label: '系统边界', placeholder: '如：摇篮到大门' },
  { key: 'industry', label: '行业', placeholder: '输入行业模糊搜索' },
]

const PICKER_STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'none', label: '未上报' },
  { value: 'draft', label: '草稿' },
  { value: 'reviewing', label: '审核中' },
  { value: 'rejected', label: '已驳回' },
  { value: 'archived', label: '已入库' },
]

const STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  ...(Object.keys(REPORT_STATUS_TEXT) as ReportStatus[]).map((status) => ({
    value: status,
    label: REPORT_STATUS_TEXT[status],
  })),
]

export default function DataReportListPage() {
  const toast = useToast()

  const [reports, setReports] = useState<DataReport[]>([])
  const [records, setRecords] = useState<CarbonRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [draftQuery, setDraftQuery] = useState<ReportQuery>({ ...EMPTY_QUERY })
  const [appliedQuery, setAppliedQuery] = useState<ReportQuery>({ ...EMPTY_QUERY })
  const [page, setPage] = useState(1)

  // 选择核算记录（一键上报入口）
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerReports, setPickerReports] = useState<DataReport[]>([])
  const [pickerQuery, setPickerQuery] = useState({ keyword: '', category: '', industry: '', status: 'all' })
  const [pickerApplied, setPickerApplied] = useState({ keyword: '', category: '', industry: '', status: 'all' })
  const [pickerPage, setPickerPage] = useState(1)

  // 上报表单 / 详情
  const [submitTarget, setSubmitTarget] = useState<{ record: CarbonRecord; initial: DataReport | null } | null>(null)
  const [detail, setDetail] = useState<DataReport | null>(null)
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DataReport | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [withdrawTarget, setWithdrawTarget] = useState<DataReport | null>(null)
  const [withdrawing, setWithdrawing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [reportList, recordList] = await Promise.all([fetchReports(), fetchRecords()])
      setReports(reportList)
      setRecords(recordList)
    } catch (error) {
      toast(error instanceof Error ? error.message : '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [appliedQuery])

  const stats = useMemo(() => {
    const count = (status: ReportStatus) => reports.filter((r) => r.status === status).length
    return {
      draft: count('draft'),
      pending: count('reviewing'),
      rejected: count('rejected'),
      archived: count('archived'),
      stale: reports.filter((r) => r.status === 'archived' && r.stale).length,
    }
  }, [reports])

  const filtered = useMemo(() => {
    const includes = (text: string, keyword: string) =>
      !keyword.trim() || text.toLowerCase().includes(keyword.trim().toLowerCase())
    return reports.filter((report) => {
      if (appliedQuery.status !== 'all' && report.status !== appliedQuery.status) return false
      return (
        includes(`${report.productName} ${report.productCode ?? ''}`, appliedQuery.productName) &&
        includes(`${report.categoryName} ${report.categoryPath}`, appliedQuery.category) &&
        includes(BOUNDARY_TEXT[report.boundary], appliedQuery.boundary) &&
        includes(`${report.industryName} ${report.industryPath} ${report.industryCode}`, appliedQuery.industry)
      )
    })
  }, [reports, appliedQuery])

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [filtered],
  )
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  /* ---------- 一键上报 ---------- */

  const openPicker = async () => {
    const empty = { keyword: '', category: '', industry: '', status: 'all' }
    setPickerQuery(empty)
    setPickerApplied(empty)
    setPickerPage(1)
    setPickerReports(await fetchReports())
    setPickerOpen(true)
  }

  const handlePick = async (record: CarbonRecord) => {
    try {
      const existing = await fetchReportByRecord(record.id)
      if (existing && existing.status === 'reviewing') {
        toast('该核算记录已提交平台，正在审核中，无需重复上报', 'error')
        return
      }
      setPickerOpen(false)
      setSubmitTarget({ record, initial: existing })
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  const handleContinue = (report: DataReport) => {
    const record = records.find((r) => r.id === report.sourceRecordId)
    if (!record) {
      toast('来源核算记录不存在或已作废，无法重新上报', 'error')
      return
    }
    setDetail(null)
    setSubmitTarget({ record, initial: report })
  }

  const handleQuickSubmit = async (report: DataReport) => {
    setSubmittingId(report.id)
    try {
      await submitReport(report.id)
      toast('已提交，进入平台审核中')
      setDetail(null)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '提交失败', 'error')
    } finally {
      setSubmittingId(null)
    }
  }

  const handleDeleteDraft = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteReportDraft(deleteTarget.id)
      toast('草稿已删除')
      setDeleteTarget(null)
      setDetail(null)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    } finally {
      setDeleting(false)
    }
  }

  /** 平台尚未开始审核时撤回：上报单回到草稿，可继续修改或重新提交 */
  const handleWithdraw = async () => {
    if (!withdrawTarget) return
    setWithdrawing(true)
    try {
      await withdrawReport(withdrawTarget.id)
      toast('已撤回，上报单已转为草稿')
      setWithdrawTarget(null)
      setDetail(null)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '撤回失败', 'error')
    } finally {
      setWithdrawing(false)
    }
  }

  /* ---------- 列定义 ---------- */

  const columns: Column<DataReport>[] = [
    {
      key: 'productName',
      title: '产品名称',
      width: 240,
      render: (row) => (
        <span className="ds-product-cell">
          <button className="link" onClick={() => setDetail(row)}>
            {row.productName}
          </button>
          {row.stale && <span className="dr-stale-tag">数据已更新，请重新上报</span>}
        </span>
      ),
    },
    { key: 'category', title: '产品类别', width: 120, render: (row) => row.categoryName || '-' },
    {
      key: 'boundary',
      title: '系统边界',
      width: 110,
      render: (row) => (
        <Tag tone={row.boundary === 'gate' ? 'info' : 'primary'}>{BOUNDARY_TEXT[row.boundary]}</Tag>
      ),
    },
    {
      key: 'industry',
      title: '行业',
      width: 130,
      render: (row) => <span className="nowrap" title={row.industryPath}>{row.industryName}</span>,
    },
    {
      key: 'period',
      title: '统计时间',
      width: 180,
      render: (row) => <span className="nowrap dr-muted">{reportPeriodText(row)}</span>,
    },
    {
      key: 'totalEmission',
      title: '碳排放量',
      width: 170,
      align: 'right',
      render: (row) => (
        <span className="mono dr-emission">
          {numFmt(row.totalEmission)}
          <span className="dr-muted"> {emissionUnitLabel(row.emissionUnit, row.unitCode)}</span>
        </span>
      ),
    },
    {
      key: 'status',
      title: '上报状态',
      width: 100,
      render: (row) => <Tag tone={REPORT_STATUS_TONE[row.status]}>{reportStatusText(row)}</Tag>,
    },
    {
      key: 'actions',
      title: '操作',
      width: 220,
      render: (row) => (
        <span className="row-actions" data-ann-target="dataset.report.actions">
          <button className="link" onClick={() => setDetail(row)}>
            查看
          </button>
          {row.status === 'draft' && (
            <>
              <button className="link" onClick={() => handleContinue(row)}>
                继续填报
              </button>
              <button className="link" onClick={() => void handleQuickSubmit(row)} disabled={submittingId === row.id}>
                提交
              </button>
              <button className="link link-danger" onClick={() => setDeleteTarget(row)}>
                删除
              </button>
            </>
          )}
          {canWithdrawReport(row) && (
            <button className="link" onClick={() => setWithdrawTarget(row)}>
              撤回
            </button>
          )}
          {row.status === 'rejected' && (
            <button className="link" onClick={() => handleContinue(row)}>
              修改后重报
            </button>
          )}
          {row.status === 'archived' && row.stale && (
            <button className="link" onClick={() => handleContinue(row)}>
              重新上报
            </button>
          )}
        </span>
      ),
    },
  ]

  /* ---------- 选择核算记录 ---------- */

  const pickerCategoryOptions = useMemo(() => {
    const names = new Set(records.filter((r) => r.status === 'active').map((r) => r.categoryName))
    return [{ value: '', label: '全部类别' }, ...[...names].map((name) => ({ value: name, label: name }))]
  }, [records])

  const pickerIndustryOptions = useMemo(() => {
    const map = new Map<string, string>()
    records.filter((r) => r.status === 'active').forEach((r) => map.set(r.industryCode, r.industryName))
    return [
      { value: '', label: '全部行业' },
      ...[...map.entries()].map(([code, name]) => ({ value: code, label: `${code} ${name}` })),
    ]
  }, [records])

  useEffect(() => {
    setPickerPage(1)
  }, [pickerApplied])

  const pickerRecords = useMemo(() => {
    const kw = pickerApplied.keyword.trim().toLowerCase()
    const reportByRecord = new Map(pickerReports.map((r) => [r.sourceRecordId, r]))
    return records
      .filter((r) => r.status === 'active')
      .filter((r) =>
        !kw
          ? true
          : `${r.productName} ${r.recordNo} ${r.productCode ?? ''}`.toLowerCase().includes(kw),
      )
      .filter((r) => !pickerApplied.category || r.categoryName === pickerApplied.category)
      .filter((r) => !pickerApplied.industry || r.industryCode === pickerApplied.industry)
      .map((record) => ({ record, report: reportByRecord.get(record.id) }))
      .filter((row) => pickerApplied.status === 'all' || (row.report?.status ?? 'none') === pickerApplied.status)
  }, [records, pickerReports, pickerApplied])

  const pickerPaged = pickerRecords.slice((pickerPage - 1) * PICKER_PAGE_SIZE, pickerPage * PICKER_PAGE_SIZE)

  const pickerColumns: Column<{ record: CarbonRecord; report?: DataReport }>[] = [
    {
      key: 'product',
      title: '产品名称',
      width: 165,
      render: (row) => (
        <span className="ds-product-cell">
          <span>{row.record.productName}</span>
          <span className="ds-product-code">
            {row.record.recordNo} · 第 {row.record.resultVersion ?? 1} 次
          </span>
        </span>
      ),
    },
    { key: 'category', title: '产品类别', width: 90, render: (row) => row.record.categoryName || '—' },
    {
      key: 'boundary',
      title: '系统边界',
      width: 100,
      render: (row) => <Tag tone={row.record.boundary === 'gate' ? 'info' : 'primary'}>{BOUNDARY_TEXT[row.record.boundary]}</Tag>,
    },
    {
      key: 'industry',
      title: '行业',
      width: 110,
      render: (row) => <span className="nowrap" title={row.record.industryPath}>{row.record.industryName}</span>,
    },
    {
      key: 'period',
      title: '统计时间',
      width: 130,
      render: (row) => (
        <span className="dr-period-cell">
          {row.record.periodStart}
          <br />~ {row.record.periodEnd}
        </span>
      ),
    },
    {
      key: 'total',
      title: '碳排放量',
      width: 150,
      align: 'right',
      render: (row) => (
        <span className="mono dr-emission">
          {numText(row.record.totalEmission)}
          <span className="dr-muted"> {emissionUnitLabel(row.record.emissionUnit, row.record.unitCode)}</span>
        </span>
      ),
    },
    {
      key: 'reportState',
      title: '上报状态',
      width: 110,
      render: (row) => {
        if (!row.report) return <span className="dr-muted">未上报</span>
        return (
          <span className="flex gap-sm">
            <Tag tone={REPORT_STATUS_TONE[row.report.status]}>{REPORT_STATUS_TEXT[row.report.status]}</Tag>
            {row.report.stale && <span className="dr-stale-tag">数据已更新</span>}
          </span>
        )
      },
    },
    {
      key: 'action',
      title: '操作',
      width: 90,
      render: (row) => {
        const disabled = row.report?.status === 'reviewing'
        return (
          <button className="link" disabled={disabled} onClick={() => void handlePick(row.record)}>
            {disabled ? '审核中' : row.report ? '重新上报' : '一键上报'}
          </button>
        )
      },
    },
  ]

  return (
    <>
      <PageHeader
        breadcrumb={['前台业务平台', '数据管理', '企业数据上报']}
        title="企业数据上报"
        actions={
          <Button
            variant="primary"
            data-ann-target="dataset.report.header"
            onClick={() => void openPicker()}
          >
            一键上报
          </Button>
        }
      />

      <div className="dr-stats" data-ann-target="dataset.report.stats">
        <StatCard label="草稿" value={stats.draft} />
        <StatCard label="审核中" value={stats.pending} />
        <StatCard label="已驳回" value={stats.rejected} />
        <StatCard label="已入库" value={stats.archived} />
      </div>

      <div className="card">
        <div className="query-bar" data-ann-target="dataset.report.query">
          <div className="query-item dr-query-item">
            <span className="query-label">状态</span>
            <Select
              value={draftQuery.status}
              options={STATUS_OPTIONS}
              onChange={(e) => setDraftQuery((prev) => ({ ...prev, status: e.target.value }))}
            />
          </div>
          {TEXT_QUERY_FIELDS.map((field) => (
            <div className="query-item dr-query-item" key={field.key}>
              <span className="query-label">{field.label}</span>
              <Input
                value={draftQuery[field.key]}
                placeholder={field.placeholder}
                onChange={(e) => setDraftQuery((prev) => ({ ...prev, [field.key]: e.target.value }))}
              />
            </div>
          ))}
          <div className="query-actions">
            <Button
              onClick={() => {
                setDraftQuery({ ...EMPTY_QUERY })
                setAppliedQuery({ ...EMPTY_QUERY })
              }}
            >
              重置
            </Button>
            <Button variant="primary" onClick={() => setAppliedQuery({ ...draftQuery })}>
              查询
            </Button>
          </div>
        </div>

        <div className="toolbar" data-ann-target="dataset.report.table">
          <div className="flex gap-sm">
            <span className="toolbar-title">上报记录</span>
            <span className="toolbar-tip">共 {sorted.length} 条</span>
          </div>
        </div>

        <Table
          columns={columns}
          data={paged}
          rowKey={(row) => row.id}
          loading={loading}
          emptyText="暂无上报记录：点击右上角「一键上报」，从已完成核算的碳数据中选择记录发起上报"
        />
        <Pagination total={sorted.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      {/* 一键上报 · 选择核算记录 */}
      <Modal
        open={pickerOpen}
        size="xl"
        title="选择核算记录"
        onClose={() => setPickerOpen(false)}
        footer={<Button onClick={() => setPickerOpen(false)}>关闭</Button>}
      >
        <div className="dr-form">
          <div className="dr-picker-tip" data-ann-target="dataset.report.picker">
            选择一条已完成的核算结果发起上报；同一条记录已有上报单时可直接继续上报。
          </div>

          <div className="dr-picker-filters">
            <FormField label="名称">
              <Input
                value={pickerQuery.keyword}
                placeholder="产品名称 / 记录编号 / 编码"
                onChange={(e) => setPickerQuery((prev) => ({ ...prev, keyword: e.target.value }))}
              />
            </FormField>
            <FormField label="产品类别">
              <Select
                value={pickerQuery.category}
                options={pickerCategoryOptions}
                onChange={(e) => setPickerQuery((prev) => ({ ...prev, category: e.target.value }))}
              />
            </FormField>
            <FormField label="上报状态">
              <Select
                value={pickerQuery.status}
                options={PICKER_STATUS_OPTIONS}
                onChange={(e) => setPickerQuery((prev) => ({ ...prev, status: e.target.value }))}
              />
            </FormField>
            <FormField label="所属行业">
              <Select
                value={pickerQuery.industry}
                options={pickerIndustryOptions}
                onChange={(e) => setPickerQuery((prev) => ({ ...prev, industry: e.target.value }))}
              />
            </FormField>
          </div>

          <div className="dr-picker-toolbar">
            <span className="dr-picker-count">
              共 {pickerRecords.length} 条核算记录
              {pickerRecords.length === 0 && '：请调整筛选条件'}
            </span>
            <div className="flex gap-sm">
              <Button
                onClick={() => {
                  const empty = { keyword: '', category: '', industry: '', status: 'all' }
                  setPickerQuery(empty)
                  setPickerApplied(empty)
                }}
              >
                重置
              </Button>
              <Button variant="primary" onClick={() => setPickerApplied({ ...pickerQuery })}>
                搜索
              </Button>
            </div>
          </div>

          <div className="dr-table-scroll">
            <Table
              columns={pickerColumns}
              data={pickerPaged}
              rowKey={(row) => row.record.id}
              emptyText="没有符合条件的核算记录"
            />
          </div>
          <Pagination
            total={pickerRecords.length}
            page={pickerPage}
            pageSize={PICKER_PAGE_SIZE}
            onChange={setPickerPage}
          />
        </div>
      </Modal>

      {/* 删除草稿 */}
      <Modal
        open={!!deleteTarget}
        size="sm"
        title="删除草稿"
        onClose={() => setDeleteTarget(null)}
        footer={
          <>
            <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
              取消
            </Button>
            <Button variant="danger" onClick={() => void handleDeleteDraft()} disabled={deleting}>
              {deleting ? '删除中…' : '确认删除'}
            </Button>
          </>
        }
      >
        <div className="ds-void-modal">
          <p>
            将删除草稿 <b>{deleteTarget?.reportNo}</b>（{deleteTarget?.productName}）。删除后不可恢复，
            需重新从核算记录发起上报。
          </p>
        </div>
      </Modal>

      {/* 撤回上报（平台尚未开始审核） */}
      <Modal
        open={!!withdrawTarget}
        size="sm"
        title="撤回上报"
        onClose={() => setWithdrawTarget(null)}
        footer={
          <>
            <Button onClick={() => setWithdrawTarget(null)} disabled={withdrawing}>
              取消
            </Button>
            <Button variant="primary" onClick={() => void handleWithdraw()} disabled={withdrawing}>
              {withdrawing ? '撤回中…' : '确认撤回'}
            </Button>
          </>
        }
      >
        <div className="ds-void-modal">
          <p>
            将撤回 <b>{withdrawTarget?.productName}</b> 的本次上报。平台尚未开始审核，撤回后状态变为
            <b>草稿</b>，可继续修改或重新提交。
          </p>
        </div>
      </Modal>

      {/* 上报表单（新建 / 重新上报共用） */}
      <ReportSubmitModal
        open={!!submitTarget}
        record={submitTarget?.record ?? null}
        initial={submitTarget?.initial ?? null}
        onClose={() => setSubmitTarget(null)}
        onSaved={(report, action) => {
          toast(action === 'draft' ? `已暂存草稿（${report.reportNo}）` : `已提交平台审核（${report.reportNo}）`)
          setSubmitTarget(null)
          void load()
        }}
        onError={(message) => toast(message, 'error')}
      />

      {/* 详情 */}
      <ReportDetailDrawer
        report={detail}
        onClose={() => setDetail(null)}
        onContinue={handleContinue}
      />
    </>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="dr-stat">
      <span className="dr-stat-label">{label}</span>
      <span className="dr-stat-value">{value}</span>
    </div>
  )
}

/* ============================ 详情抽屉 ============================ */

interface ReportDetailDrawerProps {
  report: DataReport | null
  onClose: () => void
  onContinue: (report: DataReport) => void
}

function ReportDetailDrawer({ report, onClose, onContinue }: ReportDetailDrawerProps) {
  if (!report) return null
  const fields: [string, string][] = [
    ['上报编号', report.reportNo],
    ['来源核算记录', `${report.sourceRecordNo}（第 ${report.resultVersion} 次核算）`],
    ['产品类别', report.categoryPath || report.categoryName],
    ['所属行业', report.industryPath || report.industryName],
    ['工艺类型', report.processes.join('、') || '—'],
    ['核算标准', [report.standardNo, report.standardName].filter(Boolean).join(' ') || '—'],
    ['系统边界', BOUNDARY_TEXT[report.boundary]],
    ['统计期间', reportPeriodText(report)],
    ['声明单位', `${report.unitValue} ${report.unitCode}`],
    ['区域', report.regionName ? `${report.regionName}（${regionGroupText(report.regionName)}）` : '未填'],
    ['提交时间', report.submittedAt ?? '—'],
    ['审核人', report.reviewer ?? '—'],
    ['审核时间', report.reviewedAt ?? '—'],
  ]

  return (
    <DrawerShell
      open={!!report}
      width={620}
      title={
        <span className="ds-detail-title">
          {report.productName}
          <Tag tone={REPORT_STATUS_TONE[report.status]}>{reportStatusText(report)}</Tag>
        </span>
      }
      subtitle={`${report.reportNo} · ${report.sourceRecordNo}`}
      onClose={onClose}
      footer={
        (report.status === 'draft' || report.status === 'rejected' || report.stale) && (
          <Button variant="primary" onClick={() => onContinue(report)}>
            {report.status === 'draft' ? '继续填报' : report.status === 'rejected' ? '修改后重报' : '重新上报'}
          </Button>
        )
      }
    >
      <div className="ds-detail" data-ann-target="dataset.report.detail">
        {report.stale && (
          <div className="dr-stale-bar">
            {staleTextOf(report)}（当前上报结果为第 {report.resultVersion} 次核算）
          </div>
        )}
        {report.status === 'rejected' && (
          <div className="dr-flag dr-flag-error">
            <span className="dr-flag-code">驳回原因</span>
            <span>{report.rejectReason}</span>
          </div>
        )}

        <div className="ds-detail-total">
          <span className="ds-detail-total-label">总碳足迹</span>
          <span className="ds-detail-total-value">{numFmt(report.totalEmission)}</span>
          <span className="ds-detail-total-unit">{emissionUnitLabel(report.emissionUnit, report.unitCode)}</span>
        </div>

        <div className="ds-detail-section">
          <div className="ds-detail-section-title">上报信息（自动提取）</div>
          <div className="ds-detail-grid">
            {fields.map(([label, value]) => (
              <div className="ds-detail-field" key={label}>
                <span className="ds-detail-label">{label}</span>
                <span className="ds-detail-value">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="ds-detail-section">
          <div className="ds-detail-section-title">阶段构成</div>
          {report.stageValues.length === 0 ? (
            <div className="ds-detail-empty">未提供阶段结果，仅参与总值统计</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>阶段</th>
                  <th style={{ textAlign: 'right' }}>排放值</th>
                  <th style={{ textAlign: 'right' }}>占比</th>
                </tr>
              </thead>
              <tbody>
                {report.stageValues.map((stage) => (
                  <tr key={stage.stageCode} className={stage.stageLevel === 2 ? 'ds-stage-child' : undefined}>
                    <td>{stage.stageName}</td>
                    <td style={{ textAlign: 'right' }} className="mono">
                      {numFmt(stage.stageEmission)}
                    </td>
                    <td style={{ textAlign: 'right' }}>{stage.stageShare}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="ds-detail-section">
          <div className="ds-detail-section-title">数据质量说明</div>
          <div className="ds-detail-empty">{report.dataQualityNote || '未填写'}</div>
        </div>

        <div className="ds-detail-section">
          <div className="ds-detail-section-title">流转轨迹</div>
          <div className="dr-traces">
            {report.traces.map((trace) => (
              <div className="dr-trace" key={trace.id}>
                <span className="dr-trace-at">{trace.at}</span>
                <span className="dr-trace-main">
                  <span className="dr-trace-op">{trace.operator}</span>
                  <span>{trace.note || trace.action}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="ds-detail-section">
          <div className="ds-detail-section-title">状态进度</div>
          <div className="dr-flow" style={{ marginBottom: 0 }}>
            {REPORT_FLOW.map((status, index) => (
              <span key={status} className="flex gap-xs">
                {index > 0 && <span className="dr-flow-sep">→</span>}
                <span
                  className={`dr-flow-step ${
                    flowIndex(report.status) >= index && report.status !== 'rejected' ? 'dr-flow-step-current' : ''
                  }`}
                >
                  {REPORT_STATUS_TEXT[status]}
                </span>
              </span>
            ))}
            {report.status === 'rejected' && <span className="dr-flow-step dr-flow-step-current">已驳回</span>}
          </div>
        </div>
      </div>
    </DrawerShell>
  )
}
