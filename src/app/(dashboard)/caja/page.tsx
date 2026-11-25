'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Wallet,
  Lock,
  Unlock,
  ArrowDownCircle,
  ArrowUpCircle,
  AlertCircle,
  CheckCircle2,
  Calendar,
  X,
  Plus,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function CajaPage() {
  const queryClient = useQueryClient()

  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false)
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false)
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false)

  const [openingAmount, setOpeningAmount] = useState('')
  const [declaredCash, setDeclaredCash] = useState('')
  const [movementType, setMovementType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE')
  const [movementAmount, setMovementAmount] = useState('')
  const [movementDescription, setMovementDescription] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Query caja activa
  const { data: status, isLoading } = useQuery({
    queryKey: ['cash-register-status'],
    queryFn: async () => {
      const res = await fetch('/api/cash-register')
      return res.json()
    },
  })

  // Query historial de cajas
  const { data: history = [] } = useQuery({
    queryKey: ['cash-register-history'],
    queryFn: async () => {
      const res = await fetch('/api/cash-register?history=true')
      return res.json()
    },
  })

  // Mutación apertura
  const openMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/cash-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'OPEN',
          openingAmount: parseFloat(openingAmount) || 0,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al abrir caja')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-register-status'] })
      queryClient.invalidateQueries({ queryKey: ['cash-register-history'] })
      setIsOpeningModalOpen(false)
      setOpeningAmount('')
    },
    onError: (err: any) => setErrorMsg(err.message),
  })

  // Mutación cierre
  const closeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/cash-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CLOSE',
          declaredCash: parseFloat(declaredCash) || 0,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al cerrar caja')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-register-status'] })
      queryClient.invalidateQueries({ queryKey: ['cash-register-history'] })
      setIsClosingModalOpen(false)
      setDeclaredCash('')
    },
    onError: (err: any) => setErrorMsg(err.message),
  })

  // Mutación movimiento
  const movementMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/cash-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'MOVEMENT',
          type: movementType,
          amount: parseFloat(movementAmount) || 0,
          description: movementDescription,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al registrar movimiento')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-register-status'] })
      setIsMovementModalOpen(false)
      setMovementAmount('')
      setMovementDescription('')
    },
    onError: (err: any) => setErrorMsg(err.message),
  })

  const reg = status?.register
  const isOpen = status?.isOpen

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight sm:text-2xl">
            💰 Control y Cierre de Caja
          </h1>
          <p className="text-xs text-slate-500">
            Aperturas, movimientos de efectivo, arqueo y desglose multi-medio de pago
          </p>
        </div>

        {isOpen ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setErrorMsg('')
                setIsMovementModalOpen(true)
              }}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-all"
            >
              <Plus className="h-4 w-4 text-emerald-700" />
              <span>Ingreso / Retiro</span>
            </button>

            <button
              onClick={() => {
                setErrorMsg('')
                setIsClosingModalOpen(true)
              }}
              className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 transition-all"
            >
              <Lock className="h-4 w-4" />
              <span>Cerrar Turno de Caja</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setErrorMsg('')
              setIsOpeningModalOpen(true)
            }}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-all"
          >
            <Unlock className="h-4 w-4" />
            <span>Abrir Caja de Turno</span>
          </button>
        )}
      </div>

      {/* ESTADO ACTUAL DE LA CAJA */}
      {isOpen && reg ? (
        <div className="space-y-4">
          {/* Tarjetas de Resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500">Monto Inicial en Efectivo</span>
              <p className="text-xl font-black text-slate-900 mt-1">
                {formatCurrency(reg.openingAmount)}
              </p>
              <span className="text-[10px] text-slate-400">
                Abierta por {reg.openedBy?.fullName} a las {formatDate(reg.openedAt)}
              </span>
            </div>

            <div className="rounded-2xl bg-emerald-50/70 p-4 border border-emerald-200 shadow-xs">
              <span className="text-[11px] font-semibold text-emerald-800">Efectivo Esperado en Gaveta</span>
              <p className="text-xl font-black text-emerald-900 mt-1">
                {formatCurrency(reg.expectedCash)}
              </p>
              <span className="text-[10px] text-emerald-700">Inicial + Ventas Efvo + Movimientos</span>
            </div>

            <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500">Ventas Totales del Turno</span>
              <p className="text-xl font-black text-slate-900 mt-1">
                {formatCurrency(
                  Object.values(reg.paymentTotals as Record<string, number>).reduce((a, b) => a + b, 0)
                )}
              </p>
              <span className="text-[10px] text-slate-400">{reg.sales.length} ventas completadas</span>
            </div>

            <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500">Movimientos Manuales</span>
              <div className="flex items-center gap-2 mt-1 text-xs font-bold">
                <span className="text-emerald-700">+{formatCurrency(reg.totalInflow)}</span>
                <span className="text-red-600">-{formatCurrency(reg.totalOutflow)}</span>
              </div>
              <span className="text-[10px] text-slate-400">Retiros y pagos en efectivo</span>
            </div>
          </div>

          {/* Desglose por Medio de Pago */}
          <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
              Desglose de Cobros por Medio de Pago
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: 'Efectivo', amount: reg.paymentTotals?.CASH || 0, color: 'text-emerald-700 bg-emerald-50' },
                { label: 'QR', amount: reg.paymentTotals?.QR || 0, color: 'text-sky-700 bg-sky-50' },
                { label: 'Débito', amount: reg.paymentTotals?.DEBIT || 0, color: 'text-indigo-700 bg-indigo-50' },
                { label: 'Crédito', amount: reg.paymentTotals?.CREDIT || 0, color: 'text-purple-700 bg-purple-50' },
                { label: 'Transferencia', amount: reg.paymentTotals?.TRANSFER || 0, color: 'text-amber-700 bg-amber-50' },
              ].map((m) => (
                <div key={m.label} className={`p-3 rounded-xl border border-slate-100 ${m.color}`}>
                  <span className="text-[10px] font-bold block">{m.label}</span>
                  <span className="text-sm font-black mt-0.5 block">{formatCurrency(m.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-12 border border-slate-200 text-center shadow-xs">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
            <Lock className="h-8 w-8" />
          </div>
          <h2 className="text-base font-bold text-slate-800">No hay ninguna caja abierta</h2>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            Para comenzar a registrar ventas y cobros en mostrador, abre el turno de caja indicando el fondo inicial en efectivo.
          </p>
          <button
            onClick={() => {
              setErrorMsg('')
              setIsOpeningModalOpen(true)
            }}
            className="mt-4 flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-all"
          >
            <Unlock className="h-4 w-4" />
            <span>Abrir Caja Ahora</span>
          </button>
        </div>
      )}

      {/* Historial de Cajas Anteriores */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs mt-6">
        <div className="p-3.5 border-b border-slate-200 bg-slate-50">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
            Historial de Sesiones de Caja
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] font-bold uppercase">
              <tr>
                <th className="py-2.5 px-3">Estado</th>
                <th className="py-2.5 px-3">Apertura</th>
                <th className="py-2.5 px-3">Cierre</th>
                <th className="py-2.5 px-3 text-right">Inicial</th>
                <th className="py-2.5 px-3 text-right">Esperado</th>
                <th className="py-2.5 px-3 text-right">Declarado</th>
                <th className="py-2.5 px-3 text-right">Diferencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400">
                    No hay registros de cajas cerradas
                  </td>
                </tr>
              ) : (
                history.map((h: any) => {
                  const diff = Number(h.difference) || 0
                  return (
                    <tr key={h.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            h.status === 'OPEN' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {h.status === 'OPEN' ? 'ABIERTA' : 'CERRADA'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        {formatDate(h.openedAt)} ({h.openedBy?.fullName})
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {h.closedAt ? `${formatDate(h.closedAt)} (${h.closedBy?.fullName || ''})` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700 font-semibold">
                        {formatCurrency(h.openingAmount)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-700">
                        {formatCurrency(h.expectedCash)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {h.declaredCash !== null ? formatCurrency(h.declaredCash) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {h.difference !== null ? (
                          <span
                            className={`font-black ${
                              diff < 0 ? 'text-red-600' : diff > 0 ? 'text-emerald-700' : 'text-slate-600'
                            }`}
                          >
                            {diff > 0 ? `+${formatCurrency(diff)}` : formatCurrency(diff)}
                          </span>
                        ) : (
                          '—'
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

      {/* MODAL APERTURA DE CAJA */}
      {isOpeningModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-sm">Abrir Turno de Caja</h3>
            <p className="text-xs text-slate-500 mt-0.5">Ingresa el monto de cambio inicial en efectivo.</p>

            {errorMsg && (
              <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-red-50 p-2 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">Monto Inicial ($)</label>
              <input
                type="number"
                placeholder="0.00"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-base font-black text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setIsOpeningModalOpen(false)}
                className="flex-1 rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                disabled={openMutation.isPending}
                onClick={() => openMutation.mutate()}
                className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
              >
                {openMutation.isPending ? 'Abriendo...' : 'Confirmar Apertura'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CIERRE DE CAJA */}
      {isClosingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-sm">Cerrar Turno de Caja</h3>
            <p className="text-xs text-slate-500 mt-0.5">Realiza el arqueo físico de efectivo y escribe el valor contado.</p>

            {errorMsg && (
              <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-red-50 p-2 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs border border-slate-200 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Efectivo esperado:</span>
                <span className="font-black text-slate-900">{formatCurrency(reg?.expectedCash || 0)}</span>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">Efectivo Real Contado ($)</label>
              <input
                type="number"
                placeholder="0.00"
                value={declaredCash}
                onChange={(e) => setDeclaredCash(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-base font-black text-slate-900 focus:border-red-600 focus:outline-none"
              />
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setIsClosingModalOpen(false)}
                className="flex-1 rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                disabled={closeMutation.isPending}
                onClick={() => closeMutation.mutate()}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white hover:bg-red-700"
              >
                {closeMutation.isPending ? 'Cerrando...' : 'Confirmar Cierre'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INGRESO / RETIRO */}
      {isMovementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-sm">Registrar Movimiento de Efectivo</h3>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setMovementType('EXPENSE')}
                className={`p-2 rounded-xl border text-center transition-all ${
                  movementType === 'EXPENSE'
                    ? 'bg-red-50 border-red-500 text-red-700'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                Retiro / Gasto
              </button>
              <button
                type="button"
                onClick={() => setMovementType('INCOME')}
                className={`p-2 rounded-xl border text-center transition-all ${
                  movementType === 'INCOME'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                Ingreso Extra
              </button>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">Monto ($)</label>
              <input
                type="number"
                placeholder="0.00"
                value={movementAmount}
                onChange={(e) => setMovementAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2 text-sm font-bold focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div className="mt-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">Motivo / Descripción</label>
              <input
                type="text"
                placeholder="Ej: Pago de flete o retiro para banco"
                value={movementDescription}
                onChange={(e) => setMovementDescription(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setIsMovementModalOpen(false)}
                className="flex-1 rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                disabled={movementMutation.isPending}
                onClick={() => movementMutation.mutate()}
                className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
              >
                {movementMutation.isPending ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
