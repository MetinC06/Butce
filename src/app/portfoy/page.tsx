'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'
import Header from '@/components/Header'
import { Plus, Trash2, RefreshCw, ChevronDown, ChevronUp, TrendingUp, TrendingDown, History } from 'lucide-react'
import { PortfolioTransaction, TransactionType } from '@/types/database'
import { computeHoldings, computeSummary, PriceData, Holding } from '@/lib/portfolio'

function formatEUR(amount: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(amount)
}
function formatTRY(amount: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(amount)
}
function formatUSD(amount: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(amount)
}
function formatGBP(amount: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(amount)
}
function formatLocal(amount: number, currency: string) {
  if (currency === 'TRY') return formatTRY(amount)
  if (currency === 'USD') return formatUSD(amount)
  if (currency === 'GBP') return formatGBP(amount)
  return formatEUR(amount)
}
function formatPct(v: number | null, withSign = true): string {
  if (v == null || !isFinite(v)) return '—'
  const sign = withSign && v >= 0 ? '+' : ''
  return `${sign}${v.toFixed(2)}%`
}
function formatSignedEUR(v: number | null): string {
  if (v == null || !isFinite(v)) return '—'
  const sign = v >= 0 ? '+' : ''
  return `${sign}${formatEUR(v)}`
}
function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function displayTicker(ticker: string) {
  return ticker.replace(/\.(IS|AS|L|DE|PA|O|N)$/, '')
}
function getExchangeInfo(ticker: string): { label: string; flag: string } {
  if (ticker.endsWith('.IS')) return { label: 'BIST (Türkiye)', flag: '🇹🇷' }
  if (ticker.endsWith('.AS')) return { label: 'AEX (Amsterdam)', flag: '🇳🇱' }
  if (ticker.endsWith('.L'))  return { label: 'LSE (Londra)', flag: '🇬🇧' }
  if (ticker.endsWith('.DE')) return { label: 'Frankfurt', flag: '🇩🇪' }
  if (ticker.endsWith('.PA')) return { label: 'Paris', flag: '🇫🇷' }
  return { label: 'NYSE / NASDAQ (ABD)', flag: '🇺🇸' }
}
function defaultCurrencyFor(ticker: string): string {
  if (ticker.endsWith('.IS')) return 'TRY'
  if (ticker.endsWith('.AS') || ticker.endsWith('.DE') || ticker.endsWith('.PA')) return 'EUR'
  if (ticker.endsWith('.L')) return 'GBP'
  return 'USD'
}

const EXCHANGES = [
  { label: '🇹🇷 BIST (Türkiye)', suffix: '.IS', hint: 'THYAO, ASELS' },
  { label: '🇳🇱 AEX (Amsterdam)', suffix: '.AS', hint: 'ASML, ADYEN' },
  { label: '🇺🇸 NYSE / NASDAQ (ABD)', suffix: '', hint: 'AAPL, MSFT, TSLA' },
  { label: '🇬🇧 LSE (Londra)', suffix: '.L', hint: 'SHEL, HSBA' },
  { label: '🇩🇪 Frankfurt (XETRA)', suffix: '.DE', hint: 'SAP, BMW' },
  { label: '🇫🇷 Paris (Euronext)', suffix: '.PA', hint: 'LVMH, TTE' },
  { label: '🌐 Tam kod gir', suffix: '__custom__', hint: 'TICKER.XX formatında' },
]

type ExpandTab = 'buy' | 'sell' | 'history'

async function fetchEurRate(date: string, currency: string): Promise<number | null> {
  if (currency === 'EUR') return 1
  try {
    const res = await fetch(`/api/fx?date=${date}`)
    const json = await res.json()
    const rates: Record<string, number> = json.rates || {}
    const key = `EUR${currency}`
    const v = rates[key]
    if (!v || v <= 0) return null
    return 1 / v
  } catch {
    return null
  }
}

