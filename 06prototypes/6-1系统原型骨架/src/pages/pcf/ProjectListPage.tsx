import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Modal, PageHeader, Pagination, Select, Table, Tag, useToast } from '@/shared/components'
import type { Column, SelectOption } from '@/shared/components'
import {
  boundaryLabelOf,
  copyPcfProject,
  deletePcfProject,
  fetchPcfProjects,
  getMockSession,
  systemBoundaryItems,
} from '@/mock'
import {
  deptIdsWithDescendants,
  effectiveReadScopes,
  inAnyScope,
} from '@/mock/scope'
import type { ScopeContext, ScopeGrant } from '@/mock/scope'
import type { PcfProject } from '@/types'
import {
  PCF_EDITABLE_STATUSES,
  PCF_STATUS_OPTIONS,
  PCF_STATUS_TEXT,
  PCF_STATUS_TONE,
  pcfProductLabel,
} from './pcfMeta'
import ModelPickerModal from './ModelPickerModal'
import NewProjectModelMenu from './NewProjectModelMenu'
import type { ProjectCreateMode } from './NewProjectModelMenu'
import './PcfPage.css'

const PAGE_SIZE = 20

/** 核算项目列表对应的租户端功能点：数据范围按该功能点的读范围解析 */
const PROJECT_LIST_MENU_ID = 'M101'

/** 碳排放量展示（只展示总值）：最多 4 位小数、去尾零，附 kgCO₂e 单位 */
function formatEmission(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '-'
  return `${String(Number(value.toFixed(4)))} kgCO₂e`
}

/**
 * 核算列表（**扁平一层：一行 = 一条核算记录**，对齐竞品形态）：
 * 同一产品可有多条核算记录（不同核算边界 / 不同统计时间），本页直接平铺展示，
 * **不再先按产品分组**；产品档案在「我的产品库」维护，核算结果在工作台内查看。
 */
