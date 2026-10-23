BEGIN;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
INSERT INTO public.obligacion_reglas(catalogo_id,version,tipo_control,origen_control,clasificacion_estado,normativa_estado,created_by)
VALUES('30000000-0000-4000-8000-000000000001',500,'condicion','mixto','aprobada','pendiente','10000000-0000-4000-8000-000000000001');
INSERT INTO public.obligacion_reglas(obligacion_id,version,tipo_control,origen_control,clasificacion_estado,normativa_estado,parametros,created_by)
VALUES('40000000-0000-4000-8000-000000000001',500,'evento','mixto','aprobada','pendiente','{}','10000000-0000-4000-8000-000000000001');
DO $$ BEGIN
 IF public.obligacion_v2_tipo('40000000-0000-4000-8000-000000000001')<>'evento' THEN RAISE EXCEPTION 'Perdió excepción particular'; END IF;
END $$;
INSERT INTO public.obligacion_reglas(obligacion_id,version,tipo_control,origen_control,clasificacion_estado,normativa_estado,parametros,created_by)
VALUES('40000000-0000-4000-8000-000000000001',501,'evento','mixto','aprobada','pendiente','{"heredar_catalogo":true}','10000000-0000-4000-8000-000000000001');
DO $$ BEGIN
 IF public.obligacion_v2_tipo('40000000-0000-4000-8000-000000000001')<>'condicion' THEN RAISE EXCEPTION 'No heredó el catálogo'; END IF;
END $$;
INSERT INTO public.obligacion_reglas(catalogo_id,version,tipo_control,origen_control,clasificacion_estado,normativa_estado,created_by)
VALUES('30000000-0000-4000-8000-000000000001',501,'periodica','mixto','aprobada','pendiente','10000000-0000-4000-8000-000000000001');
DO $$ BEGIN
 IF public.obligacion_v2_tipo('40000000-0000-4000-8000-000000000001')<>'periodica' THEN RAISE EXCEPTION 'Herencia quedó congelada en una versión anterior'; END IF;
END $$;
-- Una propuesta particular no vuelve a activar una excepción histórica.
INSERT INTO public.obligacion_reglas(obligacion_id,version,tipo_control,origen_control,clasificacion_estado,normativa_estado,created_by)
VALUES('40000000-0000-4000-8000-000000000001',502,'vigencia','mixto','propuesta','pendiente','10000000-0000-4000-8000-000000000001');
DO $$ BEGIN
 IF public.obligacion_v2_tipo('40000000-0000-4000-8000-000000000001')<>'periodica' THEN RAISE EXCEPTION 'Propuesta interrumpió herencia aprobada'; END IF;
 IF has_function_privilege('anon','public.obligacion_v2_regla(uuid)','EXECUTE') THEN RAISE EXCEPTION 'Expuso helper a anónimos'; END IF;
END $$;
UPDATE public.obligaciones SET nombre='Inventarios ficticios',descripcion=NULL,articulos=NULL,presentacion=NULL WHERE id='40000000-0000-4000-8000-000000000001';
INSERT INTO public.obligaciones(id,empresa_id,catalogo_id,nombre,activa,descripcion)
VALUES('40000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','Nombre particular',true,'Alcance particular'),
 ('40000000-0000-4000-8000-000000000005','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Inventarios ficticios',false,NULL);
CREATE TEMP TABLE shared_marks AS SELECT to_jsonb(c) row FROM public.obligacion_cumplimientos c;
CREATE TEMP TABLE shared_occurrences AS SELECT to_jsonb(x) row FROM public.obligacion_ocurrencias x;
UPDATE public.obligaciones_catalogo SET nombre='Nombre general corregido',descripcion='Descripción general',presentacion='En todo momento',articulos='Referencia general'
WHERE id='30000000-0000-4000-8000-000000000001';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.obligaciones WHERE id='40000000-0000-4000-8000-000000000001' AND nombre='Nombre general corregido' AND descripcion='Descripción general' AND presentacion='En todo momento') THEN RAISE EXCEPTION 'No propagó textos heredados'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.obligaciones WHERE id='40000000-0000-4000-8000-000000000004' AND nombre='Nombre particular' AND descripcion='Alcance particular') THEN RAISE EXCEPTION 'Sobrescribió texto particular'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.obligaciones WHERE id='40000000-0000-4000-8000-000000000005' AND nombre='Inventarios ficticios' AND descripcion IS NULL) THEN RAISE EXCEPTION 'Cambió antecedente inactivo'; END IF;
 IF EXISTS(SELECT row FROM shared_marks EXCEPT SELECT to_jsonb(c) FROM public.obligacion_cumplimientos c)
 OR EXISTS(SELECT row FROM shared_occurrences EXCEPT SELECT to_jsonb(x) FROM public.obligacion_ocurrencias x) THEN RAISE EXCEPTION 'Cambió historial'; END IF;
END $$;
ROLLBACK;
