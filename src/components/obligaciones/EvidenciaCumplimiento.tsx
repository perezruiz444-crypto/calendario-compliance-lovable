import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Upload } from 'lucide-react';
import { getErrorMessage } from '@/lib/errors';
import { obligationOverviewClient } from '@/hooks/useObligationOverview';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaId: string;
  obligacionId: string;
  /** Fase 2: ocurrencia a la que pertenece este cumplimiento (recurrentes). NULL para manuales/eventuales. */
  ocurrenciaId?: string | null;
  eventoId?: string | null;
  periodoKey: string;
  userId: string;
  onCompleted: () => void;
}

export function EvidenciaCumplimiento({ open, onOpenChange, empresaId, obligacionId, ocurrenciaId = null, eventoId = null, periodoKey, onCompleted }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const busy = useRef(false);
  const uploaded = useRef<{ file: File; path: string } | null>(null);

  const handleSubmit = async (withEvidence: boolean) => {
    if (busy.current) return;
    if (withEvidence && file) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Solo se permiten archivos PDF, JPG, PNG o WEBP');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('El archivo no puede pesar más de 10MB');
        return;
      }
    }
    busy.current = true;
    setUploading(true);
    // Guardamos el PATH del objeto en storage, no una URL. La URL firmada se
    // genera bajo demanda al descargar (ver CumplimientoHistorial). El primer
    // segmento DEBE ser empresa_id para que la RLS por empresa aísle el acceso.
    let evidenciaPath: string | null = null;

    try {
      if (withEvidence && file) {
        const ext = file.name.split('.').pop();
        const path = uploaded.current?.file === file ? uploaded.current.path : `${empresaId}/${obligacionId}/${periodoKey}/${crypto.randomUUID()}.${ext}`;
        if (uploaded.current?.file !== file) {
          const { error: uploadError } = await supabase.storage.from('evidencias-cumplimiento').upload(path, file);
          if (uploadError) throw uploadError;
          uploaded.current = { file, path };
        }
        evidenciaPath = path;
      }

      const { data, error } = await obligationOverviewClient.rpc('registrar_cumplimiento_obligacion', {
        p_obligacion_id: obligacionId,
        p_periodo_key: periodoKey,
        ...(ocurrenciaId ? { p_ocurrencia_id: ocurrenciaId } : {}),
        ...(eventoId ? { p_evento_id: eventoId } : {}),
        ...(evidenciaPath ? { p_evidencia_path: evidenciaPath } : {}),
      });
      if (error) throw error;
      if (!data) throw new Error('El servidor no confirmó el cumplimiento');

      toast.success('Cumplimiento registrado');
      onCompleted();
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err) || 'Error al registrar cumplimiento');
    } finally {
      busy.current = false;
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={value => { if (!busy.current) onOpenChange(value); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Registrar Cumplimiento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            ¿Deseas adjuntar evidencia (PDF, imagen) a este cumplimiento?
          </p>
          <div className="space-y-2">
            <Label htmlFor="evidencia">Archivo de evidencia (opcional)</Label>
            <Input
              id="evidencia"
              type="file"
              disabled={uploading}
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
        </div>
        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleSubmit(false)} disabled={uploading}>
            Sin evidencia
          </Button>
          <Button onClick={() => handleSubmit(true)} disabled={uploading || !file}>
            {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
            Guardar con evidencia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
