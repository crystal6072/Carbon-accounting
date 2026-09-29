import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Annotation } from './types'
import { buildTargetMap, calcFormulaAnnotations, globalAnnotationList } from './calcFormulaAnnotations'

const STORAGE_KEY = 'pcf.calcEngine.annotation.visible'

interface AnnotationContextValue {
  /** 批注总开关（持久化 localStorage） */
  visible: boolean
  setVisible: (visible: boolean) => void
  toggleVisible: () => void
  /** 全部批注 */
  annotations: Annotation[]
  /** 锚点 → 批注列表 */
  targetMap: Map<string, Annotation[]>
  /** 全局标注（未匹配 / 文档级） */
  globalAnnotations: Annotation[]
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

  const targetMap = useMemo(() => buildTargetMap(), [])

  const value = useMemo<AnnotationContextValue>(
    () => ({
      visible,
      setVisible,
      toggleVisible,
      annotations: calcFormulaAnnotations,
      targetMap,
      globalAnnotations: globalAnnotationList,
    }),
    [visible, setVisible, toggleVisible, targetMap],
  )

  return <AnnotationContext.Provider value={value}>{children}</AnnotationContext.Provider>
}

export function useAnnotationContext(): AnnotationContextValue {
  const ctx = useContext(AnnotationContext)
  if (!ctx) throw new Error('useAnnotationContext 必须在 AnnotationProvider 内使用')
  return ctx
}

/** 批注作用域前缀：仅核算引擎（计算公式）路由下展示 */
export const ANNOTATION_SCOPE_PREFIX = '/model/calc-engine'

