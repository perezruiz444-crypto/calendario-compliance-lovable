import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Building2, CheckSquare, TrendingUp, FileText, AlertTriangle, Target } from 'lucide-react';
import { AnalyticsData } from '@/hooks/useAnalytics';
import { Badge } from '@/components/ui/badge';

interface ConsultorAnalyticsProps {
  data: AnalyticsData;
}

const COLORS = ['hsl(var(--warning))', 'hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--muted))'];

export default function ConsultorAnalytics({ data }: ConsultorAnalyticsProps) {
  return (
    <div className="space-y-6">
      {/* Resumen rápido */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="gradient-card shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mis Empresas</CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.misEmpresas}</div>
            <p className="text-xs text-muted-foreground">Empresas asignadas</p>
          </CardContent>
        </Card>

        <Card className="gradient-card shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tareas Asignadas</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.tareasAsignadas}</div>
            <p className="text-xs text-muted-foreground">Directamente a mí</p>
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
            <CardTitle className="text-sm font-medium">Completadas</CardTitle>
            <CheckSquare className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{data.tareasCompletadas}</div>
            <p className="text-xs text-muted-foreground">De {data.totalTareas} totales</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance mensual */}
        <Card className="gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Mi Performance - Últimos 6 Meses
            </CardTitle>
            <CardDescription>Tareas completadas por mes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.performanceMensual || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="completadas" 
                  stroke="hsl(var(--success))" 
                  name="Completadas" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--success))', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tareas por estado */}
        <Card className="gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5" />
              Distribución por Estado
            </CardTitle>
            <CardDescription>Estado actual de mis tareas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.tareasPorEstado || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ estado, cantidad }) => `${estado}: ${cantidad}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="cantidad"
                >
                  {(data.tareasPorEstado || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
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
              Documentos Críticos de Mis Empresas
            </CardTitle>
            <CardDescription>Documentos próximos a vencer (90 días)</CardDescription>
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
