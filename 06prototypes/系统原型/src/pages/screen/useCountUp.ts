import { useEffect, useRef, useState } from 'react'

/** 数字滚动：进入大屏时从 0 滚到目标值，切页 / 切视角时重新滚动 */
export function useCountUp(target: number, duration = 1200): number {
  const [value, setValue] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    // 系统开启「减少动效」时直接给最终值，避免无意义的滚动
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setValue(target)
      fromRef.current = target
      return
    }

    const from = fromRef.current
    const start = performance.now()
    let raf = 0

    const tick = (now: number) => {
      // RAF 时间戳可能略早于 start，必须夹紧到 [0, 1]，否则首帧会出现负值
      const progress = Math.max(0, Math.min(1, (now - start) / duration))
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(from + (target - from) * eased)
      if (progress < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        fromRef.current = target
      }
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return value
}
