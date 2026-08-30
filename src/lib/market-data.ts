export async function getLatestMarketContext() {
  try {
    const fetchQuote = async (symbol: string) => {
      const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(5000), // 5s timeout so we don't block the analysis
      })
      if (!res.ok) return null
      const data = await res.json()
      const meta = data?.chart?.result?.[0]?.meta
      if (!meta) return null
      
      const price = meta.regularMarketPrice
      const prevClose = meta.chartPreviousClose
      const change = price - prevClose
      const changePercent = (change / prevClose) * 100
      
      return { price, changePercent }
    }

    const [nifty, bankNifty] = await Promise.all([
      fetchQuote("^NSEI"),
      fetchQuote("^NSEBANK")
    ])

    let context = ""

    if (nifty) {
      context += `NIFTY 50 Current: ${nifty.price} (${nifty.changePercent.toFixed(2)}%)\n`
    }
    if (bankNifty) {
      context += `NIFTY BANK Current: ${bankNifty.price} (${bankNifty.changePercent.toFixed(2)}%)\n`
    }

    if (!context) {
      return "Live market data is currently unavailable."
    }

    return context.trim()
  } catch (error) {
    console.error("Failed to fetch market data:", error)
    return "Live market data is currently unavailable."
  }
}
