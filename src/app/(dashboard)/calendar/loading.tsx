export default function CalendarLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div className="space-y-2">
          <div className="h-3 w-20 animate-pulse rounded bg-emerald-400/20" />
          <div className="h-8 w-48 animate-pulse rounded bg-white/10" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-20 animate-pulse rounded-lg bg-white/10" />
          <div className="h-9 w-16 animate-pulse rounded-lg bg-white/10" />
        </div>
      </div>

      {/* Calendar grid skeleton */}
      <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
        <div className="grid grid-cols-7 gap-2 pb-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-3 w-8 mx-auto animate-pulse rounded bg-white/10" />
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="min-h-28 animate-pulse rounded-lg border border-white/5 bg-slate-950/40 p-3">
              <div className="h-4 w-4 rounded bg-white/10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
