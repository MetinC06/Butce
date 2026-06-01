import { NextRequest, NextResponse } from 'next/server'

// Verilen tarihteki (UTC gün) 1 EUR = X kurunu Yahoo Finance'tan çeker.
// Pazar/tatil günlerinde en yakın geçmiş işlem günü kapanışını döner.

const PAIRS = ['EURTRY=X', 'EURUSD=X', 'EURGBP=X'] as const
type Pair = (typeof PAIRS)[number]

async function fetchHistoricalClose(pair: Pair, dateISO: string): Promise<number | null> {
  const day = new Date(`${dateISO}T00:00:00Z`)
  // 5 günlük pencere — hafta sonu/tatili telafi et
  const period1 = Math.floor(day.getTime() / 1000) - 5 * 86400
  const period2 = Math.floor(day.getTime() / 1000) + 86400

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${pair}?period1=${period1}&period2=${period2}&interval=1d`
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' })
    const data = await res.json()
    const result = data?.chart?.result?.[0]
    const timestamps: number[] | undefined = result?.timestamp
    const closes: (number | null)[] | undefined = result?.indicators?.quote?.[0]?.close
    if (!timestamps || !closes) return null

    const targetTs = Math.floor(day.getTime() / 1000) + 86400
    let pick: number | null = null
    for (let i = 0; i < timestamps.length; i++) {
      if (timestamps[i] <= targetTs && closes[i] != null) pick = closes[i]
    }
    return pick
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date')
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date param required (YYYY-MM-DD)' }, { status: 400 })
  }

  const results = await Promise.all(PAIRS.map(p => fetchHistoricalClose(p, date)))
  const rates: Record<string, number> = {}
  PAIRS.forEach((p, i) => {
    const v = results[i]
    if (v != null) {
      const key = p.replace('=X', '')
      rates[key] = v
    }
  })

  return NextResponse.json({ date, rates })
}
