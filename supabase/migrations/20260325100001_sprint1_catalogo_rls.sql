-- Sprint 1: RLS catálogo maestro
-- Solo administradores pueden modificar el catálogo.
-- Consultores y clientes solo lectura.

-- Eliminar políticas permisivas anteriores (permitían escritura a consultores)
DROP POLICY IF EXISTS "Admins y consultores pueden ver catálogo"       ON public.obligaciones_catalogo;
DROP POLICY IF EXISTS "Admins y consultores pueden insertar catálogo"  ON public.obligaciones_catalogo;
DROP POLICY IF EXISTS "Admins y consultores pueden actualizar catálogo" ON public.obligaciones_catalogo;
DROP POLICY IF EXISTS "Admins y consultores pueden eliminar catálogo"  ON public.obligaciones_catalogo;

-- SELECT: todos los usuarios autenticados pueden leer el catálogo
CREATE POLICY "Usuarios autenticados pueden ver catálogo"
  ON public.obligaciones_catalogo FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: solo administradores
CREATE POLICY "Solo admins pueden insertar en catálogo"
  ON public.obligaciones_catalogo FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'administrador'::app_role));

-- UPDATE: solo administradores
CREATE POLICY "Solo admins pueden actualizar catálogo"
  ON public.obligaciones_catalogo FOR UPDATE
  TO authenticated
  USING  (public.has_role(auth.uid(), 'administrador'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'administrador'::app_role));

-- DELETE: solo administradores
CREATE POLICY "Solo admins pueden eliminar de catálogo"
  ON public.obligaciones_catalogo FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'::app_role));
