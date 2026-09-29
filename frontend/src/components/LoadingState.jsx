export default function LoadingState({ text = 'Working…', progress }) {
  return <div role="status" className="py-8">
    <p className="text-sm flex items-center gap-2"><span className="inline-block h-1.5 w-1.5 rounded-full bg-moss live-dot" />{text}</p>
    <div className="mt-3 h-1.5 bg-line overflow-hidden">{progress == null
      ? <div className="h-full w-1/3 bg-moss animate-[slide_1.1s_ease-in-out_infinite]" />
      : <div className="h-full bg-moss transition-[width] duration-200" style={{ width: `${progress * 100}%` }} />}</div>
    <div className="mt-4 space-y-2 max-w-sm" aria-hidden="true">
      <div className="h-3 w-4/5 shimmer" /><div className="h-3 w-3/5 shimmer" /><div className="h-3 w-2/3 shimmer" />
    </div></div>
}