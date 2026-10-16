import { useState } from 'react'
import { Table, Tag } from '@/shared/components'
import type { Column } from '@/shared/components'
import type { FactorExchange, FactorItem, MyFactorOrigin } from '@/types'
import {
  CALIBER_ROWS,
  CALIBER_TOTAL_ROW,
  caliberValue,
  factorUnitText,
  hasSplitCalibers,
  myFactorOriginText,
  myFactorOriginTone,
} from './factorMeta'
import './FactorPage.css'

/** 指标明细行（分指标 / 总指标共用） */
interface CaliberDetailRow {
  id: string
  label: string
  value: number | null
  hint: string
}

type TabKey = 'info' | 'basic' | 'exchanges'

interface FactorInfoPanelProps {
  /** 因子（我的因子额外带 origin，用于展示来源标记） */
  factor: FactorItem & { origin?: MyFactorOrigin }
}

/** 碳类型文案 */
const CARBON_TYPE_TEXT: Record<string, string> = {
  fossil: '化石',
  biogenic: '生物碳',
  luluc: '土地利用',
}

/** 输入输出表：按方向切换「对端过程名称」列标题（输入 = 上游 / 输出 = 下游） */
const buildExchangeColumns = (counterpartTitle: string): Column<FactorExchange>[] => [
  { key: 'name', title: '名称', width: 220, render: (row) => <span className="cell-ellipsis">{row.name}</span> },
  { key: 'amount', title: '数量', render: (row) => <span className="mono nowrap">{row.amount}</span> },
  { key: 'unit', title: '单位', width: 80 },
  {
    key: 'carbonType',
    title: '碳类型',
    width: 90,
    render: (row) => (row.carbonType ? CARBON_TYPE_TEXT[row.carbonType] : '-'),
  },
  { key: 'counterpart', title: counterpartTitle, render: (row) => row.counterpart || '-' },
]

/**
 * 因子只读详情面板（可复用）：「因子信息 / 数据基本信息 / 输入输出信息」三个页签。
 * 用于因子详情页与核算步骤②「选择排放因子」的查看详情弹窗。
 */
export default function FactorInfoPanel({ factor }: FactorInfoPanelProps) {
  const [tab, setTab] = useState<TabKey>('info')

  const ext = factor.ext ?? {}
  const inputs = (factor.exchanges ?? []).filter((item) => item.direction === 'input')
  const outputs = (factor.exchanges ?? []).filter((item) => item.direction === 'output')

  /** 分指标因子：展示各分指标值 + 总指标值；总指标因子：仅展示总指标值 */
  const isSplit = hasSplitCalibers(factor)
  const caliberRows: CaliberDetailRow[] = (isSplit ? [...CALIBER_ROWS, CALIBER_TOTAL_ROW] : [CALIBER_TOTAL_ROW]).map(
    (row) => ({
      id: row.key,
      label: row.fullLabel,
      value: row.key === 'gwpTotal' ? caliberValue(factor, 'gwpTotal') ?? factor.value : caliberValue(factor, row.key),
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
    <div className="factor-stack">
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
              {factor.origin && (
                <Tag tone={myFactorOriginTone[factor.origin]}>{myFactorOriginText[factor.origin]}</Tag>
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
            <div className="factor-section-header"><span className="factor-section-title">基本信息</span></div>
            <div className="factor-section-body">
              <div className="detail-list">
                <div className="detail-item"><span className="detail-label">产品名称</span><span className="detail-value">{ext.productName || '-'}</span></div>
                <div className="detail-item"><span className="detail-label">CAS 号</span><span className="detail-value mono">{ext.casNo || '-'}</span></div>
                <div className="detail-item"><span className="detail-label">所有者</span><span className="detail-value">{ext.owner || '-'}</span></div>
                <div className="detail-item"><span className="detail-label">所有者版本</span><span className="detail-value mono">{ext.ownerVersion || '-'}</span></div>
                <div className="detail-item"><span className="detail-label">系统模型</span><span className="detail-value">{ext.systemModel || '-'}</span></div>
                <div className="detail-item"><span className="detail-label">特征化方法</span><span className="detail-value">{ext.lciaMethod || '-'}</span></div>
                <div className="detail-item"><span className="detail-label">GWP 版本</span><span className="detail-value">{ext.gwpVersion || '-'}</span></div>
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
    </div>
  )
}
