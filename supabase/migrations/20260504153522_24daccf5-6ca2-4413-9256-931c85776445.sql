
CREATE TABLE IF NOT EXISTS public.empresa_programas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  programa TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  fecha_inicio DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, programa)
);

ALTER TABLE public.empresa_programas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage empresa_programas"
ON public.empresa_programas FOR ALL
USING (has_role(auth.uid(), 'administrador'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Consultores manage their empresa_programas"
ON public.empresa_programas FOR ALL
USING (
  has_role(auth.uid(), 'consultor'::app_role)
  AND EXISTS (
    SELECT 1 FROM consultor_empresa_asignacion
    WHERE consultor_id = auth.uid()
      AND empresa_id = empresa_programas.empresa_id
  )
)
WITH CHECK (
  has_role(auth.uid(), 'consultor'::app_role)
  AND EXISTS (
    SELECT 1 FROM consultor_empresa_asignacion
    WHERE consultor_id = auth.uid()
      AND empresa_id = empresa_programas.empresa_id
  )
);

CREATE POLICY "Clientes view their empresa_programas"
ON public.empresa_programas FOR SELECT
USING (
  has_role(auth.uid(), 'cliente'::app_role)
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND empresa_id = empresa_programas.empresa_id
  )
);

CREATE TRIGGER update_empresa_programas_updated_at
BEFORE UPDATE ON public.empresa_programas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Desnormalizar empresa_id en obligacion_cumplimientos (Fase A1 del plan)
ALTER TABLE public.obligacion_cumplimientos
  ADD COLUMN IF NOT EXISTS empresa_id UUID;

UPDATE public.obligacion_cumplimientos oc
SET empresa_id = o.empresa_id
FROM public.obligaciones o
WHERE oc.obligacion_id = o.id AND oc.empresa_id IS NULL;

CREATE OR REPLACE FUNCTION public.set_cumplimiento_empresa_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.empresa_id IS NULL THEN
    SELECT empresa_id INTO NEW.empresa_id FROM obligaciones WHERE id = NEW.obligacion_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_cumplimiento_empresa_id ON public.obligacion_cumplimientos;
CREATE TRIGGER trg_set_cumplimiento_empresa_id
BEFORE INSERT ON public.obligacion_cumplimientos
FOR EACH ROW EXECUTE FUNCTION public.set_cumplimiento_empresa_id();

ALTER TABLE public.obligacion_cumplimientos
  ALTER COLUMN empresa_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_oc_empresa_periodo
  ON public.obligacion_cumplimientos(empresa_id, periodo_key);
