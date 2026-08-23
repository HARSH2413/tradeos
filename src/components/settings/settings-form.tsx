"use client"

import { useActionState } from "react"
import { updateSettings } from "@/app/(dashboard)/settings/actions"
import { SubmitButton } from "@/components/submit-button"
import { SignOutButton } from "@/components/sign-out-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type SettingsFormProps = {
  profile: { full_name: string | null; email: string }
  settings: { default_brokerage: number; default_tax: number }
}

export function SettingsForm({ profile, settings }: SettingsFormProps) {
  const [state, formAction] = useActionState(updateSettings, null)

  return (
    <form action={formAction} className="grid gap-4">
      {state?.error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-md bg-emerald-500/15 p-3 text-sm text-emerald-500">
          {state.message}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Full Name" name="full_name" defaultValue={profile.full_name ?? ""} />
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={profile.email} readOnly />
        </div>
        <Field label="Default Brokerage" name="default_brokerage" defaultValue={String(settings.default_brokerage)} type="number" />
        <Field label="Default Tax" name="default_tax" defaultValue={String(settings.default_tax)} type="number" />
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <SubmitButton>Save Settings</SubmitButton>
        <div className="w-40"><SignOutButton /></div>
        <a href="/dashboard" className="text-sm text-emerald-400 hover:text-emerald-300 ml-auto">Manage Capital &rarr;</a>
      </div>
    </form>
  )
}

function Field({ label, name, defaultValue, type = "text" }: { label: string; name: string; defaultValue: string; type?: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue} type={type} step={type === "number" ? "0.01" : undefined} />
    </div>
  )
}
