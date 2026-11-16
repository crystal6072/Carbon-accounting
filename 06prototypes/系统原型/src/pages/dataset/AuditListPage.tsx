import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, PageHeader, Pagination, Select, Table, Tag, useToast } from '@/shared/components'
import type { Column } from '@/shared/components'
import type { DataReport, ReportStatus } from '@/types/dataReport'
import { fetchReport, fetchReports } from '@/mock/dataReport'
import AuditWorkbenchDrawer from './AuditWorkbenchDrawer'
import { REPORT_STATUS_TONE, numFmt, regionShortText, reportStatusText } from './dataReportMeta'
import { emissionUnitLabel } from './datasetMeta'
import './DatasetPage.css'
import './DataReport.css'

/**
 * 数据审核（平台 · 数据集管理）。
 *
 * 平台不做自动异常判定，也不提供标准化编辑：审核只读核对企业上报内容，
 * 只能「通过并入库」或「驳回退回企业」。通过时按上报原值脱敏入库
 * （企业 A → 某华东地区企业）；重算后重新上报的单，通过后更新原记录。
 */

const PAGE_SIZE = 20

const STATUS_OPTIONS = [
  { value: 'reviewing', label: '待审核' },
  { value: 'rejected', label: '已驳回' },
  { value: 'archived', label: '已入库' },
  { value: 'all', label: '全部状态' },
]

const EMPTY_QUERY = { status: 'reviewing', industryCode: '', keyword: '' }

