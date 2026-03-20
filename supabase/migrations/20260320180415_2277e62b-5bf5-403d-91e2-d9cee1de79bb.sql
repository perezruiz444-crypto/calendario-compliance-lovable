
-- Create junction table for multiple responsables per obligacion
CREATE TABLE public.obligacion_responsables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obligacion_id uuid NOT NULL REFERENCES public.obligaciones(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  tipo text NOT NULL DEFAULT 'cliente',
  created_at timestamptz DEFAULT now(),
  UNIQUE(obligacion_id, user_id)
);

ALTER TABLE public.obligacion_responsables ENABLE ROW LEVEL SECURITY;

-- RLS: Same access pattern as obligaciones
CREATE POLICY "Users can view responsables of their obligaciones"
  ON public.obligacion_responsables FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.obligaciones o
      WHERE o.id = obligacion_responsables.obligacion_id
    )
  );

CREATE POLICY "Admins and consultores can manage responsables"
  ON public.obligacion_responsables FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('administrador', 'consultor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('administrador', 'consultor')
    )
  );

CREATE POLICY "Clientes can view responsables of their empresa obligaciones"
  ON public.obligacion_responsables FOR SELECT
  USING (
    has_role(auth.uid(), 'cliente') AND
    EXISTS (
      SELECT 1 FROM public.obligaciones o
      JOIN public.profiles p ON p.empresa_id = o.empresa_id
      WHERE o.id = obligacion_responsables.obligacion_id
        AND p.id = auth.uid()
    )
  );
