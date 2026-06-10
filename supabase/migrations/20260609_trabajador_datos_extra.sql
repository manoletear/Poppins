-- Datos extra del trabajador (mapean campos de Buk no importados aún).
-- Aplica a empleadores de hogar TCP.

ALTER TABLE public.trabajadores
  ADD COLUMN IF NOT EXISTS document_type                text DEFAULT 'rut',
    -- 'rut' | 'dni' | 'pasaporte' | 'otro'
  ADD COLUMN IF NOT EXISTS pension_regime               text,
    -- 'AFP' | 'IPS' (ex-INP)
  ADD COLUMN IF NOT EXISTS payment_method               text,
    -- 'transferencia' | 'efectivo' | 'cheque'
  ADD COLUMN IF NOT EXISTS payment_period               text,
    -- 'mensual' | 'quincenal'
  ADD COLUMN IF NOT EXISTS progressive_vacations_start  date,
    -- Fecha desde la cual acumula vacaciones progresivas (Art. 68)
  ADD COLUMN IF NOT EXISTS retired                      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS family_invalid_count         integer NOT NULL DEFAULT 0;
    -- Cargas familiares inválidas (tramo especial asignación)
