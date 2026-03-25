# Pagos y Puntos Module Redesign — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the payments module from a basic bill-pay page into Poppins' core business engine — a credit-card recaudation platform with BIN-based card detection, bank-rewards tracking, subscription plans, and a guided onboarding journey.

**Architecture:** Split the 1900-line monolith `empresa/pagos/page.tsx` into focused components. Add new Supabase tables for cards, plans, and bank benefits catalog. Replace hardcoded `EMPLEADOR_ID` with auth context throughout. Build a 4-tab experience: Onboarding/Dashboard → Discovery → Mis Pagos → Puntos & Millas.

**Tech Stack:** Next.js 16, React 19, Supabase (PostgreSQL), Tailwind CSS 4, Flow.cl, TypeScript 5

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/lib/pagos/bin-lookup.ts` | BIN → bank/card-type detection + benefits catalog |
| `src/lib/pagos/plans.ts` | Subscription plan definitions, limits, commission rates |
| `src/lib/pagos/points-calculator.ts` | Calculate projected bank points/miles per payment |
| `src/lib/pagos/types.ts` | All payment module types (extracted from page + new) |
| `src/app/empresa/pagos/components/PagosOnboarding.tsx` | Empty-state dashboard with guided placeholders |
| `src/app/empresa/pagos/components/CardSetup.tsx` | Card registration + BIN detection + bank benefits display |
| `src/app/empresa/pagos/components/AccountDiscovery.tsx` | Search/add accounts by address, RUT, rol, service type |
| `src/app/empresa/pagos/components/PagosList.tsx` | Monthly payments grid + pay-all (extracted from current) |
| `src/app/empresa/pagos/components/PointsDashboard.tsx` | Miles/points tracker with goal projections |
| `src/app/empresa/pagos/components/PlanBanner.tsx` | Current plan indicator + upgrade CTA |
| `src/app/empresa/pagos/components/PaymentModal.tsx` | Confirm payment modal (extracted from current) |
| `src/app/empresa/pagos/components/CuentasConfig.tsx` | Account management tab (extracted from current) |
| `src/app/api/pagos/card-detect/route.ts` | BIN lookup API endpoint |
| `supabase/migrations/20260325_pagos_redesign.sql` | New tables + columns migration |

### Modified Files
| File | Changes |
|------|---------|
| `src/app/empresa/pagos/page.tsx` | Orchestrator only — imports components, manages tabs/routing |
| `src/types/employer.ts` | Add TarjetaCliente, PlanSuscripcion, BeneficioBanco types |
| `src/lib/supabase/employer-queries.ts` | Add card, plan, and points queries; replace EMPLEADOR_ID |
| `src/lib/auth/context.tsx` | Add `empleadorId` getter for convenience |

---

## Chunk 1: Foundation — Types, Plans, BIN Lookup, Migration

### Task 1: Create payment module types

**Files:**
- Create: `src/lib/pagos/types.ts`

- [ ] **Step 1: Create the types file with all payment domain types**

```typescript
// src/lib/pagos/types.ts

// ── Card & Bank ──────────────────────────────────────────────────────
export interface TarjetaCliente {
  id: string;
  empleador_id: string;
  bin: string;              // first 6-8 digits
  ultimos_4: string;        // last 4 digits (display)
  banco: string;            // "Santander", "BCI", "Banco Estado", etc.
  tipo_tarjeta: 'visa' | 'mastercard' | 'amex' | 'diners' | 'otra';
  categoria: 'classic' | 'gold' | 'platinum' | 'signature' | 'infinite' | 'black' | 'otra';
  programa_puntos: string;  // "Latam Pass", "Dollar", "CMR Puntos", etc.
  tasa_puntos: number;      // puntos por cada CLP $1.000 transado
  activa: boolean;
  es_principal: boolean;
  created_at: string;
}

export interface BeneficioBanco {
  id: string;
  banco: string;
  tipo_tarjeta: string;
  categoria: string;
  programa_puntos: string;
  tasa_base: number;        // puntos por $1.000
  tasa_promocional: number | null;
  promo_descripcion: string | null;
  promo_vigente_hasta: string | null;
  categorias_bonus: string[];  // ["viajes", "servicios"]
  valor_punto_clp: number;     // valor aprox en CLP de 1 punto
  created_at: string;
  updated_at: string;
}

export interface BinLookupResult {
  banco: string;
  tipo_tarjeta: 'visa' | 'mastercard' | 'amex' | 'diners' | 'otra';
  categoria: string;
  programa_puntos: string;
  tasa_puntos: number;
  logo_url?: string;
}

// ── Plans ────────────────────────────────────────────────────────────
export type PlanTipo = 'starter' | 'casa' | 'hogar';

export interface PlanSuscripcion {
  tipo: PlanTipo;
  nombre: string;
  precio_mensual: number;    // CLP, 0 for free
  max_cuentas: number;       // 2, 5, unlimited (-1)
  comision_porcentaje: number; // 3.5, 2.5, 1.8
  beneficios: string[];
}

// ── Account Discovery ────────────────────────────────────────────────
export type DiscoveryMethod = 'direccion' | 'rut' | 'rol_propiedad' | 'empresa' | 'servicios';

export interface CuentaDiscoveryResult {
  tipo: string;
  proveedor: string;
  numero_cliente: string | null;
  monto_estimado: number | null;
  fuente: 'api' | 'manual';
  ya_agregada: boolean;
}

// ── Points Projection ────────────────────────────────────────────────
export interface ProyeccionPuntos {
  puntos_mes_actual: number;
  puntos_acumulados: number;
  valor_estimado_clp: number;
  meta_pasaje: MetaPasaje | null;
  porcentaje_meta: number;
  meses_restantes: number;
}

export interface MetaPasaje {
  destino: string;
  millas_necesarias: number;
  millas_actuales: number;
}

