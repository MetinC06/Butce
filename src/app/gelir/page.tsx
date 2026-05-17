'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'
import Header from '@/components/Header'
import { Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Income } from '@/types/database'
import { SkeletonList } from '@/components/Skeleton'
import CountUp from '@/components/CountUp'

function formatEUR(amount: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
}
function getMonthName(year: number, month: number) {
  return new Date(year, month - 1).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
}
function parseAmount(val: string) {
  const cleaned = val.trim().replace(/[^\d,.-]/g, '')
  const lastComma = cleaned.lastIndexOf(',')
  const lastPeriod = cleaned.lastIndexOf('.')
  const normalized = lastComma > lastPeriod
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned.replace(/,/g, '')
  return parseFloat(normalized) || 0
}

export default function GelirPage() {
  const supabase = createClient()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [incomes, setIncomes] = useState<Income[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(now.toISOString().split('T')[0])

  const [tab, setTab] = useState<'tumu' | 'ben' | 'esim'>('tumu')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [myName, setMyName] = useState('Ben')
  const [spouseName, setSpouseName] = useState('Eşim')

  const fetchIncomes = useCallback(async () => {
    setLoading(true)
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    const end = new Date(year, month, 0).toISOString().split('T')[0]
    const [{ data: { user } }, { data }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('incomes').select('*').gte('date', start).lte('date', end).order('date', { ascending: false }),
    ])
    setCurrentUserId(user?.id || null)
    const email = user?.email || ''
    const isMetin = email.toLowerCase() === 'metincanbek06@gmail.com'
    setMyName(isMetin ? 'Metin' : 'Simge')
    setSpouseName(isMetin ? 'Simge' : 'Metin')
    setIncomes(data || [])
    setLoading(false)
  }, [year, month])

  useEffect(() => { fetchIncomes() }, [fetchIncomes])

  const prevMonth = () => { if (month === 1) { setYear(y => y - 1); setMonth(12) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 12) { setYear(y => y + 1); setMonth(1) } else setMonth(m => m + 1) }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('incomes').insert({ user_id: user!.id, amount: parseAmount(amount), description: description || null, date })
    setAmount(''); setDescription(''); setDate(new Date().toISOString().split('T')[0]); setShowForm(false); setSaving(false)
    fetchIncomes()
  }

  const handleDelete = async (id: string) => {
    await supabase.from('incomes').delete().eq('id', id)
    setIncomes(prev => prev.filter(i => i.id !== id))
  }

  const myIncomes = incomes.filter(i => i.user_id === currentUserId)
  const spouseIncomes = incomes.filter(i => i.user_id !== currentUserId)
  const tabIncomes = tab === 'tumu' ? incomes : tab === 'ben' ? myIncomes : spouseIncomes
  const total = incomes.reduce((s, i) => s + Number(i.amount), 0)
  const myTotal = myIncomes.reduce((s, i) => s + Number(i.amount), 0)
  const spouseTotal = spouseIncomes.reduce((s, i) => s + Number(i.amount), 0)

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header title="Gelir" />
      <main className="max-w-md mx-auto pt-14 pb-20 px-4">

        <div className="flex items-center justify-between py-4">
          <button onClick={prevMonth} className="p-2 rounded-full active:bg-zinc-800"><ChevronLeft size={20} className="text-zinc-400" /></button>
          <span className="font-semibold text-white capitalize">{getMonthName(year, month)}</span>
          <button onClick={nextMonth} className="p-2 rounded-full active:bg-zinc-800"><ChevronRight size={20} className="text-zinc-400" /></button>
        </div>

        <div className="bg-green-600 rounded-2xl p-5 mb-4 text-white">
          <p className="text-green-100 text-sm mb-1">Toplam Gelir (Aile)</p>
          <p className="text-3xl font-bold"><CountUp value={total} formatter={formatEUR} /></p>
          <div className="flex gap-6 mt-3">
            <div><p className="text-green-200 text-xs">{myName}</p><p className="text-white font-bold text-sm">{formatEUR(myTotal)}</p></div>
            <div><p className="text-green-200 text-xs">{spouseName}</p><p className="text-white font-bold text-sm">{formatEUR(spouseTotal)}</p></div>
          </div>
        </div>

        {showForm ? (
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 mb-4">
            <h2 className="font-semibold text-white mb-4">Gelir Ekle</h2>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-zinc-300 mb-1 block">Tutar (€)</label>
                <input type="text" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
                  className="w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500 text-base"
                  required inputMode="decimal" autoCorrect="off" autoComplete="off" />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-300 mb-1 block">Açıklama (opsiyonel)</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Maaş, prim, vs."
                  className="w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500 text-base" />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-300 mb-1 block">Tarih</label>
                <div className="overflow-hidden rounded-xl">
                  <input type="date" value={date} onChange={e => setDate(e.target.value)}
                    className="w-full min-w-0 max-w-full px-4 py-3 border border-zinc-700 bg-zinc-800 text-white focus:outline-none focus:ring-2 focus:ring-green-500 text-base rounded-xl" />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl border border-zinc-700 text-zinc-300 font-medium">İptal</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 bg-green-600 text-white font-semibold rounded-xl disabled:opacity-50">{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
              </div>
            </form>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)} className="w-full py-3.5 bg-green-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 mb-4">
            <Plus size={20} /> Gelir Ekle
          </button>
        )}

        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
          <div className="flex border-b border-zinc-800">
            {(['tumu', 'ben', 'esim'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${tab === t ? 'text-green-400 border-b-2 border-green-400' : 'text-zinc-500'}`}>
                {t === 'tumu' ? 'Tümü' : t === 'ben' ? myName : spouseName}
              </button>
            ))}
          </div>
          {loading ? (
            <SkeletonList count={3} />
          ) : tabIncomes.length === 0 ? (
            <div className="py-10 flex flex-col items-center gap-2">
              <span className="text-4xl">💰</span>
              <p className="text-zinc-400 font-medium text-sm">Bu ay gelir kaydı yok</p>
              <p className="text-zinc-600 text-xs">Yukarıdaki butonu kullanarak gelir ekle</p>
            </div>
          ) : (
            <div>
              {tabIncomes.map((income, i) => {
                const isTransfer = income.description === 'TRANSFER_IN'
                return (
                  <div key={income.id} className={`flex items-center justify-between px-4 py-3.5 ${i < tabIncomes.length - 1 ? 'border-b border-zinc-800' : ''} ${isTransfer ? 'bg-blue-950/20' : ''}`}>
                    <div className="flex items-center gap-3">
                      {isTransfer && <span className="text-xl">💸</span>}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-white">{isTransfer ? 'Eşimden Transfer' : income.description || 'Gelir'}</p>
                          {isTransfer && <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-md font-medium">Transfer</span>}
                        </div>
                        <p className="text-xs text-zinc-500">{new Date(income.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-bold ${isTransfer ? 'text-blue-400' : 'text-green-400'}`}>{formatEUR(Number(income.amount))}</span>
                      <button onClick={() => handleDelete(income.id)} className="p-1.5 text-zinc-700 active:text-red-400"><Trash2 size={16} /></button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
