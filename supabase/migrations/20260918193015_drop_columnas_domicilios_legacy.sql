-- Las direcciones por programa viven ahora en domicilios_operacion.programa.
-- Verificado antes de aplicar: 0 de 6 empresas tenian valores en estas columnas,
-- ningun codigo de la app las lee o escribe, y no hay vistas ni funciones que
-- dependan de ellas.
ALTER TABLE public.empresas DROP COLUMN IF EXISTS immex_domicilios;
ALTER TABLE public.empresas DROP COLUMN IF EXISTS prosec_domicilios;
