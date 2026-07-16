ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS cert_iva_ieps_rubro text
    CHECK (cert_iva_ieps_rubro IN ('A','AA','AAA'));

COMMENT ON COLUMN public.empresas.cert_iva_ieps_rubro IS
  'Rubro de la Certificación IVA/IEPS (A, AA, AAA). No afecta obligaciones permanentes; informa vigencia y ficha.';

UPDATE public.obligaciones_catalogo
SET activo = false,
    notas_internas = 'Desactivada: la renovación se gestiona manual por empresa desde cert_iva_ieps_fecha_vencimiento (autorización + 1 año).'
WHERE programa = 'cert_iva_ieps'
  AND nombre   = 'Renovación Certificación IVA/IEPS';