export default function PortfoyPage() {
  const supabase = createClient()
  const [transactions, setTransactions] = useState<PortfolioTransaction[]>([])
  const [priceData, setPriceData] = useState<PriceData>({ prices: {}, currencies: {}, rates: { EURTRY: 0, EURUSD: 0, EURGBP: 0 } })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [ticker, setTicker] = useState('')
  const [exchange, setExchange] = useState(0)
  const [companyName, setCompanyName] = useState('')
  const [lots, setLots] = useState('')
  const [price, setPrice] = useState('')
  const [txDate, setTxDate] = useState(todayISO())

  const [expandedTicker, setExpandedTicker] = useState<string | null>(null)
  const [expandTab, setExpandTab] = useState<ExpandTab>('buy')
  const [editLots, setEditLots] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editDate, setEditDate] = useState(todayISO())
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const fetchPrices = async (tickers: string[]) => {
    try {
      const res = await fetch(`/api/stocks?tickers=${tickers.join(',')}`)
      setPriceData(await res.json())
    } catch {}
  }

  const fetchTransactions = async () => {
    const { data } = await supabase
      .from('portfolio_transactions')
      .select('*')
      .order('transaction_date', { ascending: true })
    const items = (data || []) as PortfolioTransaction[]
    setTransactions(items)
    setLoading(false)
    const tickers = Array.from(new Set(items.map(t => t.ticker)))
    if (tickers.length > 0) fetchPrices(tickers)
  }

  useEffect(() => { fetchTransactions() }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!ticker.trim() || !lots || !price || !txDate) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const sel = EXCHANGES[exchange]
    let full = ticker.trim().toUpperCase()
    if (sel.suffix !== '__custom__') full = full.replace(/\.[A-Z]+$/, '') + sel.suffix
    const currency = defaultCurrencyFor(full)
    const rate = await fetchEurRate(txDate, currency)
    if (rate == null) {
      setSaving(false)
      setFormError(`${txDate} tarihindeki EUR kuru alınamadı. Tarihi kontrol et.`)
      return
    }
    const { error } = await supabase.from('portfolio_transactions').insert({
      user_id: user!.id,
      ticker: full,
      company_name: companyName.trim() || null,
      type: 'buy' as TransactionType,
      lots: parseFloat(lots),
      price_per_lot: parseFloat(price),
      currency,
      eur_rate: rate,
      transaction_date: txDate,
    })
    setSaving(false)
    if (error) { setFormError(error.message); return }
    setTicker(''); setCompanyName(''); setLots(''); setPrice(''); setTxDate(todayISO())
    setShowForm(false)
    fetchTransactions()
  }

  const handleAddTransaction = async (h: Holding, type: TransactionType) => {
    setEditError(null)
    const lotsN = parseFloat(editLots)
    const priceN = parseFloat(editPrice)
    if (!lotsN || lotsN <= 0 || !priceN || priceN < 0 || !editDate) {
      setEditError('Lot, fiyat ve tarih zorunlu')
      return
    }
    if (type === 'sell' && lotsN > h.totalLots) {
      setEditError(`Mevcut lot (${h.totalLots}) yetersiz`)
      return
    }
    setEditSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const rate = await fetchEurRate(editDate, h.currency)
    if (rate == null) {
      setEditSaving(false)
      setEditError(`${editDate} tarihindeki EUR kuru alınamadı`)
      return
    }
    const { error } = await supabase.from('portfolio_transactions').insert({
      user_id: user!.id,
      ticker: h.ticker,
      company_name: h.company_name,
      type,
      lots: lotsN,
      price_per_lot: priceN,
      currency: h.currency,
      eur_rate: rate,
      transaction_date: editDate,
    })
    setEditSaving(false)
    if (error) { setEditError(error.message); return }
    setEditLots(''); setEditPrice(''); setEditDate(todayISO())
    fetchTransactions()
  }

  const handleDeleteTx = async (id: string) => {
    await supabase.from('portfolio_transactions').delete().eq('id', id)
    fetchTransactions()
  }

  const holdings = computeHoldings(transactions, priceData)
    .filter(h => h.totalLots > 0 || h.transactions.length > 0)

  const visibleHoldings = holdings.filter(h => h.totalLots > 0)
  visibleHoldings.sort((a, b) => (b.currentValueEUR || 0) - (a.currentValueEUR || 0))

  const summary = computeSummary(visibleHoldings, transactions)
  const totalTRY = priceData.rates.EURTRY > 0 ? summary.currentValueEUR * priceData.rates.EURTRY : 0

  // Para birimi grupları (sadece pozitif lot)
  const byCurrency: Record<string, { localTotal: number; eurTotal: number }> = {}
  visibleHoldings.forEach(h => {
    if (h.currentValueLocal == null || h.currentValueEUR == null) return
    if (!byCurrency[h.currency]) byCurrency[h.currency] = { localTotal: 0, eurTotal: 0 }
    byCurrency[h.currency].localTotal += h.currentValueLocal
    byCurrency[h.currency].eurTotal += h.currentValueEUR
  })

  // Borsa grupları
  const groups: { key: string; label: string; flag: string; items: Holding[]; groupEUR: number }[] = []
  const groupMap: Record<string, number> = {}
  visibleHoldings.forEach(h => {
    const { label, flag } = getExchangeInfo(h.ticker)
    if (groupMap[label] === undefined) {
      groupMap[label] = groups.length
      groups.push({ key: label, label, flag, items: [], groupEUR: 0 })
    }
    groups[groupMap[label]].items.push(h)
    if (h.currentValueEUR != null) groups[groupMap[label]].groupEUR += h.currentValueEUR
  })

  const pnlColor = (v: number | null) => {
    if (v == null) return 'text-zinc-400'
    if (v > 0) return 'text-green-400'
    if (v < 0) return 'text-red-400'
    return 'text-zinc-400'
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header title="Portföy" />
      <main className="max-w-md mx-auto pt-14 pb-20 px-4">
        {/* Özet */}
        <div className="bg-purple-700 rounded-2xl p-5 my-4 text-white">
          <div className="flex items-center justify-between mb-1">
            <p className="text-purple-100 text-sm">Toplam Portföy Değeri</p>
            <button
              onClick={async () => {
                setRefreshing(true)
                const tickers = Array.from(new Set(transactions.map(t => t.ticker)))
                await fetchPrices(tickers)
                setRefreshing(false)
              }}
              className="p-1 text-purple-200"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
          <p className="text-3xl font-bold">{formatEUR(summary.currentValueEUR)}</p>
          {totalTRY > 0 && (
            <p className="text-purple-100 text-3xl font-bold mt-1">≈ {formatTRY(totalTRY)}</p>
          )}

          {/* Yatırım & K/Z & XIRR */}
          <div className="mt-3 pt-3 border-t border-purple-600 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-purple-200">Yatırılan (net):</span>
              <span className="font-medium">{formatEUR(summary.netInvestedEUR)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-purple-200">Toplam K/Z:</span>
              <span className={`font-semibold ${summary.pnlEUR >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                {formatSignedEUR(summary.pnlEUR)} ({formatPct(summary.pnlPct)})
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-purple-200">XIRR (yıllık):</span>
              <span className={`font-semibold ${summary.xirr == null ? 'text-purple-100' : summary.xirr >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                {summary.xirr == null ? '—' : formatPct(summary.xirr * 100)}
              </span>
            </div>
          </div>

          {/* Para birimi grupları */}
          {Object.keys(byCurrency).length > 0 && (
            <div className="mt-3 pt-3 border-t border-purple-600 space-y-1">
              {Object.entries(byCurrency).map(([currency, g]) => (
                <div key={currency} className="flex justify-between text-sm">
                  <span className="text-purple-200">{currency} toplam:</span>
                  <span className="text-white font-medium">
                    {formatLocal(g.localTotal, currency)}
                    {currency !== 'EUR' && g.eurTotal > 0 && (
                      <span className="text-purple-300 text-xs ml-1">= {formatEUR(g.eurTotal)}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}

          {priceData.rates.EURTRY > 0 && (
            <p className="text-purple-300 text-xs mt-2">
              1€ = {priceData.rates.EURTRY.toFixed(2)} ₺
              {priceData.rates.EURUSD > 0 && ` · 1€ = ${priceData.rates.EURUSD.toFixed(3)} $`}
              {priceData.rates.EURGBP > 0 && ` · 1€ = ${priceData.rates.EURGBP.toFixed(3)} £`}
            </p>
          )}
        </div>

        {/* Yeni hisse formu */}
        {showForm ? (
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 mb-4">
            <h2 className="font-semibold text-white mb-4">Yeni Hisse Alımı</h2>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-zinc-300 mb-1 block">Borsa</label>
                <select value={exchange} onChange={e => setExchange(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-800 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-base">
                  {EXCHANGES.map((ex, i) => <option key={i} value={i}>{ex.label}</option>)}
                </select>
                <p className="text-xs text-zinc-500 mt-1">Örn: {EXCHANGES[exchange].hint}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-300 mb-1 block">
                  Hisse Kodu
                  {EXCHANGES[exchange].suffix && EXCHANGES[exchange].suffix !== '__custom__' && (
                    <span className="text-zinc-500 font-normal text-xs ml-1">({EXCHANGES[exchange].suffix} otomatik eklenir)</span>
                  )}
                </label>
                <input type="text" value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())}
                  placeholder={EXCHANGES[exchange].hint.split(',')[0].trim()}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-base uppercase" required />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-300 mb-1 block">Şirket Adı (opsiyonel)</label>
                <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Örn: ASML Holding"
                  className="w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-base" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-zinc-300 mb-1 block">Lot</label>
                  <input type="number" value={lots} onChange={e => setLots(e.target.value)} placeholder="0"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-base" required inputMode="decimal" step="any" />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-300 mb-1 block">
                    Alış Fiyatı <span className="text-zinc-500 font-normal text-xs">({defaultCurrencyFor(ticker.trim() ? (EXCHANGES[exchange].suffix === '__custom__' ? ticker : ticker.replace(/\.[A-Z]+$/, '') + EXCHANGES[exchange].suffix) : '')})</span>
                  </label>
                  <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-base" required inputMode="decimal" step="any" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-300 mb-1 block">Alış Tarihi</label>
                <input type="date" value={txDate} onChange={e => setTxDate(e.target.value)} max={todayISO()}
                  className="w-full max-w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-800 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-base box-border" required />
              </div>
              {formError && <p className="text-xs text-red-400">{formError}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowForm(false); setFormError(null) }} className="flex-1 py-3 rounded-xl border border-zinc-700 text-zinc-300 font-medium">İptal</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 bg-purple-600 text-white font-semibold rounded-xl disabled:opacity-50">{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
              </div>
            </form>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)} className="w-full py-3.5 bg-purple-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 mb-4">
            <Plus size={20} /> Hisse Ekle
          </button>
        )}

        {/* Hisse listesi */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <h2 className="font-semibold text-white">Hisselerim</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-zinc-500 text-sm">Yükleniyor...</div>
          ) : visibleHoldings.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-sm">Henüz hisse eklenmedi</div>
          ) : (
            <div>
              {groups.map((group, gi) => {
                const isOpen = !collapsedGroups.has(group.key)
                return (
                <div key={group.key}>
                  <button
                    onClick={() => toggleGroup(group.key)}
                    className={`w-full flex items-center justify-between px-4 py-3 bg-zinc-800 active:bg-zinc-700 transition-colors ${gi > 0 ? 'border-t border-zinc-700' : ''}`}
                  >
                    <span className="text-sm font-semibold text-zinc-300">{group.flag} {group.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-purple-400">{formatEUR(group.groupEUR)}</span>
                      <ChevronDown size={16} className={`text-zinc-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`} />
                    </div>
                  </button>

                  <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <div className="overflow-hidden">
                      {group.items.map((h, i) => {
                        const isExpanded = expandedTicker === h.ticker
                        return (
                          <div key={h.ticker} className={i < group.items.length - 1 ? 'border-b border-zinc-800' : ''}>
                            <div
                              className="flex items-start justify-between px-4 py-3.5 active:bg-zinc-800 cursor-pointer"
                              onClick={() => {
                                if (isExpanded) setExpandedTicker(null)
                                else {
                                  setExpandedTicker(h.ticker)
                                  setExpandTab('buy')
                                  setEditLots(''); setEditPrice(''); setEditDate(todayISO())
                                  setEditError(null)
                                }
                              }}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-white">{displayTicker(h.ticker)}</span>
                                  <span className="text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">{h.totalLots} lot</span>
                                  <span className="text-xs text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">{h.currency}</span>
                                </div>
                                {h.company_name && <p className="text-xs text-zinc-500 mt-0.5 truncate">{h.company_name}</p>}
                                {h.currentPrice != null
                                  ? <p className="text-xs text-zinc-400 mt-0.5">{h.currentPrice.toFixed(2)} {h.currency} / adet</p>
                                  : <p className="text-xs text-zinc-600 mt-0.5">Fiyat alınıyor...</p>}
                                {h.pnlPct != null && (
                                  <p className={`text-xs mt-1 flex items-center gap-1 ${pnlColor(h.pnlEUR)}`}>
                                    {h.pnlEUR != null && h.pnlEUR >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                    <span className="font-semibold">{formatPct(h.pnlPct)}</span>
                                    <span className="text-zinc-500">·</span>
                                    <span>{formatSignedEUR(h.pnlEUR)}</span>
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 ml-2">
                                <div className="text-right">
                                  {h.currentValueLocal != null && (
                                    <p className="text-sm font-bold text-white">{formatLocal(h.currentValueLocal, h.currency)}</p>
                                  )}
                                  {h.currentValueEUR != null && h.currency !== 'EUR' && (
                                    <p className="text-xs text-purple-400">= {formatEUR(h.currentValueEUR)}</p>
                                  )}
                                  {h.currentValueEUR != null && h.currency === 'EUR' && (
                                    <p className="text-sm font-bold text-purple-400">{formatEUR(h.currentValueEUR)}</p>
                                  )}
                                  {h.xirr != null && (
                                    <p className={`text-xs mt-0.5 ${pnlColor(h.xirr)}`}>
                                      XIRR {formatPct(h.xirr * 100)}
                                    </p>
                                  )}
                                </div>
                                {isExpanded
                                  ? <ChevronUp size={16} className="text-zinc-500 flex-shrink-0" />
                                  : <ChevronDown size={16} className="text-zinc-500 flex-shrink-0" />}
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="px-4 pb-4 bg-zinc-800/50">
                                <div className="pt-3 border-t border-zinc-700 space-y-2">
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="bg-zinc-900 rounded-lg p-2">
                                      <p className="text-zinc-500">Ort. maliyet</p>
                                      <p className="text-white font-semibold mt-0.5">
                                        {h.avgCostLocal != null ? `${h.avgCostLocal.toFixed(2)} ${h.currency}` : '—'}
                                      </p>
                                      {h.avgCostEUR != null && h.currency !== 'EUR' && (
                                        <p className="text-purple-400 text-[10px]">≈ {formatEUR(h.avgCostEUR)}</p>
                                      )}
                                    </div>
                                    <div className="bg-zinc-900 rounded-lg p-2">
                                      <p className="text-zinc-500">Net yatırılan</p>
                                      <p className="text-white font-semibold mt-0.5">{formatEUR(h.netInvestedEUR)}</p>
                                      {h.totalSoldEUR > 0 && (
                                        <p className="text-zinc-500 text-[10px]">satış: {formatEUR(h.totalSoldEUR)}</p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex gap-2">
                                    {(['buy', 'sell', 'history'] as ExpandTab[]).map(t => (
                                      <button key={t} onClick={() => { setExpandTab(t); setEditError(null) }}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${
                                          expandTab === t
                                            ? t === 'buy' ? 'bg-green-600 text-white' : t === 'sell' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
                                            : 'bg-zinc-700 text-zinc-400'
                                        }`}>
                                        {t === 'buy' ? '+ Alım' : t === 'sell' ? '− Satış' : <><History size={12} /> Geçmiş</>}
                                      </button>
                                    ))}
                                  </div>

                                  {(expandTab === 'buy' || expandTab === 'sell') && (
                                    <div className="space-y-2">
                                      <div className="grid grid-cols-2 gap-2">
                                        <input type="number" value={editLots} onChange={e => setEditLots(e.target.value)} placeholder="Lot"
                                          className="px-3 py-2.5 rounded-xl border border-zinc-600 bg-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" inputMode="decimal" step="any" />
                                        <input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} placeholder={`Fiyat (${h.currency})`}
                                          className="px-3 py-2.5 rounded-xl border border-zinc-600 bg-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm" inputMode="decimal" step="any" />
                                      </div>
                                      <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} max={todayISO()}
                                        className="w-full max-w-full px-3 py-2.5 rounded-xl border border-zinc-600 bg-zinc-800 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm box-border" />
                                      {editError && <p className="text-xs text-red-400">{editError}</p>}
                                      <button
                                        onClick={() => handleAddTransaction(h, expandTab)}
                                        disabled={editSaving}
                                        className={`w-full py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-40 ${expandTab === 'buy' ? 'bg-green-600' : 'bg-red-600'}`}
                                      >
                                        {editSaving ? 'Kaydediliyor...' : expandTab === 'buy' ? 'Alımı Kaydet' : 'Satışı Kaydet'}
                                      </button>
                                    </div>
                                  )}

                                  {expandTab === 'history' && (
                                    <div className="space-y-1.5 max-h-64 overflow-y-auto">
                                      {h.transactions.map(tx => (
                                        <div key={tx.id} className="flex items-center justify-between bg-zinc-900 rounded-lg px-2.5 py-2 text-xs">
                                          <div>
                                            <span className={`font-semibold ${tx.type === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                                              {tx.type === 'buy' ? 'Alım' : 'Satış'}
                                            </span>
                                            <span className="text-zinc-500 ml-2">{tx.transaction_date}</span>
                                            <p className="text-zinc-400 mt-0.5">
                                              {tx.lots} × {Number(tx.price_per_lot).toFixed(2)} {tx.currency}
                                              <span className="text-zinc-600 ml-1">
                                                = {formatLocal(Number(tx.lots) * Number(tx.price_per_lot), tx.currency)}
                                              </span>
                                            </p>
                                          </div>
                                          <button onClick={() => handleDeleteTx(tx.id)} className="p-1.5 rounded-lg bg-zinc-800 text-red-400 active:bg-zinc-700">
                                            <Trash2 size={14} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
                )
              })}
            </div>
          )}
        </div>
        <p className="text-xs text-center text-zinc-600 mt-4">Fiyatlar Yahoo Finance · 5 dk gecikme olabilir</p>
      </main>
      <BottomNav />
    </div>
  )
}
