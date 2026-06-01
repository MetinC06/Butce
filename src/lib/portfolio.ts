import { PortfolioTransaction } from '@/types/database'
import { xirr, CashFlow } from './xirr'

export type PriceData = {
  prices: Record<string, number>
  currencies: Record<string, string>
  rates: { EURTRY: number; EURUSD: number; EURGBP: number }
}

export type Holding = {
  ticker: string
  company_name: string | null
  currency: string                    // ilk tx'ten alınır (genelde sabit)
  totalLots: number                   // sum(buy) - sum(sell)
  totalBoughtLots: number             // sum(buy) — avg cost paydası
  totalBoughtLocal: number            // sum(buy.lots * buy.price) — fee hariç
  totalBoughtEUR: number              // sum(buy.lots * buy.price * buy.eur_rate)
  totalSoldEUR: number                // sum(sell.lots * sell.price * sell.eur_rate)
  netInvestedEUR: number              // bought - sold
  avgCostLocal: number | null         // bought_local / bought_lots
  avgCostEUR: number | null           // weighted avg (bought_eur / bought_lots)
  currentPrice: number | null
  currentValueLocal: number | null
  currentValueEUR: number | null
  pnlEUR: number | null
  pnlPct: number | null
  xirr: number | null
  transactions: PortfolioTransaction[]
}

export type PortfolioSummary = {
  totalBoughtEUR: number
  totalSoldEUR: number
  netInvestedEUR: number
  currentValueEUR: number
  pnlEUR: number
  pnlPct: number | null
  xirr: number | null
}

export function currentEurRate(currency: string, rates: PriceData['rates']): number {
  if (currency === 'EUR') return 1
  if (currency === 'TRY' && rates.EURTRY > 0) return 1 / rates.EURTRY
  if (currency === 'USD' && rates.EURUSD > 0) return 1 / rates.EURUSD
  if (currency === 'GBP' && rates.EURGBP > 0) return 1 / rates.EURGBP
  return 1
}

export function toEUR(amount: number, currency: string, rates: PriceData['rates']): number {
  return amount * currentEurRate(currency, rates)
}

export function computeHoldings(transactions: PortfolioTransaction[], priceData: PriceData): Holding[] {
  const grouped = new Map<string, PortfolioTransaction[]>()
  for (const tx of transactions) {
    const arr = grouped.get(tx.ticker) || []
    arr.push(tx)
    grouped.set(tx.ticker, arr)
  }

  const holdings: Holding[] = []
  grouped.forEach((txs, ticker) => {
    txs.sort((a, b) => a.transaction_date.localeCompare(b.transaction_date))

    let totalBoughtLots = 0
    let totalSoldLots = 0
    let totalBoughtLocal = 0
    let totalBoughtEUR = 0
    let totalSoldEUR = 0

    for (const tx of txs) {
      const lots = Number(tx.lots)
      const price = Number(tx.price_per_lot)
      const rate = Number(tx.eur_rate)
      if (tx.type === 'buy') {
        totalBoughtLots += lots
        totalBoughtLocal += lots * price
        totalBoughtEUR += lots * price * rate
      } else {
        totalSoldLots += lots
        totalSoldEUR += lots * price * rate
      }
    }

    const totalLots = totalBoughtLots - totalSoldLots
    const netInvestedEUR = totalBoughtEUR - totalSoldEUR
    const avgCostLocal = totalBoughtLots > 0 ? totalBoughtLocal / totalBoughtLots : null
    const avgCostEUR = totalBoughtLots > 0 ? totalBoughtEUR / totalBoughtLots : null

    const currency = priceData.currencies[ticker] || txs[0]?.currency || 'EUR'
    const currentPrice = priceData.prices[ticker] ?? null
    const currentValueLocal = currentPrice != null ? currentPrice * totalLots : null
    const currentValueEUR = currentValueLocal != null
      ? toEUR(currentValueLocal, currency, priceData.rates)
      : null

    let pnlEUR: number | null = null
    let pnlPct: number | null = null
    if (currentValueEUR != null) {
      pnlEUR = currentValueEUR + totalSoldEUR - totalBoughtEUR
      if (totalBoughtEUR > 0) pnlPct = (pnlEUR / totalBoughtEUR) * 100
    }

    let xirrValue: number | null = null
    if (currentValueEUR != null && totalLots > 0) {
      const flows: CashFlow[] = txs.map(tx => ({
        amount: tx.type === 'buy'
          ? -Number(tx.lots) * Number(tx.price_per_lot) * Number(tx.eur_rate)
          :  Number(tx.lots) * Number(tx.price_per_lot) * Number(tx.eur_rate),
        date: new Date(tx.transaction_date),
      }))
      flows.push({ amount: currentValueEUR, date: new Date() })
      xirrValue = xirr(flows)
    } else if (currentValueEUR == null && totalLots > 0) {
      xirrValue = null
    } else if (totalLots === 0 && totalSoldEUR > 0) {
      const flows: CashFlow[] = txs.map(tx => ({
        amount: tx.type === 'buy'
          ? -Number(tx.lots) * Number(tx.price_per_lot) * Number(tx.eur_rate)
          :  Number(tx.lots) * Number(tx.price_per_lot) * Number(tx.eur_rate),
        date: new Date(tx.transaction_date),
      }))
      xirrValue = xirr(flows)
    }

    holdings.push({
      ticker,
      company_name: txs[txs.length - 1]?.company_name ?? null,
      currency,
      totalLots,
      totalBoughtLots,
      totalBoughtLocal,
      totalBoughtEUR,
      totalSoldEUR,
      netInvestedEUR,
      avgCostLocal,
      avgCostEUR,
      currentPrice,
      currentValueLocal,
      currentValueEUR,
      pnlEUR,
      pnlPct,
      xirr: xirrValue,
      transactions: txs,
    })
  })

  return holdings
}

export function computeSummary(holdings: Holding[], transactions: PortfolioTransaction[]): PortfolioSummary {
  let totalBoughtEUR = 0
  let totalSoldEUR = 0
  let currentValueEUR = 0
  let anyPriceMissing = false

  for (const h of holdings) {
    totalBoughtEUR += h.totalBoughtEUR
    totalSoldEUR += h.totalSoldEUR
    if (h.totalLots > 0) {
      if (h.currentValueEUR == null) anyPriceMissing = true
      else currentValueEUR += h.currentValueEUR
    }
  }

  const netInvestedEUR = totalBoughtEUR - totalSoldEUR
  const pnlEUR = anyPriceMissing ? 0 : currentValueEUR + totalSoldEUR - totalBoughtEUR
  const pnlPct = !anyPriceMissing && totalBoughtEUR > 0 ? (pnlEUR / totalBoughtEUR) * 100 : null

  let xirrValue: number | null = null
  if (!anyPriceMissing && transactions.length > 0) {
    const flows: CashFlow[] = transactions.map(tx => ({
      amount: tx.type === 'buy'
        ? -Number(tx.lots) * Number(tx.price_per_lot) * Number(tx.eur_rate)
        :  Number(tx.lots) * Number(tx.price_per_lot) * Number(tx.eur_rate),
      date: new Date(tx.transaction_date),
    }))
    if (currentValueEUR > 0) flows.push({ amount: currentValueEUR, date: new Date() })
    xirrValue = xirr(flows)
  }

  return {
    totalBoughtEUR,
    totalSoldEUR,
    netInvestedEUR,
    currentValueEUR,
    pnlEUR,
    pnlPct,
    xirr: xirrValue,
  }
}
