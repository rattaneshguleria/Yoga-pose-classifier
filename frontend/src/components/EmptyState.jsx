export default function EmptyState({ title, children, action }) {
  return <div className="border border-dashed border-line p-8 text-center reveal in"><h2 className="font-semibold">{title}</h2>
    <p className="mt-1 text-sm text-mute max-w-md mx-auto">{children}</p>{action && <div className="mt-4">{action}</div>}</div>
}