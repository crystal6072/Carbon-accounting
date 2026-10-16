import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, PageHeader, Table, Tag, useToast } from '@/shared/components'
import type { Column } from '@/shared/components'
import { deleteMyFactor, fetchMyFactorLibrary, fetchMyFactors, refreshAllMyFactors, refreshMyFactorFromSource } from '@/mock'
import type { MyFactor, MyFactorLibrary } from '@/types'
import {
  caliberSummaryText,
  factorUnitText,
  hasSplitCalibers,
  myFactorOriginText,
  myFactorOriginTone,
} from './factorMeta'
import './FactorPage.css'

/**
 * 前台 · 我的因子库详情：库内因子表（含「来源」列与「有新版本可更新」角标）。
 * - 手工新增因子；收藏副本可「一键更新」按源库当前发布版本刷新副本；
 * - 私有库不发布、不版本化。
 */
export default function MyFactorLibraryDetailPage() {
  const { libraryId = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [library, setLibrary] = useState<MyFactorLibrary | null>(null)
  const [factors, setFactors] = useState<MyFactor[]>([])
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const lib = await fetchMyFactorLibrary(libraryId)
      setLibrary(lib)
      setFactors(await fetchMyFactors(libraryId))
    } catch (error) {
      toast(error instanceof Error ? error.message : '加载失败', 'error')
      setLibrary(null)
    } finally {
      setLoading(false)
    }
  }, [libraryId, toast])

  useEffect(() => {
    void load()
  }, [load])

  const updatableCount = useMemo(() => factors.filter((item) => item.updateAvailable).length, [factors])

  const handleUpdateOne = async (factor: MyFactor) => {
    try {
      await refreshMyFactorFromSource(factor.id)
      toast(`已更新「${factor.name}」为源库最新版本`)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '更新失败', 'error')
    }
  }

  const handleUpdateAll = async () => {
    if (!window.confirm(`确认将 ${updatableCount} 个收藏副本更新为源库最新版本？`)) return
    setUpdating(true)
    try {
      const result = await refreshAllMyFactors(libraryId)
      toast(`更新完成：成功 ${result.success} 条${result.failed.length ? `，失败 ${result.failed.length} 条` : ''}`)
      await load()
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async (factor: MyFactor) => {
    if (!window.confirm(`确认删除因子「${factor.name}」？`)) return
    try {
      await deleteMyFactor(factor.id)
      toast('删除成功')
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    }
  }

  const columns: Column<MyFactor>[] = [
    {
      key: 'name',
      title: '因子名称',
      width: 200,
      render: (row) => (
        <button className="link" onClick={() => navigate(`/pcf/my-factor/${libraryId}/factor/${row.id}`)}>
          {row.name}
        </button>
      ),
    },
    { key: 'englishName', title: '英文名称', width: 180, render: (row) => <span className="cell-ellipsis">{row.englishName || '-'}</span> },
    { key: 'alias', title: '别名', width: 150, render: (row) => <span className="cell-ellipsis">{row.alias || '-'}</span> },
    {
      key: 'origin',
      title: '来源',
      width: 240,
      render: (row) => (
        <span className="flex gap-xs" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Tag tone={myFactorOriginTone[row.origin]}>{myFactorOriginText[row.origin]}</Tag>
          {row.origin === 'collected' && (
            <span className="toolbar-tip">
              {row.sourceLibraryName} · {row.sourceVersionNo}
            </span>
          )}
          {row.origin === 'collected' && row.sourceStatus === 'offline' && <Tag tone="warning">来源库已下架</Tag>}
          {row.origin === 'collected' && row.sourceStatus === 'removed' && <Tag tone="error">来源因子已移除</Tag>}
          {row.updateAvailable && <Tag tone="warning">有新版本可更新</Tag>}
        </span>
      ),
    },
    {
      key: 'value',
      title: '因子值 / 单位',
      width: 200,
      render: (row) => (
        <span className="mono nowrap">
          {row.value} {factorUnitText(row)}
          {hasSplitCalibers(row) && (
            <span className="toolbar-tip" style={{ display: 'block' }}>{caliberSummaryText(row)}</span>
          )}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      width: 200,
      render: (row) => (
        <span className="row-actions">
          <button className="link" onClick={() => navigate(`/pcf/my-factor/${libraryId}/factor/${row.id}`)}>
            查看
          </button>
          <button className="link" onClick={() => navigate(`/pcf/my-factor/${libraryId}/factor/${row.id}/edit`)}>
            编辑
          </button>
          {row.updateAvailable && (
            <button className="link" onClick={() => handleUpdateOne(row)}>
              一键更新
            </button>
          )}
          <button className="link link-danger" onClick={() => handleDelete(row)}>
            删除
          </button>
        </span>
      ),
    },
  ]

  if (!library) {
    return (
      <>
        <PageHeader breadcrumb={['产品碳足迹', '因子管理', '我的因子库']} title="我的因子库" />
        <div className="card">
          <div className="empty">{loading ? '加载中…' : '我的因子库不存在或已被删除'}</div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={['产品碳足迹', '因子管理', '我的因子库', library.name]}
        title={<span data-ann-target="pcf-factor.mylib.detail">{library.name}</span>}
        description={`因子数 ${library.factorCount}`}
        onBack={() => navigate('/pcf/my-factor')}
        actions={
          <>
            {updatableCount > 0 && (
              <Button onClick={handleUpdateAll} disabled={updating} data-ann-target="pcf-factor.mylib.update-all">
                {updating ? '更新中…' : `一键更新（${updatableCount}）`}
              </Button>
            )}
            <Button variant="primary" onClick={() => navigate(`/pcf/my-factor/${libraryId}/factor/new`)} data-ann-target="pcf-factor.mylib.add-factor">
              手工新增因子
            </Button>
          </>
        }
      />

      <div className="factor-stack">
        <section className="card">
          <div className="factor-section-header">
            <span className="factor-section-title">库信息</span>
          </div>
          <div className="factor-section-body">
            <div className="detail-list">
              <div className="detail-item"><span className="detail-label">库名称</span><span className="detail-value">{library.name}</span></div>
              <div className="detail-item"><span className="detail-label">因子数</span><span className="detail-value">{library.factorCount}</span></div>
              <div className="detail-item"><span className="detail-label">更新人</span><span className="detail-value">{library.updatedBy}</span></div>
              <div className="detail-item"><span className="detail-label">更新时间</span><span className="detail-value">{library.updatedAt}</span></div>
              <div className="detail-item factor-detail-item-full"><span className="detail-label">库描述</span><span className="detail-value">{library.description || '-'}</span></div>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="factor-section-header">
            <span className="factor-section-title">库内因子</span>
            <span className="toolbar-tip">共 {factors.length} 条</span>
          </div>
          <div className="factor-section-body factor-section-flush">
            <div className="factor-table-wrap factor-table-sticky" data-ann-target="pcf-factor.mylib.table">
              <Table columns={columns} data={factors} rowKey={(row) => row.id} loading={loading} emptyText="暂无因子" />
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
