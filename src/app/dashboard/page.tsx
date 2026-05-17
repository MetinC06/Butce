'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'
import Header from '@/components/Header'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Income, Expense, Saving } from '@/types/database'

function formatEUR(amount: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
}
function getMonthName(year: number, month: number) {
  return new Date(year, month - 1).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
}

const PIE_COLORS = ['#22c55e','#ef4444','#3b82f6','#f59e0b','#8b5cf6','#ec4899','#14b8a6','#f97316','#6366f1','#84cc16']

type Tab = 'tumu' | 'ben' | 'esim'

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm shadow-xl">
        <p className="text-white font-medium">{payload[0].name}</p>
        <p className="text-green-400">{formatEUR(payload[0].value)}</p>
      </div>
    )
  }
  return null
}

export default function DashboardPage() {
  const supabase = createClient()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [incomes, setIncomes] = useState<Income[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [savings, setSavings] = useState<Saving[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('tumu')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    const end = new Date(year, month, 0).toISOString().split('T')[0]

    const [{ data: { user } }, { data: inc }, { data: exp }, { data: sav }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('incomes').select('*').gte('date', start).lte('date', end).order('date', { ascending: false }),
      supabase.from('expenses').select('*, expense_categories(name, icon, color)').gte('date', start).lte('date', end).order('date', { ascending: false }),
      supabase.from('savings').select('*').order('name'),
    ])

    setCurrentUserId(user?.id || null)
    setIncomes(inc || [])
    setExpenses(exp || [])
    setSavings(sav || [])
    setLoading(false)
  }, [year, month])

  useEffect(() => { fetchData() }, [fetchData])

  const prevMonth = () => { if (month === 1) { setYear(y => y - 1); setMonth(12) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 12) { setYear(y => y + 1); setMonth(1) } else setMonth(m => m + 1) }

  const today = new Date().toISOString().split('T')[0]
  const totalIncome = incomes.reduce((s, i) => s + Number(i.amount), 0)
  const totalExpense = expenses.filter(e => e.date <= today).reduce((s, e) => s + Number(e.amount), 0)
  const balance = totalIncome - totalExpense

  const myIncomes = incomes.filter(i => i.user_id === currentUserId)
  const myExpenses = expenses.filter(e => e.user_id === currentUserId)
  const spouseIncomes = incomes.filter(i => i.user_id !== currentUserId)
  const spouseExpenses = expenses.filter(e => e.user_id !== currentUserId)

  const tabIncomes = tab === 'tumu' ? incomes : tab === 'ben' ? myIncomes : spouseIncomes
  const tabExpenses = tab === 'tumu' ? expenses : tab === 'ben' ? myExpenses : spouseExpenses
  const tabIncome = tabIncomes.reduce((s, i) => s + Number(i.amount), 0)
  const tabExpense = tabExpenses.filter(e => e.date <= today).reduce((s, e) => s + Number(e.amount), 0)

  const categoryMap: Record<string, { name: string; icon: string; value: number }> = {}
  tabExpenses.forEach(exp => {
    const cat = exp.expense_categories as { name: string; icon: string } | null
    if (!cat || !exp.category_id) return
    if (!categoryMap[exp.category_id]) categoryMap[exp.category_id] = { name: cat.name, icon: cat.icon, value: 0 }
    categoryMap[exp.category_id].value += Number(exp.amount)
  })
  const pieData = Object.values(categoryMap).filter(d => d.value > 0).sort((a, b) => b.value - a.value)

  const totalSavings = savings.reduce((s, sv) => s + Number(sv.balance), 0)

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header title="Bütçe Takibi" showLogout />
      <main className="max-w-md mx-auto pt-14 pb-20 px-4">
        <div className="flex items-center justify-between py-4">
          <button onClick={prevMonth} className="p-2 rounded-full active:bg-zinc-800"><ChevronLeft size={20} className="text-zinc-400" /></button>
          <span className="font-semibold text-white capitalize">{getMonthName(year, month)}</span>
          <button onClick={nextMonth} className="p-2 rounded-full active:bg-zinc-800"><ChevronRight size={20} className="text-zinc-400" /></button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-zinc-500">Yükleniyor...</div>
        ) : (
          <>
            {/* Birleşik bakiye */}
            <div className={`rounded-2xl p-5 mb-3 ${balance >= 0 ? 'bg-green-600' : 'bg-red-600'}`}>
              <p className="text-green-100 text-sm font-medium mb-1">Toplam Bakiye (Aile)</p>
              <p className="text-3xl font-bold text-white">{formatEUR(balance)}</p>
              <div className="flex gap-6 mt-3">
                <div><p className="text-green-200 text-xs">Gelir</p><p className="text-white font-bold text-sm">{formatEUR(totalIncome)}</p></div>
                <div><p className="text-green-200 text-xs">Gider</p><p className="text-white font-bold text-sm">{formatEUR(totalExpense)}</p></div>
              </div>
            </div>

            {/* Ben / Eşim sekmeleri */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 mb-3 overflow-hidden">
              <div className="flex border-b border-zinc-800">
                {(['tumu', 'ben', 'esim'] as Tab[]).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`flex-1 py-3 text-sm font-semibold transition-colors ${tab === t ? 'text-green-400 border-b-2 border-green-400' : 'text-zinc-500'}`}>
                    {t === 'tumu' ? 'Tümü' : t === 'ben' ? 'Metin' : 'Simge'}
                  </button>
                ))}
              </div>
              <div className="p-4">
                {tab !== 'tumu' ? (
                  <div className={`rounded-2xl p-4 mb-4 ${tabIncome - tabExpense >= 0 ? 'bg-green-600' : 'bg-red-600'}`}>
                    <p className="text-green-100 text-sm font-medium mb-1">
                      {tab === 'ben' ? 'Metin' : 'Simge'} · Anlık Bakiye
                    </p>
                    <p className="text-3xl font-bold text-white">{formatEUR(tabIncome - tabExpense)}</p>
                    <div className="flex gap-6 mt-3">
                      <div>
                        <p className="text-green-200 text-xs">Gelir</p>
                        <p className="text-white font-bold text-sm">{formatEUR(tabIncome)}</p>
                      </div>
                      <div>
                        <p className="text-green-200 text-xs">Gider</p>
                        <p className="text-white font-bold text-sm">{formatEUR(tabExpense)}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-zinc-800 rounded-xl p-3">
                      <p className="text-xs text-zinc-400 mb-1">Gelir</p>
                      <p className="text-lg font-bold text-green-400">{formatEUR(tabIncome)}</p>
                      <p className="text-xs text-zinc-500">{tabIncomes.length} kayıt</p>
                    </div>
                    <div className="bg-zinc-800 rounded-xl p-3">
                      <p className="text-xs text-zinc-400 mb-1">Gider</p>
                      <p className="text-lg font-bold text-red-400">{formatEUR(tabExpense)}</p>
                      <p className="text-xs text-zinc-500">{tabExpenses.length} kayıt</p>
                    </div>
                  </div>
                )}

                {pieData.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-zinc-300 mb-3">Harcama Dağılımı</p>
                    <ResponsiveContainer width="100%" height={190}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={82} paddingAngle={2} dataKey="value">
                          {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5 mt-1">
                      {pieData.slice(0, 6).map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="text-xs text-zinc-400 flex-1 truncate">{item.icon} {item.name}</span>
                          <span className="text-xs text-zinc-300">{formatEUR(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {tabExpenses.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-zinc-800">
                    <p className="text-sm font-semibold text-zinc-300 mb-3">Son Harcamalar</p>
                    <div className="space-y-3">
                      {tabExpenses.slice(0, 5).map(e => {
                        const cat = e.expense_categories as { name: string; icon: string } | null
                        const isPlanned = e.date > today
                        return (
                          <div key={e.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{cat?.icon || '💸'}</span>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <p className="text-sm font-medium text-white">{cat?.name || 'Diğer'}</p>
                                  {isPlanned && <span className="text-xs bg-amber-500/20 text-amber-400 px-1 py-0.5 rounded font-medium">Planlandı</span>}
                                </div>
                                <p className="text-xs text-zinc-500">
                                  {new Date(e.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                                  {e.description ? ` · ${e.description}` : ''}
                                </p>
                              </div>
                            </div>
                            <span className={`text-sm font-semibold ${isPlanned ? 'text-amber-400' : 'text-red-400'}`}>-{formatEUR(Number(e.amount))}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tasarruflar */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 mb-3">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-white">Tasarruflar</p>
                <p className="text-sm font-bold text-blue-400">{formatEUR(totalSavings)}</p>
              </div>
              {savings.length === 0 ? <p className="text-sm text-zinc-500">Henüz tasarruf hesabı yok</p> : (
                <div className="space-y-2">
                  {savings.map(s => (
                    <div key={s.id} className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">🏦 {s.name}</span>
                      <span className="text-sm font-semibold text-white">{formatEUR(Number(s.balance))}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </>
        )}
      </main>
      <BottomNav />
    </div>
  )
}
