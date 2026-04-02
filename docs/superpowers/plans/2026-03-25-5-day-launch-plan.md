# Plan de Lanzamiento — 5 Días

> **Meta:** Poppins funcional para salir a venta el 30 de marzo 2026.
> **Criterio de éxito:** Un empleador real puede registrarse, agregar cuentas, pagar con tarjeta, y su empleada puede ver sus liquidaciones y enviar solicitudes.

---

## Día 1 (Mar 26): FOUNDATION — Auth real en todas las páginas

**Objetivo:** Eliminar todos los IDs hardcodeados. Todo conectado al usuario logueado.

### Bloque 1: employer-queries.ts (1 hora)
- Eliminar `const EMPLEADOR_ID = '11111111...'`
- TODAS las funciones reciben `empleadorId` como parámetro (ya no hardcodeado)
- Las 20+ funciones se actualizan

### Bloque 2: Empresa pages — auth context (2 horas)
Cada página `/empresa/*` necesita:
```tsx
const { profile } = useAuth();
const empleadorId = profile?.empleador_id;
if (!empleadorId) return <Redirect />;
```

Archivos (10):
- `/empresa/page.tsx` — dashboard principal (quitar puntos hardcodeados "12.450", leer de pagos_empleador reales)
- `/empresa/solicitudes/page.tsx`
- `/empresa/empleados/page.tsx`
- `/empresa/familia/page.tsx`
- `/empresa/vivienda/page.tsx`
- `/empresa/perfil/page.tsx`
- `/empresa/liquidaciones/page.tsx`
- `/empresa/tareas/page.tsx`
- `/empresa/recordatorios/page.tsx`
- `/empresa/compras/page.tsx`

### Bloque 3: Portal pages — auth context (2 horas)
Cada página `/portal/*` necesita:
```tsx
const { profile } = useAuth();
const trabajadorId = profile?.trabajador_id;
if (!trabajadorId) return <Redirect />;
```

Archivos (8):
- `/portal/page.tsx` — dashboard empleado
- `/portal/marcaje/page.tsx`
- `/portal/solicitudes/page.tsx`
- `/portal/vacaciones/page.tsx`
- `/portal/documentos/page.tsx`
- `/portal/liquidaciones/page.tsx`
- `/portal/tareas/page.tsx`
- `/portal/compras/page.tsx`

### Bloque 4: Verificar DB views existen (30 min)
- Verificar/crear: `v_contratos_empleador`, `v_dashboard_empleador`, `v_tareas_dia`
- Eliminar fallbacks a mock data donde sea posible

**Entregable día 1:** Login → dashboard con datos REALES del usuario. Cero hardcoded IDs.

---

## Día 2 (Mar 27): PAGOS — El core del negocio funciona end-to-end

**Objetivo:** Un usuario puede pagar una cuenta con tarjeta y el dinero llega.

### Bloque 1: Fix Flow.cl credentials (30 min)
- Obtener API keys de PRODUCCIÓN de Flow.cl (no sandbox)
- Actualizar en Vercel env vars: `FLOW_API_KEY`, `FLOW_SECRET_KEY`
- `FLOW_ENV=production` con keys reales
- Testear un pago real de $1.000 CLP

### Bloque 2: Dashboard principal ↔ Pagos conectados (2 horas)
- Dashboard `/empresa/page.tsx`:
  - KPI "Puntos Acumulados" → query real: `SUM(puntos_acumulados) FROM pagos_empleador WHERE estado='pagado'`
  - KPI "Pagos Pendientes" → query real: `COUNT(*) FROM pagos_empleador WHERE estado='pendiente'`
  - "Solicitudes Pendientes" → query real de `solicitudes_empleado`
  - Sección "Próximos Vencimientos" → cuentas activas con dia_vencimiento próximo
- Quitar TODA la data mock del dashboard (tasks hardcodeados, shopping hardcodeado, news hardcodeado)

### Bloque 3: Auto-sync mensual robusto (1 hora)
- Al inicio de cada mes, generar pagos pendientes para todas las cuentas activas
- Si ya existen, no duplicar
- Mostrar alerta si hay pagos atrasados

### Bloque 4: Comprobante y email (1 hora)
- Al completar pago: generar comprobante PDF real
- Enviar email al empleador confirmando el pago (Supabase Edge Function o Resend)

**Entregable día 2:** Pago real con tarjeta → confirmación → puntos reales acumulados → dashboard actualizado.

---

## Día 3 (Mar 28): RELACIÓN EMPLEADOR ↔ EMPLEADO

**Objetivo:** Ambos usuarios interactúan en tiempo real.

### Bloque 1: Solicitudes bidireccionales (2 horas)
- Empleado crea solicitud → empleador la ve y aprueba/rechaza
- Empleador crea solicitud → empleado la ve y responde
- Unificar tipos entre portal y empresa (fix `medico` vs `permiso_medico`)
- Agregar `motivo_respuesta` al rechazar
- Agregar `empleador_id` al insert del portal (actualmente falta)

