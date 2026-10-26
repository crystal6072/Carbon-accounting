import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button, PageHeader, Table, Tag, useToast } from '@/shared/components'
import type { Column } from '@/shared/components'
import {
  deleteMyFactor,
  fetchFactor,
  fetchFactorCollectState,
  fetchFactorLibrary,
  fetchLibraryVersions,
  fetchMyFactor,
  refreshMyFactorFromSource,
} from '@/mock'
import type { FactorExchange, FactorLibraryType, FactorLibraryVersionStatus, MyFactor } from '@/types'
import FactorCollectModal from './FactorCollectModal'
import {
  CALIBER_ROWS,
  CALIBER_TOTAL_ROW,
  caliberValue,
  factorUnitText,
  hasSplitCalibers,
  isicPathText,
  myFactorOriginText,
  myFactorOriginTone,
} from './factorMeta'

/** 指标明细行（分指标 / 总指标共用） */
interface CaliberDetailRow {
  id: string
  label: string
  value: number | null
  hint: string
}
import './FactorPage.css'

type TabKey = 'info' | 'basic' | 'exchanges'

/** 输入输出表：按方向切换「对端过程名称」列标题（输入 = 上游 / 输出 = 下游） */
const buildExchangeColumns = (counterpartTitle: string): Column<FactorExchange>[] => [
  { key: 'name', title: '名称', width: 260, render: (row) => <span className="cell-ellipsis">{row.name}</span> },
  { key: 'amount', title: '数量', width: 200, render: (row) => <span className="mono nowrap">{row.amount}</span> },
  { key: 'unit', title: '单位', width: 80 },
  { key: 'counterpart', title: counterpartTitle, render: (row) => row.counterpart || '-' },
]

/**
 * 因子详情（三类库字段一致）：Tab「因子信息 / 数据基本信息 / 输入输出信息」。
 * - 因子信息：名称 / 别名 / 场景 / 因子值 / 单位 / 单位类别 / 地域 / 状态 / 描述；
 * - 数据基本信息：产品名称 / CAS 号 / 所有者 / 过程描述 + 时间 / 地理 / 工艺技术 / 完整性说明；
 * - 输入输出信息：输入保留「上游过程名称」、输出保留「下游过程名称」。
 * **不展示「来源信息」**。
 */
