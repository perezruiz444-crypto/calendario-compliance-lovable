import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckSquare, FileText, AlertTriangle, Clock, Shield } from 'lucide-react';
import { AnalyticsData } from '@/hooks/useAnalytics';
import { Badge } from '@/components/ui/badge';

interface ClienteAnalyticsProps {
  data: AnalyticsData;
}

export default function ClienteAnalytics({ data }: ClienteAnalyticsProps) {
  const cumplimiento = data.totalTareas > 0 
    ? Math.round((data.tareasCompletadas / data.totalTareas) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Resumen rápido */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="gradient-card shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tareas Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.tareasPendientes}</div>
            <p className="text-xs text-muted-foreground">En progreso o pendientes</p>
          </CardContent>
        </Card>

        <Card className="gradient-card shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completadas</CardTitle>
            <CheckSquare className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{data.tareasCompletadas}</div>
            <p className="text-xs text-muted-foreground">De {data.totalTareas} totales</p>
          </CardContent>
        </Card>

        <Card className="gradient-card shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Docs. por Vencer</CardTitle>
            <FileText className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{data.documentosPorVencer}</div>
            <p className="text-xs text-muted-foreground">Próximos 30 días</p>
          </CardContent>
        </Card>

        <Card className="gradient-card shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solicitudes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.solicitudesPendientes}</div>
            <p className="text-xs text-muted-foreground">Pendientes de respuesta</p>
          </CardContent>
        </Card>
      </div>

      {/* Progreso de cumplimiento */}
      <Card className="gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5" />
            Progreso de Cumplimiento
          </CardTitle>
          <CardDescription>Estado actual de todas las tareas de mi empresa</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Cumplimiento General</span>
              <span className="text-2xl font-bold text-primary">{cumplimiento}%</span>
            </div>
            <Progress value={cumplimiento} className="h-3" />
          </div>
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Completadas</p>
              <p className="text-lg font-bold text-success">{data.tareasCompletadas}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Pendientes</p>
              <p className="text-lg font-bold text-warning">{data.tareasPendientes}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Vencidas</p>
              <p className="text-lg font-bold text-destructive">{data.tareasVencidas}</p>
            </div>
          </div>
        </CardContent>
      </Card>

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
            <div className="space-y-3">
              {data.proximosVencimientos.map((venc, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-warning/5">
                  <div className="flex-1">
                    <p className="font-medium">{venc.tipo}</p>
                    <p className="text-sm text-muted-foreground">
                      Vence: {new Date(venc.fecha).toLocaleDateString('es', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })}
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
            <div className="space-y-3">
              {data.documentosVencimiento.map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:border-primary transition-colors">
                  <div className="flex-1">
                    <p className="font-medium">{doc.nombre}</p>
                    <p className="text-sm text-muted-foreground">{doc.empresa}</p>
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
