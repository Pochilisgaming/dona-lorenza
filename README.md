# 🥬 Doña Lorenza — Sistema de Gestión Comercial y Punto de Venta (POS)

Sistema de gestión integral para **Doña Lorenza** (verdulería premium, almacén, fiambrería y armado de sándwiches al momento), construido con **Next.js 14+ (App Router)**, **TypeScript**, **Tailwind CSS**, **Prisma** y **PostgreSQL**.

---

## 🚀 Características Principales Desarrolladas

1. **🛒 Punto de Venta (POS) Ultrarrápido:**
   - Interfaz táctil adaptada para Android y pantallas desktop.
   - Búsqueda instantánea con precio de venta vigente y unidad al momento.
   - Manejo de cantidades fraccionarias (`0.350 kg`) o enteros según la unidad.
   - **Calculadora de vuelto automática:** campo `monto_recibido` para cobrar en efectivo con precisión.
   - **🥪 Armado de Sándwiches al Momento:** selector dinámico de insumos (pan, fiambrería, quesos, vegetales) con suma en vivo de los precios vigentes para cobrar al instante y descuento automático del stock individual de cada ingrediente.
   - **Medios de pago:** Efectivo, QR, Débito, Crédito, Transferencia y pagos divididos.
   - Snapshot de precio de venta y costo histórico por cada ítem e ingrediente vendido.

2. **📦 Productos y Categorías Dinámicas:**
   - Creación, modificación y baja lógica de productos.
   - **Categorías 100% dinámicas:** alta rápida de categorías en el momento sin listados fijos.
   - **Unidades de medida:** base configurable (kg, g, u, dz, l, ml, m, at, bj, paq, bot) con posibilidad de modificar la unidad de un producto en cualquier momento.
   - Cálculo automático de margen comercial sobre costo.

3. **💲 Lista de Precios en Tiempo Real:**
   - Consultable en cualquier momento por todo el equipo.
   - **Edición exclusiva para SUPER_ADMIN** (`Pablo D.` y `Karina`).
   - Registro automático en `PriceHistory` de cada modificación de precio o costo.
   - Exportación de la lista completa a CSV.

4. **💰 Control y Cierre de Caja:**
   - Apertura con fondo inicial de efectivo.
   - Ingresos y retiros manuales (gastos en efectivo, pagos a proveedores).
   - Cierre de turno con desglose automático por medio de pago y cálculo de diferencia de efectivo (declarado vs. esperado).
   - Historial de todas las sesiones de caja anteriores.

5. **📊 Control de Stock e Inventario:**
   - Alertas visuales de stock bajo mínimo para reposición.
   - Ajustes manuales (mermas, roturas, consumo interno o conteo físico de inventario).
   - Log completo de movimientos de stock.

6. **🔐 Usuarios y Seguridad:**
   - Control de roles estricto: `SUPER_ADMIN` (exclusivo para `Pablo D.` y `Karina`) y `VENDEDOR`.
   - Módulo administrativo exclusivo para los 2 Super Admins para gestionar personal y resetear contraseñas.
   - Sesión JWT con expiración de 8 horas y claves protegidas con bcrypt (salt rounds = 12).

7. **📱 PWA Mobile-First para Android:**
   - Instalable directamente desde Google Chrome ("Agregar a pantalla principal").
   - Barra de navegación inferior ergonómica para operar con el pulgar en mostrador.

---

## 🛠️ Stack Tecnológico

- **Frontend & Backend:** Next.js 14+ (App Router, Route Handlers) + TypeScript + Tailwind CSS
- **ORM:** Prisma 6.4.1
- **Base de Datos:** PostgreSQL (preparado para Neon Serverless con Connection Pooling)
- **Autenticación:** NextAuth.js (Auth.js) v5
- **Estado:** TanStack React Query

---

## ⚙️ Puesta en Marcha Local

### 1. Variables de Entorno (`.env`)
Configura las cadenas de conexión a tu base de datos Neon (o PostgreSQL local):

```env
DATABASE_URL="postgresql://user:password@ep-pooler.us-east-2.aws.neon.tech/dona_lorenza?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://user:password@ep.us-east-2.aws.neon.tech/dona_lorenza?sslmode=require"
AUTH_SECRET="tu_clave_secreta_jwt"
NEXTAUTH_URL="http://localhost:3000"
```

### 2. Migraciones y Seed Inicial
Ejecuta las migraciones y el seed para cargar los administradores iniciales (`pablo.d` / `karina`), las unidades de medida y el catálogo de muestra:

```bash
npx prisma db push
npx tsx prisma/seed.ts
```

### 3. Iniciar el Servidor de Desarrollo
```bash
npm run dev
```
Abre [http://localhost:3000](http://localhost:3000) en el navegador.

---

## 👥 Usuarios Iniciales de Acceso

- **Pablo D.:** Usuario `pablo.d` / Contraseña `cookiepuki2026` (`SUPER_ADMIN`)
- **Karina:** Usuario `karina` / Contraseña `gordobachicha2026` (`SUPER_ADMIN`)
