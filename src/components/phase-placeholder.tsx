import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function PhasePlaceholder({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <Card className="border-white/10 bg-white/[0.03]">
      <CardHeader>
        <CardTitle className="text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="max-w-2xl text-sm leading-6 text-slate-400">{description}</p>
      </CardContent>
    </Card>
  )
}
