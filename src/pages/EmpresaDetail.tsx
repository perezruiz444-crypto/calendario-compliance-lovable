import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import EditEmpresaDialog from '@/components/empresas/EditEmpresaDialog';
import ManageConsultoresDialog from '@/components/empresas/ManageConsultoresDialog';
import { 
  Building2, 
  FileText, 
  MapPin, 
  Users, 
  Ship, 
  ArrowLeft,
  Phone,
  Hash,
  Pencil,
  Shield,
  Scale,
  UserCog
} from 'lucide-react';

export default function EmpresaDetail() {
  const { id } = useParams();
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [empresa, setEmpresa] = useState<any>(null);
  const [domicilios, setDomicilios] = useState<any[]>([]);
  const [miembros, setMiembros] = useState<any[]>([]);
  const [agentes, setAgentes] = useState<any[]>([]);
  const [apoderados, setApoderados] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [consultoresDialogOpen, setConsultoresDialogOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (id && user) {
      fetchEmpresaData();
    }
  }, [id, user]);

  const fetchEmpresaData = async () => {
    setLoadingData(true);
    try {
      // Fetch empresa
      const { data: empresaData, error: empresaError } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', id)
        .single();

      if (empresaError) throw empresaError;
      setEmpresa(empresaData);

      // Fetch related data
      const [domiciliosRes, miembrosRes, agentesRes, apoderadosRes] = await Promise.all([
        supabase.from('domicilios_operacion').select('*').eq('empresa_id', id),
        supabase.from('miembros_socios').select('*').eq('empresa_id', id),
        supabase.from('agentes_aduanales').select('*').eq('empresa_id', id),
        supabase.from('apoderados_legales').select('*').eq('empresa_id', id)
      ]);

      setDomicilios(domiciliosRes.data || []);
      setMiembros(miembrosRes.data || []);
      setAgentes(agentesRes.data || []);
      setApoderados(apoderadosRes.data || []);
    } catch (error: any) {
      toast.error('Error al cargar la empresa');
      console.error(error);
    } finally {
      setLoadingData(false);
    }
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
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Empresa no encontrada</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="/empresas">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/empresas')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-heading font-bold text-foreground mb-2">
              {empresa.razon_social}
            </h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Badge variant="outline">{empresa.rfc}</Badge>
              {empresa.telefono && (
                <span className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  {empresa.telefono}
                </span>
              )}
            </div>
          </div>
          {(role === 'administrador' || role === 'consultor') && (
            <Button onClick={() => setEditDialogOpen(true)} className="gradient-primary shadow-elegant">
              <Pencil className="w-4 h-4 mr-2" />
              Editar
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="programas">Programas</TabsTrigger>
            <TabsTrigger value="certificaciones">Certificaciones</TabsTrigger>
            <TabsTrigger value="domicilios">Domicilios</TabsTrigger>
            <TabsTrigger value="relacionados">Relacionados</TabsTrigger>
            {role === 'administrador' && (
              <TabsTrigger value="consultores">Consultores</TabsTrigger>
            )}
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-4 animate-fade-in">
            <Card className="gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Información General
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-heading font-medium text-muted-foreground">Razón Social</label>
                  <p className="font-body mt-1">{empresa.razon_social}</p>
                </div>
                <div>
                  <label className="text-sm font-heading font-medium text-muted-foreground">RFC</label>
                  <p className="font-body mt-1">{empresa.rfc}</p>
                </div>
                {empresa.actividad_economica && (
                  <div>
                    <label className="text-sm font-heading font-medium text-muted-foreground">Actividad Económica</label>
                    <p className="font-body mt-1">{empresa.actividad_economica}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-heading font-medium text-muted-foreground">Domicilio Fiscal</label>
                  <p className="font-body mt-1">{empresa.domicilio_fiscal}</p>
                </div>
                {empresa.telefono && (
                  <div>
                    <label className="text-sm font-heading font-medium text-muted-foreground">Teléfono</label>
                    <p className="font-body mt-1">{empresa.telefono}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="font-heading">Acta Constitutiva</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {empresa.numero_escritura && (
                    <div>
                      <label className="text-sm font-heading font-medium text-muted-foreground">Número de Escritura</label>
                      <p className="font-body mt-1">{empresa.numero_escritura}</p>
                    </div>
                  )}
                  {empresa.fecha_constitucion && (
                    <div>
                      <label className="text-sm font-heading font-medium text-muted-foreground">Fecha de Constitución</label>
                      <p className="font-body mt-1">{new Date(empresa.fecha_constitucion).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
                {empresa.datos_notario && (
                  <div>
                    <label className="text-sm font-heading font-medium text-muted-foreground">Datos del Notario</label>
                    <p className="font-body mt-1">{empresa.datos_notario}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="font-heading">Representante Legal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {empresa.representante_legal_nombre && (
                  <div>
                    <label className="text-sm font-heading font-medium text-muted-foreground">Nombre</label>
                    <p className="font-body mt-1">{empresa.representante_legal_nombre}</p>
                  </div>
                )}
                {empresa.representante_legal_poder && (
                  <div>
                    <label className="text-sm font-heading font-medium text-muted-foreground">Número de Poder</label>
                    <p className="font-body mt-1">{empresa.representante_legal_poder}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Programas Tab */}
          <TabsContent value="programas" className="space-y-4 animate-fade-in">
            {/* IMMEX */}
            <Card className="gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <Ship className="w-5 h-5" />
                  Programa IMMEX
                </CardTitle>
              </CardHeader>
              <CardContent>
                {empresa.immex_numero ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-heading font-medium text-muted-foreground">Número de Registro</label>
                        <p className="font-body mt-1">{empresa.immex_numero}</p>
                      </div>
                      {(empresa.immex_modalidad || empresa.immex_tipo) && (
                        <div>
                          <label className="text-sm font-heading font-medium text-muted-foreground">Modalidad</label>
                          <p className="font-body mt-1 capitalize">{empresa.immex_modalidad || empresa.immex_tipo}</p>
                        </div>
                      )}
                      {(empresa.immex_fecha_autorizacion || empresa.immex_fecha_inicio) && (
                        <div>
                          <label className="text-sm font-heading font-medium text-muted-foreground">Fecha de Autorización</label>
                          <p className="font-body mt-1">
                            {new Date(empresa.immex_fecha_autorizacion || empresa.immex_fecha_inicio).toLocaleDateString('es-MX')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground font-body">No registrado</p>
                )}
              </CardContent>
            </Card>

            {/* PROSEC */}
            <Card className="gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="font-heading">Programa PROSEC</CardTitle>
              </CardHeader>
              <CardContent>
                {empresa.prosec_numero ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-heading font-medium text-muted-foreground">Número de Registro</label>
                        <p className="font-body mt-1">{empresa.prosec_numero}</p>
                      </div>
                      {(empresa.prosec_modalidad) && (
                        <div>
                          <label className="text-sm font-heading font-medium text-muted-foreground">Modalidad</label>
                          <p className="font-body mt-1">{empresa.prosec_modalidad}</p>
                        </div>
                      )}
                      {(empresa.prosec_fecha_autorizacion || empresa.prosec_fecha_inicio) && (
                        <div>
                          <label className="text-sm font-heading font-medium text-muted-foreground">Fecha de Autorización</label>
                          <p className="font-body mt-1">
                            {new Date(empresa.prosec_fecha_autorizacion || empresa.prosec_fecha_inicio).toLocaleDateString('es-MX')}
                          </p>
                        </div>
                      )}
                    </div>
                    {(empresa.prosec_sectores && empresa.prosec_sectores.length > 0) && (
                      <div>
                        <label className="text-sm font-heading font-medium text-muted-foreground">Sectores</label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {empresa.prosec_sectores.map((sector: string, idx: number) => (
                            <Badge key={idx} variant="secondary">{sector}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground font-body">No registrado</p>
                )}
              </CardContent>
            </Card>

            {/* Anexo 24 */}
            <Card className="gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="font-heading">Anexo 24</CardTitle>
              </CardHeader>
              <CardContent>
                {empresa.anexo24_proveedor_software ? (
                  <div>
                    <label className="text-sm font-heading font-medium text-muted-foreground">Proveedor de Software</label>
                    <p className="font-body mt-1">{empresa.anexo24_proveedor_software}</p>
                  </div>
                ) : (
                  <p className="text-muted-foreground font-body">No registrado</p>
                )}
              </CardContent>
            </Card>

            {/* Padrón General */}
            <Card className="gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="font-heading">Padrón de Importadores Activos</CardTitle>
              </CardHeader>
              <CardContent>
                {empresa.padron_importadores_sectores && empresa.padron_importadores_sectores.length > 0 ? (
                  <div className="space-y-3">
                    {empresa.padron_importadores_sectores.map((sector: any, idx: number) => (
                      <div key={idx} className="border rounded-lg p-3">
                        <p className="font-heading font-medium">{sector.numero_sector}</p>
                        <p className="text-sm text-muted-foreground font-body">{sector.descripcion_sector}</p>
                      </div>
                    ))}
                  </div>
                ) : empresa.padron_general_numero ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-heading font-medium text-muted-foreground">Número</label>
                      <p className="font-body mt-1">{empresa.padron_general_numero}</p>
                    </div>
                    <div>
                      <label className="text-sm font-heading font-medium text-muted-foreground">Estado</label>
                      <Badge variant={empresa.padron_general_estado === 'activo' ? 'default' : 'secondary'}>
                        {empresa.padron_general_estado}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground font-body">No registrado</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Certificaciones Tab */}
          <TabsContent value="certificaciones" className="space-y-4 animate-fade-in">
            {/* Certificación IVA e IEPS */}
            <Card className="gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Certificación IVA e IEPS
                </CardTitle>
              </CardHeader>
              <CardContent>
                {empresa.cert_iva_ieps_oficio ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-heading font-medium text-muted-foreground">Oficio de Autorización</label>
                      <p className="font-body mt-1">{empresa.cert_iva_ieps_oficio}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {empresa.cert_iva_ieps_fecha_autorizacion && (
                        <div>
                          <label className="text-sm font-heading font-medium text-muted-foreground">Fecha de Autorización</label>
                          <p className="font-body mt-1">
                            {new Date(empresa.cert_iva_ieps_fecha_autorizacion).toLocaleDateString('es-MX')}
                          </p>
                        </div>
                      )}
                      {empresa.cert_iva_ieps_fecha_ultima_renovacion && (
                        <div>
                          <label className="text-sm font-heading font-medium text-muted-foreground">Última Renovación</label>
                          <p className="font-body mt-1">
                            {new Date(empresa.cert_iva_ieps_fecha_ultima_renovacion).toLocaleDateString('es-MX')}
                          </p>
                        </div>
                      )}
                      {empresa.cert_iva_ieps_fecha_vencimiento && (
                        <div>
                          <label className="text-sm font-heading font-medium text-muted-foreground">Fecha de Vencimiento</label>
                          <p className="font-body mt-1">
                            {new Date(empresa.cert_iva_ieps_fecha_vencimiento).toLocaleDateString('es-MX')}
                          </p>
                        </div>
                      )}
                      {empresa.cert_iva_ieps_fecha_renovar && (
                        <div>
                          <label className="text-sm font-heading font-medium text-muted-foreground">Fecha para Renovar</label>
                          <p className="font-body mt-1">
                            {new Date(empresa.cert_iva_ieps_fecha_renovar).toLocaleDateString('es-MX')}
                          </p>
                        </div>
                      )}
                    </div>
                    {empresa.cert_iva_ieps_nota && (
                      <div>
                        <label className="text-sm font-heading font-medium text-muted-foreground">Nota</label>
                        <p className="font-body mt-1">{empresa.cert_iva_ieps_nota}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground font-body">No registrado</p>
                )}
              </CardContent>
            </Card>

            {/* Matriz de Seguridad */}
            <Card className="gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <Scale className="w-5 h-5" />
                  Matriz de Seguridad
                </CardTitle>
              </CardHeader>
              <CardContent>
                {empresa.matriz_seguridad_fecha_vencimiento || empresa.matriz_seguridad_fecha_renovar ? (
                  <div className="grid grid-cols-2 gap-4">
                    {empresa.matriz_seguridad_fecha_vencimiento && (
                      <div>
                        <label className="text-sm font-heading font-medium text-muted-foreground">Fecha de Vencimiento</label>
                        <p className="font-body mt-1">
                          {new Date(empresa.matriz_seguridad_fecha_vencimiento).toLocaleDateString('es-MX')}
                        </p>
                      </div>
                    )}
                    {empresa.matriz_seguridad_fecha_renovar && (
                      <div>
                        <label className="text-sm font-heading font-medium text-muted-foreground">Fecha para Renovar</label>
                        <p className="font-body mt-1">
                          {new Date(empresa.matriz_seguridad_fecha_renovar).toLocaleDateString('es-MX')}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground font-body">No registrado</p>
                )}
              </CardContent>
            </Card>

            {/* Apoderados Legales */}
            <Card className="gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Apoderados Legales
                </CardTitle>
                <CardDescription className="font-body">
                  {apoderados.length} apoderado(s) registrado(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {apoderados.length > 0 ? (
                  <div className="space-y-3">
                    {apoderados.map((apoderado: any) => (
                      <div key={apoderado.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-heading font-medium">{apoderado.nombre}</p>
                            {apoderado.tipo_apoderado && (
                              <Badge variant="outline" className="mt-1">Tipo {apoderado.tipo_apoderado}</Badge>
                            )}
                            {(apoderado.poder_notarial_instrumento || apoderado.poder_notarial_libro || apoderado.poder_notarial_anio) && (
                              <div className="mt-2 text-sm text-muted-foreground font-body">
                                <p className="font-medium">Poder Notarial:</p>
                                <div className="grid grid-cols-3 gap-2 mt-1">
                                  {apoderado.poder_notarial_instrumento && (
                                    <span>Inst: {apoderado.poder_notarial_instrumento}</span>
                                  )}
                                  {apoderado.poder_notarial_libro && (
                                    <span>Libro: {apoderado.poder_notarial_libro}</span>
                                  )}
                                  {apoderado.poder_notarial_anio && (
                                    <span>Año: {apoderado.poder_notarial_anio}</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground font-body text-center py-8">
                    No hay apoderados registrados
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Domicilios Tab */}
          <TabsContent value="domicilios" className="space-y-4 animate-fade-in">
            <Card className="gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Domicilios de Operación
                </CardTitle>
                <CardDescription className="font-body">
                  {domicilios.length} domicilio(s) registrado(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {domicilios.length > 0 ? (
                  <div className="space-y-4">
                    {domicilios.map((domicilio) => (
                      <div key={domicilio.id} className="border rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-primary mt-0.5" />
                          <div className="flex-1">
                            {domicilio.tipo && (
                              <Badge variant="outline" className="mb-2">{domicilio.tipo}</Badge>
                            )}
                            <p className="font-body">{domicilio.domicilio}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground font-body text-center py-8">
                    No hay domicilios adicionales registrados
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Relacionados Tab */}
          <TabsContent value="relacionados" className="space-y-4 animate-fade-in">
            {/* Miembros y Socios */}
            <Card className="gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Miembros y Socios
                </CardTitle>
                <CardDescription className="font-body">
                  {miembros.length} miembro(s) registrado(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {miembros.length > 0 ? (
                  <div className="space-y-3">
                    {miembros.map((miembro) => (
                      <div key={miembro.id} className="flex items-center justify-between border rounded-lg p-3">
                        <div>
                          <p className="font-heading font-medium">{miembro.nombre_completo}</p>
                          <p className="text-sm text-muted-foreground font-body">{miembro.rfc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground font-body text-center py-8">
                    No hay miembros registrados
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Agentes Aduanales */}
            <Card className="gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="font-heading flex items-center gap-2">
                  <Hash className="w-5 h-5" />
                  Agentes Aduanales
                </CardTitle>
                <CardDescription className="font-body">
                  {agentes.length} agente(s) registrado(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {agentes.length > 0 ? (
                  <div className="space-y-3">
                    {agentes.map((agente) => (
                      <div key={agente.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-heading font-medium">{agente.nombre_agente}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">Patente: {agente.numero_patente}</Badge>
                              {agente.estado && <Badge variant="secondary">{agente.estado}</Badge>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground font-body text-center py-8">
                    No hay agentes aduanales registrados
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Consultores Tab (Admin only) */}
          {role === 'administrador' && (
            <TabsContent value="consultores" className="space-y-4 animate-fade-in">
              <Card className="gradient-card shadow-card">
                <CardHeader>
                  <CardTitle className="font-heading flex items-center gap-2">
                    <UserCog className="w-5 h-5" />
                    Gestión de Consultores
                  </CardTitle>
                  <CardDescription className="font-body">
                    Asigna o desasigna consultores que pueden gestionar esta empresa
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => setConsultoresDialogOpen(true)}
                    className="gradient-primary shadow-elegant"
                  >
                    <UserCog className="w-4 h-4 mr-2" />
                    Gestionar Consultores
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>

      <EditEmpresaDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onEmpresaUpdated={fetchEmpresaData}
        empresaId={id!}
      />

      <ManageConsultoresDialog
        open={consultoresDialogOpen}
        onOpenChange={setConsultoresDialogOpen}
        empresaId={id!}
        empresaNombre={empresa?.razon_social || ''}
      />
    </DashboardLayout>
  );
}
