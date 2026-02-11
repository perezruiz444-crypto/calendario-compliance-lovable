
-- Create obligaciones table for flexible obligation management per empresa
CREATE TABLE public.obligaciones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL, -- 'general', 'cert_iva_ieps', 'immex', 'prosec', 'padron', 'otro'
  nombre TEXT NOT NULL,
  descripcion TEXT,
  fecha_autorizacion DATE,
  fecha_vencimiento DATE,
  fecha_renovacion DATE,
  fecha_inicio DATE,
  fecha_fin DATE,
  numero_oficio TEXT,
  estado TEXT NOT NULL DEFAULT 'vigente', -- 'vigente', 'por_vencer', 'vencido', 'renovado', 'cancelado'
  notas TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.obligaciones ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view obligaciones of their empresas"
ON public.obligaciones FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.consultor_empresa_asignacion
    WHERE consultor_empresa_asignacion.empresa_id = obligaciones.empresa_id
    AND consultor_empresa_asignacion.consultor_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.empresa_id = obligaciones.empresa_id
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'administrador'
  )
);

CREATE POLICY "Admins and consultores can insert obligaciones"
ON public.obligaciones FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('administrador', 'consultor')
  )
);

CREATE POLICY "Admins and consultores can update obligaciones"
ON public.obligaciones FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('administrador', 'consultor')
  )
);

CREATE POLICY "Admins and consultores can delete obligaciones"
ON public.obligaciones FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('administrador', 'consultor')
  )
);

-- Index for performance
CREATE INDEX idx_obligaciones_empresa_id ON public.obligaciones(empresa_id);
CREATE INDEX idx_obligaciones_categoria ON public.obligaciones(categoria);
CREATE INDEX idx_obligaciones_fecha_vencimiento ON public.obligaciones(fecha_vencimiento);

-- Trigger for updated_at
CREATE TRIGGER update_obligaciones_updated_at
BEFORE UPDATE ON public.obligaciones
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
