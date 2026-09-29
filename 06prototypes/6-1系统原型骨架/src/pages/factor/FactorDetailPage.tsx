import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button, PageHeader, Table, Tag, useToast } from '@/shared/components'
import type { Column } from '@/shared/components'
import { deleteFactor, fetchFactorDetail, updateFactorStatus } from '@/mock'
import type { FactorDetail, FactorReferenceItem } from '@/types'
import FactorConfirmModal from './FactorConfirmModal'
import type { FactorConfirmMode } from './FactorConfirmModal'
import {
  canDeleteFactor,
  canDisableFactor,
  canEnableFactor,
  canMaintainFactor,
  factorCategoryText,
  factorCategoryTone,
  factorSourceSubText,
  factorSourceText,
  factorSourceTone,
  factorUnitText,
  industryText,
  publisherText,
  useStatusText,
  useStatusTone,
} from './factorMeta'
import './FactorPage.css'

export default function FactorDetailPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const isFrontend = location.pathname.startsWith('/pcf/my-factor')
  const basePath = isFrontend ? '/pcf/my-factor' : '/model/factor'

  const [factor, setFactor] = useState<FactorDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState<FactorConfirmMode | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setFactor(await fetchFactorDetail(id))
    } catch (error) {
      toast(error instanceof Error ? error.message : '因子加载失败', 'error')
      setFactor(null)
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  useEffect(() => {
    void load()
  }, [load])

  const handleConfirm = async () => {
    if (!factor || !confirm) return
    try {
      if (confirm === 'delete') {
        await deleteFactor(factor.id)
        toast('删除成功')
        navigate(basePath)
        return
      }
      await updateFactorStatus(factor.id, confirm === 'enable' ? 'enabled' : 'disabled')
      toast(confirm === 'enable' ? '启用成功' : '禁用成功')
      setConfirm(null)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  /** 前台「我的因子库」中后台维护因子**只读**：不可编辑 / 启用 / 禁用 / 删除 */
  const readonly = !!factor && isFrontend && !canMaintainFactor(factor)

  const referenceColumns: Column<FactorReferenceItem>[] = [
    { key: 'module', title: '引用模块', width: 130 },
    { key: 'target', title: '引用对象', render: (row) => row.target || '-' },
    { key: 'field', title: '引用字段', width: 180 },
  ]

  if (!factor) {
    return (
      <>
        <PageHeader
          breadcrumb={isFrontend ? ['前台业务平台', '我的因子库'] : ['后台管理', '核算模型', '排放因子库']}
          title="因子详情"
        />
        <div className="card">
          <div className="empty">{loading ? '加载中…' : '因子不存在或已被删除'}</div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={
          isFrontend ? ['前台业务平台', '我的因子库', factor.name] : ['后台管理', '核算模型', '排放因子库', factor.name]
        }
        title={factor.name}
        description={`${factor.code} · ${factorCategoryText[factor.category]} · ${factor.value} ${factorUnitText(factor)}`}
        actions={
          <>
            <Button onClick={() => navigate(basePath)}>返回列表</Button>
            {!readonly && (
              <Button variant="primary" onClick={() => navigate(`${basePath}/${factor.id}/edit`)}>
                编辑
              </Button>
            )}
            {!readonly &&
              (factor.status === 'enabled'
                ? canDisableFactor(factor) && <Button onClick={() => setConfirm('disable')}>禁用</Button>
                : canEnableFactor(factor) && <Button onClick={() => setConfirm('enable')}>启用</Button>)}
            {!readonly && canDeleteFactor(factor) && (
              <Button variant="danger" onClick={() => setConfirm('delete')}>
                删除
              </Button>
            )}
          </>
        }
      />

      <div className="factor-stack">
        <section className="card">
          <div className="factor-section-header">
            <span className="factor-section-title">因子信息</span>
            <span className="toolbar-tip">
              {readonly ? '后台维护因子 · 前台只读' : `${factorSourceText[factor.source]} · ${factorSourceSubText[factor.source]}`}
            </span>
          </div>
          <div className="factor-section-body">
            <div className="detail-list">
              <div className="detail-item">
                <span className="detail-label">因子编码</span>
                <span className="detail-value mono">{factor.code}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">因子名称</span>
                <span className="detail-value">{factor.name}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">因子别名</span>
                <span className="detail-value">{factor.alias || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">因子分类</span>
                <span className="detail-value">
                  <Tag tone={factorCategoryTone[factor.category]}>{factorCategoryText[factor.category]}</Tag>
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">适用行业</span>
                <span className="detail-value">{industryText(factor)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">适用场景</span>
                <span className="detail-value">{factor.scenario}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">碳排放因子值</span>
                <span className="detail-value mono">{factor.value}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">单位 / 活动数据单位</span>
                <span className="detail-value mono">{factorUnitText(factor)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">使用状态</span>
                <span className="detail-value">
                  <Tag tone={useStatusTone[factor.status]}>{useStatusText[factor.status]}</Tag>
                </span>
              </div>
              <div className="detail-item factor-detail-item-full">
                <span className="detail-label">描述</span>
                <span className="detail-value">{factor.description || '-'}</span>
              </div>
            </div>
          </div>
          <div className="factor-section-body factor-section-tip">
            因子单位为**复合单位**：单位（{factor.numeratorUnit}，碳排放量类）/ 活动数据单位（
            {factor.denominatorUnit}）；活动数据单位须与活动数据可换算（经计量单位库基准中转），否则触发{' '}
            <span className="mono">E04</span>。因子缺失时触发 <span className="mono">E03</span>，**禁止按 0 排放**（方案 §5.4）。
          </div>
        </section>

        <section className="card">
          <div className="factor-section-header">
            <span className="factor-section-title">来源信息</span>
          </div>
          <div className="factor-section-body">
            <div className="detail-list">
              <div className="detail-item">
                <span className="detail-label">来源类别</span>
                <span className="detail-value">{factor.sourceCategory}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">发布年份</span>
                <span className="detail-value">{factor.publishYear}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">发布日期</span>
                <span className="detail-value">{factor.publishDate || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">发布国家 / 组织</span>
                <span className="detail-value">{factor.publisherRegion}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">发布机构（全称）</span>
                <span className="detail-value">{factor.publisherFullName}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">发布机构（简称）</span>
                <span className="detail-value">{factor.publisherShortName || '-'}</span>
              </div>
              <div className="detail-item factor-detail-item-full">
                <span className="detail-label">数据来源</span>
                <span className="detail-value">{factor.dataSourceFile || '-'}</span>
              </div>
            </div>
          </div>
          <div className="factor-section-body factor-section-tip">
            来源信息用于因子溯源与报告披露；「发布机构」展示为 {publisherText(factor)}。数据来源文件仅作内部查阅，
            **不参与计算与校验**。
          </div>
        </section>

        <section className="card">
          <div className="factor-section-header">
            <span className="factor-section-title">引用情况</span>
            <span className="toolbar-tip">共 {factor.references.length} 条 · 只读反查，仅作参考</span>
          </div>
          <div className="factor-section-body factor-section-flush">
            {factor.references.length > 0 ? (
              <div className="factor-table-wrap">
                <Table columns={referenceColumns} data={factor.references} rowKey={(row) => row.id} />
              </div>
            ) : (
              <div className="empty">暂无下游引用</div>
            )}
          </div>
        </section>

        <section className="card">
          <div className="factor-section-header">
            <span className="factor-section-title">制单信息</span>
          </div>
          <div className="factor-section-body">
            <div className="detail-list">
              <div className="detail-item">
                <span className="detail-label">创建人</span>
                <span className="detail-value">{factor.createdBy}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">创建时间</span>
                <span className="detail-value">{factor.createdAt}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">更新人</span>
                <span className="detail-value">{factor.updatedBy}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">更新时间</span>
                <span className="detail-value">{factor.updatedAt}</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <FactorConfirmModal
        open={!!confirm}
        factor={factor}
        mode={confirm ?? 'disable'}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
      />
    </>
  )
}
