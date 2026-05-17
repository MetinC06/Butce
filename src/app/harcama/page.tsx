'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'
import Header from '@/components/Header'
import { Plus, Trash2, X, Pencil, Check } from 'lucide-react'
import { Expense, ExpenseCategory } from '@/types/database'

function formatEUR(amount: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
}

const ICONS = ['🛒','⛽','🏠','💡','🍽️','🏥','🚌','🎬','👕','📚','🚗','🏋️','✈️','🎁','💊','🐾','🔧','📱','☕','🍕','🎮','📦','💈','🏖️','🎵','🍼','🌿','🚿','🧹','💰','🏦','🎯','🛺','🛵','🅿️']

export default function HarcamaPage() {
  const supabase = createClient()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  // Düzenleme
  const [editId, setEditId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  // Yeni kategori mini formu
  const [showNewCat, setShowNewCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatIcon, setNewCatIcon] = useState('💰')
  const [savingCat, setSavingCat] = useState(false)

  const now = new Date()
  const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  const fetchData = async () => {
    const [{ data: exp }, { data: cats }] = await Promise.all([
      supabase.from('expenses').select('*, expense_categories(name, icon, color)').gte('date', start).lte('date', end).order('date', { ascending: false }),
      supabase.from('expense_categories').select('*').order('name'),
    ])
    setExpenses(exp || [])
    setCategories(cats || [])
    if (cats && cats.length > 0 && !categoryId) setCategoryId(cats[0].id)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || !categoryId) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('expenses').insert({ user_id: user!.id, category_id: categoryId, amount: parseFloat(amount), description: description || null, date })
    setAmount(''); setDescription(''); setDate(new Date().toISOString().split('T')[0]); setShowForm(false); setSaving(false)
    fetchData()
  }

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return
    setSavingCat(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('expense_categories').insert({
      name: newCatName.trim(),
      icon: newCatIcon,
      color: '#6b7280',
      is_default: false,
      created_by: user!.id,
    }).select().single()
    if (data) {
      setCategories(prev => [...prev, data])
      setCategoryId(data.id)
    }
    setNewCatName(''); setNewCatIcon('💰'); setShowNewCat(false); setSavingCat(false)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('expenses').delete().eq('id', id)
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  const openEdit = (expense: Expense) => {
    setEditId(expense.id)
    setEditAmount(String(expense.amount))
    setEditDate(expense.date)
    setEditDescription(expense.description || '')
  }

  const handleSaveEdit = async () => {
    if (!editId) return
    setEditSaving(true)
    await supabase.from('expenses').update({
      amount: parseFloat(editAmount) || 0,
      date: editDate,
      description: editDescription || null,
    }).eq('id', editId)
    setEditId(null)
    setEditSaving(false)
    fetchData()
  }

  const today = new Date().toISOString().split('T')[0]
  const actualExpenses = expenses.filter(e => e.date <= today)
  const plannedExpenses = expenses.filter(e => e.date > today)
  const total = actualExpenses.reduce((s, e) => s + Number(e.amount), 0)
  const plannedTotal = plannedExpenses.reduce((s, e) => s + Number(e.amount), 0)

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header title="Harcama" />
      <main className="max-w-md mx-auto pt-14 pb-20 px-4">
        <div className="bg-red-600 rounded-2xl p-5 my-4 text-white">
          <p className="text-red-100 text-sm mb-1">Bu Ay Toplam Harcama</p>
          <p className="text-3xl font-bold">{formatEUR(total)}</p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-red-200 text-xs">{actualExpenses.length} harcama kaydı</p>
            {plannedTotal > 0 && <p className="text-amber-300 text-xs">+ {formatEUR(plannedTotal)} planlandı</p>}
          </div>
        </div>

        {showForm ? (
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 mb-4">
            <h2 className="font-semibold text-white mb-4">Harcama Ekle</h2>
            <form onSubmit={handleAdd} className="space-y-3">

              {/* Kategori seçici */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-zinc-300">Kategori</label>
                  <button
                    type="button"
                    onClick={() => setShowNewCat(v => !v)}
                    className="flex items-center gap-1 text-xs text-green-400 active:text-green-300"
                  >
                    {showNewCat ? <X size={13} /> : <Plus size={13} />}
                    {showNewCat ? 'Vazgeç' : 'Yeni kategori'}
                  </button>
                </div>

                {showNewCat ? (
                  <div className="bg-zinc-800 rounded-xl p-3 border border-zinc-700 space-y-3">
                    <input
                      type="text"
                      value={newCatName}
                      onChange={e => setNewCatName(e.target.value)}
                      placeholder="Kategori adı (örn: Otopark)"
                      className="w-full px-3 py-2.5 rounded-lg border border-zinc-600 bg-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      autoFocus
                    />
                    <div>
                      <p className="text-xs text-zinc-400 mb-2">İkon seç:</p>
                      <div className="grid grid-cols-9 gap-1.5">
                        {ICONS.map(ic => (
                          <button
                            key={ic}
                            type="button"
                            onClick={() => setNewCatIcon(ic)}
                            className={`text-xl py-1 rounded-lg ${newCatIcon === ic ? 'bg-green-900 ring-2 ring-green-500' : 'bg-zinc-700'}`}
                          >
                            {ic}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      disabled={savingCat || !newCatName.trim()}
                      className="w-full py-2 bg-green-600 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
                    >
                      {savingCat ? 'Kaydediliyor...' : `${newCatIcon} "${newCatName || '...'}" kategorisini ekle`}
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-zinc-700 bg-zinc-800 overflow-hidden">
                    {categories.map((cat, i) => (
                      <div key={cat.id} className={`flex items-center justify-between px-3 py-2.5 ${i < categories.length - 1 ? 'border-b border-zinc-700' : ''} ${categoryId === cat.id ? 'bg-green-900/40' : ''}`}>
                        <button type="button" onClick={() => setCategoryId(cat.id)} className="flex items-center gap-2 flex-1">
                          <span className="text-lg">{cat.icon}</span>
                          <span className={`text-sm font-medium ${categoryId === cat.id ? 'text-green-400' : 'text-zinc-300'}`}>{cat.name}</span>
                        </button>
                        <button type="button" onClick={async () => {
                          await supabase.from('expense_categories').delete().eq('id', cat.id)
                          setCategories(prev => prev.filter(c => c.id !== cat.id))
                          if (categoryId === cat.id) setCategoryId(categories.find(c => c.id !== cat.id)?.id || '')
                        }} className="p-1 text-zinc-600 active:text-red-400">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-300 mb-1 block">Tutar (€)</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
                  className="w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500 text-base"
                  required inputMode="decimal" />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-300 mb-1 block">Açıklama (opsiyonel)</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Detay..."
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
                <button type="button" onClick={() => { setShowForm(false); setShowNewCat(false) }} className="flex-1 py-3 rounded-xl border border-zinc-700 text-zinc-300 font-medium">İptal</button>
                <button type="submit" disabled={saving || showNewCat} className="flex-1 py-3 bg-red-600 text-white font-semibold rounded-xl disabled:opacity-50">{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
              </div>
            </form>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)} className="w-full py-3.5 bg-red-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 mb-4">
            <Plus size={20} /> Harcama Ekle
          </button>
        )}

        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <h2 className="font-semibold text-white">Bu Ay Harcamalar</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-zinc-500 text-sm">Yükleniyor...</div>
          ) : expenses.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-sm">Bu ay harcama kaydı yok</div>
          ) : (
            <div>
              {expenses.map((expense, i) => {
                const cat = expense.expense_categories as { name: string; icon: string } | null
                const isPlanned = expense.date > today
                const isEditing = editId === expense.id
                return (
                  <div key={expense.id} className={`${i < expenses.length - 1 ? 'border-b border-zinc-800' : ''} ${isPlanned ? 'bg-amber-950/30' : ''}`}>
                    <div className="flex items-center justify-between px-4 py-3.5">
                      <button className="flex items-center gap-3 flex-1 text-left" onClick={() => isEditing ? setEditId(null) : openEdit(expense)}>
                        <span className="text-xl">{cat?.icon || '💸'}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-white">{cat?.name || 'Diğer'}</p>
                            {isPlanned && <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-md font-medium">Planlandı</span>}
                          </div>
                          <p className="text-xs text-zinc-500">
                            {new Date(expense.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                            {expense.description ? ` · ${expense.description}` : ''}
                          </p>
                        </div>
                      </button>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${isPlanned ? 'text-amber-400' : 'text-red-400'}`}>-{formatEUR(Number(expense.amount))}</span>
                        <button onClick={() => isEditing ? setEditId(null) : openEdit(expense)} className={`p-1.5 ${isEditing ? 'text-zinc-400' : 'text-zinc-700 active:text-zinc-400'}`}>
                          {isEditing ? <X size={16} /> : <Pencil size={15} />}
                        </button>
                      </div>
                    </div>

                    {isEditing && (
                      <div className="px-4 pb-4 space-y-2.5">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-zinc-400 mb-1 block">Tutar (€)</label>
                            <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)}
                              className="w-full px-3 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-white focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                              inputMode="decimal" autoFocus />
                          </div>
                          <div>
                            <label className="text-xs text-zinc-400 mb-1 block">Tarih</label>
                            <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                              className="w-full min-w-0 max-w-full px-3 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-white focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-zinc-400 mb-1 block">Açıklama</label>
                          <input type="text" value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="Detay..."
                            className="w-full px-3 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleDelete(expense.id)}
                            className="py-2 px-3 rounded-xl border border-red-900 text-red-500 text-sm flex items-center gap-1">
                            <Trash2 size={15} /> Sil
                          </button>
                          <button onClick={handleSaveEdit} disabled={editSaving}
                            className="flex-1 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl disabled:opacity-50 flex items-center justify-center gap-1">
                            <Check size={15} /> {editSaving ? 'Kaydediliyor...' : 'Kaydet'}
                          </button>
                        </div>
                      </div>
                    )}
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
