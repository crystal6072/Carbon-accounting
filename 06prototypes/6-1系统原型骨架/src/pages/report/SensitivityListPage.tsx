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
  createSensitivityAnalysis,
  deleteSensitivityAnalysis,
  fetchCalculatedProjects,
  fetchSensitivityAnalyses,
} from '@/mock/sensitivity'
import type { SensitivityAnalysis, SensitivityProjectOption, SensitivityStatus } from '@/types/sensitivity'
import { SA_STATUS_THEME, SA_STATUS_TEXT, formatEmission } from './sensitivityMeta'
import './SensitivityPage.css'

const PAGE_SIZE = 10

const STATUS_OPTIONS = [
  { label: '未完成', value: 'unfinished' },
  { label: '待更新', value: 'stale' },
  { label: '已完成', value: 'completed' },
]

interface QueryState {
  keywordProject: string
  keywordProduct: string
  status: SensitivityStatus | ''
}

/**
 * 敏感性分析列表页（`/report/sensitivity`）。
 * 布局口径见《敏感性分析_Demo》V0.2：标准列表页（筛选表单 + 表格 + 分页），
 * **不使用**竞品的「右表格 + 右侧摘要面板」结构。
 */
export default function SensitivityListPage() {
  const navigate = useNavigate()

  const [list, setList] = useState<SensitivityAnalysis[]>([])
  const [loading, setLoading] = useState(false)
  const [keywordProject, setKeywordProject] = useState('')
  const [keywordProduct, setKeywordProduct] = useState('')
  const [status, setStatus] = useState<SensitivityStatus | ''>('')
  const [applied, setApplied] = useState<QueryState>({ keywordProject: '', keywordProduct: '', status: '' })
  const [page, setPage] = useState(1)

  const [deleteTarget, setDeleteTarget] = useState<SensitivityAnalysis | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [projectOptions, setProjectOptions] = useState<SensitivityProjectOption[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setList(await fetchSensitivityAnalyses(applied))
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
      const analysis = await createSensitivityAnalysis(selectedProjectId)
      MessagePlugin.success('创建成功')
      setCreateOpen(false)
      navigate(`/report/sensitivity/${analysis.id}`)
    } catch (error) {
      MessagePlugin.error(error instanceof Error ? error.message : '创建失败')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteSensitivityAnalysis(deleteTarget.id)
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
      cell: ({ row }: { row: SensitivityAnalysis }) => (
        <a className="sa-link" onClick={() => navigate(`/report/sensitivity/${row.id}`)}>
          {row.sourceProjectName}
        </a>
      ),
    },
    {
      colKey: 'productName',
      title: '产品名称',
      width: 200,
      cell: ({ row }: { row: SensitivityAnalysis }) => row.productName,
    },
    {
      colKey: 'baselineEmission',
      title: '基准碳足迹结果',
      width: 170,
      cell: ({ row }: { row: SensitivityAnalysis }) => (
        <span className="sa-num">{formatEmission(row.baselineEmission)} kgCO₂e</span>
      ),
    },
    {
      colKey: 'resultUpdatedAt',
      title: '分析结果更新时间',
      width: 190,
      cell: ({ row }: { row: SensitivityAnalysis }) => <span className="sa-nowrap">{row.resultUpdatedAt}</span>,
    },
    {
      colKey: 'status',
      title: '分析状态',
      width: 120,
      cell: ({ row }: { row: SensitivityAnalysis }) => (
        <Tag theme={SA_STATUS_THEME[row.status]} variant="light">
          {SA_STATUS_TEXT[row.status]}
        </Tag>
      ),
    },
    {
      colKey: 'op',
      title: '操作',
      width: 130,
      cell: ({ row }: { row: SensitivityAnalysis }) => (
        <Space size="small">
          <a className="sa-link" onClick={() => navigate(`/report/sensitivity/${row.id}`)}>
            查看
          </a>
          <Popconfirm
            theme="danger"
            content="删除分析单将同时移除全部情景，不影响来源核算项目，删除后不可恢复。确认删除？"
            onConfirm={() => setDeleteTarget(row)}
          >
            <a className="sa-link sa-link-danger">删除</a>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className="sa-page">
      <div className="sa-page-head">
        <div className="sa-page-head-row">
          <div>
            <div className="sa-breadcrumb">产品碳足迹 / 报告管理 / 敏感性分析</div>
            <h2 className="sa-page-title">敏感性分析</h2>
            <p className="sa-page-desc">基于已核算项目，评估关键假设、方法和数据选择对碳足迹结果的影响</p>
          </div>
          <Button theme="primary" onClick={() => void openCreate()}>
            新增敏感性分析
          </Button>
        </div>
      </div>

      <Card bordered title={null}>
        <Form layout="inline" labelWidth="auto">
          <Form.FormItem label="核算项目">
            <Input
              value={keywordProject}
              placeholder="请输入"
              clearable
              onChange={(value) => setKeywordProject(String(value ?? ''))}
            />
          </Form.FormItem>
          <Form.FormItem label="产品名称">
            <Input
              value={keywordProduct}
              placeholder="请输入"
              clearable
              onChange={(value) => setKeywordProduct(String(value ?? ''))}
            />
          </Form.FormItem>
          <Form.FormItem label="分析状态">
            <Select
              value={status}
              options={STATUS_OPTIONS}
              placeholder="请选择"
              clearable
              onChange={(value) => setStatus((value ?? '') as SensitivityStatus | '')}
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

        <div className="sa-toolbar">
          <span className="sa-toolbar-title">共 {list.length} 条</span>
          <span className="sa-toolbar-tip">默认按分析结果更新时间倒序</span>
        </div>

        {list.length === 0 && !loading ? (
          <Empty
            description="暂无敏感性分析"
            action={
              <Button theme="primary" onClick={() => void openCreate()}>
                新增敏感性分析
              </Button>
            }
          />
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
            <div className="sa-pagination">
              <Pagination
                current={page}
                total={list.length}
                pageSize={PAGE_SIZE}
                onChange={(info) => setPage(info.current)}
              />
            </div>
          </>
        )}
      </Card>

      {/* 新增敏感性分析：选择「已核算」核算项目 */}
      <Dialog
        visible={createOpen}
        header="新增敏感性分析"
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
          <Form.FormItem label={<span className="sa-required">核算项目</span>}>
            <Select
              value={selectedProjectId}
              options={projectOptions.map((item) => ({
                label: `${item.name}（${item.productName} · ${item.boundary}）`,
                value: item.id,
              }))}
              placeholder={projectOptions.length ? '请选择核算项目' : '暂无可用于敏感性分析的核算项目'}
              disabled={!projectOptions.length}
              filterable
              onChange={(value) => setSelectedProjectId(String(value ?? ''))}
            />
          </Form.FormItem>
        </Form>

        {!projectOptions.length ? (
          <Alert theme="warning" message="暂无可用于敏感性分析的核算项目，请先完成核算" />
        ) : null}

        {selectedProject ? (
          <Descriptions column={2} bordered size="small" className="sa-create-preview">
            <Descriptions.DescriptionsItem label="产品名称">{selectedProject.productName}</Descriptions.DescriptionsItem>
            <Descriptions.DescriptionsItem label="系统边界">{selectedProject.boundary}</Descriptions.DescriptionsItem>
            <Descriptions.DescriptionsItem label="声明单位">{selectedProject.functionalUnit}</Descriptions.DescriptionsItem>
            <Descriptions.DescriptionsItem label="统计时间">{selectedProject.statisticalPeriod}</Descriptions.DescriptionsItem>
            <Descriptions.DescriptionsItem label="基准结果">
              {formatEmission(selectedProject.baselineEmission)} kgCO₂e（V{selectedProject.baselineVersion}）
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
        删除分析单将同时移除全部情景，不影响来源核算项目，删除后不可恢复。
        {deleteTarget ? `确认删除「${deleteTarget.sourceProjectName} 敏感性分析」？` : ''}
      </Dialog>
    </div>
  )
}
