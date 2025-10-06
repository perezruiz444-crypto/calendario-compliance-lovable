-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('administrador', 'consultor', 'cliente');

-- Create enum for task priorities
CREATE TYPE public.prioridad_tarea AS ENUM ('alta', 'media', 'baja');

-- Create enum for task status
CREATE TYPE public.estado_tarea AS ENUM ('pendiente', 'en_progreso', 'completada', 'cancelada');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre_completo TEXT NOT NULL,
  telefono TEXT,
  notificaciones_activas BOOLEAN DEFAULT true,
  tema_visual TEXT DEFAULT 'light',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create empresas table
CREATE TABLE public.empresas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  razon_social TEXT NOT NULL,
  rfc TEXT NOT NULL UNIQUE,
  domicilio_fiscal TEXT NOT NULL,
  telefono TEXT,
  
  -- Acta Constitutiva
  numero_escritura TEXT,
  fecha_constitucion DATE,
  datos_notario TEXT,
  
  -- Representante Legal
  representante_legal_nombre TEXT,
  representante_legal_poder TEXT,
  
  -- IMMEX
  immex_numero TEXT,
  immex_tipo TEXT,
  immex_fecha_inicio DATE,
  immex_fecha_fin DATE,
  immex_domicilios TEXT[],
  
  -- PROSEC
  prosec_numero TEXT,
  prosec_sector TEXT,
  prosec_fecha_inicio DATE,
  prosec_fecha_fin DATE,
  prosec_domicilios TEXT[],
  
  -- Anexo 24
  anexo24_proveedor_software TEXT,
  
  -- Padrón de Importadores
  padron_general_numero TEXT,
  padron_general_estado TEXT,
  padrones_sectoriales JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create domicilios_operacion table
CREATE TABLE public.domicilios_operacion (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  domicilio TEXT NOT NULL,
  tipo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create miembros_socios table
CREATE TABLE public.miembros_socios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  nombre_completo TEXT NOT NULL,
  rfc TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create agentes_aduanales table
CREATE TABLE public.agentes_aduanales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  nombre_agente TEXT NOT NULL,
  numero_patente TEXT NOT NULL,
  estado TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create consultor_empresa_asignacion table (many-to-many)
CREATE TABLE public.consultor_empresa_asignacion (
  consultor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  asignado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (consultor_id, empresa_id)
);

-- Create tareas table
CREATE TABLE public.tareas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo TEXT NOT NULL,
  descripcion TEXT,
  prioridad public.prioridad_tarea DEFAULT 'media',
  estado public.estado_tarea DEFAULT 'pendiente',
  fecha_vencimiento DATE,
  empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  consultor_asignado_id UUID REFERENCES auth.users(id),
  creado_por UUID REFERENCES auth.users(id) NOT NULL,
  archivos_adjuntos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create comentarios table
CREATE TABLE public.comentarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tarea_id UUID REFERENCES public.tareas(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contenido TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create function to check if user has role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to get user empresa_id (for clients)
CREATE OR REPLACE FUNCTION public.get_user_empresa_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id
  FROM public.consultor_empresa_asignacion
  WHERE consultor_id = _user_id
  LIMIT 1
$$;

-- Create function to handle new user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre_completo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre_completo', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_empresas_updated_at
  BEFORE UPDATE ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tareas_updated_at
  BEFORE UPDATE ON public.tareas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domicilios_operacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.miembros_socios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agentes_aduanales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultor_empresa_asignacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comentarios ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'administrador'));

-- RLS Policies for empresas
CREATE POLICY "Admins can view all empresas"
  ON public.empresas FOR SELECT
  USING (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Consultores can view their assigned empresas"
  ON public.empresas FOR SELECT
  USING (
    public.has_role(auth.uid(), 'consultor') AND
    EXISTS (
      SELECT 1 FROM public.consultor_empresa_asignacion
      WHERE consultor_id = auth.uid() AND empresa_id = empresas.id
    )
  );

CREATE POLICY "Clientes can view their own empresa"
  ON public.empresas FOR SELECT
  USING (
    public.has_role(auth.uid(), 'cliente') AND
    EXISTS (
      SELECT 1 FROM public.consultor_empresa_asignacion
      WHERE consultor_id = auth.uid() AND empresa_id = empresas.id
    )
  );

CREATE POLICY "Admins can manage all empresas"
  ON public.empresas FOR ALL
  USING (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Consultores can create empresas"
  ON public.empresas FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'consultor'));

CREATE POLICY "Consultores can update their assigned empresas"
  ON public.empresas FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'consultor') AND
    EXISTS (
      SELECT 1 FROM public.consultor_empresa_asignacion
      WHERE consultor_id = auth.uid() AND empresa_id = empresas.id
    )
  );

-- RLS Policies for domicilios_operacion
CREATE POLICY "Users can view domicilios of visible empresas"
  ON public.domicilios_operacion FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.empresas
      WHERE id = domicilios_operacion.empresa_id
    )
  );

