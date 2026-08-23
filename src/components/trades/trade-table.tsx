import Link from "next/link"
import { Trash2, Pencil, ChevronLeft, ChevronRight } from "lucide-react"

import { deleteTrade } from "@/app/(dashboard)/trades/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SubmitButton } from "@/components/submit-button"
import { TradeForm, type TradeInitialData } from "@/components/trades/trade-form"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getTradeResult } from "@/lib/calculations"
import { formatCurrency, formatDate, formatPercentage } from "@/lib/formatters"
import { cn } from "@/lib/utils"

export type TradeTableRow = TradeInitialData & {
  capital_used_percent: number
  gross_pnl: number
  net_pnl: number
  trade_return_percent: number
  strategies: { name: string } | null
}

const columns = [
  "Date",
  "Symbol",
  "B/S",
  "Entry",
  "Exit",
  "Qty",
  "Notional Value",
  "Capital Used",
  "Capital %",
  "Gross P&L",
  "Brokerage",
  "Net P&L",
  "Trade Return %",
  "Result",
  "Strategy",
  "",
]

export function TradeTable({
  trades,
  equityForPreview,
  defaultBrokerage,
  defaultTax,
  strategies,
  mistakes,
  rules,
  currentPage = 1,
  totalPages = 1,
}: {
  trades: TradeTableRow[]
  equityForPreview: number
  defaultBrokerage: number
  defaultTax: number
  strategies: { id: string; name: string }[]
  mistakes: { id: string; name: string }[]
  rules: { id: string; title: string; category: string }[]
  currentPage?: number
  totalPages?: number
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-white/10 bg-white/[0.03]">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((column) => (
                <TableHead key={column} className="px-3 text-xs uppercase tracking-[0.12em]">
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-slate-500">
                  No trades recorded yet.
                </TableCell>
              </TableRow>
            ) : (
              trades.map((trade) => {
                const result = getTradeResult(trade.net_pnl)

                return (
                  <TableRow key={trade.id} className="border-white/10">
                    <TableCell className="px-3">{formatDate(trade.date)}</TableCell>
                    <TableCell className="px-3 font-semibold text-white">{trade.symbol}</TableCell>
                    <TableCell className="px-3 uppercase">{trade.trade_type === "buy" ? "B" : "S"}</TableCell>
                    <TableCell className="px-3">{formatCurrency(trade.entry_price)}</TableCell>
                    <TableCell className="px-3">{formatCurrency(trade.exit_price)}</TableCell>
                    <TableCell className="px-3">{trade.quantity}</TableCell>
                    <TableCell className="px-3">{formatCurrency(trade.notional_value)}</TableCell>
                    <TableCell className="px-3">{formatCurrency(trade.capital_used)}</TableCell>
                    <TableCell className="px-3">{formatPercentage(trade.capital_used_percent)}</TableCell>
                    <TableCell className={cn("px-3", trade.gross_pnl >= 0 ? "text-emerald-300" : "text-red-300")}>
                      {formatCurrency(trade.gross_pnl)}
                    </TableCell>
                    <TableCell className="px-3">{formatCurrency(trade.brokerage)}</TableCell>
                    <TableCell className={cn("px-3 font-semibold", trade.net_pnl >= 0 ? "text-emerald-300" : "text-red-300")}>
                      {formatCurrency(trade.net_pnl)}
                    </TableCell>
                    <TableCell className={cn("px-3", trade.trade_return_percent >= 0 ? "text-emerald-300" : "text-red-300")}>
                      {formatPercentage(trade.trade_return_percent)}
                    </TableCell>
                    <TableCell className="px-3">
                      <Badge className={resultBadgeClass(result)}>{result}</Badge>
                    </TableCell>
                    <TableCell className="px-3">{trade.strategies?.name ?? "-"}</TableCell>
                    <TableCell className="px-3">
                      <div className="flex items-center gap-1">
                        <TradeForm
                          equityForPreview={equityForPreview}
                          defaultBrokerage={defaultBrokerage}
                          defaultTax={defaultTax}
                          strategies={strategies}
                          mistakes={mistakes}
                          rules={rules}
                          initialData={trade}
                          trigger={
                            <Button size="icon-sm" variant="ghost" className="text-slate-500 hover:text-emerald-300">
                              <Pencil className="size-4" />
                              <span className="sr-only">Edit trade</span>
                            </Button>
                          }
                        />
                        <form action={deleteTrade}>
                          <input type="hidden" name="id" value={trade.id} />
                          <SubmitButton size="icon-sm" variant="ghost" className="text-slate-500 hover:text-red-300">
                            <Trash2 className="size-4" />
                            <span className="sr-only">Delete trade</span>
                          </SubmitButton>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-slate-400">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            {currentPage > 1 ? (
              <Button
                variant="outline"
                size="sm"
                className="border-white/10 bg-white/5 text-white hover:bg-white/10"
              >
                <Link href={`/trades?page=${currentPage - 1}`} className="flex items-center">
                  <ChevronLeft className="mr-1 size-4" />
                  Previous
                </Link>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled
                className="border-white/10 bg-white/5 text-white hover:bg-white/10"
              >
                <ChevronLeft className="mr-1 size-4" />
                Previous
              </Button>
            )}

            {currentPage < totalPages ? (
              <Button
                variant="outline"
                size="sm"
                className="border-white/10 bg-white/5 text-white hover:bg-white/10"
              >
                <Link href={`/trades?page=${currentPage + 1}`} className="flex items-center">
                  Next
                  <ChevronRight className="ml-1 size-4" />
                </Link>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled
                className="border-white/10 bg-white/5 text-white hover:bg-white/10"
              >
                Next
                <ChevronRight className="ml-1 size-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function resultBadgeClass(result: string) {
  if (result === "WIN") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
  }

  if (result === "LOSS") {
    return "border-red-400/20 bg-red-400/10 text-red-200"
  }

  return "border-amber-400/20 bg-amber-400/10 text-amber-200"
}
