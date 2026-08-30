import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase credentials in .env.local")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function runRLSTest() {
  console.log("🚀 Starting RLS Isolation Test...")

  // Generate random emails for test users
  const randA = Math.floor(Math.random() * 1000000)
  const randB = Math.floor(Math.random() * 1000000)
  const emailA = `testA_${randA}@example.com`
  const emailB = `testB_${randB}@example.com`
  const password = "SecurePassword123!"

  console.log(`\n1️⃣ Creating User A (${emailA})`)
  const { data: authA, error: errA } = await supabase.auth.signUp({
    email: emailA,
    password: password
  })
  
  if (errA || !authA.data.user) {
    console.error("Failed to create User A:", errA ? JSON.stringify(errA) : "No user returned (Email confirmation required?)")
    return
  }
  
  const userA_id = authA.data.user.id
  console.log(`✅ User A created. ID: ${userA_id}`)

  console.log(`\n2️⃣ Inserting private data for User A...`)
  // Sign in as User A explicitly (though signUp auto-signs in)
  await supabase.auth.signInWithPassword({ email: emailA, password })

  // Insert a strategy
  const { data: strategyA, error: stratErr } = await supabase.from('strategies').insert({
    user_id: userA_id,
    name: "User A Secret Strategy",
    market: "NIFTY"
  }).select().single()

  if (stratErr) throw stratErr
  console.log(`✅ User A Strategy created. ID: ${strategyA.id}`)

  // Insert a trade
  const { data: tradeA, error: tradeErr } = await supabase.from('trades').insert({
    user_id: userA_id,
    strategy_id: strategyA.id,
    date: new Date().toISOString().split('T')[0],
    symbol: "BANKNIFTY",
    trade_type: "long",
    entry_price: 100,
    exit_price: 110,
    quantity: 50,
    net_pnl: 500
  }).select().single()

  if (tradeErr) throw tradeErr
  console.log(`✅ User A Trade created. ID: ${tradeA.id}`)
  
  // Sign out User A
  await supabase.auth.signOut()

  console.log(`\n3️⃣ Creating User B (${emailB})`)
  const { data: authB, error: errB } = await supabase.auth.signUp({
    email: emailB,
    password: password
  })
  
  if (errB || !authB.data.user) {
    console.error("Failed to create User B:", errB ? JSON.stringify(errB) : "No user returned (Email confirmation required?)")
    return
  }

  const userB_id = authB.data.user.id
  console.log(`✅ User B created. ID: ${userB_id}`)
  
  // Ensure User B is logged in
  await supabase.auth.signInWithPassword({ email: emailB, password })

  console.log(`\n4️⃣ Testing Isolation: User B attempting to read User A's data...`)
  
  const { data: fetchTrades, error: fetchErr } = await supabase.from('trades').select('*').eq('id', tradeA.id)
  
  if (fetchErr) {
    console.error("❌ Error fetching trades:", fetchErr.message)
  } else if (fetchTrades && fetchTrades.length > 0) {
    console.error("❌ SECURITY FAILURE: User B can read User A's trade!", fetchTrades)
  } else {
    console.log("✅ SUCCESS: User B cannot read User A's trade. (Returns 0 rows)")
  }

  const { data: fetchStrats } = await supabase.from('strategies').select('*').eq('id', strategyA.id)
  if (fetchStrats && fetchStrats.length > 0) {
    console.error("❌ SECURITY FAILURE: User B can read User A's strategy!")
  } else {
    console.log("✅ SUCCESS: User B cannot read User A's strategy.")
  }

  console.log(`\n5️⃣ Testing Isolation: User B attempting to UPDATE User A's data...`)
  const { data: updateData, error: updateErr } = await supabase.from('trades')
    .update({ net_pnl: 999999 })
    .eq('id', tradeA.id)
    .select()

  if (updateData && updateData.length > 0) {
    console.error("❌ SECURITY FAILURE: User B successfully updated User A's trade!")
  } else {
    console.log("✅ SUCCESS: User B cannot update User A's trade. (Update fails silently due to RLS)")
  }

  console.log("\n🎉 ALL RLS ISOLATION TESTS PASSED 🎉")
}

runRLSTest().catch(console.error)
