import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Input, PageHeader, Table, Tag, Tree, useToast } from '@/shared/components'
import type { Column, TreeNodeData } from '@/shared/components'
import { fetchPublishedLibraryDetail } from '@/mock'
import type { FactorItem, FactorLibrary, FactorLibraryVersion } from '@/types'
import {
  buildIsicTree,
  caliberSummaryText,
  defaultIsicExpandedIds,
  factorUnitText,
  hasSplitCalibers,
  isicPathText,
  libraryTypeText,
  libraryTypeTone,
  libraryVersionStatusText,
  matchIsicNode,
} from './factorMeta'
import './FactorPage.css'

/**
 * 前台 · 背景数据库详情（只读）：商业数据库左侧 ISIC 分类树 + 右侧因子表；自建库无分类树，因子表占满整行。
 * 支持切换历史版本（history，只读追溯）。
 * **不做批量收藏、不在列表做收藏**：点击「过程 / 因子名称」进入因子详情，在详情页用五角星收藏。
 */
export default function FrontendLibraryDetailPage() {
  const { libraryId = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [library, setLibrary] = useState<FactorLibrary | null>(null)
  const [versions, setVersions] = useState<FactorLibraryVersion[]>([])
  const [activeVersionId, setActiveVersionId] = useState('')
  const [factors, setFactors] = useState<FactorItem[]>([])
  const [loading, setLoading] = useState(false)
  const [categoryId, setCategoryId] = useState('')
  const [keyword, setKeyword] = useState('')

  const load = useCallback(
    async (versionId?: string) => {
      setLoading(true)
      try {
        const detail = await fetchPublishedLibraryDetail(libraryId, versionId)
        setLibrary(detail.library)
        setVersions(detail.versions)
        setActiveVersionId(detail.activeVersionId)
        setFactors(detail.factors)
      } catch (error) {
        toast(error instanceof Error ? error.message : '加载失败', 'error')
        setLibrary(null)
      } finally {
        setLoading(false)
      }
    },
    [libraryId, toast],
  )

  useEffect(() => {
    void load()
  }, [load])

  const isExternal = library?.type === 'external'

  /** 商业数据库：两级分类树（ISIC 门类 A~S → 类）；自建库：单节点 */
  const treeData: TreeNodeData[] = useMemo(() => {
    if (isExternal) return buildIsicTree(factors)
    return [{ id: '', name: '全部因子', extra: String(factors.length) }]
  }, [isExternal, factors])

  const rows = useMemo(() => {
    const text = keyword.trim().toLowerCase()
    return factors.filter((item) => {
      if (isExternal && !matchIsicNode(item, categoryId)) return false
      if (!text) return true
      return (
        item.name.toLowerCase().includes(text) ||
        item.alias.toLowerCase().includes(text) ||
        item.code.toLowerCase().includes(text)
      )
    })
  }, [factors, categoryId, keyword, isExternal])

  const columns: Column<FactorItem>[] = [
    {
      key: 'name',
      title: '过程 / 因子名称',
      width: 240,
      render: (row) => (
        <button className="link" onClick={() => navigate(`/pcf/factor-libraries/${libraryId}/factor/${row.id}`)}>
          {row.name}
        </button>
      ),
    },
    ...(isExternal
      ? [
          {
            key: 'isic',
            title: '所属分类',
            width: 220,
            render: (row: FactorItem) => <span className="cell-ellipsis">{isicPathText(row)}</span>,
          } as Column<FactorItem>,
        ]
      : []),
    { key: 'englishName', title: '英文名称', width: 200, render: (row) => <span className="cell-ellipsis">{row.englishName || '-'}</span> },
    { key: 'alias', title: '因子别名', width: 220, render: (row) => <span className="cell-ellipsis">{row.alias || '-'}</span> },
    { key: 'unitCategory', title: '单位类别', width: 90, render: (row) => row.unitCategory || '-' },
    { key: 'region', title: '地域', width: 90, render: (row) => row.region || '-' },
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
      width: 90,
      render: (row) => (
        <button className="link" onClick={() => navigate(`/pcf/factor-libraries/${libraryId}/factor/${row.id}`)}>
          查看详情
        </button>
      ),
    },
  ]

  if (!library) {
    return (
      <>
        <PageHeader breadcrumb={['产品碳足迹', '因子管理', '背景数据库']} title="背景数据库详情" />
        <div className="card">
          <div className="empty">{loading ? '加载中…' : '该因子库尚未发布或已被删除'}</div>
        </div>
      </>
    )
  }

  const activeVersion = versions.find((v) => v.id === activeVersionId)
  const headerDescription = [
    library.code,
    libraryTypeText[library.type],
    activeVersion ? `版本 ${activeVersion.versionNo}` : '',
    activeVersion ? `生效时间 ${activeVersion.lastActivatedAt || activeVersion.createdAt}` : '',
    `维护方 ${library.maintainer}`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <>
      <PageHeader
        breadcrumb={['产品碳足迹', '因子管理', '背景数据库', library.name]}
        title={<span data-ann-target="pcf-factor.backend-detail">{library.name}</span>}
        description={headerDescription}
        onBack={() => navigate('/pcf/factor-libraries')}
      />

      <div className={isExternal ? 'factor-lib-layout' : 'factor-lib-layout factor-lib-layout-full'}>
        {isExternal && (
          <aside className="card factor-lib-tree" data-ann-target="pcf-factor.backend-detail.tree">
            <div className="factor-section-header">
              <span className="factor-section-title">分类（ISIC 门类 / 类）</span>
            </div>
            <div className="factor-section-body">
              <Tree
                data={treeData}
                selectedId={categoryId}
                defaultExpandedIds={defaultIsicExpandedIds(factors)}
                onSelect={(node) => setCategoryId(node.id)}
              />
            </div>
          </aside>
        )}

        <section className="card">
          <div className="factor-section-header">
            <span className="factor-section-title">
              <Tag tone={libraryTypeTone[library.type]}>{libraryTypeText[library.type]}</Tag>
              <span style={{ marginLeft: 8 }}>库内因子</span>
            </span>
            <span className="flex gap-xs" style={{ alignItems: 'center' }}>
              {versions.length > 1 && (
                <select className="select" value={activeVersionId} onChange={(e) => void load(e.target.value)} data-ann-target="pcf-factor.backend-detail.version">
                  {versions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.versionNo}（{libraryVersionStatusText[item.status]}）
                    </option>
                  ))}
                </select>
              )}
              <span style={{ width: 180 }} data-ann-target="pcf-factor.backend-detail.search">
                <Input value={keyword} placeholder="过程名称 / 英文" onChange={(e) => setKeyword(e.target.value)} />
              </span>
            </span>
          </div>
          <div className="factor-section-body factor-section-flush">
            <div className="factor-table-wrap factor-table-sticky" data-ann-target="pcf-factor.backend-detail.table">
              <Table columns={columns} data={rows} rowKey={(row) => row.id} loading={loading} emptyText="暂无因子" />
            </div>
            <div className="toolbar-tip" style={{ padding: '8px 16px' }}>
              共 {rows.length} 条
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
