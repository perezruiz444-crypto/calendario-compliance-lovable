import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Calendar, FileText, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { DocumentosManager } from '@/components/documentos/DocumentosManager';
import { SolicitudesServicio } from '@/components/solicitudes/SolicitudesServicio';
import DashboardCalendar from '@/components/dashboard/DashboardCalendar';

export default function MiEmpresa() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [empresa, setEmpresa] = useState<any>(null);
  const [apoderados, setApoderados] = useState<any[]>([]);
  const [domicilios, setDomicilios] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    if (!loading && role !== 'cliente') {
      navigate('/dashboard');
    }
  }, [user, role, loading, navigate]);

  useEffect(() => {
    if (user && role === 'cliente') {
      fetchEmpresaData();
    }
  }, [user, role]);

  const fetchEmpresaData = async () => {
    setLoadingData(true);
    try {
      // Get user's empresa_id from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('empresa_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.empresa_id) {
        console.error('No empresa assigned to user');
        setLoadingData(false);
        return;
      }

      // Fetch empresa data
      const [empresaRes, apoderadosRes, domiciliosRes] = await Promise.all([
        supabase.from('empresas').select('*').eq('id', profile.empresa_id).single(),
        supabase.from('apoderados_legales').select('*').eq('empresa_id', profile.empresa_id),
        supabase.from('domicilios_operacion').select('*').eq('empresa_id', profile.empresa_id)
      ]);

      setEmpresa(empresaRes.data);
      setApoderados(apoderadosRes.data || []);
      setDomicilios(domiciliosRes.data || []);
    } catch (error) {
      console.error('Error fetching empresa data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const getVencimientoAlert = (fecha: string | null) => {
    if (!fecha) return null;
    const dias = differenceInDays(parseISO(fecha), new Date());
    
    if (dias < 0) return { color: 'destructive', icon: AlertCircle, text: 'Vencido' };
    if (dias <= 30) return { color: 'warning', icon: AlertCircle, text: `${dias} días` };
    if (dias <= 90) return { color: 'default', icon: Calendar, text: `${dias} días` };
    return { color: 'success', icon: CheckCircle, text: `${dias} días` };
  };

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!empresa) {
    return (
      <DashboardLayout currentPage="/mi-empresa">
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No se encontró información de tu empresa</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="/mi-empresa">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground mb-2">
            Mi Empresa
          </h1>
          <p className="text-muted-foreground font-body">
            Información y documentación de tu empresa
          </p>
        </div>

        {/* Info General Card */}
        <Card className="gradient-card shadow-elegant">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {empresa.razon_social}
            </CardTitle>
            <CardDescription className="font-body">
              RFC: {empresa.rfc} {empresa.telefono && `• Tel: ${empresa.telefono}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-heading font-medium text-muted-foreground">Domicilio Fiscal</p>
                <p className="text-sm font-body">{empresa.domicilio_fiscal}</p>
              </div>
              {empresa.actividad_economica && (
                <div>
                  <p className="text-sm font-heading font-medium text-muted-foreground">Actividad Económica</p>
                  <p className="text-sm font-body">{empresa.actividad_economica}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Alertas de Vencimientos */}
        <Card className="gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Alertas y Vencimientos
            </CardTitle>
            <CardDescription className="font-body">
              Estado de tus certificaciones y programas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {empresa.cert_iva_ieps_fecha_vencimiento && (
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-heading font-medium text-sm">Certificación IVA/IEPS</p>
                  <p className="text-xs text-muted-foreground font-body">
                    Vence: {format(parseISO(empresa.cert_iva_ieps_fecha_vencimiento), 'dd/MM/yyyy', { locale: es })}
                  </p>
                </div>
                {(() => {
                  const alert = getVencimientoAlert(empresa.cert_iva_ieps_fecha_vencimiento);
                  const Icon = alert?.icon || Calendar;
                  return (
                    <Badge variant={alert?.color as any} className="flex items-center gap-1">
                      <Icon className="w-3 h-3" />
                      {alert?.text}
                    </Badge>
                  );
                })()}
              </div>
            )}

            {empresa.matriz_seguridad_fecha_vencimiento && (
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-heading font-medium text-sm">Matriz de Seguridad</p>
                  <p className="text-xs text-muted-foreground font-body">
                    Vence: {format(parseISO(empresa.matriz_seguridad_fecha_vencimiento), 'dd/MM/yyyy', { locale: es })}
                  </p>
                </div>
                {(() => {
                  const alert = getVencimientoAlert(empresa.matriz_seguridad_fecha_vencimiento);
                  const Icon = alert?.icon || Calendar;
                  return (
                    <Badge variant={alert?.color as any} className="flex items-center gap-1">
                      <Icon className="w-3 h-3" />
                      {alert?.text}
                    </Badge>
                  );
                })()}
              </div>
            )}

            {empresa.immex_fecha_fin && (
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-heading font-medium text-sm">Programa IMMEX</p>
                  <p className="text-xs text-muted-foreground font-body">
                    Vigente hasta: {format(parseISO(empresa.immex_fecha_fin), 'dd/MM/yyyy', { locale: es })}
                  </p>
                </div>
                {(() => {
                  const alert = getVencimientoAlert(empresa.immex_fecha_fin);
                  const Icon = alert?.icon || Calendar;
                  return (
                    <Badge variant={alert?.color as any} className="flex items-center gap-1">
                      <Icon className="w-3 h-3" />
                      {alert?.text}
                    </Badge>
                  );
                })()}
              </div>
            )}

            {!empresa.cert_iva_ieps_fecha_vencimiento && 
             !empresa.matriz_seguridad_fecha_vencimiento && 
             !empresa.immex_fecha_fin && (
              <p className="text-center text-muted-foreground text-sm py-4">
                No hay alertas de vencimiento configuradas
              </p>
            )}
          </CardContent>
        </Card>

        {/* Tabs de información detallada */}
        <Tabs defaultValue="programas" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="programas" className="font-heading">Programas</TabsTrigger>
            <TabsTrigger value="certificaciones" className="font-heading">Certificaciones</TabsTrigger>
            <TabsTrigger value="domicilios" className="font-heading">Domicilios</TabsTrigger>
          </TabsList>

          <TabsContent value="programas" className="space-y-4">
            {/* IMMEX */}
            {empresa.immex_numero && (
              <Card className="gradient-card">
                <CardHeader>
                  <CardTitle className="font-heading text-lg">Programa IMMEX</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-heading text-muted-foreground">Número</p>
                      <p className="text-sm font-body">{empresa.immex_numero}</p>
                    </div>
                    {empresa.immex_tipo && (
                      <div>
                        <p className="text-xs font-heading text-muted-foreground">Tipo</p>
                        <p className="text-sm font-body">{empresa.immex_tipo}</p>
                      </div>
                    )}
                    {empresa.immex_modalidad && (
                      <div>
                        <p className="text-xs font-heading text-muted-foreground">Modalidad</p>
                        <p className="text-sm font-body">{empresa.immex_modalidad}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* PROSEC */}
            {empresa.prosec_numero && (
              <Card className="gradient-card">
                <CardHeader>
                  <CardTitle className="font-heading text-lg">Programa PROSEC</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-heading text-muted-foreground">Número</p>
                      <p className="text-sm font-body">{empresa.prosec_numero}</p>
                    </div>
                    {empresa.prosec_modalidad && (
                      <div>
                        <p className="text-xs font-heading text-muted-foreground">Modalidad</p>
                        <p className="text-sm font-body">{empresa.prosec_modalidad}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Padrón General */}
            {empresa.padron_general_numero && (
              <Card className="gradient-card">
                <CardHeader>
                  <CardTitle className="font-heading text-lg">Padrón de Importadores</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-heading text-muted-foreground">Número</p>
                      <p className="text-sm font-body">{empresa.padron_general_numero}</p>
                    </div>
                    {empresa.padron_general_estado && (
                      <div>
                        <p className="text-xs font-heading text-muted-foreground">Estado</p>
                        <Badge>{empresa.padron_general_estado}</Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {!empresa.immex_numero && !empresa.prosec_numero && !empresa.padron_general_numero && (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay programas registrados</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="certificaciones" className="space-y-4">
            {/* Certificación IVA/IEPS */}
            {empresa.cert_iva_ieps_oficio && (
              <Card className="gradient-card">
                <CardHeader>
                  <CardTitle className="font-heading text-lg flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Certificación IVA/IEPS
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-heading text-muted-foreground">Oficio</p>
                      <p className="text-sm font-body">{empresa.cert_iva_ieps_oficio}</p>
                    </div>
                    {empresa.cert_iva_ieps_fecha_autorizacion && (
                      <div>
                        <p className="text-xs font-heading text-muted-foreground">Fecha Autorización</p>
                        <p className="text-sm font-body">
                          {format(parseISO(empresa.cert_iva_ieps_fecha_autorizacion), 'dd/MM/yyyy', { locale: es })}
                        </p>
                      </div>
                    )}
                  </div>
                  {apoderados.length > 0 && (
                    <div className="pt-3 border-t">
                      <p className="text-xs font-heading text-muted-foreground mb-2">Apoderados Legales</p>
                      <div className="space-y-2">
                        {apoderados.map((apoderado) => (
                          <div key={apoderado.id} className="text-sm font-body">
                            {apoderado.nombre}
                            {apoderado.tipo_apoderado && (
                              <Badge variant="outline" className="ml-2">{apoderado.tipo_apoderado}</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {!empresa.cert_iva_ieps_oficio && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay certificaciones registradas</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="domicilios" className="space-y-4">
            {domicilios.length > 0 ? (
              domicilios.map((domicilio) => (
                <Card key={domicilio.id} className="gradient-card">
                  <CardHeader>
                    <CardTitle className="font-heading text-lg">
                      {domicilio.tipo || 'Domicilio de Operación'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-body">{domicilio.domicilio}</p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay domicilios de operación registrados</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Calendario de eventos */}
        <DashboardCalendar 
          height="500px"
          onEventClick={(event) => {
            // Navigate to relevant section
            if (event.resource.type === 'documento') {
              // Scroll to documentos section
              document.querySelector('[data-section="documentos"]')?.scrollIntoView({ behavior: 'smooth' });
            }
          }}
        />

        {/* New Tabs for Documentos and Solicitudes */}
        <div className="mt-6 space-y-6" data-section="documentos">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Documentos</CardTitle>
              <CardDescription>Documentos y archivos de tu empresa</CardDescription>
            </CardHeader>
            <CardContent>
              {empresa && (
                <DocumentosManager empresaId={empresa.id} empresaNombre={empresa.razon_social} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Solicitudes de Servicio</CardTitle>
              <CardDescription>Crea y gestiona tus solicitudes de atención</CardDescription>
            </CardHeader>
            <CardContent>
              {empresa && <SolicitudesServicio empresaId={empresa.id} />}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
