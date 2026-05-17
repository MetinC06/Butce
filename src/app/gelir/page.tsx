'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'
import Header from '@/components/Header'
import { Plus, Trash2 } from 'lucide-react'
import { Income } from '@/types/database'

function formatEUR(amount: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
}

export default function GelirPage() {
  const supabase = createClient()
  const [incomes, setIncomes] = useState<Income[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  const now = new Date()
  const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  const fetchIncomes = async () => {
    const { data } = await supabase.from('incomes').select('*').gte('date', start).lte('date', end).order('date', { ascending: false })
    setIncomes(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchIncomes() }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('incomes').insert({ user_id: user!.id, amount: parseFloat(amount), description: description || null, date })
    setAmount(''); setDescription(''); setDate(new Date().toISOString().split('T')[0]); setShowForm(false); setSaving(false)
    fetchIncomes()
  }

  const handleDelete = async (id: string) => {
    await supabase.from('incomes').delete().eq('id', id)
    setIncomes(prev => prev.filter(i => i.id !== id))
  }

  const total = incomes.reduce((s, i) => s + Number(i.amount), 0)

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header title="Gelir" />
      <main className="max-w-md mx-auto pt-14 pb-20 px-4">
        <div className="bg-green-600 rounded-2xl p-5 my-4 text-white">
          <p className="text-green-100 text-sm mb-1">Bu Ay Toplam Gelir</p>
          <p className="text-3xl font-bold">{formatEUR(total)}</p>
          <p className="text-green-200 text-xs mt-1">{incomes.length} gelir kaydı</p>
        </div>

        {showForm ? (
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 mb-4">
            <h2 className="font-semibold text-white mb-4">Gelir Ekle</h2>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-zinc-300 mb-1 block">Tutar (€)</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
                  className="w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500 text-base"
                  required inputMode="decimal" />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-300 mb-1 block">Açıklama (opsiyonel)</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Maaş, prim, vs."
                  className="w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500 text-base" />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-300 mb-1 block">Tarih</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full min-w-0 max-w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-800 text-white focus:outline-none focus:ring-2 focus:ring-green-500 text-base appearance-none" />
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
          <div className="px-4 py-3 border-b border-zinc-800">
            <h2 className="font-semibold text-white">Bu Ay Gelirler</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-zinc-500 text-sm">Yükleniyor...</div>
          ) : incomes.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-sm">Bu ay gelir kaydı yok</div>
          ) : (
            <div>
              {incomes.map((income, i) => (
                <div key={income.id} className={`flex items-center justify-between px-4 py-3.5 ${i < incomes.length - 1 ? 'border-b border-zinc-800' : ''}`}>
                  <div>
                    <p className="font-medium text-white">{income.description || 'Gelir'}</p>
                    <p className="text-xs text-zinc-500">{new Date(income.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-green-400">{formatEUR(Number(income.amount))}</span>
                    <button onClick={() => handleDelete(income.id)} className="p-1.5 text-zinc-700 active:text-red-400"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
