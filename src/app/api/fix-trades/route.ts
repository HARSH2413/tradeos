import { NextResponse } from "next/server"
import { getSupabaseSession } from "@/lib/supabase/session"

export async function GET() {
  const { supabase, user } = await getSupabaseSession()
  if (!user) return NextResponse.json({ error: "Unauthorized" })

  const { data: trades } = await supabase.from("trades").select("*").eq("user_id", user.id)
  
  if (!trades) return NextResponse.json({ error: "No trades" })

  let fixedCount = 0
  const fixes = []

  for (const trade of trades) {
    const entryPrice = Number(trade.entry_price)
    const exitPrice = Number(trade.exit_price)
    const quantity = Number(trade.quantity)
    const brokerage = Number(trade.brokerage)
    const taxes = Number(trade.taxes)
    
    const priceDiff = trade.trade_type === "buy" ? exitPrice - entryPrice : entryPrice - exitPrice
    const expectedGross = priceDiff * quantity
    const expectedNet = expectedGross - brokerage - taxes

    const actualGross = Number(trade.gross_pnl)
    const actualNet = Number(trade.net_pnl)

    if (Math.abs(expectedGross - actualGross) > 0.01 || Math.abs(expectedNet - actualNet) > 0.01) {
      const { error: updateError } = await supabase
        .from('trades')
        .update({
          gross_pnl: expectedGross,
          net_pnl: expectedNet,
          notional_value: entryPrice * quantity,
        })
        .eq('id', trade.id)

      if (!updateError) {
        fixedCount++
        fixes.push({
          id: trade.id,
          oldGross: actualGross,
          newGross: expectedGross,
          oldNet: actualNet,
          newNet: expectedNet
        })
      }
    }
  }

  return NextResponse.json({
    message: `Fixed ${fixedCount} trades with mismatched P&L calculations.`,
    fixes
  })
}
