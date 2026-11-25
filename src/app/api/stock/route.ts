import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const productId = searchParams.get('productId')
    const limit = Number(searchParams.get('limit')) || 50

    const where: any = {}
    if (productId) where.productId = productId

    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        product: { select: { name: true, code: true, unitOfMeasure: true } },
        user: { select: { fullName: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json(movements)
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
    const { productId, type, quantity, notes } = body

    if (!productId || !type || quantity === undefined) {
      return NextResponse.json({ error: 'Faltan datos del ajuste' }, { status: 400 })
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { unitOfMeasure: true },
    })

    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    const qty = Number(quantity)
    let newStock = Number(product.currentStock)

    if (type === 'ADJUSTMENT_IN' || type === 'PURCHASE_IN') {
      newStock += qty
    } else if (type === 'ADJUSTMENT_OUT' || type === 'SALE_OUT') {
      newStock = Math.max(0, newStock - qty)
    } else if (type === 'INVENTORY') {
      // Conciliación de inventario: reemplazo directo por conteo físico
      newStock = Math.max(0, qty)
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { currentStock: newStock },
      })

      const movement = await tx.stockMovement.create({
        data: {
          productId,
          userId: user.id || user.sub,
          type: type as any,
          quantity: qty,
          unitAbbreviation: product.unitOfMeasure.abbreviation,
          stockAfter: newStock,
          notes: notes?.trim() || null,
        },
      })

      return { product: updatedProduct, movement }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
