import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function RulesLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-20 animate-pulse rounded bg-white/10" />

      {/* Add rule form skeleton */}
      <Card className="border-white/10 bg-white/[0.035]">
        <CardContent className="pt-6 grid gap-3 md:grid-cols-[220px_1fr]">
          <div className="h-9 animate-pulse rounded-lg bg-white/[0.06]" />
          <div className="h-9 animate-pulse rounded-lg bg-white/[0.06]" />
          <div className="h-20 animate-pulse rounded-lg bg-white/[0.06] md:col-span-2" />
          <div className="h-9 w-24 animate-pulse rounded-lg bg-emerald-400/20" />
        </CardContent>
      </Card>

      {/* Rule categories skeleton */}
      {Array.from({ length: 3 }).map((_, i) => (
        <section key={i} className="space-y-3">
          <div className="h-6 w-28 animate-pulse rounded bg-white/10" />
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, j) => (
              <Card key={j} className="border-white/10 bg-white/[0.035]">
                <CardHeader>
                  <div className="h-5 w-40 animate-pulse rounded bg-white/10" />
                  <div className="mt-2 h-5 w-20 animate-pulse rounded-full bg-emerald-400/10" />
                </CardHeader>
                <CardContent>
                  <div className="h-4 w-48 animate-pulse rounded bg-white/[0.06]" />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
