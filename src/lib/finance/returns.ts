/**
 * Financial calculation functions related to Return percentages and ROI.
 */
import { toNumber } from "../calculations"

export function calculateReturnPercent(netPnl: number, capitalUsed: number): number {
  if (!capitalUsed) return 0
  return (toNumber(netPnl) / toNumber(capitalUsed)) * 100
}

export function calculateOverallReturn(totalNetPnl: number, netContributions: number): number {
  if (netContributions <= 0) return 0
  return (toNumber(totalNetPnl) / toNumber(netContributions)) * 100
}
