export default function JournalLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <div className="h-8 w-64 rounded bg-white/10" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 rounded bg-white/5" />
          <div className="h-9 w-20 rounded bg-white/5" />
          <div className="h-9 w-24 rounded bg-white/5" />
        </div>
      </div>
      <div className="h-48 rounded-xl border border-white/10 bg-white/[0.035]" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-96 rounded-xl border border-white/10 bg-white/[0.035]" />
        <div className="h-96 rounded-xl border border-white/10 bg-white/[0.035]" />
      </div>
    </div>
  )
}
