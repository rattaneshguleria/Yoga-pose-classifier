import { useEffect } from 'react'
export default function Toast({ msg, onDone }) {
  useEffect(() => { if (!msg) return; const t = setTimeout(onDone, 3500); return () => clearTimeout(t) }, [msg])
  return msg ? <div role="status" className="fixed bottom-20 md:bottom-6 right-6 bg-ink text-bone px-4 py-3 text-sm page-in z-50">{msg}</div> : null
}