export default function ProjectListPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [list, setList] = useState<PcfProject[]>([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [boundary, setBoundary] = useState('')
  const [status, setStatus] = useState('')
  const [updatedFrom, setUpdatedFrom] = useState('')
  const [updatedTo, setUpdatedTo] = useState('')
  /** 已应用的查询条件（点「查询」才生效） */
  const [applied, setApplied] = useState({ keyword: '', boundary: '', status: '', from: '', to: '' })
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<PcfProject | null>(null)
  /** 选模型弹窗：null = 关闭；'platform' / 'my' = 打开的默认 Tab */
  const [pickerSource, setPickerSource] = useState<'platform' | 'my' | null>(null)
  /** 当前会话的数据权限上下文（租户 + 部门 + 责任人）与读范围授权（多角色并集） */
  const [scopeCtx, setScopeCtx] = useState<ScopeContext | null>(null)
  const [scopeGrants, setScopeGrants] = useState<ScopeGrant[]>([])

  /** 系统边界下拉（取值：数据字典「系统边界」中**已启用**的字典项） */
  const boundaryOptions: SelectOption[] = useMemo(
    () => systemBoundaryItems().map((item) => ({ label: item.label, value: item.code })),
    [],
  )
  /** 状态下拉（界面口径，不含已移除的「已核算」） */
  const statusOptions: SelectOption[] = useMemo(
    () => PCF_STATUS_OPTIONS.map((item) => ({ label: PCF_STATUS_TEXT[item], value: item })),
    [],
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const session = getMockSession()
      const [projects, grants, deptWithDescendants] = await Promise.all([
        fetchPcfProjects(),
        effectiveReadScopes(session.tenantId, session.ownerId, PROJECT_LIST_MENU_ID),
        deptIdsWithDescendants(session.tenantId, session.deptId),
      ])
      setList(projects)
      setScopeGrants(grants)
      setScopeCtx({
        accountId: session.ownerId,
        tenantId: session.tenantId,
        deptId: session.deptId,
        deptWithDescendants,
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const rows = useMemo(() => {
    const kw = applied.keyword.trim().toLowerCase()
    return list.filter((item) => {
      // 数据范围参与查询（租户边界 + 部门 + 责任人），不做"前端默认全可见"。
      // 无授权信息时（当前账号在本租户无成员关系）运行时本应 403；原型为兼容种子演示数据暂不做行级过滤。
      if (scopeCtx && scopeGrants.length > 0 && !inAnyScope(item, scopeGrants, scopeCtx)) return false
      if (kw) {
        const hit =
          item.productName.toLowerCase().includes(kw) ||
          (item.productCode ?? '').toLowerCase().includes(kw)
        if (!hit) return false
      }
      if (applied.boundary && item.boundary !== applied.boundary) return false
      if (applied.status && item.status !== applied.status) return false
      const day = item.updatedAt.slice(0, 10)
      if (applied.from && day < applied.from) return false
      if (applied.to && day > applied.to) return false
      return true
    })
  }, [list, applied, scopeCtx, scopeGrants])

  useEffect(() => {
    setPage(1)
  }, [applied])

  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleQuery = () =>
    setApplied({ keyword, boundary, status, from: updatedFrom, to: updatedTo })

  const handleReset = () => {
    setKeyword('')
    setBoundary('')
    setStatus('')
    setUpdatedFrom('')
    setUpdatedTo('')
    setApplied({ keyword: '', boundary: '', status: '', from: '', to: '' })
  }

  /**
   * 新增核算（对齐竞品）：
   * - 自定义核算：**不强制选择产品**，直接进入草稿工作台（步骤①可引用产品或自行录入）；
   * - 从平台 / 我的模型库选择：打开选模型弹窗，确认后带模型 id 进工作台草稿。
   */
  const handleCreate = (mode: ProjectCreateMode) => {
    if (mode === 'custom') {
      navigate('/pcf/project/new')
      return
    }
    setPickerSource(mode)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deletePcfProject(deleteTarget.id)
      toast('删除成功')
      setDeleteTarget(null)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  /** 复制：以该记录数据复制出一条新核算记录，并进入可编辑的工作台 */
  const handleCopy = async (row: PcfProject) => {
    try {
      const created = await copyPcfProject(row.id)
      toast('复制成功，已生成新的核算记录')
      await load()
      navigate(`/pcf/project/${created.id}`)
    } catch (error) {
      toast(error instanceof Error ? error.message : '复制失败', 'error')
    }
  }

  const columns: Column<PcfProject>[] = [
    {
      key: 'productName',
      title: '产品名称',
      width: 220,
      render: (row) => (
        <button className="link" onClick={() => navigate(`/pcf/project/${row.id}`)}>
          {pcfProductLabel(row.productName, row.productSpec)}
        </button>
      ),
    },
    {
      key: 'boundary',
      title: '系统边界',
      width: 110,
      render: (row) => boundaryLabelOf(row.boundary),
    },
    {
      key: 'totalEmission',
      title: '碳排放量（kgCO₂e）',
      width: 150,
      align: 'right',
      render: (row) => <span className="nowrap">{formatEmission(row.totalEmission)}</span>,
    },
    {
      key: 'calculatedAt',
      title: '核算时间',
      width: 160,
      render: (row) => <span className="nowrap">{row.calculatedAt || '-'}</span>,
    },
    {
      key: 'createdBy',
      title: '创建人',
      width: 110,
      render: (row) => row.createdBy || '-',
    },
    {
      key: 'status',
      title: <span data-ann-target="pcf.list.col.status">完成状态</span>,
      width: 110,
      render: (row) => <Tag tone={PCF_STATUS_TONE[row.status]}>{PCF_STATUS_TEXT[row.status]}</Tag>,
    },
    {
      key: 'updatedAt',
      title: '更新时间',
      width: 160,
      render: (row) => <span className="nowrap">{row.updatedAt}</span>,
    },
    {
      key: 'actions',
      title: '操作',
      width: 190,
      render: (row) => {
        const editable = PCF_EDITABLE_STATUSES.includes(row.status)
        return (
          <span className="row-actions">
            <button
              className="link"
              data-ann-target="pcf.list.row.view"
              onClick={() => navigate(`/pcf/project/${row.id}?mode=view`)}
            >
              查看
            </button>
            {editable && (
              <button className="link" onClick={() => navigate(`/pcf/project/${row.id}`)}>
                编辑
              </button>
            )}
            <button className="link" data-ann-target="pcf.list.row.copy" onClick={() => void handleCopy(row)}>
              复制
            </button>
            <button className="link link-danger" data-ann-target="pcf.list.row.delete" onClick={() => setDeleteTarget(row)}>
              删除
            </button>
          </span>
        )
      },
    },
  ]

  return (
    <>
      <PageHeader
        breadcrumb={['产品碳足迹', '碳足迹核算']}
        title={<span data-ann-target="pcf.list.page.global">碳足迹核算</span>}
        description="一行 = 一条核算记录；同一产品可按不同核算边界 / 统计时间建立多条核算记录"
        actions={<span data-ann-target="pcf.list.add"><NewProjectModelMenu onSelect={handleCreate} /></span>}
      />

      <div className="card">
        <div className="query-bar" data-ann-target="pcf.list.query.bar">
          <div className="query-item">
            <span className="query-label">产品名称</span>
            <Input value={keyword} placeholder="请输入" onChange={(e) => setKeyword(e.target.value)} />
          </div>
          <div className="query-item">
            <span className="query-label">系统边界</span>
            <Select
              value={boundary}
              placeholder="全部"
              options={boundaryOptions}
              onChange={(e) => setBoundary(e.target.value)}
            />
          </div>
          <div className="query-item">
            <span className="query-label">状态</span>
            <Select
              value={status}
              placeholder="全部"
              options={statusOptions}
              onChange={(e) => setStatus(e.target.value)}
            />
          </div>
          <div className="query-item">
            <span className="query-label">更新时间</span>
            <div className="pcf-date-range">
              <Input type="date" value={updatedFrom} onChange={(e) => setUpdatedFrom(e.target.value)} />
              <span className="pcf-date-sep">-</span>
              <Input type="date" value={updatedTo} onChange={(e) => setUpdatedTo(e.target.value)} />
            </div>
          </div>
          <div className="query-actions">
            <Button onClick={handleReset}>重置</Button>
            <Button variant="primary" onClick={handleQuery}>
              查询
            </Button>
          </div>
        </div>

        <div className="toolbar">
          <span className="toolbar-title">共 {rows.length} 条核算记录</span>
          <span className="toolbar-tip">默认按更新时间倒序</span>
        </div>

        <div className="pcf-table-wrap" data-ann-target="pcf.list.table">
          <Table
            columns={columns}
            data={pagedRows}
            rowKey={(row) => row.id}
            loading={loading}
            emptyText="暂无核算记录，点击右上角「新增产品模型」开始"
          />
        </div>

        <Pagination total={rows.length} page={page} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      <Modal
        open={!!deleteTarget}
        title="确认删除"
        size="sm"
        onClose={() => setDeleteTarget(null)}
        footer={
          <>
            <Button onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="danger" onClick={handleDelete}>
              确认删除
            </Button>
          </>
        }
      >
        删除后不可恢复（核算记录消失）；已完成的记录同样可删除，且删除后不可找回。确认删除「
        {deleteTarget ? pcfProductLabel(deleteTarget.productName, deleteTarget.productSpec) : ''}」？
      </Modal>

      <ModelPickerModal
        open={pickerSource !== null}
        defaultSource={pickerSource ?? 'platform'}
        onClose={() => setPickerSource(null)}
        onConfirm={(modelId) => {
          setPickerSource(null)
          navigate(`/pcf/project/new/model/${modelId}`)
        }}
      />
    </>
  )
}
