"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Loader2, LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

export function SignOutButton() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  async function handleSignOut() {
    setIsLoading(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push("/login")
      router.refresh()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      className="w-full justify-start text-slate-400 hover:bg-white/5 hover:text-white"
      onClick={handleSignOut}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <LogOut className="size-4" />
      )}
      {isLoading ? "Signing out..." : "Logout"}
    </Button>
  )
}
