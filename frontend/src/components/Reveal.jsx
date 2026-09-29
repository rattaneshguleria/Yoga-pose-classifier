import { useEffect, useRef, useState } from 'react'
// Fades + slides children up once they scroll into view. Cheap IntersectionObserver, no library.
export default function Reveal({ as: Tag = 'div', className = '', children, ...rest }) {
  const ref = useRef(null), [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect() } }, { threshold: .15 })
    io.observe(el); return () => io.disconnect()
  }, [])
  return <Tag ref={ref} className={`reveal ${inView ? 'in' : ''} ${className}`} {...rest}>{children}</Tag>
}