'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'
import Header from '@/components/Header'
import { Plus, Pencil, Check, X } from 'lucide-react'
import { Saving } from '@/types/database'

function formatEUR(amount: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount)
}

export default function TasarrufPage() {
  const supabase = createClient()
  const [savings, setSavings] = useState<Saving[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [balance, setBalance] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editMode, setEditMode] = useState<'ekle' | 'cikar' | 'toplam'>('ekle')

  const fetchSavings = async () => {
    const { data } = await supabase.from('savings').select('*').order('name')
    setSavings(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchSavings() }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('savings').insert({ user_id: user!.id, name: name.trim(), balance: parseFloat(balance) || 0 })
    setName(''); setBalance(''); setShowForm(false); setSaving(false)
    fetchSavings()
  }

  const handleSaveEdit = async (sv: Saving) => {
    const val = parseFloat(editAmount) || 0
    let newBalance: number
    if (editMode === 'ekle') newBalance = Number(sv.balance) + val
    else if (editMode === 'cikar') newBalance = Number(sv.balance) - val
    else newBalance = val
    await supabase.from('savings').update({ balance: newBalance, updated_at: new Date().toISOString() }).eq('id', sv.id)
    setEditId(null); setEditAmount('')
    fetchSavings()
  }

  const handleDelete = async (id: string) => {
    await supabase.from('savings').delete().eq('id', id)
    setSavings(prev => prev.filter(s => s.id !== id))
  }

  const total = savings.reduce((s, sv) => s + Number(sv.balance), 0)

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header title="Tasarruf" />
      <main className="max-w-md mx-auto pt-14 pb-20 px-4">
        <div className="bg-blue-600 rounded-2xl p-5 my-4 text-white">
          <p className="text-blue-100 text-sm mb-1">Toplam Tasarruf</p>
          <p className="text-3xl font-bold">{formatEUR(total)}</p>
          <p className="text-blue-200 text-xs mt-1">{savings.length} hesap</p>
        </div>

        {showForm ? (
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 mb-4">
            <h2 className="font-semibold text-white mb-4">Hesap Ekle</h2>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-zinc-300 mb-1 block">Hesap Adı</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Örn: Birikim Hesabı"
                  className="w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base" required />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-300 mb-1 block">Mevcut Bakiye (€)</label>
                <input type="number" value={balance} onChange={e => setBalance(e.target.value)} placeholder="0"
                  className="w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base" inputMode="decimal" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl border border-zinc-700 text-zinc-300 font-medium">İptal</button>
                <button type="submit" disabled={saving} className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl disabled:opacity-50">{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
              </div>
            </form>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)} className="w-full py-3.5 bg-blue-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 mb-4">
            <Plus size={20} /> Hesap Ekle
          </button>
        )}

        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <h2 className="font-semibold text-white">Tasarruf Hesapları</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-zinc-500 text-sm">Yükleniyor...</div>
          ) : savings.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-sm">Henüz hesap eklenmedi</div>
          ) : (
            <div>
              {savings.map((sv, i) => (
                <div key={sv.id} className={`${i < savings.length - 1 ? 'border-b border-zinc-800' : ''}`}>
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🏦</span>
                      <div>
                        <p className="font-medium text-white">{sv.name}</p>
                        <p className="text-xs text-zinc-600">Güncellendi: {new Date(sv.updated_at).toLocaleDateString('tr-TR')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-blue-400">{formatEUR(Number(sv.balance))}</span>
                      <button
                        onClick={() => { setEditId(editId === sv.id ? null : sv.id); setEditAmount(''); setEditMode('ekle') }}
                        className={`p-1.5 ${editId === sv.id ? 'text-zinc-400' : 'text-zinc-700 active:text-blue-400'}`}
                      >
                        {editId === sv.id ? <X size={16} /> : <Pencil size={15} />}
                      </button>
                    </div>
                  </div>

                  {editId === sv.id && (
                    <div className="px-4 pb-4 space-y-3">
                      <div className="flex gap-2">
                        {(['ekle', 'cikar', 'toplam'] as const).map(mode => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setEditMode(mode)}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${editMode === mode
                              ? mode === 'ekle' ? 'bg-green-600 border-green-600 text-white'
                                : mode === 'cikar' ? 'bg-red-600 border-red-600 text-white'
                                : 'bg-blue-600 border-blue-600 text-white'
                              : 'border-zinc-700 text-zinc-400'}`}
                          >
                            {mode === 'ekle' ? '+ Ekle' : mode === 'cikar' ? '− Çıkar' : '= Yeni Toplam'}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={editAmount}
                          onChange={e => setEditAmount(e.target.value)}
                          placeholder="Tutar (€)"
                          className="flex-1 px-3 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          inputMode="decimal"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveEdit(sv)}
                          disabled={!editAmount}
                          className="px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl disabled:opacity-40 flex items-center gap-1"
                        >
                          <Check size={16} /> Kaydet
                        </button>
                      </div>
                      {editAmount && (
                        <p className="text-xs text-zinc-500 text-right">
                          Yeni bakiye: <span className="text-white font-semibold">
                            {formatEUR(
                              editMode === 'ekle' ? Number(sv.balance) + (parseFloat(editAmount) || 0)
                              : editMode === 'cikar' ? Number(sv.balance) - (parseFloat(editAmount) || 0)
                              : parseFloat(editAmount) || 0
                            )}
                          </span>
                        </p>
                      )}
                    </div>
                  )}
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
