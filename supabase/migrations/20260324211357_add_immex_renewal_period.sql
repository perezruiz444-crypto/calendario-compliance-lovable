-- Add configurable renewal period for IMMEX program per empresa
-- Used to calculate the next renewal date automatically based on immex_fecha_autorizacion
ALTER TABLE empresas
  ADD COLUMN IF NOT EXISTS immex_periodo_renovacion_meses integer DEFAULT NULL;

COMMENT ON COLUMN empresas.immex_periodo_renovacion_meses IS 'Renewal period in months for IMMEX program (e.g. 12=1yr, 24=2yr, 36=3yr, 60=5yr). Used with immex_fecha_autorizacion to auto-calculate next renewal date.';
