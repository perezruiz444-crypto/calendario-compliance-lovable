import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react';
import { CATEGORIA_COLORS, PROGRAMA_LABELS } from '@/lib/obligaciones';
import { ActivarObligacionDialog } from './ActivarObligacionDialog';

interface CatalogoItem {
  id: string;
  programa: string;
  categoria: string | null;
  nombre: string;
  articulos: string | null;
  descripcion: string | null;
  presentacion: string | null;
  obligatorio: boolean;
}

interface Props {
  empresaId: string;
  canEdit: boolean;
  onActivated?: () => void;
}

const FALLBACK_COLOR = 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
const ORDEN_PROGRAMAS = Object.keys(PROGRAMA_LABELS);

export function CatalogoActivacionSection({ empresaId, canEdit, onActivated }: Props) {
  const [catalogo, setCatalogo]           = useState<CatalogoItem[]>([]);
  const [activadasIds, setActivadasIds]   = useState<Set<string>>(new Set());
  const [activadasNombres, setActivadasNombres] = useState<Set<string>>(new Set());
  const [loading, setLoading]             = useState(true);
  const [collapsed, setCollapsed]         = useState<Set<string>>(new Set());
  const [sectionOpen, setSectionOpen]     = useState(true);
  const [activarItem, setActivarItem]     = useState<CatalogoItem | null>(null);
  const [dialogOpen, setDialogOpen]       = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: cat }, { data: oblig }] = await Promise.all([
      (supabase as any)
        .from('obligaciones_catalogo')
        .select('id, programa, categoria, nombre, articulos, descripcion, presentacion, obligatorio')
        .eq('activo', true)
        .order('orden')
        .order('nombre'),
      (supabase as any)
        .from('obligaciones')
        .select('catalogo_id, nombre')
        .eq('empresa_id', empresaId)
        .eq('activa', true),
    ]);

    setCatalogo((cat as unknown as CatalogoItem[]) || []);

    const ids     = new Set<string>();
    const nombres = new Set<string>();
    for (const o of (oblig || []) as any[]) {
      if (o.catalogo_id) ids.add(o.catalogo_id);
      if (o.nombre)      nombres.add(o.nombre);
    }
    setActivadasIds(ids);
    setActivadasNombres(nombres);
    setLoading(false);
  }, [empresaId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const isActiva = (item: CatalogoItem) =>
    activadasIds.has(item.id) || activadasNombres.has(item.nombre);

  const togglePrograma = (prog: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(prog)) next.delete(prog); else next.add(prog);
      return next;
    });
  };

  const handleActivar = (item: CatalogoItem) => {
    setActivarItem(item);
    setDialogOpen(true);
  };

  // Agrupación dinámica ordenada
  const grouped = catalogo.reduce((acc, item) => {
    const prog = item.programa || 'otro';
    if (!acc[prog]) acc[prog] = [];
    acc[prog].push(item);
    return acc;
  }, {} as Record<string, CatalogoItem[]>);

  const sortedGroups = Object.entries(grouped).sort(([a], [b]) => {
    const ia = ORDEN_PROGRAMAS.indexOf(a);
    const ib = ORDEN_PROGRAMAS.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  const totalActivas  = catalogo.filter(i => isActiva(i)).length;
  const totalCatalogo = catalogo.length;

  return (
    <>
      <Card className="gradient-card shadow-card">
        <CardHeader className="pb-3">
          <div
            className="flex items-center justify-between cursor-pointer select-none"
            onClick={() => setSectionOpen(v => !v)}
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <CardTitle className="font-heading text-base">Catálogo de Obligaciones</CardTitle>
              {!loading && (
                <Badge variant="secondary" className="text-xs">
                  {totalActivas} / {totalCatalogo} activas
                </Badge>
              )}
            </div>
            {sectionOpen
              ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
              : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </div>
        </CardHeader>

        {sectionOpen && (
          <CardContent className="pt-0 space-y-3">
            {loading ? (
              <div className="animate-pulse space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-8 bg-muted rounded" />)}
              </div>
            ) : sortedGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                El catálogo está vacío. Un administrador debe agregar obligaciones.
              </p>
            ) : (
              sortedGroups.map(([prog, items]) => {
                const activasEnProg = items.filter(i => isActiva(i)).length;
                const isCollapsed   = collapsed.has(prog);
                const progColor     = CATEGORIA_COLORS[prog] ?? FALLBACK_COLOR;
                const progLabel     = PROGRAMA_LABELS[prog] ?? prog;

                return (
                  <div key={prog} className="border border-border rounded-lg overflow-hidden">
                    {/* Cabecera del programa */}
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-3 py-2 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
                      onClick={() => togglePrograma(prog)}
                    >
                      <div className="flex items-center gap-2">
                        <Badge className={`text-xs ${progColor}`}>{progLabel}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {activasEnProg} de {items.length} activas
                        </span>
                      </div>
                      {isCollapsed
                        ? <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                        : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                    </button>

                    {/* Items del programa */}
                    {!isCollapsed && (
                      <table className="w-full text-sm">
                        <tbody>
                          {items.map(item => {
                            const activa = isActiva(item);
                            return (
                              <tr
                                key={item.id}
                                className={`border-t border-border/50 ${activa ? 'bg-success/5' : 'hover:bg-muted/20'}`}
                              >
                                <td className="px-3 py-2 w-6">
                                  {activa
                                    ? <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                                    : <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />}
                                </td>
                                <td className="px-2 py-2">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`font-medium text-sm ${activa ? 'text-muted-foreground' : ''}`}>
                                      {item.nombre}
                                    </span>
                                    {item.obligatorio && (
                                      <Badge className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-0 px-1.5 py-0">
                                        Obligatoria
                                      </Badge>
                                    )}
                                  </div>
                                  {item.articulos && (
                                    <p className="text-[11px] text-muted-foreground mt-0.5">{item.articulos}</p>
                                  )}
                                </td>
                                <td className="px-2 py-2 hidden md:table-cell whitespace-nowrap">
                                  {item.presentacion && (
                                    <Badge variant="outline" className="text-[10px]">{item.presentacion}</Badge>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right whitespace-nowrap">
                                  {activa ? (
                                    <Badge className="text-[10px] bg-success/10 text-success border-success/20">
                                      Activa
                                    </Badge>
                                  ) : canEdit ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs px-2.5"
                                      onClick={() => handleActivar(item)}
                                    >
                                      Activar
                                    </Button>
                                  ) : null}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        )}
      </Card>

      <ActivarObligacionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={activarItem}
        empresaId={empresaId}
        onActivated={() => { fetchData(); onActivated?.(); }}
      />
    </>
  );
}
