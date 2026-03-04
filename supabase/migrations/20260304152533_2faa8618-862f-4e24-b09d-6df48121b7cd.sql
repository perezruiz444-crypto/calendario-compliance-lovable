
-- Add PROSEC renewal date columns
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS prosec_fecha_ultima_renovacion date,
  ADD COLUMN IF NOT EXISTS prosec_fecha_siguiente_renovacion date;

-- Allow clients to INSERT into obligacion_cumplimientos (for their empresa's obligaciones)
CREATE POLICY "Clientes can insert cumplimientos for their empresa"
ON public.obligacion_cumplimientos
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'cliente'::app_role)
  AND EXISTS (
    SELECT 1 FROM obligaciones o
    JOIN profiles p ON p.empresa_id = o.empresa_id
    WHERE o.id = obligacion_cumplimientos.obligacion_id
      AND p.id = auth.uid()
  )
);

-- Allow clients to DELETE their own cumplimientos
CREATE POLICY "Clientes can delete cumplimientos for their empresa"
ON public.obligacion_cumplimientos
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'cliente'::app_role)
  AND completada_por = auth.uid()
);
