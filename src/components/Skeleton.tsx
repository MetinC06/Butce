export function SkeletonPulse({ className = '' }: { className?: string }) {
  return <div className={`bg-zinc-800 animate-pulse rounded-lg ${className}`} />
}

export function SkeletonBalanceCard() {
  return (
    <div className="rounded-2xl p-5 mb-3 bg-zinc-800 animate-pulse">
      <div className="h-3.5 bg-zinc-700 rounded w-40 mb-3" />
      <div className="h-9 bg-zinc-700 rounded w-36 mb-4" />
      <div className="flex gap-6">
        <div className="h-3 bg-zinc-700 rounded w-20" />
        <div className="h-3 bg-zinc-700 rounded w-20" />
      </div>
    </div>
  )
}

export function SkeletonListItem({ last = false }: { last?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-4 py-3.5 animate-pulse ${!last ? 'border-b border-zinc-800' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-zinc-800 rounded-full flex-shrink-0" />
        <div>
          <div className="h-4 bg-zinc-800 rounded w-28 mb-1.5" />
          <div className="h-3 bg-zinc-800 rounded w-16" />
        </div>
      </div>
      <div className="h-4 bg-zinc-800 rounded w-16" />
    </div>
  )
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListItem key={i} last={i === count - 1} />
      ))}
    </div>
  )
}
