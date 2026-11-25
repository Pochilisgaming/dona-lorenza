'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Receipt,
  Search,
  Calendar,
  Eye,
  CheckCircle2,
  XCircle,
  X,
  CreditCard,
  Banknote,
  QrCode,
  Landmark,
} from 'lucide-react'
import { formatCurrency, formatDate, formatQuantity } from '@/lib/utils'

export default function VentasPage() {
  const [selectedSale, setSelectedSale] = useState<any>(null)
  const [search, setSearch] = useState('')

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      const res = await fetch('/api/sales')
      return res.json()
    },
  })

  const filtered = sales.filter((s: any) => {
    const term = search.toLowerCase()
    return (
      s.saleNumber.toString().includes(term) ||
      s.user.fullName.toLowerCase().includes(term) ||
      (s.customer && s.customer.fullName.toLowerCase().includes(term))
    )
  })

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight sm:text-2xl">
          📋 Historial de Ventas
        </h1>
        <p className="text-xs text-slate-500">
          Registro completo de operaciones, medios de pago, snapshots históricos y trazabilidad
        </p>
      </div>

      {/* Buscador */}
      <div className="rounded-2xl bg-white p-3 border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por número de ticket o vendedor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Tabla de Ventas */}
      <div className="overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="py-3 px-4">N° Ticket</th>
                <th className="py-3 px-3">Fecha y Hora</th>
                <th className="py-3 px-3">Vendedor</th>
                <th className="py-3 px-3">Medios de Pago</th>
                <th className="py-3 px-3 text-right">Total Cobrado</th>
                <th className="py-3 px-4 text-center">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Cargando ventas...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No se encontraron ventas registradas
                  </td>
                </tr>
              ) : (
                filtered.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-black text-slate-900">#{s.saleNumber}</td>
                    <td className="py-3 px-3 text-slate-600">{formatDate(s.createdAt)}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{s.user.fullName}</td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1">
                        {s.payments.map((p: any) => (
                          <span
                            key={p.id}
                            className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700"
                          >
                            {p.paymentMethod}: {formatCurrency(p.amount)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-black text-emerald-800 text-sm">
                      {formatCurrency(s.total)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedSale(s)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-emerald-700"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DETALLE DE VENTA */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
          <div className="flex flex-col w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Detalle de Venta #{selectedSale.saleNumber}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {formatDate(selectedSale.createdAt)} · Vendedor: {selectedSale.user.fullName}
                </p>
              </div>
              <button
                onClick={() => setSelectedSale(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3">
              {/* Líneas de venta */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-700">Artículos</p>
                <div className="space-y-1.5">
                  {selectedSale.items
                    .filter((it: any) => !it.parentItemId)
                    .map((it: any) => (
                      <div
                        key={it.id}
                        className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 text-xs"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-slate-900">{it.product.name}</p>
                            <p className="text-[11px] text-slate-500">
                              {formatQuantity(it.quantity, it.unitAbbreviation)} × {formatCurrency(it.unitSalePrice)}
                            </p>
                          </div>
                          <span className="font-black text-slate-900 text-sm">
                            {formatCurrency(it.lineTotal)}
                          </span>
                        </div>

                        {/* Si tiene sub-items (ej. Sándwich armado) */}
                        {it.subItems && it.subItems.length > 0 && (
                          <div className="mt-2 pl-3 border-l-2 border-amber-400 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                              Ingredientes utilizados:
                            </span>
                            {it.subItems.map((sub: any) => (
                              <div
                                key={sub.id}
                                className="flex justify-between text-[11px] text-slate-600"
                              >
                                <span>
                                  • {sub.product.name} ({formatQuantity(sub.quantity, sub.unitAbbreviation)})
                                </span>
                                <span>{formatCurrency(sub.lineTotal)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              {/* Pagos */}
              <div className="pt-2 border-t border-slate-200">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Medios de Pago
                </p>
                <div className="space-y-1">
                  {selectedSale.payments.map((p: any) => (
                    <div
                      key={p.id}
                      className="flex justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-100"
                    >
                      <span className="font-bold text-slate-800">{p.paymentMethod}</span>
                      <span className="font-black text-emerald-800">{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total final */}
              <div className="flex justify-between items-baseline pt-3 border-t border-slate-200">
                <span className="font-bold text-slate-800 text-sm">Total Cobrado:</span>
                <span className="text-xl font-black text-emerald-900">
                  {formatCurrency(selectedSale.total)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
