'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  TrendingUp,
  ShoppingCart,
  Boxes,
  Wallet,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  Utensils,
  Receipt,
} from 'lucide-react'
import { formatCurrency, formatQuantity } from '@/lib/utils'

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-reports'],
    queryFn: async () => {
      const res = await fetch('/api/reports')
      return res.json()
    },
  })

  return (
    <div className="space-y-6">
      {/* Saludo y Accesos Rápidos */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-emerald-900 rounded-3xl p-6 text-white shadow-lg">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
            Panel de Control Diario
          </span>
          <h1 className="text-2xl font-black mt-1">🥬 Doña Lorenza — Gestión Activa</h1>
          <p className="text-xs text-emerald-100/80 mt-1 max-w-lg">
            Sistema POS, trazabilidad de costos, control de stock y sándwiches al momento
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/pos"
            className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-xs font-black text-emerald-950 shadow-md hover:bg-emerald-50 active:scale-95 transition-all"
          >
            <ShoppingCart className="h-4 w-4 text-emerald-600" />
            <span>ABRIR POS / COBRO</span>
          </Link>
        </div>
      </div>

      {/* Métricas Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ventas Hoy */}
        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Ventas Hoy</span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {formatCurrency(data?.todayTotal || 0)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {data?.todaySalesCount || 0} tickets registrados hoy
          </span>
        </div>

        {/* Ganancia Estimada */}
        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Margen Bruto del Día</span>
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-blue-900 mt-2">
            {formatCurrency(data?.todayProfit || 0)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Calculado con costos históricos
          </span>
        </div>

        {/* Estado de Caja */}
        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Estado de Caja</span>
            <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`h-3 w-3 rounded-full ${
                data?.openRegister ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
              }`}
            />
            <p className="text-lg font-black text-slate-900">
              {data?.openRegister ? 'Caja Abierta' : 'Caja Cerrada'}
            </p>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {data?.openRegister
              ? `Turno de ${data.openRegister.openedBy?.fullName}`
              : 'Se requiere abrir caja para operar'}
          </span>
        </div>

        {/* Alertas de Stock */}
        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Alertas de Stock</span>
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-900 mt-2">
            {data?.lowStockProducts?.length || 0}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Productos en nivel crítico o por debajo de stock mínimo
          </span>
        </div>
      </div>

      {/* Grilla 2 Columnas: Desglose de cobros + Alertas de Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Desglose por medio de pago */}
        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs space-y-3">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Cobros de Hoy por Medio de Pago
          </h2>
          <div className="space-y-2">
            {[
              { label: 'Efectivo en Caja', key: 'CASH', color: 'bg-emerald-600' },
              { label: 'QR / Billeteras Virtuales', key: 'QR', color: 'bg-sky-600' },
              { label: 'Tarjeta de Débito', key: 'DEBIT', color: 'bg-indigo-600' },
              { label: 'Tarjeta de Crédito', key: 'CREDIT', color: 'bg-purple-600' },
              { label: 'Transferencia Bancaria', key: 'TRANSFER', color: 'bg-amber-600' },
            ].map((m) => {
              const amount = data?.paymentBreakdown?.[m.key] || 0
              return (
                <div
                  key={m.key}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${m.color}`} />
                    <span className="font-semibold text-slate-700">{m.label}</span>
                  </div>
                  <span className="font-black text-slate-900">{formatCurrency(amount)}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Productos con Stock Bajo */}
        <div className="rounded-2xl bg-white p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Productos para Reposición
            </h2>
            <Link href="/stock" className="text-xs font-bold text-emerald-700 hover:underline">
              Ver stock completo
            </Link>
          </div>

          <div className="space-y-2">
            {data?.lowStockProducts?.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                Todo el inventario está por encima del stock mínimo.
              </p>
            ) : (
              data?.lowStockProducts?.slice(0, 5).map((p: any) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/60 border border-amber-200 text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-900">{p.name}</p>
                    <p className="text-[10px] text-slate-500">{p.category.name}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-amber-800">
                      {formatQuantity(p.currentStock, p.unitOfMeasure.abbreviation)}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Mín: {formatQuantity(p.minStock, p.unitOfMeasure.abbreviation)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
