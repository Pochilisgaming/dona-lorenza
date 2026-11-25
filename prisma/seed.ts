import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed de Doña Lorenza...')

  // 1. Usuarios SUPER_ADMIN iniciales
  const saltRounds = 12
  const pabloPasswordHash = await bcrypt.hash('cookiepuki2026', saltRounds)
  const karinaPasswordHash = await bcrypt.hash('gordobachicha2026', saltRounds)

  const pablo = await prisma.user.upsert({
    where: { username: 'pablo.d' },
    update: {},
    create: {
      username: 'pablo.d',
      fullName: 'Pablo D.',
      passwordHash: pabloPasswordHash,
      role: Role.SUPER_ADMIN,
      isActive: true,
    },
  })

  const karina = await prisma.user.upsert({
    where: { username: 'karina' },
    update: {},
    create: {
      username: 'karina',
      fullName: 'Karina',
      passwordHash: karinaPasswordHash,
      role: Role.SUPER_ADMIN,
      isActive: true,
    },
  })

  console.log('✅ Usuarios iniciales creados:', pablo.username, karina.username)

  // 2. Unidades de medida base
  const unitsData = [
    { name: 'Kilogramo', abbreviation: 'kg', allowsFractions: true },
    { name: 'Gramo', abbreviation: 'g', allowsFractions: true },
    { name: 'Unidad', abbreviation: 'u', allowsFractions: false },
    { name: 'Docena', abbreviation: 'dz', allowsFractions: false },
    { name: 'Litro', abbreviation: 'l', allowsFractions: true },
    { name: 'Mililitro', abbreviation: 'ml', allowsFractions: true },
    { name: 'Metro', abbreviation: 'm', allowsFractions: true },
    { name: 'Atado', abbreviation: 'at', allowsFractions: false },
    { name: 'Bandeja', abbreviation: 'bj', allowsFractions: false },
    { name: 'Paquete', abbreviation: 'paq', allowsFractions: false },
    { name: 'Botella', abbreviation: 'bot', allowsFractions: false },
  ]

  for (const u of unitsData) {
    await prisma.unitOfMeasure.upsert({
      where: { abbreviation: u.abbreviation },
      update: { allowsFractions: u.allowsFractions, name: u.name },
      create: {
        name: u.name,
        abbreviation: u.abbreviation,
        allowsFractions: u.allowsFractions,
        isActive: true,
      },
    })
  }

  console.log('✅ Unidades de medida cargadas con éxito')

  // 3. Categorías iniciales de demostración
  const catVerd = await prisma.category.upsert({
    where: { name: 'Verdulería & Frutas' },
    update: {},
    create: { name: 'Verdulería & Frutas', description: 'Frutas y verduras frescas seleccionadas', sortOrder: 1 },
  })

  const catFiam = await prisma.category.upsert({
    where: { name: 'Fiambrería & Quesos' },
    update: {},
    create: { name: 'Fiambrería & Quesos', description: 'Embutidos, fiambres y quesos al corte', sortOrder: 2 },
  })

  const catPan = await prisma.category.upsert({
    where: { name: 'Panadería & Sándwiches' },
    update: {},
    create: { name: 'Panadería & Sándwiches', description: 'Panes especiales e insumos de sándwich', sortOrder: 3 },
  })

  const catAlm = await prisma.category.upsert({
    where: { name: 'Almacén Premium' },
    update: {},
    create: { name: 'Almacén Premium', description: 'Aceites, conservas, aderezos y secos', sortOrder: 4 },
  })

  // Obtener unidades para relacionar
  const uKg = await prisma.unitOfMeasure.findUnique({ where: { abbreviation: 'kg' } })
  const uU = await prisma.unitOfMeasure.findUnique({ where: { abbreviation: 'u' } })
  const uAt = await prisma.unitOfMeasure.findUnique({ where: { abbreviation: 'at' } })

  if (uKg && uU && uAt) {
    // 4. Productos base para operar y armar sándwiches
    const sampleProducts = [
      {
        name: 'Pan Ciabatta Artesanal',
        code: 'PAN-CIAB',
        categoryId: catPan.id,
        unitOfMeasureId: uU.id,
        currentSalePrice: 1200,
        currentPurchaseCost: 650,
        currentStock: 50,
        minStock: 10,
      },
      {
        name: 'Pan Baguette Rústico',
        code: 'PAN-BAGU',
        categoryId: catPan.id,
        unitOfMeasureId: uU.id,
        currentSalePrice: 1500,
        currentPurchaseCost: 800,
        currentStock: 40,
        minStock: 10,
      },
      {
        name: 'Jamón Cocido Natural Primera',
        code: 'FIAM-JCO',
        categoryId: catFiam.id,
        unitOfMeasureId: uKg.id,
        currentSalePrice: 18500,
        currentPurchaseCost: 11000,
        currentStock: 12.5,
        minStock: 3.0,
      },
      {
        name: 'Queso Tybo Selección',
        code: 'FIAM-QTY',
        categoryId: catFiam.id,
        unitOfMeasureId: uKg.id,
        currentSalePrice: 16000,
        currentPurchaseCost: 9500,
        currentStock: 15.0,
        minStock: 4.0,
      },
      {
        name: 'Jamón Crudo Serrano Reserva',
        code: 'FIAM-JCR',
        categoryId: catFiam.id,
        unitOfMeasureId: uKg.id,
        currentSalePrice: 32000,
        currentPurchaseCost: 21000,
        currentStock: 8.0,
        minStock: 2.0,
      },
      {
        name: 'Tomate Redondo Especial',
        code: 'VERD-TOM',
        categoryId: catVerd.id,
        unitOfMeasureId: uKg.id,
        currentSalePrice: 3500,
        currentPurchaseCost: 1900,
        currentStock: 45.0,
        minStock: 10.0,
      },
      {
        name: 'Palta Hass Calidad',
        code: 'VERD-PAL',
        categoryId: catVerd.id,
        unitOfMeasureId: uKg.id,
        currentSalePrice: 8500,
        currentPurchaseCost: 5200,
        currentStock: 25.0,
        minStock: 5.0,
      },
      {
        name: 'Rúcula Fresca',
        code: 'VERD-RUC',
        categoryId: catVerd.id,
        unitOfMeasureId: uAt.id,
        currentSalePrice: 1200,
        currentPurchaseCost: 600,
        currentStock: 30,
        minStock: 5,
      },
    ]

    for (const prod of sampleProducts) {
      const p = await prisma.product.upsert({
        where: { code: prod.code },
        update: {},
        create: {
          name: prod.name,
          code: prod.code,
          categoryId: prod.categoryId,
          unitOfMeasureId: prod.unitOfMeasureId,
          currentSalePrice: prod.currentSalePrice,
          currentPurchaseCost: prod.currentPurchaseCost,
          currentStock: prod.currentStock,
          minStock: prod.minStock,
          isActive: true,
        },
      })

      // Registrar historial inicial de precio
      await prisma.priceHistory.create({
        data: {
          productId: p.id,
          salePrice: prod.currentSalePrice,
          purchaseCost: prod.currentPurchaseCost,
          changedById: pablo.id,
          changeReason: 'Carga inicial de productos de catálogo',
        },
      })
    }

    console.log('✅ Catálogo y productos iniciales cargados')
  }

  console.log('🎉 Seed completado exitosamente.')
}

main()
  .catch((e) => {
    console.error('Error durante el seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
