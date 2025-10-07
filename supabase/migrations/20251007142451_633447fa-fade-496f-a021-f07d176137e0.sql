-- Fix security issue: Restrict cliente access to only their own empresa
-- Problem: Clientes could view multiple empresas through consultor assignments
-- Solution: Add direct empresa_id to profiles and restrict access to only that empresa

-- Step 1: Add empresa_id to profiles table for direct empresa membership
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_empresa_id ON public.profiles(empresa_id);

-- Step 2: Drop the problematic cliente policy
DROP POLICY IF EXISTS "Clientes can view their assigned empresa" ON public.empresas;

-- Step 3: Create new restrictive policy for clientes
-- Clientes can ONLY view the ONE empresa they directly belong to (via profiles.empresa_id)
CREATE POLICY "Clientes can view only their own empresa"
ON public.empresas
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'cliente'::app_role) AND
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.empresa_id = empresas.id
  )
);

-- Step 4: Add policy to allow clientes to update their own profile empresa_id
-- (in case they need to be assigned to an empresa)
-- Note: This should be done by admins, but we allow self-update for flexibility
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() IS NOT NULL AND auth.uid() = id)
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  auth.uid() = id AND
  -- Prevent clientes from changing their empresa_id themselves
  (
    NOT has_role(auth.uid(), 'cliente'::app_role) OR
    empresa_id = (SELECT empresa_id FROM public.profiles WHERE id = auth.uid())
  )
);

-- Step 5: Add policy for admins to assign clientes to empresas
CREATE POLICY "Admins can update profile empresa assignments"
ON public.profiles
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'administrador'::app_role)
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'administrador'::app_role)
);

-- Add comment documenting the security model
COMMENT ON COLUMN public.profiles.empresa_id IS 'Direct empresa membership for cliente users. Clientes can only view/access their own empresa. Managed by administrators.';

-- Migration note: Existing cliente users will need to have their empresa_id set by an administrator
-- This can be done through a data migration or admin interface