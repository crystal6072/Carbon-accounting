import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  CascaderSelect,
  collectTreeValues,
  Input,
  MultiSelect,
  PageHeader,
  Pagination,
  Select,
  Table,
  Tag,
  useToast,
} from '@/shared/components'
import type { Column } from '@/shared/components'
import type { TreeOption } from '@/types'
import type { CarbonRecord } from '@/types/dataset'
import type { IndustryDatasetSnapshot } from '@/types/dataReport'
import { fetchIndustryDataset } from '@/mock/dataReport'
import { fetchCategoryTreeOptions, fetchIndustryTreeOptions } from '@/mock'
import { StatPanel } from './StatPanel'
import RecordDetailDrawer from './RecordDetailDrawer'
import {
  BOUNDARY_TEXT,
  BOUNDARY_TONE,
  REGION_OPTIONS,
  emissionUnitText,
  exportRecordsCsv,
  numText,
  periodText,
  provinceOf,
  unitText,
} from './datasetMeta'
import './DatasetPage.css'

/**
 * 行业数据集（前台业务平台 · 数据管理）。
 *
 * 定位：企业只读查看平台当前已发布的行业数据集，用于行业对标与统计分析。
 * - 数据口径 = 后台「审核入库 → 版本发布」后的最新发布版本，企业侧不感知版本管理；
 * - 「数据 / 统计分析」为同一份数据的两个视图，用 Tab 切换；
 * - 统计分析支持选择条件（行业 / 地域 / 产品类别 / 系统边界）：进入即按最新发布版本出结果，选条件后重算；
 * - 本页不产生数据：无补录、无作废、无发版、无一键上报；上报入口统一在「企业数据上报」。
 */

const PAGE_SIZE = 20

type TabKey = 'data' | 'stat'

const EMPTY_QUERY = {
  category: '',
  regions: [] as string[],
  industry: '',
  keyword: '',
}

