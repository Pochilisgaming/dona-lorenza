'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShoppingCart, Package, DollarSign, Wallet, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'

export function MobileNav() {
  const pathname = usePathname()

  const tabs = [
    { href: '/pos', label: 'POS', icon: ShoppingCart },
    { href: '/lista-precios', label: 'Precios', icon: DollarSign },
    { href: '/productos', label: 'Productos', icon: Package },
    { href: '/caja', label: 'Caja', icon: Wallet },
    { href: '/', label: 'Inicio', icon: LayoutGrid },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-slate-200 bg-white/95 px-2 backdrop-blur lg:hidden">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href))
        const Icon = tab.icon

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl transition-all',
              isActive
                ? 'text-emerald-700 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            )}
          >
            <div className={cn('p-1 rounded-lg', isActive && 'bg-emerald-100')}>
              <Icon className="h-5 w-5" />
            </div>
            <span className="text-[11px]">{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
