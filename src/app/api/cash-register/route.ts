import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const history = searchParams.get('history') === 'true'

    if (history) {
      const registers = await prisma.cashRegister.findMany({
        include: {
          openedBy: { select: { fullName: true, username: true } },
          closedBy: { select: { fullName: true, username: true } },
          cashMovements: true,
          _count: { select: { sales: true } },
        },
        orderBy: { openedAt: 'desc' },
        take: 30,
      })
      return NextResponse.json(registers)
    }

    // Buscar caja abierta actual
    const current = await prisma.cashRegister.findFirst({
      where: { status: 'OPEN' },
      include: {
        openedBy: { select: { fullName: true, username: true } },
        cashMovements: {
          include: { user: { select: { fullName: true } } },
          orderBy: { createdAt: 'desc' },
        },
        sales: {
          where: { status: 'COMPLETED' },
          include: { payments: true },
        },
      },
      orderBy: { openedAt: 'desc' },
    })

    if (!current) {
      return NextResponse.json({ isOpen: false, register: null })
    }

    // Calcular totales por medio de pago de la caja abierta
    const paymentTotals = {
      CASH: 0,
      QR: 0,
      DEBIT: 0,
      CREDIT: 0,
      TRANSFER: 0,
    }

    current.sales.forEach((s) => {
      s.payments.forEach((p) => {
        paymentTotals[p.paymentMethod] = (paymentTotals[p.paymentMethod] || 0) + Number(p.amount)
      })
    })

    // Movimientos manuales
    let totalInflow = 0
    let totalOutflow = 0
    current.cashMovements.forEach((m) => {
      if (m.type === 'INCOME') totalInflow += Number(m.amount)
      if (m.type === 'EXPENSE') totalOutflow += Number(m.amount)
    })

    const opening = Number(current.openingAmount)
    const expectedCash = opening + paymentTotals.CASH + totalInflow - totalOutflow

    return NextResponse.json({
      isOpen: true,
      register: {
        ...current,
        expectedCash,
        paymentTotals,
        totalInflow,
        totalOutflow,
      },
    })
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
    const { action } = body

    if (action === 'OPEN') {
      const active = await prisma.cashRegister.findFirst({ where: { status: 'OPEN' } })
      if (active) {
        return NextResponse.json({ error: 'Ya existe una caja abierta en el sistema' }, { status: 400 })
      }

      const openingAmount = Number(body.openingAmount) || 0
      const register = await prisma.cashRegister.create({
        data: {
          openedById: user.id || user.sub,
          openingAmount,
          expectedCash: openingAmount,
          status: 'OPEN',
        },
      })
      return NextResponse.json(register, { status: 201 })
    }

    if (action === 'CLOSE') {
      const active = await prisma.cashRegister.findFirst({
        where: { status: 'OPEN' },
        include: {
          sales: { where: { status: 'COMPLETED' }, include: { payments: true } },
          cashMovements: true,
        },
      })

      if (!active) {
        return NextResponse.json({ error: 'No hay ninguna caja abierta para cerrar' }, { status: 400 })
      }

      const declaredCash = Number(body.declaredCash) || 0

      // Calcular esperado
      let cashSales = 0
      active.sales.forEach((s) => {
        s.payments.forEach((p) => {
          if (p.paymentMethod === 'CASH') cashSales += Number(p.amount)
        })
      })

      let movementsSum = 0
      active.cashMovements.forEach((m) => {
        if (m.type === 'INCOME') movementsSum += Number(m.amount)
        if (m.type === 'EXPENSE') movementsSum -= Number(m.amount)
      })

      const expectedCash = Number(active.openingAmount) + cashSales + movementsSum
      const difference = declaredCash - expectedCash

      const closed = await prisma.cashRegister.update({
        where: { id: active.id },
        data: {
          closedById: user.id || user.sub,
          expectedCash,
          declaredCash,
          difference,
          status: 'CLOSED',
          closedAt: new Date(),
        },
      })

      return NextResponse.json(closed)
    }

    if (action === 'MOVEMENT') {
      const active = await prisma.cashRegister.findFirst({ where: { status: 'OPEN' } })
      if (!active) {
        return NextResponse.json({ error: 'Debe haber una caja abierta para registrar movimientos' }, { status: 400 })
      }

      const { type, amount, description } = body
      if (!type || !amount || !description) {
        return NextResponse.json({ error: 'Faltan datos del movimiento' }, { status: 400 })
      }

      const movement = await prisma.cashMovement.create({
        data: {
          cashRegisterId: active.id,
          userId: user.id || user.sub,
          type: type as 'INCOME' | 'EXPENSE',
          amount: Number(amount),
          description: description.trim(),
        },
      })

      return NextResponse.json(movement, { status: 201 })
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
