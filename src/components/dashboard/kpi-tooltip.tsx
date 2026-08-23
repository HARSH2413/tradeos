"use client"

import { useState } from "react"
import { Info } from "lucide-react"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function KpiTooltip({ info }: { info: string }) {
  const [open, setOpen] = useState(false)

  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger 
          onClick={() => setOpen((prev) => !prev)}
          className="text-slate-500 transition-colors hover:text-slate-300 focus:outline-none"
        >
          <Info className="size-3.5" />
          <span className="sr-only">Info</span>
        </TooltipTrigger>
        <TooltipContent className="max-w-[250px] border border-white/10 bg-slate-900 text-center text-slate-200 shadow-xl">
          {info}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