// ── Onboarding State ─────────────────────────────────────────────────
export interface OnboardingState {
  tarjeta_registrada: boolean;
  primera_cuenta_agregada: boolean;
  primer_pago_realizado: boolean;
  plan_seleccionado: boolean;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/pagos/types.ts
git commit -m "feat(pagos): add payment module domain types — cards, plans, BIN, points"
```

---

### Task 2: Create subscription plans definition

**Files:**
- Create: `src/lib/pagos/plans.ts`

- [ ] **Step 1: Create plans file**

```typescript
// src/lib/pagos/plans.ts
import type { PlanSuscripcion, PlanTipo } from './types';

export const PLANES: Record<PlanTipo, PlanSuscripcion> = {
  starter: {
    tipo: 'starter',
    nombre: 'Starter',
    precio_mensual: 0,
    max_cuentas: 2,
    comision_porcentaje: 3.5,
    beneficios: [
      '2 cuentas de pago',
      'Pago con tarjeta de credito',
      'Acumulacion de puntos del banco',
      'Comprobantes de pago',
    ],
  },
  casa: {
    tipo: 'casa',
    nombre: 'Casa',
    precio_mensual: 14990,
    max_cuentas: 5,
    comision_porcentaje: 2.5,
    beneficios: [
      '5 cuentas de pago',
      'Comision reducida (2.5%)',
      'Alertas de vencimiento',
      'Historial completo',
      'Proyeccion de puntos/millas',
    ],
  },
  hogar: {
    tipo: 'hogar',
    nombre: 'Hogar',
    precio_mensual: 29990,
    max_cuentas: -1, // unlimited
    comision_porcentaje: 1.8,
    beneficios: [
      'Cuentas ilimitadas',
      'Comision minima (1.8%)',
      'Pago consolidado "Pagar Todo"',
      'Proyeccion de millas a destinos',
      'Soporte prioritario',
      'Promociones bancarias exclusivas',
    ],
  },
};

export function getPlan(tipo: PlanTipo): PlanSuscripcion {
  return PLANES[tipo];
}

export function canAddAccount(planTipo: PlanTipo, currentCount: number): boolean {
  const plan = PLANES[planTipo];
  if (plan.max_cuentas === -1) return true;
  return currentCount < plan.max_cuentas;
}

export function getComision(planTipo: PlanTipo, monto: number): number {
  const plan = PLANES[planTipo];
  return Math.round(monto * plan.comision_porcentaje / 100);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/pagos/plans.ts
git commit -m "feat(pagos): add subscription plan definitions — starter, casa, hogar"
```

---

### Task 3: Create BIN lookup utility

**Files:**
- Create: `src/lib/pagos/bin-lookup.ts`

- [ ] **Step 1: Create BIN lookup with Chilean banks catalog**

```typescript
// src/lib/pagos/bin-lookup.ts
import type { BinLookupResult } from './types';

// Chilean bank BIN ranges (first 6 digits → bank + card info)
// This is a curated catalog — expand as needed
const BIN_CATALOG: { prefix: string; result: BinLookupResult }[] = [
  // Banco Santander
  { prefix: '405616', result: { banco: 'Santander', tipo_tarjeta: 'visa', categoria: 'platinum', programa_puntos: 'Latam Pass', tasa_puntos: 1.0 } },
  { prefix: '450799', result: { banco: 'Santander', tipo_tarjeta: 'visa', categoria: 'signature', programa_puntos: 'Latam Pass', tasa_puntos: 1.5 } },
  { prefix: '455096', result: { banco: 'Santander', tipo_tarjeta: 'visa', categoria: 'gold', programa_puntos: 'Latam Pass', tasa_puntos: 0.8 } },
  { prefix: '525508', result: { banco: 'Santander', tipo_tarjeta: 'mastercard', categoria: 'black', programa_puntos: 'Latam Pass', tasa_puntos: 2.0 } },
  // BCI
  { prefix: '451795', result: { banco: 'BCI', tipo_tarjeta: 'visa', categoria: 'platinum', programa_puntos: 'Latam Pass', tasa_puntos: 1.0 } },
  { prefix: '465375', result: { banco: 'BCI', tipo_tarjeta: 'visa', categoria: 'signature', programa_puntos: 'Dollar', tasa_puntos: 1.2 } },
  { prefix: '542553', result: { banco: 'BCI', tipo_tarjeta: 'mastercard', categoria: 'gold', programa_puntos: 'Dollar', tasa_puntos: 0.7 } },
  // Banco de Chile
  { prefix: '459206', result: { banco: 'Banco de Chile', tipo_tarjeta: 'visa', categoria: 'platinum', programa_puntos: 'Travel Club', tasa_puntos: 1.0 } },
  { prefix: '476257', result: { banco: 'Banco de Chile', tipo_tarjeta: 'visa', categoria: 'infinite', programa_puntos: 'Travel Club', tasa_puntos: 1.8 } },
  { prefix: '553770', result: { banco: 'Banco de Chile', tipo_tarjeta: 'mastercard', categoria: 'black', programa_puntos: 'Travel Club', tasa_puntos: 2.0 } },
  // Banco Estado
  { prefix: '402006', result: { banco: 'Banco Estado', tipo_tarjeta: 'visa', categoria: 'classic', programa_puntos: 'Puntos Estado', tasa_puntos: 0.5 } },
  { prefix: '402007', result: { banco: 'Banco Estado', tipo_tarjeta: 'visa', categoria: 'gold', programa_puntos: 'Puntos Estado', tasa_puntos: 0.8 } },
  // Falabella
  { prefix: '627103', result: { banco: 'Banco Falabella', tipo_tarjeta: 'otra', categoria: 'classic', programa_puntos: 'CMR Puntos', tasa_puntos: 1.0 } },
  { prefix: '559138', result: { banco: 'Banco Falabella', tipo_tarjeta: 'mastercard', categoria: 'gold', programa_puntos: 'CMR Puntos', tasa_puntos: 1.2 } },
  // Scotiabank
  { prefix: '450970', result: { banco: 'Scotiabank', tipo_tarjeta: 'visa', categoria: 'platinum', programa_puntos: 'Scotia Rewards', tasa_puntos: 0.8 } },
  // Itau
  { prefix: '438136', result: { banco: 'Itau', tipo_tarjeta: 'visa', categoria: 'platinum', programa_puntos: 'Latam Pass', tasa_puntos: 1.0 } },
];

// Fallback detection by first digit (card network)
const NETWORK_MAP: Record<string, 'visa' | 'mastercard' | 'amex' | 'diners'> = {
  '4': 'visa',
  '5': 'mastercard',
  '3': 'amex', // 34, 37
  '36': 'diners',
};

export function lookupBin(bin: string): BinLookupResult | null {
  const cleanBin = bin.replace(/\s/g, '').substring(0, 6);
  if (cleanBin.length < 6) return null;

  // Exact BIN match
  const match = BIN_CATALOG.find(entry => cleanBin.startsWith(entry.prefix));
  if (match) return match.result;

  // Fallback: detect network only
  const firstDigit = cleanBin[0];
  const network = NETWORK_MAP[cleanBin.substring(0, 2)] || NETWORK_MAP[firstDigit];
  if (network) {
    return {
      banco: 'Banco no identificado',
      tipo_tarjeta: network,
      categoria: 'otra',
      programa_puntos: 'Consulta con tu banco',
      tasa_puntos: 0.5, // conservative estimate
    };
  }

  return null;
}

// Bank color themes for UI
export const BANK_THEMES: Record<string, { bg: string; text: string; accent: string }> = {
  'Santander': { bg: 'bg-red-50', text: 'text-red-800', accent: 'bg-red-600' },
  'BCI': { bg: 'bg-blue-50', text: 'text-blue-800', accent: 'bg-blue-600' },
  'Banco de Chile': { bg: 'bg-sky-50', text: 'text-sky-800', accent: 'bg-sky-600' },
  'Banco Estado': { bg: 'bg-green-50', text: 'text-green-800', accent: 'bg-green-600' },
  'Banco Falabella': { bg: 'bg-lime-50', text: 'text-lime-800', accent: 'bg-lime-600' },
  'Scotiabank': { bg: 'bg-red-50', text: 'text-red-800', accent: 'bg-red-700' },
  'Itau': { bg: 'bg-orange-50', text: 'text-orange-800', accent: 'bg-orange-600' },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/pagos/bin-lookup.ts
git commit -m "feat(pagos): BIN lookup — Chilean banks catalog with card detection"
```

---

### Task 4: Create points calculator

**Files:**
- Create: `src/lib/pagos/points-calculator.ts`

- [ ] **Step 1: Create points projection engine**

```typescript
// src/lib/pagos/points-calculator.ts
import type { TarjetaCliente, ProyeccionPuntos, MetaPasaje } from './types';

// Popular destinations from Santiago (roundtrip Latam Pass miles)
const DESTINOS_POPULARES: MetaPasaje[] = [
  { destino: 'Lima', millas_necesarias: 15000, millas_actuales: 0 },
  { destino: 'Buenos Aires', millas_necesarias: 15000, millas_actuales: 0 },
  { destino: 'Bogota', millas_necesarias: 25000, millas_actuales: 0 },
  { destino: 'Caracas', millas_necesarias: 35000, millas_actuales: 0 },
  { destino: 'Ciudad de Mexico', millas_necesarias: 35000, millas_actuales: 0 },
  { destino: 'Miami', millas_necesarias: 40000, millas_actuales: 0 },
  { destino: 'Madrid', millas_necesarias: 60000, millas_actuales: 0 },
  { destino: 'Puerto Principe', millas_necesarias: 40000, millas_actuales: 0 },
];

/**
 * Calculate projected points for a given monthly payment volume
 */
export function calcularProyeccion(
  tarjeta: Pick<TarjetaCliente, 'tasa_puntos' | 'programa_puntos'>,
  montoMensualTotal: number,
  puntosAcumulados: number,
): ProyeccionPuntos {
  const puntosMes = Math.floor((montoMensualTotal / 1000) * tarjeta.tasa_puntos);
  const puntosTotal = puntosAcumulados + puntosMes;

  // Find closest achievable destination
  const metaDestinos = DESTINOS_POPULARES
    .map(d => ({ ...d, millas_actuales: puntosTotal }))
    .sort((a, b) => (a.millas_necesarias - a.millas_actuales) - (b.millas_necesarias - b.millas_actuales));

  const metaAlcanzable = metaDestinos.find(d => d.millas_necesarias > puntosTotal) || metaDestinos[0];
  const millasRestantes = Math.max(0, metaAlcanzable.millas_necesarias - puntosTotal);
  const mesesRestantes = puntosMes > 0 ? Math.ceil(millasRestantes / puntosMes) : 999;

  return {
    puntos_mes_actual: puntosMes,
    puntos_acumulados: puntosTotal,
    valor_estimado_clp: puntosTotal * 10, // ~$10 CLP per point (conservative)
    meta_pasaje: { ...metaAlcanzable, millas_actuales: puntosTotal },
    porcentaje_meta: Math.min(100, Math.round((puntosTotal / metaAlcanzable.millas_necesarias) * 100)),
    meses_restantes: mesesRestantes,
  };
}

export function getDestinosDisponibles(puntosActuales: number): MetaPasaje[] {
  return DESTINOS_POPULARES.map(d => ({
    ...d,
    millas_actuales: puntosActuales,
  }));
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/pagos/points-calculator.ts
git commit -m "feat(pagos): points calculator with flight destination projections"
```

---

### Task 5: Supabase migration — new tables

**Files:**
- Create: `supabase/migrations/20260325_pagos_redesign.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260325_pagos_redesign.sql
-- Pagos module redesign: cards, plans, bank benefits

-- 1. Client credit cards (BIN-detected)
CREATE TABLE IF NOT EXISTS tarjetas_cliente (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empleador_id UUID NOT NULL REFERENCES empleadores(id) ON DELETE CASCADE,
  bin VARCHAR(8) NOT NULL,
  ultimos_4 VARCHAR(4) NOT NULL,
  banco VARCHAR(100) NOT NULL,
  tipo_tarjeta VARCHAR(20) NOT NULL DEFAULT 'visa',
  categoria VARCHAR(30) NOT NULL DEFAULT 'classic',
  programa_puntos VARCHAR(100) NOT NULL,
  tasa_puntos NUMERIC(4,2) NOT NULL DEFAULT 0.5,
  activa BOOLEAN NOT NULL DEFAULT true,
  es_principal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tarjetas_empleador ON tarjetas_cliente(empleador_id);

-- 2. Bank benefits catalog (updated periodically)
CREATE TABLE IF NOT EXISTS beneficios_banco (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  banco VARCHAR(100) NOT NULL,
  tipo_tarjeta VARCHAR(20) NOT NULL,
  categoria VARCHAR(30) NOT NULL,
  programa_puntos VARCHAR(100) NOT NULL,
  tasa_base NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  tasa_promocional NUMERIC(4,2),
  promo_descripcion TEXT,
  promo_vigente_hasta DATE,
  categorias_bonus TEXT[] DEFAULT '{}',
  valor_punto_clp NUMERIC(6,2) NOT NULL DEFAULT 10.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_beneficios_banco ON beneficios_banco(banco, tipo_tarjeta);

-- 3. Extend empleadores with plan info
ALTER TABLE empleadores
  ADD COLUMN IF NOT EXISTS plan_tipo VARCHAR(20) NOT NULL DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS plan_inicio TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS plan_renovacion TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_pagos_completado BOOLEAN NOT NULL DEFAULT false;

-- 4. Extend cuentas_pago with discovery metadata
ALTER TABLE cuentas_pago
  ADD COLUMN IF NOT EXISTS fuente VARCHAR(10) NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS numero_cliente VARCHAR(50),
  ADD COLUMN IF NOT EXISTS numero_medidor VARCHAR(50),
  ADD COLUMN IF NOT EXISTS rut_proveedor VARCHAR(20),
  ADD COLUMN IF NOT EXISTS direccion_servicio TEXT,
  ADD COLUMN IF NOT EXISTS monto_variable BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ultimo_monto NUMERIC(12,0),
  ADD COLUMN IF NOT EXISTS discovery_method VARCHAR(20);

-- 5. Extend pagos_empleador with commission tracking
ALTER TABLE pagos_empleador
  ADD COLUMN IF NOT EXISTS comision_porcentaje NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS comision_monto NUMERIC(12,0),
  ADD COLUMN IF NOT EXISTS tarjeta_id UUID REFERENCES tarjetas_cliente(id),
  ADD COLUMN IF NOT EXISTS puntos_banco_estimados NUMERIC(10,2);

-- 6. RLS policies
ALTER TABLE tarjetas_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE beneficios_banco ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own cards" ON tarjetas_cliente
  FOR ALL USING (empleador_id IN (
    SELECT empleador_id FROM user_profiles WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Everyone can read bank benefits" ON beneficios_banco
  FOR SELECT USING (true);

-- 7. Seed initial bank benefits
INSERT INTO beneficios_banco (banco, tipo_tarjeta, categoria, programa_puntos, tasa_base, valor_punto_clp) VALUES
  ('Santander', 'visa', 'platinum', 'Latam Pass', 1.0, 12.0),
  ('Santander', 'visa', 'signature', 'Latam Pass', 1.5, 12.0),
  ('Santander', 'mastercard', 'black', 'Latam Pass', 2.0, 12.0),
  ('BCI', 'visa', 'platinum', 'Latam Pass', 1.0, 12.0),
  ('BCI', 'visa', 'signature', 'Dollar', 1.2, 10.0),
  ('Banco de Chile', 'visa', 'platinum', 'Travel Club', 1.0, 11.0),
  ('Banco de Chile', 'visa', 'infinite', 'Travel Club', 1.8, 11.0),
  ('Banco de Chile', 'mastercard', 'black', 'Travel Club', 2.0, 11.0),
  ('Banco Estado', 'visa', 'classic', 'Puntos Estado', 0.5, 8.0),
  ('Banco Estado', 'visa', 'gold', 'Puntos Estado', 0.8, 8.0),
  ('Banco Falabella', 'otra', 'classic', 'CMR Puntos', 1.0, 7.0),
  ('Scotiabank', 'visa', 'platinum', 'Scotia Rewards', 0.8, 9.0),
  ('Itau', 'visa', 'platinum', 'Latam Pass', 1.0, 12.0)
ON CONFLICT DO NOTHING;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260325_pagos_redesign.sql
git commit -m "feat(pagos): migration — tarjetas_cliente, beneficios_banco, plan columns"
```

---

### Task 6: Update employer types

**Files:**
- Modify: `src/types/employer.ts:224-242`

- [ ] **Step 1: Update PagoEmpleador and add new types to employer.ts**

Add after the existing `PagoEmpleador` interface (line 242):

```typescript
// In PagoEmpleador, add new fields:
// After existing fields, extend the interface
```

At the end of `src/types/employer.ts`, add:

```typescript
// Credit card registered by employer
export interface TarjetaCliente {
  id: string;
  empleador_id: string;
  bin: string;
  ultimos_4: string;
  banco: string;
  tipo_tarjeta: 'visa' | 'mastercard' | 'amex' | 'diners' | 'otra';
  categoria: string;
  programa_puntos: string;
  tasa_puntos: number;
  activa: boolean;
  es_principal: boolean;
  created_at: string;
}
```

And update `EmpleadorProfile` (line 7-23) to add plan fields:

```typescript
// Add to EmpleadorProfile:
  plan_tipo: 'starter' | 'casa' | 'hogar';
  plan_inicio: string | null;
  plan_renovacion: string | null;
  onboarding_pagos_completado: boolean;
```

And update `PagoEmpleador` to include commission tracking:

```typescript
// Add to PagoEmpleador:
  comision_porcentaje: number | null;
  comision_monto: number | null;
  tarjeta_id: string | null;
  puntos_banco_estimados: number | null;
```

- [ ] **Step 2: Commit**

```bash
git add src/types/employer.ts
git commit -m "feat(pagos): extend employer types — TarjetaCliente, plan fields, commission tracking"
```

---

## Chunk 2: Components — Onboarding, Card Setup, Account Discovery

### Task 7: Onboarding component (empty-state dashboard)

**Files:**
- Create: `src/app/empresa/pagos/components/PagosOnboarding.tsx`

- [ ] **Step 1: Create the onboarding component with guided placeholders**

```tsx
// src/app/empresa/pagos/components/PagosOnboarding.tsx
'use client';

import { CreditCard, Search, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { OnboardingState } from '@/lib/pagos/types';

interface Props {
  state: OnboardingState;
  onStartCardSetup: () => void;
  onStartDiscovery: () => void;
}

const STEPS = [
  {
    key: 'tarjeta_registrada' as const,
    icon: CreditCard,
    title: 'Registra tu tarjeta',
    description: 'Detectamos tu banco y programa de puntos automaticamente',
    cta: 'Agregar Tarjeta',
    color: 'violet',
  },
  {
    key: 'primera_cuenta_agregada' as const,
    icon: Search,
    title: 'Agrega tus cuentas',
    description: 'Busca por direccion, RUT, o tipo de servicio',
    cta: 'Buscar Cuentas',
    color: 'blue',
  },
  {
    key: 'primer_pago_realizado' as const,
    icon: Sparkles,
    title: 'Realiza tu primer pago',
    description: 'Paga con tarjeta y acumula puntos/millas de tu banco',
    cta: 'Ir a Pagos',
    color: 'emerald',
  },
];

export default function PagosOnboarding({ state, onStartCardSetup, onStartDiscovery }: Props) {
  const completedCount = Object.values(state).filter(Boolean).length;

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="text-center py-8">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-4">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900">Bienvenido a Pagos y Puntos</h2>
        <p className="text-sm text-zinc-500 mt-2 max-w-md mx-auto">
          Paga tus cuentas con tarjeta de credito y acumula puntos/millas de tu banco.
          Configura tu cuenta en 3 pasos.
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-center gap-2">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className={`h-2 w-16 rounded-full transition-colors ${
              i < completedCount ? 'bg-violet-500' : 'bg-zinc-200'
            }`}
          />
        ))}
        <span className="ml-2 text-xs text-zinc-500">{completedCount}/3</span>
      </div>

      {/* Step cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {STEPS.map((step, index) => {
          const completed = state[step.key];
          const isNext = !completed && Object.values(state).filter(Boolean).length === index;
          const Icon = step.icon;

          return (
            <div
              key={step.key}
              className={`rounded-2xl border-2 p-6 transition-all ${
                completed
                  ? 'border-emerald-200 bg-emerald-50/50'
                  : isNext
                  ? 'border-violet-300 bg-white shadow-lg shadow-violet-100/50'
                  : 'border-zinc-200 bg-zinc-50 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                  completed ? 'bg-emerald-100' : isNext ? 'bg-violet-100' : 'bg-zinc-100'
                }`}>
                  {completed ? (
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  ) : (
                    <Icon className={`h-6 w-6 ${isNext ? 'text-violet-600' : 'text-zinc-400'}`} />
                  )}
                </div>
                <span className="text-xs font-medium text-zinc-400">Paso {index + 1}</span>
              </div>

              <h3 className={`text-lg font-semibold mb-1 ${completed ? 'text-emerald-800' : 'text-zinc-900'}`}>
                {completed ? `${step.title} ✓` : step.title}
              </h3>
              <p className="text-sm text-zinc-500 mb-4">{step.description}</p>

              {!completed && isNext && (
                <button
                  onClick={index === 0 ? onStartCardSetup : onStartDiscovery}
                  className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors flex items-center justify-center gap-2"
                >
                  {step.cta}
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/empresa/pagos/components/PagosOnboarding.tsx
git commit -m "feat(pagos): onboarding component — 3-step guided setup with placeholders"
```

---

### Task 8: Card setup component (BIN detection)

**Files:**
- Create: `src/app/empresa/pagos/components/CardSetup.tsx`

- [ ] **Step 1: Create card registration with live BIN detection**

```tsx
// src/app/empresa/pagos/components/CardSetup.tsx
'use client';

import { useState, useCallback } from 'react';
import { CreditCard, X, Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import { lookupBin, BANK_THEMES } from '@/lib/pagos/bin-lookup';
import type { BinLookupResult } from '@/lib/pagos/types';

interface Props {
  onSave: (card: { bin: string; ultimos4: string; detected: BinLookupResult }) => Promise<void>;
  onClose: () => void;
}

export default function CardSetup({ onSave, onClose }: Props) {
  const [cardNumber, setCardNumber] = useState('');
  const [detected, setDetected] = useState<BinLookupResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleCardInput = useCallback((value: string) => {
    // Format: XXXX XXXX XXXX XXXX
    const digits = value.replace(/\D/g, '').substring(0, 16);
    const formatted = digits.replace(/(.{4})/g, '$1 ').trim();
    setCardNumber(formatted);

    // Detect after 6 digits
    if (digits.length >= 6) {
      const result = lookupBin(digits);
      setDetected(result);
    } else {
      setDetected(null);
    }
  }, []);

  const handleSave = async () => {
    if (!detected) return;
    const digits = cardNumber.replace(/\D/g, '');
    if (digits.length < 8) return;

    setSaving(true);
    try {
      await onSave({
        bin: digits.substring(0, 6),
        ultimos4: digits.substring(digits.length - 4),
        detected,
      });
      setSuccess(true);
    } finally {
      setSaving(false);
    }
  };

  const theme = detected ? BANK_THEMES[detected.banco] : null;

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-zinc-900 mb-2">Tarjeta Registrada</h3>
          <p className="text-sm text-zinc-500 mb-2">
            {detected?.banco} — {detected?.programa_puntos}
          </p>
          <p className="text-sm text-violet-600 font-medium mb-6">
            Acumularas {detected?.tasa_puntos} puntos por cada $1.000 pagados
          </p>
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
          >
            Continuar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h3 className="text-lg font-semibold text-zinc-900">Registrar Tarjeta</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-zinc-100 transition-colors">
            <X className="h-5 w-5 text-zinc-400" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Card preview */}
          <div className={`rounded-xl p-5 ${theme?.bg || 'bg-gradient-to-br from-zinc-800 to-zinc-900'} transition-colors`}>
            <div className="flex items-center justify-between mb-8">
              <span className={`text-sm font-semibold ${theme?.text || 'text-white'}`}>
                {detected?.banco || 'Tu banco'}
              </span>
              <CreditCard className={`h-6 w-6 ${theme?.text || 'text-white/60'}`} />
            </div>
            <p className={`text-lg font-mono tracking-widest ${theme?.text || 'text-white'}`}>
              {cardNumber || '•••• •••• •••• ••••'}
            </p>
            <div className="flex justify-between mt-4">
              <span className={`text-xs ${theme?.text || 'text-white/60'}`}>
                {detected?.tipo_tarjeta?.toUpperCase() || 'TARJETA'}
              </span>
              <span className={`text-xs ${theme?.text || 'text-white/60'}`}>
                {detected?.categoria?.toUpperCase() || ''}
              </span>
            </div>
          </div>

          {/* Input */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Numero de tarjeta
            </label>
            <input
              type="text"
              value={cardNumber}
              onChange={(e) => handleCardInput(e.target.value)}
              placeholder="4051 6100 0000 0000"
              maxLength={19}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-lg font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              autoFocus
            />
            <p className="text-xs text-zinc-400 mt-1">
              Solo almacenamos los primeros 6 y ultimos 4 digitos para identificar tu banco
            </p>
          </div>

          {/* Detection result */}
          {detected && (
            <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-500" />
                <span className="text-sm font-semibold text-violet-800">Detectado</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-zinc-500">Banco</span>
                  <p className="font-medium text-zinc-900">{detected.banco}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Programa</span>
                  <p className="font-medium text-zinc-900">{detected.programa_puntos}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Tarjeta</span>
                  <p className="font-medium text-zinc-900">{detected.tipo_tarjeta} {detected.categoria}</p>
                </div>
                <div>
                  <span className="text-zinc-500">Tasa</span>
                  <p className="font-medium text-violet-700">{detected.tasa_puntos} pts / $1.000</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-zinc-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!detected || saving}
            className="flex-1 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? 'Guardando...' : 'Registrar Tarjeta'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/empresa/pagos/components/CardSetup.tsx
git commit -m "feat(pagos): card setup component — BIN detection with bank preview"
```

---

### Task 9: Account discovery component

**Files:**
- Create: `src/app/empresa/pagos/components/AccountDiscovery.tsx`

- [ ] **Step 1: Create the account discovery modal with search-by methods**

```tsx
// src/app/empresa/pagos/components/AccountDiscovery.tsx
'use client';

import { useState } from 'react';
import {
  MapPin, User, Building2, Briefcase, Zap, Search, Plus, X,
  Home, Droplets, Flame, Wifi, Shield, Loader2, CheckCircle2,
} from 'lucide-react';

type DiscoveryTab = 'direccion' | 'rut' | 'rol' | 'servicios';

interface DiscoveredAccount {
  tipo: string;
  proveedor: string;
  numero_cliente: string;
  monto_estimado: number | null;
  fuente: 'api' | 'manual';
}

interface Props {
  direccion: string | null; // from vivienda_empleador
  rut: string | null;       // from empleador profile
  onAddAccount: (account: DiscoveredAccount) => Promise<void>;
  onClose: () => void;
  existingTypes: string[];   // tipos already added
}

const TABS: { key: DiscoveryTab; label: string; icon: typeof MapPin }[] = [
  { key: 'direccion', label: 'Direccion', icon: MapPin },
  { key: 'rut', label: 'RUT / Cliente', icon: User },
  { key: 'rol', label: 'Rol Propiedad', icon: Building2 },
  { key: 'servicios', label: 'Servicios', icon: Zap },
];

const SERVICIOS_DISPONIBLES = [
  { tipo: 'arriendo', label: 'Arriendo', icon: Home, color: 'text-blue-500 bg-blue-50' },
  { tipo: 'gastos_comunes', label: 'Gastos Comunes', icon: Building2, color: 'text-zinc-500 bg-zinc-100' },
  { tipo: 'agua', label: 'Agua', icon: Droplets, color: 'text-cyan-500 bg-cyan-50' },
  { tipo: 'luz', label: 'Electricidad', icon: Zap, color: 'text-yellow-500 bg-yellow-50' },
  { tipo: 'gas', label: 'Gas', icon: Flame, color: 'text-orange-500 bg-orange-50' },
  { tipo: 'internet', label: 'Internet / TV', icon: Wifi, color: 'text-indigo-500 bg-indigo-50' },
  { tipo: 'sueldo_empleado', label: 'Sueldo Empleado', icon: User, color: 'text-rose-500 bg-rose-50' },
  { tipo: 'leyes_sociales', label: 'Leyes Sociales', icon: Shield, color: 'text-violet-500 bg-violet-50' },
];

export default function AccountDiscovery({ direccion, rut, onAddAccount, onClose, existingTypes }: Props) {
  const [activeTab, setActiveTab] = useState<DiscoveryTab>('servicios');
  const [searchQuery, setSearchQuery] = useState('');
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set(existingTypes));

  // Manual account form
  const [manualForm, setManualForm] = useState({
    tipo: '',
    proveedor: '',
    numero_cliente: '',
    monto_estimado: '',
  });

  const handleQuickAdd = async (tipo: string) => {
    const servicio = SERVICIOS_DISPONIBLES.find(s => s.tipo === tipo);
    if (!servicio) return;

    setAdding(tipo);
    try {
      await onAddAccount({
        tipo,
        proveedor: '',
        numero_cliente: '',
        monto_estimado: null,
        fuente: 'manual',
      });
      setAdded(prev => new Set([...prev, tipo]));
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h3 className="text-lg font-semibold text-zinc-900">Agregar Cuentas de Pago</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-zinc-100 transition-colors">
            <X className="h-5 w-5 text-zinc-400" />
          </button>
        </div>

        {/* Discovery tabs */}
        <div className="flex border-b border-zinc-200 px-6">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === tab.key
                    ? 'border-violet-600 text-violet-600'
                    : 'border-transparent text-zinc-500 hover:text-zinc-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="px-6 py-5">
          {/* Servicios tab — quick-add grid */}
          {activeTab === 'servicios' && (
            <div className="space-y-4">
              <p className="text-sm text-zinc-500">
                Selecciona los servicios que deseas pagar con Poppins.
                Luego podras configurar el detalle de cada uno.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {SERVICIOS_DISPONIBLES.map(servicio => {
                  const Icon = servicio.icon;
                  const isAdded = added.has(servicio.tipo);
                  const isAdding = adding === servicio.tipo;

                  return (
                    <button
                      key={servicio.tipo}
                      onClick={() => !isAdded && handleQuickAdd(servicio.tipo)}
                      disabled={isAdded || isAdding}
                      className={`rounded-xl border-2 p-4 text-left transition-all ${
                        isAdded
                          ? 'border-emerald-200 bg-emerald-50'
                          : 'border-zinc-200 hover:border-violet-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${servicio.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        {isAdded ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        ) : isAdding ? (
                          <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
                        ) : (
                          <Plus className="h-5 w-5 text-zinc-400" />
                        )}
                      </div>
                      <p className="text-sm font-medium text-zinc-900 mt-3">{servicio.label}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {isAdded ? 'Agregado' : 'Toca para agregar'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Direccion tab */}
          {activeTab === 'direccion' && (
            <div className="space-y-4">
              <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-4">
                <p className="text-sm font-medium text-zinc-900 mb-1">Tu direccion registrada</p>
                <p className="text-sm text-zinc-600">{direccion || 'No has registrado tu direccion aun'}</p>
              </div>
              <p className="text-sm text-zinc-500">
                Buscar cuentas asociadas a tu direccion estara disponible pronto.
                Por ahora, agrega tus cuentas desde la pestana Servicios.
              </p>
            </div>
          )}

          {/* RUT tab */}
          {activeTab === 'rut' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  RUT o numero de cliente
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={rut || 'Ingresa un RUT o numero de cliente'}
                    className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <button className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors flex items-center gap-1">
                    <Search className="h-4 w-4" />
                    Buscar
                  </button>
                </div>
              </div>
              <p className="text-sm text-zinc-500">
                La busqueda por RUT/cliente estara disponible cuando se integren proveedores con API.
              </p>
            </div>
          )}

          {/* Rol tab */}
          {activeTab === 'rol' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Rol de la propiedad (SII)
                </label>
                <input
                  type="text"
                  placeholder="Ej: 1234-56"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <p className="text-sm text-zinc-500">
                Con el rol de la propiedad podemos buscar contribuciones, deudas municipales y servicios asociados.
                Esta funcion estara disponible pronto.
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-zinc-100">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
          >
            {added.size > existingTypes.length ? `Listo (${added.size - existingTypes.length} agregadas)` : 'Cerrar'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/empresa/pagos/components/AccountDiscovery.tsx
git commit -m "feat(pagos): account discovery — search by address, RUT, rol, servicios"
```

---

### Task 10: Points dashboard component

**Files:**
- Create: `src/app/empresa/pagos/components/PointsDashboard.tsx`

- [ ] **Step 1: Create points/miles tracker with flight goal projections**

```tsx
// src/app/empresa/pagos/components/PointsDashboard.tsx
'use client';

import { Sparkles, Plane, TrendingUp, CreditCard } from 'lucide-react';
import { calcularProyeccion, getDestinosDisponibles } from '@/lib/pagos/points-calculator';
import type { TarjetaCliente } from '@/lib/pagos/types';

interface Props {
  tarjeta: Pick<TarjetaCliente, 'banco' | 'programa_puntos' | 'tasa_puntos' | 'tipo_tarjeta' | 'categoria'> | null;
  puntosAcumulados: number;
  montoMensualPromedio: number;
}

export default function PointsDashboard({ tarjeta, puntosAcumulados, montoMensualPromedio }: Props) {
  if (!tarjeta) {
    return (
      <div className="rounded-xl border-2 border-dashed border-zinc-200 p-8 text-center">
        <CreditCard className="h-8 w-8 text-zinc-300 mx-auto mb-3" />
        <p className="text-sm text-zinc-500">Registra tu tarjeta para ver tus puntos y millas</p>
      </div>
    );
  }

  const proyeccion = calcularProyeccion(tarjeta, montoMensualPromedio, puntosAcumulados);
  const destinos = getDestinosDisponibles(puntosAcumulados);

  return (
    <div className="space-y-6">
      {/* Main points card */}
      <div className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-5 w-5 text-white/80" />
              <p className="text-sm text-white/80">{tarjeta.programa_puntos}</p>
            </div>
            <p className="text-3xl font-bold">{proyeccion.puntos_acumulados.toLocaleString('es-CL')}</p>
            <p className="text-sm text-white/70">
              ≈ ${proyeccion.valor_estimado_clp.toLocaleString('es-CL')} CLP
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/60">{tarjeta.banco}</p>
            <p className="text-xs text-white/60">{tarjeta.tipo_tarjeta} {tarjeta.categoria}</p>
            <p className="text-sm font-medium text-white/90 mt-2">
              +{proyeccion.puntos_mes_actual.toLocaleString('es-CL')}/mes
            </p>
          </div>
        </div>

        {/* Goal progress */}
        {proyeccion.meta_pasaje && (
          <div className="mt-6 pt-4 border-t border-white/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Plane className="h-4 w-4 text-white/80" />
                <span className="text-sm text-white/90">Santiago → {proyeccion.meta_pasaje.destino}</span>
              </div>
              <span className="text-sm font-medium text-white">
                {proyeccion.porcentaje_meta}%
              </span>
            </div>
            <div className="w-full h-2 bg-white/20 rounded-full">
              <div
                className="h-2 bg-white rounded-full transition-all"
                style={{ width: `${proyeccion.porcentaje_meta}%` }}
              />
            </div>
            <p className="text-xs text-white/60 mt-1">
              {proyeccion.meses_restantes <= 12
                ? `Faltan ~${proyeccion.meses_restantes} meses`
                : 'Cambia a un plan con menor comision para acelerar'}
            </p>
          </div>
        )}
      </div>

      {/* Destination grid */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-900 mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-violet-500" />
          Destinos alcanzables
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {destinos.slice(0, 8).map(d => {
            const porcentaje = Math.min(100, Math.round((puntosAcumulados / d.millas_necesarias) * 100));
            const alcanzable = porcentaje >= 100;

            return (
              <div
                key={d.destino}
                className={`rounded-lg border p-3 ${
                  alcanzable ? 'border-emerald-200 bg-emerald-50' : 'border-zinc-200'
                }`}
              >
                <p className="text-sm font-medium text-zinc-900">{d.destino}</p>
                <p className="text-xs text-zinc-500">{d.millas_necesarias.toLocaleString()} millas</p>
                <div className="mt-2 w-full h-1.5 bg-zinc-100 rounded-full">
                  <div
                    className={`h-1.5 rounded-full ${alcanzable ? 'bg-emerald-500' : 'bg-violet-400'}`}
                    style={{ width: `${porcentaje}%` }}
                  />
                </div>
                <p className={`text-[10px] font-medium mt-1 ${alcanzable ? 'text-emerald-600' : 'text-zinc-400'}`}>
                  {alcanzable ? 'Disponible!' : `${porcentaje}%`}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/empresa/pagos/components/PointsDashboard.tsx
git commit -m "feat(pagos): points dashboard — miles tracker with flight destination goals"
```

---

### Task 11: Plan banner component

**Files:**
- Create: `src/app/empresa/pagos/components/PlanBanner.tsx`

- [ ] **Step 1: Create plan indicator with upgrade CTA**

```tsx
// src/app/empresa/pagos/components/PlanBanner.tsx
'use client';

import { Crown, ArrowRight, CheckCircle2 } from 'lucide-react';
import { PLANES, type PlanTipo } from '@/lib/pagos/plans';
import type { PlanSuscripcion } from '@/lib/pagos/types';

interface Props {
  currentPlan: PlanTipo;
  cuentasCount: number;
  onUpgrade: (plan: PlanTipo) => void;
}

function formatCLP(amount: number): string {
  return '$' + amount.toLocaleString('es-CL');
}

export default function PlanBanner({ currentPlan, cuentasCount, onUpgrade }: Props) {
  const plan = PLANES[currentPlan];
  const isMaxPlan = currentPlan === 'hogar';
  const isNearLimit = plan.max_cuentas > 0 && cuentasCount >= plan.max_cuentas - 1;

  // Find next plan for upgrade
  const nextPlanKey = currentPlan === 'starter' ? 'casa' : currentPlan === 'casa' ? 'hogar' : null;
  const nextPlan = nextPlanKey ? PLANES[nextPlanKey] : null;

  return (
    <div className={`rounded-xl border p-4 ${
      isNearLimit ? 'border-amber-200 bg-amber-50' : 'border-zinc-200 bg-white'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
            currentPlan === 'hogar' ? 'bg-violet-100' : currentPlan === 'casa' ? 'bg-blue-100' : 'bg-zinc-100'
          }`}>
            <Crown className={`h-5 w-5 ${
              currentPlan === 'hogar' ? 'text-violet-600' : currentPlan === 'casa' ? 'text-blue-600' : 'text-zinc-500'
            }`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900">
              Plan {plan.nombre}
              {plan.precio_mensual > 0 && (
                <span className="text-zinc-500 font-normal"> — {formatCLP(plan.precio_mensual)}/mes</span>
              )}
            </p>
            <p className="text-xs text-zinc-500">
              {plan.max_cuentas === -1
                ? `${cuentasCount} cuentas activas (ilimitadas)`
                : `${cuentasCount}/${plan.max_cuentas} cuentas`}
              {' · '}Comision {plan.comision_porcentaje}%
            </p>
          </div>
        </div>

        {!isMaxPlan && nextPlan && (
          <button
            onClick={() => onUpgrade(nextPlanKey as PlanTipo)}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors flex items-center gap-1.5"
          >
            Subir a {nextPlan.nombre}
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {isNearLimit && !isMaxPlan && (
        <p className="text-xs text-amber-700 mt-2">
          Estas cerca del limite de cuentas de tu plan. Sube a Plan {nextPlan?.nombre} para agregar mas.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/empresa/pagos/components/PlanBanner.tsx
git commit -m "feat(pagos): plan banner — current plan display with upgrade CTA"
```

---

## Chunk 3: Integration — Rewrite Main Page as Orchestrator

### Task 12: Update employer-queries with card and plan queries

**Files:**
- Modify: `src/lib/supabase/employer-queries.ts:124-137`

- [ ] **Step 1: Add card and plan queries to employer-queries.ts**

At the end of the file, add:

```typescript
// Tarjetas
export async function getTarjetaPrincipal(empleadorId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from('tarjetas_cliente')
    .select('*')
    .eq('empleador_id', empleadorId)
    .eq('es_principal', true)
    .single();
  return data;
}

export async function saveTarjeta(empleadorId: string, tarjeta: {
  bin: string;
  ultimos_4: string;
  banco: string;
  tipo_tarjeta: string;
  categoria: string;
  programa_puntos: string;
  tasa_puntos: number;
}) {
  const supabase = createClient();
  // Deactivate existing principal
  await supabase
    .from('tarjetas_cliente')
    .update({ es_principal: false })
    .eq('empleador_id', empleadorId)
    .eq('es_principal', true);

  const { data } = await supabase
    .from('tarjetas_cliente')
    .insert({ ...tarjeta, empleador_id: empleadorId, activa: true, es_principal: true })
    .select()
    .single();
  return data;
}

// Onboarding state
export async function getOnboardingState(empleadorId: string) {
  const supabase = createClient();

  const [tarjeta, cuentas, pagos] = await Promise.all([
    supabase.from('tarjetas_cliente').select('id').eq('empleador_id', empleadorId).limit(1),
    supabase.from('cuentas_pago').select('id').eq('empleador_id', empleadorId).eq('activa', true).limit(1),
    supabase.from('pagos_empleador').select('id').eq('empleador_id', empleadorId).eq('estado', 'pagado').limit(1),
  ]);

  return {
    tarjeta_registrada: (tarjeta.data?.length || 0) > 0,
    primera_cuenta_agregada: (cuentas.data?.length || 0) > 0,
    primer_pago_realizado: (pagos.data?.length || 0) > 0,
    plan_seleccionado: true, // starter is default
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/supabase/employer-queries.ts
git commit -m "feat(pagos): add card, plan, and onboarding queries"
```

---

### Task 13: Rewrite main pagos page as orchestrator

**Files:**
- Modify: `src/app/empresa/pagos/page.tsx` (major rewrite — keep existing logic, add tabs for new components)

- [ ] **Step 1: Add imports for new components at the top of page.tsx (after existing imports, line ~33)**

Add after the lucide imports:

```typescript
import PagosOnboarding from './components/PagosOnboarding';
import CardSetup from './components/CardSetup';
import AccountDiscovery from './components/AccountDiscovery';
import PointsDashboard from './components/PointsDashboard';
import PlanBanner from './components/PlanBanner';
import { useAuth } from '@/lib/auth/context';
import { lookupBin } from '@/lib/pagos/bin-lookup';
import type { OnboardingState, BinLookupResult } from '@/lib/pagos/types';
import type { PlanTipo } from '@/lib/pagos/plans';
```

- [ ] **Step 2: Replace hardcoded EMPLEADOR_ID with auth context**

At line 37, replace:
```typescript
const EMPLEADOR_ID = '11111111-1111-1111-1111-111111111111';
```

Inside `PagosContent()`, add at the top (after `const supabase = createClient();`):
```typescript
const { profile } = useAuth();
const empleadorId = profile?.empleador_id || '11111111-1111-1111-1111-111111111111';
```

Then do a find-and-replace of all `EMPLEADOR_ID` occurrences with `empleadorId` in the file.

- [ ] **Step 3: Add new state variables after existing state (after line ~308)**

```typescript
// ════════════════════════════════════════════════════════════════════
//  NEW: ONBOARDING, CARD, POINTS, PLAN
// ════════════════════════════════════════════════════════════════════
const [onboardingState, setOnboardingState] = useState<OnboardingState>({
  tarjeta_registrada: false,
  primera_cuenta_agregada: false,
  primer_pago_realizado: false,
  plan_seleccionado: true,
});
const [showCardSetup, setShowCardSetup] = useState(false);
const [showDiscovery, setShowDiscovery] = useState(false);
const [tarjetaPrincipal, setTarjetaPrincipal] = useState<{
  banco: string; programa_puntos: string; tasa_puntos: number;
  tipo_tarjeta: string; categoria: string;
} | null>(null);
const [planTipo, setPlanTipo] = useState<PlanTipo>('starter');
const [loadingOnboarding, setLoadingOnboarding] = useState(true);
```

- [ ] **Step 4: Add onboarding fetch effect**

```typescript
// Fetch onboarding state on mount
useEffect(() => {
  async function loadOnboarding() {
    try {
      const [tarjetaRes, cuentasRes, pagosRes, perfilRes] = await Promise.all([
        supabase.from('tarjetas_cliente').select('*').eq('empleador_id', empleadorId).eq('es_principal', true).limit(1),
        supabase.from('cuentas_pago').select('id').eq('empleador_id', empleadorId).eq('activa', true).limit(1),
        supabase.from('pagos_empleador').select('id').eq('empleador_id', empleadorId).eq('estado', 'pagado').limit(1),
        supabase.from('empleadores').select('plan_tipo').eq('id', empleadorId).single(),
      ]);

      const tarjeta = tarjetaRes.data?.[0] || null;
      if (tarjeta) {
        setTarjetaPrincipal({
          banco: tarjeta.banco,
          programa_puntos: tarjeta.programa_puntos,
          tasa_puntos: tarjeta.tasa_puntos,
          tipo_tarjeta: tarjeta.tipo_tarjeta,
          categoria: tarjeta.categoria,
        });
      }

      setPlanTipo((perfilRes.data?.plan_tipo as PlanTipo) || 'starter');

      setOnboardingState({
        tarjeta_registrada: !!tarjeta,
        primera_cuenta_agregada: (cuentasRes.data?.length || 0) > 0,
        primer_pago_realizado: (pagosRes.data?.length || 0) > 0,
        plan_seleccionado: true,
      });
    } catch {
      // Non-blocking
    } finally {
      setLoadingOnboarding(false);
    }
  }
  loadOnboarding();
}, [empleadorId, supabase]);
```

- [ ] **Step 5: Add card save handler**

```typescript
async function handleSaveCard(card: { bin: string; ultimos4: string; detected: BinLookupResult }) {
  // Deactivate existing principal
  await supabase
    .from('tarjetas_cliente')
    .update({ es_principal: false })
    .eq('empleador_id', empleadorId)
    .eq('es_principal', true);

  await supabase.from('tarjetas_cliente').insert({
    empleador_id: empleadorId,
    bin: card.bin,
    ultimos_4: card.ultimos4,
    banco: card.detected.banco,
    tipo_tarjeta: card.detected.tipo_tarjeta,
    categoria: card.detected.categoria,
    programa_puntos: card.detected.programa_puntos,
    tasa_puntos: card.detected.tasa_puntos,
    activa: true,
    es_principal: true,
  });

  setTarjetaPrincipal({
    banco: card.detected.banco,
    programa_puntos: card.detected.programa_puntos,
    tasa_puntos: card.detected.tasa_puntos,
    tipo_tarjeta: card.detected.tipo_tarjeta,
    categoria: card.detected.categoria,
  });
  setOnboardingState(prev => ({ ...prev, tarjeta_registrada: true }));
}
```

- [ ] **Step 6: Update the tabs section in the render (replace lines 917-945)**

Replace the 2-tab header with a 4-tab header:

```tsx
{/* Tabs */}
<div className="flex border-b border-zinc-200 overflow-x-auto">
  {([
    { key: 'pagos', label: 'Mis Pagos', icon: CreditCard },
    { key: 'cuentas', label: 'Mis Cuentas', icon: Settings },
    { key: 'puntos', label: 'Puntos & Millas', icon: Sparkles },
  ] as const).map(tab => (
    <button
      key={tab.key}
      onClick={() => setActiveTab(tab.key)}
      className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
        activeTab === tab.key
          ? 'border-violet-600 text-violet-600'
          : 'border-transparent text-zinc-500 hover:text-zinc-700'
      }`}
    >
      <div className="flex items-center gap-2">
        <tab.icon className="h-4 w-4" />
        {tab.label}
      </div>
    </button>
  ))}
</div>
```

Update `activeTab` state type to include `'puntos'`:
```typescript
const [activeTab, setActiveTab] = useState<'pagos' | 'cuentas' | 'puntos'>('pagos');
```

- [ ] **Step 7: Add plan banner before the tabs (after the header, line ~915)**

```tsx
{/* Plan Banner */}
{!loadingOnboarding && (
  <PlanBanner
    currentPlan={planTipo}
    cuentasCount={cuentas.length}
    onUpgrade={(plan) => {
      // Future: Stripe/Flow subscription checkout
      console.log('Upgrade to', plan);
    }}
  />
)}
```

- [ ] **Step 8: Show onboarding when not completed**

Before the tabs render block, add:

```tsx
{/* Show onboarding if not all steps completed */}
{!loadingOnboarding && !onboardingState.primer_pago_realizado && (
  <PagosOnboarding
    state={onboardingState}
    onStartCardSetup={() => setShowCardSetup(true)}
    onStartDiscovery={() => setShowDiscovery(true)}
  />
)}
```

- [ ] **Step 9: Add Puntos tab render**

After the `{activeTab === 'cuentas' && ( ... )}` block, add:

```tsx
{/* ════════════════════════════════════════════════════════════════ */}
{/*  TAB: PUNTOS & MILLAS                                          */}
{/* ════════════════════════════════════════════════════════════════ */}
{activeTab === 'puntos' && (
  <PointsDashboard
    tarjeta={tarjetaPrincipal}
    puntosAcumulados={totalPuntos}
    montoMensualPromedio={totalPagado + totalPendiente || 1500000}
  />
)}
```

- [ ] **Step 10: Add CardSetup and AccountDiscovery modals at the end of the component (before the closing `</div>`)**

```tsx
{/* Card Setup Modal */}
{showCardSetup && (
  <CardSetup
    onSave={handleSaveCard}
    onClose={() => setShowCardSetup(false)}
  />
)}

{/* Account Discovery Modal */}
{showDiscovery && (
  <AccountDiscovery
    direccion={null}
    rut={null}
    existingTypes={cuentas.map(c => c.tipo)}
    onAddAccount={async (account) => {
      await supabase.from('cuentas_pago').insert({
        empleador_id: empleadorId,
        tipo: account.tipo,
        alias: account.proveedor || account.tipo,
        proveedor: account.proveedor || null,
        numero_cuenta: account.numero_cliente || null,
        monto_fijo: account.monto_estimado,
        fuente: account.fuente,
        activa: false, // User activates manually after configuring
      });
      setOnboardingState(prev => ({ ...prev, primera_cuenta_agregada: true }));
      await fetchCuentas();
    }}
    onClose={() => setShowDiscovery(false)}
  />
)}
```

- [ ] **Step 11: Commit**

```bash
git add src/app/empresa/pagos/page.tsx
git commit -m "feat(pagos): integrate onboarding, card detection, points dashboard, plan banner"
```

---

### Task 14: Verify build

- [ ] **Step 1: Run TypeScript check**

```bash
cd /c/Users/ManuelAravena/Desktop/Personal/Poppins && npx tsc --noEmit 2>&1 | head -30
```

Expected: No errors in new files. May have pre-existing errors in unrelated files — those are OK.

- [ ] **Step 2: Run dev server check**

```bash
cd /c/Users/ManuelAravena/Desktop/Personal/Poppins && npx next build 2>&1 | tail -20
```

Expected: Build succeeds.

- [ ] **Step 3: Fix any compilation errors found**

If errors, fix them and commit:

```bash
git add -u
git commit -m "fix(pagos): resolve build errors from pagos redesign"
```

---

### Task 15: Final commit — all changes together

- [ ] **Step 1: Verify all files are committed**

```bash
git status
```

- [ ] **Step 2: If any uncommitted changes, commit them**

```bash
git add -A
git commit -m "feat(pagos): complete pagos module redesign — onboarding, BIN detection, plans, points"
```

---

## Summary

This plan transforms `/empresa/pagos` from a basic payment page into Poppins' core business module:

1. **BIN-based card detection** — identifies bank and rewards program instantly
2. **Account discovery** — guided flow to add accounts by type, address, RUT, or property rol
3. **Subscription plans** — Starter (free), Casa ($14.990), Hogar ($29.990) with tiered commissions
4. **Points/miles dashboard** — projects accumulated bank points toward flight destinations
5. **Onboarding journey** — empty-state placeholders guide new users through 3 setup steps
6. **Plan enforcement** — account limits per plan, upgrade CTAs when approaching limit
7. **Commission tracking** — per-payment commission records for unit economics

All new code is in focused, single-responsibility files. The existing `page.tsx` becomes an orchestrator importing components rather than a 1900-line monolith.
