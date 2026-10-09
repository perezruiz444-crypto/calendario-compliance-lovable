import type { Empresa } from '@/types/domain';

/** Serie simple para gráficas de pastel/barras. */
export interface DatoNombreValor {
  name: string;
  value: number;
}

export interface RendimientoConsultor {
  name: string;
  completadas: number;
  pendientes: number;
  total: number;
  tasa: number;
}

export interface PuntoTimeline {
  mes: string;
  creadas: number;
  completadas: number;
}

export interface VencimientoCertificacion {
  razon_social: string;
  fecha_vencimiento: string;
  tipo: string;
}

export interface TiempoConsultor {
  name: string;
  horas: number;
  facturable: number;
}

export interface TiempoPorNombre {
  name: string;
  horas: number;
}

export interface TareaDetalleReporte {
  titulo: string;
  empresa: string;
  consultor: string;
  prioridad: string;
  estado: string;
  fecha_vencimiento: string | null;
  created_at: string | null;
  categoria: string;
}

export interface ObligacionPendienteDetalle {
  nombre: string;
  empresa: string;
  categoria: string;
  fecha_vencimiento: string | null;
}

export interface ResumenReporte {
  totalEmpresas: number;
  totalTareas: number;
  tareasCompletadas: number;
  tareasPendientes: number;
  certificacionesVencer: number;
  tasaCompletitud: number;
  totalHorasTrabajadas: number;
  horasFacturables: number;
}

export interface ReporteData {
  tareasPorEstado: DatoNombreValor[];
  tareasPorPrioridad: DatoNombreValor[];
  tareasPorConsultor: DatoNombreValor[];
  tareasPorEmpresa: DatoNombreValor[];
  tareasPorCategoria: DatoNombreValor[];
  tareasTimeline: PuntoTimeline[];
  empresasConVencimientos: Empresa[];
  certificacionesVencimiento: VencimientoCertificacion[];
  rendimientoConsultores: RendimientoConsultor[];
  tiempoPorConsultor: TiempoConsultor[];
  tiempoPorEmpresa: TiempoPorNombre[];
  tiempoPorTarea: TiempoPorNombre[];
  tareasDetalle: TareaDetalleReporte[];
  obligacionesPendientesDetalle: ObligacionPendienteDetalle[];
  resumen: ResumenReporte;
}
