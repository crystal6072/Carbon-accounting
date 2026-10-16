import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, PageHeader, Select, Tag, useToast } from '@/shared/components'
import type { SelectOption } from '@/shared/components'
import { fetchPublishedLibraries } from '@/mock'
import type { FactorLibrary, FactorLibraryType } from '@/types'
import { libraryTypeText, libraryTypeTone } from './factorMeta'
import './FactorPage.css'

/**
 * 前台 · 因子库预览（背景数据库）：只读浏览后台已发布的因子库。
 * 交互采用「库列表 → 库详情」，支持搜索与按来源筛选，以支撑库数量增长。
 */
export default function FrontendLibraryListPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [list, setList] = useState<FactorLibrary[]>([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [type, setType] = useState<'' | FactorLibraryType>('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setList(await fetchPublishedLibraries())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const rows = useMemo(() => {
    const text = keyword.trim().toLowerCase()
    return list.filter((item) => {
      if (type && item.type !== type) return false
      if (!text) return true
      return item.name.toLowerCase().includes(text) || item.code.toLowerCase().includes(text)
    })
  }, [list, keyword, type])

  const typeOptions: SelectOption[] = [
    { label: '商业数据库', value: 'external' },
    { label: '自建库', value: 'builtin' },
  ]

  return (
    <>
      <PageHeader
        breadcrumb={['产品碳足迹', '因子管理', '背景数据库']}
        title={<span data-ann-target="pcf-factor.page.global">背景数据库</span>}
      />

      <div className="card">
        <div className="query-bar" data-ann-target="pcf-factor.backend.query">
          <div className="query-item">
            <span className="query-label">库名称 / 编码</span>
            <Input value={keyword} placeholder="请输入" onChange={(e) => setKeyword(e.target.value)} />
          </div>
          <div className="query-item">
            <span className="query-label">库来源</span>
            <Select
              value={type}
              placeholder="全部"
              options={typeOptions}
              onChange={(e) => setType(e.target.value as '' | FactorLibraryType)}
            />
          </div>
          <div className="query-actions">
            <Button
              onClick={() => {
                setKeyword('')
                setType('')
              }}
            >
              重置
            </Button>
            <Button variant="primary" onClick={() => toast('查询完成')}>
              搜索
            </Button>
          </div>
        </div>
      </div>

      <div className="factor-lib-grid">
        {loading && <div className="empty">加载中…</div>}
        {!loading && rows.length === 0 && <div className="empty">暂无已发布的因子库</div>}
        {!loading &&
          rows.map((library) => (
            <div className="factor-lib-card" key={library.id}>
              <div className="factor-lib-head">
                <button
                  className="factor-lib-name link"
                  onClick={() => navigate(`/pcf/factor-libraries/${library.id}`)}
                >
                  {library.name}
                </button>
                <Tag tone={libraryTypeTone[library.type]}>{libraryTypeText[library.type]}</Tag>
              </div>
              <div className="factor-lib-code mono">{library.code}</div>
              <div className="factor-lib-desc">{library.description || '-'}</div>
              <div className="factor-lib-meta">
                <span>维护方：{library.maintainer}</span>
                <span>因子数：{library.factorCount}</span>
                <span>版本：{library.currentVersionNo || '-'}</span>
              </div>
              <div className="factor-lib-actions">
                <button className="link" data-ann-target="pcf-factor.backend-card.preview" onClick={() => navigate(`/pcf/factor-libraries/${library.id}`)}>
                  预览
                </button>
              </div>
            </div>
          ))}
      </div>
    </>
  )
}
