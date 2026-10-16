import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Icon, PageHeader, Pagination, Table, Tag, useToast } from '@/shared/components'
import type { Column } from '@/shared/components'
import { buildFormulaLines } from '@/shared/formulaMeta'
import { deleteProduct, fetchCategories, fetchOperations, fetchProduct, fetchProductLogs, updateProductUseStatus } from '@/mock'
import type {
  CategoryItem,
  OperationItem,
  OperationLogItem,
  ProductItem,
  ProductOperationItem,
  ProductUseStatus,
} from '@/types'
import ProductConfirmModal from './ProductConfirmModal'
import ProductDeleteModal from './ProductDeleteModal'
import ProductProcessCanvas from './ProductProcessCanvas'
import { flowTypeText, useStatusText, useStatusTone } from './productMeta'
import './ProductPage.css'

const LOG_PAGE_SIZE = 5

export default function ProductDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [product, setProduct] = useState<ProductItem | null>(null)
  const [categories, setCategories] = useState<CategoryItem[]>([])
  /** 工序库（用于列表展示「工序类型」） */
  const [operations, setOperations] = useState<OperationItem[]>([])
  const [logs, setLogs] = useState<OperationLogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const [logPage, setLogPage] = useState(1)
  const [confirm, setConfirm] = useState<ProductUseStatus | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  /** 工艺与工序展示模式：流程画布 / 列表 */
  const [viewMode, setViewMode] = useState<'canvas' | 'list'>('canvas')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [detail, categoryList, operationList, logList] = await Promise.all([
        fetchProduct(id),
        fetchCategories(),
        fetchOperations(),
        fetchProductLogs(id),
      ])
      setProduct(detail)
      setCategories(categoryList)
      setOperations(operationList)
      setLogs(logList)
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

  const handleConfirm = async () => {
    if (!product || !confirm) return
    try {
      await updateProductUseStatus(product.id, confirm)
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
      await deleteProduct(product.id)
      toast('删除成功')
      setDeleteOpen(false)
      navigate('/basic/product')
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  /** 列表视图列（与工艺流程列表列一致）：工序 / 工序类型 / 投入项 / 产出项 / 计算公式（不展示数量） */
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

  if (!product) {
    return (
      <>
        <PageHeader breadcrumb={['系统管理', '产品库', '产品信息库']} title="产品详情" />
        <div className="card">
          <div className="empty">{loading ? '加载中…' : '产品不存在或已被删除'}</div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '产品库', '产品信息库', product.name]}
        title={product.name}
        description={`产品编码 ${product.code} · ${useStatusText[product.useStatus]}`}
        actions={
          <>
            <Button onClick={() => navigate('/basic/product')}>返回列表</Button>
            {product.useStatus === 'off' ? (
              <Button data-ann-target="product.detail.onoff" onClick={() => setConfirm('on')}>上架</Button>
            ) : (
              <Button data-ann-target="product.detail.onoff" onClick={() => setConfirm('off')}>下架</Button>
            )}
            {product.useStatus === 'off' && (
              <Button variant="danger" data-ann-target="product.detail.delete" onClick={() => setDeleteOpen(true)}>
                删除
              </Button>
            )}
            <Button variant="primary" data-ann-target="product.detail.edit" onClick={() => navigate(`/basic/product/${product.id}/edit`)}>
              编辑
            </Button>
          </>
        }
      />

      <div className="stack">
        <section className="card">
          <div className="section-header">
            <span className="section-title" data-ann-target="product.detail">基本信息</span>
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
                <span className="detail-label">产品分类</span>
                <span className="detail-value">{categoryName}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">规格</span>
                <span className="detail-value">{product.spec || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">产品批次号</span>
                <span className="detail-value">{product.batchNo || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">生产地点</span>
                <span className="detail-value">{product.productionSite || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">生产功能</span>
                <span className="detail-value">{product.productionFunction || '-'}</span>
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
                  <Tag tone={useStatusTone[product.useStatus]}>{useStatusText[product.useStatus]}</Tag>
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">产品图片</span>
                <span className="detail-value">
                  {product.imageUrl ? (
                    <img className="image-thumb" src={product.imageUrl} alt={product.name} />
                  ) : (
                    '未上传'
                  )}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label" data-ann-target="product.detail.org">归属组织</span>
                <span className="detail-value">{product.org}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label" data-ann-target="product.detail.createdby">创建人</span>
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
            <span className="section-title" data-ann-target="product.detail.process">产品工艺与工序</span>
            <span className="section-extra">
              <span className="toolbar-tip">
                工序为模板复制副本，基础库变更不回写；投入产出流维护归属「工序管理」（C3b / C7）
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
            <button className="collapse-trigger" data-ann-target="product.detail.log" onClick={() => setLogOpen((prev) => !prev)}>
              <span className={['collapse-caret', logOpen ? 'expanded' : ''].filter(Boolean).join(' ')}>
                <Icon name="chevronRight" size={16} />
              </span>
              操作日志
            </button>
            <span className="toolbar-tip">共 {logs.length} 条</span>
          </div>
          {logOpen && (
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
      <ProductDeleteModal
        open={deleteOpen}
        product={product}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
      />
    </>
  )
}
