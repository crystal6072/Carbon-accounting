import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input, PageHeader, Pagination, Select, Table, Tag } from '@/shared/components'
import type { Column, SelectOption } from '@/shared/components'
import { fetchPortalStandards } from '@/mock'
import type { StandardItem } from '@/types'
import { standardStatusTone } from '@/pages/standard/standardMeta'
import './KnowledgePage.css'

const PAGE_SIZE = 10

/** 标准分类页签（与后台维护端同一套受控枚举） */
const CATEGORY_TABS: { label: string; value: string }[] = [
  { label: '全部', value: '' },
  { label: '国际标准', value: '国际标准' },
  { label: '国家标准', value: '国家标准' },
  { label: '行业标准', value: '行业标准' },
  { label: '团体标准', value: '团体标准' },
]

/** 标准状态筛选：默认只看「现行」（业务人员日常查阅口径），可切换查看全部 */
const STATUS_OPTIONS: SelectOption[] = [
  { label: '仅看现行', value: '现行' },
  { label: '全部状态', value: '' },
  { label: '被替代', value: '被替代' },
  { label: '作废', value: '作废' },
]

/**
 * 知识中心 · 标准规范（业务端只读）。
 * 数据来自平台运营端「系统管理 → 碳核算知识库 → 标准规范库」的维护结果，
 * 此处只提供查阅：按分类 / 状态筛选、关键字搜索、查看详情与附件在线预览，
 * 不提供任何新增 / 编辑 / 删除入口。
 */
export default function KnowledgeStandardListPage() {
  const navigate = useNavigate()

  const [list, setList] = useState<StandardItem[]>([])
  const [loading, setLoading] = useState(false)
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('现行')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setList(await fetchPortalStandards())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  /** 前端筛选：分类页签 + 状态 + 关键字（标准号 / 中文名称模糊匹配） */
  const rows = useMemo(() => {
    let data = list
    if (category) data = data.filter((item) => item.category === category)
    if (status) data = data.filter((item) => item.status === status)
    const kw = keyword.trim().toLowerCase()
    if (kw) {
      data = data.filter(
        (item) => item.code.toLowerCase().includes(kw) || item.nameZh.toLowerCase().includes(kw),
      )
    }
    return data
  }, [list, category, status, keyword])

  useEffect(() => {
    setPage(1)
  }, [category, status, keyword])

  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const openView = (id: string) => navigate(`/knowledge/standard/${id}`)

  const columns: Column<StandardItem>[] = [
    {
      key: 'code',
      title: '标准号',
      width: 190,
      render: (row) => (
        <button className="link mono nowrap" onClick={() => openView(row.id)}>
          {row.code}
        </button>
      ),
    },
    {
      key: 'nameZh',
      title: '标准名称',
      render: (row) => (
        <button className="link" onClick={() => openView(row.id)}>
          {row.nameZh}
        </button>
      ),
    },
    {
      key: 'status',
      title: '标准状态',
      width: 110,
      render: (row) => <Tag tone={standardStatusTone(row.status)}>{row.status || '-'}</Tag>,
    },
    {
      key: 'category',
      title: '标准分类',
      width: 110,
      render: (row) => <span className="nowrap">{row.category || '-'}</span>,
    },
    {
      key: 'implementDate',
      title: '实施日期',
      width: 120,
      render: (row) => <span className="nowrap">{row.implementDate || '-'}</span>,
    },
    {
      key: 'actions',
      title: '操作',
      width: 90,
      render: (row) => (
        <span className="row-actions">
          <button className="link" onClick={() => openView(row.id)}>
            查看
          </button>
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        breadcrumb={['产品碳足迹', '知识中心', '标准规范']}
        title="标准规范"
        description="平台统一维护的碳足迹核算依据标准字典（只读查阅）：一个标准号 = 一条记录，可查看标准信息、来源链接与附件。"
      />

      <div className="card knowledge-card">
        <div className="knowledge-toolbar">
          <div className="knowledge-tabs">
            {CATEGORY_TABS.map((t) => (
              <button
                key={t.value}
                className={`knowledge-tab${category === t.value ? ' active' : ''}`}
                onClick={() => setCategory(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="kstd-toolbar-right">
            <Select
              value={status}
              options={STATUS_OPTIONS}
              onChange={(e) => setStatus(e.target.value)}
              className="kstd-status-select"
            />
            <Input
              value={keyword}
              placeholder="搜索标准号 / 标准名称"
              className="knowledge-search"
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
        </div>

        <div className="kstd-table-tip">
          共 {rows.length} 条 · 数据由平台运营在「系统管理 → 碳核算知识库 → 标准规范库」维护，业务端只读；
          附件仅限企业内部查阅，不得作为对外交付物。
        </div>

        <div className="kstd-table-wrap">
          <Table columns={columns} data={pagedRows} rowKey={(row) => row.id} loading={loading} />
        </div>

        <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>
    </>
  )
}
