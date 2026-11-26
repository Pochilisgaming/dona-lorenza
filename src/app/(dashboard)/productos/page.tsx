'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  AlertCircle,
  X,
  Layers,
  Scale,
  DollarSign,
  TrendingUp,
  PowerOff,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Archive,
} from 'lucide-react'
import { formatCurrency, formatQuantity } from '@/lib/utils'

export default function ProductosPage() {
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE' | 'ALL'>('ACTIVE')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [productToDeactivate, setProductToDeactivate] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState('')

  // Formulario Producto
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [unitOfMeasureId, setUnitOfMeasureId] = useState('')
  const [currentSalePrice, setCurrentSalePrice] = useState('')
  const [currentPurchaseCost, setCurrentPurchaseCost] = useState('')
  const [currentStock, setCurrentStock] = useState('')
  const [minStock, setMinStock] = useState('')
  const [isActive, setIsActive] = useState(true)

  // Formulario Nueva Categoría Dinámica
  const [newCatName, setNewCatName] = useState('')
  const [newCatDesc, setNewCatDesc] = useState('')

  // Queries
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', 'all'],
    queryFn: async () => {
      const res = await fetch('/api/products?activeOnly=false')
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

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      const res = await fetch('/api/units')
      return res.json()
    },
  })

  // Conteo por estado
  const activeCount = useMemo(() => products.filter((p: any) => p.isActive !== false).length, [products])
  const inactiveCount = useMemo(() => products.filter((p: any) => p.isActive === false).length, [products])

  // Margen en tiempo real en formulario
  const calculatedMargin = useMemo(() => {
    const cost = parseFloat(currentPurchaseCost) || 0
    const sale = parseFloat(currentSalePrice) || 0
    if (cost <= 0) return 0
    return ((sale - cost) / cost) * 100
  }, [currentSalePrice, currentPurchaseCost])

  // Filtrado
  const filtered = useMemo(() => {
    return products.filter((p: any) => {
      // Filtro de estado
      if (statusFilter === 'ACTIVE' && p.isActive === false) return false
      if (statusFilter === 'INACTIVE' && p.isActive !== false) return false

      // Filtro de categoría
      const matchCat = selectedCategory === 'ALL' || p.categoryId === selectedCategory

      // Filtro de texto
      const matchText =
        search === '' ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.code && p.code.toLowerCase().includes(search.toLowerCase()))

      return matchCat && matchText
    })
  }, [products, statusFilter, selectedCategory, search])

  const openCreateModal = () => {
    setEditingProduct(null)
    setName('')
    setCode('')
    setDescription('')
    setCategoryId(categories[0]?.id || '')
    setUnitOfMeasureId(units[0]?.id || '')
    setCurrentSalePrice('')
    setCurrentPurchaseCost('')
    setCurrentStock('0')
    setMinStock('5')
    setIsActive(true)
    setErrorMsg('')
    setIsModalOpen(true)
  }

  const openEditModal = (p: any) => {
    setEditingProduct(p)
    setName(p.name)
    setCode(p.code || '')
    setDescription(p.description || '')
    setCategoryId(p.categoryId)
    setUnitOfMeasureId(p.unitOfMeasureId)
    setCurrentSalePrice(p.currentSalePrice.toString())
    setCurrentPurchaseCost(p.currentPurchaseCost.toString())
    setCurrentStock(p.currentStock.toString())
    setMinStock(p.minStock.toString())
    setIsActive(p.isActive !== false)
    setErrorMsg('')
    setIsModalOpen(true)
  }

  // Mutation Guardar Producto
  const saveProductMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        code,
        description,
        categoryId,
        unitOfMeasureId,
        currentSalePrice: parseFloat(currentSalePrice) || 0,
        currentPurchaseCost: parseFloat(currentPurchaseCost) || 0,
        currentStock: parseFloat(currentStock) || 0,
        minStock: parseFloat(minStock) || 0,
        isActive: Boolean(isActive),
      }

      const url = '/api/products'
      const method = editingProduct ? 'PUT' : 'POST'
      const body = editingProduct ? { ...payload, id: editingProduct.id } : payload

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al guardar el producto')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setIsModalOpen(false)
    },
    onError: (err: any) => {
      setErrorMsg(err.message)
    },
  })

  // Mutation para Dar de Baja o Reactivar producto rápidamente
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: boolean }) => {
      const res = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: newStatus }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al cambiar estado del producto')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setProductToDeactivate(null)
    },
    onError: (err: any) => {
      alert(`Error: ${err.message}`)
    },
  })

  // Mutation Crear Categoría Dinámica
  const createCategoryMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName, description: newCatDesc }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al crear la categoría')
      }
      return res.json()
    },
    onSuccess: (newCat) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setCategoryId(newCat.id)
      setIsCategoryModalOpen(false)
      setNewCatName('')
      setNewCatDesc('')
    },
    onError: (err: any) => {
      setErrorMsg(err.message)
    },
  })

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight sm:text-2xl">
            📦 Gestión de Productos
          </h1>
          <p className="text-xs text-slate-500">
            Control de artículos, categorías dinámicas, costos, precios, bajas y reactivaciones
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-all"
          >
            <Layers className="h-4 w-4 text-emerald-600" />
            <span>+ Categoría Dinámica</span>
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros, Búsqueda y Segmentador de Estado */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 rounded-2xl bg-white p-3 border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-emerald-600 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Segmentador de Estado: Activos / Dados de Baja / Todos */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-bold transition-all ${
                statusFilter === 'ACTIVE'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Activos ({activeCount})</span>
            </button>
            <button
              onClick={() => setStatusFilter('INACTIVE')}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-bold transition-all ${
                statusFilter === 'INACTIVE'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Archive className="h-3.5 w-3.5" />
              <span>Dados de Baja ({inactiveCount})</span>
            </button>
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`rounded-lg px-2.5 py-1 font-bold transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Todos ({products.length})</span>
            </button>
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-48 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white focus:border-emerald-600 focus:outline-none"
          >
            <option value="ALL">Todas las Categorías</option>
            {categories.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla de Productos */}
      <div className="overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="py-3 px-4">Producto</th>
                <th className="py-3 px-3">Estado</th>
                <th className="py-3 px-3">Categoría</th>
                <th className="py-3 px-3">Unidad</th>
                <th className="py-3 px-3 text-right">Costo</th>
                <th className="py-3 px-3 text-right">Precio Venta</th>
                <th className="py-3 px-3 text-right">Margen</th>
                <th className="py-3 px-3 text-right">Stock</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Cargando productos...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No se encontraron productos para los filtros seleccionados
                  </td>
                </tr>
              ) : (
                filtered.map((p: any) => {
                  const cost = Number(p.currentPurchaseCost)
                  const sale = Number(p.currentSalePrice)
                  const margin = cost > 0 ? ((sale - cost) / cost) * 100 : 0
                  const isLow = Number(p.currentStock) <= Number(p.minStock)
                  const isProdActive = p.isActive !== false

                  return (
                    <tr
                      key={p.id}
                      className={`transition-colors ${
                        !isProdActive ? 'bg-slate-50/70 opacity-75' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className={`font-bold ${isProdActive ? 'text-slate-900' : 'text-slate-500 line-through'}`}>
                          {p.name}
                        </div>
                        {p.code && <div className="text-[10px] text-slate-400 font-mono">{p.code}</div>}
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-3">
                        {isProdActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-black text-rose-700 border border-rose-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                            Dado de Baja
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                          {p.category.name}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                          {p.unitOfMeasure.name} ({p.unitOfMeasure.abbreviation})
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right text-slate-500 font-semibold">
                        {formatCurrency(cost)}
                      </td>

                      <td className="py-3 px-3 text-right font-black text-emerald-700">
                        {formatCurrency(sale)}
                      </td>

                      <td className="py-3 px-3 text-right font-bold text-slate-700">
                        +{margin.toFixed(1)}%
                      </td>

                      <td className="py-3 px-3 text-right">
                        <span
                          className={`font-black ${
                            isLow ? 'text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded' : 'text-slate-800'
                          }`}
                        >
                          {formatQuantity(p.currentStock, p.unitOfMeasure.abbreviation)}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditModal(p)}
                            title="Editar producto"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-emerald-700 transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>

                          {isProdActive ? (
                            <button
                              onClick={() => setProductToDeactivate(p)}
                              title="Dar de baja producto"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                            >
                              <PowerOff className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => toggleStatusMutation.mutate({ id: p.id, newStatus: true })}
                              title="Reactivar producto"
                              className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 transition-colors"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL: CONFIRMACIÓN PARA DAR DE BAJA UN PRODUCTO             */}
      {/* ============================================================ */}
      {productToDeactivate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
          <div className="flex flex-col w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-3">
              <PowerOff className="h-6 w-6" />
            </div>

            <h3 className="text-center font-black text-slate-900 text-base">
              ¿Dar de baja este producto?
            </h3>
            <p className="text-center text-xs text-slate-500 mt-1">
              Estás por dar de baja <strong className="text-slate-800 font-bold">{productToDeactivate.name}</strong>.
            </p>

            <div className="my-3 rounded-xl bg-slate-50 p-2.5 text-[11px] text-slate-600 border border-slate-200">
              <p>• Dejará de aparecer en el mostrador del Punto de Venta (POS).</p>
              <p>• Se preservará su historial de ventas, stock y precios.</p>
              <p>• Podrás reactivarlo cuando desees con un solo clic.</p>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => setProductToDeactivate(null)}
                className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={toggleStatusMutation.isPending}
                onClick={() =>
                  toggleStatusMutation.mutate({ id: productToDeactivate.id, newStatus: false })
                }
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-rose-700 disabled:opacity-50 transition-all"
              >
                {toggleStatusMutation.isPending ? 'Procesando...' : 'Dar de Baja'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: ALTA / EDICIÓN DE PRODUCTO                            */}
      {/* ============================================================ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
          <div className="flex flex-col w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                saveProductMutation.mutate()
              }}
              className="p-4 space-y-3 overflow-y-auto"
            >
              {errorMsg && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 p-2.5 text-xs text-red-700 border border-red-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Selector de Estado Activo / Inactivo */}
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-200">
                <div>
                  <label className="text-xs font-bold text-slate-800 block">
                    Estado del Producto
                  </label>
                  <span className="text-[10px] text-slate-500">
                    {isActive ? 'Activo y disponible para cobrar en POS' : 'Dado de baja (no visible en POS)'}
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre del Producto *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Tomate Cherry Especial"
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Código / Barras</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Ej: VERD-TOM-CH"
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Categoría Dinámica *</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-emerald-600 focus:outline-none"
                  >
                    {categories.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Unidad de Medida *</label>
                <select
                  value={unitOfMeasureId}
                  onChange={(e) => setUnitOfMeasureId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-emerald-600 focus:outline-none"
                >
                  {units.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.abbreviation}) — {u.allowsFractions ? 'Permite decimales' : 'Enteros'}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  La unidad de medida puede modificarse en cualquier momento.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Costo de Compra ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={currentPurchaseCost}
                    onChange={(e) => setCurrentPurchaseCost(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs font-bold focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Precio de Venta ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={currentSalePrice}
                    onChange={(e) => setCurrentSalePrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs font-black text-emerald-800 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Margen Calculado Visual */}
              <div className="flex items-center justify-between rounded-xl bg-emerald-50/70 p-2 border border-emerald-200 text-xs">
                <span className="text-emerald-900 font-semibold flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Margen Comercial Estimado:
                </span>
                <span className="font-black text-emerald-800">+{calculatedMargin.toFixed(1)}%</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {!editingProduct && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Stock Inicial</label>
                    <input
                      type="number"
                      step="0.01"
                      value={currentStock}
                      onChange={(e) => setCurrentStock(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Stock Mínimo (Alerta)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saveProductMutation.isPending}
                className="w-full mt-3 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition-all"
              >
                {saveProductMutation.isPending ? 'Guardando...' : editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: ALTA RÁPIDA DE CATEGORÍA DINÁMICA                     */}
      {/* ============================================================ */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
          <div className="flex flex-col w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-emerald-50">
              <h3 className="font-bold text-slate-900 text-sm">Nueva Categoría Dinámica</h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                createCategoryMutation.mutate()
              }}
              className="p-4 space-y-3"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre de la Categoría *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Dulces & Mermeladas Artesanales"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Descripción (opcional)</label>
                <input
                  type="text"
                  placeholder="Detalles sobre los productos de esta categoría"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={createCategoryMutation.isPending}
                className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition-all"
              >
                {createCategoryMutation.isPending ? 'Guardando...' : 'Crear y Asignar'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