### Bloque 2: Marcaje funcional (1 hora)
- Empleado marca entrada/salida desde su portal
- Empleador ve marcajes en tiempo real en su dashboard
- Calcular horas trabajadas automáticamente

### Bloque 3: Tareas conectadas (1 hora)
- Empleador asigna tarea → aparece en portal del empleado
- Empleado marca completada → empleador lo ve
- Dashboard de ambos muestra tareas del día

### Bloque 4: Liquidaciones visibles (1 hora)
- Empleador genera liquidación (o viene de BUK sync)
- Empleado la ve en su portal con desglose
- Vincular pago de sueldo (cuenta_pago tipo sueldo_empleado) con la liquidación

**Entregable día 3:** Empleador y empleado interactúan: solicitudes, tareas, marcaje, liquidaciones.

---

## Día 4 (Mar 29): ONBOARDING + UX PULIDO

**Objetivo:** Un usuario nuevo puede configurar todo en 5 minutos.

### Bloque 1: Onboarding empleador (2 horas)
- Primer login → wizard de 5 pasos:
  1. Datos personales (nombre, RUT, dirección)
  2. Datos vivienda (tipo, dirección, metros)
  3. Registrar tarjeta (BIN detection — ya existe)
  4. Agregar cuentas (discovery — ya existe)
  5. Invitar empleada (email → crea cuenta con rol empleado)
- Marcar `onboarding_completado = true` al finalizar
- Si onboarding no completado → siempre mostrar wizard

### Bloque 2: Onboarding empleado (1 hora)
- Empleado recibe invitación por email
- Primer login → completa sus datos (nombre, RUT, banco para depósito)
- Queda vinculado al empleador automáticamente

### Bloque 3: Navegación y layout (1 hora)
- Sidebar empresa con todos los links correctos y badges de notificación
- Bottom nav portal (mobile-first) con badges
- Loading states consistentes en todas las páginas
- Empty states con CTAs claros (no pantallas en blanco)

### Bloque 4: Responsive mobile (1 hora)
- Portal del empleado es 100% mobile (la mayoría usará celular)
- Empresa puede ser desktop-first pero debe funcionar en tablet
- Testear todos los modales en mobile

**Entregable día 4:** Usuario nuevo se registra → configura todo → invita empleada → ambos operativos.

---

## Día 5 (Mar 30): QA + DEPLOY + LAUNCH

**Objetivo:** Cero errores. Listo para el primer cliente real.

### Bloque 1: Testing end-to-end (2 horas)
- Flujo completo empleador: registro → onboarding → agregar cuentas → pagar → ver puntos
- Flujo completo empleado: recibir invitación → login → marcar → solicitar vacaciones → ver liquidación
- Flujo pago: crear → Flow redirect → confirmar → comprobante → puntos actualizados
- Edge cases: usuario sin cuentas, pago rechazado, doble click, sesión expirada

### Bloque 2: Fix bugs encontrados (2 horas)
- Buffer para arreglar lo que salga del testing

### Bloque 3: Deploy producción (1 hora)
- Verificar env vars en Vercel (Flow PRODUCCIÓN, Supabase, BUK)
- Verificar RLS policies en Supabase (usuarios solo ven sus datos)
- Verificar webhook de Flow apunta a URL correcta
- DNS / dominio propio si aplica

### Bloque 4: Preparar primer cliente (30 min)
- Crear cuenta de prueba para demo
- Seed data realista para presentación
- Documentar: "Cómo invitar a tu primera empleada"

**Entregable día 5:** App en producción, primer cliente puede usarla.

---

## Resumen de Prioridades

| Prioridad | Qué | Por qué |
|-----------|-----|---------|
| 🔴 P0 | Auth real (día 1) | Sin esto nada funciona para usuarios reales |
| 🔴 P0 | Flow producción (día 2) | Sin pagos reales no hay negocio |
| 🔴 P0 | Dashboard ↔ Pagos conectado (día 2) | El cliente debe ver sus puntos reales |
| 🟡 P1 | Solicitudes bidireccionales (día 3) | Core de la relación empleador-empleado |
| 🟡 P1 | Onboarding wizard (día 4) | Sin esto no se puede auto-registrar |
| 🟢 P2 | Mobile responsive (día 4) | Empleadas usan celular |
| 🟢 P2 | Email confirmación (día 2) | Nice to have para lanzamiento |

---

## Lo que NO entra en estos 5 días (fase 2)

- Puntos/millas para el empleado
- Integración API con proveedores de servicios (Enel, Aguas Andinas)
- Búsqueda por dirección/RUT/rol de propiedad (UI existe, backend pendiente)
- Programa de puntos propio de Poppins
- Negociación de tasas con Flow/Transbank
- App móvil nativa
- Múltiples tarjetas por empleador
- Plan upgrade/downgrade con cobro automático
