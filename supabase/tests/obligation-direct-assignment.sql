BEGIN;
ALTER TABLE public.obligaciones ADD COLUMN IF NOT EXISTS responsable_id uuid;
UPDATE public.obligaciones SET responsable_id='10000000-0000-4000-8000-000000000002' WHERE id='40000000-0000-4000-8000-000000000002';
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF NOT public.obligacion_v2_puede_registrar('40000000-0000-4000-8000-000000000002') THEN RAISE EXCEPTION 'Se perdió asignación directa existente'; END IF;
 IF public.obligacion_v2_puede_registrar('40000000-0000-4000-8000-000000000003') THEN RAISE EXCEPTION 'Acceso cruzado'; END IF;
END $$;
ROLLBACK;
