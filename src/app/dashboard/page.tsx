'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/BottomNav'
import Header from '@/components/Header'
import CountUp from '@/components/CountUp'
import { SkeletonBalanceCard, SkeletonList } from '@/components/Skeleton'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Legend } from 'recharts'
import { Income, Expense, Saving } from '@/types/database'

function formatEUR(amount: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
}
function getMonthName(year: number, month: number) {
  return new Date(year, month - 1).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
}

const PIE_COLORS = ['#22c55e','#ef4444','#3b82f6','#f59e0b','#8b5cf6','#ec4899','#14b8a6','#f97316','#6366f1','#84cc16']

type Tab = 'tumu' | 'ben' | 'esim'

const renderPieLabel = ({ cx, cy, midAngle, outerRadius, name, icon }: { cx: number; cy: number; midAngle: number; outerRadius: number; name: string; icon: string }) => {
  const RADIAN = Math.PI / 180
  const radius = outerRadius + 20
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  const label = name.length > 9 ? name.slice(0, 9) + '…' : name
  return (
    <text x={x} y={y} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={9} fill="#a1a1aa">
      {icon} {label}
    </text>
  )
}

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
  const [trendData, setTrendData] = useState<Array<{ month: string; gelir: number; gider: number }>>([])
  const [pieExpanded, setPieExpanded] = useState(false)

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [myName, setMyName] = useState('Ben')
  const [spouseName, setSpouseName] = useState('Eşim')
  const [tab, setTab] = useState<Tab>('tumu')
  const [carryover, setCarryover] = useState(0)
  const [nextMonthReserved, setNextMonthReserved] = useState(0)
  const [myCarryover, setMyCarryover] = useState(0)
  const [spouseCarryover, setSpouseCarryover] = useState(0)
  const [myNextReserved, setMyNextReserved] = useState(0)
  const [spouseNextReserved, setSpouseNextReserved] = useState(0)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    const end = new Date(year, month, 0).toISOString().split('T')[0]

    const prevMonthEnd = new Date(year, month - 1, 0).toISOString().split('T')[0]
    const nextM = month === 12 ? 1 : month + 1
    const nextY = month === 12 ? year + 1 : year
    const nextMonthFirst = `${nextY}-${String(nextM).padStart(2, '0')}-01`

    const [
      { data: { user } },
      { data: inc },
      { data: exp },
      { data: sav },
      { data: prevInc },
      { data: prevExp },
      { data: nextRes },
    ] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('incomes').select('*').gte('date', start).lte('date', end).order('date', { ascending: false }),
      supabase.from('expenses').select('*, expense_categories(name, icon, color)').gte('date', start).lte('date', end).order('date', { ascending: false }),
      supabase.from('savings').select('*').order('name'),
      supabase.from('incomes').select('amount, user_id').lte('date', prevMonthEnd),
      supabase.from('expenses').select('amount, user_id').lte('date', prevMonthEnd),
      supabase.from('expenses').select('amount, user_id').eq('date', nextMonthFirst),
    ])

    const carryoverVal =
      (prevInc || []).reduce((s, i) => s + Number(i.amount), 0) -
      (prevExp || []).reduce((s, e) => s + Number(e.amount), 0)
    setCarryover(carryoverVal)
    setNextMonthReserved((nextRes || []).reduce((s, e) => s + Number(e.amount), 0))

    const myId = user?.id
    setMyCarryover(
      (prevInc || []).filter(i => i.user_id === myId).reduce((s, i) => s + Number(i.amount), 0) -
      (prevExp || []).filter(e => e.user_id === myId).reduce((s, e) => s + Number(e.amount), 0)
    )
    setSpouseCarryover(
      (prevInc || []).filter(i => i.user_id !== myId).reduce((s, i) => s + Number(i.amount), 0) -
      (prevExp || []).filter(e => e.user_id !== myId).reduce((s, e) => s + Number(e.amount), 0)
    )
    setMyNextReserved((nextRes || []).filter(e => e.user_id === myId).reduce((s, e) => s + Number(e.amount), 0))
    setSpouseNextReserved((nextRes || []).filter(e => e.user_id !== myId).reduce((s, e) => s + Number(e.amount), 0))

    setCurrentUserId(user?.id || null)
    const email = user?.email || user?.user_metadata?.email || ''
    const isMetin = email.toLowerCase() === 'metincanbek06@gmail.com'
    setMyName(isMetin ? 'Metin' : 'Simge')
    setSpouseName(isMetin ? 'Simge' : 'Metin')
    setIncomes(inc || [])
    setExpenses(exp || [])
    setSavings(sav || [])
    setLoading(false)
  }, [year, month])

  useEffect(() => { fetchData() }, [fetchData])

  const fetchTrend = useCallback(async () => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(year, month - 1 - (5 - i), 1)
      return { year: d.getFullYear(), month: d.getMonth() + 1 }
    })
    const trendStart = `${months[0].year}-${String(months[0].month).padStart(2, '0')}-01`
    const trendEnd = new Date(year, month, 0).toISOString().split('T')[0]
    const [{ data: inc }, { data: exp }] = await Promise.all([
      supabase.from('incomes').select('amount, date').gte('date', trendStart).lte('date', trendEnd),
      supabase.from('expenses').select('amount, date').gte('date', trendStart).lte('date', trendEnd),
    ])
    const today = new Date().toISOString().split('T')[0]
    const data = months.map(({ year: y, month: m }) => {
      const mStart = `${y}-${String(m).padStart(2, '0')}-01`
      const mEnd = new Date(y, m, 0).toISOString().split('T')[0]
      const gelir = (inc || []).filter(i => i.date >= mStart && i.date <= mEnd).reduce((s, i) => s + Number(i.amount), 0)
      const gider = (exp || []).filter(e => e.date >= mStart && e.date <= mEnd && e.date <= today).reduce((s, e) => s + Number(e.amount), 0)
      const monthLabel = new Date(y, m - 1).toLocaleDateString('tr-TR', { month: 'short' })
      return { month: monthLabel, gelir, gider }
    })
    setTrendData(data)
  }, [year, month])

  useEffect(() => { fetchTrend() }, [fetchTrend])

  const prevMonth = () => { if (month === 1) { setYear(y => y - 1); setMonth(12) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 12) { setYear(y => y + 1); setMonth(1) } else setMonth(m => m + 1) }

  const today = new Date().toISOString().split('T')[0]
  const totalIncome = incomes.reduce((s, i) => s + Number(i.amount), 0)
  const totalExpense = expenses.filter(e => e.date <= today).reduce((s, e) => s + Number(e.amount), 0)
  const balance = carryover + totalIncome - totalExpense
  const available = balance - nextMonthReserved

  const myIncomes = incomes.filter(i => i.user_id === currentUserId)
  const myExpenses = expenses.filter(e => e.user_id === currentUserId)
  const spouseIncomes = incomes.filter(i => i.user_id !== currentUserId)
  const spouseExpenses = expenses.filter(e => e.user_id !== currentUserId)

  const tabIncomes = tab === 'tumu' ? incomes : tab === 'ben' ? myIncomes : spouseIncomes
  const tabExpenses = tab === 'tumu' ? expenses : tab === 'ben' ? myExpenses : spouseExpenses
  const tabIncome = tabIncomes.reduce((s, i) => s + Number(i.amount), 0)
  const tabExpense = tabExpenses.filter(e => e.date <= today).reduce((s, e) => s + Number(e.amount), 0)
  const tabCarryover = tab === 'ben' ? myCarryover : tab === 'esim' ? spouseCarryover : carryover
  const tabNextReserved = tab === 'ben' ? myNextReserved : tab === 'esim' ? spouseNextReserved : nextMonthReserved
  const tabBalance = tabCarryover + tabIncome - tabExpense
  const tabAvailable = tabBalance - tabNextReserved

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
          <>
            <SkeletonBalanceCard />
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 mb-3 overflow-hidden">
              <div className="flex border-b border-zinc-800">
                {[0,1,2].map(i => <div key={i} className="flex-1 py-3 flex justify-center"><div className="h-4 w-12 bg-zinc-800 animate-pulse rounded" /></div>)}
              </div>
              <div className="p-4"><SkeletonList count={3} /></div>
            </div>
          </>
        ) : (
          <>
            {/* Birleşik bakiye */}
            <div className={`rounded-2xl p-5 mb-3 ${available >= 0 ? 'bg-green-600' : 'bg-red-600'}`}>
              <p className="text-green-100 text-sm font-medium mb-1">
                {nextMonthReserved > 0 ? 'Kullanılabilir Bakiye (Aile)' : 'Toplam Bakiye (Aile)'}
              </p>
              <p className="text-3xl font-bold text-white">
                <CountUp value={available} formatter={formatEUR} />
              </p>
              <div className="flex flex-wrap gap-4 mt-3">
                {carryover !== 0 && (
                  <div>
                    <p className="text-green-200 text-xs">Devir</p>
                    <p className="text-white font-bold text-sm">{formatEUR(carryover)}</p>
                  </div>
                )}
                <div><p className="text-green-200 text-xs">Gelir</p><p className="text-white font-bold text-sm"><CountUp value={totalIncome} formatter={formatEUR} /></p></div>
                <div><p className="text-green-200 text-xs">Gider</p><p className="text-white font-bold text-sm"><CountUp value={totalExpense} formatter={formatEUR} /></p></div>
                {nextMonthReserved > 0 && (
                  <div>
                    <p className="text-amber-200 text-xs">Ayrılan</p>
                    <p className="text-amber-200 font-bold text-sm">-{formatEUR(nextMonthReserved)}</p>
                  </div>
                )}
              </div>
              {nextMonthReserved > 0 && (
                <p className="text-green-100/60 text-xs mt-2">
                  Gelecek ay için {formatEUR(nextMonthReserved)} ayrıldı
                </p>
              )}
            </div>

            {/* Ben / Eşim sekmeleri */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 mb-3 overflow-hidden">
              <div className="flex border-b border-zinc-800">
                {(['tumu', 'ben', 'esim'] as Tab[]).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`flex-1 py-3 text-sm font-semibold transition-colors ${tab === t ? 'text-green-400 border-b-2 border-green-400' : 'text-zinc-500'}`}>
                    {t === 'tumu' ? 'Tümü' : t === 'ben' ? myName : spouseName}
                  </button>
                ))}
              </div>
              <div className="p-4">
                {tab !== 'tumu' ? (
                  <div className={`rounded-2xl p-4 mb-4 ${tabAvailable >= 0 ? 'bg-green-600' : 'bg-red-600'}`}>
                    <p className="text-green-100 text-sm font-medium mb-1">
                      {tab === 'ben' ? myName : spouseName} · {tabNextReserved > 0 ? 'Kullanılabilir Bakiye' : 'Anlık Bakiye'}
                    </p>
                    <p className="text-3xl font-bold text-white"><CountUp value={tabAvailable} formatter={formatEUR} /></p>
                    <div className="flex flex-wrap gap-4 mt-3">
                      {tabCarryover !== 0 && (
                        <div>
                          <p className="text-green-200 text-xs">Devir</p>
                          <p className="text-white font-bold text-sm">{formatEUR(tabCarryover)}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-green-200 text-xs">Gelir</p>
                        <p className="text-white font-bold text-sm"><CountUp value={tabIncome} formatter={formatEUR} /></p>
                      </div>
                      <div>
                        <p className="text-green-200 text-xs">Gider</p>
                        <p className="text-white font-bold text-sm"><CountUp value={tabExpense} formatter={formatEUR} /></p>
                      </div>
                      {tabNextReserved > 0 && (
                        <div>
                          <p className="text-amber-200 text-xs">Ayrılan</p>
                          <p className="text-amber-200 font-bold text-sm">-{formatEUR(tabNextReserved)}</p>
                        </div>
                      )}
                    </div>
                    {tabNextReserved > 0 && (
                      <p className="text-green-100/60 text-xs mt-2">
                        Gelecek ay için {formatEUR(tabNextReserved)} ayrıldı
                      </p>
                    )}
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
                    <p className="text-sm font-semibold text-zinc-300 mb-1">Harcama Dağılımı</p>
                    <p className="text-xs text-zinc-600 mb-3">Detay için grafiye dokun</p>
                    <div onClick={() => setPieExpanded(v => !v)} className="cursor-pointer">
                      <ResponsiveContainer width="100%" height={pieExpanded ? 290 : 190}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={pieExpanded ? 62 : 52}
                            outerRadius={pieExpanded ? 98 : 82}
                            paddingAngle={2}
                            dataKey="value"
                            label={pieExpanded ? renderPieLabel : false}
                            labelLine={pieExpanded ? { stroke: '#52525b', strokeWidth: 1 } : false}
                          >
                            {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-1.5 mt-1">
                      {pieData.map((item, i) => (
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

            {/* Aylık Trend */}
            {trendData.some(d => d.gelir > 0 || d.gider > 0) && (
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 mb-3">
                <p className="font-semibold text-white mb-4">Son 6 Ay Trendi</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={trendData} barCategoryGap="25%">
                    <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: 12, fontSize: 12 }}
                      labelStyle={{ color: '#fff', fontWeight: 600 }}
                      formatter={(value, name) => [formatEUR(Number(value)), name === 'gelir' ? 'Gelir' : 'Gider']}
                    />
                    <Legend formatter={(v) => v === 'gelir' ? 'Gelir' : 'Gider'} wrapperStyle={{ fontSize: 12, color: '#a1a1aa' }} />
                    <Bar dataKey="gelir" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="gider" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

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
