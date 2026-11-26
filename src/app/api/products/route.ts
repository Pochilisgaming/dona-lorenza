import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const categoryId = searchParams.get('categoryId')
    const search = searchParams.get('search')
    const activeOnly = searchParams.get('activeOnly') !== 'false'

    const where: any = {}
    if (activeOnly) where.isActive = true
    if (categoryId) where.categoryId = categoryId
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        unitOfMeasure: true,
        priceHistories: {
          orderBy: { effectiveFrom: 'desc' },
          take: 5,
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(products)
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
    const {
      name,
      description,
      code,
      categoryId,
      unitOfMeasureId,
      currentSalePrice,
      currentPurchaseCost,
      currentStock,
      minStock,
      imageUrl,
    } = body

    if (!name || !categoryId || !unitOfMeasureId) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }

    const salePrice = Number(currentSalePrice) || 0
    const purchaseCost = Number(currentPurchaseCost) || 0
    const stock = Number(currentStock) || 0
    const minStk = Number(minStock) || 0

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          code: code?.trim() || null,
          categoryId,
          unitOfMeasureId,
          currentSalePrice: salePrice,
          currentPurchaseCost: purchaseCost,
          currentStock: stock,
          minStock: minStk,
          imageUrl: imageUrl || null,
          isActive: true,
        },
      })

      // Registrar historial inicial
      await tx.priceHistory.create({
        data: {
          productId: created.id,
          salePrice,
          purchaseCost,
          changedById: user.id || user.sub,
          changeReason: 'Creación de producto',
        },
      })

      // Si se ingresó stock inicial, registrar movimiento
      if (stock > 0) {
        const uom = await tx.unitOfMeasure.findUnique({ where: { id: unitOfMeasureId } })
        await tx.stockMovement.create({
          data: {
            productId: created.id,
            userId: user.id || user.sub,
            type: 'ADJUSTMENT_IN',
            quantity: stock,
            unitAbbreviation: uom?.abbreviation || 'u',
            stockAfter: stock,
            notes: 'Stock inicial al dar de alta el producto',
          },
        })
      }

      return created
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'El código de producto ya existe' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = session.user as any
    const body = await req.json()
    const {
      id,
      name,
      description,
      code,
      categoryId,
      unitOfMeasureId,
      currentSalePrice,
      currentPurchaseCost,
      minStock,
      imageUrl,
      isActive,
      changeReason,
    } = body

    if (!id) {
      return NextResponse.json({ error: 'ID de producto requerido' }, { status: 400 })
    }

    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    const newSalePrice = currentSalePrice !== undefined ? Number(currentSalePrice) : Number(existing.currentSalePrice)
    const newPurchaseCost = currentPurchaseCost !== undefined ? Number(currentPurchaseCost) : Number(existing.currentPurchaseCost)

    const isPriceChanged =
      newSalePrice !== Number(existing.currentSalePrice) ||
      newPurchaseCost !== Number(existing.currentPurchaseCost)

    // Si intenta cambiar precio, verificar rol SUPER_ADMIN
    if (isPriceChanged && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Solo los SUPER_ADMIN pueden modificar precios de venta y costos' }, { status: 403 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      const prod = await tx.product.update({
        where: { id },
        data: {
          ...(name && { name: name.trim() }),
          ...(description !== undefined && { description: description?.trim() || null }),
          ...(code !== undefined && { code: code?.trim() || null }),
          ...(categoryId && { categoryId }),
          ...(unitOfMeasureId && { unitOfMeasureId }),
          ...(isPriceChanged && {
            currentSalePrice: newSalePrice,
            currentPurchaseCost: newPurchaseCost,
          }),
          ...(minStock !== undefined && { minStock: Number(minStock) }),
          ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
          ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        },
      })

      if (isPriceChanged) {
        await tx.priceHistory.create({
          data: {
            productId: id,
            salePrice: newSalePrice,
            purchaseCost: newPurchaseCost,
            changedById: user.id || user.sub,
            changeReason: changeReason?.trim() || 'Actualización de precio/costo',
          },
        })
      }

      return prod
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID de producto requerido' }, { status: 400 })
    }

    // Baja lógica (soft delete)
    const updated = await prisma.product.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ message: 'Producto dado de baja exitosamente', product: updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
