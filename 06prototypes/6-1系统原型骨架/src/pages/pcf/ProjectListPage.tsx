import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Input,
  Modal,
  PageHeader,
  Pagination,
  Table,
  Tag,
  useToast,
} from '@/shared/components'
import type { Column } from '@/shared/components'
import { fetchPcfMyProductOptions, fetchPcfProjectGroups } from '@/mock'
import type { PcfMyProductOption } from '@/mock'
import type { PcfProjectGroupItem } from '@/mock'
import { pcfProductLabel } from './pcfMeta'
import './PcfPage.css'

const PAGE_SIZE = 20
const PICKER_PAGE_SIZE = 8

/**
 * 核算列表 · 第一层（产品维度）：
 * 一个产品可进行多次核算（1 : N），本页按产品分组展示核算记录数，
 * 点击产品进入「产品核算记录」页（第二层）查看该产品的全部核算记录。
 */
export default function ProjectListPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [list, setList] = useState<PcfProjectGroupItem[]>([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)

  /* 新增核算：仅允许选择「我的产品库」中「上架」产品（组织自建 / 引用平台产品） */
  const [pickerOpen, setPickerOpen] = useState(false)
  const [products, setProducts] = useState<PcfMyProductOption[]>([])
  const [pickerKeyword, setPickerKeyword] = useState('')
  const [pickedId, setPickedId] = useState('')
  const [pickerPage, setPickerPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setList(await fetchPcfProjectGroups())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void fetchPcfMyProductOptions().then(setProducts)
  }, [])

  const rows = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    if (!kw) return list
    return list.filter(
      (item) => item.productName.toLowerCase().includes(kw) || item.productCode.toLowerCase().includes(kw),
    )
  }, [list, keyword])

  useEffect(() => {
    setPage(1)
  }, [keyword])

  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const pickerRows = useMemo(() => {
    const kw = pickerKeyword.trim().toLowerCase()
    if (!kw) return products
    return products.filter(
      (item) => item.name.toLowerCase().includes(kw) || item.code.toLowerCase().includes(kw),
    )
  }, [products, pickerKeyword])

  const pagedPickerRows = pickerRows.slice(
    (pickerPage - 1) * PICKER_PAGE_SIZE,
    pickerPage * PICKER_PAGE_SIZE,
  )

  /** 开始核算：进入草稿工作台，步骤①保存后才落库（未保存不产生核算记录） */
  const handlePickConfirm = () => {
    if (!pickedId) return
    const product = products.find((item) => item.id === pickedId)
    if (!product) return
    setPickerOpen(false)
    setPickedId('')
    navigate(`/pcf/project/new/${product.id}`)
  }

  const columns: Column<PcfProjectGroupItem>[] = [
    {
      key: 'product',
      title: '产品名称',
      width: 260,
      render: (row) => (
        <button className="link" onClick={() => navigate(`/pcf/project/product/${row.productId}`)}>
          {pcfProductLabel(row.productName, row.productSpec)}
        </button>
      ),
    },
    {
      key: 'code',
      title: '产品编码',
      width: 130,
      render: (row) => <span className="mono">{row.productCode}</span>,
    },
    { key: 'category', title: '产品分类', width: 130 },
    { key: 'industry', title: '所属行业', width: 130 },
    {
      key: 'useStatus',
      title: '上架状态',
      width: 100,
      render: (row) =>
        row.useStatus === 'on' ? <Tag tone="success">已上架</Tag> : <Tag tone="default">已下架</Tag>,
    },
    {
      key: 'projectCount',
      title: '核算记录',
      width: 110,
      render: (row) => (
        <button className="link" onClick={() => navigate(`/pcf/project/product/${row.productId}`)}>
          {row.projectCount} 条
        </button>
      ),
    },
    {
      key: 'lastUpdatedAt',
      title: '最近核算时间',
      width: 160,
      render: (row) => <span className="nowrap">{row.lastUpdatedAt}</span>,
    },
    {
      key: 'actions',
      title: '操作',
      width: 120,
      render: (row) => (
        <span className="row-actions">
          <button className="link" onClick={() => navigate(`/pcf/project/product/${row.productId}`)}>
            查看记录
          </button>
        </span>
      ),
    },
  ]

  const pickerColumns: Column<PcfMyProductOption>[] = [
    {
      key: 'pick',
      title: '',
      width: 48,
      render: (row) => (
        <input
          type="radio"
          name="pcf-project-product-pick"
          checked={pickedId === row.id}
          onChange={() => setPickedId(row.id)}
        />
      ),
    },
    { key: 'code', title: '产品编码', width: 120 },
    { key: 'name', title: '产品名称', width: 190 },
    { key: 'model', title: '型号', width: 100 },
    { key: 'spec', title: '规格', width: 120 },
    { key: 'industry', title: '所属行业', width: 100 },
    { key: 'unit', title: '单位', width: 60 },
    {
      key: 'source',
      title: '来源',
      width: 90,
      render: (row) =>
        row.source === 'custom' ? <Tag tone="info">自己新增</Tag> : <Tag>引用平台产品</Tag>,
    },
  ]

  return (
    <>
      <PageHeader
        breadcrumb={['前台业务平台', '产品碳足迹核算']}
        title="产品碳足迹核算"
        description="一个产品可进行多次核算（多条核算记录）；点击产品查看该产品的全部核算记录"
        actions={
          <Button variant="primary" onClick={() => setPickerOpen(true)}>
            新增产品
          </Button>
        }
      />

      <div className="card">
        <div className="query-bar">
          <div className="query-item">
            <span className="query-label">产品名称 / 编码</span>
            <Input
              value={keyword}
              placeholder="请输入"
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
          <div className="query-actions">
            <Button onClick={() => setKeyword('')}>重置</Button>
            <Button variant="primary" onClick={() => toast('查询完成')}>
              搜索
            </Button>
          </div>
        </div>

        <div className="toolbar">
          <span className="toolbar-title">共 {rows.length} 个产品</span>
          <span className="toolbar-tip">默认按最近核算时间倒序</span>
        </div>

        <div className="pcf-table-wrap">
          <Table
            columns={columns}
            data={pagedRows}
            rowKey={(row) => row.productId}
            loading={loading}
            emptyText="暂无产品核算记录，点击右上角「新增核算」开始"
          />
        </div>

        <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      <Modal
        open={pickerOpen}
        title="选择产品（我的产品库）"
        size="lg"
        onClose={() => setPickerOpen(false)}
        footer={
          <>
            <Button onClick={() => setPickerOpen(false)}>取消</Button>
            <Button variant="primary" disabled={!pickedId} onClick={handlePickConfirm}>
              开始核算
            </Button>
          </>
        }
      >
        <div className="pcf-picker-query">
          <Input
            value={pickerKeyword}
            placeholder="产品编码 / 名称"
            onChange={(e) => {
              setPickerKeyword(e.target.value)
              setPickerPage(1)
            }}
          />
        </div>
        <div className="pcf-table-wrap">
          <Table
            columns={pickerColumns}
            data={pagedPickerRows}
            rowKey={(row) => row.id}
            emptyText="暂无可选产品，请先在「我的产品库」新增或引用产品"
          />
        </div>
        <Pagination
          total={pickerRows.length}
          page={pickerPage}
          pageSize={PICKER_PAGE_SIZE}
          onChange={setPickerPage}
        />
      </Modal>
    </>
  )
}
