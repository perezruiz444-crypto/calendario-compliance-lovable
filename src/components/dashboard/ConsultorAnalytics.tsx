import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { TrendingUp, CheckSquare, FileText } from 'lucide-react';
import { AnalyticsData } from '@/hooks/useAnalytics';
import { Badge } from '@/components/ui/badge';

interface ConsultorAnalyticsProps {
  data: AnalyticsData;
}

const COLORS = ['hsl(var(--warning))', 'hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--muted))'];

export default function ConsultorAnalytics({ data }: ConsultorAnalyticsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Mi Performance - Últimos 6 Meses
            </CardTitle>
            <CardDescription>Tareas completadas por mes</CardDescription>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.performanceMensual || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="completadas" stroke="hsl(var(--success))" name="Completadas" strokeWidth={2} dot={{ fill: 'hsl(var(--success))', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5" />
              Distribución por Estado
            </CardTitle>
            <CardDescription>Estado actual de mis tareas</CardDescription>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={data.tareasPorEstado || []} cx="50%" cy="50%" labelLine={false} label={({ estado, cantidad }) => `${estado}: ${cantidad}`} outerRadius={80} fill="#8884d8" dataKey="cantidad">
                  {(data.tareasPorEstado || []).map((_, index) => (
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
