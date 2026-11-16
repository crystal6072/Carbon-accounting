import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Input, PageHeader, Table, useToast } from '@/shared/components'
import type { Column } from '@/shared/components'
import {
  deleteMyFactor,
  fetchMyFactorLibrary,
  fetchMyFactors,
  refreshAllMyFactors,
  refreshMyFactorFromSource,
} from '@/mock'
import type { MyFactor, MyFactorLibrary } from '@/types'
import { caliberSummaryText, factorUnitText, hasSplitCalibers, matchFactorKeyword } from './factorMeta'
import './FactorPage.css'

/**
 * 前台 · 我的因子库详情：库内因子表（支持因子名称 / 别名模糊搜索）。
 * - 手工新增因子；收藏副本可「一键更新」按源库当前发布版本刷新副本；
 * - 私有库不发布、不版本化；**详情页不展示库信息卡**，库信息在库列表维护。
 */
export default function MyFactorLibraryDetailPage() {
  const { libraryId = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [library, setLibrary] = useState<MyFactorLibrary | null>(null)
  const [factors, setFactors] = useState<MyFactor[]>([])
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  /** 库内因子关键字（因子名称 / 别名，模糊匹配） */
  const [keyword, setKeyword] = useState('')

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
  /** 关键字过滤后的库内因子（因子名称 / 别名） */
  const visibleFactors = useMemo(
    () => factors.filter((item) => matchFactorKeyword(item, keyword)),
    [factors, keyword],
  )

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
            <span className="factor-section-title">库内因子</span>
            <span className="flex gap-xs" style={{ alignItems: 'center' }}>
              <span className="toolbar-tip">共 {visibleFactors.length} 条</span>
              <span style={{ width: 220 }} data-ann-target="pcf-factor.mylib.search">
                <Input
                  value={keyword}
                  placeholder="因子名称 / 别名"
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </span>
            </span>
          </div>
          <div className="factor-section-body factor-section-flush">
            <div className="factor-table-wrap factor-table-sticky" data-ann-target="pcf-factor.mylib.table">
              <Table
                columns={columns}
                data={visibleFactors}
                rowKey={(row) => row.id}
                loading={loading}
                emptyText={keyword.trim() ? '未找到匹配的因子' : '暂无因子'}
              />
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
