import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Icon } from '@/shared/components'
import type { ScreenData, ScreenScope } from '@/types/screen'
import { fetchScreenData } from '@/mock/screen'
import { AnnotationProvider } from '@/annotations/AnnotationContext'
import AnnotationLayer from '@/annotations/AnnotationLayer'
import ScrollTicker from './components/ScrollTicker'
import ConclusionCard from './components/ConclusionCard'
import PlatformOverview from './pages/PlatformOverview'
import EnterpriseOverview from './pages/EnterpriseOverview'
import { SCREEN_HEIGHT, SCREEN_WIDTH, useScreenScale } from './useScreenScale'
import './ScreenPage.css'

interface ScreenPageProps {
  /** 驾驶舱视角：由路由（企业驾驶舱 / 平台驾驶舱）决定，页内可切换 */
  scope: ScreenScope
  /** 嵌入业务布局（菜单入口）：按内容区尺寸缩放，而非铺满整个视口 */
  embedded?: boolean
}

/**
 * 数据大屏。
 *
 * 形态：一套外壳 + 两个视角（企业驾驶舱 1 屏 / 平台驾驶舱 1 屏），页内保留视角切换。
 * 入口：
 * - `/screen/*`（顶栏「数据驾驶舱」新页签直达，无侧栏 / 顶栏，按视口铺满）；
 * - `/cockpit/*`（旧的内嵌链接兼容，按内容区缩放）。
 * 交互：页内切换平台 / 企业视角、C 呼出结论卡、Esc 退出全屏；
 * 适配：按 1920×1080 设计稿等比缩放，任何屏幕都完整可见、无滚动条。
 */
export default function ScreenPage({ scope, embedded = false }: ScreenPageProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const [data, setData] = useState<ScreenData | null>(null)
  const [loading, setLoading] = useState(true)
  const [yearRange, setYearRange] = useState<[number, number]>([
    searchParams.has('from') ? Number(searchParams.get('from')) : 2022,
    searchParams.has('to') ? Number(searchParams.get('to')) : 2026,
  ])
  const [contextKey, setContextKey] = useState('')
  const [conclusionOpen, setConclusionOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const rootRef = useRef<HTMLDivElement>(null)
  const scale = useScreenScale(embedded ? rootRef : undefined)

  /* ---------- 数据加载：切换视角时重新聚合 ---------- */
  useEffect(() => {
    let alive = true
    setLoading(true)
    fetchScreenData({ scope, yearFrom: yearRange[0], yearTo: yearRange[1], contextKey })
      .then((next) => {
        if (!alive) return
        setData(next)
        /* 数据实际年份可能窄于初始 / URL 区间：回写选择器，避免下拉显示不存在的年份 */
        setYearRange((prev) =>
          prev[0] === next.yearRange[0] && prev[1] === next.yearRange[1] ? prev : next.yearRange,
        )
      })
      .catch(() => {
        if (alive) setData(null)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [scope, yearRange, contextKey])

  /* ---------- 键盘控制 ---------- */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (conclusionOpen) setConclusionOpen(false)
        else if (document.fullscreenElement) void document.exitFullscreen()
      } else if (event.key === 'c' || event.key === 'C') {
        setConclusionOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [conclusionOpen])

  /* ---------- 全屏状态同步 ---------- */
  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
      return
    }
    await rootRef.current?.requestFullscreen()
  }, [])

  const changeYearRange = useCallback(
    (range: [number, number]) => {
      setYearRange(range)
      setSearchParams({ from: String(range[0]), to: String(range[1]) }, { replace: true })
    },
    [setSearchParams],
  )

  /** 视角切换 = 切换驾驶舱入口（布局内走 /cockpit，独立全屏走 /screen） */
  const changeScope = useCallback(
    (next: ScreenScope) => {
      const base = embedded ? '/cockpit' : '/screen'
      navigate(next === 'org' ? `${base}/enterprise` : `${base}/platform`)
    },
    [navigate, embedded],
  )

  /* 切换驾驶舱后清空主图口径 */
  useEffect(() => {
    setContextKey('')
  }, [scope])

  return (
    <AnnotationProvider>
      <div className={`scr-root${embedded ? ' is-embedded' : ''}`} ref={rootRef}>
      <div
        className="scr-stage"
        style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, transform: `scale(${scale})` }}
      >
        <div className="scr-grid" aria-hidden />
        <div className="scr-glow is-left" aria-hidden />
        <div className="scr-glow is-right" aria-hidden />
        {scope === 'platform' && <div className="scr-scanline" aria-hidden />}

        <header className="scr-header">
          <div className="scr-brand" data-ann-target="screen.header.title">
            <span className="scr-logo">
              <Icon name="leaf" size={22} />
            </span>
            <div className="scr-brand-text">
              <h1>{scope === 'platform' ? '竹木产品碳足迹运行驾驶舱' : '企业碳足迹驾驶舱'}</h1>
              <p>
                {scope === 'platform'
                  ? 'BAMBOO CARBON COMMAND CENTER · 平台视角'
                  : 'ENTERPRISE CARBON COCKPIT · 企业视角'}
              </p>
            </div>
          </div>

          <div className="scr-header-right">
            <div className="scr-scope" data-ann-target="screen.header.scope">
              <button
                type="button"
                className={scope === 'platform' ? 'is-active' : ''}
                onClick={() => changeScope('platform')}
              >
                平台驾驶舱
              </button>
              <button
                type="button"
                className={scope === 'org' ? 'is-active' : ''}
                onClick={() => changeScope('org')}
              >
                企业驾驶舱
              </button>
            </div>
            <span className="scr-updated" data-ann-target="screen.header.updated">
              数据截止 {data?.updatedAt ?? '—'}
            </span>
            <button
              type="button"
              className="scr-text-btn"
              data-ann-target="screen.header.fullscreen"
              onClick={() => void toggleFullscreen()}
            >
              {isFullscreen ? '退出全屏' : '全屏'}
            </button>
          </div>
        </header>

        <main className="scr-main">
          {data && !loading ? (
            <div className="scr-page" key={scope}>
              {scope === 'platform' ? (
                <PlatformOverview data={data} />
              ) : (
                <EnterpriseOverview
                  data={data}
                  yearRange={yearRange}
                  onYearRangeChange={changeYearRange}
                  onContextChange={setContextKey}
                />
              )}
            </div>
          ) : (
            <div className="scr-loading" data-ann-target="screen.loading">
              <span className="scr-loading-ring" />
              <span>{scope === 'org' ? '正在汇总企业数据…' : '正在汇总平台数据…'}</span>
            </div>
          )}
        </main>

        <ScrollTicker items={data?.ticker ?? []} />

        <footer className="scr-footer" data-ann-target="screen.footer">
          <span>口径：GB/T 24067-2024 · IPCC AR6 GWP100 · 同品类同边界同单位样本</span>
          <span className="scr-footer-demo">演示数据 · 外部验收</span>
          <span>C 汇报结论 · Esc 退出全屏</span>
        </footer>

        <ConclusionCard
          open={conclusionOpen}
          title={data?.scope === 'org' ? `${data.orgName} · 汇报结论` : '平台运行 · 汇报结论'}
          conclusions={data?.conclusions ?? []}
          onClose={() => setConclusionOpen(false)}
        />
      </div>
      <AnnotationLayer />
    </div>
    </AnnotationProvider>
  )
}
