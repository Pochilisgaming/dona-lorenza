'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import {
  DollarSign,
  Search,
  Download,
  Edit2,
  Check,
  X,
  History,
  TrendingUp,
  ShieldAlert,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function ListaPreciosPage() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const isSuperAdmin = (session?.user as any)?.role === 'SUPER_ADMIN'

  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newSalePrice, setNewSalePrice] = useState<string>('')
  const [newPurchaseCost, setNewPurchaseCost] = useState<string>('')
  const [selectedProductHistory, setSelectedProductHistory] = useState<any>(null)

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch('/api/products')
      return res.json()
    },
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetch('/api/categories')
      return res.json()
    },
  })

  const filtered = useMemo(() => {
    return products.filter((p: any) => {
      const matchCat = selectedCategory === 'ALL' || p.categoryId === selectedCategory
      const matchText =
        search === '' ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.code && p.code.toLowerCase().includes(search.toLowerCase()))
      return matchCat && matchText
    })
  }, [products, selectedCategory, search])

  // Mutación para editar precio
  const updatePriceMutation = useMutation({
    mutationFn: async ({ id, salePrice, purchaseCost }: { id: string; salePrice: number; purchaseCost: number }) => {
      const res = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          currentSalePrice: salePrice,
          currentPurchaseCost: purchaseCost,
          changeReason: 'Actualización rápida desde Lista de Precios',
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al actualizar precio')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setEditingId(null)
    },
  })

  const startEdit = (p: any) => {
    if (!isSuperAdmin) return
    setEditingId(p.id)
    setNewSalePrice(p.currentSalePrice.toString())
    setNewPurchaseCost(p.currentPurchaseCost.toString())
  }

  const saveEdit = (id: string) => {
    const sale = parseFloat(newSalePrice)
    const cost = parseFloat(newPurchaseCost)
    if (isNaN(sale) || isNaN(cost)) return
    updatePriceMutation.mutate({ id, salePrice: sale, purchaseCost: cost })
  }

  // Exportar a CSV
  const exportCSV = () => {
    const headers = isSuperAdmin
      ? ['Codigo', 'Producto', 'Categoria', 'Unidad', 'Costo', 'PrecioVenta', 'Margen%']
      : ['Codigo', 'Producto', 'Categoria', 'Unidad', 'PrecioVenta']

    const rows = filtered.map((p: any) => {
      const cost = Number(p.currentPurchaseCost)
      const sale = Number(p.currentSalePrice)
      const margin = cost > 0 ? (((sale - cost) / cost) * 100).toFixed(1) : '0'

      if (isSuperAdmin) {
        return [p.code || '', `"${p.name}"`, `"${p.category.name}"`, p.unitOfMeasure.abbreviation, cost, sale, margin]
      }
      return [p.code || '', `"${p.name}"`, `"${p.category.name}"`, p.unitOfMeasure.abbreviation, sale]
    })

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `lista-precios-dona-lorenza-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight sm:text-2xl">
              💲 Lista de Precios Vigentes
            </h1>
            {isSuperAdmin ? (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                Modo Edición Habilitado (Super Admin)
              </span>
            ) : (
              <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600">
                Solo Lectura
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Precios y unidades actualizadas al instante para todo el equipo
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-all"
        >
          <Download className="h-4 w-4 text-emerald-700" />
          <span>Descargar Lista (CSV)</span>
        </button>
      </div>

      {/* Buscador y filtro */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5 rounded-2xl bg-white p-3 border border-slate-200 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar en la lista de precios..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full sm:w-56 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white focus:border-emerald-600 focus:outline-none"
        >
          <option value="ALL">Todas las Categorías</option>
          {categories.map((c: any) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tabla de Precios */}
      <div className="overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="py-3 px-4">Producto</th>
                <th className="py-3 px-3">Categoría</th>
                <th className="py-3 px-3">Unidad</th>
                {isSuperAdmin && <th className="py-3 px-3 text-right">Costo Compra</th>}
                <th className="py-3 px-3 text-right">Precio de Venta</th>
                {isSuperAdmin && <th className="py-3 px-3 text-right">Margen</th>}
                <th className="py-3 px-4 text-center">Historial</th>
                {isSuperAdmin && <th className="py-3 px-4 text-center">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 8 : 5} className="py-8 text-center text-slate-400">
                    Cargando lista de precios...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={isSuperAdmin ? 8 : 5} className="py-8 text-center text-slate-400">
                    No se encontraron productos
                  </td>
                </tr>
              ) : (
                filtered.map((p: any) => {
                  const isEditing = editingId === p.id
                  const cost = Number(p.currentPurchaseCost)
                  const sale = Number(p.currentSalePrice)
                  const margin = cost > 0 ? ((sale - cost) / cost) * 100 : 0

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{p.name}</div>
                        {p.code && <div className="text-[10px] text-slate-400 font-mono">{p.code}</div>}
                      </td>

                      <td className="py-3 px-3">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                          {p.category.name}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                          {p.unitOfMeasure.abbreviation}
                        </span>
                      </td>

                      {/* Costo (exclusivo Super Admin) */}
                      {isSuperAdmin && (
                        <td className="py-3 px-3 text-right">
                          {isEditing ? (
                            <input
                              type="number"
                              value={newPurchaseCost}
                              onChange={(e) => setNewPurchaseCost(e.target.value)}
                              className="w-20 rounded border border-slate-300 p-1 text-right font-semibold text-xs"
                            />
                          ) : (
                            <span className="text-slate-500 font-semibold">{formatCurrency(cost)}</span>
                          )}
                        </td>
                      )}

                      {/* Precio de Venta */}
                      <td className="py-3 px-3 text-right font-black">
                        {isEditing ? (
                          <input
                            type="number"
                            value={newSalePrice}
                            onChange={(e) => setNewSalePrice(e.target.value)}
                            className="w-24 rounded border border-emerald-500 p-1 text-right font-black text-emerald-800 text-xs"
                          />
                        ) : (
                          <span className="text-emerald-700 text-sm">{formatCurrency(sale)}</span>
                        )}
                      </td>

                      {/* Margen (exclusivo Super Admin) */}
                      {isSuperAdmin && (
                        <td className="py-3 px-3 text-right font-bold text-slate-700">
                          +{margin.toFixed(1)}%
                        </td>
                      )}

                      {/* Botón Ver Historial */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelectedProductHistory(p)}
                          title="Ver historial de cambios de precio"
                          className="rounded-lg p-1 text-slate-400 hover:text-emerald-700 hover:bg-slate-100"
                        >
                          <History className="h-4 w-4" />
                        </button>
                      </td>

                      {/* Acciones de edición rápida (solo Super Admin) */}
                      {isSuperAdmin && (
                        <td className="py-3 px-4 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => saveEdit(p.id)}
                                className="rounded p-1 bg-emerald-600 text-white hover:bg-emerald-700"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="rounded p-1 bg-slate-200 text-slate-600 hover:bg-slate-300"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEdit(p)}
                              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-emerald-700"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL: HISTORIAL DE PRECIOS REGISTRADOS                      */}
      {/* ============================================================ */}
      {selectedProductHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
          <div className="flex flex-col w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Historial de Precios</h3>
                <p className="text-xs text-emerald-800 font-semibold">{selectedProductHistory.name}</p>
              </div>
              <button
                onClick={() => setSelectedProductHistory(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-80 space-y-2">
              {selectedProductHistory.priceHistories && selectedProductHistory.priceHistories.length > 0 ? (
                selectedProductHistory.priceHistories.map((h: any) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50 text-xs"
                  >
                    <div>
                      <p className="font-black text-emerald-700 text-sm">
                        {formatCurrency(h.salePrice)}
                        {isSuperAdmin && (
                          <span className="text-[11px] text-slate-400 font-normal ml-2">
                            (Costo: {formatCurrency(h.purchaseCost)})
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {h.changeReason || 'Modificación registrada'}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {formatDate(h.effectiveFrom)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">
                  No hay registros históricos adicionales para este producto.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
