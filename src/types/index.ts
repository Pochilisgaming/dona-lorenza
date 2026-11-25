export type UserRole = 'SUPER_ADMIN' | 'VENDEDOR'

export type PaymentMethod = 'CASH' | 'QR' | 'DEBIT' | 'CREDIT' | 'TRANSFER'

export type SaleStatus = 'COMPLETED' | 'VOIDED'

export type PurchasePaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID'

export type CashRegisterStatus = 'OPEN' | 'CLOSED'

export type CashMovementType = 'INCOME' | 'EXPENSE'

export type StockMovementType =
  | 'PURCHASE_IN'
  | 'SALE_OUT'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'INVENTORY'

export interface CartItem {
  id: string // ID temporal para el carrito o UUID de producto
  productId: string
  name: string
  unitAbbreviation: string
  allowsFractions: boolean
  quantity: number
  unitSalePrice: number
  unitPurchaseCost: number
  lineTotal: number
  notes?: string
  // Si es un sándwich armado al momento
  isComposite?: boolean
  ingredients?: Array<{
    productId: string
    name: string
    quantity: number
    unitAbbreviation: string
    unitSalePrice: number
    unitPurchaseCost: number
    subtotal: number
  }>
}

export interface PaymentEntry {
  method: PaymentMethod
  amount: number
  tenderedAmount?: number // Monto entregado (para efectivo)
  changeAmount?: number   // Vuelto calculado
}
