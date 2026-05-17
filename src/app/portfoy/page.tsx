'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'
import Header from '@/components/Header'
import { Plus, Trash2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { PortfolioItem } from '@/types/database'

function formatEUR(amount: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(amount)
}
function formatTRY(amount: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(amount)
}
function formatUSD(amount: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(amount)
}
function formatLocal(amount: number, currency: string) {
  if (currency === 'TRY') return formatTRY(amount)
  if (currency === 'USD') return formatUSD(amount)
  return formatEUR(amount)
}
function toEUR(amount: number, currency: string, rates: { EURTRY: number; EURUSD: number }) {
  if (currency === 'EUR') return amount
  if (currency === 'TRY' && rates.EURTRY > 0) return amount / rates.EURTRY
  if (currency === 'USD' && rates.EURUSD > 0) return amount / rates.EURUSD
  return amount
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

const EXCHANGES = [
  { label: '🇹🇷 BIST (Türkiye)', suffix: '.IS', hint: 'THYAO, ASELS' },
  { label: '🇳🇱 AEX (Amsterdam)', suffix: '.AS', hint: 'ASML, ADYEN' },
  { label: '🇺🇸 NYSE / NASDAQ (ABD)', suffix: '', hint: 'AAPL, MSFT, TSLA' },
  { label: '🇬🇧 LSE (Londra)', suffix: '.L', hint: 'SHEL, HSBA' },
  { label: '🇩🇪 Frankfurt (XETRA)', suffix: '.DE', hint: 'SAP, BMW' },
  { label: '🇫🇷 Paris (Euronext)', suffix: '.PA', hint: 'LVMH, TTE' },
  { label: '🌐 Tam kod gir', suffix: '__custom__', hint: 'TICKER.XX formatında' },
]

type PriceData = { prices: Record<string, number>; currencies: Record<string, string>; rates: { EURTRY: number; EURUSD: number } }
type EditMode = 'ekle' | 'cikar' | 'toplam'

export default function PortfoyPage() {
  const supabase = createClient()
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([])
  const [priceData, setPriceData] = useState<PriceData>({ prices: {}, currencies: {}, rates: { EURTRY: 0, EURUSD: 0 } })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // Yeni hisse formu
  const [ticker, setTicker] = useState('')
  const [exchange, setExchange] = useState(0)
  const [companyName, setCompanyName] = useState('')
  const [lots, setLots] = useState('')

  // Düzenleme
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }
  const [editMode, setEditMode] = useState<EditMode>('ekle')
  const [editAmount, setEditAmount] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  const fetchPortfolio = async () => {
    const { data } = await supabase.from('portfolio').select('*').order('ticker')
    const items = data || []
    setPortfolio(items)
    setLoading(false)
    if (items.length > 0) fetchPrices(items)
  }

  const fetchPrices = async (items: PortfolioItem[]) => {
    const tickers = items.map(p => p.ticker).join(',')
    try {
      const res = await fetch(`/api/stocks?tickers=${tickers}`)
      setPriceData(await res.json())
    } catch {}
  }

  useEffect(() => { fetchPortfolio() }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticker.trim() || !lots) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const sel = EXCHANGES[exchange]
    let full = ticker.trim().toUpperCase()
    if (sel.suffix !== '__custom__') full = full.replace(/\.[A-Z]+$/, '') + sel.suffix
    await supabase.from('portfolio').upsert(
      { user_id: user!.id, ticker: full, company_name: companyName.trim() || null, lots: parseFloat(lots) },
      { onConflict: 'user_id,ticker' }
    )
    setTicker(''); setCompanyName(''); setLots(''); setShowForm(false); setSaving(false)
    fetchPortfolio()
  }

  const handleEditLots = async (item: PortfolioItem) => {
    const amount = parseFloat(editAmount)
    if (isNaN(amount) || amount <= 0) return
    setEditSaving(true)
    let newLots = Number(item.lots)
    if (editMode === 'ekle') newLots += amount
    else if (editMode === 'cikar') newLots = Math.max(0, newLots - amount)
    else newLots = amount

    if (newLots <= 0) {
      await supabase.from('portfolio').delete().eq('id', item.id)
    } else {
      await supabase.from('portfolio').update({ lots: newLots }).eq('id', item.id)
    }
    setEditSaving(false)
    setExpandedId(null)
    setEditAmount('')
    fetchPortfolio()
  }

  const handleDelete = async (id: string) => {
    await supabase.from('portfolio').delete().eq('id', id)
    setPortfolio(prev => prev.filter(p => p.id !== id))
  }

  const calcNewLots = (item: PortfolioItem) => {
    const a = parseFloat(editAmount) || 0
    if (editMode === 'ekle') return Number(item.lots) + a
    if (editMode === 'cikar') return Math.max(0, Number(item.lots) - a)
    return a
  }

  // Toplam hesaplama: önce kendi para biriminde topla, sonra EUR'a çevir
  const byGroup: Record<string, { localTotal: number; eurTotal: number }> = {}
  let grandTotalEUR = 0

  portfolio.forEach(p => {
    const price = priceData.prices[p.ticker] || 0
    const currency = priceData.currencies[p.ticker] || 'EUR'
    const localValue = price * Number(p.lots)
    const eurValue = toEUR(localValue, currency, priceData.rates)
    if (!byGroup[currency]) byGroup[currency] = { localTotal: 0, eurTotal: 0 }
    byGroup[currency].localTotal += localValue
    byGroup[currency].eurTotal += eurValue
    grandTotalEUR += eurValue
  })

  const totalTRY = priceData.rates.EURTRY > 0 ? grandTotalEUR * priceData.rates.EURTRY : 0

  // Borsalara göre grupla, her grup kendi içinde EUR değerine göre sıralı
  const sortedPortfolio = [...portfolio].sort((a, b) => {
    const priceA = priceData.prices[a.ticker] || 0
    const priceB = priceData.prices[b.ticker] || 0
    const curA = priceData.currencies[a.ticker] || 'EUR'
    const curB = priceData.currencies[b.ticker] || 'EUR'
    const eurA = toEUR(priceA * Number(a.lots), curA, priceData.rates)
    const eurB = toEUR(priceB * Number(b.lots), curB, priceData.rates)
    return eurB - eurA
  })

  // Borsa gruplarını oluştur (sıralı liste üzerinden, sıra korunur)
  const groups: { key: string; label: string; flag: string; items: PortfolioItem[]; groupEUR: number }[] = []
  const groupMap: Record<string, number> = {}
  sortedPortfolio.forEach(item => {
    const { label, flag } = getExchangeInfo(item.ticker)
    const key = label
    const price = priceData.prices[item.ticker] || 0
    const currency = priceData.currencies[item.ticker] || 'EUR'
    const eurVal = toEUR(price * Number(item.lots), currency, priceData.rates)
    if (groupMap[key] === undefined) {
      groupMap[key] = groups.length
      groups.push({ key, label, flag, items: [], groupEUR: 0 })
    }
    groups[groupMap[key]].items.push(item)
    groups[groupMap[key]].groupEUR += eurVal
  })

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header title="Portföy" />
      <main className="max-w-md mx-auto pt-14 pb-20 px-4">
        {/* Özet */}
        <div className="bg-purple-700 rounded-2xl p-5 my-4 text-white">
          <div className="flex items-center justify-between mb-1">
            <p className="text-purple-100 text-sm">Toplam Portföy Değeri</p>
            <button onClick={async () => { setRefreshing(true); await fetchPrices(portfolio); setRefreshing(false) }} className="p-1 text-purple-200">
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
          <p className="text-3xl font-bold">{formatEUR(grandTotalEUR)}</p>
          {totalTRY > 0 && (
            <p className="text-purple-100 text-3xl font-bold mt-1">≈ {formatTRY(totalTRY)}</p>
          )}
          {/* Para birimi grupları */}
          {Object.keys(byGroup).length > 0 && (
            <div className="mt-3 pt-3 border-t border-purple-600 space-y-1">
              {Object.entries(byGroup).map(([currency, g]) => (
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
            </p>
          )}
        </div>

        {/* Yeni hisse formu */}
        {showForm ? (
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 mb-4">
            <h2 className="font-semibold text-white mb-4">Hisse Ekle</h2>
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
              <div>
                <label className="text-sm font-medium text-zinc-300 mb-1 block">Lot / Adet</label>
                <input type="number" value={lots} onChange={e => setLots(e.target.value)} placeholder="0"
                  className="w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-base" required inputMode="decimal" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl border border-zinc-700 text-zinc-300 font-medium">İptal</button>
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
          ) : portfolio.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-sm">Henüz hisse eklenmedi</div>
          ) : (
            <div>
              {groups.map((group, gi) => {
                const isOpen = !collapsedGroups.has(group.key)
                return (
                <div key={group.key}>
                  {/* Borsa başlığı */}
                  <button
                    onClick={() => toggleGroup(group.key)}
                    className={`w-full flex items-center justify-between px-4 py-3 bg-zinc-800 active:bg-zinc-700 transition-colors ${gi > 0 ? 'border-t border-zinc-700' : ''}`}
                  >
                    <span className="text-sm font-semibold text-zinc-300">{group.flag} {group.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-purple-400">{formatEUR(group.groupEUR)}</span>
                      <ChevronDown
                        size={16}
                        className={`text-zinc-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
                      />
                    </div>
                  </button>

                  {/* Animasyonlu içerik */}
                  <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <div className="overflow-hidden">
                  {/* Grup hisseleri */}
                  {group.items.map((item, i) => {
                    const price = priceData.prices[item.ticker]
                    const currency = priceData.currencies[item.ticker] || '?'
                    const localValue = price ? price * Number(item.lots) : null
                    const eurValue = localValue !== null ? toEUR(localValue, currency, priceData.rates) : null
                    const isExpanded = expandedId === item.id

                    return (
                      <div key={item.id} className={i < group.items.length - 1 ? 'border-b border-zinc-800' : ''}>
                        <div
                          className="flex items-start justify-between px-4 py-3.5 active:bg-zinc-800 cursor-pointer"
                          onClick={() => {
                            if (isExpanded) { setExpandedId(null) }
                            else { setExpandedId(item.id); setEditMode('ekle'); setEditAmount('') }
                          }}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">{displayTicker(item.ticker)}</span>
                              <span className="text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">{item.lots} lot</span>
                              {currency !== '?' && <span className="text-xs text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">{currency}</span>}
                            </div>
                            {item.company_name && <p className="text-xs text-zinc-500 mt-0.5">{item.company_name}</p>}
                            {price
                              ? <p className="text-xs text-zinc-400 mt-0.5">{price.toFixed(2)} {currency} / adet</p>
                              : <p className="text-xs text-zinc-600 mt-0.5">Fiyat alınıyor...</p>}
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <div className="text-right">
                              {localValue !== null && (
                                <p className="text-sm font-bold text-white">{formatLocal(localValue, currency)}</p>
                              )}
                              {eurValue !== null && currency !== 'EUR' && (
                                <p className="text-xs text-purple-400">= {formatEUR(eurValue)}</p>
                              )}
                              {eurValue !== null && currency === 'EUR' && (
                                <p className="text-sm font-bold text-purple-400">{formatEUR(eurValue)}</p>
                              )}
                            </div>
                            {isExpanded
                              ? <ChevronUp size={16} className="text-zinc-500 flex-shrink-0" />
                              : <ChevronDown size={16} className="text-zinc-500 flex-shrink-0" />}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-4 pb-4 bg-zinc-800/50">
                            <div className="pt-3 border-t border-zinc-700">
                              <p className="text-xs text-zinc-400 mb-2">Mevcut: <span className="text-white font-medium">{item.lots} lot</span></p>
                              <div className="flex gap-2 mb-3">
                                {(['ekle', 'cikar', 'toplam'] as EditMode[]).map(m => (
                                  <button key={m} onClick={() => { setEditMode(m); setEditAmount('') }}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                      editMode === m
                                        ? m === 'ekle' ? 'bg-green-600 text-white' : m === 'cikar' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
                                        : 'bg-zinc-700 text-zinc-400'
                                    }`}>
                                    {m === 'ekle' ? '+ Ekle' : m === 'cikar' ? '− Çıkar' : 'Yeni Toplam'}
                                  </button>
                                ))}
                              </div>
                              <input
                                type="number"
                                value={editAmount}
                                onChange={e => setEditAmount(e.target.value)}
                                placeholder={editMode === 'toplam' ? 'Yeni toplam lot sayısı' : 'Lot miktarı'}
                                className="w-full px-3 py-2.5 rounded-xl border border-zinc-600 bg-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm mb-2"
                                inputMode="decimal"
                              />
                              {editAmount && parseFloat(editAmount) > 0 && (
                                <p className="text-xs text-zinc-400 mb-3">
                                  → Yeni toplam: <span className="text-white font-semibold">{calcNewLots(item)} lot</span>
                                  {calcNewLots(item) <= 0 && <span className="text-red-400 ml-1">(hisse portföyden silinecek)</span>}
                                </p>
                              )}
                              <div className="flex gap-2">
                                <button onClick={() => setExpandedId(null)} className="flex-1 py-2 rounded-xl border border-zinc-600 text-zinc-300 text-sm font-medium">İptal</button>
                                <button
                                  onClick={() => handleEditLots(item)}
                                  disabled={editSaving || !editAmount || parseFloat(editAmount) <= 0}
                                  className="flex-1 py-2 rounded-xl bg-purple-600 text-white text-sm font-semibold disabled:opacity-40"
                                >
                                  {editSaving ? 'Kaydediliyor...' : 'Kaydet'}
                                </button>
                                <button onClick={() => handleDelete(item.id)} className="py-2 px-3 rounded-xl bg-zinc-700 text-red-400">
                                  <Trash2 size={16} />
                                </button>
                              </div>
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
