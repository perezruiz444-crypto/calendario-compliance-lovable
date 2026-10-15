-- Evidencias: cliente responsable, consultor asignado o administrador.
-- Conserva SELECT existente por empresa y los objetos almacenados.
BEGIN;
CREATE OR REPLACE FUNCTION public.obligacion_v2_puede_subir_evidencia(p_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.obligaciones o
  WHERE o.empresa_id::text=split_part(p_path,'/',1) AND o.id::text=split_part(p_path,'/',2)
   AND nullif(split_part(p_path,'/',3),'') IS NOT NULL AND public.obligacion_v2_puede_registrar(o.id));
$$;
REVOKE ALL ON FUNCTION public.obligacion_v2_puede_subir_evidencia(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.obligacion_v2_puede_subir_evidencia(text) TO authenticated;
DROP POLICY IF EXISTS evidencias_insert_scoped ON storage.objects;
CREATE POLICY evidencias_insert_scoped ON storage.objects FOR INSERT TO authenticated
 WITH CHECK(bucket_id='evidencias-cumplimiento' AND public.obligacion_v2_puede_subir_evidencia(name));
COMMIT;
