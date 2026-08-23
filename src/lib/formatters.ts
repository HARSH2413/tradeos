export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatPercentage(value: number) {
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(2)}%`
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(typeof date === "string" ? new Date(`${date}T00:00:00`) : date)
}

/** Format capital used with its percentage of equity. See: financial-model.ts */
export function formatCapitalUsed(
  capitalUsed: number,
  percent: number,
  equity: number
) {
  return `${formatCurrency(capitalUsed)} (${formatPercentage(percent)} of ${formatCurrency(equity)})`
}
