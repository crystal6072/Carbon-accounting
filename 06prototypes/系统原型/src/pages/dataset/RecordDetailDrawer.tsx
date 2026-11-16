import DrawerShell from './DrawerShell'
import { Badge } from './DatasetBadges'
import {
  BOUNDARY_TEXT,
  SOURCE_TEXT,
  STATUS_TEXT,
  emissionUnitLabel,
  numText,
  periodText,
  unitText,
} from './datasetMeta'
import type { CarbonRecord } from '@/types/dataset'

/**
 * 记录详情抽屉（只读）：基本信息 / 数值 / 阶段构成 / 来源追溯 / 作废恢复操作。
 */
interface RecordDetailDrawerProps {
  record: CarbonRecord | null
  onClose: () => void
  onVoid?: (record: CarbonRecord) => void
  onRestore?: (record: CarbonRecord) => void
  /** 只读查看（公共数据库 / 行业数据集）：隐藏作废 / 恢复操作 */
  readOnly?: boolean
  /** 只读态底部说明文案 */
  readOnlyNote?: string
  /** 附加字段（如所属版本），插入在「入库时间」之前 */
  extraFields?: [string, string][]
}

export default function RecordDetailDrawer({
  record,
  onClose,
  onVoid,
  onRestore,
  readOnly = false,
  readOnlyNote = '公共数据库数据为入库快照，只读可追溯',
  extraFields,
}: RecordDetailDrawerProps) {
  if (!record) return null
  const fields: [string, string][] = [
    ['产品类别', record.categoryPath || record.categoryName],
    ['所属行业', `${record.industryName}（${record.industryCode}）`],
    ['区域', record.regionName || '未填'],
    ['工艺', record.processes.map((p) => p.name + (p.custom ? '（自定义）' : '')).join('、') || '—'],
    ['系统边界', BOUNDARY_TEXT[record.boundary]],
    ['统计期间', periodText(record)],
    ['声明单位', unitText(record)],
    ['核算标准', [record.standardNo, record.standardName].filter(Boolean).join(' ') || '—'],
    ['排放口径', '总量（不含生物源 CO₂）'],
    ['GWP 版本', record.gwpVersion],
    ...(record.orgLabel ? [['数据来源企业', `${record.orgLabel}（已脱敏）`] as [string, string]] : []),
    ...(extraFields ?? []),
    ['入库时间', `${record.createdAt} · ${record.createdBy}`],
  ]

  return (
    <DrawerShell
      open={!!record}
      width={560}
      title={
        <span className="ds-detail-title">
          {record.productName}
          <Badge badge={{ key: 'status', text: STATUS_TEXT[record.status], tone: record.status === 'active' ? 'success' : record.status === 'void' ? 'error' : 'default' }} />
          <Badge badge={{ key: 'source', text: SOURCE_TEXT[record.recordSource], tone: 'info' }} />
        </span>
      }
      subtitle={record.recordNo}
      onClose={onClose}
      footer={
        readOnly ? (
          <span className="ds-void-note">{readOnlyNote}</span>
        ) : record.status === 'active' ? (
          <button className="link link-danger" onClick={() => onVoid?.(record)}>
            作废此记录
          </button>
        ) : record.status === 'void' ? (
          <div className="ds-void-note">
            作废原因：{record.voidReason || '—'}
            <button className="link" onClick={() => onRestore?.(record)}>
              恢复为有效
            </button>
          </div>
        ) : (
          <span className="ds-void-note">已替代：该项目已产生更新的核算结果版本（D03），本记录仅作历史追溯</span>
        )
      }
    >
      <div className="ds-detail">
        <div className="ds-detail-total">
          <span className="ds-detail-total-label">总碳足迹</span>
          <span className="ds-detail-total-value">{numText(record.totalEmission)}</span>
          <span className="ds-detail-total-unit">{emissionUnitLabel(record.emissionUnit, record.unitCode)}</span>
        </div>

        <div className="ds-detail-section">
          <div className="ds-detail-section-title">基本信息</div>
          <div className="ds-detail-grid">
            {fields.map(([label, value]) => (
              <div className="ds-detail-field" key={label}>
                <span className="ds-detail-label">{label}</span>
                <span className="ds-detail-value">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="ds-detail-section">
          <div className="ds-detail-section-title">阶段构成</div>
          {record.stageValues.length === 0 ? (
            <div className="ds-detail-empty">该记录未提供阶段数据（仅参与总值统计，D07）</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>阶段</th>
                  <th style={{ textAlign: 'right' }}>排放值</th>
                  <th style={{ textAlign: 'right' }}>占比</th>
                </tr>
              </thead>
              <tbody>
                {record.stageValues.map((stage) => (
                  <tr key={stage.stageCode} className={stage.stageLevel === 2 ? 'ds-stage-child' : undefined}>
                    <td>
                      {stage.stageLevel === 2 && <span className="ds-stage-indent">└ </span>}
                      {stage.stageName}
                    </td>
                    <td style={{ textAlign: 'right' }}>{numText(stage.stageEmission)}</td>
                    <td style={{ textAlign: 'right' }}>{stage.stageShare}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="ds-detail-section">
          <div className="ds-detail-section-title">来源追溯</div>
          <div className="ds-detail-grid">
            <div className="ds-detail-field">
              <span className="ds-detail-label">来源类型</span>
              <span className="ds-detail-value">{SOURCE_TEXT[record.recordSource]}</span>
            </div>
            {record.sourceProjectNo && (
              <div className="ds-detail-field">
                <span className="ds-detail-label">来源项目</span>
                <span className="ds-detail-value mono">{record.sourceProjectNo}（第 {record.resultVersion ?? 1} 次核算）</span>
              </div>
            )}
            <div className="ds-detail-field">
              <span className="ds-detail-label">来源说明</span>
              <span className="ds-detail-value">{record.sourceNote || '—'}</span>
            </div>
            {record.dataQualityNote && (
              <div className="ds-detail-field">
                <span className="ds-detail-label">数据质量说明</span>
                <span className="ds-detail-value">{record.dataQualityNote}</span>
              </div>
            )}
            <div className="ds-detail-field">
              <span className="ds-detail-label">依据文件</span>
              <span className="ds-detail-value">
                {record.attachments.length > 0 ? record.attachments.map((a) => a.name).join('、') : '—'}
              </span>
            </div>
          </div>
          <p className="ds-detail-note">台账数值为入库时快照：核算项目后续重算或删除不影响本记录（D06）。</p>
        </div>
      </div>
    </DrawerShell>
  )
}
