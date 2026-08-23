"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"

export function MonthSelector({ 
  months, 
  currentMonth 
}: { 
  months: string[]
  currentMonth: string 
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function onChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const newMonth = event.target.value
    const params = new URLSearchParams(searchParams.toString())
    params.set("month", newMonth)
    // Remove day if month changes so we don't try to show a day from the wrong month
    params.delete("day")
    
    router.push(`${pathname}?${params.toString()}`)
  }

  // Ensure current month is in the list even if no trades exist for it yet
  const options = Array.from(new Set([...months, currentMonth])).sort().reverse()

  return (
    <select
      value={currentMonth}
      onChange={onChange}
      className="h-9 rounded-lg border border-white/10 bg-slate-950 px-3 text-sm font-medium text-white shadow-sm focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
    >
      {options.map((m) => {
        const [year, month] = m.split("-")
        const date = new Date(Number(year), Number(month) - 1)
        const label = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(date)
        return (
          <option key={m} value={m}>
            {label}
          </option>
        )
      })}
    </select>
  )
}
