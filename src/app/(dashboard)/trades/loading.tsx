import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function TradesLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div className="space-y-2">
          <div className="h-3 w-24 animate-pulse rounded bg-emerald-400/20" />
          <div className="h-8 w-40 animate-pulse rounded bg-white/10" />
          <div className="h-4 w-72 animate-pulse rounded bg-white/[0.06]" />
        </div>
        <div className="h-9 w-28 animate-pulse rounded-lg bg-emerald-400/20" />
      </div>

      {/* Stats skeleton */}
      <section className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="border-white/10 bg-white/[0.035]">
            <CardHeader className="pb-2">
              <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
            </CardHeader>
            <CardContent>
              <div className="h-7 w-20 animate-pulse rounded bg-white/[0.08]" />
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Table skeleton */}
      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
        <div className="mb-4 flex gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-3 w-16 animate-pulse rounded bg-white/10" />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-3 border-t border-white/5 py-3">
            {Array.from({ length: 8 }).map((_, j) => (
              <div key={j} className="h-4 w-16 animate-pulse rounded bg-white/[0.06]" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
