import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function StrategiesLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-32 animate-pulse rounded bg-white/10" />

      {/* Add strategy form skeleton */}
      <Card className="border-white/10 bg-white/[0.035]">
        <CardHeader>
          <div className="h-5 w-28 animate-pulse rounded bg-white/10" />
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-lg bg-white/[0.06]" />
          ))}
          <div className="h-20 animate-pulse rounded-lg bg-white/[0.06] md:col-span-2" />
          <div className="h-9 w-32 animate-pulse rounded-lg bg-emerald-400/20" />
        </CardContent>
      </Card>

      {/* Strategy cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="border-white/10 bg-white/[0.035]">
            <CardHeader>
              <div className="h-5 w-32 animate-pulse rounded bg-white/10" />
              <div className="mt-1 h-3 w-20 animate-pulse rounded bg-white/[0.06]" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="rounded-lg bg-slate-950 p-2">
                    <div className="h-3 w-12 mx-auto animate-pulse rounded bg-white/10" />
                    <div className="mt-1 h-4 w-8 mx-auto animate-pulse rounded bg-white/[0.08]" />
                  </div>
                ))}
              </div>
              <div className="h-4 w-48 animate-pulse rounded bg-white/[0.06]" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
