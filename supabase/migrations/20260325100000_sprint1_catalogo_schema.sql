-- Sprint 1: Enriquecer tabla obligaciones_catalogo como catálogo maestro
-- y vincular obligaciones activadas a su ítem de catálogo origen.

-- 1. Nuevas columnas en obligaciones_catalogo
ALTER TABLE public.obligaciones_catalogo
  ADD COLUMN IF NOT EXISTS categoria      TEXT,
  ADD COLUMN IF NOT EXISTS obligatorio    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS activo         BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS orden          INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notas_internas TEXT;

COMMENT ON COLUMN public.obligaciones_catalogo.categoria      IS 'Categoría interna (immex, prosec, padron, cert_iva_ieps, general, otro)';
COMMENT ON COLUMN public.obligaciones_catalogo.obligatorio    IS 'true = obligación que toda empresa del programa debe tener';
COMMENT ON COLUMN public.obligaciones_catalogo.activo         IS 'false = oculta del catálogo sin borrarla';
COMMENT ON COLUMN public.obligaciones_catalogo.orden          IS 'Orden de aparición dentro del programa';
COMMENT ON COLUMN public.obligaciones_catalogo.notas_internas IS 'Notas visibles solo para administradores';

-- 2. Constraint única para evitar duplicados en el catálogo
ALTER TABLE public.obligaciones_catalogo
  DROP CONSTRAINT IF EXISTS obligaciones_catalogo_programa_nombre_key;
ALTER TABLE public.obligaciones_catalogo
  ADD CONSTRAINT obligaciones_catalogo_programa_nombre_key UNIQUE (programa, nombre);

-- 4. Índice para consultas por programa activo
CREATE INDEX IF NOT EXISTS idx_catalogo_programa_activo
  ON public.obligaciones_catalogo (programa, activo, orden);

-- 5. FK en obligaciones → catálogo (opcional: una obligación puede venir del catálogo o ser creada manualmente)
ALTER TABLE public.obligaciones
  ADD COLUMN IF NOT EXISTS catalogo_id UUID
    REFERENCES public.obligaciones_catalogo(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.obligaciones.catalogo_id IS 'Catálogo maestro del que se activó esta obligación. NULL = creada manualmente.';

CREATE INDEX IF NOT EXISTS idx_obligaciones_catalogo_id
  ON public.obligaciones (catalogo_id) WHERE catalogo_id IS NOT NULL;
