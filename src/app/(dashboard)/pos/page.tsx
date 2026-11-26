'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Utensils,
  DollarSign,
  QrCode,
  CreditCard,
  Landmark,
  Banknote,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  ArrowLeftRight,
  Split,
  RotateCcw,
} from 'lucide-react'
import { formatCurrency, formatQuantity } from '@/lib/utils'
import { CartItem, PaymentMethod } from '@/types'

export default function PosPage() {
  const queryClient = useQueryClient()

  // Estados locales
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [cart, setCart] = useState<CartItem[]>([])
  const [isSandwichModalOpen, setIsSandwichModalOpen] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [saleSuccess, setSaleSuccess] = useState<any>(null)
  const [errorMsg, setErrorMsg] = useState('')

  // Estado del creador de sándwiches
  const [sandwichName, setSandwichName] = useState('Sándwich Especial al Momento')
  const [sandwichIngredients, setSandwichIngredients] = useState<
    Array<{
      product: any
      quantity: number
    }>
  >([])

  // Estado del pago
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [tenderedAmount, setTenderedAmount] = useState<string>('')
  const [isSplitPayment, setIsSplitPayment] = useState(false)
  const [splitAmounts, setSplitAmounts] = useState<Record<PaymentMethod, { amount: string; tendered: string }>>({
    CASH: { amount: '', tendered: '' },
    QR: { amount: '', tendered: '' },
    DEBIT: { amount: '', tendered: '' },
    CREDIT: { amount: '', tendered: '' },
    TRANSFER: { amount: '', tendered: '' },
  })

  // Queries
  const { data: products = [], isLoading: loadingProducts } = useQuery({
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

  const { data: cashStatus } = useQuery({
    queryKey: ['cash-register-status'],
    queryFn: async () => {
      const res = await fetch('/api/cash-register')
      return res.json()
    },
  })

  // Filtrado de productos en tiempo real
  const filteredProducts = useMemo(() => {
    return products.filter((p: any) => {
      const matchCat = selectedCategory === 'ALL' || p.categoryId === selectedCategory
      const matchText =
        search === '' ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.code && p.code.toLowerCase().includes(search.toLowerCase()))
      return matchCat && matchText
    })
  }, [products, selectedCategory, search])

  // Cálculos del Carrito
  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, it) => acc + it.lineTotal, 0)
  }, [cart])

  const cartTotal = cartSubtotal

  // Cálculos de Pagos Divididos / Mixtos
  const totalSplitAssigned = useMemo(() => {
    return Object.values(splitAmounts).reduce(
      (acc, curr) => acc + (parseFloat(curr.amount) || 0),
      0
    )
  }, [splitAmounts])

  const splitRemaining = useMemo(() => {
    return Math.round((cartTotal - totalSplitAssigned) * 100) / 100
  }, [cartTotal, totalSplitAssigned])

  // Vuelto calculado para la porción de efectivo en pago mixto
  const cashSplitAmount = parseFloat(splitAmounts.CASH.amount) || 0
  const cashSplitTendered = parseFloat(splitAmounts.CASH.tendered) || 0
  const cashSplitChange = Math.max(0, cashSplitTendered - cashSplitAmount)

  // Vuelto calculado para pago único
  const cashGiven = parseFloat(tenderedAmount) || 0
  const changeDue = Math.max(0, cashGiven - cartTotal)

  // Agregar producto simple al carrito
  const addToCart = (product: any, defaultQty = 1) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.productId === product.id && !item.isComposite)
      const salePrice = Number(product.currentSalePrice)
      const purchaseCost = Number(product.currentPurchaseCost)

      if (existingIndex > -1) {
        const updated = [...prev]
        const currentItem = updated[existingIndex]
        const newQty = currentItem.quantity + defaultQty
        updated[existingIndex] = {
          ...currentItem,
          quantity: newQty,
          lineTotal: newQty * salePrice,
        }
        return updated
      }

      return [
        ...prev,
        {
          id: `${product.id}-${Date.now()}`,
          productId: product.id,
          name: product.name,
          unitAbbreviation: product.unitOfMeasure.abbreviation,
          allowsFractions: product.unitOfMeasure.allowsFractions,
          quantity: defaultQty,
          unitSalePrice: salePrice,
          unitPurchaseCost: purchaseCost,
          lineTotal: defaultQty * salePrice,
        },
      ]
    })
  }

  // Modificar cantidad en carrito
  const updateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(index)
      return
    }
    setCart((prev) => {
      const updated = [...prev]
      const it = updated[index]
      updated[index] = {
        ...it,
        quantity: newQty,
        lineTotal: newQty * it.unitSalePrice,
      }
      return updated
    })
  }

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index))
  }

  // Cálculo en vivo del sándwich armado al momento
  const sandwichTotals = useMemo(() => {
    let totalPrice = 0
    let totalCost = 0
    sandwichIngredients.forEach(({ product, quantity }) => {
      totalPrice += Number(product.currentSalePrice) * quantity
      totalCost += Number(product.currentPurchaseCost) * quantity
    })
    return { totalPrice, totalCost }
  }, [sandwichIngredients])

  // Agregar sándwich armado al carrito
  const confirmSandwichToCart = () => {
    if (sandwichIngredients.length === 0) return

    const compositeCartItem: CartItem = {
      id: `sandwich-${Date.now()}`,
      productId: sandwichIngredients[0].product.id, // ID representativo
      name: sandwichName,
      unitAbbreviation: 'u',
      allowsFractions: false,
      quantity: 1,
      unitSalePrice: sandwichTotals.totalPrice,
      unitPurchaseCost: sandwichTotals.totalCost,
      lineTotal: sandwichTotals.totalPrice,
      isComposite: true,
      notes: `Ingredientes: ${sandwichIngredients.map((i) => `${i.product.name} (${i.quantity} ${i.product.unitOfMeasure.abbreviation})`).join(', ')}`,
      ingredients: sandwichIngredients.map((i) => ({
        productId: i.product.id,
        name: i.product.name,
        quantity: i.quantity,
        unitAbbreviation: i.product.unitOfMeasure.abbreviation,
        unitSalePrice: Number(i.product.currentSalePrice),
        unitPurchaseCost: Number(i.product.currentPurchaseCost),
        subtotal: Number(i.product.currentSalePrice) * i.quantity,
      })),
    }

    setCart((prev) => [...prev, compositeCartItem])
    setIsSandwichModalOpen(false)
    setSandwichIngredients([])
  }

  // Registrar venta
  const saleMutation = useMutation({
    mutationFn: async () => {
      let paymentsData = []

      if (!isSplitPayment) {
        paymentsData.push({
          method: paymentMethod,
          amount: cartTotal,
          tenderedAmount: paymentMethod === 'CASH' && cashGiven > 0 ? cashGiven : cartTotal,
          changeAmount: paymentMethod === 'CASH' ? changeDue : 0,
        })
      } else {
        const methods: PaymentMethod[] = ['CASH', 'QR', 'DEBIT', 'CREDIT', 'TRANSFER']
        for (const m of methods) {
          const item = splitAmounts[m]
          const amt = parseFloat(item.amount) || 0
          if (amt > 0) {
            const tend = parseFloat(item.tendered) || 0
            const chg = m === 'CASH' && tend > amt ? tend - amt : 0
            paymentsData.push({
              method: m,
              amount: amt,
              tenderedAmount: m === 'CASH' && tend > 0 ? tend : amt,
              changeAmount: chg,
            })
          }
        }
      }

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          payments: paymentsData,
          discountAmount: 0,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Error al registrar la venta')
      }

      return res.json()
    },
    onSuccess: (data) => {
      setSaleSuccess(data)
      setCart([])
      setIsPaymentModalOpen(false)
      setTenderedAmount('')
      setSplitAmounts({
        CASH: { amount: '', tendered: '' },
        QR: { amount: '', tendered: '' },
        DEBIT: { amount: '', tendered: '' },
        CREDIT: { amount: '', tendered: '' },
        TRANSFER: { amount: '', tendered: '' },
      })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['cash-register-status'] })
    },
    onError: (err: any) => {
      setErrorMsg(err.message)
    },
  })

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-6.5rem)]">
      {/* Alerta si la caja está cerrada */}
      {cashStatus && !cashStatus.isOpen && (
        <div className="fixed top-18 right-4 z-50 flex items-center gap-2 rounded-xl bg-amber-500 text-white p-3 shadow-lg text-xs font-semibold">
          <AlertCircle className="h-5 w-5" />
          <span>La caja está cerrada. Debes abrirla en el módulo de Caja para cobrar.</span>
        </div>
      )}

      {/* COLUMNA IZQUIERDA: Catálogo, Búsqueda y Botón Armar Sándwich */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm">
        {/* Barra de búsqueda y acción Armar Sándwich */}
        <div className="p-3 border-b border-slate-200 space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o código de producto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* BOTÓN RÁPIDO: ARMAR SÁNDWICH */}
            <button
              onClick={() => {
                setSandwichIngredients([])
                setIsSandwichModalOpen(true)
              }}
              className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-amber-700 active:scale-95 transition-all shrink-0"
            >
              <Utensils className="h-4 w-4" />
              <span className="hidden sm:inline">Armar Sándwich</span>
              <span className="sm:hidden">Sándwich</span>
            </button>
          </div>

          {/* Filtros de Categorías horizontales */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`rounded-lg px-3 py-1.5 font-semibold shrink-0 transition-colors ${
                selectedCategory === 'ALL'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos
            </button>
            {categories.map((c: any) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`rounded-lg px-3 py-1.5 font-semibold shrink-0 transition-colors ${
                  selectedCategory === c.id
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Grilla táctil de productos */}
        <div className="flex-1 overflow-y-auto p-3">
          {loadingProducts ? (
            <div className="flex h-48 items-center justify-center text-slate-400">
              Cargando catálogo...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-slate-400">
              <p>No se encontraron productos</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {filteredProducts.map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p, p.unitOfMeasure.allowsFractions ? 0.25 : 1)}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-emerald-500 hover:shadow-md transition-all active:scale-[0.98]"
                >
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">
                        {p.unitOfMeasure.abbreviation}
                      </span>
                      {Number(p.currentStock) <= Number(p.minStock) && (
                        <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1 py-0.5 rounded">
                          Bajo stock
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs font-bold text-slate-800 line-clamp-2 leading-snug">
                      {p.name}
                    </p>
                  </div>

                  <div className="mt-3 flex items-baseline justify-between pt-2 border-t border-slate-100">
                    <span className="text-sm font-black text-emerald-700">
                      {formatCurrency(p.currentSalePrice)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      /{p.unitOfMeasure.abbreviation}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* COLUMNA DERECHA: Carrito de Venta y Cobro Rápido */}
      <div className="flex w-full lg:w-96 flex-col overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm">
        {/* Cabecera del Carrito */}
        <div className="flex items-center justify-between p-3.5 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-emerald-700" />
            <h2 className="text-sm font-bold text-slate-800">
              Ticket Actual ({cart.length})
            </h2>
          </div>
          {cart.length > 0 && (
            <button
              onClick={() => setCart([])}
              className="text-xs font-semibold text-red-600 hover:text-red-700"
            >
              Vaciar
            </button>
          )}
        </div>

        {/* Lista de Items en Carrito */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-slate-400 text-xs">
              <ShoppingCart className="h-8 w-8 text-slate-300 mb-2" />
              <p>El ticket está vacío</p>
              <p className="text-[11px] text-slate-400">Toca un producto o arma un sándwich</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 text-xs"
              >
                <div className="flex-1 pr-2">
                  <div className="flex items-center gap-1.5">
                    {item.isComposite && (
                      <span className="text-[9px] font-black uppercase text-amber-800 bg-amber-100 px-1 py-0.2 rounded">
                        Sándwich
                      </span>
                    )}
                    <p className="font-bold text-slate-800 line-clamp-1">{item.name}</p>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {formatCurrency(item.unitSalePrice)} × {formatQuantity(item.quantity, item.unitAbbreviation)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Modificador de cantidad */}
                  <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden shadow-xs">
                    <button
                      onClick={() =>
                        updateQuantity(
                          idx,
                          item.allowsFractions ? Math.max(0, item.quantity - 0.1) : item.quantity - 1
                        )
                      }
                      className="px-1.5 py-1 text-slate-600 hover:bg-slate-100"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="px-1.5 font-bold text-slate-800 text-[11px]">
                      {item.allowsFractions ? item.quantity.toFixed(2) : item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        updateQuantity(
                          idx,
                          item.allowsFractions ? item.quantity + 0.1 : item.quantity + 1
                        )
                      }
                      className="px-1.5 py-1 text-slate-600 hover:bg-slate-100"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  <span className="font-extrabold text-slate-900 min-w-16 text-right">
                    {formatCurrency(item.lineTotal)}
                  </span>

                  <button
                    onClick={() => removeFromCart(idx)}
                    className="p-1 text-slate-400 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Resumen y Botón de Cobro */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50/90 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Subtotal:</span>
            <span>{formatCurrency(cartSubtotal)}</span>
          </div>

          <div className="flex items-baseline justify-between pt-1 border-t border-slate-200">
            <span className="text-sm font-bold text-slate-900">Total a Cobrar:</span>
            <span className="text-xl font-black text-emerald-800">
              {formatCurrency(cartTotal)}
            </span>
          </div>

          <button
            disabled={cart.length === 0}
            onClick={() => {
              setErrorMsg('')
              setTenderedAmount('')
              setIsSplitPayment(false)
              setSplitAmounts({
                CASH: { amount: '', tendered: '' },
                QR: { amount: '', tendered: '' },
                DEBIT: { amount: '', tendered: '' },
                CREDIT: { amount: '', tendered: '' },
                TRANSFER: { amount: '', tendered: '' },
              })
              setIsPaymentModalOpen(true)
            }}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-black text-white shadow-md hover:bg-emerald-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Banknote className="h-4 w-4" />
            <span>COBRAR {formatCurrency(cartTotal)}</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL: ARMAR SÁNDWICH AL MOMENTO                             */}
      {/* ============================================================ */}
      {isSandwichModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
          <div className="flex flex-col w-full max-w-2xl max-h-[90vh] rounded-2xl bg-white shadow-2xl overflow-hidden">
            {/* Cabecera del modal */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-amber-50">
              <div className="flex items-center gap-2">
                <Utensils className="h-5 w-5 text-amber-700" />
                <h3 className="font-bold text-slate-900 text-base">
                  Armado de Sándwich al Momento
                </h3>
              </div>
              <button
                onClick={() => setIsSandwichModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Contenido con dos paneles: Ingredientes seleccionados vs disponibles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 overflow-y-auto flex-1">
              {/* Selector de ingredientes */}
              <div className="space-y-2 border-r md:pr-3 border-slate-100">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Seleccionar Insumos / Ingredientes
                </p>
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {products.map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        const defaultQuantity = p.unitOfMeasure.allowsFractions ? 0.1 : 1
                        setSandwichIngredients((prev) => {
                          const exist = prev.find((x) => x.product.id === p.id)
                          if (exist) {
                            return prev.map((x) =>
                              x.product.id === p.id
                                ? { ...x, quantity: x.quantity + defaultQuantity }
                                : x
                            )
                          }
                          return [...prev, { product: p, quantity: defaultQuantity }]
                        })
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50/50 text-left text-xs transition-colors"
                    >
                      <div className="truncate pr-2">
                        <p className="font-semibold text-slate-800 truncate">{p.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {formatCurrency(p.currentSalePrice)} /{p.unitOfMeasure.abbreviation}
                        </p>
                      </div>
                      <Plus className="h-4 w-4 text-amber-600 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Ingredientes agregados al sándwich */}
              <div className="space-y-2 flex flex-col justify-between">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre / Tipo de Sándwich
                  </label>
                  <input
                    type="text"
                    value={sandwichName}
                    onChange={(e) => setSandwichName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2 text-xs font-semibold focus:border-amber-600 focus:outline-none"
                  />

                  <p className="mt-3 text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Composición ({sandwichIngredients.length})
                  </p>
                  <div className="mt-1 space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {sandwichIngredients.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-6 text-center">
                        Toca los insumos a la izquierda (pan, fiambres, quesos) para agregarlos.
                      </p>
                    ) : (
                      sandwichIngredients.map((item, idx) => (
                        <div
                          key={item.product.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                        >
                          <div className="truncate pr-2">
                            <p className="font-bold text-slate-800 truncate">{item.product.name}</p>
                            <p className="text-[10px] text-emerald-700 font-semibold">
                              {formatCurrency(Number(item.product.currentSalePrice) * item.quantity)}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <input
                              type="number"
                              step={item.product.unitOfMeasure.allowsFractions ? '0.05' : '1'}
                              value={item.quantity}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0
                                setSandwichIngredients((prev) =>
                                  prev
                                    .map((x, i) => (i === idx ? { ...x, quantity: val } : x))
                                    .filter((x) => x.quantity > 0)
                                )
                              }}
                              className="w-16 rounded border border-slate-300 p-1 text-center font-bold text-xs"
                            />
                            <span className="text-[10px] text-slate-500">
                              {item.product.unitOfMeasure.abbreviation}
                            </span>
                            <button
                              onClick={() =>
                                setSandwichIngredients((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="p-1 text-slate-400 hover:text-red-600"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Total sumado en vivo del sándwich */}
                <div className="pt-3 border-t border-slate-200">
                  <div className="flex items-baseline justify-between mb-3">
                    <span className="text-xs font-bold text-slate-700">Precio de Venta Sumado:</span>
                    <span className="text-lg font-black text-amber-700">
                      {formatCurrency(sandwichTotals.totalPrice)}
                    </span>
                  </div>

                  <button
                    disabled={sandwichIngredients.length === 0}
                    onClick={confirmSandwichToCart}
                    className="w-full rounded-xl bg-amber-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-amber-700 disabled:opacity-50 transition-all"
                  >
                    Agregar Sándwich al Ticket
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: COBRO CON MEDIOS DE PAGO Y VUELTO                     */}
      {/* ============================================================ */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
          <div className="flex flex-col w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[92vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-emerald-700" />
                <h3 className="font-black text-slate-900 text-base">Cobro de Ticket</h3>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto">
              {errorMsg && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 p-2.5 text-xs text-red-700 border border-red-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Encabezado: Total a Cobrar */}
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 text-center">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                  Total de la Operación
                </span>
                <p className="text-3xl font-black text-emerald-900 mt-0.5">
                  {formatCurrency(cartTotal)}
                </p>
              </div>

              {/* Selector de Modalidad: Medio Único vs Pago Mixto / Múltiples */}
              <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setIsSplitPayment(false)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 font-bold rounded-lg transition-all ${
                    !isSplitPayment
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Banknote className="h-4 w-4" />
                  <span>Medio Único</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSplitPayment(true)
                    // Si aún no se asignó nada, pre-cargar el método seleccionado con el total
                    if (totalSplitAssigned === 0) {
                      setSplitAmounts({
                        CASH: { amount: paymentMethod === 'CASH' ? cartTotal.toString() : '', tendered: '' },
                        QR: { amount: paymentMethod === 'QR' ? cartTotal.toString() : '', tendered: '' },
                        DEBIT: { amount: paymentMethod === 'DEBIT' ? cartTotal.toString() : '', tendered: '' },
                        CREDIT: { amount: paymentMethod === 'CREDIT' ? cartTotal.toString() : '', tendered: '' },
                        TRANSFER: { amount: paymentMethod === 'TRANSFER' ? cartTotal.toString() : '', tendered: '' },
                      })
                    }
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 font-bold rounded-lg transition-all ${
                    isSplitPayment
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ArrowLeftRight className="h-4 w-4" />
                  <span>Pago Mixto / Múltiples Medios</span>
                </button>
              </div>

              {/* ========================================================== */}
              {/* VISTA 1: MEDIO ÚNICO                                       */}
              {/* ========================================================== */}
              {!isSplitPayment ? (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Seleccionar Medio de Pago
                    </label>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {[
                        { id: 'CASH', label: 'Efectivo', icon: Banknote },
                        { id: 'QR', label: 'QR', icon: QrCode },
                        { id: 'DEBIT', label: 'Débito', icon: CreditCard },
                        { id: 'CREDIT', label: 'Crédito', icon: CreditCard },
                        { id: 'TRANSFER', label: 'Transferencia', icon: Landmark },
                      ].map((m) => {
                        const Icon = m.icon
                        const isSel = paymentMethod === m.id
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                            className={`flex flex-col items-center justify-center p-2.5 rounded-xl border font-bold transition-all ${
                              isSel
                                ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <Icon className="h-4 w-4 mb-1" />
                            <span>{m.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Calculadora de Vuelto para Efectivo */}
                  {paymentMethod === 'CASH' && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700">
                          Monto Recibido en Efectivo:
                        </label>
                        <button
                          type="button"
                          onClick={() => setTenderedAmount(cartTotal.toString())}
                          className="text-[10px] font-bold text-emerald-700 hover:underline"
                        >
                          Monto Exacto
                        </button>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                          $
                        </span>
                        <input
                          type="number"
                          placeholder={cartTotal.toString()}
                          value={tenderedAmount}
                          onChange={(e) => setTenderedAmount(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 bg-white pl-8 pr-3 py-2 text-base font-black text-slate-900 focus:border-emerald-600 focus:outline-none"
                        />
                      </div>

                      {cashGiven > 0 && (
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                          <span className="text-xs font-bold text-slate-700">Vuelto a Entregar:</span>
                          <span
                            className={`text-base font-black ${
                              changeDue < 0 ? 'text-red-600' : 'text-emerald-700'
                            }`}
                          >
                            {formatCurrency(changeDue)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* ========================================================== */
                /* VISTA 2: PAGO MIXTO / MÚLTIPLES MEDIOS                     */
                /* ========================================================== */
                <div className="space-y-3">
                  {/* Balance en vivo */}
                  <div
                    className={`rounded-xl p-3 border text-xs font-bold flex items-center justify-between transition-colors ${
                      Math.abs(splitRemaining) < 0.05
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : splitRemaining > 0
                        ? 'bg-amber-50 border-amber-300 text-amber-800'
                        : 'bg-rose-50 border-rose-300 text-rose-800'
                    }`}
                  >
                    <div>
                      <span className="block text-[10px] uppercase font-black opacity-80">
                        {Math.abs(splitRemaining) < 0.05
                          ? '✓ Cobro Balanceado'
                          : splitRemaining > 0
                          ? 'Faltan Asignar'
                          : 'Exceso en Asignación'}
                      </span>
                      <span className="text-base font-black">
                        {Math.abs(splitRemaining) < 0.05
                          ? 'Monto 100% Cubierto'
                          : formatCurrency(Math.abs(splitRemaining))}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block">Total Asignado:</span>
                      <span className="text-sm font-black text-slate-900">
                        {formatCurrency(totalSplitAssigned)}
                      </span>
                    </div>
                  </div>

                  {/* Lista de Medios de Pago para División */}
                  <div className="space-y-2">
                    {[
                      { id: 'CASH', label: 'Efectivo', icon: Banknote },
                      { id: 'QR', label: 'QR / Billetera Virtual', icon: QrCode },
                      { id: 'DEBIT', label: 'Tarjeta Débito', icon: CreditCard },
                      { id: 'CREDIT', label: 'Tarjeta Crédito', icon: CreditCard },
                      { id: 'TRANSFER', label: 'Transferencia', icon: Landmark },
                    ].map((m) => {
                      const Icon = m.icon
                      const key = m.id as PaymentMethod
                      const val = splitAmounts[key].amount
                      const currentValNum = parseFloat(val) || 0

                      return (
                        <div
                          key={m.id}
                          className={`rounded-xl border p-2.5 transition-all ${
                            currentValNum > 0
                              ? 'bg-emerald-50/50 border-emerald-300'
                              : 'bg-slate-50/60 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-32">
                              <Icon className="h-4 w-4 text-slate-600" />
                              <span className="text-xs font-bold text-slate-800">{m.label}</span>
                            </div>

                            <div className="flex items-center gap-1.5 flex-1 justify-end">
                              <div className="relative w-32">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                  $
                                </span>
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={val}
                                  onChange={(e) => {
                                    const inputVal = e.target.value
                                    setSplitAmounts((prev) => ({
                                      ...prev,
                                      [key]: { ...prev[key], amount: inputVal },
                                    }))
                                  }}
                                  className="w-full rounded-lg border border-slate-300 bg-white pl-6 pr-2 py-1 text-xs font-black text-slate-900 text-right focus:border-emerald-600 focus:outline-none"
                                />
                              </div>

                              {splitRemaining > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newAmt = Math.round((currentValNum + splitRemaining) * 100) / 100
                                    setSplitAmounts((prev) => ({
                                      ...prev,
                                      [key]: { ...prev[key], amount: newAmt.toString() },
                                    }))
                                  }}
                                  className="rounded-lg bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-700 transition-all shrink-0"
                                >
                                  + Resto
                                </button>
                              )}

                              {currentValNum > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSplitAmounts((prev) => ({
                                      ...prev,
                                      [key]: { amount: '', tendered: '' },
                                    }))
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600"
                                  title="Borrar monto"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Si el método es EFECTIVO y tiene monto asignado, permitir calcular vuelto */}
                          {key === 'CASH' && currentValNum > 0 && (
                            <div className="mt-2 pt-2 border-t border-emerald-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs bg-white/70 p-2 rounded-lg">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-bold text-slate-600">
                                  Efectivo recibido:
                                </span>
                                <div className="relative w-28">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                                    $
                                  </span>
                                  <input
                                    type="number"
                                    placeholder={currentValNum.toString()}
                                    value={splitAmounts.CASH.tendered}
                                    onChange={(e) => {
                                      const inputVal = e.target.value
                                      setSplitAmounts((prev) => ({
                                        ...prev,
                                        CASH: { ...prev.CASH, tendered: inputVal },
                                      }))
                                    }}
                                    className="w-full rounded border border-slate-300 pl-5 pr-2 py-0.5 text-xs font-black text-slate-900"
                                  />
                                </div>
                              </div>

                              {cashSplitTendered > 0 && (
                                <div className="flex items-center gap-1 font-bold">
                                  <span className="text-slate-600">Vuelto:</span>
                                  <span
                                    className={`font-black ${
                                      cashSplitTendered < currentValNum
                                        ? 'text-red-600'
                                        : 'text-emerald-700'
                                    }`}
                                  >
                                    {formatCurrency(cashSplitChange)}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Botón confirmar venta */}
              <button
                disabled={
                  saleMutation.isPending ||
                  cartTotal <= 0 ||
                  (!isSplitPayment
                    ? paymentMethod === 'CASH' && cashGiven > 0 && changeDue < 0
                    : Math.abs(splitRemaining) > 0.05 ||
                      totalSplitAssigned <= 0 ||
                      (cashSplitAmount > 0 && cashSplitTendered > 0 && cashSplitTendered < cashSplitAmount))
                }
                onClick={() => saleMutation.mutate()}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-black text-white shadow-md hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.99] mt-2"
              >
                {saleMutation.isPending ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>CONFIRMAR COBRO ({formatCurrency(cartTotal)})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CONFIRMACIÓN VISUAL DE VENTA REGISTRADA               */}
      {/* ============================================================ */}
      {saleSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
          <div className="flex flex-col w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="mt-3 text-lg font-black text-slate-900">¡Venta Registrada!</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Venta #{saleSuccess.saleNumber} guardada correctamente
            </p>

            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-left text-xs space-y-1.5 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Total cobrado:</span>
                <span className="font-black text-slate-900">{formatCurrency(saleSuccess.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fecha y hora:</span>
                <span className="font-medium text-slate-700">
                  {new Date(saleSuccess.createdAt).toLocaleTimeString('es-AR')}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSaleSuccess(null)}
              className="mt-5 w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition-all"
            >
              Nueva Venta
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
