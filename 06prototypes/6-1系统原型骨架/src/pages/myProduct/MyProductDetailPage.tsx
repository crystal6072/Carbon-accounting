import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Icon, Modal, PageHeader, Pagination, Table, Tag, useToast } from '@/shared/components'
import type { Column } from '@/shared/components'
import {
  deleteMyProduct,
  fetchCategories,
  fetchMyProduct,
  fetchMyProductLogs,
  fetchMyProductRefProjects,
  fetchOperations,
  updateMyProductUseStatus,
} from '@/mock'
import type { MyProductRefProject } from '@/mock'
import type {
  CategoryItem,
  MyProductItem,
  OperationItem,
  OperationLogItem,
  ProductOperationItem,
} from '@/types'
import ProductConfirmModal from '@/pages/product/ProductConfirmModal'
import ProductProcessCanvas from '@/pages/product/ProductProcessCanvas'
import { buildFormulaLines } from '@/shared/formulaMeta'
import {
  MY_PRODUCT_BREADCRUMB,
  myProductSourceText,
  myProductSourceTone,
  myProductSourceTip,
  myProductUseStatusText,
  myProductUseStatusTone,
} from './myProductMeta'
import '@/pages/product/ProductPage.css'
import './MyProductPage.css'

const LOG_PAGE_SIZE = 5

