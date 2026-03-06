
-- Add activation and responsibility columns to obligaciones
ALTER TABLE public.obligaciones
  ADD COLUMN IF NOT EXISTS activa boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS responsable_tipo text,
  ADD COLUMN IF NOT EXISTS responsable_id uuid;
