import { useState } from 'react'
export default function ConfusionMatrix({ classes, matrix }) {
  const [hover, setHover] = useState(null)
  return (
    <div>
      <div className="overflow-x-auto"><table className="border-collapse text-[11px] font-mono" aria-label="Confusion matrix, rows true class, columns predicted class">
        <thead><tr><th />{classes.map((c, j) => <th key={c} className="w-9 h-7 font-normal text-mute" title={c}>{j + 1}</th>)}</tr></thead>
        <tbody>{matrix.map((row, i) => { const tot = row.reduce((a, b) => a + b, 0) || 1
          return <tr key={i}><th className="pr-2 text-right font-normal text-mute whitespace-nowrap">{i + 1} {classes[i]}</th>{row.map((n, j) => { const v = n / tot
            return <td key={j} onMouseEnter={() => setHover([i, j, n])} onMouseLeave={() => setHover(null)} className="w-9 h-9 text-center border border-bone"
              style={{ background: `rgba(79,116,88,${v})`, color: v > .5 ? '#fff' : '#22262A', outline: i === j ? '1px solid #22262A' : 'none', outlineOffset: -1 }}>{n || ''}</td> })}</tr> })}</tbody></table></div>
      <p className="mt-2 text-xs text-mute font-mono h-4" aria-live="polite">{hover ? `true ${classes[hover[0]]} → predicted ${classes[hover[1]]}: ${hover[2]}` : 'Hover a cell. Colour shows the share of each true class.'}</p>
    </div>)
}
