import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  Form,
  Input,
  Select,
  DateRangePicker,
  Table,
  Tag,
  Button,
  Space,
  Pagination,
  Empty,
  Dialog,
  Descriptions,
  Alert,
  Popconfirm,
  MessagePlugin,
} from 'tdesign-react'
import type { PrimaryTableCol } from 'tdesign-react'
import type { PcfFootprintReport, ReportProjectOption } from '@/types/report'
import {
  fetchReports,
  fetchCalculatedProjectsForReport,
  generateReport,
  deleteReport,
} from '@/mock/report'
import { REPORT_STATUS_TEXT, REPORT_STATUS_TAG } from './reportMeta'
import './ReportPage.css'

const PAGE_SIZE = 10

export default function ReportListPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<PcfFootprintReport[]>([])
  const [productName, setProductName] = useState('')
  const [status, setStatus] = useState<string>('')
  const [range, setRange] = useState<[string, string] | null>(null)
  const [page, setPage] = useState(1)

  // 新增弹窗
  const [genVisible, setGenVisible] = useState(false)
  const [genLoading, setGenLoading] = useState(false)
  const [projects, setProjects] = useState<ReportProjectOption[]>([])
  const [genProjectId, setGenProjectId] = useState<string | undefined>(undefined)

  const load = () => {
    setLoading(true)
    fetchReports({ productName, status: status as PcfFootprintReport['status'] | '', generatedRange: range })
      .then(setData)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const paged = useMemo(() => data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [data, page])

  const openGen = () => {
    setGenVisible(true)
    setGenProjectId(undefined)
    fetchCalculatedProjectsForReport().then(setProjects)
  }

  const doGenerate = async () => {
    if (!genProjectId) return
    setGenLoading(true)
    try {
      const report = await generateReport(genProjectId)
      MessagePlugin.success('报告草稿已创建，请完善封面信息后生成正式报告')
      setGenVisible(false)
      navigate(`/report/prepare/${report.id}`)
    } catch (e) {
      MessagePlugin.error((e as Error).message || '生成失败')
    } finally {
      setGenLoading(false)
    }
  }

  const doDelete = async (id: string) => {
    try {
      await deleteReport(id)
      MessagePlugin.success('已删除')
      load()
    } catch (e) {
      MessagePlugin.error((e as Error).message || '删除失败')
    }
  }

  const selectedProject = projects.find((p) => p.id === genProjectId)

  const columns: PrimaryTableCol<PcfFootprintReport>[] = [
    { colKey: 'seq', title: '序号', width: 64 },
    {
      colKey: 'productName',
      title: '产品名称',
      width: 200,
      cell: ({ row }) => (
        <a className="rp-link" onClick={() => navigate(`/report/prepare/${row.id}`)}>
          {row.productName}
        </a>
      ),
    },
    {
      colKey: 'sourceProjectName',
      title: '核算项目',
      width: 220,
      cell: ({ row }) => <span>{row.sourceProjectName}</span>,
    },
    {
      colKey: 'status',
      title: '报告状态',
      width: 110,
      cell: ({ row }) => {
        const tag = REPORT_STATUS_TAG[row.status]
        return (
          <Tag theme={tag.theme} variant={tag.variant}>
            {REPORT_STATUS_TEXT[row.status]}
          </Tag>
        )
      },
    },
    { colKey: 'generatedAt', title: '报告生成时间', width: 180, cell: ({ row }) => row.generatedAt || '-' },
    {
      colKey: 'op',
      title: '操作',
      width: 140,
      cell: ({ row }) => (
        <Space className="rp-table-op">
          <a className="rp-link" onClick={() => navigate(`/report/prepare/${row.id}`)}>
            查看
          </a>
          <Popconfirm
            content="删除报告后不可恢复，不影响来源核算项目。确认删除？"
            theme="danger"
            onConfirm={() => doDelete(row.id)}
          >
            <a className="rp-link" style={{ color: 'var(--td-error-color, #d54941)' }}>
              删除
            </a>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const pagedData = paged.map((row, i) => ({ ...row, seq: (page - 1) * PAGE_SIZE + i + 1 }))

  return (
    <div className="report-wrap">
      <div className="rp-breadcrumb">
        <span>产品碳足迹</span>
        <span className="rp-sep">/</span>
        <span>报告管理</span>
        <span className="rp-sep">/</span>
        <span>报告编制</span>
      </div>
      <div className="rp-title-row">
        <div>
          <h2>报告编制</h2>
          <p className="rp-page-desc">基于已核算项目，一键生成符合标准披露要求的产品碳足迹报告</p>
        </div>
        <Button theme="primary" onClick={openGen}>
          新增报告
        </Button>
      </div>

      <Card>
        <Form layout="inline" labelWidth={76}>
          <Form.FormItem label="产品名称">
            <Input value={productName} onChange={setProductName} clearable placeholder="请输入" />
          </Form.FormItem>
          <Form.FormItem label="报告状态">
            <Select
              value={status}
              onChange={(v) => setStatus(v as string)}
              clearable
              placeholder="请选择"
              style={{ width: 160 }}
              options={[
                { label: '生成中', value: 'reportGenerating' },
                { label: '编制中', value: 'reportEditing' },
                { label: '已生成', value: 'reportReady' },
                { label: '待更新', value: 'reportStale' },
              ]}
            />
          </Form.FormItem>
          <Form.FormItem label="生成时间">
            <DateRangePicker value={range as unknown as string[]} onChange={(v) => setRange((v as [string, string]) ?? null)} clearable />
          </Form.FormItem>
          <Form.FormItem>
            <Space>
              <Button
                variant="outline"
                onClick={() => {
                  setProductName('')
                  setStatus('')
                  setRange(null)
                  setPage(1)
                }}
              >
                重置
              </Button>
              <Button
                theme="primary"
                onClick={() => {
                  setPage(1)
                  load()
                }}
              >
                查询
              </Button>
            </Space>
          </Form.FormItem>
        </Form>

        <div style={{ margin: '12px 0 4px', color: 'var(--td-text-color-secondary, #8a8f99)', fontSize: 13 }}>
          共 {data.length} 条
        </div>

        <Table
          rowKey="id"
          loading={loading}
          data={pagedData}
          columns={columns}
          empty={<Empty description="暂无报告，请先在「产品碳足迹核算」中完成核算后生成" />}
        />
        {data.length > PAGE_SIZE && (
          <Pagination
            style={{ marginTop: 16 }}
            current={page}
            pageSize={PAGE_SIZE}
            total={data.length}
            showJumper
            onChange={(p: any) => setPage(typeof p === 'number' ? p : p.current)}
          />
        )}
      </Card>

      <Dialog
        header="新增报告"
        visible={genVisible}
        onClose={() => setGenVisible(false)}
        onConfirm={doGenerate}
        confirmBtn={{ content: '生成报告', loading: genLoading, disabled: !genProjectId }}
        cancelBtn={{ content: '取消' }}
        width={640}
      >
        {projects.length === 0 ? (
          <Alert theme="warning" message="暂无可生成报告的核算项目，请先完成核算" />
        ) : (
          <Form labelWidth={96}>
            <Form.FormItem label="核算项目" requiredMark>
              <Select
                value={genProjectId}
                onChange={(v) => setGenProjectId(v as string)}
                filterable
                placeholder="请选择已核算项目"
                options={projects.map((p) => ({
                  label: `${p.productName}（${p.name} · ${p.boundary}）`,
                  value: p.id,
                }))}
              />
            </Form.FormItem>
            {selectedProject && (
              <Descriptions column={2} bordered size="small" style={{ marginTop: 8 }}>
                <Descriptions.DescriptionsItem label="产品名称">{selectedProject.productName}</Descriptions.DescriptionsItem>
                <Descriptions.DescriptionsItem label="系统边界">{selectedProject.boundary}</Descriptions.DescriptionsItem>
                <Descriptions.DescriptionsItem label="声明单位">{selectedProject.functionalUnit}</Descriptions.DescriptionsItem>
                <Descriptions.DescriptionsItem label="统计时间">{selectedProject.statisticalPeriod}</Descriptions.DescriptionsItem>
                <Descriptions.DescriptionsItem label="报告主体">
                  {selectedProject.enterpriseName || <Tag theme="warning" variant="light">企业信息待补录</Tag>}
                </Descriptions.DescriptionsItem>
                <Descriptions.DescriptionsItem label="核算结果版本">V{selectedProject.baselineVersion}</Descriptions.DescriptionsItem>
                <Descriptions.DescriptionsItem label="核算时间">{selectedProject.baselineCalculatedAt}</Descriptions.DescriptionsItem>
              </Descriptions>
            )}
            <Alert
              theme="info"
              style={{ marginTop: 12 }}
              message="系统会先创建「编制中」报告草稿，自动继承核算项目中的产品信息，并按项目引用的「企业信息库」记录带入企业字段；未引用或缺失的字段可在下一页补录，也可直接引用企业信息库记录。"
            />
          </Form>
        )}
      </Dialog>
    </div>
  )
}
