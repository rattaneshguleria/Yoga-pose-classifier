import { useEffect, useRef, useState } from 'react'
export default function AnimatedNumber({ value, ms = 500 }) {
  const [v, setV] = useState(0), from = useRef(0), rm = typeof document !== "undefined" && document.documentElement.classList.contains("rm")
  useEffect(() => {
    if (rm) { setV(value); from.current = value; return }
    const a = from.current, t0 = performance.now(); let raf
    const step = t => { const k = Math.min(1, (t - t0) / ms), e = 1 - (1 - k) ** 3; setV(Math.round(a + (value - a) * e)); from.current = a + (value - a) * e; if (k < 1) raf = requestAnimationFrame(step) }
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf)
  }, [value, ms])
  return <>{v}</>
}
