import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const session = await auth()
    const user = session?.user as any

    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acceso exclusivo para Super Administradores' }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(users)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    const currentUser = session?.user as any

    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acceso exclusivo para Super Administradores' }, { status: 403 })
    }

    const body = await req.json()
    const { username, fullName, password, role } = body

    if (!username || !fullName || !password) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }

    const cleanUsername = username.trim().toLowerCase()
    const passwordHash = await bcrypt.hash(password, 12)

    const created = await prisma.user.create({
      data: {
        username: cleanUsername,
        fullName: fullName.trim(),
        passwordHash,
        role: role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'VENDEDOR',
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'El nombre de usuario ya está registrado' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth()
    const currentUser = session?.user as any

    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acceso exclusivo para Super Administradores' }, { status: 403 })
    }

    const body = await req.json()
    const { id, fullName, password, isActive, role } = body

    if (!id) {
      return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 })
    }

    const dataToUpdate: any = {}
    if (fullName) dataToUpdate.fullName = fullName.trim()
    if (isActive !== undefined) dataToUpdate.isActive = Boolean(isActive)
    if (role && (role === 'SUPER_ADMIN' || role === 'VENDEDOR')) dataToUpdate.role = role
    if (password) {
      dataToUpdate.passwordHash = await bcrypt.hash(password, 12)
    }

    const updated = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
