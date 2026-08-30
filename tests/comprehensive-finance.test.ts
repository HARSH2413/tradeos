import { describe, it, expect } from 'vitest'
import {
  calculateGrossPnl,
  calculateNetPnl,
  calculateTradeReturnPercent,
  calculateCapitalUsed,
  calculateProfitFactor,
  calculateWinRate
} from '../src/lib/calculations'
import { calculateEquity } from '../src/lib/financial-model'
import { calculateReturnPercent, calculateOverallReturn } from '../src/lib/finance/returns'

describe('Comprehensive Financial & Edge Case Testing', () => {

  describe('1. Long/Short Trades (Gross P&L)', () => {
    it('Long Trade - Profit', () => {
      expect(calculateGrossPnl('buy', 100, 110, 10)).toBe(100)
    })
    
    it('Long Trade - Loss', () => {
      expect(calculateGrossPnl('buy', 110, 100, 10)).toBe(-100)
    })
    
    it('Short Trade - Profit', () => {
      expect(calculateGrossPnl('sell', 110, 100, 10)).toBe(100)
    })
    
    it('Short Trade - Loss', () => {
      expect(calculateGrossPnl('sell', 100, 110, 10)).toBe(-100)
    })

    it('Breakeven Trade', () => {
      expect(calculateGrossPnl('buy', 100, 100, 50)).toBe(0)
      expect(calculateGrossPnl('sell', 100, 100, 50)).toBe(0)
    })
  })

  describe('2. Costs (Brokerage & Taxes)', () => {
    it('Profitable trade with high costs turns into net loss', () => {
      expect(calculateNetPnl(10, 15, 5)).toBe(-10)
    })

    it('Losing trade with costs deepens the loss', () => {
      expect(calculateNetPnl(-100, 20, 10)).toBe(-130)
    })

    it('Zero costs does not affect P&L', () => {
      expect(calculateNetPnl(500, 0, 0)).toBe(500)
    })
  })

  describe('3. Return % and Capital Used', () => {
    it('Standard Return % calculation', () => {
      const capUsed = calculateCapitalUsed(100, 10) // 1000
      expect(calculateTradeReturnPercent(100, capUsed)).toBe(10)
    })

    it('Return % handles extreme leverage (small capital, large PnL)', () => {
      expect(calculateTradeReturnPercent(1000, 100)).toBe(1000) // 1000% return
    })

    it('Return % gracefully handles ZERO capital used', () => {
      expect(calculateTradeReturnPercent(500, 0)).toBe(0)
      expect(calculateReturnPercent(500, 0)).toBe(0)
    })

    it('Negative return %', () => {
      expect(calculateReturnPercent(-50, 1000)).toBe(-5)
    })
  })

  describe('4. Financial Model: Equity (Deposits & Withdrawals)', () => {
    it('Standard Equity = Net Contributions + P&L', () => {
      // 10k deposit, 2k profit = 12k equity
      expect(calculateEquity(10000, 2000)).toBe(12000)
    })

    it('Multiple Deposits & Withdrawals simulation', () => {
      const deposits = 50000 + 20000
      const withdrawals = 10000
      const netContributions = deposits - withdrawals // 60000
      const pnl = 15000
      expect(calculateEquity(netContributions, pnl)).toBe(75000)
    })

    it('Zero Capital edge case (before first deposit)', () => {
      expect(calculateEquity(0, 0)).toBe(0)
    })

    it('Negative P&L eroding capital completely', () => {
      // Deposited 10k, lost 10k
      expect(calculateEquity(10000, -10000)).toBe(0)
    })

    it('Negative Equity (Margin Call / F&O Debt)', () => {
      // Deposited 10k, lost 15k
      expect(calculateEquity(10000, -15000)).toBe(-5000)
    })
  })

  describe('5. Overall Account Returns', () => {
    it('Overall return percent calculation', () => {
      // 10k net contributions, 1k profit = 10%
      expect(calculateOverallReturn(1000, 10000)).toBe(10)
    })

    it('Overall return with negative profit (drawdown)', () => {
      // 10k net contributions, -2k profit = -20%
      expect(calculateOverallReturn(-2000, 10000)).toBe(-20)
    })

    it('Returns 0 if net contributions is 0 or negative', () => {
      expect(calculateOverallReturn(500, 0)).toBe(0)
      expect(calculateOverallReturn(500, -5000)).toBe(0)
    })
  })

  describe('6. Edge Cases & Type Coercion', () => {
    it('Handles string inputs transparently (e.g., from generic DB rows)', () => {
      // @ts-expect-error Testing coercion
      expect(calculateGrossPnl('buy', '100', '110', '10')).toBe(100)
      // @ts-expect-error test coercion
      expect(calculateNetPnl('100', '20', '5')).toBe(75)
    })

    it('Gracefully handles undefined/null in arrays for Win Rate / Profit Factor', () => {
      const messyTrades = [
        { net_pnl: 100 },
        { net_pnl: null },
        { net_pnl: undefined },
        { net_pnl: -50 }
      ]
      // 4 total trades. 1 win. Win rate = 1/4 = 25%
      // @ts-expect-error test undefined array
      expect(calculateWinRate(messyTrades)).toBe(25)
      // @ts-expect-error test null array
      expect(calculateProfitFactor(messyTrades)).toBe(2)
    })
  })
})
