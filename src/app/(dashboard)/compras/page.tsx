'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ShoppingBag,
  Plus,
  Search,
  Calendar,
  Truck,
  DollarSign,
  AlertCircle,
  X,
  Trash2,
  CheckCircle2,
  Eye,
  CreditCard,
  Banknote,
  Landmark,
  Clock,
} from 'lucide-react'
import { formatCurrency, formatDate, formatQuantity } from '@/lib/utils'

export default function ComprasPage() {
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState('')

  // Formulario de Pago de Deuda
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('TRANSFER')
  const [payNotes, setPayNotes] = useState('')

  // Formulario Nueva Compra
  const [supplierId, setSupplierId] = useState('')
  const [voucherType, setVoucherType] = useState('Factura A')
  const [voucherNumber, setVoucherNumber] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [purchaseLines, setPurchaseLines] = useState<
    Array<{
      productId: string
      productName: string
      quantity: number
      unitAbbreviation: string
      allowsFractions: boolean
      unitCost: number
      updateCost: boolean
    }>
  >([])

  // Pago inicial
  const [initialPayType, setInitialPayType] = useState<'PENDING' | 'TOTAL' | 'PARTIAL'>('TOTAL')
  const [initialPayMethod, setInitialPayMethod] = useState('TRANSFER')
  const [initialPayAmount, setInitialPayAmount] = useState('')

  // Queries
  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ['purchases'],
    queryFn: async () => {
      const res = await fetch('/api/purchases')
      return res.json()
    },
  })

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const res = await fetch('/api/suppliers')
      return res.json()
    },
  })

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch('/api/products')
      return res.json()
    },
  })

  // Totales de métricas
  const metrics = useMemo(() => {
    let totalPurchased = 0
    let totalPending = 0

    purchases.forEach((p: any) => {
      const total = Number(p.total) || 0
      totalPurchased += total

      const paid = p.payments?.reduce((acc: number, pay: any) => acc + Number(pay.amount), 0) || 0
      if (p.paymentStatus !== 'PAID') {
        totalPending += Math.max(0, total - paid)
      }
    })

    return { totalPurchased, totalPending }
  }, [purchases])

  // Cálculo subtotal de compra en el formulario
  const newPurchaseTotal = useMemo(() => {
    return purchaseLines.reduce((acc, l) => acc + l.quantity * l.unitCost, 0)
  }, [purchaseLines])

  // Filtrado
  const filtered = useMemo(() => {
    return purchases.filter((p: any) => {
      const matchStatus = statusFilter === 'ALL' || p.paymentStatus === statusFilter
      const term = search.toLowerCase()
      const matchText =
        p.purchaseNumber.toString().includes(term) ||
        p.supplier.name.toLowerCase().includes(term) ||
        (p.voucherNumber && p.voucherNumber.toLowerCase().includes(term))
      return matchStatus && matchText
    })
  }, [purchases, statusFilter, search])

  // Agregar línea en el formulario
  const addLine = (prod: any) => {
    setPurchaseLines((prev) => [
      ...prev,
      {
        productId: prod.id,
        productName: prod.name,
        quantity: prod.unitOfMeasure.allowsFractions ? 5 : 10,
        unitAbbreviation: prod.unitOfMeasure.abbreviation,
        allowsFractions: prod.unitOfMeasure.allowsFractions,
        unitCost: Number(prod.currentPurchaseCost) || 0,
        updateCost: true,
      },
    ])
  }

  const updateLine = (index: number, field: string, value: any) => {
    setPurchaseLines((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const removeLine = (index: number) => {
    setPurchaseLines((prev) => prev.filter((_, i) => i !== index))
  }

  // Mutación Guardar Compra
  const savePurchaseMutation = useMutation({
    mutationFn: async () => {
      if (!supplierId) throw new Error('Debes seleccionar un proveedor')
      if (purchaseLines.length === 0) throw new Error('Agrega al menos un producto a la compra')

      let payData = null
      if (initialPayType === 'TOTAL') {
        payData = { method: initialPayMethod, amount: newPurchaseTotal }
      } else if (initialPayType === 'PARTIAL') {
        const val = parseFloat(initialPayAmount) || 0
        if (val <= 0) throw new Error('Ingresa un monto válido para el pago parcial')
        payData = { method: initialPayMethod, amount: val }
      }

      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId,
          voucherType,
          voucherNumber,
          dueDate: dueDate || null,
          items: purchaseLines,
          initialPayment: payData,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al registrar compra')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] })
      setIsModalOpen(false)
      setPurchaseLines([])
      setVoucherNumber('')
    },
    onError: (err: any) => setErrorMsg(err.message),
  })

  // Mutación Registrar Pago a Compra Pendiente
  const addPaymentMutation = useMutation({
    mutationFn: async () => {
      const amountNum = parseFloat(payAmount) || 0
      if (!amountNum || amountNum <= 0) throw new Error('Ingresa un monto válido')

      const res = await fetch(`/api/purchases/${selectedPurchase.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountNum,
          paymentMethod: payMethod,
          notes: payNotes,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al registrar pago')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      setIsPaymentModalOpen(false)
      setPayAmount('')
      setPayNotes('')
    },
    onError: (err: any) => setErrorMsg(err.message),
  })

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight sm:text-2xl">
            🧾 Compras y Cuentas por Pagar
          </h1>
          <p className="text-xs text-slate-500">
            Ingreso de mercadería de proveedores, actualización de costos y seguimiento de deuda
          </p>
        </div>

        <button
          onClick={() => {
            setSupplierId(suppliers[0]?.id || '')
            setPurchaseLines([])
            setErrorMsg('')
            setIsModalOpen(true)
          }}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Registrar Compra</span>
        </button>
      </div>

      {/* Métricas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500">Total Compras Acumuladas</span>
          <p className="text-xl font-black text-slate-900 mt-1">
            {formatCurrency(metrics.totalPurchased)}
          </p>
          <span className="text-[10px] text-slate-400">{purchases.length} compras registradas</span>
        </div>

        <div className="rounded-2xl bg-amber-50/70 p-4 border border-amber-200 shadow-xs">
          <span className="text-[11px] font-semibold text-amber-800">Saldo Pendiente a Proveedores</span>
          <p className="text-xl font-black text-amber-900 mt-1">
            {formatCurrency(metrics.totalPending)}
          </p>
          <span className="text-[10px] text-amber-700">Cuentas por pagar pendientes de cancelación</span>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5 rounded-2xl bg-white p-3 border border-slate-200 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por proveedor, comprobante, número..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-48 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:bg-white focus:border-emerald-600 focus:outline-none"
        >
          <option value="ALL">Todos los Estados</option>
          <option value="PAID">Pagadas</option>
          <option value="PARTIAL">Pago Parcial</option>
          <option value="PENDING">Pendientes de Pago</option>
        </select>
      </div>

      {/* Tabla de Compras */}
      <div className="overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="py-3 px-4">N° Compra</th>
                <th className="py-3 px-3">Fecha</th>
                <th className="py-3 px-3">Proveedor</th>
                <th className="py-3 px-3">Comprobante</th>
                <th className="py-3 px-3 text-right">Total</th>
                <th className="py-3 px-3 text-center">Estado Pago</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Cargando compras...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No se encontraron compras registradas
                  </td>
                </tr>
              ) : (
                filtered.map((p: any) => {
                  const paidTotal =
                    p.payments?.reduce((acc: number, pay: any) => acc + Number(pay.amount), 0) || 0
                  const isPaid = p.paymentStatus === 'PAID'
                  const isPartial = p.paymentStatus === 'PARTIAL'

                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-black text-slate-900">#{p.purchaseNumber}</td>
                      <td className="py-3 px-3 text-slate-500">{formatDate(p.createdAt)}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">{p.supplier.name}</td>
                      <td className="py-3 px-3 text-slate-600">
                        {p.voucherType ? `${p.voucherType} ` : ''}
                        {p.voucherNumber || '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-slate-900 text-sm">
                        {formatCurrency(p.total)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800'
                              : isPartial
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {isPaid ? 'PAGADA' : isPartial ? 'PARCIAL' : 'PENDIENTE'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedPurchase(p)}
                            title="Ver Detalle"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-emerald-700"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {!isPaid && (
                            <button
                              onClick={() => {
                                setSelectedPurchase(p)
                                setPayAmount((Number(p.total) - paidTotal).toString())
                                setIsPaymentModalOpen(true)
                              }}
                              title="Registrar Pago"
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
                            >
                              <DollarSign className="h-4 w-4" />
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
      {/* MODAL NUEVA COMPRA                                           */}
      {/* ============================================================ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
          <div className="flex flex-col w-full max-w-2xl max-h-[92vh] rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Registrar Compra de Mercadería</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              {errorMsg && (
                <div className="flex items-center gap-1.5 rounded-lg bg-red-50 p-2 text-xs text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Datos de cabecera */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Proveedor *</label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 focus:border-emerald-600 focus:outline-none"
                  >
                    {suppliers.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo de Comprobante</label>
                  <select
                    value={voucherType}
                    onChange={(e) => setVoucherType(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 focus:border-emerald-600 focus:outline-none"
                  >
                    <option value="Factura A">Factura A</option>
                    <option value="Factura B">Factura B</option>
                    <option value="Factura C">Factura C</option>
                    <option value="Remito">Remito</option>
                    <option value="Recibo">Recibo</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">N° Comprobante</label>
                  <input
                    type="text"
                    placeholder="0001-00045892"
                    value={voucherNumber}
                    onChange={(e) => setVoucherNumber(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Selector de productos a sumar */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    Productos Comprados ({purchaseLines.length})
                  </span>
                  <select
                    onChange={(e) => {
                      if (!e.target.value) return
                      const prod = products.find((p: any) => p.id === e.target.value)
                      if (prod) addLine(prod)
                      e.target.value = ''
                    }}
                    className="rounded-xl border border-emerald-600 bg-emerald-50 px-2 py-1 text-emerald-900 font-bold text-xs focus:outline-none"
                  >
                    <option value="">+ Agregar Producto...</option>
                    {products.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.unitOfMeasure.abbreviation})
                      </option>
                    ))}
                  </select>
                </div>

                {purchaseLines.length === 0 ? (
                  <p className="text-slate-400 italic py-4 text-center">
                    Selecciona productos en el menú desplegable superior para cargarlos a la compra.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {purchaseLines.map((line, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{line.productName}</span>
                          <button
                            onClick={() => removeLine(idx)}
                            className="text-slate-400 hover:text-red-600 p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">
                              Cantidad ({line.unitAbbreviation})
                            </label>
                            <input
                              type="number"
                              step={line.allowsFractions ? '0.01' : '1'}
                              value={line.quantity}
                              onChange={(e) =>
                                updateLine(idx, 'quantity', parseFloat(e.target.value) || 0)
                              }
                              className="w-full rounded border border-slate-300 p-1 font-bold text-right"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">
                              Costo Unitario ($)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={line.unitCost}
                              onChange={(e) =>
                                updateLine(idx, 'unitCost', parseFloat(e.target.value) || 0)
                              }
                              className="w-full rounded border border-slate-300 p-1 font-bold text-right"
                            />
                          </div>

                          <div className="text-right">
                            <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">
                              Subtotal
                            </label>
                            <span className="font-black text-slate-900 text-sm block pt-1">
                              {formatCurrency(line.quantity * line.unitCost)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 pt-1">
                          <input
                            type="checkbox"
                            id={`update-cost-${idx}`}
                            checked={line.updateCost}
                            onChange={(e) => updateLine(idx, 'updateCost', e.target.checked)}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <label htmlFor={`update-cost-${idx}`} className="text-[11px] text-slate-600">
                            Actualizar costo vigente de este producto en el catálogo
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pago Inicial / Estado */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block">
                  Condición de Pago
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'TOTAL', label: 'Pagada Total' },
                    { id: 'PARTIAL', label: 'Pago Parcial' },
                    { id: 'PENDING', label: 'A Pagar (Deuda)' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setInitialPayType(t.id as any)}
                      className={`p-2 rounded-xl border text-center font-bold transition-all ${
                        initialPayType === t.id
                          ? 'bg-emerald-50 border-emerald-600 text-emerald-800'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {initialPayType !== 'PENDING' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">
                        Medio de Pago
                      </label>
                      <select
                        value={initialPayMethod}
                        onChange={(e) => setInitialPayMethod(e.target.value)}
                        className="w-full rounded border border-slate-300 p-1.5 font-semibold"
                      >
                        <option value="TRANSFER">Transferencia</option>
                        <option value="CASH">Efectivo</option>
                        <option value="DEBIT">Tarjeta Débito</option>
                        <option value="CREDIT">Tarjeta Crédito</option>
                        <option value="QR">QR</option>
                      </select>
                    </div>

                    {initialPayType === 'PARTIAL' && (
                      <div>
                        <label className="block text-[10px] text-slate-500 font-semibold mb-0.5">
                          Monto Pagado Ahora ($)
                        </label>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={initialPayAmount}
                          onChange={(e) => setInitialPayAmount(e.target.value)}
                          className="w-full rounded border border-slate-300 p-1.5 font-bold"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Total final y confirmación */}
              <div className="flex items-baseline justify-between pt-3 border-t border-slate-200">
                <span className="font-bold text-slate-800 text-sm">Total de la Compra:</span>
                <span className="text-xl font-black text-emerald-900">
                  {formatCurrency(newPurchaseTotal)}
                </span>
              </div>

              <button
                type="button"
                disabled={savePurchaseMutation.isPending || purchaseLines.length === 0}
                onClick={() => savePurchaseMutation.mutate()}
                className="w-full rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 transition-all"
              >
                {savePurchaseMutation.isPending ? 'Guardando Compra...' : 'Confirmar e Incrementar Stock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL REGISTRAR PAGO A COMPRA PENDIENTE                      */}
      {/* ============================================================ */}
      {isPaymentModalOpen && selectedPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-sm">Registrar Pago a Proveedor</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Compra #{selectedPurchase.purchaseNumber} ({selectedPurchase.supplier.name})
            </p>

            {errorMsg && (
              <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-red-50 p-2 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="mt-3 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Monto a Pagar ($) *</label>
                <input
                  type="number"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 font-black text-sm text-emerald-800 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Medio de Pago</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 focus:border-emerald-600 focus:outline-none"
                >
                  <option value="TRANSFER">Transferencia</option>
                  <option value="CASH">Efectivo</option>
                  <option value="DEBIT">Tarjeta Débito</option>
                  <option value="CREDIT">Tarjeta Crédito</option>
                  <option value="QR">QR</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Observaciones</label>
                <input
                  type="text"
                  placeholder="Ej: Transferencia Banco Macro"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="flex-1 rounded-xl bg-slate-100 py-2.5 font-bold text-slate-600 hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={addPaymentMutation.isPending}
                onClick={() => addPaymentMutation.mutate()}
                className="flex-1 rounded-xl bg-emerald-600 py-2.5 font-bold text-white hover:bg-emerald-700"
              >
                {addPaymentMutation.isPending ? 'Guardando...' : 'Confirmar Pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL DETALLE DE COMPRA                                      */}
      {/* ============================================================ */}
      {selectedPurchase && !isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
          <div className="flex flex-col w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Detalle de Compra #{selectedPurchase.purchaseNumber}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {formatDate(selectedPurchase.createdAt)} · Proveedor: {selectedPurchase.supplier.name}
                </p>
              </div>
              <button
                onClick={() => setSelectedPurchase(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 text-xs">
              <div>
                <p className="font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                  Artículos Ingresados
                </p>
                <div className="space-y-1.5">
                  {selectedPurchase.items?.map((it: any) => (
                    <div
                      key={it.id}
                      className="flex justify-between items-center p-2 rounded-xl bg-slate-50 border border-slate-100"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{it.product.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {formatQuantity(it.quantity, it.unitAbbreviation)} × {formatCurrency(it.unitCost)}
                        </p>
                      </div>
                      <span className="font-black text-slate-900">{formatCurrency(it.lineTotal)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <p className="font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                  Pagos Realizados
                </p>
                {selectedPurchase.payments?.length === 0 ? (
                  <p className="text-slate-400 italic">No se han registrado pagos para esta compra.</p>
                ) : (
                  <div className="space-y-1">
                    {selectedPurchase.payments?.map((pay: any) => (
                      <div
                        key={pay.id}
                        className="flex justify-between p-2 rounded-lg bg-emerald-50/60 border border-emerald-100"
                      >
                        <div>
                          <span className="font-bold text-emerald-900">{pay.paymentMethod}</span>
                          <span className="text-[10px] text-slate-400 block">{formatDate(pay.paymentDate)}</span>
                        </div>
                        <span className="font-black text-emerald-800">{formatCurrency(pay.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-between items-baseline pt-3 border-t border-slate-200">
                <span className="font-bold text-slate-800 text-sm">Total Compra:</span>
                <span className="text-xl font-black text-slate-900">
                  {formatCurrency(selectedPurchase.total)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
