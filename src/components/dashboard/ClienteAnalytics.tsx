import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckSquare, FileText, Shield, Clock, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { AnalyticsData } from '@/hooks/useAnalytics';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface ClienteAnalyticsProps {
  data: AnalyticsData;
}

const DONUT_COLORS = {
  Completadas: 'hsl(var(--success))',
  Pendientes: 'hsl(var(--warning))',
  Vencidas: 'hsl(var(--destructive))',
};

export default function ClienteAnalytics({ data }: ClienteAnalyticsProps) {
  const cumplimiento = data.totalTareas > 0 
    ? Math.round((data.tareasCompletadas / data.totalTareas) * 100) 
    : 0;

  const donutData = [
    { name: 'Completadas', value: data.tareasCompletadas },
    { name: 'Pendientes', value: data.tareasPendientes },
    { name: 'Vencidas', value: data.tareasVencidas },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-2 border-warning/30">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="bg-warning/10 p-3 rounded-xl">
                <Clock className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Pendientes</p>
                <p className="text-3xl font-heading font-bold text-warning">{data.tareasPendientes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-success/30">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="bg-success/10 p-3 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Completadas</p>
                <p className="text-3xl font-heading font-bold text-success">{data.tareasCompletadas}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-2 ${data.tareasVencidas > 0 ? 'border-destructive/40 bg-destructive/5' : 'border-muted'}`}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className={`${data.tareasVencidas > 0 ? 'bg-destructive/10' : 'bg-muted'} p-3 rounded-xl`}>
                <AlertTriangle className={`w-6 h-6 ${data.tareasVencidas > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Vencidas</p>
                <p className={`text-3xl font-heading font-bold ${data.tareasVencidas > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>{data.tareasVencidas}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Donut + Progress */}
      <Card className="gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5" />
            Progreso de Cumplimiento
          </CardTitle>
          <CardDescription>Estado actual de tareas y obligaciones</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
            {/* Donut */}
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  strokeWidth={2}
                  stroke="hsl(var(--background))"
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={DONUT_COLORS[entry.name as keyof typeof DONUT_COLORS]} />
                  ))}
                </Pie>
                <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-2xl font-bold">{cumplimiento}%</text>
                <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-xs">Cumplimiento</text>
              </PieChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="space-y-3">
              {[
                { label: 'Completadas', value: data.tareasCompletadas, color: 'bg-success', textColor: 'text-success' },
                { label: 'Pendientes', value: data.tareasPendientes, color: 'bg-warning', textColor: 'text-warning' },
                { label: 'Vencidas', value: data.tareasVencidas, color: 'bg-destructive', textColor: 'text-destructive' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <span className={`font-heading font-bold ${item.textColor}`}>{item.value}</span>
                </div>
              ))}
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="font-heading font-bold">{data.totalTareas}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Obligaciones pendientes from proximasTareas */}
      {data.proximasTareas && data.proximasTareas.length > 0 && (
        <Card className="gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5" />
              Próximas Tareas y Obligaciones
            </CardTitle>
            <CardDescription>Elementos pendientes por atender</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.proximasTareas.map((tarea, index) => {
                const dias = tarea.fecha_vencimiento ? Math.ceil((new Date(tarea.fecha_vencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
                const isObligacion = tarea.titulo.startsWith('[Obligación]');
                return (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:border-primary/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {isObligacion && <Shield className="w-3.5 h-3.5 text-warning shrink-0" />}
                        <p className="font-medium text-sm truncate">{isObligacion ? tarea.titulo.replace('[Obligación] ', '') : tarea.titulo}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{tarea.empresa_nombre}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {tarea.prioridad === 'alta' && <Badge variant="destructive" className="text-[10px] px-1.5">Alta</Badge>}
                      {dias !== null && (
                        <Badge variant={dias <= 3 ? 'destructive' : dias <= 7 ? 'secondary' : 'default'} className="text-[10px] px-1.5">
                          {dias <= 0 ? 'Hoy' : `${dias}d`}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {data.proximasTareas.length === 0 && data.tareasPendientes === 0 && (
        <Card className="gradient-card shadow-card border-success/20">
          <CardContent className="py-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
            <p className="font-heading font-semibold text-lg">¡Todo al día!</p>
            <p className="text-sm text-muted-foreground">No tienes tareas ni obligaciones pendientes</p>
          </CardContent>
        </Card>
      )}

      {/* Próximos vencimientos de programas */}
      {data.proximosVencimientos && data.proximosVencimientos.length > 0 && (
        <Card className="gradient-card shadow-card border-warning/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-warning" />
              Programas y Certificaciones por Renovar
            </CardTitle>
            <CardDescription>Vencimientos en los próximos 90 días</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.proximosVencimientos.map((venc, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-warning/5">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{venc.tipo}</p>
                    <p className="text-xs text-muted-foreground">
                      Vence: {new Date(venc.fecha).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <Badge variant={venc.dias <= 7 ? 'destructive' : venc.dias <= 30 ? 'secondary' : 'default'}>
                    {venc.dias <= 0 ? 'Vencido' : `${venc.dias} días`}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documentos próximos a vencer */}
      {data.documentosVencimiento && data.documentosVencimiento.length > 0 && (
        <Card className="gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Documentos Próximos a Vencer
            </CardTitle>
            <CardDescription>Documentos que vencen en los próximos 90 días</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.documentosVencimiento.map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:border-primary transition-colors">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{doc.nombre}</p>
                    <p className="text-xs text-muted-foreground">{doc.empresa}</p>
                  </div>
                  <Badge variant={doc.dias <= 7 ? 'destructive' : doc.dias <= 30 ? 'secondary' : 'default'}>
                    {doc.dias <= 0 ? 'Vencido' : `${doc.dias} días`}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
