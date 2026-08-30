const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
const Papa = require("papaparse");

const envFile = fs.readFileSync(".env.local", "utf8");
let url = "", key = "";
envFile.split("\n").forEach(line => {
  if (line.startsWith("NEXT_PUBLIC_SUPABASE_URL=")) url = line.split("=")[1].trim();
  if (line.startsWith("NEXT_PUBLIC_SUPABASE_ANON_KEY=")) key = line.split("=")[1].trim();
});

const supabase = createClient(url, key);

const EMAIL = process.env.TEST_USER_EMAIL;
const PASSWORD = process.env.TEST_USER_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error("Missing TEST_USER_EMAIL or TEST_USER_PASSWORD");
  process.exit(1);
}

const STARTING_CAPITAL = 50000;

async function parseCsv(filename) {
  const file = fs.readFileSync(path.join("TradeOS_30_Day_Test_Data", filename), "utf8");
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data)
    });
  });
}

async function run() {
  console.log("Logging in...");
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD
  });

  if (authErr) {
    console.error("Login failed:", authErr);
    return;
  }

  const userId = authData.user.id;
  console.log("Logged in! User ID:", userId);

  console.log("Cleaning up existing data for this user...");
  await supabase.from("trades").delete().eq("user_id", userId);
  await supabase.from("trading_days").delete().eq("user_id", userId);
  await supabase.from("capital_transactions").delete().eq("user_id", userId);
  await supabase.from("strategies").delete().eq("user_id", userId);
  await supabase.from("rules").delete().eq("user_id", userId);
  console.log("Cleanup complete!");

  const strategiesMap = {};
  const rulesMap = {};
  const mistakesMap = {};
  const tradingDaysMap = {};
  const tradesMap = {};

  const strategies = await parseCsv("01_strategies.csv");
  for (const row of strategies) {
    const { strategy_id, ...rest } = row;
    const { data, error } = await supabase.from("strategies").insert({ ...rest, user_id: userId }).select("id").single();
    if (error) throw error;
    strategiesMap[strategy_id] = data.id;
  }
  console.log(`Inserted ${strategies.length} strategies`);

  const rules = await parseCsv("02_rules.csv");
  for (const row of rules) {
    const { rule_id, ...rest } = row;
    const { data, error } = await supabase.from("rules").insert({ ...rest, user_id: userId }).select("id").single();
    if (error) throw error;
    rulesMap[rule_id] = data.id;
  }
  console.log(`Inserted ${rules.length} rules`);

  const mistakes = await parseCsv("03_mistakes.csv");
  for (const row of mistakes) {
    const { mistake_id, ...rest } = row;
    const { data: existing } = await supabase.from("mistakes").select("id").eq("name", rest.name).maybeSingle();
    if (existing) {
      mistakesMap[mistake_id] = existing.id;
    } else {
      console.warn("Mistake not found, trying to insert:", rest.name);
      const { data, error } = await supabase.from("mistakes").insert(rest).select("id").single();
      if (error) throw error;
      mistakesMap[mistake_id] = data.id;
    }
  }
  console.log(`Resolved ${mistakes.length} mistakes`);

  const capitalTxs = await parseCsv("04_capital_transactions.csv");
  for (const row of capitalTxs) {
    const { transaction_id, ...rest } = row;
    const { error } = await supabase.from("capital_transactions").insert({ ...rest, user_id: userId });
    if (error) throw error;
  }
  console.log(`Inserted ${capitalTxs.length} capital transactions`);

  const tradingDays = await parseCsv("05_trading_days.csv");
  for (const row of tradingDays) {
    const { trading_day_id, symbol, status, biggest_mistake, ...rest } = row;
    rest.pre_market_completed = status === "completed" || status === "pre_market";
    rest.post_market_completed = status === "completed";
    rest.plan_followed = rest.plan_followed === "yes" ? "yes" : (rest.plan_followed === "no" ? "no" : null);
    
    for (const key of Object.keys(rest)) {
      if (rest[key] === "") rest[key] = null;
    }
    const { data, error } = await supabase.from("trading_days").insert({ ...rest, user_id: userId }).select("id").single();
    if (error) throw error;
    tradingDaysMap[trading_day_id] = data.id;
  }
  console.log(`Inserted ${tradingDays.length} trading days`);

  const trades = await parseCsv("06_trades.csv");
  for (const row of trades) {
    const { trade_id, result, ...rest } = row;
    if (rest.strategy_id) rest.strategy_id = strategiesMap[rest.strategy_id];
    
    for (const key of Object.keys(rest)) {
      if (rest[key] === "") rest[key] = null;
    }
    const { data, error } = await supabase.from("trades").insert({ ...rest, user_id: userId }).select("id").single();
    if (error) { console.error("Trade insert err", rest); throw error; }
    tradesMap[trade_id] = data.id;
  }
  console.log(`Inserted ${trades.length} trades`);

  const tradeMistakes = await parseCsv("07_trade_mistakes.csv");
  for (const row of tradeMistakes) {
    const { error } = await supabase.from("trade_mistakes").insert({
      trade_id: tradesMap[row.trade_id],
      mistake_id: mistakesMap[row.mistake_id]
    });
    if (error) throw error;
  }
  console.log(`Inserted ${tradeMistakes.length} trade mistakes`);

  const tradeRules = await parseCsv("08_trade_rule_adherence.csv");
  let tradeRulesInserted = 0;
  for (const row of tradeRules) {
    if (row.status !== "followed" && row.status !== "broken") continue;
    const { error } = await supabase.from("trade_rule_adherence").insert({
      trade_id: tradesMap[row.trade_id],
      rule_id: rulesMap[row.rule_id],
      status: row.status
    });
    if (error) throw error;
    tradeRulesInserted++;
  }
  console.log(`Inserted ${tradeRulesInserted} trade rule adherences`);

  console.log("All dummy data seeded successfully!");
}

run().catch(console.error);
