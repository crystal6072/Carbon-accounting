import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import type { Annotation } from './types'
import { isRdVisible } from './types'
import { buildTargetMap, resolveAnnotationScope, type AnnotationScope } from './registry'
import { SYSTEM_ANNOTATION_CHAPTERS, type SystemAnnotationChapter } from './systemAnnotations'

const STORAGE_KEY = 'pcf.annotation.visible'

/** 无批注作用域时的空映射（保持引用稳定，避免无谓重渲染） */
const EMPTY_TARGET_MAP: Map<string, Annotation[]> = new Map()

interface AnnotationContextValue {
  /** 批注总开关（持久化 localStorage） */
  visible: boolean
  setVisible: (visible: boolean) => void
  toggleVisible: () => void
  /** 当前路由命中的批注作用域；未登记的路由为 null（不展示批注） */
  scope: AnnotationScope | null
  /** 当前作用域的全部批注 */
  annotations: Annotation[]
  /** 锚点 → 批注列表 */
  targetMap: Map<string, Annotation[]>
  /** 全局批注（未匹配 / 文档级，仅当前模块） */
  globalAnnotations: Annotation[]
  /** 系统级批注（跨模块，与模块全局批注相互独立） */
  systemAnnotations: Annotation[]
  /** 系统级批注章节（供独立抽屉按章展示） */
  systemChapters: SystemAnnotationChapter[]
}

const AnnotationContext = createContext<AnnotationContextValue | null>(null)

function readStoredVisible(): boolean {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === null) return true
    return raw === '1'
  } catch {
    return true
  }
}

export function AnnotationProvider({ children }: { children: ReactNode }) {
  const [visible, setVisibleState] = useState<boolean>(readStoredVisible)
  const location = useLocation()

  /** 按路由前缀解析当前批注作用域（产品分类 / 后续模块） */
  const scope = useMemo(() => resolveAnnotationScope(location.pathname), [location.pathname])

  const setVisible = useCallback((next: boolean) => {
    setVisibleState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
    } catch {
      /* 隐私模式下忽略持久化失败 */
    }
  }, [])

  const toggleVisible = useCallback(() => {
    setVisibleState((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  /** 研发视图过滤：隐藏「能力 / 待确认事项 / 演示数据」类别，研发不关心 */
  const rdVisibleAnnotations = useMemo(
    () => (scope ? scope.annotations.filter(isRdVisible) : []),
    [scope],
  )

  const targetMap = useMemo(
    () => (scope ? buildTargetMap(rdVisibleAnnotations) : EMPTY_TARGET_MAP),
    [rdVisibleAnnotations],
  )

  /**
   * 系统级批注：与路由无关，全系统一套；
   * 同样按研发视图过滤，但**不并入** scope.globalAnnotations（两层互不混用）。
   */
  const systemChapters = useMemo<SystemAnnotationChapter[]>(
    () =>
      SYSTEM_ANNOTATION_CHAPTERS.map((chapter) => ({
        ...chapter,
        annotations: chapter.annotations.filter(isRdVisible),
      })).filter((chapter) => chapter.annotations.length > 0),
    [],
  )

  const systemAnnotations = useMemo(
    () => systemChapters.flatMap((chapter) => chapter.annotations),
    [systemChapters],
  )

  const value = useMemo<AnnotationContextValue>(
    () => ({
      visible,
      setVisible,
      toggleVisible,
      scope,
      annotations: rdVisibleAnnotations,
      targetMap,
      globalAnnotations: scope ? scope.globalAnnotations.filter(isRdVisible) : [],
      systemAnnotations,
      systemChapters,
    }),
    [
      visible,
      setVisible,
      toggleVisible,
      scope,
      rdVisibleAnnotations,
      targetMap,
      systemAnnotations,
      systemChapters,
    ],
  )

  return <AnnotationContext.Provider value={value}>{children}</AnnotationContext.Provider>
}

export function useAnnotationContext(): AnnotationContextValue {
  const ctx = useContext(AnnotationContext)
  if (!ctx) throw new Error('useAnnotationContext 必须在 AnnotationProvider 内使用')
  return ctx
}
