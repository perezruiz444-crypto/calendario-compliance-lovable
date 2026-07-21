import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, XCircle, Paperclip } from 'lucide-react';
import { getPeriodLabel } from '@/lib/obligaciones';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  obligacionId: string;
  obligacionNombre: string;
  presentacion: string | null;
}

interface Cumplimiento {
  periodo_key: string;
  completada: boolean;
  completada_en: string;
  evidencia_url: string | null;
}

export function CumplimientoHistorial({ open, onOpenChange, obligacionId, obligacionNombre, presentacion }: Props) {
  const [data, setData] = useState<Cumplimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [descargando, setDescargando] = useState<string | null>(null);

  // La evidencia vive en un bucket privado. Generamos una URL firmada de corta
  // duración solo al descargar; nunca persistimos URLs (expirarían y dejarían
  // enlaces muertos). El path guardado ya empieza con empresa_id, por lo que la
  // RLS por empresa autoriza (o rechaza) esta firma según el usuario.
  const descargarEvidencia = async (path: string, periodoKey: string) => {
    setDescargando(periodoKey);
    try {
      const { data: signed, error } = await supabase.storage
        .from('evidencias-cumplimiento')
        .createSignedUrl(path, 60);
      if (error || !signed?.signedUrl) throw error || new Error('No se pudo generar el enlace');
      window.open(signed.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      toast.error('No se pudo abrir la evidencia');
    } finally {
      setDescargando(null);
    }
  };

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from('obligacion_cumplimientos')
      .select('periodo_key, completada, completada_en, evidencia_url')
      .eq('obligacion_id', obligacionId)
      .order('periodo_key', { ascending: false })
      .limit(12)
      .then(({ data: rows }) => {
        setData((rows as Cumplimiento[]) || []);
        setLoading(false);
      });
  }, [open, obligacionId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-base">Historial: {obligacionNombre}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : data.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-6">Sin historial de cumplimiento</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {data.map(c => (
              <div
                key={c.periodo_key}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-center ${
                  c.completada
                    ? 'bg-success/10 border-success/30'
                    : 'bg-muted/50 border-border'
                }`}
              >
                {c.completada ? (
                  <CheckCircle2 className="w-5 h-5 text-success" />
                ) : (
                  <XCircle className="w-5 h-5 text-muted-foreground" />
                )}
                <span className="text-xs font-medium truncate w-full">
                  {getPeriodLabel(presentacion, c.periodo_key)}
                </span>
                {c.evidencia_url && (
                  <button
                    type="button"
                    onClick={() => descargarEvidencia(c.evidencia_url!, c.periodo_key)}
                    disabled={descargando === c.periodo_key}
                    className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-border hover:bg-accent transition-colors disabled:opacity-50"
                    title="Ver evidencia"
                  >
                    {descargando === c.periodo_key
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Paperclip className="w-3 h-3" />}
                    Evidencia
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
