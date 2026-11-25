import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = Number(searchParams.get('limit')) || 50

    const where: any = {}
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        user: { select: { fullName: true, username: true } },
        customer: true,
        items: {
          include: {
            product: { select: { name: true, code: true } },
            subItems: {
              include: {
                product: { select: { name: true, code: true } },
              },
            },
          },
        },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json(sales)
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
    const { items, payments, customerId, discountAmount } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'El carrito no puede estar vacío' }, { status: 400 })
    }

    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      return NextResponse.json({ error: 'Debe especificar al menos un medio de pago' }, { status: 400 })
    }

    // 1. Obtener caja abierta activa
    const activeRegister = await prisma.cashRegister.findFirst({
      where: { status: 'OPEN' },
    })

    if (!activeRegister) {
      return NextResponse.json(
        { error: 'No se puede registrar ventas sin una caja abierta. Por favor, abre la caja primero.' },
        { status: 400 }
      )
    }

    // 2. Transacción atómica de venta
    const result = await prisma.$transaction(async (tx) => {
      let subtotal = 0

      // Calcular subtotales
      for (const it of items) {
        subtotal += Number(it.lineTotal) || 0
      }

      const discount = Number(discountAmount) || 0
      const total = Math.max(0, subtotal - discount)

      // Validar que la suma de los pagos coincida con el total
      const totalPaid = payments.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0)
      if (Math.abs(totalPaid - total) > 0.05) {
        throw new Error(`El total de los pagos ($${totalPaid.toFixed(2)}) no coincide con el total de la venta ($${total.toFixed(2)})`)
      }

      // Crear la venta
      const sale = await tx.sale.create({
        data: {
          userId: user.id || user.sub,
          customerId: customerId || null,
          cashRegisterId: activeRegister.id,
          subtotal,
          discountAmount: discount,
          total,
          status: 'COMPLETED',
        },
      })

      // Procesar ítems (simples y sándwiches compuestos)
      for (const item of items) {
        if (item.isComposite && item.ingredients && item.ingredients.length > 0) {
          // 🥪 Sándwich armado al momento
          // 1. Crear el ítem padre representativo del sándwich
          const parentItem = await tx.saleItem.create({
            data: {
              saleId: sale.id,
              productId: item.productId, // ID de producto sándwich o producto base
              quantity: Number(item.quantity) || 1,
              unitAbbreviation: item.unitAbbreviation || 'u',
              unitSalePrice: Number(item.unitSalePrice) || 0,
              unitPurchaseCost: Number(item.unitPurchaseCost) || 0,
              lineTotal: Number(item.lineTotal) || 0,
              notes: item.notes || 'Sándwich armado al momento',
            },
          })

          // 2. Para cada ingrediente: crear subItem, congelar precios históricos y descontar stock
          for (const ing of item.ingredients) {
            const ingQty = Number(ing.quantity) || 0
            const ingSalePrice = Number(ing.unitSalePrice) || 0
            const ingCost = Number(ing.unitPurchaseCost) || 0
            const ingSubtotal = Number(ing.subtotal) || (ingQty * ingSalePrice)

            await tx.saleItem.create({
              data: {
                saleId: sale.id,
                productId: ing.productId,
                parentItemId: parentItem.id,
                quantity: ingQty,
                unitAbbreviation: ing.unitAbbreviation || 'kg',
                unitSalePrice: ingSalePrice,
                unitPurchaseCost: ingCost,
                lineTotal: ingSubtotal,
                notes: `Ingrediente de sándwich: ${ing.name}`,
              },
            })

            // Descontar stock del ingrediente utilizado
            const prod = await tx.product.update({
              where: { id: ing.productId },
              data: {
                currentStock: { decrement: ingQty },
              },
            })

            // Registrar movimiento de stock
            await tx.stockMovement.create({
              data: {
                productId: ing.productId,
                userId: user.id || user.sub,
                type: 'SALE_OUT',
                quantity: ingQty,
                unitAbbreviation: ing.unitAbbreviation || 'kg',
                stockAfter: prod.currentStock,
                referenceId: sale.id,
                notes: `Consumo por armado de sándwich en venta #${sale.saleNumber}`,
              },
            })
          }
        } else {
          // 🛒 Producto estándar
          const qty = Number(item.quantity) || 1
          const salePrice = Number(item.unitSalePrice) || 0
          const purchaseCost = Number(item.unitPurchaseCost) || 0
          const lineTotal = Number(item.lineTotal) || (qty * salePrice)

          await tx.saleItem.create({
            data: {
              saleId: sale.id,
              productId: item.productId,
              quantity: qty,
              unitAbbreviation: item.unitAbbreviation || 'u',
              unitSalePrice: salePrice,
              unitPurchaseCost: purchaseCost,
              lineTotal,
              notes: item.notes || null,
            },
          })

          // Descontar stock del producto
          const prod = await tx.product.update({
            where: { id: item.productId },
            data: {
              currentStock: { decrement: qty },
            },
          })

          // Registrar movimiento de stock
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              userId: user.id || user.sub,
              type: 'SALE_OUT',
              quantity: qty,
              unitAbbreviation: item.unitAbbreviation || 'u',
              stockAfter: prod.currentStock,
              referenceId: sale.id,
              notes: `Venta #${sale.saleNumber}`,
            },
          })
        }
      }

      // Procesar pagos
      for (const p of payments) {
        await tx.salePayment.create({
          data: {
            saleId: sale.id,
            paymentMethod: p.method,
            amount: Number(p.amount) || 0,
            tenderedAmount: p.tenderedAmount ? Number(p.tenderedAmount) : null,
            changeAmount: p.changeAmount ? Number(p.changeAmount) : null,
          },
        })
      }

      return sale
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
