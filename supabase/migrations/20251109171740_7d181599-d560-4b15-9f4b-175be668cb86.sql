-- Fix RLS policy for apoderados_legales - clientes should check profiles table, not consultor_empresa_asignacion
DROP POLICY IF EXISTS "Clientes can view apoderados of their empresa" ON public.apoderados_legales;

CREATE POLICY "Clientes can view apoderados of their empresa"
ON public.apoderados_legales
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'cliente'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.empresa_id = apoderados_legales.empresa_id
  )
);

-- Fix RLS policy for domicilios_operacion - clientes should check profiles table
DROP POLICY IF EXISTS "Clientes can view domicilios of their assigned empresa" ON public.domicilios_operacion;

CREATE POLICY "Clientes can view domicilios of their assigned empresa"
ON public.domicilios_operacion
FOR SELECT
TO authenticated
USING (
  (auth.uid() IS NOT NULL) 
  AND has_role(auth.uid(), 'cliente'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.empresa_id = domicilios_operacion.empresa_id
  )
);