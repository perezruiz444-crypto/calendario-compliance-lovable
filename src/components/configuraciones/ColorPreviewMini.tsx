import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Monitor } from 'lucide-react';

export default function ColorPreviewMini() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Monitor className="h-4 w-4 text-primary" />
          Vista previa en vivo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border overflow-hidden bg-background shadow-inner">
          {/* Mini app preview */}
          <div className="flex h-[180px]">
            {/* Mini sidebar */}
            <div className="w-12 shrink-0 flex flex-col items-center gap-2 py-3" style={{ backgroundColor: 'hsl(var(--sidebar-background))' }}>
              <div className="w-6 h-6 rounded" style={{ backgroundColor: 'hsl(var(--sidebar-primary))' }} />
              <div className="w-5 h-1 rounded-full" style={{ backgroundColor: 'hsl(var(--sidebar-foreground))', opacity: 0.5 }} />
              <div className="w-5 h-1 rounded-full" style={{ backgroundColor: 'hsl(var(--sidebar-foreground))', opacity: 0.3 }} />
              <div className="w-5 h-1 rounded-full mt-auto" style={{ backgroundColor: 'hsl(var(--sidebar-accent))' }} />
            </div>
            {/* Mini content */}
            <div className="flex-1 p-3 space-y-2" style={{ backgroundColor: 'hsl(var(--background))' }}>
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="h-2.5 w-20 rounded-full" style={{ backgroundColor: 'hsl(var(--foreground))' }} />
                <div className="flex gap-1">
                  <Badge className="text-[8px] h-4 px-1.5" style={{ backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground, 0 0% 100%))' }}>
                    Activo
                  </Badge>
                </div>
              </div>
              {/* Cards row */}
              <div className="grid grid-cols-2 gap-1.5">
                <div className="rounded border p-2 space-y-1" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
                  <div className="h-1.5 w-10 rounded-full" style={{ backgroundColor: 'hsl(var(--foreground))', opacity: 0.7 }} />
                  <div className="h-1 w-14 rounded-full" style={{ backgroundColor: 'hsl(var(--muted-foreground))', opacity: 0.4 }} />
                  <div className="h-4 w-full rounded" style={{ backgroundColor: 'hsl(var(--primary))', opacity: 0.15 }} />
                </div>
                <div className="rounded border p-2 space-y-1" style={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
                  <div className="h-1.5 w-8 rounded-full" style={{ backgroundColor: 'hsl(var(--foreground))', opacity: 0.7 }} />
                  <div className="h-1 w-12 rounded-full" style={{ backgroundColor: 'hsl(var(--muted-foreground))', opacity: 0.4 }} />
                  <div className="flex gap-1 mt-1">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: 'hsl(var(--success))' }} />
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: 'hsl(var(--warning))' }} />
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: 'hsl(var(--destructive))' }} />
                  </div>
                </div>
              </div>
              {/* Button preview */}
              <div className="flex gap-1.5 mt-1">
                <div className="h-5 px-2 rounded text-[7px] font-medium flex items-center" style={{ backgroundColor: 'hsl(var(--primary))', color: 'white' }}>
                  Primario
                </div>
                <div className="h-5 px-2 rounded text-[7px] font-medium flex items-center border" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
                  Secundario
                </div>
                <div className="h-5 px-2 rounded text-[7px] font-medium flex items-center" style={{ backgroundColor: 'hsl(var(--accent))', color: 'white' }}>
                  Acento
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground text-center mt-2">
          Los cambios se reflejan en tiempo real
        </p>
      </CardContent>
    </Card>
  );
}
