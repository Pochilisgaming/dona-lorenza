import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: purchaseId } = await params
    const body = await req.json()
    const { amount, paymentMethod, notes } = body

    const payAmount = Number(amount)
    if (!payAmount || payAmount <= 0) {
      return NextResponse.json({ error: 'El monto del pago debe ser mayor a 0' }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findUnique({
        where: { id: purchaseId },
        include: { payments: true },
      })

      if (!purchase) {
        throw new Error('Compra no encontrada')
      }

      await tx.purchasePayment.create({
        data: {
          purchaseId,
          amount: payAmount,
          paymentMethod: paymentMethod || 'CASH',
          notes: notes?.trim() || null,
        },
      })

      const totalPaidSoFar =
        purchase.payments.reduce((acc, p) => acc + Number(p.amount), 0) + payAmount

      const purchaseTotal = Number(purchase.total)
      let newStatus: 'PENDING' | 'PARTIAL' | 'PAID' = 'PARTIAL'
      if (totalPaidSoFar >= purchaseTotal) {
        newStatus = 'PAID'
      }

      const updatedPurchase = await tx.purchase.update({
        where: { id: purchaseId },
        data: { paymentStatus: newStatus },
        include: { payments: true, supplier: true },
      })

      return updatedPurchase
    })

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
