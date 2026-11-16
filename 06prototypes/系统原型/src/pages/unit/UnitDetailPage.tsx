import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, PageHeader, Table, Tag, useToast } from '@/shared/components'
import type { Column } from '@/shared/components'
import { fetchUnitDetail, updateUnitStatus } from '@/mock'
import type { UnitDetail, UnitReferenceItem } from '@/types'
import UnitConfirmModal from './UnitConfirmModal'
import {
  baseFlagText,
  baseUnitText,
  canDisableUnit,
  conversionText,
  factorText,
  unitTypeBaseHint,
  unitTypeConvertible,
  unitTypeText,
  unitTypeTone,
  useStatusText,
  useStatusTone,
} from './unitMeta'
import './UnitPage.css'

export default function UnitDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [unit, setUnit] = useState<UnitDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setUnit(await fetchUnitDetail(id))
    } catch (error) {
      toast(error instanceof Error ? error.message : '单位加载失败', 'error')
      setUnit(null)
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  useEffect(() => {
    void load()
  }, [load])

  const handleToggle = async () => {
    if (!unit) return
    const target = unit.status === 'enabled' ? 'disabled' : 'enabled'
    try {
      await updateUnitStatus(unit.id, target)
      toast(target === 'enabled' ? '启用成功' : '禁用成功')
      setConfirmOpen(false)
      await load()
    } catch (error) {
      toast(error instanceof Error ? error.message : '操作失败', 'error')
    }
  }

  const referenceColumns: Column<UnitReferenceItem>[] = [
    { key: 'module', title: '引用模块', width: 140 },
    { key: 'target', title: '引用对象', render: (row) => row.target || '-' },
    { key: 'field', title: '引用字段', width: 180 },
  ]

  if (!unit) {
    return (
      <>
        <PageHeader breadcrumb={['系统管理', '基础库', '计量单位库']} title="单位详情" />
        <div className="card">
          <div className="empty">{loading ? '加载中…' : '单位不存在或已被删除'}</div>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader
        breadcrumb={['系统管理', '基础库', '计量单位库', unit.name]}
        title={unit.name}
        description={`单位符号 ${unit.symbol} · ${unitTypeText[unit.unitType]} · ${useStatusText[unit.status]}`}
        actions={
          <>
            <Button onClick={() => navigate('/basic/unit')}>返回列表</Button>
            {unit.status === 'enabled' ? (
              canDisableUnit(unit) && (
                <Button data-ann-target="unit.detail.disable" onClick={() => setConfirmOpen(true)}>
                  禁用
                </Button>
              )
            ) : (
              <Button data-ann-target="unit.detail.enable" onClick={() => setConfirmOpen(true)}>
                启用
              </Button>
            )}
            <Button variant="primary" data-ann-target="unit.detail.edit" onClick={() => navigate(`/basic/unit/${unit.id}/edit`)}>
              编辑
            </Button>
          </>
        }
      />

      <div className="unit-stack">
        <section className="card" data-ann-target="unit.detail.body">
          <div className="unit-section-header">
            <span className="unit-section-title">基本信息</span>
            <span className="toolbar-tip">
              {unitTypeText[unit.unitType]}
              {unitTypeConvertible[unit.unitType] ? ' · 可换算' : ' · 不可换算'}
            </span>
          </div>
          <div className="unit-section-body">
            <div className="detail-list">
              <div className="detail-item">
                <span className="detail-label">单位名称</span>
                <span className="detail-value">{unit.name}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">单位符号</span>
                <span className="detail-value mono">{unit.symbol}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">单位类型</span>
                <span className="detail-value">
                  <Tag tone={unitTypeTone[unit.unitType]}>{unitTypeText[unit.unitType]}</Tag>
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">基准标记</span>
                <span className="detail-value">
                  <Tag tone={unit.isBase ? 'success' : 'default'}>{baseFlagText(unit)}</Tag>
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">关联基准单位</span>
                <span className="detail-value">{baseUnitText(unit)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">换算系数</span>
                <span className="detail-value">{factorText(unit)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">换算关系</span>
                <span className="detail-value">{conversionText(unit)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">使用状态</span>
                <span className="detail-value">
                  <Tag tone={useStatusTone[unit.status]}>{useStatusText[unit.status]}</Tag>
                </span>
              </div>
              <div className="detail-item full">
                <span className="detail-label">备注</span>
                <span className="detail-value">{unit.remark || '-'}</span>
              </div>
            </div>
          </div>
          <div className="unit-section-body unit-section-tip">
            换算机制为「基准中转」：每个单位类型先指定 1 个基准单位（{unitTypeBaseHint[unit.unitType]}），其他单位只记录
            相对基准单位的系数；两单位互转时经基准单位走两步 <span className="mono">值_B = 值_A × 系数_A ÷ 系数_B</span>
            （U1～U2）。跨类型与「数量」类之间不可换算，触发 E04（U3～U5）。
          </div>
        </section>

        <section className="card" data-ann-target="unit.detail.references">
          <div className="unit-section-header">
            <span className="unit-section-title">引用情况</span>
            <span className="toolbar-tip">共 {unit.references.length} 条 · 只读反查，仅作参考</span>
          </div>
          <div className="unit-section-body unit-section-flush">
            {unit.references.length > 0 ? (
              <Table columns={referenceColumns} data={unit.references} rowKey={(row) => row.id} />
            ) : (
              <div className="empty">暂无下游引用</div>
            )}
          </div>
        </section>

        <section className="card" data-ann-target="unit.detail.meta">
          <div className="unit-section-header">
            <span className="unit-section-title">制单信息</span>
          </div>
          <div className="unit-section-body">
            <div className="detail-list">
              <div className="detail-item">
                <span className="detail-label">创建人</span>
                <span className="detail-value">{unit.createdBy}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">创建时间</span>
                <span className="detail-value">{unit.createdAt}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">更新人</span>
                <span className="detail-value">{unit.updatedBy}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">更新时间</span>
                <span className="detail-value">{unit.updatedAt}</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <UnitConfirmModal
        open={confirmOpen}
        unit={unit}
        mode={unit.status === 'enabled' ? 'disable' : 'enable'}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleToggle}
      />
    </>
  )
}
