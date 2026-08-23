import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function ReportsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-44 animate-pulse rounded bg-white/10" />

      {/* Month selector skeleton */}
      <div className="flex gap-2">
        <div className="h-9 w-32 animate-pulse rounded-lg bg-white/10" />
        <div className="h-9 w-16 animate-pulse rounded-lg bg-emerald-400/20" />
      </div>

      {/* Report card skeleton */}
      <Card className="border-white/10 bg-white/[0.035]">
        <CardHeader>
          <div className="h-5 w-32 animate-pulse rounded bg-white/10" />
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-lg bg-slate-950 p-3">
              <div className="h-3 w-20 animate-pulse rounded bg-white/10" />
              <div className="mt-2 h-5 w-16 animate-pulse rounded bg-white/[0.08]" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
