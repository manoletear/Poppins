# ✅ Cómo loguearte y validar los planes (front ↔ back)

Guía para correr el front conectado a su Supabase y validar el rediseño de planes
(Starter / Pro / Pro+) end-to-end. Pensado para hacerlo en ~10 min.

> El front (`manoletear/Poppins`) usa **su propio proyecto Supabase** (distinto al de
> `Poppins-back`). Por eso esto requiere las credenciales de **ese** proyecto.

## 1. Configurar entorno (2 min)
```bash
cp .env.local.example .env.local
```
Completá en `.env.local` (mínimo para login):
- `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Dashboard → Settings → API)
- `SUPABASE_SERVICE_ROLE_KEY` (para `/api/suscripcion/*`)
- Flow podés dejarlo en `flow_sandbox_key` → corre en **modo simulado** (suficiente para validar la UI y el flujo; no cobra de verdad).

## 2. Aplicar las migraciones de planes (3 min)
En el SQL Editor del Supabase del front, aplicar **en orden**:
1. `supabase/migrations/20260530_planes_pro_unificacion.sql`
2. `supabase/migrations/20260530_suscripcion_state_machine.sql`
3. `supabase/migrations/20260530_solo_lectura_helper.sql`

## 3. Levantar el front
```bash
npm install
npm run dev   # http://localhost:3000
```

## 4. Validar **Starter** (NO necesita seed) ⭐
1. Andá a `/auth/register` y creá una cuenta (o logueate con una existente).
2. Entrás a `/empresa`. Como recién registrado **no tenés empleador aún → el sistema
   te trata como Starter en trial** automáticamente.
3. Verificá:
   - **Banner ámbar** arriba: *"Estás en período de prueba — te quedan 30 días…"*
   - Abajo a la izquierda, el usuario muestra **"Plan Starter · prueba (30d)"**.
   - Abrí **Mi Plan** (menú del usuario) → el modal muestra **Starter como "Plan Actual"**,
     con toggle **Mensual/Anual** y los precios **Pro $19.990 / Pro+ $24.990**
     (anual = "2 meses gratis": $199.900 / $249.900).
   - Botón **"Subir a Pro / Pro+"** → llama a `POST /api/suscripcion/iniciar`
     (en modo Flow simulado responde `simulated:true` y crea la suscripción).

## 5. Validar **Pro / Pro+ / solo-lectura** (con seed, 3 min)
1. Registrá/creá 3 cuentas: `pro@poppins.test`, `proplus@poppins.test`, `vencido@poppins.test`
   (Auth → Add user con auto-confirm, contraseña conocida).
2. Corré `supabase/seed/seed_planes_test.sql` en el SQL Editor.
   (Si tu tabla `empleadores` tiene columnas NOT NULL del schema base, agregálas al INSERT del seed.)
3. Logueate con cada una y verificá:
   - **pro@** → modal con **Pro** como Plan Actual; banner sin aviso de trial.
   - **proplus@** → **Pro+** como Plan Actual.
   - **vencido@** → **banner rojo de solo-lectura** ("Tu prueba terminó…").

## Qué estás validando (el back de verdad)
- `GET /api/suscripcion/estado` (deriva estado vivo: trial/activa/pausada).
- `POST /api/suscripcion/iniciar` (crea customer + suscripción en Flow, escribe en `suscripciones`).
- El motor de fechas (`suscripcion-engine`, 18 tests) y el modal/banner reales.

## Notas
- **Modo simulado de Flow**: sin llaves reales, `iniciar` no redirige a pago real pero sí
  persiste la suscripción → podés validar el flujo completo de UI/estado.
- Para cobro real + recurrente: ver `docs/HANDOFF_PLANES_PRO.md` (provisionar planes en Flow, webhook).
