-- tareas.empresa_id no tenia indice pese a ser NOT NULL y usarse directamente
-- en 4+ policies RLS (consultores/clientes filtrando "tareas de su empresa").
-- Sin indice, cada policy fuerza un seq scan sobre tareas por empresa_id,
-- lo cual degrada linealmente con el volumen de filas al escalar empresas.
CREATE INDEX IF NOT EXISTS idx_tareas_empresa_id ON public.tareas(empresa_id);