export default function AuditListPage() {
  const toast = useToast()
  const navigate = useNavigate()

  const [reports, setReports] = useState<DataReport[]>([])
  const [loading, setLoading] = useState(false)
  const [draftQuery, setDraftQuery] = useState(EMPTY_QUERY)
  const [appliedQuery, setAppliedQuery] = useState(EMPTY_QUERY)
  const [page, setPage] = useState(1)
  const [active, setActive] = useState<DataReport | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // 草稿只在企业侧维护，不进入平台审核队列（企业撤回后同样从队列移除）
      setReports((await fetchReports()).filter((report) => report.status !== 'draft'))
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

  const industryOptions = useMemo(() => {
    const map = new Map<string, string>()
    reports.forEach((report) => map.set(report.industryCode, report.industryName))
    return [
      { value: '', label: '全部行业' },
      ...[...map.entries()].map(([code, name]) => ({ value: code, label: `${code} ${name}` })),
    ]
  }, [reports])

  const stats = useMemo(
    () => ({
      awaiting: reports.filter((r) => r.status === 'reviewing').length,
      rejected: reports.filter((r) => r.status === 'rejected').length,
      archived: reports.filter((r) => r.status === 'archived').length,
    }),
    [reports],
  )

  const filtered = useMemo(() => {
    const kw = appliedQuery.keyword.trim().toLowerCase()
    return reports.filter((report) => {
      if (appliedQuery.status !== 'all' && report.status !== appliedQuery.status) return false
      if (appliedQuery.industryCode && report.industryCode !== appliedQuery.industryCode) return false
      if (!kw) return true
      return [report.productName, report.reportNo, report.orgName, report.sourceRecordNo]
        .join(' ')
        .toLowerCase()
        .includes(kw)
    })
  }, [reports, appliedQuery])

  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const weight = (status: ReportStatus) => (status === 'reviewing' ? 0 : status === 'rejected' ? 1 : 2)
        const diff = weight(a.status) - weight(b.status)
        return diff !== 0 ? diff : b.updatedAt.localeCompare(a.updatedAt)
      }),
    [filtered],
  )
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  /** 直接进入审核工作台：提交即待审核，不再有「受理」动作 */
  const openAudit = async (report: DataReport) => {
    try {
      setActive(await fetchReport(report.id))
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  const columns: Column<DataReport>[] = [
    {
      key: 'reportNo',
      title: '上报编号',
      width: 168,
      render: (row) => (
        <span className="ds-product-cell">
          <span className="mono">{row.reportNo}</span>
          <span className="ds-product-code">来源 {row.sourceRecordNo}</span>
        </span>
      ),
    },
    {
      key: 'productName',
      title: '产品 / 上报企业',
      width: 240,
      render: (row) => (
        <span className="ds-product-cell">
          <button className="link" onClick={() => void openAudit(row)}>
            {row.productName}
          </button>
          <span className="ds-product-code">
            {row.orgName} · {row.contactName}
          </span>
          {row.originReportId && <span className="dr-stale-tag">重算后重新上报</span>}
        </span>
      ),
    },
    {
      key: 'industry',
      title: '所属行业',
      width: 140,
      render: (row) => <span title={row.industryPath}>{row.industryName}</span>,
    },
    {
      key: 'region',
      title: '区域',
      width: 120,
      render: (row) =>
        row.regionName ? (
          <span title={`${row.regionName}（${row.regionGroup}）`}>
            {regionShortText(row.regionName)}
            <span className="dr-muted">（{row.regionGroup}）</span>
          </span>
        ) : (
          <span className="dr-muted">未填</span>
        ),
    },
    {
      key: 'total',
      title: '总碳足迹',
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
      title: '状态',
      width: 100,
      render: (row) => (
        <span
          title={
            row.status === 'archived'
              ? row.datasetVersion
                ? `已随 ${row.datasetVersion} 发布，企业端可见`
                : '已入库，待「公共数据库」发布新版本后企业可见'
              : undefined
          }
        >
          <Tag tone={REPORT_STATUS_TONE[row.status]}>{reportStatusText(row, 'platform')}</Tag>
        </span>
      ),
    },
    {
      key: 'submittedAt',
      title: '提交时间',
      width: 140,
      render: (row) => <span className="nowrap">{row.submittedAt ?? '—'}</span>,
    },
    {
      key: 'actions',
      title: '操作',
      width: 150,
      render: (row) => (
        <span className="row-actions">
          {row.status === 'reviewing' && (
            <button className="link" onClick={() => void openAudit(row)}>
              审核
            </button>
          )}
          {(row.status === 'rejected' || row.status === 'archived') && (
            <button className="link" onClick={() => setActive(row)}>
              查看
            </button>
          )}
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '数据集管理', '数据审核']}
        title="数据审核"
        actions={
          <Button onClick={() => navigate('/dataset/public')}>去发布新版本</Button>
        }
      />

      <div className="dr-flow">
        <span>审核链路：</span>
        <span className="dr-flow-step dr-flow-step-current">待审核</span>
        <span className="dr-flow-sep">→</span>
        <span className="dr-flow-step">已入库</span>
        <span className="dr-flow-sep">→</span>
        <span className="dr-flow-step">发布版本</span>
        <span className="dr-flow-sep">/</span>
        <span className="dr-flow-step">已驳回</span>
      </div>

      <div className="dr-stats dr-stats-3">
        <StatCard label="待审核" value={stats.awaiting} />
        <StatCard label="已驳回" value={stats.rejected} />
        <StatCard label="已入库" value={stats.archived} />
      </div>

      <div className="card">
        <div className="query-bar">
          <div className="query-item dr-query-status">
            <span className="query-label">状态</span>
            <Select
              value={draftQuery.status}
              options={STATUS_OPTIONS}
              onChange={(e) => setDraftQuery((prev) => ({ ...prev, status: e.target.value }))}
            />
          </div>
          <div className="query-item">
            <span className="query-label">所属行业</span>
            <Select
              value={draftQuery.industryCode}
              options={industryOptions}
              onChange={(e) => setDraftQuery((prev) => ({ ...prev, industryCode: e.target.value }))}
            />
          </div>
          <div className="query-item dr-query-wide">
            <span className="query-label">关键词</span>
            <Input
              value={draftQuery.keyword}
              placeholder="上报编号 / 产品名称 / 企业名称"
              onChange={(e) => setDraftQuery((prev) => ({ ...prev, keyword: e.target.value }))}
            />
          </div>
          <div className="query-actions">
            <Button
              onClick={() => {
                setDraftQuery(EMPTY_QUERY)
                setAppliedQuery(EMPTY_QUERY)
              }}
            >
              重置
            </Button>
            <Button variant="primary" onClick={() => setAppliedQuery({ ...draftQuery })}>
              查询
            </Button>
          </div>
        </div>

        <div className="toolbar">
          <div className="flex gap-sm">
            <span className="toolbar-title">上报审核队列</span>
            <span className="toolbar-tip">共 {sorted.length} 条</span>
          </div>
        </div>

        <Table
          columns={columns}
          data={paged}
          rowKey={(row) => row.id}
          loading={loading}
          emptyText="没有符合条件的数据审核单"
        />
        <Pagination total={sorted.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      <AuditWorkbenchDrawer
        report={active}
        onClose={() => setActive(null)}
        onDone={(message) => {
          toast(message)
          setActive(null)
          void load()
        }}
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
