'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users,
  Plus,
  Search,
  Edit,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  X,
  Receipt,
  CreditCard,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function ClientesPage() {
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState('')

  // Formulario
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [taxId, setTaxId] = useState('')

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await fetch('/api/customers')
      return res.json()
    },
  })

  const filtered = customers.filter((c: any) => {
    const term = search.toLowerCase()
    return (
      c.fullName.toLowerCase().includes(term) ||
      (c.phone && c.phone.includes(term)) ||
      (c.taxId && c.taxId.toLowerCase().includes(term)) ||
      (c.email && c.email.toLowerCase().includes(term))
    )
  })

  const openCreateModal = () => {
    setEditingCustomer(null)
    setFullName('')
    setPhone('')
    setEmail('')
    setAddress('')
    setTaxId('')
    setErrorMsg('')
    setIsModalOpen(true)
  }

  const openEditModal = (c: any) => {
    setEditingCustomer(c)
    setFullName(c.fullName)
    setPhone(c.phone || '')
    setEmail(c.email || '')
    setAddress(c.address || '')
    setTaxId(c.taxId || '')
    setErrorMsg('')
    setIsModalOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { fullName, phone, email, address, taxId }
      const method = editingCustomer ? 'PUT' : 'POST'
      const body = editingCustomer ? { ...payload, id: editingCustomer.id } : payload

      const res = await fetch('/api/customers', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al guardar cliente')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setIsModalOpen(false)
    },
    onError: (err: any) => setErrorMsg(err.message),
  })

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight sm:text-2xl">
            👥 Gestión de Clientes
          </h1>
          <p className="text-xs text-slate-500">
            Base de clientes habituales, datos de contacto, DNI/CUIT e historial de compras
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Nuevo Cliente</span>
        </button>
      </div>

      {/* Buscador */}
      <div className="rounded-2xl bg-white p-3 border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar cliente por nombre, teléfono, DNI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Tabla de Clientes */}
      <div className="overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="py-3 px-4">Nombre Completo</th>
                <th className="py-3 px-3">Teléfono</th>
                <th className="py-3 px-3">DNI / CUIT</th>
                <th className="py-3 px-3">Dirección</th>
                <th className="py-3 px-3 text-center">Compras Registradas</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Cargando clientes...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No se encontraron clientes registrados
                  </td>
                </tr>
              ) : (
                filtered.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{c.fullName}</div>
                      {c.email && <div className="text-[10px] text-slate-400">{c.email}</div>}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{c.phone || '—'}</td>
                    <td className="py-3 px-3 font-mono text-slate-600">{c.taxId || '—'}</td>
                    <td className="py-3 px-3 text-slate-500 max-w-xs truncate">{c.address || '—'}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        {c._count?.sales || 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => openEditModal(c)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-emerald-700"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL ALTA / EDICIÓN CLIENTE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
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
                saveMutation.mutate()
              }}
              className="p-4 space-y-3 text-xs"
            >
              {errorMsg && (
                <div className="flex items-center gap-1.5 rounded-lg bg-red-50 p-2 text-xs text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Laura Gómez"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="Ej: 387-5123456"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">DNI / CUIT</label>
                  <input
                    type="text"
                    placeholder="Ej: 35.123.456"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  placeholder="laura@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Dirección / Barrio</label>
                <input
                  type="text"
                  placeholder="Ej: Caseros 740"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-xl bg-slate-100 py-2.5 font-bold text-slate-600 hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="flex-1 rounded-xl bg-emerald-600 py-2.5 font-bold text-white hover:bg-emerald-700"
                >
                  {saveMutation.isPending ? 'Guardando...' : editingCustomer ? 'Guardar Cambios' : 'Crear Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
