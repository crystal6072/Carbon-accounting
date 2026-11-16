import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input, PageHeader, Tag, useToast } from '@/shared/components'
import { fetchPortalCases, type CarbonCaseQuery } from '@/mock'
import type { CarbonCase, CarbonCaseType } from '@/types'
import { CASE_TYPE_LABEL, CASE_TYPE_TAG_TONE, ownerText, ownerTone } from '@/pages/caseLibrary/caseLibraryMeta'
import './KnowledgePage.css'

type TabValue = '' | CarbonCaseType

const TABS: Array<{ key: TabValue; label: string }> = [
  { key: '', label: '全部' },
  { key: 'reduction', label: '减排案例' },
  { key: 'accounting', label: '核算案例' },
  { key: 'optimization', label: '优化案例' },
]

/**
 * 知识中心 · 典型案例（业务端只读）。
 * 数据来自后台「系统管理 → 碳核算知识库 → 典型案例库」的维护结果（仅「已发布」）：
 * 内容由平台运营统一维护发布，全员可见；企业端只读，不维护企业侧案例；
 * 此处只提供查阅：按类型页签 / 关键字筛选、查看详情、附件预览与外部链接跳转。
 */
export default function KnowledgeCaseListPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [list, setList] = useState<CarbonCase[]>([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<TabValue>('')
  const [keyword, setKeyword] = useState('')

  const load = useCallback(async (query: CarbonCaseQuery) => {
    setLoading(true)
    try {
      setList(await fetchPortalCases(query))
    } catch (error) {
      toast(error instanceof Error ? error.message : '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load({ caseName: keyword })
  }, [keyword, load])

  /** 页签计数基于当前关键字过滤后的全量 */
  const counts = useMemo(() => {
    const base = list
    return {
      '': base.length,
      reduction: base.filter((i) => i.caseType === 'reduction').length,
      accounting: base.filter((i) => i.caseType === 'accounting').length,
      optimization: base.filter((i) => i.caseType === 'optimization').length,
    }
  }, [list])

  /** 页签选中时由查询参数承担类型过滤；「全部」页签下展示全部 */
  const rows = useMemo(
    () => (tab ? list.filter((i) => i.caseType === tab) : list),
    [list, tab],
  )

  return (
    <>
      <PageHeader
        breadcrumb={['产品碳足迹', '知识中心', '典型案例']}
        title="典型案例"
        description="行业减排 / 核算 / 优化典型案例（业务端只读查阅）：平台统一维护发布、全员可见，支持按类型筛选、查看详情与附件报告。"
      />

      <div className="card knowledge-card">
        <div className="knowledge-toolbar">
          <div className="knowledge-tabs">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`knowledge-tab${tab === t.key ? ' active' : ''}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
                <span className="kcase-tab-count">{counts[t.key]}</span>
              </button>
            ))}
          </div>
          <Input
            value={keyword}
            placeholder="搜索案例名称"
            className="knowledge-search"
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="empty">加载中…</div>
        ) : rows.length === 0 ? (
          <div className="empty">暂无相关案例</div>
        ) : (
          <div className="kcase-grid">
            {rows.map((item) => (
              <button key={item.id} className="kcase-card" onClick={() => navigate(`/knowledge/case/${item.id}`)}>
                <div className="kcase-card-cover">
                  {item.coverUrl ? (
                    <img src={item.coverUrl} alt={item.caseName} />
                  ) : (
                    <div className="kcase-card-cover-empty">典型案例</div>
                  )}
                  <span className="kcase-card-cat">{CASE_TYPE_LABEL[item.caseType]}</span>
                </div>
                <div className="kcase-card-body">
                  <div className="kcase-card-title">{item.caseName}</div>
                  <div className="kcase-card-summary">{item.summary || '暂无摘要'}</div>
                  <div className="kcase-card-foot">
                    <Tag tone={CASE_TYPE_TAG_TONE[item.caseType]}>{CASE_TYPE_LABEL[item.caseType]}</Tag>
                    <Tag tone={ownerTone(item)}>{ownerText(item)}</Tag>
                    <span className="kcase-card-date">{item.publishedAt?.slice(0, 10)}</span>
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
