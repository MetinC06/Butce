'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'
import Header from '@/components/Header'
import { Plus, Trash2 } from 'lucide-react'
import { ExpenseCategory } from '@/types/database'

const ICONS = ['🛒','⛽','🏠','💡','🍽️','🏥','🚌','🎬','👕','📚','🚗','🏋️','✈️','🎁','💊','🐾','🔧','📱','☕','🍕','🎮','📦','💈','🏖️','🎵','🍼','🌿','🚿','🧹','💰','🏦','🎯','🎪','🛺','🛵']

export default function KategorilerPage() {
  const supabase = createClient()
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('💰')

  const fetchCategories = async () => {
    const { data } = await supabase.from('expense_categories').select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true })
    setCategories(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchCategories() }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('expense_categories').insert({ name: name.trim(), icon, color: '#6b7280', is_default: false, created_by: user!.id })
    setName(''); setIcon('💰'); setShowForm(false); setSaving(false)
    fetchCategories()
  }

  const handleDelete = async (cat: ExpenseCategory) => {
    await supabase.from('expense_categories').delete().eq('id', cat.id)
    setCategories(prev => prev.filter(c => c.id !== cat.id))
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header title="Kategoriler" />
      <main className="max-w-md mx-auto pt-14 pb-20 px-4">
        <div className="py-4">
          {showForm ? (
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 mb-4">
              <h2 className="font-semibold text-white mb-4">Yeni Kategori</h2>
              <form onSubmit={handleAdd} className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-zinc-300 mb-1 block">Kategori Adı</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Örn: Otopark"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500 text-base" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-300 mb-2 block">İkon Seç</label>
                  <div className="grid grid-cols-8 gap-2">
                    {ICONS.map(ic => (
                      <button key={ic} type="button" onClick={() => setIcon(ic)}
                        className={`text-2xl py-1.5 rounded-lg ${icon === ic ? 'bg-green-900 ring-2 ring-green-500' : 'bg-zinc-800'}`}>
                        {ic}
                      </button>
                    ))}
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
              <Plus size={20} /> Yeni Kategori Ekle
            </button>
          )}

          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800">
              <h2 className="font-semibold text-white">Tüm Kategoriler ({categories.length})</h2>
            </div>
            {loading ? (
              <div className="p-8 text-center text-zinc-500 text-sm">Yükleniyor...</div>
            ) : (
              <div>
                {categories.map((cat, i) => (
                  <div key={cat.id} className={`flex items-center justify-between px-4 py-3.5 ${i < categories.length - 1 ? 'border-b border-zinc-800' : ''}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{cat.icon}</span>
                      <div>
                        <p className="font-medium text-white">{cat.name}</p>
                        {cat.is_default && <span className="text-xs text-zinc-500">Varsayılan</span>}
                      </div>
                    </div>
                    <button onClick={() => handleDelete(cat)} className="p-1.5 text-zinc-700 active:text-red-400"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
