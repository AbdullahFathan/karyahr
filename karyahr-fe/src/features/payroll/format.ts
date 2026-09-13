/**
 * Formats an integer rupiah string for display (`15000000` → `Rp 15.000.000`).
 */
export function formatRupiah(amount: string): string {
  if (!/^\d+$/.test(amount)) {
    return amount
  }
  const grouped = amount.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `Rp ${grouped}`
}

export function isTerminalPayrollStatus(status: string): boolean {
  return status === 'COMPLETED' || status === 'FAILED'
}
