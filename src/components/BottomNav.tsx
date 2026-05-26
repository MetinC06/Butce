'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
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
  const router = useRouter()
  const pathnameRef = useRef(pathname)
  pathnameRef.current = pathname
  const navigatingRef = useRef(false)

  useEffect(() => {
    let startX = 0
    let startY = 0

    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (navigatingRef.current) return
      const dx = e.changedTouches[0].clientX - startX
      const dy = e.changedTouches[0].clientY - startY
      if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy)) return
      const currentIndex = tabs.findIndex(t => t.href === pathnameRef.current)
      if (currentIndex === -1) return
      if (dx < 0 && currentIndex < tabs.length - 1) {
        navigatingRef.current = true
        router.push(tabs[currentIndex + 1].href)
        setTimeout(() => { navigatingRef.current = false }, 600)
      } else if (dx > 0 && currentIndex > 0) {
        navigatingRef.current = true
        router.push(tabs[currentIndex - 1].href)
        setTimeout(() => { navigatingRef.current = false }, 600)
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [router])

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur border-t border-zinc-800 z-50">
      <div className="max-w-md mx-auto flex">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center py-2"
            >
              <div className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl transition-all duration-200 ${active ? 'bg-green-500/15' : ''}`}>
                <Icon
                  size={active ? 23 : 21}
                  className={`transition-all duration-200 ${active ? 'text-green-400' : 'text-zinc-600'}`}
                  strokeWidth={active ? 2.5 : 1.8}
                />
                <span className={`text-[10px] font-semibold transition-colors duration-200 ${active ? 'text-green-400' : 'text-zinc-600'}`}>
                  {label}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
