import { redirect } from "next/navigation"

import { Header } from "@/components/header"
import { NavigationProgress } from "@/components/navigation-progress"
import { Sidebar } from "@/components/sidebar"
import { GlobalTradeButton } from "@/components/trades/global-trade-button"
import { getSupabaseSession } from "@/lib/supabase/session"

type DashboardProfile = {
  email: string
  full_name: string | null
}

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { supabase, user } = await getSupabaseSession()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = (await supabase
    .from("users")
    .select("full_name,email")
    .eq("id", user.id)
    .maybeSingle()) as { data: DashboardProfile | null }

  const sidebarUser = {
    email: profile?.email ?? user.email ?? "",
    fullName: (profile?.full_name ?? user.user_metadata?.full_name ?? null) as string | null,
  }

  return (
    <div className="flex min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 text-slate-100 selection:bg-emerald-500/30">
      <NavigationProgress />
      <Sidebar user={sidebarUser} />
      <div className="min-w-0 flex-1">
        <Header user={sidebarUser} action={<GlobalTradeButton />} />
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}