CREATE POLICY "Admins and consultores can manage domicilios"
  ON public.domicilios_operacion FOR ALL
  USING (
    public.has_role(auth.uid(), 'administrador') OR
    (public.has_role(auth.uid(), 'consultor') AND
     EXISTS (
       SELECT 1 FROM public.consultor_empresa_asignacion
       WHERE consultor_id = auth.uid() AND empresa_id = domicilios_operacion.empresa_id
     ))
  );

-- RLS Policies for miembros_socios
CREATE POLICY "Users can view miembros of visible empresas"
  ON public.miembros_socios FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.empresas
      WHERE id = miembros_socios.empresa_id
    )
  );

CREATE POLICY "Admins and consultores can manage miembros"
  ON public.miembros_socios FOR ALL
  USING (
    public.has_role(auth.uid(), 'administrador') OR
    (public.has_role(auth.uid(), 'consultor') AND
     EXISTS (
       SELECT 1 FROM public.consultor_empresa_asignacion
       WHERE consultor_id = auth.uid() AND empresa_id = miembros_socios.empresa_id
     ))
  );

-- RLS Policies for agentes_aduanales
CREATE POLICY "Users can view agentes of visible empresas"
  ON public.agentes_aduanales FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.empresas
      WHERE id = agentes_aduanales.empresa_id
    )
  );

CREATE POLICY "Admins and consultores can manage agentes"
  ON public.agentes_aduanales FOR ALL
  USING (
    public.has_role(auth.uid(), 'administrador') OR
    (public.has_role(auth.uid(), 'consultor') AND
     EXISTS (
       SELECT 1 FROM public.consultor_empresa_asignacion
       WHERE consultor_id = auth.uid() AND empresa_id = agentes_aduanales.empresa_id
     ))
  );

-- RLS Policies for consultor_empresa_asignacion
CREATE POLICY "Admins can view all asignaciones"
  ON public.consultor_empresa_asignacion FOR SELECT
  USING (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Consultores can view their asignaciones"
  ON public.consultor_empresa_asignacion FOR SELECT
  USING (auth.uid() = consultor_id);

CREATE POLICY "Clientes can view their empresa asignaciones"
  ON public.consultor_empresa_asignacion FOR SELECT
  USING (
    public.has_role(auth.uid(), 'cliente') AND
    EXISTS (
      SELECT 1 FROM public.consultor_empresa_asignacion cea
      WHERE cea.consultor_id = auth.uid() AND cea.empresa_id = consultor_empresa_asignacion.empresa_id
    )
  );

CREATE POLICY "Admins can manage asignaciones"
  ON public.consultor_empresa_asignacion FOR ALL
  USING (public.has_role(auth.uid(), 'administrador'));

-- RLS Policies for tareas
CREATE POLICY "Admins can view all tareas"
  ON public.tareas FOR SELECT
  USING (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Consultores can view tareas of their empresas"
  ON public.tareas FOR SELECT
  USING (
    public.has_role(auth.uid(), 'consultor') AND
    EXISTS (
      SELECT 1 FROM public.consultor_empresa_asignacion
      WHERE consultor_id = auth.uid() AND empresa_id = tareas.empresa_id
    )
  );

CREATE POLICY "Clientes can view tareas of their empresa"
  ON public.tareas FOR SELECT
  USING (
    public.has_role(auth.uid(), 'cliente') AND
    EXISTS (
      SELECT 1 FROM public.consultor_empresa_asignacion
      WHERE consultor_id = auth.uid() AND empresa_id = tareas.empresa_id
    )
  );

CREATE POLICY "Admins can manage all tareas"
  ON public.tareas FOR ALL
  USING (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Consultores can manage tareas of their empresas"
  ON public.tareas FOR ALL
  USING (
    public.has_role(auth.uid(), 'consultor') AND
    EXISTS (
      SELECT 1 FROM public.consultor_empresa_asignacion
      WHERE consultor_id = auth.uid() AND empresa_id = tareas.empresa_id
    )
  );

CREATE POLICY "Clientes can create tareas for their empresa"
  ON public.tareas FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'cliente') AND
    EXISTS (
      SELECT 1 FROM public.consultor_empresa_asignacion
      WHERE consultor_id = auth.uid() AND empresa_id = tareas.empresa_id
    )
  );

CREATE POLICY "Clientes can update tareas of their empresa"
  ON public.tareas FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'cliente') AND
    EXISTS (
      SELECT 1 FROM public.consultor_empresa_asignacion
      WHERE consultor_id = auth.uid() AND empresa_id = tareas.empresa_id
    )
  );

-- RLS Policies for comentarios
CREATE POLICY "Users can view comentarios of visible tareas"
  ON public.comentarios FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tareas
      WHERE id = comentarios.tarea_id
    )
  );

CREATE POLICY "Authenticated users can create comentarios"
  ON public.comentarios FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comentarios"
  ON public.comentarios FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comentarios"
  ON public.comentarios FOR DELETE
  USING (auth.uid() = user_id);