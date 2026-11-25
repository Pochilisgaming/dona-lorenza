import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET() {
  try {
    const units = await prisma.unitOfMeasure.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(units)
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
    const { name, abbreviation, allowsFractions } = body

    if (!name || !abbreviation) {
      return NextResponse.json({ error: 'Nombre y abreviatura son requeridos' }, { status: 400 })
    }

    const unit = await prisma.unitOfMeasure.create({
      data: {
        name: name.trim(),
        abbreviation: abbreviation.trim().toLowerCase(),
        allowsFractions: Boolean(allowsFractions),
        isActive: true,
      },
    })

    return NextResponse.json(unit, { status: 201 })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe una unidad con esa abreviatura' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