export default function DatasetListPage() {
  const toast = useToast()

  const [snapshot, setSnapshot] = useState<IndustryDatasetSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<TabKey>('data')

  const [applied, setApplied] = useState(EMPTY_QUERY)
  const [draft, setDraft] = useState(EMPTY_QUERY)
  const [page, setPage] = useState(1)

  // 选项（列表仅保留产品类别 / 所属行业 / 区域 / 关键词四个检索条件）
  const [categoryTree, setCategoryTree] = useState<TreeOption[]>([])
  const [industryOptions, setIndustryOptions] = useState<{ value: string; label: string }[]>([])

  // 详情
  const [detail, setDetail] = useState<CarbonRecord | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setSnapshot(await fetchIndustryDataset())
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
    void (async () => {
      const [cats, inds] = await Promise.all([fetchCategoryTreeOptions('name'), fetchIndustryTreeOptions()])
      setCategoryTree(cats)
      setIndustryOptions(collectIndustryLeaves(inds))
    })()
  }, [])

  const records = snapshot?.records ?? []
  const published = !!snapshot?.current

  useEffect(() => {
    setPage(1)
  }, [applied])

  /* ---------- 筛选 ---------- */

  const handleSearch = () => {
    setApplied({ ...draft })
    setPage(1)
  }
  const handleReset = () => {
    setDraft(EMPTY_QUERY)
    setApplied(EMPTY_QUERY)
    setPage(1)
  }

  const filtered = useMemo(() => {
    const kw = applied.keyword.trim().toLowerCase()
    const categoryValues = applied.category ? collectTreeValues(categoryTree, applied.category) : []
    return records.filter((record) => {
      if (applied.category) {
        const hit =
          categoryValues.includes(record.categoryCode) ||
          categoryValues.includes(record.categoryName) ||
          record.categoryPath.includes(applied.category)
        if (!hit) return false
      }
      // 区域统一按省级比对：上报登记为「省 / 市 / 区」三级路径时也能被省级筛选命中
      if (applied.regions.length > 0 && !applied.regions.includes(provinceOf(record.regionName))) return false
      if (applied.industry && record.industryCode !== applied.industry) return false
      if (kw) {
        const text = [record.productName, record.productCode ?? '', record.recordNo, record.orgLabel ?? '']
          .join(' ')
          .toLowerCase()
        if (!text.includes(kw)) return false
      }
      return true
    })
  }, [records, applied, categoryTree])

  /** 默认按入库时间倒序 */
  const sorted = useMemo(
    () => [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [filtered],
  )
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  /* ---------- 列定义 ---------- */

  const columns: Column<CarbonRecord>[] = [
    {
      key: 'recordNo',
      title: '数据编号',
      width: 160,
      render: (row) => <span className="mono nowrap">{row.recordNo}</span>,
    },
    {
      key: 'productName',
      title: '产品名称',
      width: 230,
      render: (row) => (
        <span className="ds-product-cell">
          <button className="link" onClick={() => setDetail(row)}>
            {row.productName}
          </button>
          {row.productCode && <span className="ds-product-code">{row.productCode}</span>}
        </span>
      ),
    },
    { key: 'category', title: '产品类别', width: 130, render: (row) => row.categoryName || '-' },
    {
      key: 'industry',
      title: '所属行业',
      width: 150,
      render: (row) => <span title={row.industryPath}>{row.industryName}</span>,
    },
    {
      key: 'region',
      title: '区域',
      width: 110,
      render: (row) =>
        row.regionName ? (
          <span className="nowrap" title={row.regionName}>
            {provinceOf(row.regionName)}
          </span>
        ) : (
          <span className="ds-cell-muted">未填</span>
        ),
    },
    {
      key: 'processes',
      title: '工艺',
      width: 160,
      render: (row) => (
        <span className="ds-process-tags">
          {row.processes.length === 0 && <span className="ds-cell-muted">—</span>}
          {row.processes.slice(0, 2).map((p) => (
            <Tag key={p.name}>{p.name}</Tag>
          ))}
          {row.processes.length > 2 && <span className="ds-cell-muted">+{row.processes.length - 2}</span>}
        </span>
      ),
    },
    {
      key: 'boundary',
      title: '系统边界',
      width: 110,
      render: (row) => <Tag tone={BOUNDARY_TONE[row.boundary]}>{BOUNDARY_TEXT[row.boundary]}</Tag>,
    },
    {
      key: 'unit',
      title: '声明单位',
      width: 90,
      align: 'center',
      render: (row) => unitText(row),
    },
    {
      key: 'totalEmission',
      title: '碳足迹数值',
      width: 140,
      align: 'right',
      render: (row) => (
        <span className="ds-emission">
          <span className="mono ds-emission-value">{numText(row.totalEmission)}</span>
          <span className="ds-emission-unit">{emissionUnitText(row.emissionUnit)}/{row.unitCode}</span>
        </span>
      ),
    },
    {
      key: 'period',
      title: '统计期间',
      width: 180,
      render: (row) => <span className="nowrap ds-cell-muted">{periodText(row)}</span>,
    },
    {
      key: 'orgLabel',
      title: '数据来源',
      width: 140,
      render: (row) => (
        <span className="ds-cell-muted">{row.orgLabel ? `${row.orgLabel}（脱敏）` : '平台核算'}</span>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      width: 80,
      render: (row) => (
        <button className="link" data-ann-target="dataset.records.detail" onClick={() => setDetail(row)}>
          详情
        </button>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        breadcrumb={['前台业务平台', '数据管理', '行业数据集']}
        title="行业数据集"
        actions={
          <Button
            data-ann-target="dataset.records.export"
            onClick={() => exportRecordsCsv(sorted)}
            disabled={sorted.length === 0}
          >
            导出
          </Button>
        }
      />

      <div className="ids-note" data-ann-target="dataset.records.note">
        数据来自平台已发布的行业数据集，共 {records.length} 条；企业上报请前往「数据管理 · 企业数据上报」。
      </div>

      <div className="ids-tabs" data-ann-target="dataset.records.tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'data'}
          className={`ids-tab${tab === 'data' ? ' ids-tab-active' : ''}`}
          onClick={() => setTab('data')}
        >
          数据
          <span className="ids-tab-count">{sorted.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'stat'}
          className={`ids-tab${tab === 'stat' ? ' ids-tab-active' : ''}`}
          onClick={() => setTab('stat')}
        >
          统计分析
        </button>
      </div>

      {tab === 'data' ? (
        <div className="card">
          <div className="query-bar" data-ann-target="dataset.records.query">
            <div className="query-item ds-query-wide">
              <span className="query-label">产品类别</span>
              <CascaderSelect
                value={draft.category}
                options={categoryTree}
                placeholder="请选择（父级含子级）"
                allowParent
                onChange={(value) => setDraft((prev) => ({ ...prev, category: value }))}
              />
            </div>
            <div className="query-item">
              <span className="query-label">所属行业</span>
              <Select
                value={draft.industry}
                options={[{ value: '', label: '全部行业' }, ...industryOptions]}
                onChange={(e) => setDraft((prev) => ({ ...prev, industry: e.target.value }))}
              />
            </div>
            <div className="query-item">
              <span className="query-label">区域</span>
              <MultiSelect
                value={draft.regions}
                options={REGION_OPTIONS}
                placeholder="请选择区域"
                onChange={(values) => setDraft((prev) => ({ ...prev, regions: values }))}
              />
            </div>
            <div className="query-item">
              <span className="query-label">关键词</span>
              <Input
                value={draft.keyword}
                placeholder="产品名称 / 编码 / 数据编号"
                onChange={(e) => setDraft((prev) => ({ ...prev, keyword: e.target.value }))}
              />
            </div>
            <div className="query-actions">
              <Button onClick={handleReset}>重置</Button>
              <Button variant="primary" onClick={handleSearch}>
                查询
              </Button>
            </div>
          </div>

          <div className="toolbar" data-ann-target="dataset.records.table">
            <div className="flex gap-sm">
              <span className="toolbar-title">已发布数据</span>
              <span className="toolbar-tip">共 {sorted.length} 条</span>
            </div>
            <span className="toolbar-tip">平台已发布数据，只读可追溯</span>
          </div>

          <Table
            columns={columns}
            data={paged}
            rowKey={(row) => row.id}
            loading={loading}
            emptyText={
              published
                ? '当前筛选条件下暂无数据，可调整筛选条件'
                : '平台尚未发布行业数据集，发布后可在此查看'
            }
          />
          <Pagination total={sorted.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
        </div>
      ) : (
        <div className="card ids-stat-card" data-ann-target="dataset.records.stat">
          {/* 统计分析固定使用最新发布版本全量数据，不继承列表筛选 */}
          <StatPanel records={records} />
        </div>
      )}

      {/* 记录详情：只读 */}
      <RecordDetailDrawer
        record={detail}
        onClose={() => setDetail(null)}
        readOnly
        readOnlyNote="行业数据集为平台已发布数据快照，只读可追溯"
      />
    </>
  )
}

/** 行业库树 → 末级行业选项（与行业基线列表同口径） */
function collectIndustryLeaves(nodes: TreeOption[]): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = []
  const walk = (list: TreeOption[]): void => {
    for (const node of list) {
      if (node.children && node.children.length > 0) walk(node.children as TreeOption[])
      else out.push({ value: (node.extra as string) ?? node.value, label: node.label })
    }
  }
  walk(nodes)
  return out
}
