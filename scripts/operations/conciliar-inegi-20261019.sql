-- Operación de datos autorizada: retirar cinco seguimientos duplicados.
-- Conserva todos los registros históricos y no acredita ninguna nueva entrega.
-- No modifica fechas ni valida el fundamento o el plazo mensual/anual de INEGI.
BEGIN ISOLATION LEVEL REPEATABLE READ;
SET LOCAL lock_timeout = '5s';
DO $$
DECLARE
  v_action constant text := 'conciliacion_inegi_duplicados_20261019';
  v_actor constant uuid := 'f623e0d3-37b5-4ff4-be4f-cc73c99c85c4';
  v_before jsonb;
  v_completions text;
  v_occurrences text;
  v_others text;
  v_changed integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(v_action));
  IF EXISTS (SELECT 1 FROM public.audit_logs WHERE action=v_action) THEN
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=v_actor AND role='administrador') THEN
    RAISE EXCEPTION 'Administrador de la autorización no encontrado';
  END IF;
  CREATE TEMP TABLE inegi_pairs ON COMMIT DROP AS
  SELECT s.id source_id,t.id target_id,s.empresa_id
  FROM public.obligaciones s JOIN public.obligaciones t ON t.empresa_id=s.empresa_id
    AND t.catalogo_id='6a4f4015-ef50-46ae-b1fa-0bb6b9b011c3' AND t.activa
  WHERE s.catalogo_id='d5219690-363c-4584-a47c-3d87b13a72ae' AND s.activa;
  IF (SELECT count(*) FROM inegi_pairs)<>5 OR
     (SELECT count(DISTINCT source_id) FROM inegi_pairs)<>5 OR
     (SELECT count(DISTINCT empresa_id) FROM inegi_pairs)<>5 OR EXISTS (
       SELECT 1 FROM inegi_pairs WHERE source_id NOT IN (
         '019e225e-2d51-4a56-a08a-d633a1555f77'::uuid,
         '1845319d-a8ae-4785-a629-63e22efe61f1'::uuid,
         '315ac136-e710-4161-96ac-84350440b00f'::uuid,
         'b1730ed2-b996-4f5c-a607-2f5c874cf5fb'::uuid,
         '0f2ef663-2821-4bb3-b725-1b46c4192a2e'::uuid)) THEN
    RAISE EXCEPTION 'El conjunto de cinco empresas cambió; revisar antes de aplicar';
  END IF;
  PERFORM o.id FROM public.obligaciones o JOIN inegi_pairs p
    ON o.id IN (p.source_id,p.target_id) FOR UPDATE OF o;
  -- Cada marca vigente debe estar ya reflejada exactamente en el destino.
  IF EXISTS (SELECT 1 FROM public.obligacion_cumplimientos c JOIN inegi_pairs p ON p.source_id=c.obligacion_id
    WHERE c.vigente AND NOT EXISTS (
      SELECT 1 FROM public.obligacion_cumplimientos d
      JOIN public.obligacion_ocurrencias x ON x.id=d.ocurrencia_id
      WHERE d.obligacion_id=p.target_id AND d.vigente AND d.periodo_key=c.periodo_key
        AND d.completada=c.completada AND d.empresa_id=p.empresa_id
        AND x.obligacion_id=p.target_id AND x.empresa_id=p.empresa_id AND x.periodo_key=d.periodo_key)) THEN
    RAISE EXCEPTION 'Hay marcas sin correspondencia exacta en INEGI';
  END IF;
  IF EXISTS (SELECT 1 FROM public.obligacion_ocurrencias s JOIN inegi_pairs p ON p.source_id=s.obligacion_id
    WHERE NOT EXISTS (SELECT 1 FROM public.obligacion_ocurrencias t WHERE t.obligacion_id=p.target_id
      AND t.empresa_id=p.empresa_id AND t.periodo_key=s.periodo_key AND t.fecha_vencimiento=s.fecha_vencimiento)) THEN
    RAISE EXCEPTION 'Hay periodos sin correspondencia exacta en INEGI';
  END IF;
  SELECT jsonb_agg(to_jsonb(o) ORDER BY o.id) INTO v_before
    FROM public.obligaciones o JOIN inegi_pairs p ON p.source_id=o.id;
  SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY id)::text,'[]')) INTO v_completions FROM public.obligacion_cumplimientos c;
  SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY id)::text,'[]')) INTO v_occurrences FROM public.obligacion_ocurrencias c;
  SELECT md5(coalesce(jsonb_agg(to_jsonb(o) ORDER BY id)::text,'[]')) INTO v_others FROM public.obligaciones o
    WHERE NOT EXISTS(SELECT 1 FROM inegi_pairs p WHERE p.source_id=o.id);
  INSERT INTO public.obligacion_relaciones(empresa_id,obligacion_origen_id,obligacion_destino_id,tipo,created_by)
    SELECT empresa_id,target_id,source_id,'evidencia_compartida',v_actor FROM inegi_pairs
    ON CONFLICT(obligacion_origen_id,obligacion_destino_id,tipo) DO NOTHING;
  UPDATE public.obligaciones o SET activa=false,
    notas=concat_ws(E'\n',nullif(o.notas,''),'Seguimiento mensual duplicado de INEGI, retirado con autorización del administrador el 19/10/2026. Historial conservado; no acredita nuevos periodos.')
    FROM inegi_pairs p WHERE o.id=p.source_id;
  GET DIAGNOSTICS v_changed=ROW_COUNT;
  IF v_changed<>5 THEN RAISE EXCEPTION 'No se retiraron exactamente cinco duplicados'; END IF;
  IF v_completions IS DISTINCT FROM (SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY id)::text,'[]')) FROM public.obligacion_cumplimientos c)
    OR v_occurrences IS DISTINCT FROM (SELECT md5(coalesce(jsonb_agg(to_jsonb(c) ORDER BY id)::text,'[]')) FROM public.obligacion_ocurrencias c)
    OR v_others IS DISTINCT FROM (SELECT md5(coalesce(jsonb_agg(to_jsonb(o) ORDER BY id)::text,'[]')) FROM public.obligaciones o
      WHERE NOT EXISTS(SELECT 1 FROM inegi_pairs p WHERE p.source_id=o.id)) THEN
    RAISE EXCEPTION 'Cambió historial u otra obligación: revertir operación';
  END IF;
  INSERT INTO public.audit_logs(user_id,action,table_name,old_values,new_values)
    VALUES(v_actor,v_action,'obligaciones',jsonb_build_object('obligaciones',v_before),
      jsonb_build_object('estado','aplicado','duplicados_retirados',5,
        'correspondencias',(SELECT jsonb_agg(to_jsonb(p) ORDER BY source_id) FROM inegi_pairs p),
        'cumplimientos_hash',v_completions,'ocurrencias_hash',v_occurrences,'otras_obligaciones_hash',v_others,
        'fechas_modificadas',false,'normativa_validada',false));
END $$;
COMMIT;
