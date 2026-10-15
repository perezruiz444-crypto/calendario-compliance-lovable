-- Contrato PostgreSQL local; NO sustituye prueba HTTP de Supabase Storage.
BEGIN;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
SET LOCAL ROLE authenticated;
INSERT INTO storage.objects(bucket_id,name) VALUES('evidencias-cumplimiento','20000000-0000-4000-8000-000000000001/40000000-0000-4000-8000-000000000001/prueba.pdf');
INSERT INTO storage.objects(bucket_id,name) VALUES('evidencias-cumplimiento','20000000-0000-4000-8000-000000000001/40000000-0000-4000-8000-000000000002/prueba.pdf');
DO $$ BEGIN
 BEGIN
  INSERT INTO storage.objects(bucket_id,name) VALUES('evidencias-cumplimiento','20000000-0000-4000-8000-000000000002/40000000-0000-4000-8000-000000000003/prueba.pdf');
  RAISE EXCEPTION 'Cliente sube en otra empresa';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
ROLLBACK;
