import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string | { toString: () => string }): string {
  const num = typeof amount === 'number' ? amount : parseFloat(amount.toString())
  if (isNaN(num)) return '$0,00'
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

export function formatQuantity(qty: number | string | { toString: () => string }, abbreviation: string): string {
  const num = typeof qty === 'number' ? qty : parseFloat(qty.toString())
  if (isNaN(num)) return `0 ${abbreviation}`
  const formattedNum = new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 3,
  }).format(num)
  return `${formattedNum} ${abbreviation}`
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(d)
}
