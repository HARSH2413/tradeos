"use client"

import { useState, useTransition } from "react"
import { ArrowDownRight, ArrowUpRight, Plus, Trash2, Wallet, ArrowDownCircle, ArrowUpCircle } from "lucide-react"
import { format, parseISO } from "date-fns"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { addCapitalTransaction, deleteCapitalTransaction } from "@/app/(dashboard)/dashboard/capital-actions"
import { type AppCapitalTransaction } from "@/lib/dashboard-data"
import { formatCurrency } from "@/lib/formatters"
import { SubmitButton } from "@/components/submit-button"
import { KpiCard } from "@/components/dashboard/kpi-card"

type CapitalLedgerContentProps = {
  /** Net Contributions = Total Deposits − Total Withdrawals. See: financial-model.ts */
  equity: number
  netContributions: number
  transactions: AppCapitalTransaction[]
}

export function CapitalLedgerContent({ equity, netContributions, transactions }: CapitalLedgerContentProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [, startTransition] = useTransition()
  const [error, setError] = useState("")

  async function handleAddTransaction(formData: FormData) {
    setError("")
    
    // Soft warning check for withdrawal
    const type = formData.get("transaction_type")
    const amount = Number(formData.get("amount"))
    
    if (type === "withdrawal" && amount > equity) {
      if (!window.confirm(`Warning: This withdrawal (${formatCurrency(amount)}) exceeds your current equity (${formatCurrency(equity)}). Continue anyway?`)) {
        return
      }
    }

    startTransition(async () => {
      try {
        await addCapitalTransaction(formData)
        setIsDialogOpen(false)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to add transaction")
      }
    })
  }

  const totalDeposited = transactions
    .filter((tx) => tx.transaction_type === "deposit")
    .reduce((sum, tx) => sum + Number(tx.amount), 0)
    
  const totalWithdrawn = transactions
    .filter((tx) => tx.transaction_type === "withdrawal")
    .reduce((sum, tx) => sum + Number(tx.amount), 0)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard 
          title="Net Contributions" 
          value={formatCurrency(netContributions)} 
          icon={Wallet} 
        />
        <KpiCard 
          title="Total Deposited" 
          value={formatCurrency(totalDeposited)} 
          icon={ArrowUpCircle} 
          tone="profit"
        />
        <KpiCard 
          title="Total Withdrawn" 
          value={formatCurrency(totalWithdrawn)} 
          icon={ArrowDownCircle}
          tone="loss"
        />
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-950 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Transaction History</h2>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger render={
              <Button className="bg-emerald-600 hover:bg-emerald-500 text-white">
                <Plus className="mr-2 h-4 w-4" />
                Add / Withdraw
              </Button>
            } />
            <DialogContent className="sm:max-w-[425px] bg-slate-900 border-white/10 text-slate-200">
              <DialogHeader>
                <DialogTitle className="text-white">New Capital Transaction</DialogTitle>
              </DialogHeader>
              <form action={handleAddTransaction} className="space-y-4 mt-4">
                {error && (
                  <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="transaction_type">Type</Label>
                  <Select name="transaction_type" defaultValue="deposit">
                    <SelectTrigger id="transaction_type" className="bg-slate-950 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10">
                      <SelectItem value="deposit">Deposit</SelectItem>
                      <SelectItem value="withdrawal">Withdrawal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input type="date" id="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} className="bg-slate-950 border-white/10" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input type="number" id="amount" name="amount" min="0.01" step="0.01" required className="bg-slate-950 border-white/10" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Input type="text" id="notes" name="notes" placeholder="e.g., Monthly addition" className="bg-slate-950 border-white/10" />
                </div>
                
                <div className="pt-4 flex justify-end">
                  <SubmitButton className="bg-emerald-600 hover:bg-emerald-500 text-white">
                    Save Transaction
                  </SubmitButton>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-500 border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
            <Wallet className="mx-auto h-8 w-8 text-slate-600 mb-3" />
            No transactions found. Add a deposit to set up your funding.
          </div>
        ) : (
          <div className="rounded-md border border-white/10 overflow-hidden">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-slate-400 font-medium">Date</TableHead>
                  <TableHead className="text-slate-400 font-medium">Type</TableHead>
                  <TableHead className="text-slate-400 font-medium">Amount</TableHead>
                  <TableHead className="text-slate-400 font-medium text-right">Net Contributions</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id} className="border-white/5 hover:bg-white/5">
                    <TableCell className="font-medium text-slate-300">
                      {format(parseISO(tx.date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs">
                        {tx.transaction_type === "deposit" ? (
                          <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-400">
                            <ArrowUpRight className="h-3 w-3" /> Deposit
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-rose-400">
                            <ArrowDownRight className="h-3 w-3" /> Withdrawal
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-white">
                      {formatCurrency(tx.amount)}
                    </TableCell>
                    <TableCell className="text-right text-slate-400">
                      {formatCurrency(tx.balance_after)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DeleteTxButton id={tx.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}

function DeleteTxButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 transition-colors"
      disabled={isPending}
      onClick={() => {
        if (window.confirm("Are you sure you want to delete this transaction? This will recalculate subsequent balances.")) {
          startTransition(async () => {
            await deleteCapitalTransaction(id)
          })
        }
      }}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}