export default function MyProductDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [product, setProduct] = useState<MyProductItem | null>(null)
  const [categories, setCategories] = useState<CategoryItem[]>([])
  /** 工序库（用于列表展示「工序类型」） */
  const [operations, setOperations] = useState<OperationItem[]>([])
  const [logs, setLogs] = useState<OperationLogItem[]>([])
  const [refProjects, setRefProjects] = useState<MyProductRefProject[]>([])
  const [loading, setLoading] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const [logPage, setLogPage] = useState(1)
  const [confirm, setConfirm] = useState<'on' | 'off' | null>(null)
  const [deleting, setDeleting] = useState(false)
  /** 工艺与工序展示模式：流程画布 / 列表 */
  const [viewMode, setViewMode] = useState<'canvas' | 'list'>('canvas')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [detail, categoryList, operationList, logList, projects] = await Promise.all([
        fetchMyProduct(id),
        fetchCategories(),
        fetchOperations(),
        fetchMyProductLogs(id),
        fetchMyProductRefProjects(id),
      ])
      setProduct(detail)
      setCategories(categoryList)
      setOperations(operationList)
      setLogs(logList)
      setRefProjects(projects)
    } catch (error) {
      toast(error instanceof Error ? error.message : '产品加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  useEffect(() => {
    void load()
  }, [load])

  const categoryName = useMemo(() => {
    if (!product) return '-'
    const category = categories.find((item) => item.id === product.categoryId)
    if (!category) return '-'
    return category.status === 'disabled' ? `${category.name}（已禁用）` : category.name
  }, [categories, product])

  const isReferenced = product?.source === 'referenced'

  const handleConfirm = async () => {
    if (!product || !confirm) return
    try {
      await updateMyProductUseStatus(product.id, confirm)
      toast(confirm === 'on' ? '上架成功' : '下架成功')
      setConfirm(null)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  const handleDelete = async () => {
    if (!product) return
    try {
      await deleteMyProduct(product.id)
      toast('删除成功')
      navigate('/pcf/my-product')
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    }
  }

  /** 列表视图列（与后台产品信息库一致）：工序 / 工序类型 / 投入项 / 产出项 / 计算公式（不展示数量） */
  const operationColumns: Column<ProductOperationItem>[] = [
    {
      key: 'name',
      title: '工序',
      width: 200,
      render: (row) => (
        <span className="flex gap-xs">
          <span>{row.name}</span>
          <span className="mono toolbar-tip">{row.code}</span>
        </span>
      ),
    },
    {
      key: 'opType',
      title: '工序类型',
      width: 100,
      render: (row) => {
        const type = operations.find((item) => item.code === row.code)?.type
        if (!type) return '-'
        const text = type === 'main' ? '主工序' : type === 'auxiliary' ? '辅助工序' : '处置工序'
        const tone = type === 'main' ? 'info' : type === 'auxiliary' ? 'default' : 'warning'
        return <Tag tone={tone}>{text}</Tag>
      },
    },
    {
      key: 'inputs',
      title: '投入项',
      width: 200,
      render: (row) => {
        if (row.inputs.length === 0) return '-'
        return (
          <div className="flow-list">
            {row.inputs.map((item) => (
              <span key={item.id} className="flow-chip flow-chip-in">
                {item.name}
              </span>
            ))}
          </div>
        )
      },
    },
    {
      key: 'outputs',
      title: '产出项',
      width: 200,
      render: (row) => {
        if (row.outputs.length === 0) return '-'
        return (
          <div className="flow-list">
            {row.outputs.map((item) => (
              <span key={item.id} className="flow-chip flow-chip-out">
                {item.name}
              </span>
            ))}
          </div>
        )
      },
    },
    {
      key: 'formula',
      title: '计算公式',
      render: (row) => {
        const lines = buildFormulaLines([
          ...row.inputs.map((item) => ({
            name: item.name,
            flowType: item.type,
            formulaName: item.formulaName,
            formulaCode: item.formulaCode,
            disposal: item.disposal,
          })),
          ...row.outputs.map((item) => ({
            name: item.name,
            flowType: item.type,
            formulaName: item.formulaName,
            formulaCode: item.formulaCode,
            disposal: item.disposal,
          })),
        ])
        if (lines.length === 0) return '-'
        return (
          <div className="flow-detail">
            {lines.map((line) => (
              <span key={line} className="flow-detail-line">
                {line}
              </span>
            ))}
          </div>
        )
      },
    },
  ]

  const logColumns: Column<OperationLogItem>[] = [
    { key: 'time', title: '时间', width: 150 },
    { key: 'operator', title: '操作人', width: 120 },
    { key: 'action', title: '操作', width: 160 },
    { key: 'detail', title: '说明', render: (row) => row.detail || '-' },
  ]

  const refColumns: Column<MyProductRefProject>[] = [
    { key: 'code', title: '项目编号', width: 170, render: (row) => <span className="mono">{row.code}</span> },
    { key: 'name', title: '项目名称', render: (row) => row.name },
  ]

  if (!product) {
    return (
      <>
        <PageHeader breadcrumb={MY_PRODUCT_BREADCRUMB} title="产品详情" />
        <div className="card">
          <div className="empty">{loading ? '加载中…' : '产品不存在或已被删除'}</div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={[...MY_PRODUCT_BREADCRUMB, product.name]}
        title={product.name}
        description={`产品编码 ${product.code} · ${myProductSourceText[product.source]} · ${
          myProductUseStatusText[product.useStatus]
        }${isReferenced ? '（随后台产品信息库）' : ''}`}
        actions={
          <>
            <Button onClick={() => navigate('/pcf/my-product')}>返回列表</Button>
            {!isReferenced && (
              <>
                {product.useStatus === 'off' ? (
                  <Button onClick={() => setConfirm('on')}>上架</Button>
                ) : (
                  <Button onClick={() => setConfirm('off')}>下架</Button>
                )}
                <Button variant="primary" onClick={() => navigate(`/pcf/my-product/${product.id}/edit`)}>
                  编辑
                </Button>
                <Button variant="danger" disabled={refProjects.length > 0} onClick={() => setDeleting(true)}>
                  删除
                </Button>
              </>
            )}
          </>
        }
      />

      {isReferenced && (
        <div className="card">
          <div className="form-block">
            <div className="form-tip">
              引用标准产品为**只读**项：不可编辑 / 上下架 / 删除，产品主体与状态由后台产品信息库维护；
              需要调整时，请在后台申请变更后重新引用（本模块不提供「复制成新的」，业务裁定 2026-09-28）。
            </div>
          </div>
        </div>
      )}

      <div className="stack">
        <section className="card">
          <div className="section-header">
            <span className="section-title">基本信息</span>
          </div>
          <div className="section-body">
            <div className="detail-list">
              <div className="detail-item">
                <span className="detail-label">产品编码</span>
                <span className="detail-value mono">{product.code}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">产品名称</span>
                <span className="detail-value">{product.name}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">产品来源</span>
                <span className="detail-value">
                  <span title={myProductSourceTip[product.source]}>
                    <Tag tone={myProductSourceTone[product.source]}>{myProductSourceText[product.source]}</Tag>
                  </span>
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">来源产品</span>
                <span className="detail-value">
                  {product.sourceProductId ? `${product.code}（平台级）` : '-'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">产品分类</span>
                <span className="detail-value">{categoryName}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">型号</span>
                <span className="detail-value">{product.model || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">规格</span>
                <span className="detail-value">{product.spec || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">单位</span>
                <span className="detail-value">{product.unit}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">所属行业</span>
                <span className="detail-value">{product.industry || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">使用状态</span>
                <span className="detail-value">
                  <Tag tone={myProductUseStatusTone[product.useStatus]}>
                    {myProductUseStatusText[product.useStatus]}
                  </Tag>
                  {isReferenced && <span className="my-source-readonly-tip">随后台产品信息库</span>}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">归属组织</span>
                <span className="detail-value">{product.org}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">创建人</span>
                <span className="detail-value">{product.createdBy}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">创建时间</span>
                <span className="detail-value">{product.createdAt}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">最后修改</span>
                <span className="detail-value">{product.updatedAt}</span>
              </div>
              <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                <span className="detail-label">产品描述</span>
                <span className="detail-value">{product.description || '-'}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="section-header">
            <span className="section-title">产品工艺与工序</span>
            <span className="section-extra">
              <span className="toolbar-tip">
                {isReferenced
                  ? '引用标准产品的组合随平台级产品只读展示'
                  : '工序为模板复制副本，基础库变更不回写；投入产出流维护归属「工序管理」'}
              </span>
              <div className="pcf-view-switch" role="tablist" aria-label="展示方式">
                <button
                  type="button"
                  className={viewMode === 'canvas' ? 'active' : ''}
                  onClick={() => setViewMode('canvas')}
                >
                  画布
                </button>
                <button
                  type="button"
                  className={viewMode === 'list' ? 'active' : ''}
                  onClick={() => setViewMode('list')}
                >
                  列表
                </button>
              </div>
            </span>
          </div>
          <div className="section-body">
            {product.processes.length > 0 ? (
              viewMode === 'canvas' ? (
                <ProductProcessCanvas processes={product.processes} />
              ) : (
                product.processes.map((process) => (
                  <div className="sub-block" key={process.id}>
                    <div className="sub-block-header">
                      <span className="sub-block-title">
                        <span>
                          工艺顺序 {process.seq}：{process.processName}
                        </span>
                        <Tag>{process.processCode}</Tag>
                      </span>
                      <span className="sub-block-actions">
                        <span className="toolbar-tip">工序 {process.operations.length} 道</span>
                      </span>
                    </div>
                    <Table columns={operationColumns} data={process.operations} rowKey={(row) => row.id} />
                  </div>
                ))
              )
            ) : (
              <div className="empty">暂无工艺与工序组合数据</div>
            )}
          </div>
        </section>

        <section className="card">
          <div className="section-header">
            <span className="section-title">引用情况</span>
            <span className="toolbar-tip">
              共 {refProjects.length} 个核算项目 · 项目侧已生成快照，产品后续修改不影响已建项目
            </span>
          </div>
          <div className="section-body">
            {refProjects.length > 0 ? (
              <Table columns={refColumns} data={refProjects} rowKey={(row) => row.id} />
            ) : (
              <div className="empty">暂无核算项目引用</div>
            )}
          </div>
        </section>

        <section className="card">
          <div className="section-header">
            <button className="collapse-trigger" onClick={() => setLogOpen((prev) => !prev)}>
              <span className={['collapse-caret', logOpen ? 'expanded' : ''].filter(Boolean).join(' ')}>
                <Icon name="chevronRight" size={16} />
              </span>
              操作日志
            </button>
            <span className="toolbar-tip">
              {isReferenced ? '引用标准产品为只读项，无本组织操作日志' : `共 ${logs.length} 条`}
            </span>
          </div>
          {logOpen && !isReferenced && (
            <>
              <div className="section-body section-body-flush">
                <Table
                  columns={logColumns}
                  data={logs.slice((logPage - 1) * LOG_PAGE_SIZE, logPage * LOG_PAGE_SIZE)}
                  rowKey={(row) => row.id}
                />
              </div>
              <Pagination total={logs.length} page={logPage} pageSize={LOG_PAGE_SIZE} onChange={setLogPage} />
            </>
          )}
        </section>
      </div>

      <ProductConfirmModal
        open={!!confirm}
        product={product}
        target={confirm ?? 'on'}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
      />

      <Modal
        open={deleting}
        title="确认删除"
        size="sm"
        onClose={() => setDeleting(false)}
        footer={
          <>
            <Button onClick={() => setDeleting(false)}>取消</Button>
            <Button variant="danger" onClick={handleDelete}>
              确认删除
            </Button>
          </>
        }
      >
        <div className="modal-confirm-text">
          <div>
            <div>
              确认删除产品「{product.name}」（{product.code}）？
            </div>
            <div className="modal-confirm-tip">
              删除后不可恢复；仅「自己新增且未被核算项目引用」的组织自建产品可删除。
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}
