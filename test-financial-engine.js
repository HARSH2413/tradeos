function generateDailyPerformanceRecords(trades, capitalTxs, startingEquity = 0) {
  const allDates = new Set();
  const tradesByDay = new Map();
  
  for (const t of trades) {
    const d = t.date.slice(0, 10);
    allDates.add(d);
    tradesByDay.set(d, (tradesByDay.get(d) ?? 0) + Number(t.net_pnl));
  }
  
  const depositsByDay = new Map();
  const withdrawalsByDay = new Map();
  
  for (const tx of capitalTxs) {
    const d = tx.date.slice(0, 10);
    allDates.add(d);
    if (tx.transaction_type === "deposit") {
      depositsByDay.set(d, (depositsByDay.get(d) ?? 0) + Number(tx.amount));
    } else if (tx.transaction_type === "withdrawal") {
      withdrawalsByDay.set(d, (withdrawalsByDay.get(d) ?? 0) + Number(tx.amount));
    }
  }

  const sortedDates = Array.from(allDates).sort();
  const records = [];
  
  let runningEquity = startingEquity;
  
  for (const date of sortedDates) {
    const dayPnl = tradesByDay.get(date) ?? 0;
    const dayDeposits = depositsByDay.get(date) ?? 0;
    const dayWithdrawals = withdrawalsByDay.get(date) ?? 0;
    
    // If running equity is <= 0 (e.g. first day), deposits act as the beginning equity
    const beginningEquity = runningEquity > 0 ? runningEquity : (dayDeposits - dayWithdrawals);
    
    let returnPercent = 0;
    if (beginningEquity > 0) {
      returnPercent = (dayPnl / beginningEquity) * 100;
    }
    
    runningEquity = runningEquity + dayPnl + dayDeposits - dayWithdrawals;
    
    records.push({
      date,
      beginning_equity: beginningEquity,
      deposits: dayDeposits,
      withdrawals: dayWithdrawals,
      net_pnl: dayPnl,
      ending_equity: runningEquity,
      return_percent: returnPercent
    });
  }
  
  return records;
}

console.log("--- PHASE 28 FINANCIAL TEST SUITE ---");

const trades = [];
const capitalTxs = [];

// Test A
trades.push({ date: "2026-08-01", net_pnl: 20000 });
capitalTxs.push({ date: "2026-08-01", transaction_type: "deposit", amount: 20000 });

let records = generateDailyPerformanceRecords(trades, capitalTxs);
let latest = records[records.length - 1];
let totalPnl = records.reduce((s, r) => s + r.net_pnl, 0);
let totalContrib = records.reduce((s, r) => s + r.deposits - r.withdrawals, 0);

console.log("\nTEST A - ₹20k -> ₹40k");
console.log(`Contributions: ${totalContrib}`);
console.log(`P&L:           ${totalPnl}`);
console.log(`Equity:        ${latest.ending_equity}`);
console.log(`Return:        ${latest.return_percent}%`);

// Test B
capitalTxs.push({ date: "2026-08-02", transaction_type: "deposit", amount: 20000 });
// No trades on Day 2
records = generateDailyPerformanceRecords(trades, capitalTxs);
latest = records[records.length - 1];
totalPnl = records.reduce((s, r) => s + r.net_pnl, 0);
totalContrib = records.reduce((s, r) => s + r.deposits - r.withdrawals, 0);

console.log("\nTEST B - Add another ₹20k");
console.log(`Contributions: ${totalContrib}`);
console.log(`P&L:           ${totalPnl}`);
console.log(`Equity:        ${latest.ending_equity}`);

// Test C
trades.push({ date: "2026-08-03", net_pnl: 5000 });
records = generateDailyPerformanceRecords(trades, capitalTxs);
latest = records[records.length - 1];
totalPnl = records.reduce((s, r) => s + r.net_pnl, 0);
totalContrib = records.reduce((s, r) => s + r.deposits - r.withdrawals, 0);

console.log("\nTEST C - Make ₹5k after deposit");
console.log(`Ending Equity: ${latest.ending_equity}`);
console.log(`Return:        ${latest.return_percent.toFixed(2)}%`);

// Test D
capitalTxs.push({ date: "2026-08-04", transaction_type: "withdrawal", amount: 10000 });
records = generateDailyPerformanceRecords(trades, capitalTxs);
latest = records[records.length - 1];
totalPnl = records.reduce((s, r) => s + r.net_pnl, 0);
totalContrib = records.reduce((s, r) => s + r.deposits - r.withdrawals, 0);

console.log("\nTEST D - Withdraw ₹10k");
console.log(`Equity:        ${latest.ending_equity}`);
console.log(`Trading P&L:   ${totalPnl}`);
console.log(`Contributions: ${totalContrib}`);
