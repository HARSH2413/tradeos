import { describe, it, expect } from 'vitest'
import {
  calculateEquity
} from '../src/lib/financial-model'

describe('Financial Model Calculations', () => {
  describe('Equity', () => {
    it('should calculate equity as net contributions + trading P&L', () => {
      // Contributions = 40000, Trading P&L = 20000 -> Equity = 60000
      expect(calculateEquity(40000, 20000)).toBe(60000)
    })

    it('should correctly handle negative trading P&L', () => {
      // Contributions = 50000, Trading P&L = -15000 -> Equity = 35000
      expect(calculateEquity(50000, -15000)).toBe(35000)
    })

    it('should handle zero capital (e.g. before initial deposit)', () => {
      expect(calculateEquity(0, 0)).toBe(0)
    })

    it('should calculate negative equity properly if losses exceed contributions', () => {
      // (Though theoretically impossible in cash market, margin calls in F&O can result in negative equity)
      expect(calculateEquity(10000, -15000)).toBe(-5000)
    })
  })
})
