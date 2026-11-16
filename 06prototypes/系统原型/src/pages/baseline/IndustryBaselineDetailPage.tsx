import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, PageHeader, Tag, useToast } from '@/shared/components'
import { copyBaseline, fetchBaseline } from '@/mock/baselines'
import type { IndustryBaseline } from '@/mock/baselines'
import {
  DATA_SOURCE_TEXT,
  DATA_SOURCE_TONE,
  boundaryText,
  boundaryTone,
  dateText,
  numText,
} from './baselineMeta'
import './IndustryBaselinePage.css'

export default function IndustryBaselineDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<IndustryBaseline | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      setDetail(await fetchBaseline(id))
    } catch (error) {
      toast(error instanceof Error ? error.message : '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  useEffect(() => {
    void load()
  }, [load])

  const handleCopy = async () => {
    if (!detail) return
    try {
      const copied = await copyBaseline(detail.id)
      toast('已复制为新记录')
      navigate(`/baseline/industry/${copied.id}/edit`)
    } catch (error) {
      toast(error instanceof Error ? error.message : '复制失败', 'error')
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader breadcrumb={['系统管理', '产品碳基线库', '行业基线录入', '基线详情']} title="基线详情" />
        <div className="card"><div className="empty">加载中…</div></div>
      </>
    )
  }

  if (!detail) {
    return (
      <>
        <PageHeader breadcrumb={['系统管理', '产品碳基线库', '行业基线录入', '基线详情']} title="基线详情" />
        <div className="card"><div className="empty">基线不存在或已被删除</div></div>
      </>
    )
  }

  const d = detail
  const stageRows = d.stages.filter((s) => s.stageLevel === 1)

  const baseItems: Array<[string, ReactNode]> = [
    ['数据来源', <span key="ds"><Tag tone={DATA_SOURCE_TONE[d.dataSource]}>{DATA_SOURCE_TEXT[d.dataSource]}</Tag>{d.orgName ? ` · ${d.orgName}` : ''}</span>],
    ['基线编号', <span className="mono" key="code">{d.baselineCode}</span>],
    ['基线名称', d.baselineName],
    ['行业', <span className="mono nowrap" key="ind" title={d.industryPath}>{d.industryName}</span>],
    ['产品分类', d.productCategoryNames.length ? d.productCategoryNames.map((n) => <Tag key={n} tone="default">{n}</Tag>) : '-'],
    ['系统边界', <Tag key="b" tone={boundaryTone(d.boundary)}>{boundaryText(d.boundary)}</Tag>],
    ['GWP 版本', d.gwpVersion || '-'],
    ['基准年', String(d.baseYear)],
    ['适用周期', d.periodStart || d.periodEnd ? `${dateText(d.periodStart)} ~ ${dateText(d.periodEnd)}` : '-'],
    ['功能单位', <span className="mono" key="u">{`${d.unitValue} ${d.unitCode}`}</span>],
    ['来源类型', d.sourceType || '-'],
    ['出具机构', d.issuer || '-'],
  ]

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '产品碳基线库', '行业基线录入', '基线详情']}
        title={<span data-ann-target="baseline.detail.title">{d.baselineName}</span>}
        actions={
          <>
            <Button onClick={() => navigate(-1)}>返回列表</Button>
            <Button variant="primary" data-ann-target="baseline.detail.edit" onClick={() => navigate(`/baseline/industry/${d.id}/edit`)}>
              编辑
            </Button>
            <Button data-ann-target="baseline.detail.copy" onClick={handleCopy}>复制</Button>
          </>
        }
      />

      <div className="standard-stack">
        <section className="card">
          <div className="standard-section-header">
            <span className="standard-section-title">基本信息</span>
            <span className="toolbar-tip">
              基线总值 <span className="mono baseline-detail-total">{numText(d.totalEmission)}</span> {d.unitCode}
            </span>
          </div>
          <div className="detail-list">
            {baseItems.map(([label, value], idx) => (
              <div className="detail-item" key={`${label}-${idx}`}>
                <span className="detail-label">{label}</span>
                <span className="detail-value">{value}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card" data-ann-target="baseline.detail.stages">
          <div className="standard-section-header">
            <span className="standard-section-title">分阶段基准值</span>
          </div>
          <div className="standard-section-body">
            {stageRows.length === 0 ? (
              <div className="standard-attach-tip">暂无阶段数据</div>
            ) : (
              <div className="baseline-stage-table">
                <div className="baseline-stage-head">
                  <span className="bs-col bs-name">阶段</span>
                  <span className="bs-col bs-num">碳足迹基准值</span>
                  <span className="bs-col bs-num">先进值</span>
                  <span className="bs-col bs-num">样本量</span>
                </div>
                {stageRows.map((s) => (
                  <div className="baseline-stage-row" key={s.stageCode}>
                    <span className="bs-col bs-name">{s.stageName}</span>
                    <span className="bs-col bs-num mono">{numText(s.stageEmission)}</span>
                    <span className="bs-col bs-num mono">{s.advancedValue === undefined ? '-' : numText(s.advancedValue)}</span>
                    <span className="bs-col bs-num mono">{s.sampleSize === undefined ? '-' : String(s.sampleSize)}</span>
                  </div>
                ))}
              </div>
            )}
            {d.totalDiffReason && (
              <div className="standard-attach-tip">基线总值偏差说明：{d.totalDiffReason}</div>
            )}
          </div>
        </section>

        {d.remark && (
          <section className="card">
            <div className="standard-section-header">
              <span className="standard-section-title">备注</span>
            </div>
            <div className="standard-section-body">{d.remark}</div>
          </section>
        )}

        <section className="card">
          <div className="standard-section-header">
            <span className="standard-section-title">制单信息</span>
          </div>
          <div className="detail-list">
            <div className="detail-item"><span className="detail-label">创建人</span><span className="detail-value">{d.createdBy}</span></div>
            <div className="detail-item"><span className="detail-label">创建时间</span><span className="detail-value">{d.createdAt}</span></div>
            <div className="detail-item"><span className="detail-label">最后修改人</span><span className="detail-value">{d.updatedBy}</span></div>
            <div className="detail-item"><span className="detail-label">最后修改时间</span><span className="detail-value">{d.updatedAt}</span></div>
          </div>
        </section>
      </div>
    </>
  )
}
