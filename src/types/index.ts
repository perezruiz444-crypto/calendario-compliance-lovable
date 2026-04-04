export interface Empresa {
  id: string;
  razon_social: string;
}

export interface Consultor {
  id: string;
  nombre_completo: string;
}

export interface Categoria {
  id: string;
  nombre: string;
}

export type TareaEstado = 'pendiente' | 'en_progreso' | 'completada' | 'cancelada';
export type TareaPrioridad = 'alta' | 'media' | 'baja';
export type UserRole = 'administrador' | 'consultor' | 'cliente';
