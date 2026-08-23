import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function SettingsLoading() {
  return (
    <div className="max-w-3xl space-y-6">
      <div className="h-8 w-28 animate-pulse rounded bg-white/10" />
      <Card className="border-white/10 bg-white/[0.035]">
        <CardHeader>
          <div className="h-5 w-36 animate-pulse rounded bg-white/10" />
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
                <div className="h-9 animate-pulse rounded-lg bg-white/[0.06]" />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-28 animate-pulse rounded-lg bg-emerald-400/20" />
            <div className="h-9 w-24 animate-pulse rounded-lg bg-white/10" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
