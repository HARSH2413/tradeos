import { generateDailyPerformanceRecords } from "./src/lib/calculations";

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
// No trades on Day 2, but we need to push a trade of 0 P&L so the date is picked up 
// (or generateDailyPerformanceRecords will pick up the date from capitalTxs automatically)
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
console.log(`Return:        ${latest.return_percent}%`);

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
