'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, TrendingUp, ShoppingCart, PiggyBank, BarChart2 } from 'lucide-react'

const tabs = [
  { href: '/dashboard', icon: Home, label: 'Ana Sayfa' },
  { href: '/gelir', icon: TrendingUp, label: 'Gelir' },
  { href: '/harcama', icon: ShoppingCart, label: 'Harcama' },
  { href: '/tasarruf', icon: PiggyBank, label: 'Tasarruf' },
  { href: '/portfoy', icon: BarChart2, label: 'Portföy' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 z-50">
      <div className="max-w-md mx-auto flex">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5"
            >
              <Icon
                size={22}
                className={active ? 'text-green-400' : 'text-zinc-600'}
                strokeWidth={active ? 2.5 : 1.8}
              />
              <span className={`text-[10px] font-medium ${active ? 'text-green-400' : 'text-zinc-600'}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
