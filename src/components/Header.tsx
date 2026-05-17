'use client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type HeaderProps = {
  title: string
  showLogout?: boolean
}

export default function Header({ title, showLogout = false }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="fixed top-0 left-0 right-0 bg-zinc-900 border-b border-zinc-800 z-50">
      <div className="max-w-md mx-auto flex items-center justify-between px-4 h-14">
        <h1 className="text-lg font-bold text-white">{title}</h1>
        {showLogout && (
          <button
            onClick={handleLogout}
            className="p-2 text-zinc-500 active:text-zinc-300"
          >
            <LogOut size={20} />
          </button>
        )}
      </div>
    </header>
  )
}
