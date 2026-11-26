import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const supplierId = searchParams.get('supplierId')
    const status = searchParams.get('status')
    const limit = Number(searchParams.get('limit')) || 50

    const where: any = {}
    if (supplierId) where.supplierId = supplierId
    if (status) where.paymentStatus = status

    const purchases = await prisma.purchase.findMany({
      where,
      include: {
        supplier: true,
        user: { select: { fullName: true, username: true } },
        items: {
          include: {
            product: { select: { name: true, code: true } },
          },
        },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json(purchases)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = session.user as any
    const body = await req.json()
    const { supplierId, voucherNumber, voucherType, dueDate, items, initialPayment } = body

    if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Faltan datos de la compra o líneas de productos' }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      let subtotal = 0
      for (const it of items) {
        const qty = Number(it.quantity) || 0
        const cost = Number(it.unitCost) || 0
        subtotal += qty * cost
      }
      const total = subtotal

      const paidAmount = initialPayment?.amount ? Number(initialPayment.amount) : 0
      let paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID' = 'PENDING'
      if (paidAmount >= total && total > 0) {
        paymentStatus = 'PAID'
      } else if (paidAmount > 0) {
        paymentStatus = 'PARTIAL'
      }

      const purchase = await tx.purchase.create({
        data: {
          supplierId,
          userId: user.id || user.sub,
          voucherNumber: voucherNumber?.trim() || null,
          voucherType: voucherType?.trim() || null,
          subtotal,
          total,
          paymentStatus,
          dueDate: dueDate ? new Date(dueDate) : null,
        },
      })

      // Procesar ítems, stock y actualización de costos
      for (const it of items) {
        const qty = Number(it.quantity) || 0
        const cost = Number(it.unitCost) || 0
        const lineTotal = qty * cost

        const product = await tx.product.findUnique({
          where: { id: it.productId },
          include: { unitOfMeasure: true },
        })

        if (!product) continue

        await tx.purchaseItem.create({
          data: {
            purchaseId: purchase.id,
            productId: it.productId,
            quantity: qty,
            unitAbbreviation: product.unitOfMeasure.abbreviation,
            unitCost: cost,
            lineTotal,
          },
        })

        // Sumar al stock
        const updatedProduct = await tx.product.update({
          where: { id: it.productId },
          data: {
            currentStock: { increment: qty },
            ...(it.updateCost && {
              currentPurchaseCost: cost,
            }),
          },
        })

        // Registrar movimiento de stock
        await tx.stockMovement.create({
          data: {
            productId: it.productId,
            userId: user.id || user.sub,
            type: 'PURCHASE_IN',
            quantity: qty,
            unitAbbreviation: product.unitOfMeasure.abbreviation,
            stockAfter: updatedProduct.currentStock,
            referenceId: purchase.id,
            notes: `Compra #${purchase.purchaseNumber} (Proveedor: ${it.supplierName || 'Proveedor'})`,
          },
        })

        // Si se solicitó actualizar costo de compra, registrar en historial
        if (it.updateCost && cost !== Number(product.currentPurchaseCost)) {
          await tx.priceHistory.create({
            data: {
              productId: it.productId,
              salePrice: product.currentSalePrice,
              purchaseCost: cost,
              changedById: user.id || user.sub,
              changeReason: `Actualización automática por Compra #${purchase.purchaseNumber}`,
            },
          })
        }
      }

      // Si se registró un pago inicial
      if (paidAmount > 0 && initialPayment?.method) {
        await tx.purchasePayment.create({
          data: {
            purchaseId: purchase.id,
            paymentMethod: initialPayment.method,
            amount: paidAmount,
            notes: initialPayment.notes?.trim() || 'Pago inicial al registrar compra',
          },
        })
      }

      return purchase
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
