
-- Create app_settings table
CREATE TABLE public.app_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read settings
CREATE POLICY "Authenticated users can read app_settings"
ON public.app_settings FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only admins can insert
CREATE POLICY "Admins can insert app_settings"
ON public.app_settings FOR INSERT
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- Only admins can update
CREATE POLICY "Admins can update app_settings"
ON public.app_settings FOR UPDATE
USING (has_role(auth.uid(), 'administrador'::app_role))
WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

-- Only admins can delete
CREATE POLICY "Admins can delete app_settings"
ON public.app_settings FOR DELETE
USING (has_role(auth.uid(), 'administrador'::app_role));
