import { NextResponse } from "next/server"
import { getSupabaseSession } from "@/lib/supabase/session"

export async function GET() {
  const { supabase, user } = await getSupabaseSession()
  if (!user) return NextResponse.json({ error: "Unauthorized" })

  try {
    // Delete data in the correct order to respect foreign keys (though cascade handles most)
    
    // 1. Trades
    await supabase.from("trades").delete().eq("user_id", user.id)
    
    // 2. Trading Days (Journal)
    await supabase.from("trading_days").delete().eq("user_id", user.id)
    
    // 3. Capital Transactions
    await supabase.from("capital_transactions").delete().eq("user_id", user.id)
    
    // 4. Strategies
    await supabase.from("strategies").delete().eq("user_id", user.id)
    
    // 5. Rules & Rule Adherence
    await supabase.from("daily_rule_adherence").delete().eq("user_id", user.id)
    await supabase.from("rules").delete().eq("user_id", user.id)

    // 6. Reset Settings to default
    await supabase.from("settings").update({
      starting_capital: 10000,
      default_brokerage: 0,
      default_tax: 0
    }).eq("user_id", user.id)

    return NextResponse.json({
      message: "Success! Your database slate has been completely wiped clean for your account. You can now start fresh."
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
