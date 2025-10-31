-- Create documents table for document management
CREATE TABLE IF NOT EXISTS public.documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  tipo_documento TEXT NOT NULL, -- 'certificacion', 'legal', 'contrato', 'reporte', 'otro'
  categoria TEXT, -- optional categorization
  archivo_url TEXT NOT NULL,
  archivo_nombre TEXT NOT NULL,
  archivo_tamano INTEGER,
  fecha_documento DATE,
  fecha_vencimiento DATE,
  subido_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for documentos
CREATE POLICY "Admins can manage all documentos"
  ON public.documentos
  FOR ALL
  USING (has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Consultores can manage documentos of their empresas"
  ON public.documentos
  FOR ALL
  USING (
    has_role(auth.uid(), 'consultor'::app_role) AND
    EXISTS (
      SELECT 1 FROM consultor_empresa_asignacion
      WHERE consultor_id = auth.uid() AND empresa_id = documentos.empresa_id
    )
  );

CREATE POLICY "Clientes can view documentos of their empresa"
  ON public.documentos
  FOR SELECT
  USING (
    has_role(auth.uid(), 'cliente'::app_role) AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND empresa_id = documentos.empresa_id
    )
  );

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos', 'documentos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for documentos bucket
CREATE POLICY "Authenticated users can view their documents"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'documentos' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Admins and consultores can upload documents"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'documentos' AND
    (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'consultor'::app_role))
  );

CREATE POLICY "Admins and consultores can update documents"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'documentos' AND
    (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'consultor'::app_role))
  );

CREATE POLICY "Admins and consultores can delete documents"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'documentos' AND
    (has_role(auth.uid(), 'administrador'::app_role) OR has_role(auth.uid(), 'consultor'::app_role))
  );

-- Create trigger for updated_at
CREATE TRIGGER update_documentos_updated_at
  BEFORE UPDATE ON public.documentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create solicitudes_servicio table for client requests
CREATE TABLE IF NOT EXISTS public.solicitudes_servicio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  solicitante_id UUID NOT NULL REFERENCES auth.users(id),
  asunto TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  prioridad TEXT DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta')),
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_revision', 'en_proceso', 'completada', 'cancelada')),
  asignado_a UUID REFERENCES auth.users(id),
  fecha_solicitud TIMESTAMPTZ DEFAULT NOW(),
  fecha_respuesta TIMESTAMPTZ,
  respuesta TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.solicitudes_servicio ENABLE ROW LEVEL SECURITY;

-- RLS Policies for solicitudes
CREATE POLICY "Clientes can create solicitudes for their empresa"
  ON public.solicitudes_servicio
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'cliente'::app_role) AND
    solicitante_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND empresa_id = solicitudes_servicio.empresa_id
    )
  );

CREATE POLICY "Clientes can view their solicitudes"
  ON public.solicitudes_servicio
  FOR SELECT
  USING (
    has_role(auth.uid(), 'cliente'::app_role) AND
    solicitante_id = auth.uid()
  );

CREATE POLICY "Admins can manage all solicitudes"
  ON public.solicitudes_servicio
  FOR ALL
  USING (has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Consultores can manage solicitudes of their empresas"
  ON public.solicitudes_servicio
  FOR ALL
  USING (
    has_role(auth.uid(), 'consultor'::app_role) AND
    EXISTS (
      SELECT 1 FROM consultor_empresa_asignacion
      WHERE consultor_id = auth.uid() AND empresa_id = solicitudes_servicio.empresa_id
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_solicitudes_servicio_updated_at
  BEFORE UPDATE ON public.solicitudes_servicio
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create notification trigger for new solicitudes
CREATE OR REPLACE FUNCTION public.notify_new_solicitud()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify assigned consultores of the empresa
  INSERT INTO public.notificaciones (user_id, tipo, titulo, contenido, referencia_id, referencia_tipo)
  SELECT 
    consultor_id,
    'solicitud',
    'Nueva Solicitud de Servicio',
    NEW.asunto,
    NEW.id,
    'solicitud'
  FROM consultor_empresa_asignacion
  WHERE empresa_id = NEW.empresa_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_notify_new_solicitud
  AFTER INSERT ON public.solicitudes_servicio
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_solicitud();