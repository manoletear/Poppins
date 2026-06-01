# 🔁 Retomar — Login + Deploy (standby 2026-05-31)

Estado al pausar. Todo el trabajo de DB/feature quedó bien; el bloqueo es **infra de Vercel Hobby**, no código.

## ✅ Resuelto y verificado
- **DB canónica del front = `sczxyejqooqthxcxksah`** (confirmado por `ESTADO_INFRA_Y_PLANES.md`). Migraciones aplicadas y verificadas ahí (tablas base `tarjetas_cliente`/`suscripciones`/`contratos_servicio` que faltaban + deltas de planes + función `empleador_solo_lectura` + 42 policies `ro_block_*`). Script consolidado: `docs/APLICAR_MIGRACIONES_sczxy.sql`.
- **Causa raíz del login roto**: la app en Vercel apuntaba a la **DB equivocada** (`akyfibrjbzeaxmczskqr` = BUK/back) en Production y a un tercer proyecto (`cgnzbjxgtaumtnxkqkgy`) en Preview. Se corrigieron las env vars a `sczxy`.
- **Auth config en sczxy**: Google provider habilitado (ya tenía client id/secret). Site URL = `https://poppins-fpds-projects-839a78c7.vercel.app`; Redirect URLs incluyen `…poppins-fpds-projects-839a78c7.vercel.app/**` y `…app-poppins.vercel.app/**`.
- **Código**: `tsc` limpio · 103 tests verdes. Fixes hechos en `feat/planes-hardening` (pendientes de mergear a main):
  - `auth/callback`: ahora preserva las **opciones** de las cookies de sesión (antes se copiaban sin `Max-Age/Path/Secure/SameSite` → sesión no persistía / loop) y expone el error real con `?error=...&detail=...`.
  - `empresa/onboarding`: el catch muestra el mensaje real de Supabase en vez del genérico "Error al activar tu plan.".

## 🔴 Bloqueo actual (Vercel Hobby)
1. **Deploy bloqueado por autor**: "The deployment was blocked because the commit author did not have contributing access… Hobby Plan does not support collaboration for private repos." → Los deploys solo corren si el **commit author** es tu cuenta GitHub `fperezd` (email `40698346+fperezd@users.noreply.github.com`). Ya configuré git local con esa identidad. Por eso PR #2 se mergeó **vía GitHub** (el merge commit lo autora `fperezd` → deploya).
2. Tras el merge de PR #2, el deploy de prod respondía **401 (Vercel Authentication / Deployment Protection)** — revisar Settings → Deployment Protection.

## ▶️ Cómo retomar (elegí UNA)
- **A. Probar local (recomendado, sin tocar Vercel):** ya está `.env.local` apuntando a sczxy. Falta pegar la **service_role de sczxy** (API Keys → Reveal). Agregar `http://localhost:3000/**` a los Redirect URLs de sczxy. `npm run dev` → `http://localhost:3000/auth/login`. Mismo dominio init+callback → el `exchange_failed` no debería ocurrir.
- **B. Producción en Vercel:** desactivar **Deployment Protection** (Settings → Deployment Protection → Vercel Authentication = off) y asegurar que los deploys los dispare un merge/commit autorado por `fperezd`. Mergear los fixes de `feat/planes-hardening` a main. Probar el login **siempre en el mismo dominio** (`poppins-fpds-projects-839a78c7.vercel.app`), en incógnito.
- **C. Plan/hosting:** si Hobby sigue molestando, evaluar Vercel Pro, o migrar a Cloudflare Workers (requiere subir Next a ≥16.2.6 para `@opennextjs/cloudflare` — el adapter NO soporta 16.1.6).

## 🧹 Pendiente de limpieza
- En `main` quedó un commit `debug(auth)` (cherry-pick `bcf3fb9`) que expone el `detail`; el contenido es razonable de mantener, pero conviene revisarlo al consolidar.
- Reconciliar/limpiar las env vars de Preview (`cgnzb`) y el proyecto colgado.
