'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'
import Header from '@/components/Header'
import { Plus, Trash2, X, Pencil, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { Expense, ExpenseCategory } from '@/types/database'
import { SkeletonList } from '@/components/Skeleton'
import CountUp from '@/components/CountUp'

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

  // Ay navigasyonu
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  // Kişi sekmeleri
  const [tab, setTab] = useState<'tumu' | 'ben' | 'esim'>('tumu')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [myName, setMyName] = useState('Ben')
  const [spouseName, setSpouseName] = useState('Eşim')

  // Transfer
  const [showTransfer, setShowTransfer] = useState(false)
  const [transferAmount, setTransferAmount] = useState('')
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0])
  const [transferSaving, setTransferSaving] = useState(false)

  // Yeni kategori mini formu
  const [showNewCat, setShowNewCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatIcon, setNewCatIcon] = useState('💰')
  const [savingCat, setSavingCat] = useState(false)
  const [categoryCollapsed, setCategoryCollapsed] = useState(false)

  const fetchData = useCallback(async () => {
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    const end = new Date(year, month, 0).toISOString().split('T')[0]
    const [{ data: { user } }, { data: exp }, { data: cats }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('expenses').select('*, expense_categories(name, icon, color)').gte('date', start).lte('date', end).order('date', { ascending: false }),
      supabase.from('expense_categories').select('*').order('name'),
    ])
    setCurrentUserId(user?.id || null)
    const email = user?.email || ''
    const isMetin = email.toLowerCase() === 'metincanbek06@gmail.com'
    setMyName(isMetin ? 'Metin' : 'Simge')
    setSpouseName(isMetin ? 'Simge' : 'Metin')
    setExpenses(exp || [])
    setCategories(cats || [])
    if (cats && cats.length > 0 && !categoryId) setCategoryId(cats[0].id)
    setLoading(false)
  }, [year, month])

  useEffect(() => { fetchData() }, [fetchData])

  const prevMonth = () => { if (month === 1) { setYear(y => y - 1); setMonth(12) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 12) { setYear(y => y + 1); setMonth(1) } else setMonth(m => m + 1) }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || !categoryId) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('expenses').insert({ user_id: user!.id, category_id: categoryId, amount: parseAmount(amount), description: description || null, date })
    const expYear = parseInt(date.split('-')[0])
    const expMonth = parseInt(date.split('-')[1])
    setAmount(''); setDescription(''); setDate(new Date().toISOString().split('T')[0]); setShowForm(false); setSaving(false); setCategoryCollapsed(false)
    if (expYear !== year || expMonth !== month) {
      setYear(expYear)
      setMonth(expMonth)
    } else {
      fetchData()
    }
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

  const handleTransfer = async () => {
    if (!transferAmount) return
    setTransferSaving(true)
    const { data: { user } } = await supabase.auth.getUser()

    // Diğer kullanıcıyı bul
    const { data: otherExp } = await supabase.from('expenses').select('user_id').neq('user_id', user!.id).limit(1).single()
    const { data: otherInc } = await supabase.from('incomes').select('user_id').neq('user_id', user!.id).limit(1).single()
    const otherId = otherExp?.user_id || otherInc?.user_id

    if (!otherId) { setTransferSaving(false); return }

    const amt = parseAmount(transferAmount)
    await Promise.all([
      supabase.from('expenses').insert({ user_id: user!.id, category_id: null, amount: amt, description: 'TRANSFER_OUT', date: transferDate }),
      supabase.from('incomes').insert({ user_id: otherId, amount: amt, description: 'TRANSFER_IN', date: transferDate }),
    ])
    setTransferAmount(''); setTransferDate(new Date().toISOString().split('T')[0]); setShowTransfer(false); setTransferSaving(false)
    fetchData()
  }

  const openEdit = (expense: Expense) => {
    setEditId(expense.id)
    setEditAmount(String(expense.amount))
    setEditDate(expense.date)
    setEditDescription(expense.description || '')
  }

  const parseAmount = (val: string) => {
    const cleaned = val.trim().replace(/[^\d,.-]/g, '')
    const lastComma = cleaned.lastIndexOf(',')
    const lastPeriod = cleaned.lastIndexOf('.')
    const normalized = lastComma > lastPeriod
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned.replace(/,/g, '')
    return parseFloat(normalized) || 0
  }

  const handleSaveEdit = async () => {
    if (!editId) return
    setEditSaving(true)
    await supabase.from('expenses').update({
      amount: parseAmount(editAmount),
      date: editDate,
      description: editDescription || null,
    }).eq('id', editId)
    setEditId(null)
    setEditSaving(false)
    fetchData()
  }

  const today = new Date().toISOString().split('T')[0]
  const myExpenses = expenses.filter(e => e.user_id === currentUserId)
  const spouseExpenses = expenses.filter(e => e.user_id !== currentUserId)
  const tabExpenses = tab === 'tumu' ? expenses : tab === 'ben' ? myExpenses : spouseExpenses
  const actualExpenses = tabExpenses.filter(e => e.date <= today)
  const plannedExpenses = tabExpenses.filter(e => e.date > today)
  const total = actualExpenses.reduce((s, e) => s + Number(e.amount), 0)
  const plannedTotal = plannedExpenses.reduce((s, e) => s + Number(e.amount), 0)
  const allTotal = expenses.filter(e => e.date <= today).reduce((s, e) => s + Number(e.amount), 0)

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header title="Harcama" />
      <main className="max-w-md mx-auto pt-14 pb-20 px-4">
        <div className="flex items-center justify-between py-4">
          <button onClick={prevMonth} className="p-2 rounded-full active:bg-zinc-800"><ChevronLeft size={20} className="text-zinc-400" /></button>
          <span className="font-semibold text-white capitalize">{new Date(year, month - 1).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}</span>
          <button onClick={nextMonth} className="p-2 rounded-full active:bg-zinc-800"><ChevronRight size={20} className="text-zinc-400" /></button>
        </div>
        <div className="bg-red-600 rounded-2xl p-5 mb-4 text-white">
          <p className="text-red-100 text-sm mb-1">Bu Ay Toplam Harcama (Aile)</p>
          <p className="text-3xl font-bold"><CountUp value={allTotal} formatter={formatEUR} /></p>
          <div className="flex gap-6 mt-3">
            <div><p className="text-red-200 text-xs">{myName}</p><p className="text-white font-bold text-sm">{formatEUR(myExpenses.filter(e => e.date <= today).reduce((s, e) => s + Number(e.amount), 0))}</p></div>
            <div><p className="text-red-200 text-xs">{spouseName}</p><p className="text-white font-bold text-sm">{formatEUR(spouseExpenses.filter(e => e.date <= today).reduce((s, e) => s + Number(e.amount), 0))}</p></div>
          </div>
        </div>

        {!showForm && !showTransfer && (
          <div className="flex gap-2 mb-4">
            <button onClick={() => { setShowForm(true); setCategoryCollapsed(false) }} className="flex-1 py-3.5 bg-red-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2">
              <Plus size={20} /> Harcama Ekle
            </button>
            <button onClick={() => setShowTransfer(true)} className="flex-1 py-3.5 bg-blue-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2">
              💸 Transfer
            </button>
          </div>
        )}

        {showTransfer && (
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 mb-4">
            <h2 className="font-semibold text-white mb-1">Eşine Transfer</h2>
            <p className="text-xs text-zinc-500 mb-4">Senin hesabından düşülür, eşinin hesabına eklenir</p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-zinc-300 mb-1 block">Tutar (€)</label>
                <input type="text" value={transferAmount} onChange={e => setTransferAmount(e.target.value)} placeholder="0"
                  className="w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                  inputMode="decimal" autoCorrect="off" autoComplete="off" autoFocus />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-300 mb-1 block">Tarih</label>
                <div className="overflow-hidden rounded-xl">
                  <input type="date" value={transferDate} onChange={e => setTransferDate(e.target.value)}
                    className="w-full min-w-0 max-w-full px-4 py-3 border border-zinc-700 bg-zinc-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-base rounded-xl" />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowTransfer(false)} className="flex-1 py-3 rounded-xl border border-zinc-700 text-zinc-300 font-medium">İptal</button>
                <button onClick={handleTransfer} disabled={transferSaving || !transferAmount}
                  className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl disabled:opacity-50">
                  {transferSaving ? 'Gönderiliyor...' : 'Gönder'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showForm && (
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 mb-4">
            <h2 className="font-semibold text-white mb-4">Harcama Ekle</h2>
            <form onSubmit={handleAdd} className="space-y-3">

              {/* Kategori seçici */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-zinc-300">Kategori</label>
                  {!categoryCollapsed && (
                    <button
                      type="button"
                      onClick={() => { setShowNewCat(v => !v); setCategoryCollapsed(false) }}
                      className="flex items-center gap-1 text-xs text-green-400 active:text-green-300"
                    >
                      {showNewCat ? <X size={13} /> : <Plus size={13} />}
                      {showNewCat ? 'Vazgeç' : 'Yeni kategori'}
                    </button>
                  )}
                </div>

                {/* Seçili kategori chip — sadece collapsed modda görünür */}
                <div className={`transition-all duration-200 overflow-hidden ${categoryCollapsed ? 'max-h-12 opacity-100 mb-0' : 'max-h-0 opacity-0'}`}>
                  {(() => {
                    const selCat = categories.find(c => c.id === categoryId)
                    return selCat ? (
                      <button
                        type="button"
                        onClick={() => setCategoryCollapsed(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-green-700 bg-green-900/30 text-green-400 text-sm font-medium w-full"
                      >
                        <span className="text-base">{selCat.icon}</span>
                        <span className="flex-1 text-left">{selCat.name}</span>
                        <Pencil size={13} className="text-green-600" />
                      </button>
                    ) : null
                  })()}
                </div>

                {/* Kategori listesi — collapsed olduğunda yukarı kayar */}
                <div className={`transition-all duration-300 overflow-hidden ${categoryCollapsed ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100'}`}>
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
                          <button type="button" onClick={() => { setCategoryId(cat.id); setCategoryCollapsed(true) }} className="flex items-center gap-2 flex-1">
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
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-300 mb-1 block">Tutar (€)</label>
                <input type="text" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
                  className="w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500 text-base"
                  required inputMode="decimal" autoCorrect="off" autoComplete="off" />
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
                <button type="button" onClick={() => { setShowForm(false); setShowNewCat(false); setCategoryCollapsed(false) }} className="flex-1 py-3 rounded-xl border border-zinc-700 text-zinc-300 font-medium">İptal</button>
                <button type="submit" disabled={saving || showNewCat} className="flex-1 py-3 bg-red-600 text-white font-semibold rounded-xl disabled:opacity-50">{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
          <div className="flex border-b border-zinc-800">
            {(['tumu', 'ben', 'esim'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-3 text-sm font-semibold transition-colors ${tab === t ? 'text-red-400 border-b-2 border-red-400' : 'text-zinc-500'}`}>
                {t === 'tumu' ? 'Tümü' : t === 'ben' ? myName : spouseName}
              </button>
            ))}
          </div>
          {tab !== 'tumu' && (
            <div className="px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between">
              <span className="text-xs text-zinc-500">{actualExpenses.length} harcama</span>
              <div className="text-right">
                <span className="text-sm font-bold text-red-400">{formatEUR(total)}</span>
                {plannedTotal > 0 && <span className="text-xs text-amber-400 ml-2">+{formatEUR(plannedTotal)} planlandı</span>}
              </div>
            </div>
          )}
          {loading ? (
            <SkeletonList count={4} />
          ) : tabExpenses.length === 0 ? (
            <div className="py-10 flex flex-col items-center gap-2">
              <span className="text-4xl">🛒</span>
              <p className="text-zinc-400 font-medium text-sm">Bu ay harcama kaydı yok</p>
              <p className="text-zinc-600 text-xs">Yukarıdaki butonu kullanarak harcama ekle</p>
            </div>
          ) : (
            <div>
              {tabExpenses.map((expense, i) => {
                const cat = expense.expense_categories as { name: string; icon: string } | null
                const isPlanned = expense.date > today
                const isEditing = editId === expense.id
                const isTransfer = expense.description === 'TRANSFER_OUT'
                return (
                  <div key={expense.id} className={`${i < tabExpenses.length - 1 ? 'border-b border-zinc-800' : ''} ${isPlanned ? 'bg-amber-950/30' : ''} ${isTransfer ? 'bg-blue-950/20' : ''}`}>
                    <div className="flex items-center justify-between px-4 py-3.5">
                      <button className="flex items-center gap-3 flex-1 text-left" onClick={() => !isTransfer && (isEditing ? setEditId(null) : openEdit(expense))}>
                        <span className="text-xl">{isTransfer ? '💸' : cat?.icon || '💸'}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-white">{isTransfer ? 'Eşime Transfer' : cat?.name || 'Diğer'}</p>
                            {isPlanned && !isTransfer && <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-md font-medium">Planlandı</span>}
                            {isTransfer && <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-md font-medium">Transfer</span>}
                          </div>
                          <p className="text-xs text-zinc-500">
                            {new Date(expense.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                      </button>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${isTransfer ? 'text-blue-400' : isPlanned ? 'text-amber-400' : 'text-red-400'}`}>-{formatEUR(Number(expense.amount))}</span>
                        {isTransfer ? (
                          <button onClick={() => handleDelete(expense.id)} className="p-1.5 text-zinc-700 active:text-red-400"><Trash2 size={15} /></button>
                        ) : (
                          <button onClick={() => isEditing ? setEditId(null) : openEdit(expense)} className={`p-1.5 ${isEditing ? 'text-zinc-400' : 'text-zinc-700 active:text-zinc-400'}`}>
                            {isEditing ? <X size={16} /> : <Pencil size={15} />}
                          </button>
                        )}
                      </div>
                    </div>

                    {isEditing && (
                      <div className="px-4 pb-4 space-y-2.5">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-zinc-400 mb-1 block">Tutar (€)</label>
                            <input type="text" value={editAmount} onChange={e => setEditAmount(e.target.value)}
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
