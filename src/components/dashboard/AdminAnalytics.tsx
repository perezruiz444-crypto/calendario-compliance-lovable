import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, FileText } from 'lucide-react';
import { AnalyticsData } from '@/hooks/useAnalytics';
import { Badge } from '@/components/ui/badge';

interface AdminAnalyticsProps {
  data: AnalyticsData;
}

export default function AdminAnalytics({ data }: AdminAnalyticsProps) {
  return (
    <div className="space-y-6">
      {/* Gráficos principales */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Performance Últimos 6 Meses
            </CardTitle>
            <CardDescription>Tareas completadas vs pendientes</CardDescription>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <ResponsiveContainer width="100%" height={250}>
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
      </div>

    </div>
  );
}
