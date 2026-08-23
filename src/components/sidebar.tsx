"use client"

import { useEffect, useState } from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Activity,
  BarChart3,
  BookOpen,
  BookOpenCheck,
  CalendarDays,
  FileText,
  LayoutDashboard,
  LineChart,
  Loader2,
  Menu,
  Settings,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { SignOutButton } from "@/components/sign-out-button"
import { cn } from "@/lib/utils"

type SidebarUser = {
  email: string
  fullName?: string | null
}

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/trades", label: "Trades", icon: LineChart },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/strategies", label: "Strategies", icon: Target },
  { href: "/rules", label: "Rules", icon: BookOpenCheck },
  { href: "/capital", label: "Capital", icon: Wallet },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/reports", label: "Monthly Reports", icon: FileText },
  { href: "/analysis", label: "AI Analyst", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings },
]

function UserBlock({ user }: { user: SidebarUser }) {
  const initials =
    user.fullName
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || user.email.slice(0, 2).toUpperCase()

  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <Avatar className="size-9 border border-emerald-400/20">
        <AvatarFallback className="bg-emerald-400/10 text-sm font-semibold text-emerald-200">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-white">
          {user.fullName || "Trader"}
        </p>
        <p className="truncate text-xs text-slate-500">{user.email}</p>
      </div>
    </div>
  )
}

function SidebarContent({ user, onNavigate }: { user: SidebarUser; onNavigate?: () => void }) {
  const pathname = usePathname()
  const [loadingHref, setLoadingHref] = useState<string | null>(null)

  // Clear loading state when navigation completes
  useEffect(() => {
    setLoadingHref(null)
  }, [pathname])

  return (
    <div className="flex h-full flex-col bg-slate-950/40 backdrop-blur-xl text-slate-300">
      <div className="border-b border-white/10 px-5 py-5">
        <Link href="/dashboard" className="flex items-center gap-3" onClick={onNavigate}>
          <div className="flex size-10 items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
            <Activity className="size-5" />
          </div>
          <div>
            <p className="font-semibold tracking-tight text-white">TradeOS</p>
            <p className="text-xs text-slate-500">Trading command center</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`)

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                if (!isActive) setLoadingHref(item.href)
                onNavigate?.()
              }}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-emerald-400/20 to-teal-400/10 text-emerald-200 ring-1 ring-emerald-400/30 shadow-[0_0_15px_rgba(52,211,153,0.1)]"
                  : "text-slate-400 hover:bg-white/10 hover:text-white hover:scale-[1.02] hover:shadow-lg"
              )}
            >
              {loadingHref === item.href ? (
                <Loader2 className="size-4 animate-spin text-emerald-400" />
              ) : (
                <Icon className="size-4" />
              )}
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="space-y-3 border-t border-white/10 p-3">
        <UserBlock user={user} />
        <SignOutButton />
      </div>
    </div>
  )
}

export function Sidebar({ user }: { user: SidebarUser }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-white/10 lg:block">
      <SidebarContent user={user} />
    </aside>
  )
}

export function MobileSidebar({ user }: { user: SidebarUser }) {
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden" />}>
        <Menu className="size-5" />
        <span className="sr-only">Open navigation</span>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 border-white/10 bg-slate-950/60 backdrop-blur-xl p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation</SheetTitle>
        </SheetHeader>
        <SidebarContent user={user} />
      </SheetContent>
    </Sheet>
  )
}
