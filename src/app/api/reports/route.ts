import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 1. Ventas de hoy
    const todaySales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: today },
        status: 'COMPLETED',
      },
      include: {
        payments: true,
        items: true,
      },
    })

    let todayTotal = 0
    let todayCost = 0
    const paymentBreakdown = {
      CASH: 0,
      QR: 0,
      DEBIT: 0,
      CREDIT: 0,
      TRANSFER: 0,
    }

    todaySales.forEach((s) => {
      todayTotal += Number(s.total)
      s.payments.forEach((p) => {
        paymentBreakdown[p.paymentMethod] = (paymentBreakdown[p.paymentMethod] || 0) + Number(p.amount)
      })
      s.items.forEach((it) => {
        todayCost += (Number(it.unitPurchaseCost) || 0) * (Number(it.quantity) || 1)
      })
    })

    const todayProfit = todayTotal - todayCost

    // 2. Alertas de stock bajo
    const lowStockProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        currentStock: { lte: prisma.product.fields.minStock },
      },
      include: { unitOfMeasure: true, category: true },
      take: 10,
    })

    // 3. Estado de la caja
    const openRegister = await prisma.cashRegister.findFirst({
      where: { status: 'OPEN' },
      include: {
        openedBy: { select: { fullName: true } },
      },
    })

    return NextResponse.json({
      todaySalesCount: todaySales.length,
      todayTotal,
      todayProfit,
      paymentBreakdown,
      lowStockProducts,
      openRegister,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
