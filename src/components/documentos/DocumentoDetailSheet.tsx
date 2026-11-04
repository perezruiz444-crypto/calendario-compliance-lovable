import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { formatDateShort } from '@/lib/obligaciones';
import type { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type DocumentDetail = Pick<Database['public']['Tables']['documentos']['Row'], 'nombre' | 'descripcion' | 'fecha_vencimiento' | 'archivo_nombre' | 'archivo_url'>;

/** Vista de consulta: conserva el calendario y usa la sesión para leer/abrir el archivo. */
export default function DocumentoDetailSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [opening, setOpening] = useState(false);
  useEffect(() => {
    let current = true;
    setDocument(null); setFailed(false);
    void supabase.from('documentos').select('nombre, descripcion, fecha_vencimiento, archivo_nombre, archivo_url').eq('id', id).single()
      .then(({ data, error }) => { if (current) { setDocument(data); setFailed(!!error); } });
    return () => { current = false; };
  }, [id]);
  const openFile = async () => {
    if (!document || opening) return;
    setOpening(true);
    try {
      const { data, error } = await supabase.storage.from('documentos').createSignedUrl(document.archivo_url, 60);
      if (error || !data?.signedUrl) throw error;
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch { toast.error('No pudimos abrir el documento. Intenta de nuevo.'); }
    finally { setOpening(false); }
  };
  return <Sheet open onOpenChange={open => { if (!open) onClose(); }}><SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
    <SheetHeader><SheetTitle>{document?.nombre ?? 'Documento'}</SheetTitle><SheetDescription>Detalle del documento seleccionado.</SheetDescription></SheetHeader>
    {failed ? <p role="alert" className="text-sm text-destructive mt-6">No pudimos cargar el documento.</p> : !document ? <p role="status" className="text-sm mt-6">Cargando…</p> : <div className="space-y-5 mt-6 text-sm">
      <p>Vencimiento: <strong>{formatDateShort(document.fecha_vencimiento)}</strong></p>
      {document.descripcion && <p className="text-muted-foreground">{document.descripcion}</p>}
      <p className="text-muted-foreground break-words">{document.archivo_nombre}</p>
      <Button variant="outline" onClick={() => void openFile()} disabled={opening}>{opening ? 'Abriendo…' : 'Abrir documento'}</Button>
    </div>}
  </SheetContent></Sheet>;
}
