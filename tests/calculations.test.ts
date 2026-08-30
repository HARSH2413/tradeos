import { describe, it, expect } from 'vitest'
import {
  calculateGrossPnl,
  calculateNetPnl,
  calculateTradeReturnPercent,
  calculateCapitalUsed,
  calculateProfitFactor,
  calculateWinRate
} from '../src/lib/calculations'

describe('Trade Calculations', () => {
  describe('Gross P&L', () => {
    it('should correctly calculate gross P&L for a winning BUY trade', () => {
      // BUY: entry = 100, exit = 110, qty = 10 -> P&L = +100
      expect(calculateGrossPnl('buy', 100, 110, 10)).toBe(100)
    })

    it('should correctly calculate gross P&L for a losing BUY trade', () => {
      // BUY: entry = 100, exit = 90, qty = 10 -> P&L = -100
      expect(calculateGrossPnl('buy', 100, 90, 10)).toBe(-100)
    })

    it('should correctly calculate gross P&L for a winning SELL trade', () => {
      // SELL: entry = 110, exit = 100, qty = 10 -> P&L = +100
      expect(calculateGrossPnl('sell', 110, 100, 10)).toBe(100)
    })

    it('should correctly calculate gross P&L for a losing SELL trade', () => {
      // SELL: entry = 100, exit = 110, qty = 10 -> P&L = -100
      expect(calculateGrossPnl('sell', 100, 110, 10)).toBe(-100)
    })
  })

  describe('Costs & Net P&L', () => {
    it('should correctly subtract brokerage and taxes', () => {
      // gross P&L = 100, brokerage = 20, taxes = 5 -> Net P&L = 75
      expect(calculateNetPnl(100, 20, 5)).toBe(75)
    })
    
    it('should deepen the loss when costs are applied to a losing trade', () => {
      // gross P&L = -100, brokerage = 20, taxes = 5 -> Net P&L = -125
      expect(calculateNetPnl(-100, 20, 5)).toBe(-125)
    })
  })

  describe('Returns', () => {
    it('should correctly calculate trade return percent', () => {
      const capitalUsed = calculateCapitalUsed(100, 10) // 1000
      const netPnl = 100
      // 100 / 1000 * 100 = 10%
      expect(calculateTradeReturnPercent(netPnl, capitalUsed)).toBe(10)
    })

    it('should return 0 return percent if capital used is 0', () => {
      expect(calculateTradeReturnPercent(100, 0)).toBe(0)
    })
  })

  describe('Portfolio Metrics', () => {
    it('should calculate win rate correctly', () => {
      const trades = [
        { net_pnl: 100 },
        { net_pnl: -50 },
        { net_pnl: 200 },
        { net_pnl: 0 } // breakeven is technically not a win
      ]
      // 2 wins out of 4 = 50%
      expect(calculateWinRate(trades)).toBe(50)
    })

    it('should handle zero trades for win rate', () => {
      expect(calculateWinRate([])).toBe(0)
    })

    it('should calculate profit factor correctly', () => {
      const trades = [
        { net_pnl: 100 },
        { net_pnl: -50 },
        { net_pnl: 200 },
        { net_pnl: -25 }
      ]
      // gross profit = 300, gross loss = 75
      // 300 / 75 = 4
      expect(calculateProfitFactor(trades)).toBe(4)
    })

    it('should return Infinity profit factor if no losses', () => {
      const trades = [
        { net_pnl: 100 },
        { net_pnl: 200 }
      ]
      expect(calculateProfitFactor(trades)).toBe(Infinity)
    })

    it('should return 0 profit factor if no wins and no losses (or only zero pnl)', () => {
      const trades = [
        { net_pnl: 0 }
      ]
      expect(calculateProfitFactor(trades)).toBe(0)
    })
  })
})
