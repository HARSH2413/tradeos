"use client"

import { Suspense, useState, type FormEvent } from "react"
import { useSearchParams } from "next/navigation"
import { Activity, LockKeyhole, Loader2, Mail, UserRound } from "lucide-react"

import TradingBackground from "@/components/TradingBackground"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { cn } from "@/lib/utils"

type AuthMode = "signin" | "signup"

function LoginContent() {
  const searchParams = useSearchParams()
  const redirectedFrom = searchParams.get("redirectedFrom") ?? "/dashboard"
  const [mode, setMode] = useState<AuthMode>("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isConfigured = isSupabaseConfigured()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setError("")
    setMessage("")
    setIsSubmitting(true)

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.")
      setIsSubmitting(false)
      return
    }

    // Strong password formatting/validation for signup
    if (mode === "signup") {
      if (password.length < 8) {
        setError("Password must be at least 8 characters long.")
        setIsSubmitting(false)
        return
      }
      if (!/(?=.*[a-z])/.test(password)) {
        setError("Password must contain at least one lowercase letter.")
        setIsSubmitting(false)
        return
      }
      if (!/(?=.*[A-Z])/.test(password)) {
        setError("Password must contain at least one uppercase letter.")
        setIsSubmitting(false)
        return
      }
      if (!/(?=.*\d)/.test(password)) {
        setError("Password must contain at least one number.")
        setIsSubmitting(false)
        return
      }
    }

    try {
      const supabase = createClient()

      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) {
          setError(signInError.message)
          return
        }

        window.location.href = redirectedFrom
        return
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectedFrom)}`,
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      if (signUpData.session) {
        window.location.href = "/dashboard"
        return
      }

      setMessage("Account created. Check your email to confirm, then sign in.")
      setMode("signin")
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Authentication failed. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_34%),linear-gradient(135deg,_#030712_0%,_#0a0f1f_48%,_#020617_100%)] px-4 py-8 text-foreground">
      <TradingBackground />
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[1fr_420px]">
          <section className="max-w-2xl">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
                <Activity className="size-5" />
              </div>
              <div>
                <p className="text-xl font-semibold tracking-tight">TradeOS</p>
                <p className="text-sm text-slate-400">Personal Trading Operating System</p>
              </div>
            </div>
            <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl">
              Your trading command center, built for discipline.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
              Record trades, monitor account growth, review mistakes, and keep your rules in one dark, focused workspace.
            </p>
            <div className="mt-8 max-w-xl rounded-md border border-amber-500/20 bg-amber-500/10 p-4">
              <p className="text-sm leading-relaxed text-amber-200">
                <strong>Disclaimer:</strong> TradeOS is a personal trading journaling and analytics tool. It does not provide financial advice or guarantee trading performance.
              </p>
            </div>
          </section>

          <Card className="border-white/10 bg-slate-950/80 shadow-2xl shadow-emerald-950/20 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-2xl text-white">
                {mode === "signin" ? "Welcome back" : "Create your account"}
              </CardTitle>
              <div className="grid grid-cols-2 rounded-lg border border-white/10 bg-slate-900 p-1">
                {(["signin", "signup"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setMode(item)
                      setError("")
                      setMessage("")
                    }}
                    className={cn(
                      "rounded-md px-3 py-2 text-sm font-medium text-slate-400 transition",
                      mode === item && "bg-emerald-400 text-slate-950"
                    )}
                  >
                    {item === "signin" ? "Sign in" : "Sign up"}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                {mode === "signup" && (
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full name</Label>
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        className="pl-9"
                        placeholder="Name"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="pl-9"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="pl-9"
                      minLength={6}
                      required
                    />
                  </div>
                </div>

                {error && (
                  <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    {error}
                  </p>
                )}
                {message && (
                  <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                    {message}
                  </p>
                )}
                {!isConfigured && (
                  <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                    Supabase is not configured yet. Add real project values to .env.local to enable authentication.
                  </p>
                )}

                <Button type="submit" className="w-full bg-emerald-400 text-slate-950 hover:bg-emerald-300" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {isSubmitting ? "Working..." : mode === "signin" ? "Sign in" : "Create account"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
