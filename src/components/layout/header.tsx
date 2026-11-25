'use client'

import { signOut, useSession } from 'next-auth/react'
import { Menu, LogOut, User as UserIcon } from 'lucide-react'

interface HeaderProps {
  onToggleSidebar: () => void
  title?: string
}

export function Header({ onToggleSidebar, title }: HeaderProps) {
  const { data: session } = useSession()

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="h-6 w-6" />
        </button>
        {title && <h1 className="text-lg font-bold text-slate-800 sm:text-xl truncate">{title}</h1>}
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex flex-col text-right">
          <span className="text-xs font-semibold text-slate-800">{session?.user?.name || 'Usuario'}</span>
          <span className="text-[10px] text-emerald-600 font-medium">
            {(session?.user as any)?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Vendedor'}
          </span>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          title="Cerrar sesión"
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </header>
  )
}
