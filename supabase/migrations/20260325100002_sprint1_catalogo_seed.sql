-- Sprint 1: Poblar catálogo maestro con las obligaciones estándar de comercio exterior
-- Estas plantillas reemplazan el objeto hardcodeado OBLIGACIONES_POR_PROGRAMA
-- en OnboardingEmpresaWizard.tsx.
-- Se usa ON CONFLICT DO NOTHING para que sea idempotente (safe to re-run).

-- Usamos una tabla temporal con nombre único para hacer el seed sin duplicados
-- basados en (programa, nombre).

INSERT INTO public.obligaciones_catalogo
  (programa, categoria, nombre, articulos, descripcion, presentacion, obligatorio, activo, orden)
VALUES

  -- ─── IMMEX ───────────────────────────────────────────────────────────────
  ('immex', 'immex',
   'Reporte Mensual de Producción IMMEX',
   'Art. 25 Decreto IMMEX',
   'Presentar ante la SE el reporte mensual de operaciones de manufactura bajo el programa IMMEX, incluyendo insumos importados temporalmente y productos exportados.',
   'mensual', true, true, 10),

  ('immex', 'immex',
   'Informe Trimestral de Inventarios IMMEX',
   'Art. 24 Frac. IV Decreto IMMEX',
   'Envío del reporte de control de inventarios de mercancías bajo régimen temporal IMMEX.',
   'trimestral', true, true, 20),

  ('immex', 'immex',
   'Constancia de Destrucción de Mermas IMMEX',
   'Art. 35 Decreto IMMEX',
   'Acreditar ante la SE la destrucción de mermas y desperdicios generados bajo el programa IMMEX.',
   'trimestral', false, true, 30),

  ('immex', 'immex',
   'Renovación Anual Programa IMMEX',
   'Art. 10 Decreto IMMEX',
   'Presentar ante la SE la solicitud de renovación del programa IMMEX conforme al Decreto.',
   'anual', true, true, 40),

  -- ─── PROSEC ──────────────────────────────────────────────────────────────
  ('prosec', 'prosec',
   'Informe de Utilización PROSEC',
   'Acuerdo PROSEC Art. 12',
   'Reportar ante la SE la utilización de los beneficios arancelarios del programa PROSEC en el semestre anterior.',
   'semestral', true, true, 10),

  ('prosec', 'prosec',
   'Renovación Anual Programa PROSEC',
   'Acuerdo PROSEC Art. 8',
   'Presentar ante la SE la solicitud de renovación del programa PROSEC conforme al Acuerdo.',
   'anual', true, true, 20),

  -- ─── PADRÓN DE IMPORTADORES ──────────────────────────────────────────────
  ('padron', 'padron',
   'Verificación de Datos Padrón de Importadores',
   'Regla 1.3.1 RMF 2026',
   'Verificar y actualizar los datos en el Padrón General de Importadores ante el SAT para mantener la vigencia del padrón.',
   'anual', true, true, 10),

  ('padron', 'padron',
   'Declaración de Valor (Forma A1) — Muestreo',
   'Art. 64 Ley Aduanera',
   'Presentar las declaraciones de valor de las importaciones muestreadas conforme a la metodología GATT.',
   'mensual', false, true, 20),

  -- ─── CERT. IVA/IEPS ──────────────────────────────────────────────────────
  ('cert_iva_ieps', 'cert_iva_ieps',
   'Declaración Mensual IVA/IEPS (Certificación)',
   'Art. 5-D LIVA; RMF 2026 2.1.6',
   'Presentar la declaración mensual de IVA al 0% y IEPS correspondiente al periodo, amparo de la certificación IVA/IEPS vigente.',
   'mensual', true, true, 10),

  ('cert_iva_ieps', 'cert_iva_ieps',
   'Renovación Certificación IVA/IEPS',
   'RMF 2026 Regla 7.2.3',
   'Tramitar la renovación de la certificación IVA/IEPS ante el SAT antes del vencimiento.',
   'anual', true, true, 20),

  -- ─── OEA (Operador Económico Autorizado) ─────────────────────────────────
  ('oea', 'cert_iva_ieps',
   'Actualización Matriz de Seguridad OEA',
   'Regla 7.2.1 RMF 2026',
   'Actualizar y remitir ante el SAT la matriz de seguridad requerida para el mantenimiento de la certificación OEA vigente.',
   'anual', true, true, 10),

  ('oea', 'cert_iva_ieps',
   'Reporte Semestral Operaciones OEA',
   'Regla 7.2.2 RMF 2026',
   'Presentar el reporte semestral de operaciones de comercio exterior al amparo de la certificación OEA.',
   'semestral', true, true, 20),

  -- ─── GENERAL ─────────────────────────────────────────────────────────────
  ('general', 'general',
   'Reporte de Operaciones Vuelta Larga (OVL)',
   'RMF 2026 Regla 3.1.33',
   'Presentar ante el ACFI el informe mensual de operaciones vuelta larga.',
   'mensual', false, true, 10),

  ('general', 'general',
   'Declaración Anual de Contribuciones Comercio Exterior',
   'CFF Art. 32',
   'Presentar la declaración anual consolidada de contribuciones relacionadas con operaciones de comercio exterior.',
   'anual', true, true, 20)

ON CONFLICT DO NOTHING;
