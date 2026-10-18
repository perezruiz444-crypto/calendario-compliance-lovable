-- Registro privado de intentos del aviso de revisión. No permite reenvíos automáticos.
CREATE TABLE IF NOT EXISTS public.revision_programas_envios (
 mensaje_id uuid PRIMARY KEY REFERENCES public.mensajes(id),
 estado text NOT NULL CHECK (estado IN ('enviando','enviado','error')),
 iniciado_en timestamptz NOT NULL DEFAULT now(),
 enviado_en timestamptz
);
ALTER TABLE public.revision_programas_envios ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.revision_programas_envios FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.revision_programas_envios TO service_role;
COMMENT ON TABLE public.revision_programas_envios IS 'Intentos SMTP del informe de revisión. Un intento incierto requiere revisión manual antes de reenviar.';
