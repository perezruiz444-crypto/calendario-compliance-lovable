import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Search, Building2, CheckSquare, MessageSquare, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any>({
    empresas: [],
    tareas: [],
    mensajes: [],
    documentos: []
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { role } = useAuth();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setResults({ empresas: [], tareas: [], mensajes: [], documentos: [] });
      return;
    }

    const searchDebounced = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(searchDebounced);
  }, [searchQuery]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const searchTerm = `%${searchQuery}%`;

      // Search empresas
      const empresasQuery = supabase
        .from('empresas')
        .select('id, razon_social, rfc')
        .or(`razon_social.ilike.${searchTerm},rfc.ilike.${searchTerm}`)
        .limit(5);

      // Search tareas
      const tareasQuery = supabase
        .from('tareas')
        .select('id, titulo, descripcion, empresa_id')
        .or(`titulo.ilike.${searchTerm},descripcion.ilike.${searchTerm}`)
        .limit(5);

      // Search mensajes
      const mensajesQuery = supabase
        .from('mensajes')
        .select('id, asunto, contenido')
        .or(`asunto.ilike.${searchTerm},contenido.ilike.${searchTerm}`)
        .limit(5);

      // Search documentos
      const documentosQuery = supabase
        .from('documentos')
        .select('id, nombre, descripcion, empresa_id')
        .or(`nombre.ilike.${searchTerm},descripcion.ilike.${searchTerm}`)
        .limit(5);

      const [empresasRes, tareasRes, mensajesRes, documentosRes] = await Promise.all([
        empresasQuery,
        tareasQuery,
        mensajesQuery,
        documentosQuery
      ]);

      setResults({
        empresas: empresasRes.data || [],
        tareas: tareasRes.data || [],
        mensajes: mensajesRes.data || [],
        documentos: documentosRes.data || []
      });
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (type: string, id: string, empresaId?: string) => {
    setOpen(false);
    setSearchQuery('');
    
    switch (type) {
      case 'empresa':
        navigate(`/empresas/${id}`);
        break;
      case 'tarea':
        navigate('/tareas');
        break;
      case 'mensaje':
        navigate('/mensajes');
        break;
      case 'documento':
        if (empresaId) {
          navigate(`/empresas/${empresaId}`);
        }
        break;
    }
  };

  const hasResults = results.empresas.length > 0 || 
                     results.tareas.length > 0 || 
                     results.mensajes.length > 0 ||
                     results.documentos.length > 0;

  return (
    <>
      <Button
        variant="outline"
        className="relative w-full justify-start text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden lg:inline-flex">Buscar...</span>
        <span className="inline-flex lg:hidden">Buscar</span>
        <kbd className="pointer-events-none absolute right-1.5 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Buscar empresas, tareas, mensajes, documentos..."
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          {loading && (
            <div className="py-6 text-center text-sm">Buscando...</div>
          )}

          {!loading && searchQuery.length >= 2 && !hasResults && (
            <CommandEmpty>No se encontraron resultados.</CommandEmpty>
          )}

          {!loading && hasResults && (
            <>
              {results.empresas.length > 0 && (role === 'administrador' || role === 'consultor') && (
                <CommandGroup heading="Empresas">
                  {results.empresas.map((empresa: any) => (
                    <CommandItem
                      key={empresa.id}
                      onSelect={() => handleSelect('empresa', empresa.id)}
                      className="cursor-pointer"
                    >
                      <Building2 className="mr-2 h-4 w-4" />
                      <div className="flex-1">
                        <div className="font-medium">{empresa.razon_social}</div>
                        <div className="text-xs text-muted-foreground">RFC: {empresa.rfc}</div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {results.tareas.length > 0 && (
                <CommandGroup heading="Tareas">
                  {results.tareas.map((tarea: any) => (
                    <CommandItem
                      key={tarea.id}
                      onSelect={() => handleSelect('tarea', tarea.id, tarea.empresa_id)}
                      className="cursor-pointer"
                    >
                      <CheckSquare className="mr-2 h-4 w-4" />
                      <div className="flex-1">
                        <div className="font-medium">{tarea.titulo}</div>
                        {tarea.descripcion && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {tarea.descripcion}
                          </div>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {results.mensajes.length > 0 && (
                <CommandGroup heading="Mensajes">
                  {results.mensajes.map((mensaje: any) => (
                    <CommandItem
                      key={mensaje.id}
                      onSelect={() => handleSelect('mensaje', mensaje.id)}
                      className="cursor-pointer"
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      <div className="flex-1">
                        <div className="font-medium">{mensaje.asunto}</div>
                        {mensaje.contenido && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {mensaje.contenido}
                          </div>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {results.documentos.length > 0 && (
                <CommandGroup heading="Documentos">
                  {results.documentos.map((doc: any) => (
                    <CommandItem
                      key={doc.id}
                      onSelect={() => handleSelect('documento', doc.id, doc.empresa_id)}
                      className="cursor-pointer"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      <div className="flex-1">
                        <div className="font-medium">{doc.nombre}</div>
                        {doc.descripcion && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {doc.descripcion}
                          </div>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}