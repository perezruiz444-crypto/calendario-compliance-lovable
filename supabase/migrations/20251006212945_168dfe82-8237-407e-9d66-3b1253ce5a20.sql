-- Create storage bucket for task attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-attachments',
  'task-attachments',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/msword', 'application/vnd.ms-excel', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for task attachments bucket
CREATE POLICY "Authenticated users can view task attachments"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'task-attachments' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Authenticated users can upload task attachments"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'task-attachments' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete their own attachments"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'task-attachments' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create messages table for internal messaging system
CREATE TABLE IF NOT EXISTS public.mensajes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  remitente_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  destinatario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  asunto TEXT NOT NULL,
  contenido TEXT NOT NULL,
  leido BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mensajes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for messages
CREATE POLICY "Users can view their own messages"
  ON public.mensajes
  FOR SELECT
  USING (
    auth.uid() = remitente_id OR 
    auth.uid() = destinatario_id
  );

CREATE POLICY "Users can send messages"
  ON public.mensajes
  FOR INSERT
  WITH CHECK (auth.uid() = remitente_id);

CREATE POLICY "Recipients can update read status"
  ON public.mensajes
  FOR UPDATE
  USING (auth.uid() = destinatario_id)
  WITH CHECK (auth.uid() = destinatario_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_mensajes_remitente ON public.mensajes(remitente_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_destinatario ON public.mensajes(destinatario_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_empresa ON public.mensajes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_leido ON public.mensajes(leido);

-- Add trigger for updated_at
CREATE TRIGGER update_mensajes_updated_at
  BEFORE UPDATE ON public.mensajes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.mensajes IS 'Sistema de mensajería interna entre usuarios';
COMMENT ON COLUMN public.mensajes.leido IS 'Indica si el mensaje ha sido leído por el destinatario';