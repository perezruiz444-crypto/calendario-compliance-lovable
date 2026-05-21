-- ============================================================
-- FIXES DE SEGURIDAD BATCH 3
-- Pega TODO en SQL Editor de Supabase y ejecuta UNA VEZ
-- URL: https://supabase.com/dashboard/project/svozqrjhwaohfmbkhpig/sql/new
-- ============================================================

-- ------------------------------------------------------------
-- Fix: obligacion_cumplimientos SELECT scoped
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view cumplimientos of visible obligaciones" ON public.obligacion_cumplimientos;

CREATE POLICY "obligacion_cumplimientos_select_scoped"
ON public.obligacion_cumplimientos FOR SELECT
USING (
  public.has_role(auth.uid(), 'administrador'::app_role)
  OR EXISTS (
    SELECT 1
    FROM public.obligaciones o
    WHERE o.id = obligacion_cumplimientos.obligacion_id
      AND (
        EXISTS (
          SELECT 1 FROM public.consultor_empresa_asignacion cea
          WHERE cea.consultor_id = auth.uid()
            AND cea.empresa_id = o.empresa_id
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.empresa_id = o.empresa_id
        )
      )
  )
);

-- ------------------------------------------------------------
-- Fix: obligacion_responsables SELECT scoped
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view responsables of their obligaciones" ON public.obligacion_responsables;

CREATE POLICY "obligacion_responsables_select_scoped"
ON public.obligacion_responsables FOR SELECT
USING (
  public.has_role(auth.uid(), 'administrador'::app_role)
  OR EXISTS (
    SELECT 1
    FROM public.obligaciones o
    WHERE o.id = obligacion_responsables.obligacion_id
      AND (
        EXISTS (
          SELECT 1 FROM public.consultor_empresa_asignacion cea
          WHERE cea.consultor_id = auth.uid()
            AND cea.empresa_id = o.empresa_id
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.empresa_id = o.empresa_id
        )
      )
  )
);
