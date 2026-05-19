
-- 1. Ampliar el CHECK de empresa_programas
ALTER TABLE public.empresa_programas DROP CONSTRAINT IF EXISTS empresa_programas_programa_check;
ALTER TABLE public.empresa_programas ADD CONSTRAINT empresa_programas_programa_check
  CHECK (programa IN ('immex','prosec','padron','padron_general','padron_sectorial','cert_iva_ieps','general'));

-- 2. Reclasificar catálogo
UPDATE public.obligaciones_catalogo
SET programa = 'padron_general', categoria = 'padron_general'
WHERE programa = 'padron'
  AND nombre IN (
    'Verificación de Datos Padrón de Importadores',
    'Declaración de Valor (Forma A1) — Muestreo'
  );

UPDATE public.obligaciones_catalogo
SET programa = 'padron_sectorial', categoria = 'padron_sectorial'
WHERE programa = 'padron'
  AND nombre = 'Renovación Padrones Sectoriales';

-- 3. Reclasificar obligaciones ya materializadas (mantener consistencia)
UPDATE public.obligaciones o
SET categoria = c.categoria
FROM public.obligaciones_catalogo c
WHERE o.catalogo_id = c.id
  AND c.programa IN ('padron_general','padron_sectorial')
  AND o.categoria = 'padron';

-- 4. Migrar empresa_programas existentes
UPDATE public.empresa_programas
SET programa = 'padron_general'
WHERE programa = 'padron';
