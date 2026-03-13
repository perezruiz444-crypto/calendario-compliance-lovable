-- Add evidencia_url column to obligacion_cumplimientos
ALTER TABLE public.obligacion_cumplimientos ADD COLUMN IF NOT EXISTS evidencia_url text;

-- Create storage bucket for evidence files
INSERT INTO storage.buckets (id, name, public) VALUES ('evidencias-cumplimiento', 'evidencias-cumplimiento', false) ON CONFLICT (id) DO NOTHING;

-- Storage policies for evidencias-cumplimiento bucket
CREATE POLICY "Authenticated users can upload evidencias"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'evidencias-cumplimiento');

CREATE POLICY "Users can view evidencias"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'evidencias-cumplimiento');

CREATE POLICY "Users can delete their own evidencias"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'evidencias-cumplimiento');