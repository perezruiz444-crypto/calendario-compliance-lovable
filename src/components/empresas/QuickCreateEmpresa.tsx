import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Plus } from 'lucide-react';

interface QuickCreateEmpresaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEmpresaCreated: (empresaId?: string) => void;
}

export default function QuickCreateEmpresa({ open, onOpenChange, onEmpresaCreated }: QuickCreateEmpresaProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [createAnother, setCreateAnother] = useState(false);
  const [formData, setFormData] = useState({
    razon_social: '',
    rfc: '',
    domicilio_fiscal: '',
  });

  const resetForm = () => setFormData({ razon_social: '', rfc: '', domicilio_fiscal: '' });

  const isValid = formData.razon_social.trim().length >= 3 && formData.rfc.trim().length >= 12 && formData.domicilio_fiscal.trim().length >= 5;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('empresas')
        .insert({
          razon_social: formData.razon_social.trim(),
          rfc: formData.rfc.trim().toUpperCase(),
          domicilio_fiscal: formData.domicilio_fiscal.trim(),
          created_by: user?.id,
        })
        .select('id')
        .single();

      if (error) throw error;

      toast.success(`Empresa "${formData.razon_social.trim()}" creada`);
      
      if (createAnother) {
        resetForm();
        onEmpresaCreated();
      } else {
        resetForm();
        onOpenChange(false);
        onEmpresaCreated(data.id);
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al crear empresa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Nueva Empresa</DialogTitle>
          <DialogDescription className="font-body">
            Crea rápido y completa los detalles después
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="razon_social" className="font-heading">Razón Social *</Label>
            <Input
              id="razon_social"
              value={formData.razon_social}
              onChange={(e) => setFormData(p => ({ ...p, razon_social: e.target.value }))}
              placeholder="Empresa S.A. de C.V."
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rfc" className="font-heading">RFC *</Label>
            <Input
              id="rfc"
              value={formData.rfc}
              onChange={(e) => setFormData(p => ({ ...p, rfc: e.target.value.toUpperCase() }))}
              placeholder="XAXX010101000"
              maxLength={13}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="domicilio" className="font-heading">Domicilio Fiscal *</Label>
            <Input
              id="domicilio"
              value={formData.domicilio_fiscal}
              onChange={(e) => setFormData(p => ({ ...p, domicilio_fiscal: e.target.value }))}
              placeholder="Calle, Número, Colonia, Ciudad, Estado, CP"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="create-another" checked={createAnother} onCheckedChange={(v) => setCreateAnother(!!v)} />
            <Label htmlFor="create-another" className="text-sm font-body cursor-pointer">Crear otra después</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="font-heading">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !isValid} className="gradient-primary shadow-elegant font-heading">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Crear
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
