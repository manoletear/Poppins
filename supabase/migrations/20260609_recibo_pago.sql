-- Comprobante de pago de remuneraciones (Art. 54 CT).
-- Distinto del cálculo de liquidación: registra pago efectivo + firma del trabajador.

ALTER TABLE public.payroll_results
  ADD COLUMN IF NOT EXISTS pagado_at              timestamptz,
  ADD COLUMN IF NOT EXISTS medio_pago             text,    -- 'transferencia' | 'efectivo' | 'cheque' | 'otro'
  ADD COLUMN IF NOT EXISTS referencia_pago        text,    -- nº transferencia, nº cheque, etc.
  ADD COLUMN IF NOT EXISTS pagado_por             uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS recibo_firmado_at      timestamptz,
  ADD COLUMN IF NOT EXISTS recibo_ip_trabajador   inet;

-- Policy adicional: trabajador puede UPDATE (solo recibo_firmado_at + recibo_ip_trabajador)
CREATE POLICY "worker_firma_recibo"
  ON public.payroll_results FOR UPDATE
  USING (worker_id = public.get_my_trabajador_id())
  WITH CHECK (worker_id = public.get_my_trabajador_id());
