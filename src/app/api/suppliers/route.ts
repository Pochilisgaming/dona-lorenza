import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')

    const where: any = { isActive: true }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { taxId: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ]
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      include: {
        _count: { select: { purchases: true } },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(suppliers)
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

    const body = await req.json()
    const { name, contactName, phone, email, address, taxId } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'El nombre del proveedor es obligatorio' }, { status: 400 })
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: name.trim(),
        contactName: contactName?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        taxId: taxId?.trim() || null,
        isActive: true,
      },
    })

    return NextResponse.json(supplier, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { id, name, contactName, phone, email, address, taxId, isActive } = body

    if (!id) {
      return NextResponse.json({ error: 'ID de proveedor requerido' }, { status: 400 })
    }

    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(contactName !== undefined && { contactName: contactName?.trim() || null }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(address !== undefined && { address: address?.trim() || null }),
        ...(taxId !== undefined && { taxId: taxId?.trim() || null }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
