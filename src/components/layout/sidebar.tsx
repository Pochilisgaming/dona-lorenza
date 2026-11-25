'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  ShoppingCart,
  Package,
  DollarSign,
  Receipt,
  Boxes,
  Wallet,
  ShoppingBag,
  Truck,
  Users,
  ShieldAlert,
  BarChart3,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = (session?.user as any)?.role

  const navItems = [
    { href: '/pos', label: 'Punto de Venta (POS)', icon: ShoppingCart, highlight: true },
    { href: '/', label: 'Dashboard', icon: BarChart3 },
    { href: '/productos', label: 'Productos', icon: Package },
    { href: '/lista-precios', label: 'Lista de Precios', icon: DollarSign },
    { href: '/ventas', label: 'Historial Ventas', icon: Receipt },
    { href: '/stock', label: 'Stock & Ajustes', icon: Boxes },
    { href: '/caja', label: 'Caja & Cierres', icon: Wallet },
    { href: '/compras', label: 'Compras', icon: ShoppingBag },
    { href: '/proveedores', label: 'Proveedores', icon: Truck },
    { href: '/clientes', label: 'Clientes', icon: Users },
  ]

  // Módulo exclusivo SUPER_ADMIN
  if (role === 'SUPER_ADMIN') {
    navItems.push({ href: '/usuarios', label: 'Usuarios (Admin)', icon: ShieldAlert, highlight: false })
  }

  return (
    <>
      {/* Backdrop para móviles si el sidebar está abierto */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-emerald-950 text-white transition-transform duration-300 lg:static lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo / Header Sidebar */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-emerald-900 bg-emerald-900/50">
          <Link href="/pos" className="flex items-center gap-2 font-bold text-lg text-emerald-100">
            <span className="text-2xl">🥬</span>
            <div className="leading-tight">
              <div>Doña Lorenza</div>
              <span className="text-[10px] font-normal uppercase tracking-wider text-emerald-300">
                Verdulería & Deli
              </span>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-300 hover:bg-emerald-800 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-100/80 hover:bg-emerald-900/60 hover:text-white',
                  item.highlight && !isActive && 'text-emerald-300 font-semibold bg-emerald-900/30'
                )}
              >
                <Icon className={cn('h-5 w-5 shrink-0', isActive ? 'text-white' : 'text-emerald-400')} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer Sidebar */}
        <div className="p-4 border-t border-emerald-900/80 bg-emerald-950/80">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-700 text-white font-bold text-sm">
              {session?.user?.name ? session.user.name[0].toUpperCase() : 'U'}
            </div>
            <div className="truncate text-xs">
              <p className="font-semibold text-emerald-100 truncate">{session?.user?.name || 'Vendedor'}</p>
              <p className="text-[11px] text-emerald-400 truncate">
                {role === 'SUPER_ADMIN' ? '⭐ Super Admin' : 'Vendedor'}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
