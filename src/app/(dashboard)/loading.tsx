import { Loader2 } from "lucide-react"

export default function DashboardLoading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
      <Loader2 className="size-10 animate-spin text-emerald-400" />
      <p className="text-sm font-medium text-slate-400 animate-pulse tracking-wide uppercase">Loading Workspace...</p>
    </div>
  )
}
