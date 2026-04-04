import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { FileText, Upload, Download, Trash2, Calendar, User, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface DocumentosManagerProps {
  empresaId: string;
  empresaNombre?: string;
}

export function DocumentosManager({ empresaId, empresaNombre }: DocumentosManagerProps) {
  const { user, role } = useAuth();
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    tipo_documento: 'otro',
    categoria: '',
    fecha_documento: '',
    fecha_vencimiento: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    fetchDocumentos();
  }, [empresaId]);

  const fetchDocumentos = async () => {
    try {
      const { data, error } = await supabase
        .from('documentos')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocumentos(data || []);
    } catch (error) {
      console.error('Error fetching documentos:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los documentos',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const ALLOWED_MIME = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: 'Error',
        description: 'Por favor selecciona un archivo',
        variant: 'destructive'
      });
      return;
    }

    if (!ALLOWED_MIME.includes(selectedFile.type)) {
      toast({
        title: 'Tipo de archivo no permitido',
        description: 'Solo se aceptan PDF, Word, Excel e imágenes JPG/PNG',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.nombre) {
      toast({
        title: 'Error',
        description: 'El nombre del documento es requerido',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);
    try {
      // Upload file to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${empresaId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documentos')
        .getPublicUrl(fileName);

      // Create documento record
      const { error: dbError } = await supabase
        .from('documentos')
        .insert({
          empresa_id: empresaId,
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          tipo_documento: formData.tipo_documento,
          categoria: formData.categoria || null,
          archivo_url: publicUrl,
          archivo_nombre: selectedFile.name,
          archivo_tamano: selectedFile.size,
          fecha_documento: formData.fecha_documento || null,
          fecha_vencimiento: formData.fecha_vencimiento || null,
          subido_por: user?.id
        });

      if (dbError) throw dbError;

      toast({
        title: 'Éxito',
        description: 'Documento subido correctamente'
      });

      setUploadDialogOpen(false);
      setFormData({
        nombre: '',
        descripcion: '',
        tipo_documento: 'otro',
        categoria: '',
        fecha_documento: '',
        fecha_vencimiento: ''
      });
      setSelectedFile(null);
      fetchDocumentos();
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo subir el documento',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentoId: string, archivoUrl: string) => {
    if (!confirm('¿Estás seguro de eliminar este documento?')) return;

    try {
      // Extract file path from URL
      const urlParts = archivoUrl.split('/');
      const filePath = urlParts.slice(urlParts.indexOf('documentos') + 1).join('/');

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documentos')
        .remove([filePath]);

      if (storageError) console.error('Error deleting file:', storageError);

      // Delete from database
      const { error: dbError } = await supabase
        .from('documentos')
        .delete()
        .eq('id', documentoId);

      if (dbError) throw dbError;

      toast({
        title: 'Éxito',
        description: 'Documento eliminado correctamente'
      });

      fetchDocumentos();
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el documento',
        variant: 'destructive'
      });
    }
  };

  const handleDownload = async (archivoUrl: string, archivoNombre: string) => {
    try {
      const response = await fetch(archivoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = archivoNombre;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: 'Error',
        description: 'No se pudo descargar el archivo',
        variant: 'destructive'
      });
    }
  };

  const getTipoDocumentoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      certificacion: 'Certificación',
      legal: 'Legal',
      contrato: 'Contrato',
      reporte: 'Reporte',
      otro: 'Otro'
    };
    return labels[tipo] || tipo;
  };

  const canModify = role === 'administrador' || role === 'consultor';

  if (loading) {
    return <div className="text-center py-8">Cargando documentos...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-heading font-semibold">Documentos</h3>
          <p className="text-sm text-muted-foreground">Gestión de archivos y documentos</p>
        </div>
        {canModify && (
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Upload className="w-4 h-4" />
                Subir Documento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Subir Documento</DialogTitle>
                <DialogDescription>
                  Sube un nuevo documento para {empresaNombre}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="file">Archivo *</Label>
                  <Input
                    id="file"
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Formatos: PDF, DOC, XLS, JPG, PNG (Max 10MB)
                  </p>
                </div>

                <div>
                  <Label htmlFor="nombre">Nombre del Documento *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej: Certificado IVA 2024"
                  />
                </div>

                <div>
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea
                    id="descripcion"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    placeholder="Descripción opcional del documento"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tipo_documento">Tipo de Documento</Label>
                    <Select
                      value={formData.tipo_documento}
                      onValueChange={(value) => setFormData({ ...formData, tipo_documento: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="certificacion">Certificación</SelectItem>
                        <SelectItem value="legal">Legal</SelectItem>
                        <SelectItem value="contrato">Contrato</SelectItem>
                        <SelectItem value="reporte">Reporte</SelectItem>
                        <SelectItem value="otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="categoria">Categoría</Label>
                    <Input
                      id="categoria"
                      value={formData.categoria}
                      onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                      placeholder="Ej: IMMEX, Fiscal"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fecha_documento">Fecha del Documento</Label>
                    <Input
                      id="fecha_documento"
                      type="date"
                      value={formData.fecha_documento}
                      onChange={(e) => setFormData({ ...formData, fecha_documento: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="fecha_vencimiento">Fecha de Vencimiento</Label>
                    <Input
                      id="fecha_vencimiento"
                      type="date"
                      value={formData.fecha_vencimiento}
                      onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setUploadDialogOpen(false)}
                    disabled={uploading}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleUpload} disabled={uploading}>
                    {uploading ? 'Subiendo...' : 'Subir Documento'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {documentos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No hay documentos disponibles
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {documentos.map((doc) => (
            <Card key={doc.id} className="hover:border-primary transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold truncate">{doc.nombre}</h4>
                        <Badge variant="secondary">{getTipoDocumentoLabel(doc.tipo_documento)}</Badge>
                        {doc.categoria && (
                          <Badge variant="outline">{doc.categoria}</Badge>
                        )}
                      </div>
                      {doc.descripcion && (
                        <p className="text-sm text-muted-foreground mb-2">{doc.descripcion}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(doc.created_at), 'dd/MM/yyyy', { locale: es })}
                        </span>
                        {doc.fecha_vencimiento && (
                          <span className="flex items-center gap-1">
                            Vence: {format(new Date(doc.fecha_vencimiento), 'dd/MM/yyyy', { locale: es })}
                          </span>
                        )}
                        <span>{(doc.archivo_tamano / 1024).toFixed(0)} KB</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(doc.archivo_url, doc.archivo_nombre)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    {canModify && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(doc.id, doc.archivo_url)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}