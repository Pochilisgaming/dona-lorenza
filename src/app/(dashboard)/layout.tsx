'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { MobileNav } from '@/components/layout/mobile-nav'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="text-4xl animate-bounce">🥬</div>
          <span className="text-sm font-semibold tracking-wide text-emerald-400">
            Cargando Doña Lorenza...
          </span>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      {/* Sidebar fijo en desktop, desplegable en móvil */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header superior */}
        <Header onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

        {/* Contenido principal con scroll */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 pb-20 lg:pb-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>

        {/* Dock inferior táctil para Android y móviles */}
        <MobileNav />
      </div>
    </div>
  )
}
