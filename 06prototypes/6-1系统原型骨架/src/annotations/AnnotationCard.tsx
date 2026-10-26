import type { Annotation, AnnotationBlock } from './types'
import MermaidDiagram from './MermaidDiagram'
import './annotations.css'

/** 优先级文案（批注角标、抽屉、卡片共用） */
export const PRIORITY_TEXT: Record<NonNullable<Annotation['priority']>, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

/** 匹配方式文案 */
export const MATCH_TYPE_TEXT: Record<Annotation['matchType'], string> = {
  exact: '精确匹配',
  fuzzy: '模糊匹配',
  region: '区域匹配',
  none: '未匹配',
}

/**
 * 行内文本渲染：支持 `反引号` 行内代码与 **加粗** 关键词。
 * 返回值可直接作为 React 子节点；保留原有遗留文本的兼容渲染。
 */
export function renderInline(text: string): React.ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    .filter((part) => part !== '')
    .map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return <strong key={index}>{part.slice(2, -2)}</strong>
      }
      if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
        return <code key={index}>{part.slice(1, -1)}</code>
      }
      return <span key={index}>{part}</span>
    })
}

/** 遗留纯文本渲染（无 blocks 时兜底；兼容 `反引号` 行内代码） */
function renderContent(content: string) {
  return content.split(/(`[^`]+`)/g).map((part, index) =>
    part.startsWith('`') && part.endsWith('`') && part.length > 2 ? (
      <code key={index}>{part.slice(1, -1)}</code>
    ) : (
      <span key={index}>{part}</span>
    ),
  )
}

/** 结构化内容块渲染：标题 / 正文 / 列表 / 步骤 / 表格 / 辅助提示 */
export function renderBlocks(blocks: AnnotationBlock[]) {
  return (
    <div className="ann-blocks">
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'heading':
            return (
              <div className="ann-block-heading" key={index}>
                {renderInline(block.text)}
              </div>
            )
          case 'paragraph':
            return (
              <p className="ann-block-para" key={index}>
                {renderInline(block.text)}
              </p>
            )
          case 'list':
            return block.ordered ? (
              <ol className="ann-block-list ann-block-list-ordered" key={index}>
                {block.items.map((item, i) => (
                  <li key={i}>{renderInline(item)}</li>
                ))}
              </ol>
            ) : (
              <ul className="ann-block-list" key={index}>
                {block.items.map((item, i) => (
                  <li key={i}>{renderInline(item)}</li>
                ))}
              </ul>
            )
          case 'steps':
            return (
              <ol className="ann-block-steps" key={index}>
                {block.items.map((item, i) => (
                  <li key={i}>{renderInline(item)}</li>
                ))}
              </ol>
            )
          case 'table':
            return (
              <table className="ann-block-table" key={index}>
                <thead>
                  <tr>
                    {block.columns.map((col, i) => (
                      <th key={i}>{renderInline(col)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, r) => (
                    <tr key={r}>
                      {row.map((cell, c) => (
                        <td key={c}>{renderInline(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          case 'flow':
            return <MermaidDiagram key={index} chart={block.chart} caption={block.caption} />
          case 'callout':
            return (
              <div className="ann-block-callout" key={index}>
                {renderInline(block.text)}
              </div>
            )
          default:
            return null
        }
      })}
    </div>
  )
}

/** 单条批注卡片（Popover 与抽屉共用） */
export function AnnotationCard({ item, compact = false }: { item: Annotation; compact?: boolean }) {
  return (
    <div className="ann-card">
      {!compact && (
        <div className="ann-card-head">
          <span className="ann-card-title">{item.title}</span>
          <span className="ann-card-head-right">
            {item.code && <span className="ann-card-code">{item.code}</span>}
            {item.priority && (
              <span className={`ann-priority ann-priority-${item.priority}`}>{PRIORITY_TEXT[item.priority]}</span>
            )}
          </span>
        </div>
      )}
      <div className="ann-card-content">
        {item.blocks ? renderBlocks(item.blocks) : renderContent(item.content ?? '')}
      </div>
      <dl className="ann-card-meta">
        {item.source && (
          <div>
            <dt>来源</dt>
            <dd>{item.source}</dd>
          </div>
        )}
        {item.formula && (
          <div>
            <dt>涉及公式</dt>
            <dd>{item.formula}</dd>
          </div>
        )}
        {item.operation && (
          <div>
            <dt>涉及操作</dt>
            <dd>{item.operation}</dd>
          </div>
        )}
        {item.buttonText && (
          <div>
            <dt>期望按钮</dt>
            <dd>{item.buttonText}</dd>
          </div>
        )}
        <div>
          <dt>匹配状态</dt>
          <dd>
            {item.matchStatus === 'matched'
              ? `已匹配 · ${MATCH_TYPE_TEXT[item.matchType]}`
              : '未匹配 · 全局标注'}
          </dd>
        </div>
        {item.matchTargets && item.matchTargets.length > 0 && (
          <div>
            <dt>匹配位置</dt>
            <dd>
              <ul className="ann-match-list">
                {item.matchTargets.map((target) => (
                  <li key={`${target.selector}-${target.label}`}>
                    <strong>{target.label}</strong>
                    <span className="ann-match-reason">{target.reason}</span>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        )}
        {item.unmatchedReason && (
          <div>
            <dt>未匹配原因</dt>
            <dd>{item.unmatchedReason}</dd>
          </div>
        )}
      </dl>
    </div>
  )
}
