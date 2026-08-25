const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in environment")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
  console.log("Fetching all trades...")
  const { data: trades, error } = await supabase.from('trades').select('*')
  
  if (error) {
    console.error("Error fetching trades:", error)
    return
  }

  console.log(`Found ${trades?.length || 0} trades. Checking for mismatches...`)

  let fixedCount = 0

  for (const trade of trades || []) {
    // Recalculate everything
    const entryPrice = Number(trade.entry_price)
    const exitPrice = Number(trade.exit_price)
    const quantity = Number(trade.quantity)
    const brokerage = Number(trade.brokerage)
    const taxes = Number(trade.taxes)
    
    let priceDiff = trade.trade_type === "buy" ? exitPrice - entryPrice : entryPrice - exitPrice
    let expectedGross = priceDiff * quantity
    let expectedNet = expectedGross - brokerage - taxes

    const actualGross = Number(trade.gross_pnl)
    const actualNet = Number(trade.net_pnl)

    // Check with a small tolerance for floating point issues
    if (Math.abs(expectedGross - actualGross) > 0.01 || Math.abs(expectedNet - actualNet) > 0.01) {
      console.log(`Trade ${trade.id} mismatch:`)
      console.log(`  Current: Gross=${actualGross}, Net=${actualNet}, Brokerage=${brokerage}, Taxes=${taxes}`)
      console.log(`  Expected: Gross=${expectedGross}, Net=${expectedNet}`)
      
      const { error: updateError } = await supabase
        .from('trades')
        .update({
          gross_pnl: expectedGross,
          net_pnl: expectedNet,
          notional_value: entryPrice * quantity, // just in case
        })
        .eq('id', trade.id)

      if (updateError) {
        console.error(`Failed to update trade ${trade.id}:`, updateError)
      } else {
        fixedCount++
        console.log(`  -> Fixed`)
      }
    }
  }

  console.log(`Done. Fixed ${fixedCount} trades.`)
}

main()
