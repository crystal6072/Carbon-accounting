import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  MessagePlugin,
  Pagination,
  Popconfirm,
  Space,
  Table,
  Tag,
} from 'tdesign-react'
import type { PrimaryTableCol } from 'tdesign-react'
import type { EnterprisePayload, EnterpriseRecord } from '@/types/enterprise'
import { createEnterprise, deleteEnterprise, fetchEnterprises, updateEnterprise } from '@/mock/enterprise'
import EnterpriseFormDrawer from './EnterpriseFormDrawer'
import './ReportPage.css'

const PAGE_SIZE = 10

/**
 * 企业信息维护（报告管理）。
 *
 * 统一维护报告主体（企业）信息，作为「报告编制」的企业信息来源：
 * - 报告装配 / 引用时读取本库记录（封面、基本信息表、表 1）；
 * - 本库记录更新后，引用该记录的报告转「待更新」（PRD R-114）；
 * - 被报告引用的记录禁止删除。
 */
export default function EnterprisePage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<EnterpriseRecord[]>([])
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editing, setEditing] = useState<EnterpriseRecord | null>(null)

  const load = (kw = keyword) => {
    setLoading(true)
    fetchEnterprises({ keyword: kw })
      .then(setData)
      .catch((e) => MessagePlugin.error((e as Error).message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const paged = useMemo(() => data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [data, page])

  const openCreate = () => {
    setFormMode('create')
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (row: EnterpriseRecord) => {
    setFormMode('edit')
    setEditing(row)
    setFormOpen(true)
  }

  const handleSubmit = async (payload: EnterprisePayload) => {
    if (formMode === 'create') {
      await createEnterprise(payload)
      MessagePlugin.success('企业已新增')
    } else {
      await updateEnterprise(editing!.id, payload)
      MessagePlugin.success('企业信息已更新，引用该企业的报告将标记为待更新')
    }
    setFormOpen(false)
    load()
  }

  const handleDelete = async (row: EnterpriseRecord) => {
    try {
      await deleteEnterprise(row.id)
      MessagePlugin.success('已删除')
      load()
    } catch (e) {
      MessagePlugin.error((e as Error).message)
    }
  }

  const columns: PrimaryTableCol<EnterpriseRecord>[] = [
    { colKey: 'seq', title: '序号', width: 64 },
    {
      colKey: 'companyName',
      title: '企业名称',
      width: 260,
      cell: ({ row }) => <span style={{ fontWeight: 600 }}>{row.companyName}</span>,
    },
    { colKey: 'unifiedSocialCreditCode', title: '统一社会信用代码', width: 200 },
    { colKey: 'legalPerson', title: '法定代表人', width: 120 },
    { colKey: 'contactPhone', title: '联系方式', width: 140 },
    { colKey: 'contactPerson', title: '联系人', width: 100 },
    {
      colKey: 'reportCount',
      title: '关联报告',
      width: 100,
      cell: ({ row }) =>
        row.reportCount > 0 ? <Tag theme="primary" variant="light">{`${row.reportCount} 份`}</Tag> : <span>-</span>,
    },
    { colKey: 'updatedAt', title: '更新时间', width: 170 },
    {
      colKey: 'op',
      title: '操作',
      width: 120,
      cell: ({ row }) => (
        <Space className="rp-table-op">
          <a className="rp-link" onClick={() => openEdit(row)}>
            编辑
          </a>
          <Popconfirm
            content="删除后不可恢复；被报告引用的企业不可删除。确认删除？"
            theme="danger"
            onConfirm={() => handleDelete(row)}
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
        <span>企业信息维护</span>
      </div>

      <div className="rp-title-row">
        <div>
          <h2>企业信息维护</h2>
          <p className="rp-page-desc">统一维护报告主体（企业）信息，供报告编制引用到封面、基本信息表与表 1</p>
        </div>
        <Button theme="primary" onClick={openCreate}>
          新增企业
        </Button>
      </div>

      <Alert
        theme="info"
        style={{ marginBottom: 16 }}
        message="报告编制时可直接引用本库记录自动带入企业字段；引用后报告内仍可按需修改（仅影响该报告）。本库记录更新后，引用该记录的报告将标记为「待更新」。"
      />

      <Card>
        <Form layout="inline" labelWidth={76}>
          <Form.FormItem label="企业名称">
            <Input
              value={keyword}
              onChange={(v) => setKeyword(String(v ?? ''))}
              clearable
              placeholder="企业名称 / 信用代码"
              style={{ width: 240 }}
            />
          </Form.FormItem>
          <Form.FormItem>
            <Space>
              <Button
                variant="outline"
                onClick={() => {
                  setKeyword('')
                  setPage(1)
                  load('')
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
          empty={<Empty description="暂无企业信息，点击右上角「新增企业」维护" />}
        />
        {data.length > PAGE_SIZE && (
          <Pagination
            style={{ marginTop: 16 }}
            current={page}
            pageSize={PAGE_SIZE}
            total={data.length}
            showJumper
            onChange={(p: number | { current: number }) => setPage(typeof p === 'number' ? p : p.current)}
          />
        )}
      </Card>

      <EnterpriseFormDrawer
        open={formOpen}
        mode={formMode}
        record={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
