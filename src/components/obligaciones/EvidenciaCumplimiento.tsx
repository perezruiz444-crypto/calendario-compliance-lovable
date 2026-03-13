import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Upload } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  obligacionId: string;
  periodoKey: string;
  userId: string;
  onCompleted: () => void;
}

export function EvidenciaCumplimiento({ open, onOpenChange, obligacionId, periodoKey, userId, onCompleted }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (withEvidence: boolean) => {
    setUploading(true);
    let evidenciaUrl: string | null = null;

    try {
      if (withEvidence && file) {
        const ext = file.name.split('.').pop();
        const path = `${obligacionId}/${periodoKey}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('evidencias-cumplimiento')
          .upload(path, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from('evidencias-cumplimiento')
          .getPublicUrl(path);
        evidenciaUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from('obligacion_cumplimientos').insert({
        obligacion_id: obligacionId,
        periodo_key: periodoKey,
        completada_por: userId,
        evidencia_url: evidenciaUrl,
      });
      if (error) throw error;

      toast.success('Cumplimiento registrado');
      onCompleted();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Error al registrar cumplimiento');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
