"use client"

import { useState, useTransition } from "react"
import { ArrowDownRight, ArrowUpRight, Plus, Trash2, Wallet } from "lucide-react"
import { format, parseISO } from "date-fns"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { addCapitalTransaction, deleteCapitalTransaction } from "@/app/(dashboard)/dashboard/capital-actions"
import { type AppCapitalTransaction } from "@/lib/dashboard-data"
import { formatCurrency } from "@/lib/formatters"
import { SubmitButton } from "@/components/submit-button"

type CapitalLedgerPanelProps = {
  currentCapital: number
  netFunding: number
  transactions: AppCapitalTransaction[]
  children?: React.ReactElement
}

export function CapitalLedgerPanel({ currentCapital, netFunding, transactions, children }: CapitalLedgerPanelProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [, startTransition] = useTransition()
  const [error, setError] = useState("")

  async function handleAddTransaction(formData: FormData) {
    setError("")
    
    // Soft warning check for withdrawal
    const type = formData.get("transaction_type")
    const amount = Number(formData.get("amount"))
    
    if (type === "withdrawal" && amount > currentCapital) {
      if (!window.confirm(`Warning: This withdrawal (${formatCurrency(amount)}) exceeds your current capital (${formatCurrency(currentCapital)}). Continue anyway?`)) {
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

  return (
    <Sheet>
      <SheetTrigger render={children || <Button variant="outline">Manage Funding</Button>} />
      <SheetContent className="w-full sm:max-w-xl border-white/10 bg-slate-950 overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2 text-lg text-white">
            <Wallet className="h-5 w-5 text-emerald-400" />
            Capital Ledger
          </SheetTitle>
          <SheetDescription className="text-slate-400">
            Net Contributions: <span className="font-semibold text-white">{formatCurrency(netFunding)}</span>
          </SheetDescription>
        </SheetHeader>
        
        <div className="mb-6">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger render={<Button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white" />}>
              <Plus className="mr-2 h-4 w-4" />
              Add / Withdraw
            </DialogTrigger>
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

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-slate-400">Transaction History</h3>
          {transactions.length === 0 ? (
            <div className="text-center py-6 text-sm text-slate-500 border border-dashed border-white/10 rounded-md">
              No transactions found. Add a deposit to set up your funding.
            </div>
          ) : (
            <div className="rounded-md border border-white/10 overflow-hidden">
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-slate-400">Date/Type</TableHead>
                    <TableHead className="text-right text-slate-400">Amount</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id} className="border-white/5 hover:bg-white/5">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-white">{format(parseISO(tx.date), "MMM d, yyyy")}</span>
                          <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-400">
                            {tx.transaction_type === "deposit" ? (
                              <ArrowUpRight className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3 text-rose-400" />
                            )}
                            <span className="capitalize">{tx.transaction_type}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col">
                          <span className="font-medium text-white">{formatCurrency(tx.amount)}</span>
                          <span className="text-xs text-slate-500 text-nowrap">Net: {formatCurrency(tx.balance_after)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="pr-2">
                        <DeleteTxButton id={tx.id} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function DeleteTxButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10"
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
