'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import {
  ShieldAlert,
  UserPlus,
  KeyRound,
  UserCheck,
  UserX,
  AlertCircle,
  X,
  CheckCircle2,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default function UsuariosPage() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const isSuperAdmin = (session?.user as any)?.role === 'SUPER_ADMIN'

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)

  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('/api/users')
      if (!res.ok) throw new Error('No autorizado')
      return res.json()
    },
    enabled: isSuperAdmin,
  })

  // Crear nuevo vendedor
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, username, password, role: 'VENDEDOR' }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al crear usuario')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setIsCreateModalOpen(false)
      setFullName('')
      setUsername('')
      setPassword('')
    },
    onError: (err: any) => setErrorMsg(err.message),
  })

  // Cambiar contraseña
  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedUser.id, password: newPassword }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al actualizar clave')
      }
      return res.json()
    },
    onSuccess: () => {
      setIsPasswordModalOpen(false)
      setSelectedUser(null)
      setNewPassword('')
    },
    onError: (err: any) => setErrorMsg(err.message),
  })

  // Alternar estado activo/inactivo
  const toggleActiveMutation = useMutation({
    mutationFn: async (u: any) => {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: u.id, isActive: !u.isActive }),
      })
      if (!res.ok) throw new Error('Error al actualizar estado')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-white border border-slate-200">
        <ShieldAlert className="h-12 w-12 text-red-500 mb-2" />
        <h2 className="text-base font-bold text-slate-800">Acceso Restringido</h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Este módulo está reservado exclusivamente para los administradores del sistema (Pablo D. y Karina).
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight sm:text-2xl">
            🔐 Control de Usuarios y Vendedores
          </h1>
          <p className="text-xs text-slate-500">
            Módulo exclusivo de administración para alta, baja y reseteo de claves
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg('')
            setIsCreateModalOpen(true)
          }}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-all"
        >
          <UserPlus className="h-4 w-4" />
          <span>Nuevo Vendedor</span>
        </button>
      </div>

      {/* Tabla de Usuarios */}
      <div className="overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="py-3 px-4">Nombre Completo</th>
                <th className="py-3 px-3">Usuario</th>
                <th className="py-3 px-3">Rol</th>
                <th className="py-3 px-3">Estado</th>
                <th className="py-3 px-3">Fecha de Alta</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Cargando usuarios...
                  </td>
                </tr>
              ) : (
                users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{u.fullName}</td>
                    <td className="py-3 px-3 font-mono text-slate-600">@{u.username}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          u.role === 'SUPER_ADMIN'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {u.role === 'SUPER_ADMIN' ? '⭐ SUPER ADMIN' : 'VENDEDOR'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          u.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {u.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500">{formatDate(u.createdAt)}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedUser(u)
                            setIsPasswordModalOpen(true)
                          }}
                          title="Resetear Contraseña"
                          className="rounded-lg p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-slate-100"
                        >
                          <KeyRound className="h-4 w-4" />
                        </button>

                        {u.role !== 'SUPER_ADMIN' && (
                          <button
                            onClick={() => toggleActiveMutation.mutate(u)}
                            title={u.isActive ? 'Desactivar usuario' : 'Activar usuario'}
                            className="rounded-lg p-1.5 text-slate-400 hover:text-red-700 hover:bg-slate-100"
                          >
                            {u.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CREAR USUARIO */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-sm">Crear Nuevo Vendedor</h3>

            {errorMsg && (
              <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-red-50 p-2 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault()
                createMutation.mutate()
              }}
              className="mt-3 space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Marcos Pérez"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Usuario de Acceso *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: marcos.p"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Contraseña Inicial *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 p-2 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 rounded-xl bg-slate-100 py-2.5 font-bold text-slate-600 hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 rounded-xl bg-emerald-600 py-2.5 font-bold text-white hover:bg-emerald-700"
                >
                  {createMutation.isPending ? 'Creando...' : 'Crear Vendedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RESETEAR CONTRASEÑA */}
      {isPasswordModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-sm">
              Cambiar Clave de {selectedUser.fullName}
            </h3>

            <div className="mt-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">Nueva Contraseña</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="flex-1 rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={resetPasswordMutation.isPending || !newPassword}
                onClick={() => resetPasswordMutation.mutate()}
                className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
              >
                {resetPasswordMutation.isPending ? 'Guardando...' : 'Guardar Nueva Clave'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
