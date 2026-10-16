import { useState, type ReactNode } from 'react'
import { FileIcon, FileDownloadIcon, ZoomInIcon, ZoomOutIcon, RefreshIcon } from 'tdesign-icons-react'
import type { PcfFootprintReport, ReportSection, ReportTable, ReportFigure } from '@/types/report'
import './ReportPage.css'

/** 将章节分配到 5 张 A4 页（模板定义 §3 / Demo §5.3） */
function buildSheets(sections: ReportSection[]): ReportSection[][] {
  const byCode = (code: string) => sections.filter((s) => s.sectionCode === code)
  return [
    [...byCode('S00'), ...byCode('SB')],
    [...byCode('ST'), ...byCode('S1'), ...byCode('S2')],
    [...byCode('S3')],
    [...byCode('S4'), ...byCode('S5')],
    [...byCode('S6'), ...byCode('S7'), ...byCode('SA')],
  ]
}

function renderTable(table: ReportTable) {
  return (
    <div key={table.id}>
      <h4>{table.title}</h4>
      <table>
        <thead>
          <tr>
            {table.columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((r, i) => (
            <tr key={i}>
              {table.columns.map((c) => (
                <td key={c}>{r[c] ?? ''}</td>
              ))}
            </tr>
          ))}
          {table.totalRow && (
            <tr>
              {table.columns.map((c) => (
                <td key={c} style={{ fontWeight: 600 }}>
                  {table.totalRow![c] ?? ''}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function renderFigure(fig: ReportFigure) {
  if (fig.placeholder) {
    return (
      <div key={fig.id} className="rp-img-placeholder">
        [ {fig.caption} · 占位 ]
      </div>
    )
  }
  return <img key={fig.id} className="rp-img" src={fig.content} alt={fig.caption} />
}

function renderSection(section: ReportSection) {
  if (section.sectionCode === 'S00') return null
  return (
    <section key={section.id}>
      <h3>{section.sectionTitle}</h3>
      {section.content && (
        <p className={section.blankFlag ? 'rp-blank' : ''} style={{ whiteSpace: 'pre-wrap' }}>
          {section.content}
        </p>
      )}
      {section.figures.map(renderFigure)}
      {section.tables.map(renderTable)}
    </section>
  )
}

function CoverPage({ cover }: { cover: PcfFootprintReport['cover'] }) {
  const parseDate = (d: string) => {
    if (!d) return { year: '', month: '', day: '' }
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (m) return { year: m[1], month: m[2], day: m[3] }
    return { year: d, month: '', day: '' }
  }
  const date = parseDate(cover.reportDate)
  const blank = (v: string) => v || '　　　　　　　　'
  return (
    <div className="rp-standard-cover">
      <div className="rp-standard-header">
        <span>GB/T 24067—2024</span>
      </div>
      <div className="rp-standard-appendix">
        <div>附　录　G</div>
        <div>（资料性）</div>
        <div className="rp-standard-appendix-title">产品碳足迹报告（模板）</div>
      </div>
      <div className="rp-standard-title">产品碳足迹报告（模板）</div>
      <div className="rp-standard-fields">
        <div className="rp-standard-field">
          <span className="rp-standard-label">产 品 名 称</span>
          <span className="rp-standard-line">{blank(cover.productName)}</span>
        </div>
        <div className="rp-standard-field">
          <span className="rp-standard-label">产品规格型号</span>
          <span className="rp-standard-line">{blank(cover.productSpecModel)}</span>
        </div>
        <div className="rp-standard-field">
          <span className="rp-standard-label">生 产 者 名 称</span>
          <span className="rp-standard-line">{blank(cover.companyName)}</span>
        </div>
        <div className="rp-standard-field">
          <span className="rp-standard-label">报 告 编 号</span>
          <span className="rp-standard-line">{blank(cover.reportNo)}</span>
        </div>
      </div>
      <div className="rp-standard-footer">
        <div className="rp-standard-field">
          <span className="rp-standard-label">出具报告机构：（若有）</span>
          <span className="rp-standard-line">{blank(cover.issuer)}</span>
          <span className="rp-standard-stamp">（盖章）</span>
        </div>
        <div className="rp-standard-date">
          <span>日期：</span>
          <span className="rp-standard-date-line">{blank(date.year)}</span>
          <span>年</span>
          <span className="rp-standard-date-line">{blank(date.month)}</span>
          <span>月</span>
          <span className="rp-standard-date-line">{blank(date.day)}</span>
          <span>日</span>
        </div>
      </div>
    </div>
  )
}

export default function ReportPreview({ report }: { report: PcfFootprintReport }) {
  const [scale, setScale] = useState(1)
  const cover = report.cover
  const sheets = buildSheets(report.sections)
  const total = sheets.length

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="rp-preview-toolbar">
        <FileIcon size="20px" />
        <span className="rp-file">{report.fileName}</span>
        <TagLike>报告预览</TagLike>
        <div className="rp-tools">
          <span>第 1 / {total} 页</span>
          <ZoomOutIcon
            style={{ cursor: 'pointer' }}
            onClick={() => setScale((s) => Math.max(0.6, +(s - 0.1).toFixed(2)))}
          />
          <span>{Math.round(scale * 100)}%</span>
          <ZoomInIcon
            style={{ cursor: 'pointer' }}
            onClick={() => setScale((s) => Math.min(1.6, +(s + 0.1).toFixed(2)))}
          />
          <span style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <RefreshIcon size="14px" /> 适应宽度
          </span>
          <FileDownloadIcon style={{ cursor: 'pointer' }} />
        </div>
      </div>

      <div className="rp-preview-scroll">
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top center', transition: 'transform .15s' }}>
          {sheets.map((sheet, idx) => (
            <div className="rp-a4" key={idx}>
              {idx === 0 && <CoverPage cover={cover} />}
              {sheet.map(renderSection)}
              <div className="rp-foot">
                第 {idx + 1} 页 / 共 {total} 页
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TagLike({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        background: 'var(--td-brand-color-light, #ecf2fe)',
        color: 'var(--td-brand-color, #0052d9)',
        borderRadius: 4,
        padding: '2px 8px',
        fontSize: 12,
      }}
    >
      {children}
    </span>
  )
}
