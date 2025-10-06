export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agentes_aduanales: {
        Row: {
          created_at: string | null
          empresa_id: string
          estado: string | null
          id: string
          nombre_agente: string
          numero_patente: string
        }
        Insert: {
          created_at?: string | null
          empresa_id: string
          estado?: string | null
          id?: string
          nombre_agente: string
          numero_patente: string
        }
        Update: {
          created_at?: string | null
          empresa_id?: string
          estado?: string | null
          id?: string
          nombre_agente?: string
          numero_patente?: string
        }
        Relationships: [
          {
            foreignKeyName: "agentes_aduanales_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias_tareas: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          descripcion: string | null
          id: string
          nombre: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      comentarios: {
        Row: {
          contenido: string
          created_at: string | null
          id: string
          tarea_id: string
          user_id: string
        }
        Insert: {
          contenido: string
          created_at?: string | null
          id?: string
          tarea_id: string
          user_id: string
        }
        Update: {
          contenido?: string
          created_at?: string | null
          id?: string
          tarea_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comentarios_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "tareas"
            referencedColumns: ["id"]
          },
        ]
      }
      consultor_empresa_asignacion: {
        Row: {
          asignado_por: string | null
          consultor_id: string
          created_at: string | null
          empresa_id: string
        }
        Insert: {
          asignado_por?: string | null
          consultor_id: string
          created_at?: string | null
          empresa_id: string
        }
        Update: {
          asignado_por?: string | null
          consultor_id?: string
          created_at?: string | null
          empresa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultor_empresa_asignacion_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      domicilios_operacion: {
        Row: {
          created_at: string | null
          domicilio: string
          empresa_id: string
          id: string
          tipo: string | null
        }
        Insert: {
          created_at?: string | null
          domicilio: string
          empresa_id: string
          id?: string
          tipo?: string | null
        }
        Update: {
          created_at?: string | null
          domicilio?: string
          empresa_id?: string
          id?: string
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "domicilios_operacion_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          anexo24_proveedor_software: string | null
          created_at: string | null
          created_by: string | null
          datos_notario: string | null
          domicilio_fiscal: string
          fecha_constitucion: string | null
          id: string
          immex_domicilios: string[] | null
          immex_fecha_fin: string | null
          immex_fecha_inicio: string | null
          immex_numero: string | null
          immex_tipo: string | null
          numero_escritura: string | null
          padron_general_estado: string | null
          padron_general_numero: string | null
          padrones_sectoriales: Json | null
          prosec_domicilios: string[] | null
          prosec_fecha_fin: string | null
          prosec_fecha_inicio: string | null
          prosec_numero: string | null
          prosec_sector: string | null
          razon_social: string
          representante_legal_nombre: string | null
          representante_legal_poder: string | null
          rfc: string
          telefono: string | null
          updated_at: string | null
        }
        Insert: {
          anexo24_proveedor_software?: string | null
          created_at?: string | null
          created_by?: string | null
          datos_notario?: string | null
          domicilio_fiscal: string
          fecha_constitucion?: string | null
          id?: string
          immex_domicilios?: string[] | null
          immex_fecha_fin?: string | null
          immex_fecha_inicio?: string | null
          immex_numero?: string | null
          immex_tipo?: string | null
          numero_escritura?: string | null
          padron_general_estado?: string | null
          padron_general_numero?: string | null
          padrones_sectoriales?: Json | null
          prosec_domicilios?: string[] | null
          prosec_fecha_fin?: string | null
          prosec_fecha_inicio?: string | null
          prosec_numero?: string | null
          prosec_sector?: string | null
          razon_social: string
          representante_legal_nombre?: string | null
          representante_legal_poder?: string | null
          rfc: string
          telefono?: string | null
          updated_at?: string | null
        }
        Update: {
          anexo24_proveedor_software?: string | null
          created_at?: string | null
          created_by?: string | null
          datos_notario?: string | null
          domicilio_fiscal?: string
          fecha_constitucion?: string | null
          id?: string
          immex_domicilios?: string[] | null
          immex_fecha_fin?: string | null
          immex_fecha_inicio?: string | null
          immex_numero?: string | null
          immex_tipo?: string | null
          numero_escritura?: string | null
          padron_general_estado?: string | null
          padron_general_numero?: string | null
          padrones_sectoriales?: Json | null
          prosec_domicilios?: string[] | null
          prosec_fecha_fin?: string | null
          prosec_fecha_inicio?: string | null
          prosec_numero?: string | null
          prosec_sector?: string | null
          razon_social?: string
          representante_legal_nombre?: string | null
          representante_legal_poder?: string | null
          rfc?: string
          telefono?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      miembros_socios: {
        Row: {
          created_at: string | null
          empresa_id: string
          id: string
          nombre_completo: string
          rfc: string
        }
        Insert: {
          created_at?: string | null
          empresa_id: string
          id?: string
          nombre_completo: string
          rfc: string
        }
        Update: {
          created_at?: string | null
          empresa_id?: string
          id?: string
          nombre_completo?: string
          rfc?: string
        }
        Relationships: [
          {
            foreignKeyName: "miembros_socios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          id: string
          nombre_completo: string
          notificaciones_activas: boolean | null
          telefono: string | null
          tema_visual: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          nombre_completo: string
          notificaciones_activas?: boolean | null
          telefono?: string | null
          tema_visual?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nombre_completo?: string
          notificaciones_activas?: boolean | null
          telefono?: string | null
          tema_visual?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tareas: {
        Row: {
          archivos_adjuntos: Json | null
          categoria_id: string | null
          consultor_asignado_id: string | null
          creado_por: string
          created_at: string | null
          descripcion: string | null
          empresa_id: string
          estado: Database["public"]["Enums"]["estado_tarea"] | null
          fecha_vencimiento: string | null
          id: string
          prioridad: Database["public"]["Enums"]["prioridad_tarea"] | null
          titulo: string
          updated_at: string | null
        }
        Insert: {
          archivos_adjuntos?: Json | null
          categoria_id?: string | null
          consultor_asignado_id?: string | null
          creado_por: string
          created_at?: string | null
          descripcion?: string | null
          empresa_id: string
          estado?: Database["public"]["Enums"]["estado_tarea"] | null
          fecha_vencimiento?: string | null
          id?: string
          prioridad?: Database["public"]["Enums"]["prioridad_tarea"] | null
          titulo: string
          updated_at?: string | null
        }
        Update: {
          archivos_adjuntos?: Json | null
          categoria_id?: string | null
          consultor_asignado_id?: string | null
          creado_por?: string
          created_at?: string | null
          descripcion?: string | null
          empresa_id?: string
          estado?: Database["public"]["Enums"]["estado_tarea"] | null
          fecha_vencimiento?: string | null
          id?: string
          prioridad?: Database["public"]["Enums"]["prioridad_tarea"] | null
          titulo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tareas_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_tareas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_empresa_id: {
        Args: { _user_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "administrador" | "consultor" | "cliente"
      estado_tarea: "pendiente" | "en_progreso" | "completada" | "cancelada"
      prioridad_tarea: "alta" | "media" | "baja"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["administrador", "consultor", "cliente"],
      estado_tarea: ["pendiente", "en_progreso", "completada", "cancelada"],
      prioridad_tarea: ["alta", "media", "baja"],
    },
  },
} as const
