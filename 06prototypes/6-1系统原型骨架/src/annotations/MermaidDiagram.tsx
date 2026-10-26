import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type mermaidType from 'mermaid'

type Mermaid = typeof mermaidType

/** mermaid 体积较大，按需加载（首次打开含流程图的批注时才拉取） */
let mermaidPromise: Promise<Mermaid> | null = null

function loadMermaid(): Promise<Mermaid> {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((mod) => mod.default)
  }
  return mermaidPromise
}

let initialized = false

function ensureInitialized(mermaid: Mermaid) {
  if (initialized) return
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif',
    themeVariables: {
      fontSize: '12px',
      primaryColor: '#eff6ff',
      primaryTextColor: '#0f172a',
      primaryBorderColor: '#93c5fd',
      secondaryColor: '#f8fafc',
      tertiaryColor: '#ffffff',
      lineColor: '#94a3b8',
      textColor: '#334155',
      edgeLabelBackground: '#ffffff',
      clusterBkg: '#fbfdff',
      clusterBorder: '#cbd5e1',
    },
    flowchart: {
      // 保持原尺寸渲染：文本可读，容器内横向 / 纵向滚动查看，可点「放大」全屏
      useMaxWidth: false,
      htmlLabels: true,
      curve: 'basis',
      nodeSpacing: 26,
      rankSpacing: 34,
      padding: 8,
    },
  })
  initialized = true
}

/** 每次渲染使用独立 id，避免 StrictMode 二次执行时冲突 */
let renderSeq = 0

interface MermaidDiagramProps {
  chart: string
  caption?: string
}

/**
 * 流程图渲染块：把批注里的 Mermaid 源码渲染为流程图（不是文字描述）。
 * - 默认原尺寸内嵌，容器可滚动；点击「放大」全屏查看；
 * - 渲染失败时降级展示源码与错误原因，不阻塞其他批注阅读。
 */
export default function MermaidDiagram({ chart, caption }: MermaidDiagramProps) {
  const [svg, setSvg] = useState('')
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState('')
  const [zoomed, setZoomed] = useState(false)
  /** 默认适应宽度：一屏看到完整流程；可切到原始大小逐节点阅读 */
  const [fit, setFit] = useState(true)

  useEffect(() => {
    let alive = true
    setStatus('loading')
    setSvg('')
    setError('')
    const renderId = `ann-mermaid-${(renderSeq += 1)}`

    loadMermaid()
      .then(async (mermaid) => {
        ensureInitialized(mermaid)
        try {
          const { svg: rendered } = await mermaid.render(renderId, chart)
          if (!alive) return
          setSvg(rendered)
          setStatus('ready')
        } catch (e) {
          if (!alive) return
          setError(e instanceof Error ? e.message : String(e))
          setStatus('error')
        }
      })
      .catch((e) => {
        if (!alive) return
        setError(e instanceof Error ? e.message : String(e))
        setStatus('error')
      })

    return () => {
      alive = false
    }
  }, [chart])

  useEffect(() => {
    if (!zoomed) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setZoomed(false)
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [zoomed])

  return (
    <div className="ann-flow">
      <div className="ann-flow-head">
        <span className="ann-flow-caption">{caption ?? '流程图'}</span>
        {status === 'ready' && (
          <span className="ann-flow-actions">
            <button type="button" className="ann-flow-zoom" onClick={() => setFit((prev) => !prev)}>
              {fit ? '原始大小' : '适应宽度'}
            </button>
            <button type="button" className="ann-flow-zoom" onClick={() => setZoomed(true)}>
              放大
            </button>
          </span>
        )}
      </div>

      {status === 'loading' && <div className="ann-flow-loading">流程图渲染中…</div>}

      {status === 'error' && (
        <div className="ann-flow-error">
          <div>流程图渲染失败：{error}</div>
          <pre>{chart}</pre>
        </div>
      )}

      {status === 'ready' && (
        <div
          className={`ann-flow-scroll${fit ? ' is-fit' : ''}`}
          title="点击放大查看完整流程图"
          onClick={() => setZoomed(true)}
        >
          <div className="ann-flow-svg" dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
      )}

      {zoomed &&
        createPortal(
          <div className="ann-flow-modal" onClick={() => setZoomed(false)}>
            <div className="ann-flow-modal-inner" onClick={(event) => event.stopPropagation()}>
              <div className="ann-flow-modal-head">
                <span>{caption ?? '流程图'}</span>
                <button type="button" onClick={() => setZoomed(false)}>
                  关闭
                </button>
              </div>
              <div className="ann-flow-modal-body">
                <div className="ann-flow-svg" dangerouslySetInnerHTML={{ __html: svg }} />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
