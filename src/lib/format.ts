export function formatCurrency(amount: number | string, currency = "USD"): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

// "How long has this been waiting for review" (problem_statement.md
// section 6). Measured from when the request was created/submitted.
export function daysSince(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  const ms = Date.now() - d.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export function formatWaitingTime(date: Date | string): string {
  const days = daysSince(date);
  if (days === 0) return "Submitted today";
  if (days === 1) return "Waiting 1 day";
  return `Waiting ${days} days`;
}
