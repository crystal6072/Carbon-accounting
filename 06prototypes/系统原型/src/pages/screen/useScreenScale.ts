import { useEffect, useState } from 'react'
import type { RefObject } from 'react'

/** 设计稿尺寸：所有大屏布局按 1920×1080 编排，运行时等比缩放适配现场屏幕 */
export const SCREEN_WIDTH = 1920
export const SCREEN_HEIGHT = 1080

/**
 * 计算等比缩放比例：取宽高比例的较小值，保证整屏完整可见、不出现滚动条。
 * - 不传容器：按浏览器视口缩放（独立全屏大屏）；
 * - 传容器：按容器实际尺寸缩放（嵌入业务布局的驾驶舱页），容器变化时自动重算。
 */
export function useScreenScale(containerRef?: RefObject<HTMLElement>): number {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const calc = () => {
      const el = containerRef?.current
      const width = el?.clientWidth || window.innerWidth
      const height = el?.clientHeight || window.innerHeight
      const next = Math.min(width / SCREEN_WIDTH, height / SCREEN_HEIGHT)
      setScale(Number.isFinite(next) && next > 0 ? next : 1)
    }
    calc()
    window.addEventListener('resize', calc)

    const el = containerRef?.current
    const observer = el ? new ResizeObserver(calc) : undefined
    if (el && observer) observer.observe(el)

    return () => {
      window.removeEventListener('resize', calc)
      observer?.disconnect()
    }
  }, [containerRef])

  return scale
}
