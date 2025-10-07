import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';

interface Sector {
  numero_sector: string;
  descripcion_sector: string;
}

interface EmpresaFormPadronImportadoresProps {
  formData: any;
  setFormData: (data: any) => void;
}

export default function EmpresaFormPadronImportadores({ formData, setFormData }: EmpresaFormPadronImportadoresProps) {
  const sectores: Sector[] = Array.isArray(formData.padron_importadores_sectores) 
    ? formData.padron_importadores_sectores 
    : [];

  const addSector = () => {
    const updatedSectores = [
      ...sectores,
      { numero_sector: '', descripcion_sector: '' }
    ];
    setFormData({ ...formData, padron_importadores_sectores: updatedSectores });
  };

  const removeSector = (index: number) => {
    const updatedSectores = sectores.filter((_, i) => i !== index);
    setFormData({ ...formData, padron_importadores_sectores: updatedSectores });
  };

  const updateSector = (index: number, field: keyof Sector, value: string) => {
    const updatedSectores = [...sectores];
    updatedSectores[index] = { ...updatedSectores[index], [field]: value };
    setFormData({ ...formData, padron_importadores_sectores: updatedSectores });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-heading font-semibold">Padrón de Importadores Activos</h3>
        <Button type="button" onClick={addSector} size="sm" variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Agregar Sector
        </Button>
      </div>

      <div className="space-y-4">
        {sectores.map((sector, index) => (
          <Card key={index}>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-heading">Número de Sector</Label>
                  <Input
                    value={sector.numero_sector}
                    onChange={(e) => updateSector(index, 'numero_sector', e.target.value)}
                    placeholder="Ej: Sector 2"
                    className="font-body"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-heading">Descripción del Sector</Label>
                  <Input
                    value={sector.descripcion_sector}
                    onChange={(e) => updateSector(index, 'descripcion_sector', e.target.value)}
                    placeholder="Ej: Radioactivo y Nuclear"
                    className="font-body"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => removeSector(index)}
                  variant="destructive"
                  size="sm"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {sectores.length === 0 && (
        <p className="text-center text-muted-foreground font-body py-8">
          No hay sectores registrados
        </p>
      )}
    </div>
  );
}