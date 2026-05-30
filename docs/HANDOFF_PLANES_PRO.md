# 🤝 HANDOFF — Rediseño de Planes (Starter / Pro / Pro+) + Suscripciones Flow

> Branch: **`feat/planes-pro-suscripciones`** · 5 commits (Fase 0 → 4).
> Implementa el modelo de planes confirmado con el CTO y reemplaza el billing
> mockup/divergente anterior (casa/hogar/poppins, con comisión, flat $24.770).

## 📌 Modelo implementado

| Plan | Para | Mensual | Anual (paga 10) |
|---|---|---|---|
| **Starter** | Prueba 30 días, sin tarjeta | Gratis | — |
| **Pro** | 1 trabajador | $14.990 | $149.900 |
| **Pro+** | Trabajadores ilimitados | $19.990 | $199.900 |

- **Sin comisión** (eliminada de código y UI).
- **Cobro**: cada 30 días desde el inicio efectivo de la suscripción, vía Flow.
- **Camino A** (tarjeta al inicio): meses 1-2 sin cobro → primer cobro día 60 + **1 mes gratis cada 12**.
- **Camino B** (sin tarjeta): usa el trial de 30 días; al día 30 se suscribe y paga mes a mes (sin bonus).
- Trial vencido sin suscripción → **solo-lectura**.

## 🧱 Qué hay en cada fase

- **Fase 0** — Catálogo único `lib/pagos/plans.ts` (`PLANES`, `getPrecio`, `canAddTrabajador`) + `types.ts` (`PlanTipo='starter'|'pro'|'pro_plus'`, `CicloFacturacion`). Unifica admin (×4), PlanBanner. Migración `20260530_planes_pro_unificacion.sql` convierte `empleadores.plan_tipo`.
- **Fase 1** — Motor PURO `suscripcion-engine.ts` (trial, primerCobro A/B, proximoCobro, mes-gratis-anual, estados) con **18 tests verdes**. Migración `20260530_suscripcion_state_machine.sql` extiende `suscripciones` (plan_tipo/ciclo/camino/trial/fechas/flow ids).
- **Fase 2** — `lib/flow.ts` extendido con la API de **Suscripciones de Flow** (customer/register-card/plan/subscription/cancel) + modo simulado. `suscripcion-service.ts` (iniciar/cancelar/webhook/provisioning). Rutas `POST /api/suscripcion/iniciar` y `/webhook`.
- **Fase 3** — `estado-suscripcion.ts` + `GET /api/suscripcion/estado` (estado vivo) + migración `20260530_solo_lectura_helper.sql` (función SQL `empleador_solo_lectura()` + patrón RLS documentado).
- **Fase 4** — Modal `empresa/layout.tsx` **real** (plan actual dinámico, toggle mensual/anual, botones wired) + `SuscripcionBanner` (prueba/solo-lectura).

## ✅ Verificación
`tsc --noEmit` limpio · `next build` **Compiled successfully** · 18 tests del motor verdes.
(El build no completa page-data por falta de `.env.local` en el clone — env, no código. El repo ya arrastra ~262 errores de lint pre-existentes ajenos a este cambio.)

## 🚨 Para dejarlo productivo (acciones tuyas)

1. **Aplicar las 3 migraciones** a Supabase (orden por fecha): `planes_pro_unificacion`, `suscripcion_state_machine`, `solo_lectura_helper`.
2. **Flow.cl (Fase 2 necesita provisioning real):**
   - Setear `FLOW_API_KEY` / `FLOW_SECRET_KEY` reales (sin ellas corre en modo **simulado**).
   - Crear los 4 planes en Flow (`poppins_pro_mensual`, `poppins_pro_anual`, `poppins_pro_plus_mensual`, `poppins_pro_plus_anual`) — usar `planesParaFlow()` como guía.
   - Validar contra sandbox: payload del **webhook** de suscripción + verificar la firma `s` (hoy hay un TODO de seguridad), y el flujo de **registro de tarjeta** (redirect).
3. **RLS solo-lectura**: aplicar el patrón RESTRICTIVE documentado en `solo_lectura_helper.sql` a las tablas de escritura del empleador (revisar choques con RLS existente).

## 🧠 Decisiones/assumptions (revisar)
- Starter (trial) = `max_trabajadores: 1` (como Pro). Si querés que la prueba sea Pro+, cambialo en `plans.ts`.
- Camino A aplica `trial_period_days=60` también en anual (2 meses gratis y luego cobro anual). Edge case.
- El modal del portal usa **camino B** (el bonus de camino A es exclusivo del onboarding con tarjeta al inicio).
- "Cada 30 días": los planes Flow se crean con intervalo **Mensual** (Flow factura por mes calendario). Si querés exactamente 30 días fijos, hay que usar intervalo diario ×30 — decisión pendiente.

## ⏳ No incluido (siguiente iteración)
- Wire del **onboarding** (`/empresa/onboarding` + `/api/onboarding/flow/*`) al nuevo modelo (hoy aún crea la suscripción flat legacy). Conviene migrarlo para que el camino A (tarjeta al inicio, 2 meses gratis) salga del onboarding.
- Cron/registro de tarjeta UI para camino A.
- Tests de integración de las rutas (requieren Supabase/Flow sandbox).
