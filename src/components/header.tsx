"use client"

import { usePathname } from "next/navigation"

import { MobileSidebar } from "@/components/sidebar"

type HeaderUser = {
  email: string
  fullName?: string | null
}

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/trades": "Trades",
  "/calendar": "Calendar",
  "/strategies": "Strategies",
  "/rules": "Rules",
  "/journal": "Journal",
  "/analytics": "Analytics",
  "/reports": "Monthly Reports",
  "/analysis": "AI Analyst",
  "/settings": "Settings",
}

export function Header({ user, action }: { user: HeaderUser; action?: React.ReactNode }) {
  const pathname = usePathname()
  const title = titles[pathname] ?? "TradeOS"

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-slate-950/40 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-3">
        <MobileSidebar user={user} />
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">
            TradeOS
          </p>
          <h1 className="text-lg font-semibold text-white">{title}</h1>
        </div>
      </div>
      {action && <div>{action}</div>}
    </header>
  )
}
