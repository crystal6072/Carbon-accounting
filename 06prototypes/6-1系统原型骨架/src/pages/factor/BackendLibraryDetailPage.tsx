import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, FormField, Input, Modal, PageHeader, Table, Tag, Textarea, Tree, useToast } from '@/shared/components'
import type { Column } from '@/shared/components'
import {
  createLibraryVersion,
  deleteLibraryFactor,
  deleteLibraryVersion,
  fetchFactorLibrary,
  fetchFactorsByVersion,
  fetchLibraryVersions,
  offlineFactorLibrary,
  onlineFactorLibrary,
  publishLibraryVersion,
} from '@/mock'
import type { FactorItem, FactorLibrary, FactorLibraryVersion } from '@/types'
import LibraryImportModal from './LibraryImportModal'
import {
  buildIsicTree,
  caliberSummaryText,
  defaultIsicExpandedIds,
  factorUnitText,
  hasSplitCalibers,
  isicPathText,
  libraryStatusText,
  libraryStatusTone,
  libraryTypeSubText,
  libraryTypeText,
  libraryTypeTone,
  libraryVersionStatusText,
  libraryVersionStatusTone,
  matchIsicNode,
  resolveLibraryStatus,
} from './factorMeta'
import './FactorPage.css'

/**
 * 后台 · 因子库详情：库信息卡 + Tab（库内因子 / 版本记录）。
 * - 商业数据库：库内因子只读，仅支持整库导入；
 * - 自建库：草稿版本可新增 / 编辑 / 删除 / 导入，生效中 / 历史版本只读；
 * - 版本操作（**软件发版模型**，同一库同时只有一个「生效中」版本）：
 *   新建版本（以当前生效版本为快照）→ 发布（原生效版本自动转历史）→ 删除草稿；
 * - 新版本有问题可「回滚」：直接把历史版本重新设为生效（当前生效版本自动转历史）；
 * - 草稿未发布前，原生效版本继续可用（前台仍展示原版本），草稿可随时删除，不影响原版本。
 */
