import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input, PageHeader, Tag, useToast } from '@/shared/components'
import { fetchPortalBambooCarbonTopics, type BambooCarbonQuery } from '@/mock'
import type { BambooCarbonCategory, BambooCarbonTopic } from '@/types'
import { BAMBOO_CATEGORY_LABEL, BAMBOO_CATEGORY_OPTIONS, bambooCardBadge, ownerText, ownerTone } from '@/pages/bambooCarbon/bambooCarbonMeta'
import './KnowledgePage.css'

type TabValue = BambooCarbonCategory | ''

const TABS: { label: string; value: TabValue }[] = [
  { label: '全部', value: '' },
  ...BAMBOO_CATEGORY_OPTIONS.map((opt) => ({ label: opt.label, value: opt.value as TabValue })),
]

export default function KnowledgeTopicListPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [list, setList] = useState<BambooCarbonTopic[]>([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<TabValue>('')
  const [keyword, setKeyword] = useState('')

  const load = useCallback(async (query: BambooCarbonQuery) => {
    setLoading(true)
    try {
      setList(await fetchPortalBambooCarbonTopics(query))
    } catch (error) {
      toast(error instanceof Error ? error.message : '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load({ category: tab, title: keyword })
  }, [tab, keyword, load])

  const rows = useMemo(() => list, [list])

  return (
    <>
      <PageHeader
        breadcrumb={['产品碳足迹', '知识中心', '木竹碳专题知识']}
        title="木竹碳专题知识"
        description="木竹碳固存 / 碳循环 / 生物质碳排放 / 核算指南与工具 / 行业动态与政策（平台统一发布，全员只读查阅）。"
      />

      <div className="card knowledge-card">
        <div className="knowledge-toolbar">
          <div className="knowledge-tabs">
            {TABS.map((t) => (
              <button
                key={t.value}
                className={`knowledge-tab${tab === t.value ? ' active' : ''}`}
                onClick={() => setTab(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <Input
            value={keyword}
            placeholder="搜索文章标题"
            className="knowledge-search"
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="empty">加载中…</div>
        ) : rows.length === 0 ? (
          <div className="empty">暂无专题文章</div>
        ) : (
          <div className="knowledge-grid">
            {rows.map((item) => (
              <button key={item.id} className="knowledge-item" onClick={() => navigate(`/knowledge/bamboo-carbon/${item.id}`)}>
                <div className="knowledge-item-cover">
                  {item.coverUrl ? <img src={item.coverUrl} alt={item.title} /> : <div className="knowledge-item-cover-empty">木竹碳</div>}
                  {(() => {
                    const badge = bambooCardBadge(item)
                    return badge ? <span className={`knowledge-item-badge ${badge.cls}`}>{badge.text}</span> : null
                  })()}
                  <span className="knowledge-item-cat">{BAMBOO_CATEGORY_LABEL[item.category]}</span>
                </div>
                <div className="knowledge-item-body">
                  <div className="knowledge-item-title">{item.title}</div>
                  <div className="knowledge-item-summary">{item.summary || '暂无摘要'}</div>
                  <div className="knowledge-item-foot">
                    <Tag tone={ownerTone(item)}>{ownerText(item)}</Tag>
                    <span className="knowledge-item-date">{item.publishedAt}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
