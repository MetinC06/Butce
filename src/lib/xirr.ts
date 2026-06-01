/**
 * XIRR — Internal Rate of Return for irregularly-timed cash flows.
 * Excel/Google Sheets XIRR ile aynı sonucu verir.
 *
 * Cash flows: yatırım çıkışı negatif, geri dönüş (satış + bugünkü değer) pozitif.
 * Tüm tutarlar AYNI para biriminde (bizim durumumuzda EUR) olmalı.
 * Tarih: JS Date (saat önemsiz, gün bazında hesaplanır).
 */

export type CashFlow = { amount: number; date: Date }

const DAYS_PER_YEAR = 365
const MAX_ITER = 100
const TOL = 1e-7

function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime()
  return ms / 86400000
}

function npv(rate: number, flows: CashFlow[], t0: Date): number {
  if (rate <= -1) return Number.POSITIVE_INFINITY
  let sum = 0
  for (const f of flows) {
    const years = daysBetween(t0, f.date) / DAYS_PER_YEAR
    sum += f.amount / Math.pow(1 + rate, years)
  }
  return sum
}

function dnpv(rate: number, flows: CashFlow[], t0: Date): number {
  if (rate <= -1) return Number.POSITIVE_INFINITY
  let sum = 0
  for (const f of flows) {
    const years = daysBetween(t0, f.date) / DAYS_PER_YEAR
    sum += (-years * f.amount) / Math.pow(1 + rate, years + 1)
  }
  return sum
}

/**
 * Returns annualized IRR as a decimal (0.12 = %12 yıllık).
 * Anlamlı sonuç verilemiyorsa null döner (örn: tek yönlü cash flow, çözüm yok).
 */
export function xirr(flows: CashFlow[], guess = 0.1): number | null {
  if (flows.length < 2) return null

  let hasPos = false
  let hasNeg = false
  for (const f of flows) {
    if (f.amount > 0) hasPos = true
    if (f.amount < 0) hasNeg = true
  }
  if (!hasPos || !hasNeg) return null

  const sorted = [...flows].sort((a, b) => a.date.getTime() - b.date.getTime())
  const t0 = sorted[0].date

  let rate = guess
  for (let i = 0; i < MAX_ITER; i++) {
    const value = npv(rate, sorted, t0)
    if (!isFinite(value)) break
    if (Math.abs(value) < TOL) return rate
    const deriv = dnpv(rate, sorted, t0)
    if (!isFinite(deriv) || deriv === 0) break
    const next = rate - value / deriv
    if (!isFinite(next)) break
    if (Math.abs(next - rate) < TOL) return next
    rate = next
    if (rate <= -0.999999) rate = -0.999999
  }

  return bisect(sorted, t0)
}

function bisect(flows: CashFlow[], t0: Date): number | null {
  let lo = -0.9999
  let hi = 10
  let fLo = npv(lo, flows, t0)
  let fHi = npv(hi, flows, t0)

  let expandTries = 0
  while (fLo * fHi > 0 && expandTries < 50) {
    hi *= 2
    fHi = npv(hi, flows, t0)
    expandTries++
  }
  if (fLo * fHi > 0) return null

  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    const fMid = npv(mid, flows, t0)
    if (Math.abs(fMid) < TOL || (hi - lo) / 2 < TOL) return mid
    if (fLo * fMid < 0) {
      hi = mid
      fHi = fMid
    } else {
      lo = mid
      fLo = fMid
    }
  }
  return (lo + hi) / 2
}
