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
  Drawer,
  Descriptions,
  Alert,
  Popconfirm,
  MessagePlugin,
} from 'tdesign-react'
import type { PrimaryTableCol } from 'tdesign-react'
import type { PcfFootprintReport, ReportProjectOption, ReportTemplate } from '@/types/report'
import {
  fetchReports,
  fetchCalculatedProjectsForReport,
  fetchReportTemplates,
  generateReport,
  regenerateReport,
  deleteReport,
} from '@/mock/report'
import { REPORT_STATUS_TEXT, REPORT_STATUS_TAG, formatEmission } from './reportMeta'
import ReportPreview from './ReportPreview'
import { downloadReportFile } from './reportDownload'
import './ReportPage.css'

const PAGE_SIZE = 10

/** 已生成 / 待更新报告可预览、下载、更新；编制中草稿尚无正式报告文件 */
const isReportReady = (report: PcfFootprintReport) =>
  report.status === 'reportReady' || report.status === 'reportStale'

/** 编制中（含系统生成占位态）：主操作是「继续编制」，而非只读预览 */
const isReportDraft = (report: PcfFootprintReport) =>
  report.status === 'reportEditing' || report.status === 'reportGenerating'

export default function ReportListPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<PcfFootprintReport[]>([])
  const [productName, setProductName] = useState('')
  const [reportNo, setReportNo] = useState('')
  const [status, setStatus] = useState<string>('')
  const [range, setRange] = useState<[string, string] | null>(null)
  const [page, setPage] = useState(1)

  // 列表「预览」：打开报告预览（预览内可下载）
  const [previewReport, setPreviewReport] = useState<PcfFootprintReport | null>(null)
  // 列表「更新报告」：同步最新核算数据后直接进入报告编辑页
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  // 新增弹窗
  const [genVisible, setGenVisible] = useState(false)
  const [genLoading, setGenLoading] = useState(false)
  const [projects, setProjects] = useState<ReportProjectOption[]>([])
  const [genProjectId, setGenProjectId] = useState<string | undefined>(undefined)
  /** 报告模板下拉：取自系统管理后台已启用的报告模板配置 */
  const [templates, setTemplates] = useState<ReportTemplate[]>([])
  const [genTemplateId, setGenTemplateId] = useState<string | undefined>(undefined)
  /** 已存在报告的核算项目：避免重复创建同名报告 */
  const [existingProjectIds, setExistingProjectIds] = useState<Set<string>>(new Set())

  const load = (q?: {
    productName?: string
    reportNo?: string
    status?: string
    range?: [string, string] | null
  }) => {
    const params = q ?? { productName, reportNo, status, range }
    setLoading(true)
    fetchReports({
      productName: params.productName ?? '',
      reportNo: params.reportNo ?? '',
      status: (params.status ?? '') as PcfFootprintReport['status'] | '',
      createdRange: params.range ?? null,
    })
      .then(setData)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const paged = useMemo(() => data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [data, page])

  const doQuery = () => {
    setPage(1)
    load()
  }

  const doReset = () => {
    setProductName('')
    setReportNo('')
    setStatus('')
    setRange(null)
    setPage(1)
    load({ productName: '', reportNo: '', status: '', range: null })
  }

  const openGen = () => {
    setGenVisible(true)
    setGenProjectId(undefined)
    setGenTemplateId(undefined)
    Promise.all([fetchCalculatedProjectsForReport(), fetchReports(), fetchReportTemplates()])
      .then(([projectOptions, allReports, templateOptions]) => {
        setProjects(projectOptions)
        setExistingProjectIds(new Set(allReports.map((r) => r.sourceProjectId)))
        setTemplates(templateOptions)
        // 默认选中第一个已启用模板（通常为系统预置模板）
        setGenTemplateId((prev) => prev || templateOptions[0]?.templateId || undefined)
      })
      .catch(() => {
        setProjects([])
        setTemplates([])
      })
  }

  const doGenerate = async () => {
    if (!genProjectId || !genTemplateId) return
    setGenLoading(true)
    try {
      const report = await generateReport(genProjectId, genTemplateId)
      MessagePlugin.success('报告草稿已创建，请补充企业信息后生成正式报告')
      setGenVisible(false)
      navigate(`/report/prepare/${report.id}`)
    } catch (e) {
      MessagePlugin.error((e as Error).message || '生成失败')
    } finally {
      setGenLoading(false)
    }
  }

  /** 列表「更新报告」：同步最新上游数据后直接进入报告编辑页（不再二次确认） */
  const doUpdate = async (row: PcfFootprintReport) => {
    setUpdatingId(row.id)
    try {
      await regenerateReport(row.id)
      MessagePlugin.success('已同步最新核算数据，请调整报告内容后生成正式报告')
      navigate(`/report/prepare/${row.id}`)
    } catch (e) {
      MessagePlugin.error((e as Error).message || '更新报告失败')
    } finally {
      setUpdatingId(null)
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

  const handleDownload = async (row: PcfFootprintReport) => {
    setDownloadingId(row.id)
    try {
      await downloadReportFile(row.id)
    } catch (e) {
      MessagePlugin.error((e as Error).message || '下载失败')
    } finally {
      setDownloadingId(null)
    }
  }

  const selectedProject = projects.find((p) => p.id === genProjectId)
  const selectedTemplate = templates.find((t) => t.templateId === genTemplateId)

  const columns: PrimaryTableCol<PcfFootprintReport>[] = [
    { colKey: 'seq', title: '序号', width: 64 },
    {
      colKey: 'reportNo',
      title: '报告编号',
      width: 176,
      cell: ({ row }) => (
        <a
          className="rp-link rp-report-no"
          title="进入报告编制 / 详情"
          onClick={() => navigate(`/report/prepare/${row.id}`)}
        >
          {row.reportNo}
        </a>
      ),
    },
    {
      colKey: 'productName',
      title: '产品名称',
      width: 170,
      cell: ({ row }) => (
        <a className="rp-link" title="进入报告编制 / 详情" onClick={() => navigate(`/report/prepare/${row.id}`)}>
          {row.productName}
        </a>
      ),
    },
    {
      colKey: 'sourceProjectName',
      title: '核算项目',
      width: 190,
      cell: ({ row }) => (
        <a
          className="rp-link"
          title="查看来源核算项目"
          onClick={() => navigate(`/pcf/project/${row.sourceProjectId}`)}
        >
          {row.sourceProjectName}
        </a>
      ),
    },
    {
      colKey: 'status',
      title: '报告状态',
      width: 104,
      cell: ({ row }) => {
        const tag = REPORT_STATUS_TAG[row.status]
        return (
          <Tag theme={tag.theme} variant={tag.variant}>
            {REPORT_STATUS_TEXT[row.status]}
          </Tag>
        )
      },
    },
    { colKey: 'createdAt', title: '创建时间', width: 168, cell: ({ row }) => row.createdAt || '-' },
    { colKey: 'updatedAt', title: '更新时间', width: 168, cell: ({ row }) => row.updatedAt || '-' },
    {
      colKey: 'op',
      title: '操作',
      width: 320,
      fixed: 'right',
      cell: ({ row }) => {
        const canUpdate = isReportReady(row) && !row.sourceDeleted
        const updateTip = row.sourceDeleted
          ? '来源核算项目已删除，无法更新报告'
          : '同步最新核算数据并进入报告编辑页'
        return (
          <Space className="rp-table-op">
            {isReportDraft(row) && (
              <a className="rp-link" data-ann-target="rp.list.edit" onClick={() => navigate(`/report/prepare/${row.id}`)}>
                继续编制
              </a>
            )}
            {!isReportDraft(row) && (
              <a
                className="rp-link"
                data-ann-target="rp.list.view"
                title="查看报告详情"
                onClick={() => navigate(`/report/prepare/${row.id}?mode=view`)}
              >
                查看
              </a>
            )}
            {isReportReady(row) && (
              <a className="rp-link" data-ann-target="rp.list.preview" title="预览报告文件" onClick={() => setPreviewReport(row)}>
                预览
              </a>
            )}
            {isReportReady(row) && (
              <a
                className="rp-link"
                data-ann-target="rp.list.download"
                onClick={() => handleDownload(row)}
              >
                {downloadingId === row.id ? '下载中…' : '下载'}
              </a>
            )}
            {isReportReady(row) && (
              <a
                className={`rp-link${canUpdate ? '' : ' rp-link--disabled'}`}
                data-ann-target="rp.list.regen"
                title={updateTip}
                onClick={() => {
                  if (canUpdate) void doUpdate(row)
                }}
              >
                {updatingId === row.id ? '更新中…' : '更新报告'}
              </a>
            )}
            <Popconfirm
              content="删除报告后不可恢复，不影响来源核算项目。确认删除？"
              theme="danger"
              onConfirm={() => doDelete(row.id)}
            >
              <a className="rp-link" style={{ color: 'var(--td-error-color, #d54941)' }} data-ann-target="rp.delete">
                删除
              </a>
            </Popconfirm>
          </Space>
        )
      },
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
          <h2 data-ann-target="rp.page.title">报告编制</h2>
        </div>
        <Button theme="primary" onClick={openGen} data-ann-target="rp.add">
          新增报告
        </Button>
      </div>

      <Card>
        <Form layout="inline" labelWidth={76} data-ann-target="rp.filter">
          <Form.FormItem label="产品名称">
            <Input
              value={productName}
              onChange={setProductName}
              onEnter={doQuery}
              clearable
              placeholder="请输入"
              style={{ width: 180 }}
            />
          </Form.FormItem>
          <Form.FormItem label="报告编号">
            <Input
              value={reportNo}
              onChange={setReportNo}
              onEnter={doQuery}
              clearable
              placeholder="如 PCF-R-20261016"
              style={{ width: 190 }}
            />
          </Form.FormItem>
          <Form.FormItem label="报告状态">
            <Select
              value={status}
              onChange={(v) => setStatus(v as string)}
              clearable
              placeholder="请选择"
              style={{ width: 140 }}
              options={[
                { label: '编制中', value: 'reportEditing' },
                { label: '已生成', value: 'reportReady' },
                { label: '待更新', value: 'reportStale' },
              ]}
            />
          </Form.FormItem>
          <Form.FormItem label="创建时间">
            <DateRangePicker value={range as unknown as string[]} onChange={(v) => setRange((v as [string, string]) ?? null)} clearable />
          </Form.FormItem>
          <Form.FormItem>
            <Space>
              <Button variant="outline" onClick={doReset}>
                重置
              </Button>
              <Button theme="primary" onClick={doQuery}>
                查询
              </Button>
            </Space>
          </Form.FormItem>
        </Form>

        <div style={{ margin: '12px 0 4px', color: 'var(--td-text-color-secondary, #8a8f99)', fontSize: 13 }} data-ann-target="rp.toolbar">
          共 {data.length} 条
        </div>

        <div data-ann-target="rp.table">
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
        </div>
      </Card>

      <Dialog
        header="新增报告"
        visible={genVisible}
        onClose={() => setGenVisible(false)}
        onConfirm={doGenerate}
        confirmBtn={{ content: '生成报告草稿', loading: genLoading, disabled: !genProjectId || !genTemplateId }}
        cancelBtn={{ content: '取消' }}
        width={680}
      >
        <Form labelWidth={110}>
          {projects.length === 0 && (
            <Alert theme="warning" message="暂无可生成报告的核算项目，请先完成核算" />
          )}
          {templates.length === 0 && (
            <Alert
              theme="warning"
              style={{ marginTop: projects.length === 0 ? 12 : 0 }}
              message="暂无可用报告模板，请先在系统管理后台「系统参数配置 → 报告模板」中启用模板"
            />
          )}
          {projects.length > 0 && (
            <>
              <Form.FormItem label="核算项目" requiredMark>
                <Select
                  value={genProjectId}
                  onChange={(v) => setGenProjectId(v as string)}
                  filterable
                  placeholder="请选择已核算项目"
                  options={projects.map((p) => ({
                    label: `${p.productName}（${p.name} · ${p.boundary}）${
                      existingProjectIds.has(p.id) ? ' · 已有报告' : ''
                    }`,
                    value: p.id,
                  }))}
                />
              </Form.FormItem>
              <Form.FormItem
                label="报告模板"
                requiredMark
                help="选项来自系统管理后台「系统参数配置 → 报告模板」中已启用的模板；停用或删除后不再出现在下拉中"
              >
                <Select
                  value={genTemplateId}
                  onChange={(v) => setGenTemplateId(v as string)}
                  filterable
                  placeholder="请选择报告模板"
                  options={templates.map((t) => ({
                    label: `${t.templateName}（${t.templateNo ?? t.templateId} · ${t.templateVersion}${
                      t.templateType ? ` · ${t.templateType}` : ''
                    }${t.industry ? ` · ${t.industry}` : ''}）`,
                    value: t.templateId,
                  }))}
                />
              </Form.FormItem>
              {selectedProject && (
                <>
                  <Descriptions column={2} bordered size="small" style={{ marginTop: 8 }}>
                    <Descriptions.DescriptionsItem label="产品名称">{selectedProject.productName}</Descriptions.DescriptionsItem>
                    <Descriptions.DescriptionsItem label="系统边界">{selectedProject.boundary}</Descriptions.DescriptionsItem>
                    <Descriptions.DescriptionsItem label="声明单位">{selectedProject.functionalUnit}</Descriptions.DescriptionsItem>
                    <Descriptions.DescriptionsItem label="统计时间">{selectedProject.statisticalPeriod}</Descriptions.DescriptionsItem>
                    <Descriptions.DescriptionsItem label="基准碳足迹结果">
                      {formatEmission(selectedProject.baselineEmission)} kgCO₂eq/{selectedProject.functionalUnit}
                    </Descriptions.DescriptionsItem>
                    <Descriptions.DescriptionsItem label="核算结果版本">
                      V{selectedProject.baselineVersion}
                    </Descriptions.DescriptionsItem>
                    <Descriptions.DescriptionsItem label="报告主体">
                      {selectedProject.enterpriseName || <Tag theme="warning" variant="light">企业信息待补录</Tag>}
                    </Descriptions.DescriptionsItem>
                    <Descriptions.DescriptionsItem label="核算时间">{selectedProject.baselineCalculatedAt}</Descriptions.DescriptionsItem>
                    <Descriptions.DescriptionsItem label="报告模板">
                      {selectedTemplate?.templateName ?? '—'}
                    </Descriptions.DescriptionsItem>
                    <Descriptions.DescriptionsItem label="模板版本">
                      {selectedTemplate?.templateVersion ?? '—'}
                    </Descriptions.DescriptionsItem>
                  </Descriptions>
                  {existingProjectIds.has(selectedProject.id) && (
                    <Alert
                      theme="warning"
                      style={{ marginTop: 12 }}
                      message="该项目已存在报告。继续新增会生成一份独立的新报告，同一产品将出现多条记录，请确认是否确需新建。"
                    />
                  )}
                </>
              )}
            </>
          )}
          <Alert
            theme="warning"
            style={{ marginTop: 12 }}
            message="报告正文由核算结果 + 企业信息库 + 所选报告模板自动装配；产品信息与企业信息中的可编辑字段可在编制页调整，核算口径字段需回到核算项目修改后重新核算。"
          />
        </Form>
      </Dialog>

      {/* 列表「预览」：已生成 / 待更新报告的文件预览，工具栏支持下载 */}
      <Drawer
        size="1120px"
        header={previewReport?.fileName ?? '报告预览'}
        visible={!!previewReport}
        onClose={() => setPreviewReport(null)}
        footer={
          <Button variant="outline" onClick={() => setPreviewReport(null)}>
            关闭
          </Button>
        }
      >
        {previewReport && (
          <div data-ann-target="rp.list.preview" style={{ height: '100%' }}>
            <ReportPreview report={previewReport} downloadable={isReportReady(previewReport)} />
          </div>
        )}
      </Drawer>

    </div>
  )
}
