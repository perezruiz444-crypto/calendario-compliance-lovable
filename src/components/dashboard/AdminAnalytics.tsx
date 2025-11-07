import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Building2, Users, TrendingUp, FileText, AlertTriangle } from 'lucide-react';
import { AnalyticsData } from '@/hooks/useAnalytics';
import { Badge } from '@/components/ui/badge';

interface AdminAnalyticsProps {
  data: AnalyticsData;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--warning))', 'hsl(var(--success))', 'hsl(var(--destructive))'];

export default function AdminAnalytics({ data }: AdminAnalyticsProps) {
  return (
    <div className="space-y-6">
      {/* Resumen rápido */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="gradient-card shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empresas Activas</CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalEmpresas}</div>
            <p className="text-xs text-muted-foreground">Total registradas</p>
          </CardContent>
        </Card>

        <Card className="gradient-card shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalUsuarios}</div>
            <p className="text-xs text-muted-foreground">{data.totalConsultores} consultores</p>
          </CardContent>
        </Card>

        <Card className="gradient-card shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tareas Vencidas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{data.tareasVencidas}</div>
            <p className="text-xs text-muted-foreground">Requieren atención</p>
          </CardContent>
        </Card>

        <Card className="gradient-card shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa Cumplimiento</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {data.totalTareas > 0 ? Math.round((data.tareasCompletadas / data.totalTareas) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">{data.tareasCompletadas} completadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance últimos 6 meses */}
        <Card className="gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Performance Últimos 6 Meses
            </CardTitle>
            <CardDescription>Tareas completadas vs pendientes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.tareasPerformance || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="completadas" stroke="hsl(var(--success))" name="Completadas" strokeWidth={2} />
                <Line type="monotone" dataKey="pendientes" stroke="hsl(var(--warning))" name="Pendientes" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tareas por consultor */}
        <Card className="gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Top 5 Consultores por Carga
            </CardTitle>
            <CardDescription>Distribución de tareas activas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.tareasPorConsultor || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" fill="hsl(var(--primary))" name="Total" />
                <Bar dataKey="completadas" fill="hsl(var(--success))" name="Completadas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

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
