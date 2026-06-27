-- Fix race condition: prevent double-processing of the same period.
-- Two concurrent POST requests could both pass the existence check before either inserts.
-- A unique partial index enforces the constraint at DB level.
CREATE UNIQUE INDEX IF NOT EXISTS payroll_results_unique_active_period
  ON public.payroll_results (empleador_id, payroll_period, worker_id)
  WHERE voided = false;
