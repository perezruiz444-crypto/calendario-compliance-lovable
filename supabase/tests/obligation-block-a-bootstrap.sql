-- Solo contrato local de PostgreSQL: NO es un baseline de Supabase ni una migración.
-- Datos sintéticos. El runner comprueba host loopback, puerto y nombre de base aislada.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE anon NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claim.role',true),''),'authenticated') $$;
GRANT USAGE ON SCHEMA auth TO authenticated,anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO authenticated,anon;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE TABLE public.empresas(id uuid PRIMARY KEY, razon_social text);
CREATE TABLE public.profiles(id uuid PRIMARY KEY REFERENCES auth.users, empresa_id uuid REFERENCES empresas);
CREATE TABLE public.user_roles(user_id uuid REFERENCES auth.users, role text);
CREATE TABLE public.consultor_empresa_asignacion(consultor_id uuid REFERENCES auth.users, empresa_id uuid REFERENCES empresas);
CREATE TABLE public.obligaciones_catalogo(id uuid PRIMARY KEY, nombre text NOT NULL, programa text NOT NULL);
CREATE TABLE public.obligaciones(id uuid PRIMARY KEY, empresa_id uuid NOT NULL REFERENCES empresas, catalogo_id uuid REFERENCES obligaciones_catalogo, nombre text, activa boolean DEFAULT true);
CREATE TABLE public.obligacion_responsables(obligacion_id uuid REFERENCES obligaciones, user_id uuid REFERENCES auth.users);
CREATE TABLE public.obligacion_ocurrencias(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), empresa_id uuid NOT NULL REFERENCES empresas, obligacion_id uuid NOT NULL REFERENCES obligaciones, periodo_key text, fecha_vencimiento date NOT NULL, UNIQUE(obligacion_id,periodo_key));
CREATE TABLE public.obligacion_cumplimientos(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), empresa_id uuid REFERENCES empresas, obligacion_id uuid REFERENCES obligaciones, ocurrencia_id uuid REFERENCES obligacion_ocurrencias, periodo_key text, completada boolean DEFAULT false, vigente boolean DEFAULT true, evidencia_url text, completada_por uuid REFERENCES auth.users, notas text, reemplazado_por uuid);
INSERT INTO auth.users VALUES ('10000000-0000-4000-8000-000000000001'),('10000000-0000-4000-8000-000000000002'),('10000000-0000-4000-8000-000000000003'),('10000000-0000-4000-8000-000000000004');
INSERT INTO empresas VALUES ('20000000-0000-4000-8000-000000000001','Empresa A ficticia'),('20000000-0000-4000-8000-000000000002','Empresa B ficticia');
INSERT INTO profiles VALUES ('10000000-0000-4000-8000-000000000001',NULL),('10000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001'),('10000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000002'),('10000000-0000-4000-8000-000000000004',NULL);
INSERT INTO user_roles VALUES ('10000000-0000-4000-8000-000000000001','administrador'),('10000000-0000-4000-8000-000000000002','cliente'),('10000000-0000-4000-8000-000000000003','cliente'),('10000000-0000-4000-8000-000000000004','consultor');
INSERT INTO consultor_empresa_asignacion VALUES ('10000000-0000-4000-8000-000000000004','20000000-0000-4000-8000-000000000001');
INSERT INTO obligaciones_catalogo VALUES ('30000000-0000-4000-8000-000000000001','Inventarios ficticios','immex'),('30000000-0000-4000-8000-000000000002','Control ficticio B','immex');
INSERT INTO obligaciones VALUES ('40000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Asignada A',true),('40000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001',NULL,'No asignada A',true),('40000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','Asignada B',true);
INSERT INTO obligacion_responsables VALUES ('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002'),('40000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003');
INSERT INTO obligacion_ocurrencias VALUES ('50000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','2026-09','2026-09-20');
INSERT INTO obligacion_cumplimientos(id,empresa_id,obligacion_id,ocurrencia_id,periodo_key,completada,vigente,evidencia_url,completada_por) VALUES ('60000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','2026-09',true,true,NULL,'10000000-0000-4000-8000-000000000002');

CREATE SCHEMA storage;
CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text);
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT SELECT,INSERT ON storage.objects TO authenticated;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.calcular_periodo_key(p_fecha date, p_frecuencia text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE p_frecuencia
    WHEN 'SEMANAL'        THEN to_char(p_fecha,'IYYY') || '-W' || lpad(to_char(p_fecha,'IW'),2,'0')
    WHEN 'MENSUAL'        THEN to_char(p_fecha,'YYYY-MM')
    WHEN 'ULTIMO_DIA_MES' THEN to_char(p_fecha,'YYYY-MM')
    WHEN 'BIMESTRAL'      THEN to_char(p_fecha,'YYYY') || '-B' || ceil(extract(month from p_fecha)/2.0)::int
    WHEN 'TRIMESTRAL'     THEN to_char(p_fecha,'YYYY') || '-T' || ceil(extract(month from p_fecha)/3.0)::int
    WHEN 'SEMESTRAL'      THEN to_char(p_fecha,'YYYY') || '-S' || CASE WHEN extract(month from p_fecha) < 7 THEN 1 ELSE 2 END
    WHEN 'ANUAL'          THEN to_char(p_fecha,'YYYY')
    WHEN 'EVENTUAL'       THEN to_char(p_fecha,'YYYY')
    ELSE to_char(p_fecha,'YYYY-MM')
  END;
$function$
