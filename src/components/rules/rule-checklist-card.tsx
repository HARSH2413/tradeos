"use client"

import { useState } from "react"
import { CheckCircle2, Circle, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { SubmitButton } from "@/components/submit-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type AppRule } from "@/lib/dashboard-data"
import { deleteRule } from "@/app/(dashboard)/rules/actions"
import { cn } from "@/lib/utils"

export function RuleChecklistCard({ rule }: { rule: AppRule }) {
  const [checked, setChecked] = useState(false)

  return (
    <Card 
      className={cn(
        "border-white/10 transition-colors duration-200 cursor-pointer",
        checked ? "bg-emerald-400/10 border-emerald-400/30" : "bg-white/[0.035]"
      )}
      onClick={() => setChecked(!checked)}
    >
      <CardHeader className="flex-row items-start justify-between gap-3 pb-3">
        <div className="flex items-start gap-3">
          <button type="button" className="mt-0.5 focus:outline-none">
            {checked ? (
              <CheckCircle2 className="size-5 text-emerald-400" />
            ) : (
              <Circle className="size-5 text-slate-500" />
            )}
          </button>
          <div>
            <CardTitle 
              className={cn(
                "transition-all duration-200", 
                checked ? "text-emerald-400 line-through opacity-70" : "text-white"
              )}
            >
              {rule.title}
            </CardTitle>
            <Badge className="mt-2 bg-slate-800 text-slate-300">
              {rule.category.replace("_", " ")}
            </Badge>
          </div>
        </div>
        <form action={deleteRule} onClick={(e) => e.stopPropagation()}>
          <input type="hidden" name="id" value={rule.id} />
          <SubmitButton size="icon-sm" variant="ghost">
            <Trash2 className="size-4" />
          </SubmitButton>
        </form>
      </CardHeader>
      <CardContent className="pl-[52px]">
        <p className={cn("text-sm transition-colors duration-200", checked ? "text-emerald-400/60" : "text-slate-400")}>
          {rule.description || "No description."}
        </p>
      </CardContent>
    </Card>
  )
}
