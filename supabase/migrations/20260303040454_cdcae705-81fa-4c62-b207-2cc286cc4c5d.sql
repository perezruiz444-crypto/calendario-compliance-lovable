
-- Table for tracking period-based completion of obligations
CREATE TABLE public.obligacion_cumplimientos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obligacion_id uuid NOT NULL REFERENCES public.obligaciones(id) ON DELETE CASCADE,
  periodo_key text NOT NULL, -- e.g. "2026-W10" (weekly), "2026-03" (monthly), "2026" (annual)
  completada boolean NOT NULL DEFAULT true,
  completada_por uuid,
  completada_en timestamp with time zone NOT NULL DEFAULT now(),
  notas text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(obligacion_id, periodo_key)
);

-- Enable RLS
ALTER TABLE public.obligacion_cumplimientos ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view cumplimientos of visible obligaciones"
ON public.obligacion_cumplimientos
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM obligaciones o WHERE o.id = obligacion_cumplimientos.obligacion_id
  )
);

CREATE POLICY "Admins and consultores can manage cumplimientos"
ON public.obligacion_cumplimientos
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('administrador', 'consultor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('administrador', 'consultor')
  )
);
