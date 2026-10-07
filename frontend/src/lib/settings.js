import { useEffect, useState } from 'react'
const KEY = 'yogavision.settings', DEFAULTS = { mirror: true, cameraId: '', reducedMotion: false, highContrast: false, theme: 'light' }
export const getSettings = () => { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY)) } } catch { return DEFAULTS } }
export function useSettings() {
  const [s, set] = useState(getSettings)
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(s)) } catch {}; applySettings(s) }, [s])
  return [s, patch => set(p => ({ ...p, ...patch }))]
}
export function applySettings(s) {
  document.documentElement.classList.toggle('hc', s.highContrast)
  document.documentElement.classList.toggle('rm', s.reducedMotion)
  document.documentElement.classList.toggle('dark', s.theme === 'dark')
  document.documentElement.classList.toggle('light', s.theme !== 'dark')
  document.documentElement.style.colorScheme = s.theme === 'dark' ? 'dark' : 'light'
}
