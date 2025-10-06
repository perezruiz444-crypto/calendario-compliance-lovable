-- Fix infinite recursion in RLS policies
-- Drop problematic policies
DROP POLICY IF EXISTS "Clientes can view their empresa asignaciones" ON public.consultor_empresa_asignacion;
DROP POLICY IF EXISTS "Clientes can view their own empresa" ON public.empresas;

-- Recreate policies without circular references
-- For consultor_empresa_asignacion table
CREATE POLICY "Consultores can view their asignaciones v2" 
ON public.consultor_empresa_asignacion 
FOR SELECT 
USING (
  consultor_id = auth.uid()
);

-- For empresas table - fix the cliente policy to avoid recursion
CREATE POLICY "Clientes can view their own empresa v2" 
ON public.empresas 
FOR SELECT 
USING (
  has_role(auth.uid(), 'cliente'::app_role) AND 
  id IN (
    SELECT empresa_id 
    FROM consultor_empresa_asignacion 
    WHERE consultor_id = auth.uid()
  )
);