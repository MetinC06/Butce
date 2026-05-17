import { NextRequest, NextResponse } from 'next/server'

async function fetchYahoo(ticker: string) {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' }
    )
    const data = await res.json()
    const meta = data?.chart?.result?.[0]?.meta
    return {
      price: (meta?.regularMarketPrice as number) ?? null,
      currency: (meta?.currency as string) ?? null,
    }
  } catch {
    return { price: null, currency: null }
  }
}

export async function GET(request: NextRequest) {
  const tickers = request.nextUrl.searchParams.get('tickers')
  const tickerList = tickers ? tickers.split(',').filter(Boolean).map(t => t.trim()) : []

  const allTickers = [...tickerList, 'EURTRY=X', 'EURUSD=X']
  const results = await Promise.allSettled(allTickers.map(t => fetchYahoo(t)))

  const prices: Record<string, number> = {}
  const currencies: Record<string, string> = {}

  results.forEach((result, i) => {
    if (result.status !== 'fulfilled') return
    const ticker = allTickers[i]
    const { price, currency } = result.value
    if (price !== null) prices[ticker] = price
    if (currency) currencies[ticker] = currency
  })

  const rates = {
    EURTRY: prices['EURTRY=X'] || 0,
    EURUSD: prices['EURUSD=X'] || 0,
  }

  delete prices['EURTRY=X']
  delete prices['EURUSD=X']
  delete currencies['EURTRY=X']
  delete currencies['EURUSD=X']

  return NextResponse.json({ prices, currencies, rates })
}
