# Poppins ERP 2026 - Deploy Backup (2026-03-20)

## Structure from last deploy (commit a9d785f)

### Landing Page (`/`)
- 3 role selection cards:
  - **Administrador** → `/admin` (zinc-900/700 gradient, Shield icon)
  - **Empleador** → `/empresa` (blue-600/800 gradient, Building2 icon)
  - **Empleado** → `/portal` (emerald-600/800 gradient, CircleUser icon)
- Title: "Poppins" / "ERP RRHH Chile 2026"
- Footer: "Selecciona tu perfil para continuar"

### Dashboard Layout (`/dashboard`)
Sidebar (w-64, bg-zinc-50) with sections:

**Principal:**
- Dashboard (`/dashboard`) - LayoutDashboard icon
- Mi Ficha (`/dashboard/mi-ficha`) - CircleUser icon
- Colaboradores (`/dashboard/trabajadoras`) - Users icon
- Contratos (`/dashboard/contratos`) - FileText icon

**Remuneraciones:**
- Liquidaciones (`/dashboard/liquidaciones`) - Receipt icon
- Finiquitos (`/dashboard/finiquitos`) - UserX icon
- Indicadores (`/dashboard/indicadores`) - TrendingUp icon

**Gestión:**
- Asistencia (`/dashboard/asistencia`) - Clock icon
- Vacaciones (`/dashboard/vacaciones`) - Umbrella icon
- Beneficios (`/dashboard/beneficios`) - Gift icon

**User footer:**
- Avatar: "RA" (blue-500 to blue-700 gradient)
- Name: "Rene Alejandro"
- Sub: "Mi Cuenta"

Mobile: hamburger menu header + slide-out sidebar

### Mi Ficha (`/dashboard/mi-ficha`)
Left sidebar (w-72):
- Avatar: "RA" (indigo-500 to blue-600, 20x20)
- Name: "Rene Alejandro Aravena Riffo"
- Role: "Gerente General"
- Badge: "Ficha: F1" (indigo)
- Button: "Actualizar Datos" (pencil icon)
- Info General section (collapsible):
  - RUT: 6.836.579-1
  - Correo: manuel.aravenal@gmail.com
  - Cumpleaños: 19-10-1951 (74 años)
  - Dirección: Av. Principal 1234
  - Teléfono: +56 9 1234 5678

Right content area:
- Tabs: Resumen | Liquidaciones | Documentos | Historial
- Resumen tab (grid cols-3):
  - Cargo: Gerente General
  - Empresa: Rene Alejandro Aravena Riffo
  - Supervisor: Aravena, Rene Alejandro
  - Equipo: 4 Colaboradores (clickable blue)
  - Sueldo Base: $3.500.000 (Líquido: $2.934.522)
  - Tipo Contrato: Indefinido
  - Jornada Laboral: Mensual 45.0 hrs. (L, M, M, J, V)
  - Fecha Ingreso: 1 de febrero 2026 (alrededor de 2 meses)
  - Saldo Vacaciones: 2.0 días
  - AFP: Cuprum (11.44%)
  - Salud: Banmédica (ISAPRE, 8.5 UF)
  - Cargas Familiares: 3

### Design System
- Font: Inter
- Primary colors: zinc scale, indigo/blue for accents
- Active nav: bg-zinc-900 text-white
- Inactive nav: text-zinc-600
- Section labels: text-[10px] uppercase tracking-wider text-zinc-400
- Cards: rounded-xl border border-zinc-200 bg-white
- Accessible: skip-to-content link, aria labels, role=navigation

### Routes that existed (from sidebar + landing):
- / (landing)
- /admin (admin space)
- /empresa (empresa space - 11 pages)
- /portal (portal space)
- /dashboard (main dashboard)
- /dashboard/mi-ficha
- /dashboard/trabajadoras
- /dashboard/contratos
- /dashboard/liquidaciones
- /dashboard/finiquitos
- /dashboard/indicadores
- /dashboard/asistencia
- /dashboard/vacaciones
- /dashboard/beneficios
