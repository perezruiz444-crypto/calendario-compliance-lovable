-- Migración: Actualizar estructura del Perfil de Empresa según nueva definición

-- 1. Agregar nuevos campos a la tabla empresas
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS actividad_economica TEXT,
  ADD COLUMN IF NOT EXISTS immex_modalidad TEXT,
  ADD COLUMN IF NOT EXISTS immex_fecha_autorizacion DATE,
  ADD COLUMN IF NOT EXISTS prosec_modalidad TEXT,
  ADD COLUMN IF NOT EXISTS prosec_fecha_autorizacion DATE,
  ADD COLUMN IF NOT EXISTS prosec_sectores JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cert_iva_ieps_oficio TEXT,
  ADD COLUMN IF NOT EXISTS cert_iva_ieps_fecha_autorizacion DATE,
  ADD COLUMN IF NOT EXISTS cert_iva_ieps_fecha_ultima_renovacion DATE,
  ADD COLUMN IF NOT EXISTS cert_iva_ieps_fecha_vencimiento DATE,
  ADD COLUMN IF NOT EXISTS cert_iva_ieps_fecha_renovar DATE,
  ADD COLUMN IF NOT EXISTS cert_iva_ieps_nota TEXT,
  ADD COLUMN IF NOT EXISTS matriz_seguridad_fecha_vencimiento DATE,
  ADD COLUMN IF NOT EXISTS matriz_seguridad_fecha_renovar DATE,
  ADD COLUMN IF NOT EXISTS padron_importadores_sectores JSONB DEFAULT '[]'::jsonb;

-- 2. Migrar datos existentes de campos renombrados
UPDATE public.empresas 
SET immex_modalidad = immex_tipo
WHERE immex_tipo IS NOT NULL AND immex_modalidad IS NULL;

UPDATE public.empresas 
SET immex_fecha_autorizacion = immex_fecha_inicio
WHERE immex_fecha_inicio IS NOT NULL AND immex_fecha_autorizacion IS NULL;

UPDATE public.empresas 
SET prosec_fecha_autorizacion = prosec_fecha_inicio
WHERE prosec_fecha_inicio IS NOT NULL AND prosec_fecha_autorizacion IS NULL;

-- Migrar prosec_sector a prosec_sectores array
UPDATE public.empresas 
SET prosec_sectores = jsonb_build_array(prosec_sector)
WHERE prosec_sector IS NOT NULL AND prosec_sectores = '[]'::jsonb;

-- 3. Crear tabla de apoderados legales
CREATE TABLE IF NOT EXISTS public.apoderados_legales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  tipo_apoderado TEXT,
  poder_notarial_instrumento TEXT,
  poder_notarial_libro TEXT,
  poder_notarial_anio INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.apoderados_legales ENABLE ROW LEVEL SECURITY;

-- RLS Policies para apoderados_legales
CREATE POLICY "Admins can manage all apoderados"
ON public.apoderados_legales
FOR ALL
USING (has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Consultores can manage apoderados of their empresas"
ON public.apoderados_legales
FOR ALL
USING (
  has_role(auth.uid(), 'consultor'::app_role) AND
  EXISTS (
    SELECT 1 FROM consultor_empresa_asignacion
    WHERE consultor_id = auth.uid() AND empresa_id = apoderados_legales.empresa_id
  )
);

CREATE POLICY "Clientes can view apoderados of their empresa"
ON public.apoderados_legales
FOR SELECT
USING (
  has_role(auth.uid(), 'cliente'::app_role) AND
  EXISTS (
    SELECT 1 FROM consultor_empresa_asignacion
    WHERE consultor_id = auth.uid() AND empresa_id = apoderados_legales.empresa_id
  )
);

-- Trigger para updated_at
CREATE TRIGGER update_apoderados_legales_updated_at
  BEFORE UPDATE ON public.apoderados_legales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comentarios para documentación
COMMENT ON TABLE public.apoderados_legales IS 'Tabla para almacenar apoderados legales de las empresas';
COMMENT ON COLUMN public.empresas.actividad_economica IS 'Actividad económica de la empresa';
COMMENT ON COLUMN public.empresas.prosec_sectores IS 'Array de sectores PROSEC en formato JSON';
COMMENT ON COLUMN public.empresas.padron_importadores_sectores IS 'Sectores del Padrón de Importadores Activos en formato JSON [{numero_sector, descripcion_sector}]';