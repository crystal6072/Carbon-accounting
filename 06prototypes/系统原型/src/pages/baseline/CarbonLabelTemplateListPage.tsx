import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, PageHeader, Table, Tag, useToast } from '@/shared/components'
import type { Column } from '@/shared/components'
import {
  deleteCarbonLabelTemplate,
  fetchCarbonLabelTemplates,
} from '@/mock/carbonLabelTemplates'
import type { CarbonLabelTemplate, TemplateStatus } from '@/mock/carbonLabelTemplates'
import './CarbonLabelTemplatePage.css'

const STATUS_TEXT: Record<TemplateStatus, string> = { draft: '草稿', published: '已发布' }
const STATUS_TONE: Record<TemplateStatus, 'default' | 'success'> = { draft: 'default', published: 'success' }

export default function CarbonLabelTemplateListPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [list, setList] = useState<CarbonLabelTemplate[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setList(await fetchCarbonLabelTemplates())
    } catch (error) {
      toast(error instanceof Error ? error.message : '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  const handleDelete = async (t: CarbonLabelTemplate) => {
    try {
      await deleteCarbonLabelTemplate(t.id)
      toast('已删除')
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    }
  }

  const columns: Column<CarbonLabelTemplate>[] = [
    {
      key: 'name',
      title: '模板名称',
      render: (row) => (
        <button className="link" data-ann-target="baseline.label.row.name" onClick={() => navigate(`/baseline/label/${row.id}/edit`)}>
          {row.name}
        </button>
      ),
    },
    { key: 'category', title: '适用分类', width: 110, render: (row) => row.category },
    {
      key: 'primaryColor',
      title: '主色调',
      width: 130,
      render: (row) => (
        <div className="flex items-center gap-sm">
          <span className="color-swatch" style={{ backgroundColor: row.primaryColor }} />
          <span className="mono">{row.primaryColor}</span>
        </div>
      ),
    },
    {
      key: 'status',
      title: '状态',
      width: 90,
      render: (row) => <Tag tone={STATUS_TONE[row.status]}>{STATUS_TEXT[row.status]}</Tag>,
    },
    { key: 'updatedAt', title: '更新时间', width: 160, render: (row) => row.updatedAt || '-' },
    {
      key: 'actions',
      title: '操作',
      width: 140,
      render: (row) => (
        <span className="row-actions">
          <button className="link" data-ann-target="baseline.label.row.edit" onClick={() => navigate(`/baseline/label/${row.id}/edit`)}>
            编辑
          </button>
          <button className="link link-danger" data-ann-target="baseline.label.row.delete" onClick={() => handleDelete(row)}>
            删除
          </button>
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '产品碳基线库', '产品碳标签模板']}
        description="可视化配置产品碳标签 H5 模板（模块开关 / 主色调 / 二维码规则），实时预览手机端效果"
        title={<span data-ann-target="baseline.label.page.global">产品碳标签模板</span>}
        actions={
          <Button variant="primary" data-ann-target="baseline.label.add" onClick={() => navigate('/baseline/label/new')}>
            新建模板
          </Button>
        }
        />

        <div className="card">
        <div className="toolbar">
          <span className="toolbar-title">模板列表</span>
          <span className="toolbar-tip">共 {list.length} 个模板</span>
        </div>
        <div data-ann-target="baseline.label.page.list">
          <Table columns={columns} data={list} rowKey={(row) => row.id} loading={loading} />
        </div>
      </div>
    </>
  )
}
