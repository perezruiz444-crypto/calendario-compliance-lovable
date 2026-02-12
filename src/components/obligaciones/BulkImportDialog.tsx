import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Download, Upload, BookmarkPlus, FileUp } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

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

export function BulkImportDialog({ open, onOpenChange, onImport, loading }: Props) {
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [saveToCatalog, setSaveToCatalog] = useState(true);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const data = [
      ['Programa', 'Nombre de la Obligación', 'Artículo(s)', 'Descripción', 'Presentación'],
      ['IMMEX', 'Informe de operaciones', 'Art. 24 IMMEX', 'Reporte semestral de operaciones', 'Semestral'],
      ['Certificación IVA/IEPS', 'Renovación certificación', 'Regla 7.1.1 RGCE', 'Renovación anual de certificación', 'Anual'],
      ['PROSEC', 'Aviso de producción', 'Art. 5 PROSEC', 'Notificación de inicio de producción', 'Única vez'],
      ['General', 'Declaración informativa', 'Art. 32 CFF', 'Declaración informativa de operaciones', 'Mensual'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    // Set column widths
    ws['!cols'] = [{ wch: 22 }, { wch: 35 }, { wch: 20 }, { wch: 40 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Obligaciones');
    XLSX.writeFile(wb, 'obligaciones_plantilla.xlsx');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (jsonData.length < 2) {
          setErrors(['El archivo necesita al menos 2 filas: encabezado + datos']);
          setParsed([]);
          return;
        }

        const rows: ParsedRow[] = [];
        const errs: string[] = [];

        // Skip header row (index 0)
        for (let i = 1; i < jsonData.length; i++) {
          const cols = jsonData[i];
          if (!cols || cols.every(c => !c || !String(c).trim())) continue;

          const programa = String(cols[0] || '').trim();
          const nombre = String(cols[1] || '').trim();
          const articulos = String(cols[2] || '').trim();
          const descripcion = String(cols[3] || '').trim();
          const presentacion = String(cols[4] || '').trim();

          if (!nombre) { errs.push(`Fila ${i + 1}: nombre vacío`); continue; }
          if (!programa) { errs.push(`Fila ${i + 1}: programa vacío`); continue; }

          rows.push({ programa, nombre, articulos, descripcion, presentacion });
        }

        setParsed(rows);
        setErrors(errs);
        if (rows.length > 0) toast.success(`${rows.length} obligaciones leídas del archivo`);
      } catch {
        setErrors(['Error al leer el archivo. Asegúrate de que sea un archivo Excel válido.']);
        setParsed([]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = () => {
    if (parsed.length === 0) return;
    onImport(parsed, saveToCatalog);
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      setParsed([]);
      setErrors([]);
      setFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Importar Obligaciones desde Excel
          </DialogTitle>
          <DialogDescription>
            Sube un archivo .xlsx con columnas: Programa | Nombre | Artículo(s) | Descripción | Presentación
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-1" />
              Descargar Plantilla .xlsx
            </Button>
            <span className="text-xs text-muted-foreground">Llena la plantilla en Excel y súbela aquí</span>
          </div>

          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileUpload}
            />
            <FileUp className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            {fileName ? (
              <p className="text-sm font-medium">{fileName}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Haz clic o arrastra un archivo .xlsx aquí
              </p>
            )}
          </div>

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
          <Button variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
          <Button onClick={handleImport} disabled={loading || parsed.length === 0}>
            {loading ? 'Importando...' : `Importar ${parsed.length} Obligaciones`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
