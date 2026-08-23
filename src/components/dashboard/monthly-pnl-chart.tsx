"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/formatters"

export type MonthlyPnlPoint = {
  month: string
  pnl: number
}

export function MonthlyPnlChart({ data }: { data: MonthlyPnlPoint[] }) {
  return (
    <Card className="border-white/10 bg-white/[0.035]">
      <CardHeader>
        <CardTitle className="text-white">Monthly P&L Trend</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke="rgba(148,163,184,0.14)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`} />
            <Tooltip
              contentStyle={{
                background: "#020617",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 8,
                color: "#fff",
              }}
              formatter={(value) => [formatCurrency(Number(value)), "Net P&L"]}
            />
            <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
              {data.map((item) => (
                <Cell key={item.month} fill={item.pnl >= 0 ? "#34d399" : "#f87171"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
