"use client"

import { useMemo, useState, useEffect } from "react"
import { format } from "date-fns"
import { Plus } from "lucide-react"

import { createTrade, updateTrade } from "@/app/(dashboard)/trades/actions"
import { upsertTradingDay } from "@/app/(dashboard)/journal/actions"
import { INDIAN_BASE_SYMBOLS } from "@/lib/indian-symbols"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SubmitButton } from "@/components/submit-button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { calculateTradeFields, type TradeType } from "@/lib/calculations"
import { formatCurrency, formatPercentage } from "@/lib/formatters"
import { cn } from "@/lib/utils"

export type TradeInitialData = {
  id: string
  date: string
  symbol: string
  trade_type: TradeType
  entry_price: number
  exit_price: number
  quantity: number
  notional_value: number
  brokerage: number
  taxes: number
  capital_used: number
  strategy_id: string | null
  trade_review_score: number | null
  notes: string
  mistakes: string[]
  rules: Record<string, "followed" | "broken" | "na">
}

type StrategyOption = {
  id: string
  name: string
}

type MistakeOption = {
  id: string
  name: string
}

type RuleOption = {
  id: string
  title: string
  category: string
}

export function TradeForm({
  equityForPreview,
  defaultBrokerage,
  defaultTax,
  strategies,
  mistakes,
  rules,
  initialData,
  defaultDate,
  defaultSymbol,
  trigger,
}: {
  /**
   * @deprecated Legacy client-side fallback used as equity for preview calculations.
   * The server uses `getEquityAtDate` (actual equity) for stored values.
   * See: src/lib/financial-model.ts
   */
  equityForPreview: number
  defaultBrokerage: number
  defaultTax: number
  strategies: StrategyOption[]
  mistakes: MistakeOption[]
  rules: RuleOption[]
  initialData?: TradeInitialData
  defaultDate?: string
  defaultSymbol?: string
  trigger?: React.ReactElement
}) {
  const [open, setOpen] = useState(false)
  const [tradeType, setTradeType] = useState<TradeType>(initialData?.trade_type ?? "buy")
  const [entryPrice, setEntryPrice] = useState(initialData?.entry_price ?? 0)
  const [exitPrice, setExitPrice] = useState(initialData?.exit_price ?? 0)
  const [quantity, setQuantity] = useState(initialData?.quantity ?? 0)
  const [brokerage, setBrokerage] = useState(initialData?.brokerage ?? defaultBrokerage)
  const [taxes, setTaxes] = useState(initialData?.taxes ?? defaultTax)
  const [reviewScore, setReviewScore] = useState(initialData?.trade_review_score ?? 5)
  const [manualCapitalUsed, setManualCapitalUsed] = useState<number | "">(initialData?.capital_used ?? "")

  const today = initialData?.date ?? defaultDate ?? format(new Date(), "yyyy-MM-dd")
  const defaultSym = initialData?.symbol ?? defaultSymbol ?? ""
  const [symbol, setSymbol] = useState(defaultSym)

  const isFnO = symbol.toUpperCase().endsWith("CE") || symbol.toUpperCase().endsWith("PE") || symbol.toUpperCase().endsWith("FUT")
  const requiresMargin = isFnO && tradeType === "sell"

  useEffect(() => {
    if (open && initialData) {
      setTradeType(initialData.trade_type)
      setEntryPrice(initialData.entry_price)
      setExitPrice(initialData.exit_price)
      setQuantity(initialData.quantity)
      setBrokerage(initialData.brokerage)
      setTaxes(initialData.taxes)
      setReviewScore(initialData.trade_review_score ?? 5)
      setManualCapitalUsed(initialData.capital_used ?? "")
      setSymbol(initialData.symbol)
    }
  }, [open, initialData])

  // equityForPreview is used as a client-side equity approximation for preview only
  const calculated = useMemo(
    () =>
      calculateTradeFields({
        tradeType,
        entryPrice,
        exitPrice,
        quantity,
        brokerage,
        taxes,
        equity: equityForPreview,
        capitalUsedOverride: manualCapitalUsed === "" ? (requiresMargin ? 0 : undefined) : manualCapitalUsed,
      }),
    [brokerage, entryPrice, exitPrice, quantity, equityForPreview, taxes, tradeType, manualCapitalUsed, requiresMargin]
  )

  const action = initialData ? updateTrade : createTrade

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger 
        render={trigger || <Button />}
      >
        {!trigger && (
          <>
            <Plus className="size-4" />
            Add Trade
          </>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto border-white/10 bg-slate-950">
        <DialogHeader>
          <DialogTitle className="text-white">{initialData ? "Edit Trade" : "Add Trade"}</DialogTitle>
        </DialogHeader>

        <form action={async (formData) => {
          try {
            const result = await action(formData)
            if (result && result.needsJournal) {
              const date = String(formData.get("date"))
              await upsertTradingDay({ date, formType: "create" })
              await action(formData) // retry
            }
            setOpen(false)
          } catch (err: unknown) {
            alert((err as Error).message)
          }
        }} className="grid gap-5">
          {initialData && <input type="hidden" name="id" value={initialData.id} />}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" name="date" type="date" defaultValue={today} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol</Label>
              <Input 
                id="symbol" 
                name="symbol" 
                list="indian-symbols" 
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="NIFTY" 
                required 
              />
            </div>

            <div className="space-y-2">
              <Label>Buy / Sell</Label>
              <input type="hidden" name="trade_type" value={tradeType} />
              <div className="grid grid-cols-2 rounded-lg border border-white/10 bg-slate-900 p-1">
                {(["buy", "sell"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setTradeType(type)}
                    className={cn(
                      "rounded-md px-3 py-2 text-sm font-medium text-slate-400 transition",
                      tradeType === type && "bg-emerald-400 text-slate-950"
                    )}
                  >
                    {type === "buy" ? "Buy" : "Sell"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="entry_price">Entry Price</Label>
              <Input
                id="entry_price"
                name="entry_price"
                type="number"
                step="0.01"
                min="0"
                defaultValue={initialData?.entry_price}
                onChange={(event) => setEntryPrice(Number(event.target.value))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exit_price">Exit Price</Label>
              <Input
                id="exit_price"
                name="exit_price"
                type="number"
                step="0.01"
                min="0"
                defaultValue={initialData?.exit_price}
                onChange={(event) => setExitPrice(Number(event.target.value))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                step="1"
                min="0"
                defaultValue={initialData?.quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capital_used">
                Trading Amount (Capital Used)
                {requiresMargin && <span className="ml-2 text-[10px] uppercase tracking-wider text-amber-400">Margin Required</span>}
              </Label>
              <Input
                id="capital_used"
                name="capital_used"
                type="number"
                step="0.01"
                min="0"
                placeholder={requiresMargin ? "Enter actual margin blocked" : String(entryPrice * quantity)}
                value={manualCapitalUsed}
                onChange={(event) => setManualCapitalUsed(event.target.value === "" ? "" : Number(event.target.value))}
                required={requiresMargin}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brokerage">Brokerage</Label>
              <Input
                id="brokerage"
                name="brokerage"
                type="number"
                step="0.01"
                min="0"
                value={brokerage}
                onChange={(event) => setBrokerage(Number(event.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxes">Taxes</Label>
              <Input
                id="taxes"
                name="taxes"
                type="number"
                step="0.01"
                min="0"
                value={taxes}
                onChange={(event) => setTaxes(Number(event.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="strategy_id">Strategy</Label>
              <select
                id="strategy_id"
                name="strategy_id"
                defaultValue={initialData?.strategy_id || ""}
                className="h-9 w-full rounded-lg border border-input bg-slate-950 px-3 text-sm text-white"
              >
                <option value="">No strategy</option>
                {strategies.map((strategy) => (
                  <option key={strategy.id} value={strategy.id}>
                    {strategy.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="trade_review_score">Review Score: {reviewScore}/10</Label>
              <Input
                id="trade_review_score"
                name="trade_review_score"
                type="range"
                min="1"
                max="10"
                value={reviewScore}
                onChange={(event) => setReviewScore(Number(event.target.value))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>What went wrong with this trade?</Label>
            <div className="grid gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 sm:grid-cols-2 lg:grid-cols-3">
              {mistakes.map((mistake) => (
                <label key={mistake.id} className="flex items-center gap-2 text-sm text-slate-300">
                  <input name="mistake_ids" type="checkbox" value={mistake.id} defaultChecked={initialData?.mistakes.includes(mistake.id)} className="size-4 accent-emerald-400" />
                  {mistake.name}
                </label>
              ))}
            </div>
          </div>

          {rules.length > 0 && (
            <div className="space-y-2">
              <Label>Rule Adherence</Label>
              <div className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
                {rules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between text-sm">
                    <div className="flex flex-col">
                      <span className="text-white">{rule.title}</span>
                      <span className="text-[10px] uppercase text-slate-500">{rule.category.replace("_", " ")}</span>
                    </div>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-1 text-slate-300">
                        <input type="radio" name={`rule_adherence_${rule.id}`} value="followed" defaultChecked={initialData ? initialData.rules[rule.id] === "followed" : false} className="accent-emerald-400" />
                        Followed
                      </label>
                      <label className="flex items-center gap-1 text-slate-300">
                        <input type="radio" name={`rule_adherence_${rule.id}`} value="broken" defaultChecked={initialData ? initialData.rules[rule.id] === "broken" : false} className="accent-red-400" />
                        Broken
                      </label>
                      <label className="flex items-center gap-1 text-slate-300">
                        <input type="radio" name={`rule_adherence_${rule.id}`} value="na" defaultChecked={initialData ? (!initialData.rules[rule.id] || initialData.rules[rule.id] === "na") : true} className="accent-slate-400" />
                        N/A
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" defaultValue={initialData?.notes} placeholder="Trade context, execution quality, emotions..." />
          </div>

          <div className="grid gap-3 rounded-lg border border-white/10 bg-slate-900/70 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <ReadOnlyMetric label="Capital Used %" value={formatPercentage(calculated.capitalUsedPercent)} />
            <ReadOnlyMetric label="Gross P&L" value={formatCurrency(calculated.grossPnl)} tone={calculated.grossPnl >= 0 ? "profit" : "loss"} />
            <ReadOnlyMetric label="Net P&L" value={formatCurrency(calculated.netPnl)} tone={calculated.netPnl >= 0 ? "profit" : "loss"} />
            <ReadOnlyMetric label="Trade Return %" value={formatPercentage(calculated.tradeReturnPercent)} tone={calculated.tradeReturnPercent >= 0 ? "profit" : "loss"} />
            <div>
              <p className="text-xs text-slate-500">Result</p>
              <Badge className={cn("mt-2", resultClass(calculated.result))}>{calculated.result}</Badge>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton>
              Save Trade
            </SubmitButton>
          </div>
        </form>

        <datalist id="indian-symbols">
          {INDIAN_BASE_SYMBOLS.map((symbol) => (
            <option key={symbol} value={symbol} />
          ))}
        </datalist>
      </DialogContent>
    </Dialog>
  )
}

function ReadOnlyMetric({
  label,
  value,
  tone = "neutral",
}: {
  label: string
  value: string
  tone?: "profit" | "loss" | "neutral"
}) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={cn(
          "mt-1 text-sm font-semibold text-white",
          tone === "profit" && "text-emerald-300",
          tone === "loss" && "text-red-300"
        )}
      >
        {value}
      </p>
    </div>
  )
}

function resultClass(result: string) {
  if (result === "WIN") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
  }

  if (result === "LOSS") {
    return "border-red-400/20 bg-red-400/10 text-red-200"
  }

  return "border-amber-400/20 bg-amber-400/10 text-amber-200"
}
