-- Fix RLS policies for clientes on tareas table
-- Drop incorrect policies
DROP POLICY IF EXISTS "Clientes can create tareas for their empresa" ON public.tareas;
DROP POLICY IF EXISTS "Clientes can update tareas of their empresa" ON public.tareas;
DROP POLICY IF EXISTS "Clientes can view tareas of their empresa" ON public.tareas;

-- Create correct policies using profiles.empresa_id
CREATE POLICY "Clientes can view tareas of their empresa"
ON public.tareas
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'cliente') 
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.empresa_id = tareas.empresa_id
  )
);

CREATE POLICY "Clientes can create tareas for their empresa"
ON public.tareas
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'cliente')
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.empresa_id = tareas.empresa_id
  )
);

CREATE POLICY "Clientes can update tareas of their empresa"
ON public.tareas
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'cliente')
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.empresa_id = tareas.empresa_id
  )
);