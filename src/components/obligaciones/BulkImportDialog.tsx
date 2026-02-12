import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Download, Upload, BookmarkPlus } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (rows: ParsedRow[], saveToCatalog: boolean) => void;
  loading?: boolean;
}

export interface ParsedRow {
  programa: string;
  nombre: string;
  articulos: string;
  descripcion: string;
  presentacion: string;
}

const TEMPLATE = `Programa\tNombre de la Obligación\tArtículo(s)\tDescripción\tPresentación
IMMEX\tInforme de operaciones\tArt. 24 IMMEX\tReporte semestral de operaciones\tSemestral
Certificación IVA/IEPS\tRenovación certificación\tRegla 7.1.1 RGCE\tRenovación anual de certificación\tAnual
PROSEC\tAviso de producción\tArt. 5 PROSEC\tNotificación de inicio de producción\tÚnica vez
General\tDeclaración informativa\tArt. 32 CFF\tDeclaración informativa de operaciones\tMensual`;

export function BulkImportDialog({ open, onOpenChange, onImport, loading }: Props) {
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [saveToCatalog, setSaveToCatalog] = useState(true);

  const handleParse = () => {
    const lines = rawText.trim().split('\n');
    if (lines.length < 2) {
      setErrors(['Se necesitan al menos 2 líneas: encabezado + datos']);
      setParsed([]);
      return;
    }

    // Skip header line, parse data
    const rows: ParsedRow[] = [];
    const errs: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split('\t');
      if (cols.every(c => !c.trim())) continue;

      const programa = (cols[0] || '').trim();
      const nombre = (cols[1] || '').trim();
      const articulos = (cols[2] || '').trim();
      const descripcion = (cols[3] || '').trim();
      const presentacion = (cols[4] || '').trim();

      if (!nombre) { errs.push(`Fila ${i + 1}: nombre vacío`); continue; }
      if (!programa) { errs.push(`Fila ${i + 1}: programa vacío`); continue; }

      rows.push({ programa, nombre, articulos, descripcion, presentacion });
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
    onImport(parsed, saveToCatalog);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setParsed([]); setErrors([]); setRawText(''); } onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Importar Obligaciones desde Excel
          </DialogTitle>
          <DialogDescription>
            Pega datos desde Excel/Sheets con columnas: Programa | Nombre | Artículo(s) | Descripción | Presentación
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
              placeholder={"Programa\tNombre\tArtículo(s)\tDescripción\tPresentación\nIMMEX\tInforme operaciones\tArt. 24\tReporte semestral\tSemestral"}
              rows={8}
              className="font-mono text-xs"
            />
          </div>

          <div className="flex items-center gap-4">
            <Button onClick={handleParse} variant="secondary" disabled={!rawText.trim()}>
              Validar Datos
            </Button>
            <div className="flex items-center gap-2">
              <Checkbox
                id="saveCatalog"
                checked={saveToCatalog}
                onCheckedChange={(v) => setSaveToCatalog(!!v)}
              />
              <label htmlFor="saveCatalog" className="text-sm text-muted-foreground cursor-pointer flex items-center gap-1">
                <BookmarkPlus className="w-3.5 h-3.5" />
                Guardar en catálogo reutilizable
              </label>
            </div>
          </div>

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
                      <th className="p-2 text-left">Programa</th>
                      <th className="p-2 text-left">Nombre</th>
                      <th className="p-2 text-left">Artículo(s)</th>
                      <th className="p-2 text-left">Presentación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2"><Badge variant="outline" className="text-xs">{row.programa}</Badge></td>
                        <td className="p-2">{row.nombre}</td>
                        <td className="p-2">{row.articulos || '-'}</td>
                        <td className="p-2">{row.presentacion || '-'}</td>
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
