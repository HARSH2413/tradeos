import { NextResponse } from "next/server"
import { getSupabaseSession } from "@/lib/supabase/session"

export async function GET() {
  const { supabase, user } = await getSupabaseSession()
  if (!user) return NextResponse.json({ error: "Unauthorized" })

  const { data: trades } = await supabase.from("trades").select("*").eq("user_id", user.id)
  
  if (!trades) return NextResponse.json({ error: "No trades" })

  let totalGross = 0
  let totalNet = 0
  let totalBrokerage = 0
  let totalTaxes = 0
  
  const mismatches = []

  for (const t of trades as Record<string, string|number>[]) {
    const gross = Number(t.gross_pnl)
    const net = Number(t.net_pnl)
    const brok = Number(t.brokerage)
    const tax = Number(t.taxes)
    
    totalGross += gross
    totalNet += net
    totalBrokerage += brok
    totalTaxes += tax
    
    if (Math.abs(gross - net - brok - tax) > 0.01) {
      mismatches.push({
        id: t.id,
        gross,
        net,
        brok,
        tax,
        diff: gross - net,
        costs: brok + tax
      })
    }
  }

  return NextResponse.json({
    totalGross,
    totalNet,
    diff: totalGross - totalNet,
    totalBrokerage,
    totalTaxes,
    totalCosts: totalBrokerage + totalTaxes,
    mismatches
  })
}
