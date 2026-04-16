
-- Tabla de feedback de Customer Discovery para clientes
CREATE TABLE public.feedback_clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  q1_razon_login text NOT NULL,
  q2_semaforo_rating integer NOT NULL,
  q3_friccion text,
  q4_varita_magica text,
  q5_retencion text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Validar rating entre 1 y 5 con trigger en lugar de CHECK (para evitar issues de restauración)
CREATE OR REPLACE FUNCTION public.validate_feedback_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.q2_semaforo_rating < 1 OR NEW.q2_semaforo_rating > 5 THEN
    RAISE EXCEPTION 'q2_semaforo_rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_feedback_rating_trigger
BEFORE INSERT OR UPDATE ON public.feedback_clientes
FOR EACH ROW EXECUTE FUNCTION public.validate_feedback_rating();

-- Habilitar RLS
ALTER TABLE public.feedback_clientes ENABLE ROW LEVEL SECURITY;

-- INSERT: cualquier usuario autenticado puede insertar su propio feedback
CREATE POLICY "feedback_insert_own" ON public.feedback_clientes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- SELECT: solo administradores
CREATE POLICY "feedback_select_admin_only" ON public.feedback_clientes
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));
