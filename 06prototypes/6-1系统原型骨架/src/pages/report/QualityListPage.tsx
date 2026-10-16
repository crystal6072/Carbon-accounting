import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Dialog,
  Empty,
  Form,
  Input,
  MessagePlugin,
  Pagination,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
} from 'tdesign-react'
import {
  createQualityAssessment,
  deleteQualityAssessment,
  fetchCalculatedProjects,
  fetchQualityAssessments,
} from '@/mock/quality'
import type { QualityAssessment, QualityProjectOption, QualityStatus } from '@/types/quality'
import { DQR_LEVEL_TEXT, DQR_LEVEL_THEME, QUALITY_STATUS_TEXT, QUALITY_STATUS_THEME, formatDqr } from './qualityMeta'
import './QualityPage.css'

const PAGE_SIZE = 10

const STATUS_OPTIONS = [
  { label: '未完成', value: 'unfinished' },
  { label: '待更新', value: 'stale' },
  { label: '已完成', value: 'completed' },
]

/**
 * 数据质量评价列表页（`/report/quality`）。
 * 布局口径见《数据质量评价_Demo》§三：标准列表页（筛选表单 + 表格 + 分页）。
 */
export default function QualityListPage() {
  const navigate = useNavigate()

  const [list, setList] = useState<QualityAssessment[]>([])
  const [loading, setLoading] = useState(false)
  const [keywordProject, setKeywordProject] = useState('')
  const [keywordProduct, setKeywordProduct] = useState('')
  const [status, setStatus] = useState<QualityStatus | ''>('')
  const [applied, setApplied] = useState<{ keywordProject: string; keywordProduct: string; status: QualityStatus | '' }>({
    keywordProject: '',
    keywordProduct: '',
    status: '',
  })
  const [page, setPage] = useState(1)

  const [deleteTarget, setDeleteTarget] = useState<QualityAssessment | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [projectOptions, setProjectOptions] = useState<QualityProjectOption[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setList(await fetchQualityAssessments(applied))
    } finally {
      setLoading(false)
    }
  }, [applied])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [applied])

  const pagedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return list.slice(start, start + PAGE_SIZE)
  }, [list, page])

  const openCreate = async () => {
    setCreateOpen(true)
    setSelectedProjectId('')
    try {
      setProjectOptions(await fetchCalculatedProjects())
    } catch (error) {
      MessagePlugin.error(error instanceof Error ? error.message : '加载失败')
    }
  }

  const handleCreate = async () => {
    if (!selectedProjectId) return
    setCreating(true)
    try {
      const assessment = await createQualityAssessment(selectedProjectId)
      MessagePlugin.success('创建成功')
      setCreateOpen(false)
      navigate(`/report/quality/${assessment.id}`)
    } catch (error) {
      MessagePlugin.error(error instanceof Error ? error.message : '创建失败')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteQualityAssessment(deleteTarget.id)
      MessagePlugin.success('删除成功')
      setDeleteTarget(null)
      await load()
    } catch (error) {
      MessagePlugin.error(error instanceof Error ? error.message : '删除失败')
    }
  }

  const selectedProject = projectOptions.find((item) => item.id === selectedProjectId)

  const columns = [
    {
      colKey: 'seq',
      title: '序号',
      width: 64,
      cell: ({ rowIndex }: { rowIndex: number }) => (page - 1) * PAGE_SIZE + rowIndex + 1,
    },
    {
      colKey: 'sourceProjectName',
      title: '核算项目',
      width: 220,
      cell: ({ row }: { row: QualityAssessment }) => (
        <a className="q-link" onClick={() => navigate(`/report/quality/${row.id}`)}>
          {row.sourceProjectName}
        </a>
      ),
    },
    {
      colKey: 'productName',
      title: '产品名称',
      width: 200,
      cell: ({ row }: { row: QualityAssessment }) => row.productName,
    },
    {
      colKey: 'overallDqr',
      title: '整体 DQR',
      width: 150,
      cell: ({ row }: { row: QualityAssessment }) =>
        row.overallDqr == null ? (
          <span className="q-empty-cell">-</span>
        ) : (
          <span className="q-num">
            {formatDqr(row.overallDqr)} ·{' '}
            <Tag theme={DQR_LEVEL_THEME[row.overallLevel ?? 'fair']} variant="light">
              {DQR_LEVEL_TEXT[row.overallLevel ?? 'fair']}
            </Tag>
          </span>
        ),
    },
    {
      colKey: 'resultUpdatedAt',
      title: '评价结果更新时间',
      width: 200,
      cell: ({ row }: { row: QualityAssessment }) => <span className="q-nowrap">{row.resultUpdatedAt}</span>,
    },
    {
      colKey: 'status',
      title: '评价状态',
      width: 120,
      cell: ({ row }: { row: QualityAssessment }) => (
        <Tag theme={QUALITY_STATUS_THEME[row.status]} variant="light">
          {QUALITY_STATUS_TEXT[row.status]}
        </Tag>
      ),
    },
    {
      colKey: 'op',
      title: '操作',
      width: 140,
      cell: ({ row }: { row: QualityAssessment }) => (
        <Space size="small">
          <a className="q-link" onClick={() => navigate(`/report/quality/${row.id}`)}>
            查看
          </a>
          <Popconfirm
            theme="danger"
            content="删除数据质量评价将同时移除全部评分，不影响来源核算项目，删除后不可恢复。确认删除？"
            onConfirm={() => setDeleteTarget(row)}
          >
            <a className="q-link q-link-danger">删除</a>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className="q-page">
      <div className="q-page-head">
        <div className="q-breadcrumb">产品碳足迹 / 报告管理 / 数据质量评价</div>
        <h2 className="q-page-title">数据质量评价</h2>
        <p className="q-page-desc">基于已核算项目，量化活动数据与排放因子的不确定性，评估清单分析结果的数据质量</p>
      </div>

      <Card bordered>
        <Form layout="inline" labelWidth="auto">
          <Form.FormItem label="核算项目">
            <Input value={keywordProject} placeholder="请输入" clearable onChange={(value) => setKeywordProject(String(value ?? ''))} />
          </Form.FormItem>
          <Form.FormItem label="产品名称">
            <Input value={keywordProduct} placeholder="请输入" clearable onChange={(value) => setKeywordProduct(String(value ?? ''))} />
          </Form.FormItem>
          <Form.FormItem label="评价状态">
            <Select
              value={status}
              options={STATUS_OPTIONS}
              placeholder="请选择"
              clearable
              onChange={(value) => setStatus((value ?? '') as QualityStatus | '')}
            />
          </Form.FormItem>
          <Form.FormItem label=" ">
            <Space size="small">
              <Button
                variant="outline"
                onClick={() => {
                  setKeywordProject('')
                  setKeywordProduct('')
                  setStatus('')
                  setApplied({ keywordProject: '', keywordProduct: '', status: '' })
                }}
              >
                重置
              </Button>
              <Button theme="primary" onClick={() => setApplied({ keywordProject, keywordProduct, status })}>
                查询
              </Button>
            </Space>
          </Form.FormItem>
        </Form>

        <div className="q-toolbar">
          <span className="q-toolbar-title">共 {list.length} 条</span>
          <span className="q-toolbar-tip">默认按评价结果更新时间倒序</span>
          <span className="q-toolbar-action">
            <Button theme="primary" onClick={openCreate}>
              新增数据质量评价
            </Button>
          </span>
        </div>

        {list.length === 0 && !loading ? (
          <Empty description="暂无数据质量评价" action={<span className="q-empty-tip">请先在「产品碳足迹核算」中完成核算后创建</span>} />
        ) : (
          <>
            <Table
              rowKey="id"
              data={pagedRows}
              columns={columns}
              loading={loading}
              size="small"
              maxHeight="100%"
              empty="暂无数据"
            />
            <div className="q-pagination">
              <Pagination current={page} total={list.length} pageSize={PAGE_SIZE} onChange={(info) => setPage(info.current)} />
            </div>
          </>
        )}
      </Card>

      {/* 新增数据质量评价：选择「已核算」核算项目 */}
      <Dialog
        visible={createOpen}
        header="新增数据质量评价"
        width="560px"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button theme="primary" disabled={!selectedProjectId} loading={creating} onClick={handleCreate}>
              确定
            </Button>
          </>
        }
      >
        <Form labelWidth="96px">
          <Form.FormItem label={<span className="q-required">核算项目</span>}>
            <Select
              value={selectedProjectId}
              options={projectOptions.map((item) => ({
                label: `${item.name}（${item.productName} · ${item.boundary}）`,
                value: item.id,
              }))}
              placeholder={projectOptions.length ? '请选择核算项目' : '暂无可用于数据质量评价的核算项目'}
              disabled={!projectOptions.length}
              filterable
              onChange={(value) => setSelectedProjectId(String(value ?? ''))}
            />
          </Form.FormItem>
        </Form>

        {!projectOptions.length ? (
          <Alert theme="warning" message="暂无可用于数据质量评价的核算项目，请先完成核算" />
        ) : null}

        {selectedProject ? (
          <Descriptions column={2} bordered size="small" className="q-create-preview">
            <Descriptions.DescriptionsItem label="产品名称">{selectedProject.productName}</Descriptions.DescriptionsItem>
            <Descriptions.DescriptionsItem label="系统边界">{selectedProject.boundary}</Descriptions.DescriptionsItem>
            <Descriptions.DescriptionsItem label="声明单位">{selectedProject.functionalUnit}</Descriptions.DescriptionsItem>
            <Descriptions.DescriptionsItem label="统计时间">{selectedProject.statisticalPeriod}</Descriptions.DescriptionsItem>
            <Descriptions.DescriptionsItem label="基准结果">
              {selectedProject.baselineEmission} kgCO₂e（V{selectedProject.baselineVersion}）
            </Descriptions.DescriptionsItem>
            <Descriptions.DescriptionsItem label="核算时间">{selectedProject.baselineCalculatedAt}</Descriptions.DescriptionsItem>
          </Descriptions>
        ) : null}
      </Dialog>

      {/* 删除二次确认 */}
      <Dialog
        visible={!!deleteTarget}
        header="确认删除"
        width="480px"
        theme="danger"
        onClose={() => setDeleteTarget(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button theme="danger" onClick={handleDelete}>
              确认删除
            </Button>
          </>
        }
      >
        删除数据质量评价将同时移除全部评分，不影响来源核算项目，删除后不可恢复。
        {deleteTarget ? `确认删除「${deleteTarget.sourceProjectName} 数据质量评价」？` : ''}
      </Dialog>
    </div>
  )
}
