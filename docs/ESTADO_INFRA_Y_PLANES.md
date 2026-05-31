# 📍 Estado consolidado — Infra + feature de Planes

Resumen para retomar sin reconstruir todo el hilo. (Detalle del feature en
`HANDOFF_PLANES_PRO.md`; guía de validación en `VALIDAR_PLANES.md`.)

## 🗺️ Mapa de infraestructura (resuelto)
| Pieza | Cuál es | Notas |
|---|---|---|
| **Repo del front (canónico)** | **`fperezd/poppins`** | Tu cuenta. Conectado a tu Vercel. Es el que deployás. `main` ya tiene la app completa + planes. |
| Repo del dev (co-dueño) | `manoletear/Poppins` | Mismo código origen; PR allí cerrado (consolidado en fperezd/poppins). |
| Fork accidental | `fperezd/Poppins-1` | Borrable (basura). |
| Vercel | proyecto **`poppins`** (`fpds-projects…`) | Deploya `fperezd/poppins`. Faltan env vars apuntando a la DB del front. |
| **DB del front** | Supabase **`sczxyejqooqthxcxksah`** | Tiene `empleadores`/`suscripciones`/etc. En la org de manoletear (co-dueño). **Acá van las migraciones.** |
| DB de BUK/back | Supabase `akyfibrjbzeaxmczskqr` | Otro producto (tareas/asignaciones). **NO** es del front. No mezclar. |

## ✅ Hecho (en `fperezd/poppins`)
- **PR #1 (mergeado):** app completa + rediseño de planes **Starter / Pro $19.990 / Pro+ $24.990** (sin comisión, anual ×10), motor de estados (trial 30d, camino A/B, cobro 30d, mes-gratis-anual), modal real, banner trial, **login Starter sin fricción**, onboarding con elección de plan, estado/solo-lectura, migraciones.
- **PR #2 (abierto):** hardening — verificación de firma del webhook Flow, **registro de tarjeta (camino A real)**, policies RLS de solo-lectura, tests de lifecycle.
- Verificación: `tsc` limpio · **26 tests** · `next build` compila.

## 🔴 Lo que falta — REQUIERE TU ACCIÓN (no se puede autónomo)
1. **Acceso a la DB del front** (`sczxy`): que manoletear te agregue como member (rol Administrator) de su org Supabase. (Mensaje listo en el chat.)
2. **Aplicar migraciones** a `sczxy` (SQL Editor): los 3 bloques `20260530_*` + `20260531_rls_solo_lectura_policies.sql`.
3. **Env vars en Vercel** (`poppins`): `NEXT_PUBLIC_SUPABASE_URL` = `https://sczxyejqooqthxcxksah.supabase.co` + anon + service_role (de `sczxy`), `NEXT_PUBLIC_SITE_URL`.
4. **Revisar/mergear PR #2** y **redeploy** → validar (registrate → Starter en trial; onboarding → Pro/Pro+).
5. **Flow real** (cuando lo prendan): llaves `FLOW_API_KEY/SECRET`, crear los 4 planes en Flow (`poppins_pro_mensual`, etc.), y validar payloads de registro-tarjeta + webhook contra el sandbox (hoy andan en modo simulado).

## 🧠 Decisiones de producto abiertas
- **Pricing canónico**: quedó tu modelo (3 planes por nº de trabajadores). El Runbook describe otro (Básico/Full por alcance) — reconciliar si hace falta.
- **Org compartida** (mejora): mover repo + Supabase a una GitHub/Supabase Org donde ambos co-dueños sean Owners.
- **Gap de infra-as-code**: el repo NO tiene los `CREATE TABLE` base del front (solo ALTERs). Conviene versionar el esquema (un `pg_dump --schema-only` de `sczxy` commiteado).
