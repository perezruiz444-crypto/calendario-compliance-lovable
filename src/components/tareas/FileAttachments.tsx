import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, File, X, Download, FileText, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface FileAttachmentsProps {
  tareaId?: string;
  attachments: any[];
  onAttachmentsChange: (attachments: any[]) => void;
  readonly?: boolean;
}

export function FileAttachments({ tareaId, attachments, onAttachmentsChange, readonly = false }: FileAttachmentsProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      const uploadedFiles = [];

      for (const file of Array.from(files)) {
        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`El archivo ${file.name} excede el límite de 10MB`);
          continue;
        }

        // Generate unique file path
        const fileExt = file.name.split('.').pop();
        const fileName = `${user?.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('task-attachments')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('task-attachments')
          .getPublicUrl(filePath);

        uploadedFiles.push({
          name: file.name,
          path: filePath,
          url: publicUrl,
          size: file.size,
          type: file.type
        });
      }

      onAttachmentsChange([...attachments, ...uploadedFiles]);
      toast.success(`${uploadedFiles.length} archivo(s) cargado(s) exitosamente`);
    } catch (error: any) {
      toast.error('Error al cargar archivos: ' + error.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveFile = async (index: number) => {
    const fileToRemove = attachments[index];
    
    try {
      // Delete from storage if it has a path
      if (fileToRemove.path) {
        const { error } = await supabase.storage
          .from('task-attachments')
          .remove([fileToRemove.path]);

        if (error) throw error;
      }

      const newAttachments = attachments.filter((_, i) => i !== index);
      onAttachmentsChange(newAttachments);
      toast.success('Archivo eliminado');
    } catch (error: any) {
      toast.error('Error al eliminar archivo: ' + error.message);
    }
  };

  const handleDownload = async (file: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('task-attachments')
        .download(file.path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error('Error al descargar archivo: ' + error.message);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-3">
      {!readonly && (
        <div>
          <input
            type="file"
            id="file-upload"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById('file-upload')?.click()}
            disabled={uploading}
            className="w-full font-heading"
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Cargando...' : 'Adjuntar Archivos'}
          </Button>
          <p className="text-xs text-muted-foreground font-body mt-1">
            Máximo 10MB por archivo. Formatos: PDF, DOC, XLS, TXT, imágenes
          </p>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-3 p-3 bg-muted/30 rounded-lg border animate-fade-in"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded flex items-center justify-center text-primary">
                  {getFileIcon(file.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-heading text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground font-body">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDownload(file)}
                  className="h-8 w-8"
                >
                  <Download className="w-4 h-4" />
                </Button>
                {!readonly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveFile(index)}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
