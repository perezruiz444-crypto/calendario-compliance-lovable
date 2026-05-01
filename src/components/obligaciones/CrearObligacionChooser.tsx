import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BookOpen, Pencil } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDesdeCatalogo: () => void;
  onPersonalizada: () => void;
}

export function CrearObligacionChooser({ open, onOpenChange, onDesdeCatalogo, onPersonalizada }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading">¿Qué tipo de obligación?</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-2">
          <button
            type="button"
            className="flex items-start gap-3 rounded-lg border-2 border-primary/30 bg-primary/5 p-4 text-left hover:border-primary/60 hover:bg-primary/10 transition-colors"
            onClick={() => { onOpenChange(false); onDesdeCatalogo(); }}
          >
            <BookOpen className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Desde el catálogo</p>
              <p className="text-xs text-muted-foreground mt-0.5">Recurrencia automática · 50+ obligaciones precargadas</p>
            </div>
          </button>
          <button
            type="button"
            className="flex items-start gap-3 rounded-lg border border-border p-4 text-left hover:bg-muted/50 transition-colors"
            onClick={() => { onOpenChange(false); onPersonalizada(); }}
          >
            <Pencil className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Personalizada</p>
              <p className="text-xs text-muted-foreground mt-0.5">Solo para casos no contemplados en el catálogo. Sin recurrencia automática.</p>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
