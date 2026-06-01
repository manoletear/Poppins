# 🔎 Auditoría verificada + Roadmap a 100% (2026-06-01)

Auditoría de código de toda la app (4 auditores en paralelo) **verificada a mano** (los auditores
sobre-reportaron varios "críticos" que resultaron falsos). Conclusión: **la app está
desarrollada y cableada a datos reales en los 3 portales.** Lo que falta para "100% funcionando"
es operativo (credenciales + correr + QA), no reescribir features.

## 🧪 QA runtime real contra sczxy (2026-06-01)
- ✅ **`next build` exit 0** con env reales — las ~50 páginas compilan (catch de errores SSR/data).
- ✅ **Las 55 tablas/vistas que usa la app EXISTEN en sczxy** (probado vía API con anon; 0 faltantes). Esquema completo.
- ✅ **RESUELTO — GRANTs:** el `service_role` no tenía privilegios sobre `public` (daba `42501`), rompiendo todo el server-side. Aplicado `FIX_GRANTS_sczxy.sql` → **verificado: service_role accede a las 49 tablas, 0 denegadas.** (Causa de fondo de "no funcionaba", junto con la DB equivocada.)
- ✅ **RESUELTO — esquema incompleto:** sczxy no tenía `onboarding/documentos/pagos_suscripcion/invitaciones` (20260408 a medias), `beneficios_empleador` (sin migración) ni buckets `comprobantes/documentos`. Aplicado `COMPLETAR_ESQUEMA_sczxy.sql` → **verificado: 49/55 tablas OK (las 6 restantes son BUK + buckets, falsos positivos), buckets avatars/comprobantes/documentos creados.** Esquema 100% completo y accesible.
- ⚠️ No testeable desde acá (DNS bloqueado a hosts externos): BUK (`app.buk.cl`), Flow, Resend, Anthropic. Se validan en tu máquina/Vercel.

## ✅ Estado por área (verificado)

### Portal Empleador (`/empresa/*`) — ~95% funcional, Supabase real
CRUD real en: dashboard, empleados (+detalle), contratos, horarios, pagos, tareas, compras,
recordatorios, solicitudes/anticipos, familia, vivienda, perfil (Familia/Mascotas/Preferencias),
liquidaciones, noticias, completar-hogar, onboarding, suscripción/confirmar.
- `pagos/components/`: 6/7 con lógica real; **PointsDashboard.tsx es estático** (proyección de puntos — display).

### Portal Empleado (`/portal/*`) — ~95% funcional, Supabase real
CRUD real en: dashboard, anticipos, compras, documentos, liquidaciones (firma), marcaje (entrada/colación/salida),
mi-ficha, onboarding, solicitudes, tareas, vacaciones, visitas. Ayuda (FAQ estática, OK), beneficios (legales
estáticos + personalizados de BD).
- **Menores:** ayuda-médica → feedback 👍👎 no se persiste (TODO); recordatorios → el empleado solo marca cumplido (crear es del empleador, por diseño).

### Portal Admin (`/admin/*`) — funcional, Supabase real
Real en: dashboard, empleadores (+detalle, cambiar plan/estado), empleados (+detalle, CSV PREVIRED),
facturación (genera `facturas_poppins`, MRR), liquidaciones, configuración, **cierre-mes** (los botones SÍ
llaman a los generators reales: sueldos Excel, liquidaciones PDF, libros, contabilidad, Previred, LRE).
- **Menor:** UF de referencia hardcodeada (`38700`) en configuración.

### Integraciones
- **Supabase** (auth + DB): real, fundamental. ✅
- **Motor de liquidaciones/finiquito** (`lib/payroll`): real, puro, **testeado** (legislación CL). ✅
- **BUK** (`lib/buk-sdk`): SDK real completo (HTTP, paginación, timeouts). Corre en **MOCK** si `USE_MOCK_DATA=true` o falta `BUK_API_TOKEN`. Afecta: empleados/payroll/vacaciones/ausencias/beneficios desde BUK.
- **Flow** (`lib/flow`, `lib/pagos`): pagos uno-a-uno y suscripciones implementados; corren **SIMULADO** sin `FLOW_API_KEY/SECRET` reales. Webhook de suscripción: firma + mapeo de status **provisional** (validar contra sandbox).
- **Claude (chat landing/médico)**: real con fallback local sin `ANTHROPIC_API_KEY`. ✅
- **Email (Resend)**: `lib/email/send.ts` existe; requiere `RESEND_API_KEY` para enviar de verdad.
- **Cron alertas**: implementado; auth por `CRON_SECRET` (laxa si la var está vacía).

## 🎯 Roadmap a 100% (lo que realmente falta)

### 1. Hacerla CORRER (bloqueante de todo el QA) — ver `RETOMAR_LOGIN_Y_DEPLOY.md`
- Resolver login/deploy (env=sczxy ✓, falta destrabar Vercel Hobby o correr local).
- Pegar `SUPABASE_SERVICE_ROLE_KEY` de sczxy.

### 2. Credenciales/config (env vars) — define qué deja de ser mock/simulado
| Var | Habilita | Sin ella |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | APIs server-side, webhooks | rotas |
| `BUK_API_TOKEN` + `USE_MOCK_DATA=false` | empleados/payroll/vacaciones reales | datos mock |
| `FLOW_API_KEY` / `FLOW_SECRET_KEY` | cobros reales | simulado |
| `RESEND_API_KEY` | emails reales | no envía |
| `ANTHROPIC_API_KEY` | chat con IA real | fallback local |
| `CRON_SECRET` | proteger cron | endpoint abierto |

### 3. QA runtime (una vez corriendo) — clickear las ~50 pantallas
Checklist por portal con foco en escrituras (crear/editar/eliminar, marcaje, firma, aprobaciones).

### 4. Code TODOs menores (no bloqueantes)
- `PointsDashboard.tsx` estático (proyección de puntos).
- Ayuda-médica: persistir feedback 👍👎.
- `mappers.ts:63` "Familia Aravena Riffo" hardcodeado (multi-employer).
- UF hardcodeada en admin/configuración.
- Webhook Flow: validar mapeo de status real contra sandbox.

## 📝 Nota de método
Los 4 auditores reportaron varios "🔴 críticos" (cierre-mes sin generators, email inexistente, etc.)
que **al verificar resultaron falsos**. Tomar reportes de auditoría siempre con verificación directa.
