export default function AnalysisLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-3 w-24 rounded bg-emerald-400/20" />
        <div className="h-8 w-48 rounded bg-white/10" />
        <div className="h-4 w-80 rounded bg-white/[0.06]" />
      </div>
      <div className="h-48 rounded-xl border border-white/10 bg-white/[0.035]" />
    </div>
  )
}
