ALTER TABLE public.obligaciones_catalogo
  ADD COLUMN IF NOT EXISTS usar_ultimo_dia_habil boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.obligaciones_catalogo.usar_ultimo_dia_habil IS
  'Si true, ignora dia_vencimiento y calcula el último día hábil (lun-vie) del mes de vencimiento';