
-- Catálogo de obligaciones reutilizables (templates)
CREATE TABLE public.obligaciones_catalogo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  programa TEXT NOT NULL,
  nombre TEXT NOT NULL,
  articulos TEXT,
  descripcion TEXT,
  presentacion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.obligaciones_catalogo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins y consultores pueden ver catálogo"
  ON public.obligaciones_catalogo FOR SELECT
  USING (
    public.has_role(auth.uid(), 'administrador') OR
    public.has_role(auth.uid(), 'consultor')
  );

CREATE POLICY "Admins y consultores pueden insertar catálogo"
  ON public.obligaciones_catalogo FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'administrador') OR
    public.has_role(auth.uid(), 'consultor')
  );

CREATE POLICY "Admins y consultores pueden actualizar catálogo"
  ON public.obligaciones_catalogo FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'administrador') OR
    public.has_role(auth.uid(), 'consultor')
  );

CREATE POLICY "Admins y consultores pueden eliminar catálogo"
  ON public.obligaciones_catalogo FOR DELETE
  USING (
    public.has_role(auth.uid(), 'administrador') OR
    public.has_role(auth.uid(), 'consultor')
  );

-- Add articulos and presentacion columns to obligaciones table
ALTER TABLE public.obligaciones ADD COLUMN IF NOT EXISTS articulos TEXT;
ALTER TABLE public.obligaciones ADD COLUMN IF NOT EXISTS presentacion TEXT;

CREATE TRIGGER update_obligaciones_catalogo_updated_at
  BEFORE UPDATE ON public.obligaciones_catalogo
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
