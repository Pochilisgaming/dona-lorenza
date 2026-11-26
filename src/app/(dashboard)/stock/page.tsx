'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Boxes,
  AlertTriangle,
  Plus,
  Search,
  ClipboardList,
  ArrowUpDown,
  History,
  CheckCircle2,
  X,
} from 'lucide-react'
import { formatQuantity, formatDate } from '@/lib/utils'

export default function StockPage() {
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [adjustmentType, setAdjustmentType] = useState('ADJUSTMENT_OUT')
  const [adjustmentQuantity, setAdjustmentQuantity] = useState('')
  const [adjustmentNotes, setAdjustmentNotes] = useState('')
  const [activeTab, setActiveTab] = useState<'STOCK' | 'MOVEMENTS'>('STOCK')

  // Queries
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['products', 'active-only'],
    queryFn: async () => {
      const res = await fetch('/api/products?activeOnly=true')
      return res.json()
    },
  })

  const { data: movements = [], isLoading: loadingMovements } = useQuery({
    queryKey: ['stock-movements'],
    queryFn: async () => {
      const res = await fetch('/api/stock')
      return res.json()
    },
  })

  // Mutación ajuste de stock
  const adjustmentMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          type: adjustmentType,
          quantity: parseFloat(adjustmentQuantity) || 0,
          notes: adjustmentNotes,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al registrar ajuste')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] })
      setIsAdjustmentModalOpen(false)
      setSelectedProductId('')
      setAdjustmentQuantity('')
      setAdjustmentNotes('')
    },
  })

  const filteredProducts = products.filter((p: any) =>
    p.isActive !== false && (
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.code && p.code.toLowerCase().includes(search.toLowerCase()))
    )
  )

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight sm:text-2xl">
            📊 Control de Stock e Inventario
          </h1>
          <p className="text-xs text-slate-500">
            Seguimiento de existencias, alertas de reposición, mermas y auditoría de movimientos
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedProductId(products[0]?.id || '')
            setIsAdjustmentModalOpen(true)
          }}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Ajuste / Merma / Conteo</span>
        </button>
      </div>

      {/* Selector de Solapa */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-bold">
        <button
          onClick={() => setActiveTab('STOCK')}
          className={`pb-2.5 px-3 border-b-2 transition-all ${
            activeTab === 'STOCK'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Existencias Actuales
        </button>
        <button
          onClick={() => setActiveTab('MOVEMENTS')}
          className={`pb-2.5 px-3 border-b-2 transition-all ${
            activeTab === 'MOVEMENTS'
              ? 'border-emerald-600 text-emerald-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Historial de Movimientos
        </button>
      </div>

      {activeTab === 'STOCK' ? (
        <>
          {/* Buscador */}
          <div className="rounded-2xl bg-white p-3 border border-slate-200 shadow-xs">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar artículo en stock..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Tabla de Stock */}
          <div className="overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[10px] font-bold">
                  <tr>
                    <th className="py-3 px-4">Producto</th>
                    <th className="py-3 px-3">Categoría</th>
                    <th className="py-3 px-3">Unidad</th>
                    <th className="py-3 px-3 text-right">Stock Actual</th>
                    <th className="py-3 px-3 text-right">Stock Mínimo</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {loadingProducts ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Cargando inventario...
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No se encontraron productos
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p: any) => {
                      const isLow = Number(p.currentStock) <= Number(p.minStock)
                      return (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-bold text-slate-900">{p.name}</td>
                          <td className="py-3 px-3 text-slate-600">{p.category.name}</td>
                          <td className="py-3 px-3">
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                              {p.unitOfMeasure.abbreviation}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-black text-slate-900 text-sm">
                            {formatQuantity(p.currentStock, p.unitOfMeasure.abbreviation)}
                          </td>
                          <td className="py-3 px-3 text-right text-slate-500">
                            {formatQuantity(p.minStock, p.unitOfMeasure.abbreviation)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isLow ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                <AlertTriangle className="h-3 w-3" />
                                Reponer
                              </span>
                            ) : (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                Normal
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Historial de Movimientos */
        <div className="overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-3">Producto</th>
                  <th className="py-3 px-3">Tipo</th>
                  <th className="py-3 px-3 text-right">Cantidad</th>
                  <th className="py-3 px-3 text-right">Stock Resultante</th>
                  <th className="py-3 px-4">Detalle / Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {loadingMovements ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Cargando movimientos...
                    </td>
                  </tr>
                ) : movements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No hay movimientos registrados
                    </td>
                  </tr>
                ) : (
                  movements.map((m: any) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 text-slate-500">{formatDate(m.createdAt)}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{m.product.name}</td>
                      <td className="py-2.5 px-3">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                          {m.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-black">
                        {formatQuantity(m.quantity, m.unitAbbreviation)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600 font-semibold">
                        {formatQuantity(m.stockAfter, m.unitAbbreviation)}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 text-[11px]">{m.notes || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DE AJUSTE / MERMA / INVENTARIO */}
      {isAdjustmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-sm">Registrar Ajuste de Stock</h3>

            <div className="mt-3 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Producto</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 focus:border-emerald-600 focus:outline-none"
                >
                  {products.filter((p: any) => p.isActive !== false).map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Actual: {p.currentStock} {p.unitOfMeasure.abbreviation})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tipo de Ajuste</label>
                <select
                  value={adjustmentType}
                  onChange={(e) => setAdjustmentType(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 focus:border-emerald-600 focus:outline-none"
                >
                  <option value="ADJUSTMENT_OUT">Salida (Merma / Rotura / Vencimiento)</option>
                  <option value="ADJUSTMENT_IN">Entrada (Ajuste a favor / Sobrante)</option>
                  <option value="INVENTORY">Conteo Físico Real (Reemplazo total)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Cantidad</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={adjustmentQuantity}
                  onChange={(e) => setAdjustmentQuantity(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 font-bold focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Motivo / Observaciones</label>
                <input
                  type="text"
                  placeholder="Ej: Tomate descartado por madurez"
                  value={adjustmentNotes}
                  onChange={(e) => setAdjustmentNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setIsAdjustmentModalOpen(false)}
                className="flex-1 rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                disabled={adjustmentMutation.isPending}
                onClick={() => adjustmentMutation.mutate()}
                className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
              >
                {adjustmentMutation.isPending ? 'Guardando...' : 'Guardar Ajuste'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
