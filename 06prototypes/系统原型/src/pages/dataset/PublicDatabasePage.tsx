import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Modal, PageHeader, Pagination, Select, Table, Tag, Textarea, useToast } from '@/shared/components'
import type { Column } from '@/shared/components'
import type { PublicDatabaseRow, PublicDatabaseSnapshot } from '@/types/dataReport'
import type { CarbonRecord } from '@/types/dataset'
import { fetchPublicDatabase, fetchPublicRecord, publishVersion, rollbackVersion } from '@/mock/dataReport'
import RecordDetailDrawer from './RecordDetailDrawer'
import { emissionUnitText } from './datasetMeta'
import './DatasetPage.css'
import './PublicDatabasePage.css'

/**
 * 公共数据库（平台 · 数据集管理）。
 *
 * 一页完成全部事情：
 * 1. 顶部状态栏：当前最新发布版本（含历史数据条数）+ 待发版新增数据条数；
 * 2. 右上角「发布新版本」：把待发版数据一次性定格为全局快照；
 * 3. 版本记录：按发布顺序展示全部版本，点击可切换查看该版本的定格数据（历史版本只读）；
 * 4. 回滚发布：历史版本可回滚为当前发布版本（内容不变、版本号不新增），原当前版本自动转历史；
 *    未被该快照包含的数据退回「待发版」，历史版本一律保留只读可追溯；
 * 5. 数据列表：数据编号 / 行业类别 / 产品 / 碳足迹数值 / 所属版本，支持按行业与发布状态筛选，行内可查看入库详情。
 */

const PAGE_SIZE = 10

const PUBLISH_OPTIONS = [
  { value: 'all', label: '全部数据' },
  { value: 'published', label: '已发版' },
  { value: 'pending', label: '未发版' },
]