export default function BackendLibraryDetailPage() {
  const { libraryId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [library, setLibrary] = useState<FactorLibrary | null>(null)
  const [versions, setVersions] = useState<FactorLibraryVersion[]>([])
  const [activeVersionId, setActiveVersionId] = useState('')
  const [factors, setFactors] = useState<FactorItem[]>([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'factors' | 'versions'>('factors')
  const [versionModal, setVersionModal] = useState(false)
  const [versionForm, setVersionForm] = useState({ versionNo: '', year: '', changeNote: '' })
  const [importOpen, setImportOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  /** 商业数据库：左侧分类树选中节点（'' = 全部分类） */
  const [categoryId, setCategoryId] = useState('')

  const queryVersionId = searchParams.get('versionId') ?? ''

  const load = useCallback(
    async (versionId?: string) => {
      setLoading(true)
      try {
        const lib = await fetchFactorLibrary(libraryId)
        const list = await fetchLibraryVersions(libraryId)
        const preferred =
          versionId ||
          queryVersionId ||
          lib.currentVersionId ||
          list.find((item) => item.status === 'draft')?.id ||
          list[0]?.id ||
          ''
        setLibrary(lib)
        setVersions(list)
        setActiveVersionId(preferred)
        setFactors(preferred ? await fetchFactorsByVersion(libraryId, preferred) : [])
      } catch (error) {
        toast(error instanceof Error ? error.message : '加载失败', 'error')
        setLibrary(null)
      } finally {
        setLoading(false)
      }
    },
    [libraryId, queryVersionId, toast],
  )

  useEffect(() => {
    void load()
  }, [load])

  const activeVersion = versions.find((item) => item.id === activeVersionId)
  const libraryStatus = library ? resolveLibraryStatus(library) : 'unpublished'
  const isExternal = library?.type === 'external'
  /** 可维护因子：仅自建库的草稿版本（商业数据库库内因子一律只读） */
  const editable = !!library && !isExternal && activeVersion?.status === 'draft'
  /** 当前草稿版本之外是否存在「原版本」（生效中 / 历史版本）——草稿未发布前原版本继续可用 */
  const baseVersion = versions.find(
    (item) => item.id !== activeVersionId && (item.status === 'published' || item.status === 'history'),
  )

  /** 商业数据库分类树：全部分类 → ISIC 门类（A~S）→ 类（两位编码） */
  const categoryTree = useMemo(() => (isExternal ? buildIsicTree(factors) : []), [isExternal, factors])
  /** 按分类树节点过滤库内因子 */
  const visibleFactors = useMemo(
    () => (isExternal ? factors.filter((item) => matchIsicNode(item, categoryId)) : factors),
    [factors, categoryId, isExternal],
  )

  const switchVersion = async (versionId: string) => {
    setCategoryId('')
    setActiveVersionId(versionId)
    setFactors(await fetchFactorsByVersion(libraryId, versionId))
  }

  const openVersionModal = () => {
    // 基于库内已有 `V{n}.x` 版本号的最大序号 + 1（避免只按「已发布数」导致重名，如已存在 V2.0 仍建议 V2.0）
    const nums = versions
      .map((item) => Number((/^V(\d+)/i.exec(item.versionNo) ?? [])[1] ?? 0))
      .filter((num) => num > 0)
    const nextNo = nums.length > 0 ? `V${Math.max(...nums) + 1}.0` : 'V1.0'
    setVersionForm({ versionNo: nextNo, year: String(new Date().getFullYear()), changeNote: '' })
    setVersionModal(true)
  }

  const submitVersion = async () => {
    if (!versionForm.versionNo.trim()) {
      toast('请输入版本号', 'error')
      return
    }
    setSubmitting(true)
    try {
      const created = await createLibraryVersion(libraryId, versionForm)
      toast('已新建版本（以当前版本因子为快照）')
      setVersionModal(false)
      await load(created.id)
      setTab('factors')
    } catch (error) {
      toast(error instanceof Error ? error.message : '新建版本失败', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePublish = async (version: FactorLibraryVersion) => {
    if (
      !window.confirm(
        `确认发布版本「${version.versionNo}」？发布后该版本不可修改（只能新建版本），原生效版本将自动转为历史版本，前台与因子匹配使用新版本。`,
      )
    )
      return
    try {
      await publishLibraryVersion(version.id)
      toast('发布成功，新版本已生效')
      await load(version.id)
    } catch (error) {
      toast(error instanceof Error ? error.message : '发布失败', 'error')
    }
  }

  const handleDeleteVersion = async (version: FactorLibraryVersion) => {
    const hasActivated = versions.some((item) => item.id !== version.id && item.status !== 'draft')
    if (
      !window.confirm(
        hasActivated
          ? `确认删除草稿版本「${version.versionNo}」及其库内因子？当前生效版本继续可用，前台不受影响。`
          : `确认删除草稿版本「${version.versionNo}」及其库内因子？该库尚无生效版本，删除后仅保留库信息。`,
      )
    )
      return
    try {
      await deleteLibraryVersion(version.id)
      toast('删除成功')
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    }
  }

  /** 回滚：把历史版本重新设为生效（当前生效版本自动转为历史版本） */
  const handleRollback = async (version: FactorLibraryVersion) => {
    if (
      !window.confirm(
        `确认回滚到版本「${version.versionNo}」？该版本将重新设为生效，当前生效版本转为历史版本；前台与后续匹配将使用回滚版本，已建项目不受影响（结果按当时版本冻结）。`,
      )
    )
      return
    try {
      await publishLibraryVersion(version.id)
      toast(`已回滚到「${version.versionNo}」，该版本重新生效`)
      await load(version.id)
    } catch (error) {
      toast(error instanceof Error ? error.message : '回滚失败', 'error')
    }
  }

  /** 整库下架 / 上架（前台不可见 / 恢复可见；不改变库内版本状态） */
  const handleToggleLibraryOffline = async () => {
    if (!library) return
    if (library.offline) {
      try {
        await onlineFactorLibrary(library.id)
        toast('已上架，前台可见')
        await load(activeVersionId)
      } catch (error) {
        toast(error instanceof Error ? error.message : '上架失败', 'error')
      }
      return
    }
    if (
      !window.confirm(
        `确认下架因子库「${library.name}」？下架后前台不可见、不参与因子匹配；库数据与版本保留，可随时重新上架。`,
      )
    )
      return
    try {
      await offlineFactorLibrary(library.id)
      toast('已下架，前台不可见')
      await load(activeVersionId)
    } catch (error) {
      toast(error instanceof Error ? error.message : '下架失败', 'error')
    }
  }

  const handleDeleteFactor = async (factor: FactorItem) => {
    if (!window.confirm(`确认删除因子「${factor.name}」？`)) return
    try {
      await deleteLibraryFactor(factor.id)
      toast('删除成功')
      await load(activeVersionId)
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error')
    }
  }

  const factorColumns: Column<FactorItem>[] = [
    {
      key: 'name',
      title: '因子名称',
      width: 220,
      render: (row) => (
        <button className="link" onClick={() => navigate(`/model/factor-lib/${libraryId}/factor/${row.id}`)}>
          {row.name}
        </button>
      ),
    },
    { key: 'englishName', title: '英文名称', width: 180, render: (row) => <span className="cell-ellipsis">{row.englishName || '-'}</span> },
    { key: 'alias', title: '因子别名', width: 180, render: (row) => <span className="cell-ellipsis">{row.alias || '-'}</span> },
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
      width: 140,
      render: (row) => (
        <span className="row-actions">
          <button className="link" onClick={() => navigate(`/model/factor-lib/${libraryId}/factor/${row.id}`)}>
            查看
          </button>
          {editable && (
            <>
              <button
                className="link"
                data-ann-target="factor.detail.factor.edit"
                onClick={() => navigate(`/model/factor-lib/${libraryId}/factor/${row.id}/edit?versionId=${activeVersionId}`)}
              >
                编辑
              </button>
              <button className="link link-danger" data-ann-target="factor.detail.factor.delete" onClick={() => handleDeleteFactor(row)}>
                删除
              </button>
            </>
          )}
        </span>
      ),
    },
  ]

  const versionColumns: Column<FactorLibraryVersion>[] = [
    { key: 'versionNo', title: '版本号', width: 110, render: (row) => <span className="mono">{row.versionNo}</span> },
    { key: 'year', title: '适用年度', width: 100, render: (row) => row.year || '-' },
    {
      key: 'status',
      title: '状态',
      width: 100,
      render: (row) => <Tag tone={libraryVersionStatusTone[row.status]}>{libraryVersionStatusText[row.status]}</Tag>,
    },
    { key: 'factorCount', title: '因子数', width: 80 },
    {
      key: 'basedOnVersionNo',
      title: '基于版本',
      width: 100,
      render: (row) => <span className="mono">{row.basedOnVersionNo || '-'}</span>,
    },
    { key: 'changeNote', title: '更新说明', render: (row) => <span className="cell-ellipsis">{row.changeNote || '-'}</span> },
    { key: 'publishedAt', title: '首次发布', width: 150, render: (row) => row.publishedAt || '-' },
    { key: 'lastActivatedAt', title: '最近生效', width: 150, render: (row) => row.lastActivatedAt || '-' },
    {
      key: 'actions',
      title: '操作',
      width: 180,
      render: (row) => (
        <span className="row-actions">
          <button
            className="link"
            onClick={() => {
              void switchVersion(row.id)
              setTab('factors')
            }}
          >
            查看因子
          </button>
          {row.status === 'draft' && (
            <button className="link" data-ann-target="factor.detail.version.publish" onClick={() => handlePublish(row)}>
              发布
            </button>
          )}
          {row.status === 'draft' && (
            <button className="link link-danger" data-ann-target="factor.detail.version.delete" onClick={() => handleDeleteVersion(row)}>
              删除
            </button>
          )}
          {row.status === 'history' && (
            <button className="link" data-ann-target="factor.detail.version.rollback" onClick={() => void handleRollback(row)}>
              回滚到此版本
            </button>
          )}
          {row.status === 'published' && <span className="toolbar-tip">当前生效</span>}
        </span>
      ),
    },
  ]

  if (!library) {
    return (
      <>
        <PageHeader breadcrumb={['系统管理', '模型管理', '因子库管理']} title="因子库详情" />
        <div className="card">
          <div className="empty">{loading ? '加载中…' : '因子库不存在或已被删除'}</div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '模型管理', '因子库管理', library.name]}
        title={library.name}
        description={`${library.code} · ${libraryTypeText[library.type]} · 维护方 ${library.maintainer}`}
        onBack={() => navigate('/model/factor-lib')}
        actions={
          <>
            {library.currentVersionId && (
              <Button data-ann-target="factor.detail.offline" onClick={handleToggleLibraryOffline}>
                {library.offline ? '上架' : '下架'}
              </Button>
            )}
            <Button data-ann-target="factor.detail.version.new" onClick={openVersionModal}>
              新建版本
            </Button>
            {activeVersion?.status === 'draft' && (
              <>
                <Button variant="primary" data-ann-target="factor.detail.version.publish" onClick={() => handlePublish(activeVersion)}>
                  发布草稿（{activeVersion.versionNo}）
                </Button>
                <Button variant="danger" data-ann-target="factor.detail.version.delete" onClick={() => handleDeleteVersion(activeVersion)}>
                  删除草稿版本
                </Button>
              </>
            )}
            {activeVersion?.status === 'history' && (
              <Button variant="primary" data-ann-target="factor.detail.version.rollback" onClick={() => void handleRollback(activeVersion)}>
                回滚到此版本（{activeVersion.versionNo}）
              </Button>
            )}
            {editable && (
              <Button
                data-ann-target="factor.detail.factor.new"
                onClick={() => navigate(`/model/factor-lib/${libraryId}/factor/new?versionId=${activeVersionId}`)}
              >
                新增因子
              </Button>
            )}
            {isExternal && (
              <Button
                data-ann-target="factor.detail.import"
                disabled={!activeVersion || activeVersion.status !== 'draft'}
                onClick={() => setImportOpen(true)}
              >
                整库导入
              </Button>
            )}
          </>
        }
      />

      <div className="factor-stack">
        <section className="card" data-ann-target="factor.detail.info">
          <div className="factor-section-header">
            <span className="factor-section-title">库信息</span>
            <Tag tone={libraryTypeTone[library.type]}>{libraryTypeText[library.type]}</Tag>
          </div>
          <div className="factor-section-body">
            <div className="detail-list">
              <div className="detail-item"><span className="detail-label">库编码</span><span className="detail-value mono">{library.code}</span></div>
              <div className="detail-item"><span className="detail-label">库名称</span><span className="detail-value">{library.name}</span></div>
              <div className="detail-item"><span className="detail-label">库来源</span><span className="detail-value">{libraryTypeText[library.type]}（{libraryTypeSubText[library.type]}）</span></div>
              <div className="detail-item"><span className="detail-label">维护方</span><span className="detail-value">{library.maintainer}</span></div>
              <div className="detail-item"><span className="detail-label">库状态</span><span className="detail-value"><Tag tone={libraryStatusTone[libraryStatus]}>{libraryStatusText[libraryStatus]}</Tag></span></div>
              <div className="detail-item"><span className="detail-label">版本数</span><span className="detail-value">{library.versionCount}</span></div>
              <div className="detail-item"><span className="detail-label">因子数</span><span className="detail-value">{library.factorCount}</span></div>
              <div className="detail-item factor-detail-item-full"><span className="detail-label">库描述</span><span className="detail-value">{library.description || '-'}</span></div>
            </div>
          </div>
          <div className="factor-section-body factor-section-tip">
            {library.offline && (
              <div className="factor-section-tip">
                该库已下架：前台不可见、不参与因子匹配；库数据与版本保留，可随时「上架」恢复；下架后可在库列表删除该库。
              </div>
            )}
            {isExternal
              ? '商业数据库：整库导入、**库内因子只读**，前台按 ISIC 门类（A~S）分类浏览；如需更新，新建版本后重新整库导入。'
              : '自建库：草稿版本可维护因子；发布后版本只读，变更须新建版本；新版本有问题可回滚到历史版本。'}
          </div>
        </section>

        <section className="card">
          <div className="factor-section-header">
            <span className="factor-section-title">{tab === 'factors' ? '库内因子' : '版本记录'}</span>
            {tab === 'factors' && versions.length > 0 && (
              <span className="flex gap-xs" style={{ alignItems: 'center' }}>
                <span className="toolbar-tip">当前版本</span>
                <select className="select" data-ann-target="factor.detail.version.switch" value={activeVersionId} onChange={(e) => void switchVersion(e.target.value)}>
                  {versions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.versionNo}（{libraryVersionStatusText[item.status]}）
                    </option>
                  ))}
                </select>
              </span>
            )}
          </div>

          <div className="factor-tabs">
            <button
              type="button"
              className={['factor-tab', tab === 'factors' ? 'factor-tab-active' : ''].filter(Boolean).join(' ')}
              onClick={() => setTab('factors')}
            >
              库内因子
            </button>
            <button
              type="button"
              className={['factor-tab', tab === 'versions' ? 'factor-tab-active' : ''].filter(Boolean).join(' ')}
              onClick={() => setTab('versions')}
            >
              版本记录
            </button>
          </div>

          <div className="factor-section-body factor-section-flush">
            {tab === 'factors' ? (
              isExternal ? (
                <div className="factor-lib-layout">
                  <aside className="card factor-lib-tree" data-ann-target="factor.detail.category">
                    <div className="factor-section-header">
                      <span className="factor-section-title">分类（ISIC 门类 / 类）</span>
                    </div>
                    <div className="factor-section-body">
                      <Tree
                        data={categoryTree}
                        selectedId={categoryId}
                        defaultExpandedIds={defaultIsicExpandedIds(factors)}
                        onSelect={(node) => setCategoryId(node.id)}
                      />
                    </div>
                  </aside>
                  <div className="factor-table-wrap factor-table-sticky" data-ann-target="factor.detail.factors">
                    <Table
                      columns={factorColumns}
                      data={visibleFactors}
                      rowKey={(row) => row.id}
                      loading={loading}
                      emptyText={categoryId ? '该分类下暂无因子' : '当前版本暂无因子'}
                    />
                  </div>
                </div>
              ) : (
                <>
                  {activeVersion && activeVersion.status === 'published' && (
                    <div className="factor-section-body factor-section-tip">
                      当前为「生效中」版本，只读；如需变更请「新建版本」，新版本有问题可回滚到历史版本。
                    </div>
                  )}
                  {activeVersion && activeVersion.status === 'history' && (
                    <div className="factor-section-body factor-section-tip">
                      当前为「历史版本」，只读；如需恢复生效请点右上角「回滚到此版本」，如需变更请「新建版本」。
                    </div>
                  )}
                  {activeVersion && activeVersion.status === 'draft' && baseVersion && (
                    <div className="factor-section-body factor-section-tip">
                      草稿「{activeVersion.versionNo}」编辑中：当前生效版本「{baseVersion.versionNo}（
                      {libraryVersionStatusText[baseVersion.status]}）」继续可用，前台不受影响；草稿发布后才会生效。
                      <button className="link" style={{ marginLeft: 8 }} onClick={() => void switchVersion(baseVersion.id)}>
                        返回生效版本
                      </button>
                    </div>
                  )}
                  <div className="factor-table-wrap factor-table-sticky" data-ann-target="factor.detail.factors">
                    <Table columns={factorColumns} data={factors} rowKey={(row) => row.id} loading={loading} emptyText="当前版本暂无因子" />
                  </div>
                </>
              )
            ) : (
              <>
                <div className="factor-section-body factor-section-tip">
                  发版规则：同一库同时只有一个「生效中」版本；发布新版本后原生效版本自动转为「历史版本」；新版本有问题可「回滚」，
                  把历史版本直接重新设为生效（原生效版本转历史）。版本号单调递增（= 发布次序），「基于版本」标明该版本复制自哪个版本。
                </div>
                <div className="factor-table-wrap">
                  <Table columns={versionColumns} data={versions} rowKey={(row) => row.id} loading={loading} />
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      <Modal
        open={versionModal}
        title="新建库版本"
        onClose={() => setVersionModal(false)}
        footer={
          <>
            <Button onClick={() => setVersionModal(false)}>取消</Button>
            <Button variant="primary" onClick={submitVersion} disabled={submitting}>
              {submitting ? '创建中…' : '创建'}
            </Button>
          </>
        }
      >
        <div className="form-grid">
          <FormField label="版本号" required hint="商业数据库如 3.12；自建库如 V1.1 / 2025">
            <Input value={versionForm.versionNo} onChange={(e) => setVersionForm((prev) => ({ ...prev, versionNo: e.target.value }))} />
          </FormField>
          <FormField label="适用年度">
            <Input value={versionForm.year} placeholder="如 2025" onChange={(e) => setVersionForm((prev) => ({ ...prev, year: e.target.value }))} />
          </FormField>
          <FormField label="更新说明" full>
            <Textarea
              rows={3}
              value={versionForm.changeNote}
              placeholder="如：更新电网因子与天然气因子"
              onChange={(e) => setVersionForm((prev) => ({ ...prev, changeNote: e.target.value }))}
            />
          </FormField>
        </div>
        <div className="factor-section-tip" style={{ marginTop: 8 }}>
          新版本将以当前生效版本的因子为快照复制为草稿；发布后原生效版本自动转为历史版本，新版本在前台与因子匹配中生效。
        </div>
      </Modal>

      <LibraryImportModal
        open={importOpen}
        libraryId={libraryId}
        versionId={activeVersionId}
        title={isExternal ? '商业数据库 · 整库导入' : '库内因子批量导入'}
        onClose={() => setImportOpen(false)}
        onImported={(success, failed) => {
          toast(failed === 0 ? `导入成功：共 ${success} 条` : `导入完成：成功 ${success} 条，失败 ${failed} 条`, failed === 0 ? undefined : 'error')
          void load(activeVersionId)
        }}
      />
    </>
  )
}
