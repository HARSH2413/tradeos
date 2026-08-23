import { Metadata } from "next"
import { redirect } from "next/navigation"

import { ResetAccountCard } from "@/components/settings/reset-account-card"
import { SettingsForm } from "@/components/settings/settings-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type AppProfile, type AppSettings } from "@/lib/dashboard-data"
import { getSupabaseSession } from "@/lib/supabase/session"

export const metadata: Metadata = {
  title: "Settings | Dashboard",
  description: "Manage your account settings and preferences.",
}

export const revalidate = 30

export default async function SettingsPage() {
  const { supabase, user } = await getSupabaseSession()
  if (!user) redirect("/login")

  const [{ data: profileData }, { data: settingsData }] = await Promise.all([
    supabase.from("users").select("id,email,full_name").eq("id", user.id).maybeSingle(),
    supabase.from("settings").select("*").eq("user_id", user.id).maybeSingle(),
  ])
  const profile = (profileData ?? { id: user.id, email: user.email ?? "", full_name: "" }) as AppProfile
  const settings = (settingsData ?? { default_brokerage: 0, default_tax: 0 }) as AppSettings

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-3xl font-semibold text-white">Settings</h1>
      <Card className="border-white/10 bg-white/[0.035]">
        <CardHeader><CardTitle className="text-white">Account Settings</CardTitle></CardHeader>
        <CardContent>
          <SettingsForm profile={profile} settings={settings} />
        </CardContent>
      </Card>
      
      <ResetAccountCard />
    </div>
  )
}
