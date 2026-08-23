import { Metadata } from "next"
import { redirect } from "next/navigation"

import { createRule } from "@/app/(dashboard)/rules/actions"
import { SubmitButton } from "@/components/submit-button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { type AppRule } from "@/lib/dashboard-data"
import { getSupabaseSession } from "@/lib/supabase/session"

import { RuleChecklistCard } from "@/components/rules/rule-checklist-card"

const categories = ["entry", "exit", "risk_management", "psychology"] as const

export const metadata: Metadata = {
  title: "Rules | Dashboard",
  description: "Set and track adherence to your trading rules.",
}

export const revalidate = 60

export default async function RulesPage() {
  const { supabase, user } = await getSupabaseSession()
  if (!user) redirect("/login")
  const { data } = await supabase.from("rules").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
  const rules = (data ?? []) as AppRule[]

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold text-white">Rules</h1>
      <Card className="border-white/10 bg-white/[0.035]">
        <CardContent className="pt-6">
          <form action={createRule} className="grid gap-3 md:grid-cols-[220px_1fr]">
            <select name="category" className="h-9 rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white">
              {categories.map((category) => <option key={category} value={category}>{category.replace("_", " ")}</option>)}
            </select>
            <Input name="title" placeholder="Rule title" required />
            <Textarea name="description" placeholder="Description" className="md:col-span-2" />
            <SubmitButton>Add Rule</SubmitButton>
          </form>
        </CardContent>
      </Card>
      {categories.map((category) => (
        <section key={category} className="space-y-3">
          <h3 className="text-lg font-semibold capitalize text-white">{category.replace("_", " ")}</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {rules.filter((rule) => rule.category === category).map((rule) => (
              <RuleChecklistCard key={rule.id} rule={rule} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
