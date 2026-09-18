ALTER TABLE public.domicilios_operacion ADD COLUMN IF NOT EXISTS programa text;

CREATE INDEX IF NOT EXISTS idx_domicilios_operacion_empresa_programa
  ON public.domicilios_operacion (empresa_id, programa);

INSERT INTO public.domicilios_operacion (empresa_id, domicilio, programa)
SELECT e.id, d, 'immex'
FROM public.empresas e, unnest(e.immex_domicilios) AS d
WHERE e.immex_domicilios IS NOT NULL
  AND btrim(d) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.domicilios_operacion x
    WHERE x.empresa_id = e.id AND x.programa = 'immex' AND x.domicilio = d
  );

INSERT INTO public.domicilios_operacion (empresa_id, domicilio, programa)
SELECT e.id, d, 'prosec'
FROM public.empresas e, unnest(e.prosec_domicilios) AS d
WHERE e.prosec_domicilios IS NOT NULL
  AND btrim(d) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.domicilios_operacion x
    WHERE x.empresa_id = e.id AND x.programa = 'prosec' AND x.domicilio = d
  );