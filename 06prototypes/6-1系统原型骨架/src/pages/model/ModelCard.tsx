import type { ReactNode } from 'react'
import { boundaryLabelOf } from '@/mock'
import type { TagTone } from '@/shared/components'
import type { PcfBoundary } from '@/types'
import './ModelPage.css'

export interface ModelCardProps {
  code: string
  name: string
  standardName: string
  boundary: PcfBoundary
  /** 纳入的生命周期阶段数 */
  stageCount: number
  /** 数据项数 */
  itemCount: number
  updatedAt: string
  /** 封面左上角角标文案（如「已加入」「平台」） */
  cornerTag?: string
  /** 封面左上角角标配色 */
  cornerTone?: TagTone
  /** 封面右上角标准代号角标（如 `ISO` / `GB/T`） */
  cornerStandard?: string
  /** 标签行（如 `全行业` / `国际` / `摇篮到大门`），对齐竞品卡片的三段标签 */
  chips?: string[]
  /** 标准全称说明（卡片副文案，最多 2 行） */
  description?: string
  /** 名称右侧状态 / 来源标签（选模型弹窗内使用） */
  tags?: ReactNode
  /** 底部操作区（文字链接组） */
  actions?: ReactNode
  /** 点击封面 / 名称 → 预览详情 */
  onPreview?: () => void
}

/** 模型封面示意图（内联轻量 SVG：浅绿底 + 阶段/数据项示意，确定性离线渲染，替代图片预览） */
function ModelCover() {
  return (
    <svg className="model-card-art" viewBox="0 0 320 148" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="model-cover-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F2FBF5" />
          <stop offset="100%" stopColor="#DFF2E6" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="320" height="148" fill="url(#model-cover-bg)" />
      {/* 左侧：生命周期阶段树 */}
      <rect x="14" y="14" width="104" height="120" rx="6" fill="#FFFFFF" stroke="#D6E8DC" />
      <rect x="22" y="24" width="88" height="9" rx="3" fill="#C9E7D3" />
      {[0, 1, 2, 3, 4, 5, 6].map((row) => (
        <g key={row}>
          <circle cx="28" cy={45 + row * 13} r="3" fill={row % 3 === 0 ? '#7CCB9A' : '#D6E8DC'} />
          <rect x="36" y={41 + row * 13} width={row % 2 === 0 ? 60 : 46} height="7" rx="3" fill="#EDF4F0" />
        </g>
      ))}
      {/* 右侧：数据项表 + 折线示意 */}
      <rect x="128" y="14" width="178" height="120" rx="6" fill="#FFFFFF" stroke="#D6E8DC" />
      <rect x="136" y="24" width="162" height="9" rx="3" fill="#C9E7D3" />
      {[0, 1, 2, 3, 4, 5].map((row) => (
        <rect
          key={row}
          x="136"
          y={41 + row * 15}
          width={row % 3 === 0 ? 162 : row % 3 === 1 ? 140 : 120}
          height="8"
          rx="3"
          fill="#EDF4F0"
        />
      ))}
      <polyline
        points="140,120 176,104 210,116 244,86 280,74"
        fill="none"
        stroke="#52C41A"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="280" cy="74" r="4" fill="#52C41A" />
    </svg>
  )
}

/**
 * 模型卡片（模型库 / 选模型弹窗共用，信息结构对齐竞品）：
 * 封面（左上角状态角标 + 右上角标准代号角标）→ 名称 → 标签行（行业 · 标准层级 · 边界）
 * → 标准全称说明 → 指标行（阶段数 · 数据项数）→ 更新时间 + 操作区。
 */
export default function ModelCard({
  code,
  name,
  standardName,
  boundary,
  stageCount,
  itemCount,
  updatedAt,
  cornerTag,
  cornerTone = 'default',
  cornerStandard,
  chips,
  description,
  tags,
  actions,
  onPreview,
}: ModelCardProps) {
  return (
    <article className="model-card" data-ann-target="lib.card">
      <button type="button" className="model-card-thumb" onClick={onPreview} aria-label={`预览 ${name}`}>
        <span className="model-card-cover">
          <ModelCover />
          {cornerTag && (
            <span className="model-card-corner model-card-corner-left" data-tone={cornerTone}>
              {cornerTag}
            </span>
          )}
          {cornerStandard && (
            <span className="model-card-corner model-card-corner-right">{cornerStandard}</span>
          )}
        </span>
      </button>

      <div className="model-card-body">
        <div className="model-card-head">
          <button type="button" className="model-card-name" title={name} onClick={onPreview}>
            {name}
          </button>
          {tags && <span className="model-card-tags">{tags}</span>}
        </div>

        {chips && chips.length > 0 && (
          <div className="model-card-chips">
            {chips.map((chip) => (
              <span className="model-card-chip" key={chip}>
                {chip}
              </span>
            ))}
          </div>
        )}

        {description && (
          <p className="model-card-desc" title={description}>
            {description}
          </p>
        )}

        <div className="model-card-meta">
          {/* 有标准全称说明（卡片副文案）时不再重复标准号徽标，仅保留模型编码 */}
          {!description && <span className="model-card-badge">{standardName || '未指定标准'}</span>}
          <span className="model-card-code mono">{code}</span>
        </div>

        <div className="model-card-stats">
          <span>{boundaryLabelOf(boundary)}</span>
          <span className="model-card-dot">·</span>
          <span>{stageCount} 阶段</span>
          <span className="model-card-dot">·</span>
          <span>{itemCount} 数据项</span>
        </div>

        <div className="model-card-foot">
          <span className="model-card-time">{updatedAt}</span>
          {actions && <span className="model-card-actions">{actions}</span>}
        </div>
      </div>
    </article>
  )
}
