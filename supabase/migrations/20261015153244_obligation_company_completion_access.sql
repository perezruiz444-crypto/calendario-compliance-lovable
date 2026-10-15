-- Administrador: todas las empresas. Cliente: obligaciones activas de su empresa.
-- La asignación individual organiza responsables; ya no condiciona el cumplimiento.
-- Conserva consultores asignados, identidad del periodo, historial y evidencia privada.
BEGIN;
CREATE OR REPLACE FUNCTION public.obligacion_v2_puede_registrar(p_obligacion_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.obligacion_v2_puede_leer(p_obligacion_id) AND EXISTS(
  SELECT 1 FROM public.obligaciones o WHERE o.id=p_obligacion_id AND o.activa
 );
$$;
REVOKE ALL ON FUNCTION public.obligacion_v2_puede_registrar(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.obligacion_v2_puede_registrar(uuid) TO authenticated;
COMMIT;
