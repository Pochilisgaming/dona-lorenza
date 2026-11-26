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
        { fullName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { taxId: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        _count: { select: { sales: true } },
      },
      orderBy: { fullName: 'asc' },
    })

    return NextResponse.json(customers)
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
    const { fullName, phone, email, address, taxId, creditBalance } = body

    if (!fullName || typeof fullName !== 'string') {
      return NextResponse.json({ error: 'El nombre del cliente es obligatorio' }, { status: 400 })
    }

    const customer = await prisma.customer.create({
      data: {
        fullName: fullName.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        taxId: taxId?.trim() || null,
        creditBalance: Number(creditBalance) || 0,
        isActive: true,
      },
    })

    return NextResponse.json(customer, { status: 201 })
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
    const { id, fullName, phone, email, address, taxId, creditBalance, isActive } = body

    if (!id) {
      return NextResponse.json({ error: 'ID de cliente requerido' }, { status: 400 })
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        ...(fullName && { fullName: fullName.trim() }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(address !== undefined && { address: address?.trim() || null }),
        ...(taxId !== undefined && { taxId: taxId?.trim() || null }),
        ...(creditBalance !== undefined && { creditBalance: Number(creditBalance) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
