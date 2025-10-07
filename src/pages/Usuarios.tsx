import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Mail, Shield, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import CreateUserDialog from '@/components/usuarios/CreateUserDialog';
import EditUserDialog from '@/components/usuarios/EditUserDialog';
import { toast } from 'sonner';

interface UserWithRole {
  id: string;
  email: string;
  nombre_completo: string;
  role: string;
  created_at: string;
}

export default function Usuarios() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState<UserWithRole[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);

  const fetchUsuarios = async () => {
    try {
      setLoadingUsers(true);
      
      const { data, error } = await supabase.functions.invoke('list-users');

      if (error) {
        throw new Error(error.message || 'Error al cargar usuarios');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setUsuarios(data.users || []);
    } catch (error: any) {
      toast.error('Error al cargar usuarios');
      console.error(error);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    if (!loading && role !== 'administrador' && role !== 'consultor') {
      navigate('/dashboard');
    }
    if (!loading && (role === 'administrador' || role === 'consultor')) {
      fetchUsuarios();
    }
  }, [user, role, loading, navigate]);

  const getRoleBadgeVariant = (userRole: string) => {
    switch (userRole) {
      case 'administrador': return 'default';
      case 'consultor': return 'secondary';
      case 'cliente': return 'outline';
      default: return 'outline';
    }
  };

  const handleEditUser = (usuario: UserWithRole) => {
    setSelectedUser(usuario);
    setEditDialogOpen(true);
  };

  if (loading || loadingUsers) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DashboardLayout currentPage="/usuarios">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground mb-2">
              Gestión de Usuarios
            </h1>
            <p className="text-muted-foreground font-body">
              Administra usuarios y asigna roles
            </p>
          </div>
          <Button 
            onClick={() => setDialogOpen(true)}
            className="gradient-primary shadow-elegant hover:shadow-lg transition-smooth font-heading"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Usuario
          </Button>
        </div>

        <Card className="gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="font-heading">Usuarios del Sistema</CardTitle>
            <CardDescription className="font-body">
              Lista de todos los usuarios registrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {usuarios.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-20 h-20 bg-primary-light rounded-2xl flex items-center justify-center mb-4">
                  <Shield className="w-10 h-10 text-primary" />
                </div>
                <p className="text-muted-foreground font-body mb-4">
                  No hay usuarios adicionales todavía
                </p>
                <Button 
                  onClick={() => setDialogOpen(true)}
                  className="gradient-primary shadow-elegant font-heading"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Primer Usuario
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-heading">Nombre</TableHead>
                    <TableHead className="font-heading">Email</TableHead>
                    <TableHead className="font-heading">Rol</TableHead>
                    <TableHead className="font-heading">Fecha de Registro</TableHead>
                    <TableHead className="font-heading text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios.map((usuario) => (
                    <TableRow key={usuario.id}>
                      <TableCell className="font-body font-medium">{usuario.nombre_completo}</TableCell>
                      <TableCell className="font-body">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          {usuario.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(usuario.role)} className="font-body capitalize">
                          {usuario.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-body">
                        {new Date(usuario.created_at).toLocaleDateString('es-MX')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditUser(usuario)}
                          className="hover:bg-accent transition-smooth font-heading"
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <CreateUserDialog 
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onUserCreated={fetchUsuarios}
      />

      <EditUserDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onUserUpdated={fetchUsuarios}
        user={selectedUser}
      />
    </DashboardLayout>
  );
}