export default function FactorDetailPage() {
  const { libraryId = '', factorId = '' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()

  const isMy = location.pathname.startsWith('/pcf/my-factor')
  const isPublished = location.pathname.startsWith('/pcf/factor-libraries')
  const basePath = isMy
    ? `/pcf/my-factor/${libraryId}/factor`
    : isPublished
      ? `/pcf/factor-libraries/${libraryId}/factor`
      : `/model/factor-lib/${libraryId}/factor`

  const [factor, setFactor] = useState<MyFactor | null>(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<TabKey>('info')
  const [libraryType, setLibraryType] = useState<FactorLibraryType | null>(null)
  const [versionStatus, setVersionStatus] = useState<FactorLibraryVersionStatus | null>(null)
  /* 五角星收藏：已发布库因子在详情页收藏 / 取消收藏到「我的因子库」 */
  const [collected, setCollected] = useState(false)
  const [myFactorId, setMyFactorId] = useState<string | undefined>(undefined)
  const [collectOpen, setCollectOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const detail = isMy ? await fetchMyFactor(factorId) : ((await fetchFactor(factorId)) as MyFactor)
      setFactor(detail)
      if (!isMy && !isPublished) {
        const library = await fetchFactorLibrary(libraryId)
        setLibraryType(library.type)
        const versions = await fetchLibraryVersions(libraryId)
        setVersionStatus(versions.find((item) => item.id === detail.libraryVersionId)?.status ?? null)
      } else if (isPublished) {
        const state = await fetchFactorCollectState(factorId)
        setCollected(state.collected)
        setMyFactorId(state.myFactorId)
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : '因子加载失败', 'error')
      setFactor(null)
    } finally {
      setLoading(false)
    }
  }, [factorId, isMy, isPublished, libraryId, toast])

  useEffect(() => {
    void load()
  }, [load])

  /** 五角星收藏：未收藏 → 打开收藏弹窗；已收藏 → 取消收藏（删除我的因子副本） */
  const handleToggleCollect = async () => {
    if (!factor) return
    if (!collected) {
      setCollectOpen(true)
      return
    }
    if (!myFactorId) return
    if (!window.confirm(`确认取消收藏「${factor.name}」？将删除「我的因子库」中的副本。`)) return
    try {
      await deleteMyFactor(myFactorId)
      toast('已取消收藏')
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '取消收藏失败', 'error')
    }
  }

  const handleUpdate = async () => {
    if (!factor) return
    try {
      await refreshMyFactorFromSource(factor.id)
      toast('已更新为源库最新版本')
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '更新失败', 'error')
    }
  }

  const breadcrumbRoot = isMy
    ? ['产品碳足迹', '因子管理', '我的因子库']
    : isPublished
      ? ['产品碳足迹', '因子管理', '背景数据库']
      : ['系统管理', '模型管理', '因子库管理']

  if (!factor) {
    return (
      <>
        <PageHeader breadcrumb={breadcrumbRoot} title="因子详情" />
        <div className="card">
          <div className="empty">{loading ? '加载中…' : '因子不存在或已被删除'}</div>
        </div>
      </>
    )
  }

  /** 可编辑：前台已发布预览只读；商业数据库只读；自建库仅草稿版本可编辑 */
  const canEdit = !isPublished && (isMy || (libraryType === 'builtin' && versionStatus === 'draft'))

  const ext = factor.ext ?? {}
  const inputs = (factor.exchanges ?? []).filter((item) => item.direction === 'input')
  const outputs = (factor.exchanges ?? []).filter((item) => item.direction === 'output')

  /** 分指标因子：展示各分指标值 + 总指标值；总指标因子：仅展示总指标值 */
  const isSplit = hasSplitCalibers(factor)
  const caliberRows: CaliberDetailRow[] = (isSplit ? [...CALIBER_ROWS, CALIBER_TOTAL_ROW] : [CALIBER_TOTAL_ROW]).map(
    (row) => ({
      id: row.key,
      label: row.fullLabel,
      value:
        row.key === 'gwpTotal'
          ? caliberValue(factor, 'gwpTotal') ?? factor.value
          : caliberValue(factor, row.key),
      hint: row.key === 'gwpTotal' && !isSplit ? '单一口径总指标值' : row.hint,
    }),
  )
  const caliberColumns: Column<CaliberDetailRow>[] = [
    { key: 'label', title: '指标', width: 240, render: (row) => row.label },
    {
      key: 'value',
      title: `数值（${factorUnitText(factor)}）`,
      width: 180,
      render: (row) => <span className="mono nowrap">{row.value ?? '-'}</span>,
    },
    { key: 'hint', title: '口径说明', render: (row) => <span className="cell-ellipsis">{row.hint}</span> },
  ]

  return (
    <>
      <PageHeader
        breadcrumb={[...breadcrumbRoot, factor.name]}
        title={<span data-ann-target="factor.factor.detail"><span data-ann-target="pcf-factor.detail">{factor.name}</span></span>}
        description={`${factor.code} · ${factor.value} ${factorUnitText(factor)}`}
        onBack={() => navigate(-1)}
        actions={
          <>
            {isPublished && (
              <Button onClick={handleToggleCollect} data-ann-target="pcf-factor.collect.star">{collected ? '★ 已收藏' : '☆ 收藏'}</Button>
            )}
            {canEdit && (
              <Button variant="primary" onClick={() => navigate(`${basePath}/${factor.id}/edit`)} data-ann-target="pcf-factor.detail.edit">
                编辑
              </Button>
            )}
            {isMy && factor.updateAvailable && <Button onClick={handleUpdate} data-ann-target="pcf-factor.detail.update">一键更新</Button>}
          </>
        }
      />

      <div className="factor-stack">
        {isMy && factor.origin === 'collected' && (
          <section className="card" data-ann-target="pcf-factor.collect.source">
            <div className="factor-section-header">
              <span className="factor-section-title">收藏来源</span>
              {factor.updateAvailable ? <Tag tone="warning">有新版本可更新</Tag> : <Tag tone="success">已是最新</Tag>}
            </div>
            <div className="factor-section-body">
              <div className="detail-list">
                <div className="detail-item"><span className="detail-label">来源库</span><span className="detail-value">{factor.sourceLibraryName}</span></div>
                <div className="detail-item"><span className="detail-label">源版本</span><span className="detail-value">{factor.sourceVersionNo}</span></div>
                <div className="detail-item"><span className="detail-label">源因子编码</span><span className="detail-value mono">{factor.sourceFactorCode}</span></div>
                <div className="detail-item"><span className="detail-label">当前值</span><span className="detail-value mono">{factor.value} {factorUnitText(factor)}</span></div>
              </div>
            </div>
          </section>
        )}

        <section className="card">
          <div className="factor-tabs">
            <button
              type="button"
              className={['factor-tab', tab === 'info' ? 'factor-tab-active' : ''].filter(Boolean).join(' ')}
              onClick={() => setTab('info')}
            >
              因子信息
            </button>
            <button
              type="button"
              className={['factor-tab', tab === 'basic' ? 'factor-tab-active' : ''].filter(Boolean).join(' ')}
              onClick={() => setTab('basic')}
            >
              数据基本信息
            </button>
            <button
              type="button"
              className={['factor-tab', tab === 'exchanges' ? 'factor-tab-active' : ''].filter(Boolean).join(' ')}
              onClick={() => setTab('exchanges')}
            >
              输入输出信息
            </button>
          </div>

          {tab === 'info' && (
            <>
              <div className="factor-section-header">
                <span className="factor-section-title">因子信息</span>
                {isMy && (
                  <Tag tone={myFactorOriginTone[factor.origin ?? 'manual']}>
                    {myFactorOriginText[factor.origin ?? 'manual']}
                  </Tag>
                )}
              </div>
              <div className="factor-section-body">
                <div className="detail-list">
                  <div className="detail-item"><span className="detail-label">因子编码</span><span className="detail-value mono">{factor.code}</span></div>
                  <div className="detail-item"><span className="detail-label">因子名称</span><span className="detail-value">{factor.name}</span></div>
                  <div className="detail-item"><span className="detail-label">英文名称</span><span className="detail-value">{factor.englishName || '-'}</span></div>
                  <div className="detail-item"><span className="detail-label">因子别名</span><span className="detail-value">{factor.alias || '-'}</span></div>
                  <div className="detail-item"><span className="detail-label">适用场景</span><span className="detail-value">{factor.scenario || '-'}</span></div>
                  <div className="detail-item"><span className="detail-label">碳排放因子值</span><span className="detail-value mono">{factor.value}</span></div>
                  <div className="detail-item"><span className="detail-label">单位 / 活动数据单位</span><span className="detail-value mono">{factorUnitText(factor)}</span></div>
                  <div className="detail-item"><span className="detail-label">单位类别</span><span className="detail-value">{factor.unitCategory || '-'}</span></div>
                  <div className="detail-item"><span className="detail-label">地域</span><span className="detail-value">{factor.region || '-'}</span></div>
                  <div className="detail-item factor-detail-item-full"><span className="detail-label">描述</span><span className="detail-value">{factor.description || '-'}</span></div>
                </div>
              </div>
              <div className="factor-section-header">
                <span className="factor-section-title">指标明细</span>
                <Tag tone={isSplit ? 'info' : 'default'}>{isSplit ? '分指标' : '总指标'}</Tag>
              </div>
              <div className="factor-section-body factor-section-flush">
                <div className="factor-table-wrap">
                  <Table columns={caliberColumns} data={caliberRows} rowKey={(row) => row.id} />
                </div>
              </div>

            </>
          )}

          {tab === 'basic' && (
            <>
              <div className="factor-section-header">
                <span className="factor-section-title">基本信息</span>
              </div>
              <div className="factor-section-body">
                <div className="detail-list">
                  <div className="detail-item"><span className="detail-label">产品名称</span><span className="detail-value">{ext.productName || '-'}</span></div>
                  <div className="detail-item"><span className="detail-label">CAS 号</span><span className="detail-value mono">{ext.casNo || '-'}</span></div>
                  <div className="detail-item"><span className="detail-label">所有者</span><span className="detail-value">{ext.owner || '-'}</span></div>
                  {!!ext.isicCode && (
                    <div className="detail-item"><span className="detail-label">所属分类</span><span className="detail-value">{isicPathText(factor)}</span></div>
                  )}
                  <div className="detail-item factor-detail-item-full"><span className="detail-label">过程描述</span><span className="detail-value">{ext.processDescription || '-'}</span></div>
                </div>
              </div>
              <div className="factor-section-header"><span className="factor-section-title">时间信息</span></div>
              <div className="factor-section-body">
                <div className="detail-list">
                  <div className="detail-item"><span className="detail-label">时间边界</span><span className="detail-value">{ext.timeBoundary || '-'}</span></div>
                  <div className="detail-item factor-detail-item-full"><span className="detail-label">时间描述</span><span className="detail-value">{ext.timeDesc || '-'}</span></div>
                </div>
              </div>
              <div className="factor-section-header"><span className="factor-section-title">地理信息</span></div>
              <div className="factor-section-body">
                <div className="detail-list">
                  <div className="detail-item"><span className="detail-label">地域</span><span className="detail-value">{ext.geoName || factor.region || '-'}</span></div>
                  <div className="detail-item factor-detail-item-full"><span className="detail-label">地理信息描述</span><span className="detail-value">{ext.geoDesc || '-'}</span></div>
                </div>
              </div>
              <div className="factor-section-header"><span className="factor-section-title">工艺技术</span></div>
              <div className="factor-section-body">
                <div className="detail-list">
                  <div className="detail-item factor-detail-item-full"><span className="detail-label">工艺技术描述</span><span className="detail-value">{ext.techDesc || '-'}</span></div>
                </div>
              </div>
              <div className="factor-section-header"><span className="factor-section-title">技术信息</span></div>
              <div className="factor-section-body">
                <div className="detail-list">
                  <div className="detail-item factor-detail-item-full"><span className="detail-label">完整性说明</span><span className="detail-value">{ext.completeness || '-'}</span></div>
                </div>
              </div>
            </>
          )}

          {tab === 'exchanges' && (
            <>
              <div className="factor-section-header">
                <span className="factor-section-title">输入数据</span>
                <span className="toolbar-tip">共 {inputs.length} 条</span>
              </div>
              <div className="factor-section-body factor-section-flush">
                <div className="factor-table-wrap">
                  <Table columns={buildExchangeColumns('上游过程名称')} data={inputs} rowKey={(row) => row.id} emptyText="暂无输入数据" />
                </div>
              </div>
              <div className="factor-section-header">
                <span className="factor-section-title">输出数据</span>
                <span className="toolbar-tip">共 {outputs.length} 条</span>
              </div>
              <div className="factor-section-body factor-section-flush">
                <div className="factor-table-wrap">
                  <Table columns={buildExchangeColumns('下游过程名称')} data={outputs} rowKey={(row) => row.id} emptyText="暂无输出数据" />
                </div>
              </div>
            </>
          )}
        </section>

        <section className="card">
          <div className="factor-section-header"><span className="factor-section-title">制单信息</span></div>
          <div className="factor-section-body">
            <div className="detail-list">
              <div className="detail-item"><span className="detail-label">创建人</span><span className="detail-value">{factor.createdBy}</span></div>
              <div className="detail-item"><span className="detail-label">创建时间</span><span className="detail-value">{factor.createdAt}</span></div>
              <div className="detail-item"><span className="detail-label">更新人</span><span className="detail-value">{factor.updatedBy}</span></div>
              <div className="detail-item"><span className="detail-label">更新时间</span><span className="detail-value">{factor.updatedAt}</span></div>
            </div>
          </div>
        </section>
      </div>

      {isPublished && (
        <FactorCollectModal
          open={collectOpen}
          sourceVersionId={factor.libraryVersionId ?? ''}
          factorIds={[factor.id]}
          onClose={() => setCollectOpen(false)}
          onCollected={(success, failed) => {
            toast(failed === 0 ? `收藏成功：共 ${success} 条` : '收藏未完成', failed === 0 ? undefined : 'error')
            void load()
          }}
        />
      )}
    </>
  )
}
