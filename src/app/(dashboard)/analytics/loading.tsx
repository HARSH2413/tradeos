import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-32 animate-pulse rounded bg-white/10" />

      {/* Metrics row skeleton */}
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="border-white/10 bg-white/[0.035]">
            <CardContent className="p-4">
              <div className="h-3 w-20 animate-pulse rounded bg-white/10" />
              <div className="mt-2 h-6 w-16 animate-pulse rounded bg-white/[0.08]" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance + Strategy cards skeleton */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-white/10 bg-white/[0.035]">
          <CardHeader>
            <div className="h-5 w-40 animate-pulse rounded bg-white/10" />
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg bg-slate-950 p-3">
                <div className="h-3 w-20 animate-pulse rounded bg-white/10" />
                <div className="mt-2 h-5 w-16 animate-pulse rounded bg-white/[0.08]" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-white/[0.035]">
          <CardHeader>
            <div className="h-5 w-36 animate-pulse rounded bg-white/10" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-950" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
