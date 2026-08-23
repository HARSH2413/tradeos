import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* KPI cards skeleton - row 1 */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <KpiSkeleton key={i} />
        ))}
      </section>

      {/* KPI cards skeleton - row 2 */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <KpiSkeleton key={i} />
        ))}
      </section>

      {/* Charts skeleton */}
      <section className="grid gap-4 xl:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </section>
    </div>
  )
}

function KpiSkeleton() {
  return (
    <Card className="border-white/10 bg-white/[0.035]">
      <CardHeader className="pb-2">
        <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
      </CardHeader>
      <CardContent>
        <div className="h-7 w-20 animate-pulse rounded bg-white/[0.08]" />
      </CardContent>
    </Card>
  )
}

function ChartSkeleton() {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-6">
      <div className="mb-4 h-4 w-32 animate-pulse rounded bg-white/10" />
      <div className="h-64 animate-pulse rounded bg-white/[0.05]" />
    </div>
  )
}
