import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (rows: ParsedRow[]) => void;
  loading?: boolean;
}

export interface ParsedRow {
  categoria: string;
  nombre: string;
  descripcion: string;
  fecha_autorizacion: string;
  fecha_vencimiento: string;
  fecha_renovacion: string;
  numero_oficio: string;
  estado: string;
  notas: string;
}

const TEMPLATE = `categoria\tnombre\tdescripcion\tfecha_vencimiento\tfecha_renovacion\tfecha_autorizacion\tnumero_oficio\testado\tnotas
general\tMatriz de Seguridad\tRenovación anual\t2025-12-31\t2025-09-01\t\t\tvigente\t
cert_iva_ieps\tCertificación IVA\tCertificación modalidad AAA\t2026-06-15\t2026-03-01\t2024-06-15\tOFICIO-123\tvigente\t
immex\tPrograma IMMEX\tModalidad industrial\t2027-01-01\t\t2022-01-15\tIMMEX-456\tvigente\t
prosec\tPROSEC Sector 10\tSector automotriz\t2026-12-31\t\t2023-01-01\tPROSEC-789\tvigente\t`;

const VALID_CATEGORIAS = ['general', 'cert_iva_ieps', 'immex', 'prosec', 'padron', 'otro'];
const VALID_ESTADOS = ['vigente', 'por_vencer', 'vencido', 'renovado', 'cancelado'];

export function BulkImportDialog({ open, onOpenChange, onImport, loading }: Props) {
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const handleParse = () => {
    const lines = rawText.trim().split('\n');
    if (lines.length < 2) {
      setErrors(['Se necesitan al menos 2 líneas: encabezado + datos']);
      setParsed([]);
      return;
    }

    const headers = lines[0].split('\t').map(h => h.trim().toLowerCase());
    const nombreIdx = headers.indexOf('nombre');
    if (nombreIdx === -1) {
      setErrors(['Columna "nombre" es requerida en el encabezado']);
      setParsed([]);
      return;
    }

    const rows: ParsedRow[] = [];
    const errs: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split('\t');
      if (cols.length < 2 || cols.every(c => !c.trim())) continue;

      const get = (key: string) => {
        const idx = headers.indexOf(key);
        return idx >= 0 && idx < cols.length ? cols[idx].trim() : '';
      };

      const cat = get('categoria') || 'otro';
      const nombre = get('nombre');
      const estado = get('estado') || 'vigente';

      if (!nombre) { errs.push(`Fila ${i + 1}: nombre vacío`); continue; }
      if (!VALID_CATEGORIAS.includes(cat)) { errs.push(`Fila ${i + 1}: categoría "${cat}" inválida`); continue; }
      if (!VALID_ESTADOS.includes(estado)) { errs.push(`Fila ${i + 1}: estado "${estado}" inválido`); continue; }

      rows.push({
        categoria: cat,
        nombre,
        descripcion: get('descripcion'),
        fecha_autorizacion: get('fecha_autorizacion'),
        fecha_vencimiento: get('fecha_vencimiento'),
        fecha_renovacion: get('fecha_renovacion'),
        numero_oficio: get('numero_oficio'),
        estado,
        notas: get('notas'),
      });
    }

    setParsed(rows);
    setErrors(errs);
    if (rows.length > 0) toast.success(`${rows.length} obligaciones parseadas correctamente`);
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE], { type: 'text/tab-separated-values' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'obligaciones_template.tsv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    if (parsed.length === 0) return;
    onImport(parsed);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setParsed([]); setErrors([]); setRawText(''); } onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Importar Obligaciones Masivamente
          </DialogTitle>
          <DialogDescription>
            Pega datos desde Excel/Sheets separados por tabulación o descarga la plantilla.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-1" />
              Descargar Plantilla TSV
            </Button>
            <span className="text-xs text-muted-foreground">Compatible con Excel y Google Sheets</span>
          </div>

          <div>
            <Textarea
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder="Pega aquí las filas desde Excel/Sheets (Tab-separated)..."
              rows={8}
              className="font-mono text-xs"
            />
          </div>

          <Button onClick={handleParse} variant="secondary" disabled={!rawText.trim()}>
            Validar Datos
          </Button>

          {errors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 space-y-1">
              {errors.map((err, i) => (
                <p key={i} className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {err}
                </p>
              ))}
            </div>
          )}

          {parsed.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Vista previa ({parsed.length} obligaciones):</p>
              <div className="max-h-48 overflow-y-auto border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="p-2 text-left">Categoría</th>
                      <th className="p-2 text-left">Nombre</th>
                      <th className="p-2 text-left">Vencimiento</th>
                      <th className="p-2 text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2"><Badge variant="outline" className="text-xs">{row.categoria}</Badge></td>
                        <td className="p-2">{row.nombre}</td>
                        <td className="p-2">{row.fecha_vencimiento || '-'}</td>
                        <td className="p-2">{row.estado}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleImport} disabled={loading || parsed.length === 0}>
            {loading ? 'Importando...' : `Importar ${parsed.length} Obligaciones`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
