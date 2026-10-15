BEGIN;
DO $$ DECLARE r jsonb; BEGIN
 r:=public.obligacion_v2_calcular_fecha('{"dia":17}',false,'2026-02-01');
 IF r->>'fecha' IS NOT NULL OR r->>'motivo'<>'normativa_pendiente' THEN RAISE EXCEPTION 'Plazo sin validar'; END IF;
 r:=public.obligacion_v2_calcular_fecha('{}',true,'2026-02-01');
 IF r->>'fecha' IS NOT NULL OR r->>'motivo'<>'regla_incompleta' THEN RAISE EXCEPTION 'Dia uno inventado'; END IF;
 r:=public.obligacion_v2_calcular_fecha('{"dia":31}',true,'2028-02-01');
 IF r->>'fecha'<>'2028-02-29' THEN RAISE EXCEPTION 'Bisiesto incorrecto'; END IF;
 r:=public.obligacion_v2_calcular_fecha('{"dia":17,"dias_habiles":true}',true,'2026-02-01');
 IF r->>'fecha' IS NOT NULL OR r->>'motivo'<>'calendario_pendiente' THEN RAISE EXCEPTION 'Calendario inventado'; END IF;
 r:=public.obligacion_v2_calcular_fecha('{"dia":31,"dias_habiles":true,"calendario":{"validado":true,"referencia":"fixture sintetico","feriados":["2026-02-27"]}}',true,'2026-02-01');
 IF r->>'fecha'<>'2026-02-26' THEN RAISE EXCEPTION 'Ultimo habil con feriado incorrecto'; END IF;
END $$;
ROLLBACK;
