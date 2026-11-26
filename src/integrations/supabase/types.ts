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
      apoderados_legales: {
        Row: {
          created_at: string | null
          empresa_id: string
          id: string
          nombre: string
          poder_notarial_anio: number | null
          poder_notarial_instrumento: string | null
          poder_notarial_libro: string | null
          tipo_apoderado: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          empresa_id: string
          id?: string
          nombre: string
          poder_notarial_anio?: number | null
          poder_notarial_instrumento?: string | null
          poder_notarial_libro?: string | null
          tipo_apoderado?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          empresa_id?: string
          id?: string
          nombre?: string
          poder_notarial_anio?: number | null
          poder_notarial_instrumento?: string | null
          poder_notarial_libro?: string | null
          tipo_apoderado?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apoderados_legales_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      automation_logs: {
        Row: {
          ejecutada: boolean | null
          error: string | null
          executed_at: string | null
          id: string
          resultado: string | null
          rule_id: string | null
          tarea_id: string | null
        }
        Insert: {
          ejecutada?: boolean | null
          error?: string | null
          executed_at?: string | null
          id?: string
          resultado?: string | null
          rule_id?: string | null
          tarea_id?: string | null
        }
        Update: {
          ejecutada?: boolean | null
          error?: string | null
          executed_at?: string | null
          id?: string
          resultado?: string | null
          rule_id?: string | null
          tarea_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "tareas"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          acciones: Json | null
          activa: boolean | null
          condiciones: Json | null
          created_at: string | null
          created_by: string | null
          descripcion: string | null
          id: string
          nombre: string
          prioridad: number | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          acciones?: Json | null
          activa?: boolean | null
          condiciones?: Json | null
          created_at?: string | null
          created_by?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
          prioridad?: number | null
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          acciones?: Json | null
          activa?: boolean | null
          condiciones?: Json | null
          created_at?: string | null
          created_by?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
          prioridad?: number | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: []
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
      client_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          empresa_id: string
          expires_at: string
          id: string
          invited_by: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          empresa_id: string
          expires_at: string
          id?: string
          invited_by: string
          status?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          empresa_id?: string
          expires_at?: string
          id?: string
          invited_by?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_invitations_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
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
      custom_fields: {
        Row: {
          activo: boolean | null
          created_at: string | null
          created_by: string | null
          descripcion: string | null
          id: string
          nombre: string
          opciones: Json | null
          orden: number | null
          requerido: boolean | null
          tipo: string
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
          opciones?: Json | null
          orden?: number | null
          requerido?: boolean | null
          tipo: string
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
          opciones?: Json | null
          orden?: number | null
          requerido?: boolean | null
          tipo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      documentos: {
        Row: {
          archivo_nombre: string
          archivo_tamano: number | null
          archivo_url: string
          categoria: string | null
          created_at: string | null
          descripcion: string | null
          empresa_id: string
          fecha_documento: string | null
          fecha_vencimiento: string | null
          id: string
          nombre: string
          subido_por: string | null
          tipo_documento: string
          updated_at: string | null
        }
        Insert: {
          archivo_nombre: string
          archivo_tamano?: number | null
          archivo_url: string
          categoria?: string | null
          created_at?: string | null
          descripcion?: string | null
          empresa_id: string
          fecha_documento?: string | null
          fecha_vencimiento?: string | null
          id?: string
          nombre: string
          subido_por?: string | null
          tipo_documento: string
          updated_at?: string | null
        }
        Update: {
          archivo_nombre?: string
          archivo_tamano?: number | null
          archivo_url?: string
          categoria?: string | null
          created_at?: string | null
          descripcion?: string | null
          empresa_id?: string
          fecha_documento?: string | null
          fecha_vencimiento?: string | null
          id?: string
          nombre?: string
          subido_por?: string | null
          tipo_documento?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_empresa_id_fkey"
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
          programa: string | null
          tipo: string | null
        }
        Insert: {
          created_at?: string | null
          domicilio: string
          empresa_id: string
          id?: string
          programa?: string | null
          tipo?: string | null
        }
        Update: {
          created_at?: string | null
          domicilio?: string
          empresa_id?: string
          id?: string
          programa?: string | null
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
      empresa_programas: {
        Row: {
          activo: boolean
          created_at: string
          empresa_id: string
          fecha_inicio: string | null
          id: string
          programa: string
          sectores: string[] | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          empresa_id: string
          fecha_inicio?: string | null
          id?: string
          programa: string
          sectores?: string[] | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          empresa_id?: string
          fecha_inicio?: string | null
          id?: string
          programa?: string
          sectores?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresa_programas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          actividad_economica: string | null
          anexo24_proveedor_software: string | null
          cert_iva_ieps_fecha_autorizacion: string | null
          cert_iva_ieps_fecha_renovar: string | null
          cert_iva_ieps_fecha_ultima_renovacion: string | null
          cert_iva_ieps_fecha_vencimiento: string | null
          cert_iva_ieps_nota: string | null
          cert_iva_ieps_oficio: string | null
          cert_iva_ieps_rubro: string | null
          created_at: string | null
          created_by: string | null
          datos_notario: string | null
          domicilio_fiscal: string
          fecha_constitucion: string | null
          id: string
          immex_fecha_autorizacion: string | null
          immex_fecha_fin: string | null
          immex_fecha_inicio: string | null
          immex_modalidad: string | null
          immex_numero: string | null
          immex_periodo_renovacion_meses: number | null
          immex_tipo: string | null
          matriz_seguridad_fecha_renovar: string | null
          matriz_seguridad_fecha_vencimiento: string | null
          numero_escritura: string | null
          padron_general_estado: string | null
          padron_general_numero: string | null
          padron_importadores_sectores: Json | null
          padrones_sectoriales: Json | null
          prosec_fecha_autorizacion: string | null
          prosec_fecha_fin: string | null
          prosec_fecha_inicio: string | null
          prosec_fecha_siguiente_renovacion: string | null
          prosec_fecha_ultima_renovacion: string | null
          prosec_modalidad: string | null
          prosec_numero: string | null
          prosec_sector: string | null
          prosec_sectores: Json | null
          razon_social: string
          representante_legal_nombre: string | null
          representante_legal_poder: string | null
          rfc: string
          telefono: string | null
          updated_at: string | null
        }
        Insert: {
          actividad_economica?: string | null
          anexo24_proveedor_software?: string | null
          cert_iva_ieps_fecha_autorizacion?: string | null
          cert_iva_ieps_fecha_renovar?: string | null
          cert_iva_ieps_fecha_ultima_renovacion?: string | null
          cert_iva_ieps_fecha_vencimiento?: string | null
          cert_iva_ieps_nota?: string | null
          cert_iva_ieps_oficio?: string | null
          cert_iva_ieps_rubro?: string | null
          created_at?: string | null
          created_by?: string | null
          datos_notario?: string | null
          domicilio_fiscal: string
          fecha_constitucion?: string | null
          id?: string
          immex_fecha_autorizacion?: string | null
          immex_fecha_fin?: string | null
          immex_fecha_inicio?: string | null
          immex_modalidad?: string | null
          immex_numero?: string | null
          immex_periodo_renovacion_meses?: number | null
          immex_tipo?: string | null
          matriz_seguridad_fecha_renovar?: string | null
          matriz_seguridad_fecha_vencimiento?: string | null
          numero_escritura?: string | null
          padron_general_estado?: string | null
          padron_general_numero?: string | null
          padron_importadores_sectores?: Json | null
          padrones_sectoriales?: Json | null
          prosec_fecha_autorizacion?: string | null
          prosec_fecha_fin?: string | null
          prosec_fecha_inicio?: string | null
          prosec_fecha_siguiente_renovacion?: string | null
          prosec_fecha_ultima_renovacion?: string | null
          prosec_modalidad?: string | null
          prosec_numero?: string | null
          prosec_sector?: string | null
          prosec_sectores?: Json | null
          razon_social: string
          representante_legal_nombre?: string | null
          representante_legal_poder?: string | null
          rfc: string
          telefono?: string | null
          updated_at?: string | null
        }
        Update: {
          actividad_economica?: string | null
          anexo24_proveedor_software?: string | null
          cert_iva_ieps_fecha_autorizacion?: string | null
          cert_iva_ieps_fecha_renovar?: string | null
          cert_iva_ieps_fecha_ultima_renovacion?: string | null
          cert_iva_ieps_fecha_vencimiento?: string | null
          cert_iva_ieps_nota?: string | null
          cert_iva_ieps_oficio?: string | null
          cert_iva_ieps_rubro?: string | null
          created_at?: string | null
          created_by?: string | null
          datos_notario?: string | null
          domicilio_fiscal?: string
          fecha_constitucion?: string | null
          id?: string
          immex_fecha_autorizacion?: string | null
          immex_fecha_fin?: string | null
          immex_fecha_inicio?: string | null
          immex_modalidad?: string | null
          immex_numero?: string | null
          immex_periodo_renovacion_meses?: number | null
          immex_tipo?: string | null
          matriz_seguridad_fecha_renovar?: string | null
          matriz_seguridad_fecha_vencimiento?: string | null
          numero_escritura?: string | null
          padron_general_estado?: string | null
          padron_general_numero?: string | null
          padron_importadores_sectores?: Json | null
          padrones_sectoriales?: Json | null
          prosec_fecha_autorizacion?: string | null
          prosec_fecha_fin?: string | null
          prosec_fecha_inicio?: string | null
          prosec_fecha_siguiente_renovacion?: string | null
          prosec_fecha_ultima_renovacion?: string | null
          prosec_modalidad?: string | null
          prosec_numero?: string | null
          prosec_sector?: string | null
          prosec_sectores?: Json | null
          razon_social?: string
          representante_legal_nombre?: string | null
          representante_legal_poder?: string | null
          rfc?: string
          telefono?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      feedback_clientes: {
        Row: {
          created_at: string
          id: string
          q1_razon_login: string
          q2_semaforo_rating: number
          q3_friccion: string | null
          q4_varita_magica: string | null
          q5_retencion: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          q1_razon_login: string
          q2_semaforo_rating: number
          q3_friccion?: string | null
          q4_varita_magica?: string | null
          q5_retencion: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          q1_razon_login?: string
          q2_semaforo_rating?: number
          q3_friccion?: string | null
          q4_varita_magica?: string | null
          q5_retencion?: string
          user_id?: string
        }
        Relationships: []
      }
      mensajes: {
        Row: {
          asunto: string
          contenido: string
          created_at: string | null
          destinatario_id: string
          empresa_id: string | null
          id: string
          leido: boolean | null
          remitente_id: string
          updated_at: string | null
        }
        Insert: {
          asunto: string
          contenido: string
          created_at?: string | null
          destinatario_id: string
          empresa_id?: string | null
          id?: string
          leido?: boolean | null
          remitente_id: string
          updated_at?: string | null
        }
        Update: {
          asunto?: string
          contenido?: string
          created_at?: string | null
          destinatario_id?: string
          empresa_id?: string | null
          id?: string
          leido?: boolean | null
          remitente_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mensajes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
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
      notificaciones: {
        Row: {
          contenido: string | null
          created_at: string | null
          id: string
          leida: boolean | null
          referencia_id: string | null
          referencia_tipo: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          contenido?: string | null
          created_at?: string | null
          id?: string
          leida?: boolean | null
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Update: {
          contenido?: string | null
          created_at?: string | null
          id?: string
          leida?: boolean | null
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          canal: string
          contenido: string | null
          created_at: string | null
          error_mensaje: string | null
          estado: string
          id: string
          referencia_id: string | null
          referencia_tipo: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          canal: string
          contenido?: string | null
          created_at?: string | null
          error_mensaje?: string | null
          estado?: string
          id?: string
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Update: {
          canal?: string
          contenido?: string | null
          created_at?: string | null
          error_mensaje?: string | null
          estado?: string
          id?: string
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          enabled: boolean
          id: string
          name: string
          notification_key: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          enabled?: boolean
          id?: string
          name: string
          notification_key: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          enabled?: boolean
          id?: string
          name?: string
          notification_key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      obligacion_cumplimientos: {
        Row: {
          completada: boolean
          completada_en: string
          completada_por: string | null
          created_at: string
          empresa_id: string | null
          evento_id: string | null
          evidencia_url: string | null
          id: string
          notas: string | null
          obligacion_id: string
          ocurrencia_id: string | null
          periodo_key: string
          reemplazado_por: string | null
          updated_at: string
          vigente: boolean
        }
        Insert: {
          completada?: boolean
          completada_en?: string
          completada_por?: string | null
          created_at?: string
          empresa_id?: string | null
          evento_id?: string | null
          evidencia_url?: string | null
          id?: string
          notas?: string | null
          obligacion_id: string
          ocurrencia_id?: string | null
          periodo_key: string
          reemplazado_por?: string | null
          updated_at?: string
          vigente?: boolean
        }
        Update: {
          completada?: boolean
          completada_en?: string
          completada_por?: string | null
          created_at?: string
          empresa_id?: string | null
          evento_id?: string | null
          evidencia_url?: string | null
          id?: string
          notas?: string | null
          obligacion_id?: string
          ocurrencia_id?: string | null
          periodo_key?: string
          reemplazado_por?: string | null
          updated_at?: string
          vigente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "cumplimientos_evento_empresa_v2"
            columns: ["evento_id", "obligacion_id", "empresa_id"]
            isOneToOne: false
            referencedRelation: "obligacion_eventos"
            referencedColumns: ["id", "obligacion_id", "empresa_id"]
          },
          {
            foreignKeyName: "obligacion_cumplimientos_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "obligacion_eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligacion_cumplimientos_obligacion_id_fkey"
            columns: ["obligacion_id"]
            isOneToOne: false
            referencedRelation: "obligaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligacion_cumplimientos_ocurrencia_id_fkey"
            columns: ["ocurrencia_id"]
            isOneToOne: false
            referencedRelation: "obligacion_ocurrencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligacion_cumplimientos_reemplazado_por_fkey"
            columns: ["reemplazado_por"]
            isOneToOne: false
            referencedRelation: "obligacion_cumplimientos"
            referencedColumns: ["id"]
          },
        ]
      }
      obligacion_eventos: {
        Row: {
          creado_por: string
          created_at: string
          empresa_id: string
          evidencia_path: string | null
          fecha_evento: string
          id: string
          idempotency_key: string
          obligacion_id: string
          tipo_evento: string
        }
        Insert: {
          creado_por?: string
          created_at?: string
          empresa_id: string
          evidencia_path?: string | null
          fecha_evento: string
          id?: string
          idempotency_key: string
          obligacion_id: string
          tipo_evento: string
        }
        Update: {
          creado_por?: string
          created_at?: string
          empresa_id?: string
          evidencia_path?: string | null
          fecha_evento?: string
          id?: string
          idempotency_key?: string
          obligacion_id?: string
          tipo_evento?: string
        }
        Relationships: [
          {
            foreignKeyName: "obligacion_eventos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligacion_eventos_obligacion_id_empresa_id_fkey"
            columns: ["obligacion_id", "empresa_id"]
            isOneToOne: false
            referencedRelation: "obligaciones"
            referencedColumns: ["id", "empresa_id"]
          },
        ]
      }
      obligacion_ocurrencias: {
        Row: {
          articulos_snapshot: string | null
          catalogo_version: number | null
          created_at: string
          empresa_id: string
          estado: string
          evento_id: string | null
          fecha_objetivo_interna: string | null
          fecha_vencimiento: string
          id: string
          obligacion_id: string
          origen_fecha: string
          periodo_key: string
          regla_id: string | null
          regla_snapshot: Json | null
          updated_at: string
        }
        Insert: {
          articulos_snapshot?: string | null
          catalogo_version?: number | null
          created_at?: string
          empresa_id: string
          estado?: string
          evento_id?: string | null
          fecha_objetivo_interna?: string | null
          fecha_vencimiento: string
          id?: string
          obligacion_id: string
          origen_fecha?: string
          periodo_key: string
          regla_id?: string | null
          regla_snapshot?: Json | null
          updated_at?: string
        }
        Update: {
          articulos_snapshot?: string | null
          catalogo_version?: number | null
          created_at?: string
          empresa_id?: string
          estado?: string
          evento_id?: string | null
          fecha_objetivo_interna?: string | null
          fecha_vencimiento?: string
          id?: string
          obligacion_id?: string
          origen_fecha?: string
          periodo_key?: string
          regla_id?: string | null
          regla_snapshot?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "obligacion_ocurrencias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligacion_ocurrencias_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "obligacion_eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligacion_ocurrencias_obligacion_id_fkey"
            columns: ["obligacion_id"]
            isOneToOne: false
            referencedRelation: "obligaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligacion_ocurrencias_regla_id_fkey"
            columns: ["regla_id"]
            isOneToOne: false
            referencedRelation: "obligacion_reglas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocurrencias_evento_empresa_v2"
            columns: ["evento_id", "obligacion_id", "empresa_id"]
            isOneToOne: false
            referencedRelation: "obligacion_eventos"
            referencedColumns: ["id", "obligacion_id", "empresa_id"]
          },
        ]
      }
      obligacion_reglas: {
        Row: {
          aplicabilidad: Json
          catalogo_id: string | null
          clasificacion_estado: string
          created_at: string
          created_by: string | null
          fuente_referencia: string | null
          fuente_url: string | null
          id: string
          importacion_referencia: string | null
          normativa_estado: string
          obligacion_id: string | null
          origen_control: string
          parametros: Json
          tipo_control: string
          validada_en: string | null
          validada_por: string | null
          version: number
        }
        Insert: {
          aplicabilidad?: Json
          catalogo_id?: string | null
          clasificacion_estado?: string
          created_at?: string
          created_by?: string | null
          fuente_referencia?: string | null
          fuente_url?: string | null
          id?: string
          importacion_referencia?: string | null
          normativa_estado?: string
          obligacion_id?: string | null
          origen_control: string
          parametros?: Json
          tipo_control: string
          validada_en?: string | null
          validada_por?: string | null
          version: number
        }
        Update: {
          aplicabilidad?: Json
          catalogo_id?: string | null
          clasificacion_estado?: string
          created_at?: string
          created_by?: string | null
          fuente_referencia?: string | null
          fuente_url?: string | null
          id?: string
          importacion_referencia?: string | null
          normativa_estado?: string
          obligacion_id?: string | null
          origen_control?: string
          parametros?: Json
          tipo_control?: string
          validada_en?: string | null
          validada_por?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "obligacion_reglas_catalogo_id_fkey"
            columns: ["catalogo_id"]
            isOneToOne: false
            referencedRelation: "obligaciones_catalogo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligacion_reglas_obligacion_id_fkey"
            columns: ["obligacion_id"]
            isOneToOne: false
            referencedRelation: "obligaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      obligacion_relaciones: {
        Row: {
          created_at: string
          created_by: string
          empresa_id: string
          id: string
          obligacion_destino_id: string
          obligacion_origen_id: string
          tipo: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          empresa_id: string
          id?: string
          obligacion_destino_id: string
          obligacion_origen_id: string
          tipo: string
        }
        Update: {
          created_at?: string
          created_by?: string
          empresa_id?: string
          id?: string
          obligacion_destino_id?: string
          obligacion_origen_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "obligacion_relaciones_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligacion_relaciones_obligacion_destino_id_empresa_id_fkey"
            columns: ["obligacion_destino_id", "empresa_id"]
            isOneToOne: false
            referencedRelation: "obligaciones"
            referencedColumns: ["id", "empresa_id"]
          },
          {
            foreignKeyName: "obligacion_relaciones_obligacion_origen_id_empresa_id_fkey"
            columns: ["obligacion_origen_id", "empresa_id"]
            isOneToOne: false
            referencedRelation: "obligaciones"
            referencedColumns: ["id", "empresa_id"]
          },
        ]
      }
      obligacion_responsables: {
        Row: {
          created_at: string | null
          id: string
          obligacion_id: string
          tipo: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          obligacion_id: string
          tipo?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          obligacion_id?: string
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "obligacion_responsables_obligacion_id_fkey"
            columns: ["obligacion_id"]
            isOneToOne: false
            referencedRelation: "obligaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      obligacion_revisiones: {
        Row: {
          empresa_id: string
          evidencia_path: string | null
          id: string
          notas: string | null
          obligacion_id: string
          proxima_revision: string | null
          resultado: string
          revisada_en: string
          revisada_por: string
        }
        Insert: {
          empresa_id: string
          evidencia_path?: string | null
          id?: string
          notas?: string | null
          obligacion_id: string
          proxima_revision?: string | null
          resultado: string
          revisada_en?: string
          revisada_por?: string
        }
        Update: {
          empresa_id?: string
          evidencia_path?: string | null
          id?: string
          notas?: string | null
          obligacion_id?: string
          proxima_revision?: string | null
          resultado?: string
          revisada_en?: string
          revisada_por?: string
        }
        Relationships: [
          {
            foreignKeyName: "obligacion_revisiones_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligacion_revisiones_obligacion_id_empresa_id_fkey"
            columns: ["obligacion_id", "empresa_id"]
            isOneToOne: false
            referencedRelation: "obligaciones"
            referencedColumns: ["id", "empresa_id"]
          },
        ]
      }
      obligaciones: {
        Row: {
          activa: boolean
          articulos: string | null
          catalogo_id: string | null
          categoria: string
          created_at: string
          created_by: string | null
          descripcion: string | null
          empresa_id: string
          estado: string
          fecha_autorizacion: string | null
          fecha_fin: string | null
          fecha_inicio: string | null
          fecha_renovacion: string | null
          fecha_vencimiento: string | null
          id: string
          nombre: string
          notas: string | null
          numero_oficio: string | null
          presentacion: string | null
          responsable_id: string | null
          responsable_tipo: string | null
          updated_at: string
        }
        Insert: {
          activa?: boolean
          articulos?: string | null
          catalogo_id?: string | null
          categoria: string
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          empresa_id: string
          estado?: string
          fecha_autorizacion?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          fecha_renovacion?: string | null
          fecha_vencimiento?: string | null
          id?: string
          nombre: string
          notas?: string | null
          numero_oficio?: string | null
          presentacion?: string | null
          responsable_id?: string | null
          responsable_tipo?: string | null
          updated_at?: string
        }
        Update: {
          activa?: boolean
          articulos?: string | null
          catalogo_id?: string | null
          categoria?: string
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          empresa_id?: string
          estado?: string
          fecha_autorizacion?: string | null
          fecha_fin?: string | null
          fecha_inicio?: string | null
          fecha_renovacion?: string | null
          fecha_vencimiento?: string | null
          id?: string
          nombre?: string
          notas?: string | null
          numero_oficio?: string | null
          presentacion?: string | null
          responsable_id?: string | null
          responsable_tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "obligaciones_catalogo_id_fkey"
            columns: ["catalogo_id"]
            isOneToOne: false
            referencedRelation: "obligaciones_catalogo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obligaciones_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      obligaciones_catalogo: {
        Row: {
          activo: boolean
          articulos: string | null
          categoria: string | null
          created_at: string
          created_by: string | null
          descripcion: string | null
          dia_vencimiento: number | null
          frecuencia_tipo: string | null
          id: string
          mes_vencimiento: number | null
          nombre: string
          notas_internas: string | null
          obligatorio: boolean
          orden: number
          presentacion: string | null
          programa: string
          updated_at: string
          usar_ultimo_dia_habil: boolean
          version: number
          vigente_desde: string
          vigente_hasta: string | null
        }
        Insert: {
          activo?: boolean
          articulos?: string | null
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          dia_vencimiento?: number | null
          frecuencia_tipo?: string | null
          id?: string
          mes_vencimiento?: number | null
          nombre: string
          notas_internas?: string | null
          obligatorio?: boolean
          orden?: number
          presentacion?: string | null
          programa: string
          updated_at?: string
          usar_ultimo_dia_habil?: boolean
          version?: number
          vigente_desde?: string
          vigente_hasta?: string | null
        }
        Update: {
          activo?: boolean
          articulos?: string | null
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          dia_vencimiento?: number | null
          frecuencia_tipo?: string | null
          id?: string
          mes_vencimiento?: number | null
          nombre?: string
          notas_internas?: string | null
          obligatorio?: boolean
          orden?: number
          presentacion?: string | null
          programa?: string
          updated_at?: string
          usar_ultimo_dia_habil?: boolean
          version?: number
          vigente_desde?: string
          vigente_hasta?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          empresa_id: string | null
          id: string
          nombre_completo: string
          notificaciones_activas: boolean | null
          resumen_frecuencia: string | null
          resumen_hora: number | null
          telefono: string | null
          tema_visual: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          empresa_id?: string | null
          id: string
          nombre_completo: string
          notificaciones_activas?: boolean | null
          resumen_frecuencia?: string | null
          resumen_hora?: number | null
          telefono?: string | null
          tema_visual?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          empresa_id?: string | null
          id?: string
          nombre_completo?: string
          notificaciones_activas?: boolean | null
          resumen_frecuencia?: string | null
          resumen_hora?: number | null
          telefono?: string | null
          tema_visual?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_events: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string
        }
        Relationships: []
      }
      reminder_rules: {
        Row: {
          activa: boolean | null
          created_at: string | null
          created_by: string | null
          dias_antes: number
          empresa_id: string | null
          id: string
          nombre: string
          tipo: string
          ultima_ejecucion: string | null
          updated_at: string | null
        }
        Insert: {
          activa?: boolean | null
          created_at?: string | null
          created_by?: string | null
          dias_antes: number
          empresa_id?: string | null
          id?: string
          nombre: string
          tipo: string
          ultima_ejecucion?: string | null
          updated_at?: string | null
        }
        Update: {
          activa?: boolean | null
          created_at?: string | null
          created_by?: string | null
          dias_antes?: number
          empresa_id?: string | null
          id?: string
          nombre?: string
          tipo?: string
          ultima_ejecucion?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminder_rules_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      revision_programas_envios: {
        Row: {
          enviado_en: string | null
          estado: string
          iniciado_en: string
          mensaje_id: string
        }
        Insert: {
          enviado_en?: string | null
          estado: string
          iniciado_en?: string
          mensaje_id: string
        }
        Update: {
          enviado_en?: string | null
          estado?: string
          iniciado_en?: string
          mensaje_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revision_programas_envios_mensaje_id_fkey"
            columns: ["mensaje_id"]
            isOneToOne: true
            referencedRelation: "mensajes"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitudes_servicio: {
        Row: {
          asignado_a: string | null
          asunto: string
          created_at: string | null
          descripcion: string
          empresa_id: string
          estado: string | null
          fecha_respuesta: string | null
          fecha_solicitud: string | null
          id: string
          prioridad: string | null
          respuesta: string | null
          solicitante_id: string
          updated_at: string | null
        }
        Insert: {
          asignado_a?: string | null
          asunto: string
          created_at?: string | null
          descripcion: string
          empresa_id: string
          estado?: string | null
          fecha_respuesta?: string | null
          fecha_solicitud?: string | null
          id?: string
          prioridad?: string | null
          respuesta?: string | null
          solicitante_id: string
          updated_at?: string | null
        }
        Update: {
          asignado_a?: string | null
          asunto?: string
          created_at?: string | null
          descripcion?: string
          empresa_id?: string
          estado?: string | null
          fecha_respuesta?: string | null
          fecha_solicitud?: string | null
          id?: string
          prioridad?: string | null
          respuesta?: string | null
          solicitante_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_servicio_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      subtareas: {
        Row: {
          asignado_a: string | null
          completada: boolean | null
          completado_por: string | null
          created_at: string | null
          descripcion: string | null
          fecha_completado: string | null
          id: string
          orden: number | null
          tarea_id: string
          titulo: string
          updated_at: string | null
        }
        Insert: {
          asignado_a?: string | null
          completada?: boolean | null
          completado_por?: string | null
          created_at?: string | null
          descripcion?: string | null
          fecha_completado?: string | null
          id?: string
          orden?: number | null
          tarea_id: string
          titulo: string
          updated_at?: string | null
        }
        Update: {
          asignado_a?: string | null
          completada?: boolean | null
          completado_por?: string | null
          created_at?: string | null
          descripcion?: string | null
          fecha_completado?: string | null
          id?: string
          orden?: number | null
          tarea_id?: string
          titulo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subtareas_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "tareas"
            referencedColumns: ["id"]
          },
        ]
      }
      tarea_asignaciones: {
        Row: {
          asignado_por: string | null
          consultor_id: string
          created_at: string | null
          id: string
          rol: string | null
          tarea_id: string
        }
        Insert: {
          asignado_por?: string | null
          consultor_id: string
          created_at?: string | null
          id?: string
          rol?: string | null
          tarea_id: string
        }
        Update: {
          asignado_por?: string | null
          consultor_id?: string
          created_at?: string | null
          id?: string
          rol?: string | null
          tarea_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarea_asignaciones_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "tareas"
            referencedColumns: ["id"]
          },
        ]
      }
      tarea_custom_field_values: {
        Row: {
          created_at: string | null
          custom_field_id: string
          id: string
          tarea_id: string
          updated_at: string | null
          valor: string | null
        }
        Insert: {
          created_at?: string | null
          custom_field_id: string
          id?: string
          tarea_id: string
          updated_at?: string | null
          valor?: string | null
        }
        Update: {
          created_at?: string | null
          custom_field_id?: string
          id?: string
          tarea_id?: string
          updated_at?: string | null
          valor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tarea_custom_field_values_custom_field_id_fkey"
            columns: ["custom_field_id"]
            isOneToOne: false
            referencedRelation: "custom_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarea_custom_field_values_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "tareas"
            referencedColumns: ["id"]
          },
        ]
      }
      tarea_dependencias: {
        Row: {
          created_at: string | null
          created_by: string | null
          depende_de_tarea_id: string
          id: string
          tarea_id: string
          tipo: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          depende_de_tarea_id: string
          id?: string
          tarea_id: string
          tipo?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          depende_de_tarea_id?: string
          id?: string
          tarea_id?: string
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tarea_dependencias_depende_de_tarea_id_fkey"
            columns: ["depende_de_tarea_id"]
            isOneToOne: false
            referencedRelation: "tareas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarea_dependencias_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "tareas"
            referencedColumns: ["id"]
          },
        ]
      }
      tarea_templates: {
        Row: {
          campos_personalizados: Json | null
          categoria_id: string | null
          checklist: Json | null
          created_at: string | null
          created_by: string | null
          descripcion: string | null
          descripcion_template: string | null
          duracion_dias: number | null
          es_publico: boolean | null
          id: string
          nombre: string
          prioridad: string | null
          subtareas_template: Json | null
          titulo_template: string
          updated_at: string | null
          veces_usado: number | null
        }
        Insert: {
          campos_personalizados?: Json | null
          categoria_id?: string | null
          checklist?: Json | null
          created_at?: string | null
          created_by?: string | null
          descripcion?: string | null
          descripcion_template?: string | null
          duracion_dias?: number | null
          es_publico?: boolean | null
          id?: string
          nombre: string
          prioridad?: string | null
          subtareas_template?: Json | null
          titulo_template: string
          updated_at?: string | null
          veces_usado?: number | null
        }
        Update: {
          campos_personalizados?: Json | null
          categoria_id?: string | null
          checklist?: Json | null
          created_at?: string | null
          created_by?: string | null
          descripcion?: string | null
          descripcion_template?: string | null
          duracion_dias?: number | null
          es_publico?: boolean | null
          id?: string
          nombre?: string
          prioridad?: string | null
          subtareas_template?: Json | null
          titulo_template?: string
          updated_at?: string | null
          veces_usado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tarea_templates_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_tareas"
            referencedColumns: ["id"]
          },
        ]
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
          es_recurrente: boolean | null
          estado: Database["public"]["Enums"]["estado_tarea"] | null
          fecha_fin_recurrencia: string | null
          fecha_inicio_recurrencia: string | null
          fecha_vencimiento: string | null
          frecuencia_recurrencia: string | null
          id: string
          intervalo_recurrencia: number | null
          ocurrencia_id: string | null
          prioridad: Database["public"]["Enums"]["prioridad_tarea"] | null
          proxima_generacion: string | null
          tarea_padre_id: string | null
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
          es_recurrente?: boolean | null
          estado?: Database["public"]["Enums"]["estado_tarea"] | null
          fecha_fin_recurrencia?: string | null
          fecha_inicio_recurrencia?: string | null
          fecha_vencimiento?: string | null
          frecuencia_recurrencia?: string | null
          id?: string
          intervalo_recurrencia?: number | null
          ocurrencia_id?: string | null
          prioridad?: Database["public"]["Enums"]["prioridad_tarea"] | null
          proxima_generacion?: string | null
          tarea_padre_id?: string | null
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
          es_recurrente?: boolean | null
          estado?: Database["public"]["Enums"]["estado_tarea"] | null
          fecha_fin_recurrencia?: string | null
          fecha_inicio_recurrencia?: string | null
          fecha_vencimiento?: string | null
          frecuencia_recurrencia?: string | null
          id?: string
          intervalo_recurrencia?: number | null
          ocurrencia_id?: string | null
          prioridad?: Database["public"]["Enums"]["prioridad_tarea"] | null
          proxima_generacion?: string | null
          tarea_padre_id?: string | null
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
          {
            foreignKeyName: "tareas_ocurrencia_id_fkey"
            columns: ["ocurrencia_id"]
            isOneToOne: false
            referencedRelation: "obligacion_ocurrencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_tarea_padre_id_fkey"
            columns: ["tarea_padre_id"]
            isOneToOne: false
            referencedRelation: "tareas"
            referencedColumns: ["id"]
          },
        ]
      }
      tareas_borradores: {
        Row: {
          archivos_adjuntos: Json | null
          categoria_id: string | null
          consultor_asignado_id: string | null
          created_at: string | null
          custom_fields: Json | null
          descripcion: string | null
          empresa_id: string | null
          estado: string | null
          fecha_vencimiento: string | null
          id: string
          prioridad: string | null
          titulo: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          archivos_adjuntos?: Json | null
          categoria_id?: string | null
          consultor_asignado_id?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          descripcion?: string | null
          empresa_id?: string | null
          estado?: string | null
          fecha_vencimiento?: string | null
          id?: string
          prioridad?: string | null
          titulo?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          archivos_adjuntos?: Json | null
          categoria_id?: string | null
          consultor_asignado_id?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          descripcion?: string | null
          empresa_id?: string | null
          estado?: string | null
          fecha_vencimiento?: string | null
          id?: string
          prioridad?: string | null
          titulo?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tareas_borradores_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_tareas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_borradores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          created_at: string | null
          descripcion: string | null
          duracion_minutos: number | null
          facturable: boolean | null
          fin: string | null
          id: string
          inicio: string
          tarea_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          duracion_minutos?: number | null
          facturable?: boolean | null
          fin?: string | null
          id?: string
          inicio: string
          tarea_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          duracion_minutos?: number | null
          facturable?: boolean | null
          fin?: string | null
          id?: string
          inicio?: string
          tarea_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "tareas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          empresa_id: string | null
          expires_at: string
          id: string
          invited_by: string
          nombre_completo: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          empresa_id?: string | null
          expires_at: string
          id?: string
          invited_by: string
          nombre_completo: string
          role: Database["public"]["Enums"]["app_role"]
          status?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          empresa_id?: string | null
          expires_at?: string
          id?: string
          invited_by?: string
          nombre_completo?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_preferences: {
        Row: {
          created_at: string | null
          email_enabled: boolean | null
          id: string
          notification_key: string
          push_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          notification_key: string
          push_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          notification_key?: string
          push_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      anexo30_calcular_plazo: {
        Args: { p_calendario?: Json; p_frecuencia: string; p_origen: string }
        Returns: Json
      }
      asegurar_horizonte_calendario: {
        Args: { p_empresa_id?: string }
        Returns: number
      }
      asignar_obligaciones_base: {
        Args: { p_empresa_id: string }
        Returns: undefined
      }
      calcular_periodo_key: {
        Args: { p_fecha: string; p_frecuencia: string }
        Returns: string
      }
      corregir_cumplimiento: {
        Args: {
          p_completada: boolean
          p_cumplimiento_id: string
          p_notas?: string
        }
        Returns: string
      }
      dias_recordatorio_calendario: {
        Args: { p_empresa_id?: string }
        Returns: {
          dias_antes: number[]
          empresa_id: string
          tipo: string
        }[]
      }
      expand_existing_obligaciones: { Args: never; Returns: number }
      generar_mis_avisos_obligaciones: { Args: never; Returns: number }
      generar_ocurrencias_anio: { Args: { p_year: number }; Returns: number }
      generar_ocurrencias_obligacion: {
        Args: { p_obligacion_id: string }
        Returns: undefined
      }
      generar_ocurrencias_obligacion_anio: {
        Args: { p_obligacion_id: string; p_year: number }
        Returns: undefined
      }
      get_consultor_visible_user_ids: {
        Args: { p_consultor_id: string }
        Returns: string[]
      }
      get_my_empresa_id: { Args: never; Returns: string }
      get_my_role: { Args: never; Returns: string }
      get_subtareas_progress: { Args: { p_tarea_id: string }; Returns: Json }
      get_total_time_spent: { Args: { p_tarea_id: string }; Returns: number }
      get_user_empresa_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_template_usage: {
        Args: { template_id: string }
        Returns: undefined
      }
      is_tarea_blocked: { Args: { p_tarea_id: string }; Returns: boolean }
      nombres_perfiles: {
        Args: { ids: string[] }
        Returns: {
          id: string
          nombre_completo: string
        }[]
      }
      obligacion_v2_calcular_fecha: {
        Args: {
          p_evento?: boolean
          p_origen: string
          p_parametros: Json
          p_validada: boolean
        }
        Returns: Json
      }
      obligacion_v2_es_admin: { Args: never; Returns: boolean }
      obligacion_v2_puede_leer: {
        Args: { p_obligacion_id: string }
        Returns: boolean
      }
      obligacion_v2_puede_registrar: {
        Args: { p_obligacion_id: string }
        Returns: boolean
      }
      obligacion_v2_puede_subir_evidencia: {
        Args: { p_path: string }
        Returns: boolean
      }
      obligacion_v2_regla: {
        Args: { p_obligacion_id: string }
        Returns: {
          aplicabilidad: Json
          catalogo_id: string | null
          clasificacion_estado: string
          created_at: string
          created_by: string | null
          fuente_referencia: string | null
          fuente_url: string | null
          id: string
          importacion_referencia: string | null
          normativa_estado: string
          obligacion_id: string | null
          origen_control: string
          parametros: Json
          tipo_control: string
          validada_en: string | null
          validada_por: string | null
          version: number
        }[]
        SetofOptions: {
          from: "*"
          to: "obligacion_reglas"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      obligacion_v2_tipo: { Args: { p_obligacion_id: string }; Returns: string }
      obligacion_v2_validar_soporte: {
        Args: { p_empresa: string; p_obligacion: string; p_path: string }
        Returns: undefined
      }
      previsualizar_anexo30: {
        Args: {
          p_frecuencia: string
          p_obligacion_id: string
          p_origen: string
        }
        Returns: Json
      }
      programar_anexo30: {
        Args: {
          p_frecuencia: string
          p_obligacion_id: string
          p_origen: string
        }
        Returns: string
      }
      puede_gestionar_empresa: {
        Args: { _empresa_id: string }
        Returns: boolean
      }
      registrar_cumplimiento_obligacion: {
        Args: {
          p_evento_id?: string
          p_evidencia_path?: string
          p_notas?: string
          p_obligacion_id: string
          p_ocurrencia_id?: string
          p_periodo_key: string
        }
        Returns: string
      }
      registrar_evento_obligacion: {
        Args: {
          p_evidencia_path?: string
          p_fecha_evento: string
          p_idempotency_key: string
          p_obligacion_id: string
          p_tipo_evento: string
        }
        Returns: string
      }
      registrar_fecha_manual_obligacion: {
        Args: { p_obligacion_id: string }
        Returns: undefined
      }
      registrar_revision_obligacion: {
        Args: {
          p_evidencia_path?: string
          p_notas?: string
          p_obligacion_id: string
          p_proxima_revision?: string
          p_resultado: string
        }
        Returns: string
      }
      reminder_days: {
        Args: { p_defaults?: number[]; p_empresa_id: string; p_tipo: string }
        Returns: number[]
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
