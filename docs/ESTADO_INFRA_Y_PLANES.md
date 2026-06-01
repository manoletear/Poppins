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
1. ~~**Acceso a la DB del front** (`sczxy`)~~ ✅ Listo (manoletear te agregó).
2. ~~**Aplicar migraciones** a `sczxy`~~ ✅ Aplicadas vía `docs/APLICAR_MIGRACIONES_sczxy.sql` (incluyó crear tablas base `tarjetas_cliente`/`suscripciones` que faltaban). Verificado: columnas planes + función `empleador_solo_lectura` + 42 policies `ro_block_*`.
3. ~~**Env vars en Vercel**~~ ✅ Corregidas a `sczxy` (estaban apuntando a la DB equivocada `akyfibrj`/`cgnzb` — esa era la causa raíz del login roto). Site URL/Redirect URLs de Auth configurados.
4. ~~**Mergear PR #2**~~ ✅ Mergeado a `main`. **Login/deploy en STANDBY** por límite de Vercel Hobby (deploy bloqueado por autor del commit). Plan de retoma completo en **`docs/RETOMAR_LOGIN_Y_DEPLOY.md`** (recomendado: validar local con `.env.local` ya creado).
5. **Flow real** (cuando lo prendan): llaves `FLOW_API_KEY/SECRET`, crear los 4 planes en Flow (`poppins_pro_mensual`, etc.), y validar payloads de registro-tarjeta + webhook contra el sandbox (hoy andan en modo simulado).

> **Sesión 2026-05-31 (autónoma):** migraciones aplicadas a sczxy; causa raíz del login encontrada (DB equivocada en Vercel) y corregida; fix de cookies de sesión en `auth/callback` (preservar opciones → evita loop); errores reales visibles en callback/onboarding; +11 tests (107 verdes, tsc limpio). Todo en `feat/planes-hardening` (pendiente de re-mergear). Detalle en `RETOMAR_LOGIN_Y_DEPLOY.md`.

## 🧠 Decisiones de producto abiertas
- **Pricing canónico**: quedó tu modelo (3 planes por nº de trabajadores). El Runbook describe otro (Básico/Full por alcance) — reconciliar si hace falta.
- **Org compartida** (mejora): mover repo + Supabase a una GitHub/Supabase Org donde ambos co-dueños sean Owners.
- **Gap de infra-as-code**: el repo NO tiene los `CREATE TABLE` base del front (solo ALTERs). Conviene versionar el esquema (un `pg_dump --schema-only` de `sczxy` commiteado).
