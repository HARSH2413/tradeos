"use client"

import { useState } from "react"
import { AlertTriangle, Download, Trash2 } from "lucide-react"

import { exportAccountData, resetAccountData } from "@/app/(dashboard)/settings/actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export function ResetAccountCard() {
  const [confirmText, setConfirmText] = useState("")
  const [loading, setLoading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  async function handleExport() {
    setLoading(true)
    try {
      const data = await exportAccountData()
      
      // Convert trades to CSV
      const headers = [
        "Date", "Symbol", "Type", "Strategy", "Entry Price", "Exit Price", 
        "Quantity", "Capital Used", "Gross P&L", "Brokerage", "Taxes", 
        "Net P&L", "Return %", "Notes"
      ]

      const strategiesMap = new Map((data.strategies as { id: string, name: string }[]).map(s => [s.id, s.name]))

      const csvRows = [headers.join(",")]

      type ExportTrade = {
        date: string; symbol: string; trade_type: string; strategy_id: string;
        entry_price: number; exit_price: number; quantity: number;
        capital_used: number; gross_pnl: number; brokerage: number; taxes: number;
        net_pnl: number; trade_return_percent: number; notes: string;
      }

      for (const t of (data.trades as ExportTrade[])) {
        const row = [
          t.date,
          t.symbol,
          t.trade_type.toUpperCase(),
          strategiesMap.get(t.strategy_id) || "None",
          t.entry_price,
          t.exit_price,
          t.quantity,
          t.capital_used,
          t.gross_pnl,
          t.brokerage,
          t.taxes,
          t.net_pnl,
          t.trade_return_percent,
          `"${(t.notes || "").replace(/"/g, '""')}"`
        ]
        csvRows.push(row.join(","))
      }
      
      const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `tradeos-export-${new Date().toISOString().split("T")[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setDownloaded(true)
    } catch (err) {
      console.error("Export failed", err)
      alert("Failed to export data. Aborting reset.")
    } finally {
      setLoading(false)
    }
  }

  async function handleReset() {
    if (confirmText !== "RESET") return
    
    // Safety check: force them to export first
    if (!downloaded) {
      alert("Please export your data first before wiping the account.")
      return
    }

    const confirmed = confirm("Are you absolutely sure? This will wipe your trades, strategies, and rules permanently.")
    if (!confirmed) return

    setLoading(true)
    try {
      await resetAccountData()
      alert("Account successfully reset.")
      setConfirmText("")
      setDownloaded(false)
    } catch (err) {
      console.error("Reset failed", err)
      alert("Failed to reset account.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-red-900/50 bg-red-950/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="size-5" />
          Danger Zone
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-400">
          Resetting your account will permanently delete all your trades, strategies, and rules. 
          Your account settings and profile will remain intact. You must download a backup before resetting.
        </p>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <Button 
            type="button"
            variant="outline"
            className="border-white/10 bg-slate-900 text-white hover:bg-slate-800"
            onClick={handleExport}
            disabled={loading}
          >
            <Download className="mr-2 size-4" />
            {downloaded ? "Backup Downloaded" : "1. Download Backup"}
          </Button>

          <div className="space-y-2 flex-1">
            <Label htmlFor="confirmReset" className="text-red-400">
              Type RESET to confirm
            </Label>
            <div className="flex gap-2">
              <Input 
                id="confirmReset" 
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="RESET"
                disabled={!downloaded || loading}
                className="border-red-900/50 focus-visible:ring-red-400"
              />
              <Button 
                type="button"
                variant="destructive"
                className="bg-red-500 hover:bg-red-600 disabled:opacity-50"
                onClick={handleReset}
                disabled={confirmText !== "RESET" || !downloaded || loading}
              >
                <Trash2 className="mr-2 size-4" />
                2. Wipe Data
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
