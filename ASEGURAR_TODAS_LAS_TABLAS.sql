-- ============================================================
-- FORZAR RLS EN TODAS LAS TABLAS DEL ESQUEMA PUBLIC
-- Ejecuta este script en el SQL Editor de Supabase
-- URL: https://supabase.com/dashboard/project/svozqrjhwaohfmbkhpig/sql/new
-- ============================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
    END LOOP;
END $$;