export default function PublicDatabasePage() {
  const toast = useToast()

  const [snapshot, setSnapshot] = useState<PublicDatabaseSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  /** null = 查看最新（实时）数据；否则为历史版本号 */
  const [viewVersion, setViewVersion] = useState<string | null>(null)

  const [industry, setIndustry] = useState('all')
  const [publishState, setPublishState] = useState('all')

  const [publishOpen, setPublishOpen] = useState(false)
  const [remark, setRemark] = useState('')
  const [publishing, setPublishing] = useState(false)

  const [rollbackOpen, setRollbackOpen] = useState(false)
  const [rollbackRemark, setRollbackRemark] = useState('')
  const [rollingBack, setRollingBack] = useState(false)

  const [detail, setDetail] = useState<{ record: CarbonRecord; version: string } | null>(null)

  const load = useCallback(
    async (version: string | null) => {
      setLoading(true)
      try {
        setSnapshot(await fetchPublicDatabase(version ?? undefined))
      } catch (error) {
        toast(error instanceof Error ? error.message : '加载失败', 'error')
      } finally {
        setLoading(false)
      }
    },
    [toast],
  )

  useEffect(() => {
    void load(viewVersion)
  }, [load, viewVersion])

  useEffect(() => {
    setPage(1)
  }, [industry, publishState])

  const rows = snapshot?.rows ?? []
  const current = snapshot?.current ?? null
  const pendingCount = snapshot?.pendingCount ?? 0
  const readOnly = snapshot?.readOnly ?? false
  const versions = snapshot?.versions ?? []
  const viewing = versions.find((version) => version.version === snapshot?.viewingVersion) ?? null

  // 版本号接续「已存在的最高版本」：回滚后当前版本号可能变低，按 current +1 会与既有版本重号
  const nextVersion = useMemo(() => {
    if (versions.length === 0) return 'V1.0'
    const [major, minor] = versions
      .map((version) => version.version.replace('V', '').split('.').map(Number))
      .sort((a, b) => b[0] - a[0] || b[1] - a[1])[0]
    return `V${major}.${minor + 1}`
  }, [versions])

  const industryOptions = useMemo(() => {
    const map = new Map<string, string>()
    rows.forEach((row) => map.set(row.industryCode, row.industryName))
    return [
      { value: 'all', label: '全部行业' },
      ...[...map.entries()]
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label, 'zh-Hans-CN')),
    ]
  }, [rows])

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        if (industry !== 'all' && row.industryCode !== industry) return false
        if (publishState === 'published' && !row.version) return false
        if (publishState === 'pending' && row.version) return false
        return true
      }),
    [rows, industry, publishState],
  )

  const pageRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const filtered = industry !== 'all' || publishState !== 'all'

  const handleViewVersion = (version?: string) => {
    setViewVersion(version ?? null)
    setIndustry('all')
    setPublishState('all')
    setPage(1)
    setRollbackOpen(false)
  }

  const handlePublish = async () => {
    setPublishing(true)
    try {
      const published = await publishVersion(remark)
      toast(
        `已发布 ${published.version}：${published.recordCount} 条数据定格为全局快照，企业端「行业数据集」已同步可见`,
      )
      setPublishOpen(false)
      setRemark('')
      setViewVersion(null)
      setPage(1)
      await load(null)
    } catch (error) {
      toast(error instanceof Error ? error.message : '发布失败', 'error')
    } finally {
      setPublishing(false)
    }
  }

  const handleRollback = async () => {
    if (!viewing) return
    setRollingBack(true)
    try {
      const published = await rollbackVersion(viewing.version, rollbackRemark)
      toast(
        `已回滚到 ${published.version}：该版本重新成为当前发布版本（${published.recordCount} 条快照），企业端「行业数据集」已同步`,
      )
      setRollbackOpen(false)
      setRollbackRemark('')
      setViewVersion(null)
      setPage(1)
      await load(null)
    } catch (error) {
      toast(error instanceof Error ? error.message : '回滚发布失败', 'error')
    } finally {
      setRollingBack(false)
    }
  }

  const handleOpenDetail = async (row: PublicDatabaseRow) => {
    try {
      const record = await fetchPublicRecord(row.recordId, readOnly ? snapshot?.viewingVersion ?? undefined : undefined)
      if (!record) {
        toast('数据记录不存在', 'error')
        return
      }
      const versionLabel = row.version ?? (readOnly ? snapshot?.viewingVersion : undefined) ?? '未发版'
      setDetail({ record, version: versionLabel })
    } catch (error) {
      toast(error instanceof Error ? error.message : '加载详情失败', 'error')
    }
  }

  const columns: Column<PublicDatabaseRow>[] = [
    {
      key: 'recordNo',
      title: '数据编号',
      width: 150,
      render: (row) => <span className="mono">{row.recordNo}</span>,
    },
    {
      key: 'industryName',
      title: '行业类别',
      width: 150,
      render: (row) => row.industryName,
    },
    {
      key: 'product',
      title: '产品',
      render: (row) => (
        <span className="ds-product-cell">
          <span>{row.productName}</span>
          {row.productCode && <span className="ds-product-code">{row.productCode}</span>}
        </span>
      ),
    },
    {
      key: 'totalEmission',
      title: '碳足迹数值',
      width: 200,
      align: 'right',
      render: (row) => (
        <span className="pdb-emission">
          <span className="mono pdb-emission-value">{row.totalEmission.toFixed(4)}</span>
          <span className="pdb-emission-unit">{emissionUnitText(row.emissionUnit)}/{row.unitCode}</span>
        </span>
      ),
    },
    {
      key: 'version',
      title: '所属版本',
      width: 110,
      render: (row) =>
        row.version ? <Tag tone="primary">{row.version}</Tag> : <Tag tone="warning">未发版</Tag>,
    },
    {
      key: 'actions',
      title: '操作',
      width: 80,
      render: (row) => (
        <button className="link" onClick={() => void handleOpenDetail(row)}>
          详情
        </button>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '数据集管理', '公共数据库']}
        title="公共数据库"
        actions={
          <Button
            variant="primary"
            onClick={() => setPublishOpen(true)}
            disabled={!current || pendingCount === 0 || readOnly}
            title={
              readOnly
                ? '历史版本只读，请回到最新版本后发布'
                : pendingCount === 0
                  ? '当前没有待发版数据'
                  : `把 ${pendingCount} 条待发版数据定格为 ${nextVersion}`
            }
          >
            发布新版本 {nextVersion}
          </Button>
        }
      />

      <section className="pdb-status">
        <div className="pdb-status-card pdb-status-card-current">
          <span className="pdb-status-label">当前最新发布版本</span>
          <div className="pdb-status-line">
            <span className="pdb-status-version">{current?.version ?? '—'}</span>
            <span className="pdb-status-text">
              包含 <b>{current?.recordCount ?? 0}</b> 条历史数据
            </span>
          </div>
          <span className="pdb-status-sub">
            {current
              ? `发布于 ${current.publishedAt}${
                  current.lastActivatedAt ? ` · 最近生效 ${current.lastActivatedAt}` : ''
                } · 发布人 ${current.publishedBy}${current.remark ? ` · ${current.remark}` : ''}`
              : '尚未发布任何版本'}
          </span>
        </div>

        <div className="pdb-status-card pdb-status-card-pending">
          <span className="pdb-status-label">待发版新增数据</span>
          <div className="pdb-status-line">
            <span className="pdb-status-version pdb-status-version-pending">{pendingCount}</span>
            <span className="pdb-status-text">条</span>
          </div>
          <span className="pdb-status-sub">
            {pendingCount > 0 ? '入库后尚未定格，发布新版本后纳入快照' : '全部数据均已纳入当前版本'}
          </span>
        </div>
      </section>

      <div className="pdb-footnote">
        {readOnly ? (
          <>历史版本快照：{rows.length} 条</>
        ) : (
          <>
            库内有效数据 {rows.length} 条（已发版 {rows.length - pendingCount} 条 · 待发版 {pendingCount} 条）
            {versions.filter((v) => v.status === 'history').length > 0 &&
              ` · 历史版本 ${versions
                .filter((v) => v.status === 'history')
                .map((v) => v.version)
                .join(' / ')}`}
          </>
        )}
      </div>

      <div className="pdb-versions">
        <span className="pdb-versions-label">版本记录</span>
        <div className="pdb-version-list">
          {versions.map((version) => {
            const active = viewVersion === version.version || (viewVersion === null && version.status === 'current')
            return (
              <button
                key={version.id}
                type="button"
                className={`pdb-version-chip${active ? ' pdb-version-chip-active' : ''}`}
                onClick={() => handleViewVersion(version.status === 'current' ? undefined : version.version)}
                title={`${version.version} · ${version.recordCount} 条 · 发布于 ${version.publishedAt}${
                  version.lastActivatedAt ? ` · 最近生效 ${version.lastActivatedAt}` : ''
                } · 发布人 ${version.publishedBy}${version.remark ? ` · ${version.remark}` : ''}`}
              >
                <span className="pdb-version-chip-no">{version.version}</span>
                <span className="pdb-version-chip-meta">
                  {version.recordCount} 条 · {version.publishedAt.slice(0, 10)}
                </span>
                {version.status === 'current' && <span className="pdb-version-chip-badge">当前</span>}
              </button>
            )
          })}
        </div>
        <span className="pdb-versions-tip">点击版本可切换查看定格数据；历史版本可回滚为当前发布版本</span>
      </div>

      {readOnly && (
        <div className="pdb-readonly-bar">
          <span>
            正在查看历史版本 <b>{viewing?.version}</b>：快照 {viewing?.recordCount ?? rows.length} 条 · 发布于{' '}
            {viewing?.publishedAt ?? '—'} · 发布人 {viewing?.publishedBy ?? '—'}
            {viewing?.remark ? ` · ${viewing.remark}` : ''} · 只读不可修改
          </span>
          <span className="pdb-readonly-actions">
            <Button
              size="small"
              variant="primary"
              onClick={() => {
                setRollbackRemark('')
                setRollbackOpen(true)
              }}
              title={`把 ${viewing?.version} 重新设为当前发布版本（内容不变、版本号不新增），当前版本 ${current?.version} 转为历史版本`}
            >
              回滚发布此版本
            </Button>
            <button className="link" onClick={() => handleViewVersion()}>
              回到最新版本
            </button>
          </span>
        </div>
      )}

      <div className="card">
        <div className="query-bar">
          <div className="query-item">
            <span className="query-label">行业类别</span>
            <Select value={industry} options={industryOptions} onChange={(e) => setIndustry(e.target.value)} />
          </div>
          {!readOnly && (
            <div className="query-item">
              <span className="query-label">发布状态</span>
              <Select value={publishState} options={PUBLISH_OPTIONS} onChange={(e) => setPublishState(e.target.value)} />
            </div>
          )}
          <div className="query-actions">
            <span className="pdb-count">共 {filteredRows.length} 条</span>
            <Button
              onClick={() => {
                setIndustry('all')
                setPublishState('all')
              }}
            >
              重置
            </Button>
          </div>
        </div>

        <Table
          columns={columns}
          data={pageRows}
          rowKey={(row) => row.recordId}
          loading={loading}
          emptyText={filtered ? '该筛选条件下暂无数据' : '公共数据库暂无数据'}
        />
        <Pagination total={filteredRows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      <Modal
        open={publishOpen}
        title={`发布新版本 ${nextVersion}`}
        onClose={() => setPublishOpen(false)}
        footer={
          <>
            <Button onClick={() => setPublishOpen(false)} disabled={publishing}>
              取消
            </Button>
            <Button variant="primary" onClick={() => void handlePublish()} disabled={publishing}>
              {publishing ? '发布中…' : '确认发布'}
            </Button>
          </>
        }
      >
        <div className="ds-void-modal">
          <div className="pdb-publish-summary">
            <span className="pdb-publish-tag">待发版</span>
            <span>
              本次将把 <b>{pendingCount}</b> 条新增数据定格为 <b>{nextVersion}</b>；发布后这些数据的所属版本同步更新，
              历史版本保持只读可追溯。
            </span>
          </div>
          <p>版本说明（可选）：记录本次发布的清洗批次、口径调整等信息，供审计追溯。</p>
          <Textarea
            rows={3}
            value={remark}
            placeholder="如：2026 Q4 季度快照，含本月企业上报审核入库数据"
            onChange={(e) => setRemark(e.target.value)}
          />
        </div>
      </Modal>

      <Modal
        open={rollbackOpen}
        title={`回滚到历史版本 ${viewing?.version ?? '—'}`}
        onClose={() => setRollbackOpen(false)}
        footer={
          <>
            <Button onClick={() => setRollbackOpen(false)} disabled={rollingBack}>
              取消
            </Button>
            <Button variant="primary" onClick={() => void handleRollback()} disabled={rollingBack || !viewing}>
              {rollingBack ? '回滚中…' : '确认回滚'}
            </Button>
          </>
        }
      >
        <div className="ds-void-modal">
          <div className="pdb-publish-summary pdb-rollback-summary">
            <span className="pdb-publish-tag pdb-rollback-tag">回滚</span>
            <span>
              将把历史版本 <b>{viewing?.version}</b> 重新设为当前发布版本：<b>内容不变、版本号不新增</b>，
              该版本定格快照（<b>{viewing?.recordCount ?? 0}</b> 条）即刻生效；当前版本 <b>{current?.version}</b>{' '}
              自动转为历史版本，企业端「行业数据集」同步切换。
            </span>
          </div>
          <p>
            回滚不删除数据：该快照之外新增、未被包含的数据退回「待发版」，可再通过「发布新版本」重新纳入；所有版本保持只读可追溯。
          </p>
          <p>回滚说明（可选）：记录回滚原因，供审计追溯。</p>
          <Textarea
            rows={3}
            value={rollbackRemark}
            placeholder="如：V1.0 发现口径错误，回滚至 V0.9 重新生效"
            onChange={(e) => setRollbackRemark(e.target.value)}
          />
        </div>
      </Modal>

      <RecordDetailDrawer
        record={detail?.record ?? null}
        onClose={() => setDetail(null)}
        readOnly
        extraFields={detail ? [['所属版本', detail.version]] : undefined}
      />
    </>
  )
}
