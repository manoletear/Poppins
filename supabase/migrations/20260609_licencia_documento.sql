-- Documento (PDF parte médico) adjunto en licencias_medicas
ALTER TABLE public.licencias_medicas
  ADD COLUMN IF NOT EXISTS documento_url   text,
  ADD COLUMN IF NOT EXISTS documento_nombre text;
