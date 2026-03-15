import { jsPDF } from 'jspdf';

// ─── Shared types ─────────────────────────────────────────────────────

interface EmpresaData {
  razon_social: string;
  rfc: string;
}

// ─── Management Report ────────────────────────────────────────────────

interface TareaDetalle {
  titulo: string;
  empresa: string;
  consultor: string;
  prioridad: string;
  estado: string;
  fecha_vencimiento: string | null;
  created_at: string | null;
  categoria: string;
}

interface ReportData {
  resumen: {
    totalTareas: number;
    tareasCompletadas: number;
    tareasPendientes: number;
    tasaCompletitud: number;
    totalEmpresas?: number;
    totalHorasTrabajadas?: number;
    horasFacturables?: number;
    certificacionesVencer?: number;
  };
  tareasPorEstado: Array<{ name: string; value: number }>;
  tareasPorPrioridad: Array<{ name: string; value: number }>;
  certificacionesVencimiento: Array<{
    tipo: string;
    fecha_vencimiento: string;
    dias_restantes?: number;
    razon_social: string;
  }>;
  tareasDetalle?: TareaDetalle[];
  obligacionesPendientesDetalle?: Array<{
    nombre: string;
    empresa: string;
    categoria: string;
    fecha_vencimiento: string | null;
  }>;
  rendimientoConsultores?: Array<{
    name: string;
    completadas: number;
    pendientes: number;
    total: number;
    tasa: number;
  }>;
  tareasPorEmpresa?: Array<{ name: string; value: number }>;
  tareasPorConsultor?: Array<{ name: string; value: number }>;
  tiempoPorConsultor?: Array<{ name: string; horas: number; facturable?: number }>;
}

const PRIORIDAD_COLORS: Record<string, [number, number, number]> = {
  alta: [220, 38, 38],
  media: [234, 179, 8],
  baja: [34, 139, 34],
};

const ESTADO_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En Progreso',
  completada: 'Completada',
  cancelada: 'Cancelada',
};

export async function generateReportPDF(
  empresa: EmpresaData,
  reportData: ReportData,
  period: string,
  reportType: string
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 20;

  const periodText = period === 'mes_actual' ? 'Mes Actual' :
                     period === 'mes_anterior' ? 'Mes Anterior' :
                     period === 'trimestre' ? 'Último Trimestre' :
                     period === 'semestre' ? 'Último Semestre' : 'Año Actual';

  const checkNewPage = (space: number) => {
    if (y + space > pageHeight - 20) {
      doc.addPage();
      y = 20;
      return true;
    }
    return false;
  };

  const drawSectionTitle = (title: string, color: [number, number, number] = [30, 64, 175]) => {
    checkNewPage(25);
    doc.setFontSize(14);
    doc.setTextColor(...color);
    doc.setFont(undefined!, 'bold');
    doc.text(title, 20, y);
    doc.setFont(undefined!, 'normal');
    y += 3;
    doc.setDrawColor(...color);
    doc.setLineWidth(0.3);
    doc.line(20, y, pageWidth - 20, y);
    y += 8;
  };

  // ── HEADER ──
  doc.setFontSize(22);
  doc.setTextColor(30, 64, 175);
  doc.setFont(undefined!, 'bold');
  doc.text('REPORTE DE GESTIÓN', pageWidth / 2, y, { align: 'center' });
  doc.setFont(undefined!, 'normal');
  y += 12;

  doc.setFontSize(13);
  doc.setTextColor(50, 50, 50);
  doc.text(empresa.razon_social, pageWidth / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`RFC: ${empresa.rfc}  |  Período: ${periodText}  |  Tipo: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`, pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(0.5);
  doc.line(20, y, pageWidth - 20, y);
  y += 12;

  // ── RESUMEN (KPI cards) ──
  drawSectionTitle('RESUMEN EJECUTIVO');

  doc.setFontSize(10);
  const kpis = [
    { label: 'Total Tareas', value: String(reportData.resumen.totalTareas) },
    { label: 'Completadas', value: String(reportData.resumen.tareasCompletadas) },
    { label: 'Pendientes', value: String(reportData.resumen.tareasPendientes) },
    { label: 'Tasa Completitud', value: `${reportData.resumen.tasaCompletitud}%` },
  ];
  if (reportData.resumen.totalEmpresas) {
    kpis.push({ label: 'Empresas', value: String(reportData.resumen.totalEmpresas) });
  }
  if (reportData.resumen.totalHorasTrabajadas) {
    kpis.push({ label: 'Horas Trabajadas', value: `${reportData.resumen.totalHorasTrabajadas}h` });
  }
  if (reportData.resumen.horasFacturables) {
    kpis.push({ label: 'Horas Facturables', value: `${reportData.resumen.horasFacturables}h` });
  }

  // Draw KPIs in a 2-column layout
  const colWidth = (pageWidth - 40) / 2;
  kpis.forEach((kpi, i) => {
    const col = i % 2;
    const xPos = 25 + col * colWidth;
    if (col === 0 && i > 0) y += 8;
    
    doc.setTextColor(100, 100, 100);
    doc.text(kpi.label + ':', xPos, y);
    doc.setTextColor(30, 30, 30);
    doc.setFont(undefined!, 'bold');
    doc.text(kpi.value, xPos + 55, y);
    doc.setFont(undefined!, 'normal');
  });
  y += 12;

  // ── TAREAS POR ESTADO ──
  if (reportData.tareasPorEstado.length > 0) {
    drawSectionTitle('DISTRIBUCIÓN POR ESTADO');
    doc.setFontSize(10);
    for (const item of reportData.tareasPorEstado) {
      checkNewPage(8);
      const pct = reportData.resumen.totalTareas > 0
        ? Math.round((item.value / reportData.resumen.totalTareas) * 100)
        : 0;
      doc.setTextColor(80, 80, 80);
      doc.text(`${item.name}:`, 30, y);
      doc.setTextColor(30, 30, 30);
      doc.setFont(undefined!, 'bold');
      doc.text(`${item.value}  (${pct}%)`, 80, y);
      doc.setFont(undefined!, 'normal');
      y += 7;
    }
    y += 8;
  }

  // ── TAREAS POR PRIORIDAD ──
  if (reportData.tareasPorPrioridad.length > 0) {
    drawSectionTitle('DISTRIBUCIÓN POR PRIORIDAD');
    doc.setFontSize(10);
    for (const item of reportData.tareasPorPrioridad) {
      checkNewPage(8);
      const color = PRIORIDAD_COLORS[item.name.toLowerCase()] || [80, 80, 80];
      doc.setTextColor(...color);
      doc.setFont(undefined!, 'bold');
      doc.text(`● ${item.name}:`, 30, y);
      doc.setFont(undefined!, 'normal');
      doc.setTextColor(30, 30, 30);
      doc.text(String(item.value), 80, y);
      y += 7;
    }
    y += 8;
  }

  // ── DETALLE DE TAREAS (landscape page) ──
  const tareas = reportData.tareasDetalle || [];
  if (tareas.length > 0) {
    doc.addPage('landscape');
    y = 20;
    const lw = doc.internal.pageSize.getWidth();
    const lh = doc.internal.pageSize.getHeight();

    doc.setFontSize(14);
    doc.setTextColor(30, 64, 175);
    doc.setFont(undefined!, 'bold');
    doc.text('DETALLE DE TAREAS', 20, y);
    doc.setFont(undefined!, 'normal');
    y += 3;
    doc.setDrawColor(30, 64, 175);
    doc.setLineWidth(0.3);
    doc.line(20, y, lw - 20, y);
    y += 8;

    // Table header
    const tCols = [15, 80, 130, 175, 205, 235, 265];
    const tLabels = ['Título', 'Empresa', 'Consultor', 'Categoría', 'Prioridad', 'Estado', 'Vencimiento'];

    const drawTableHeader = () => {
      doc.setFillColor(30, 64, 175);
      doc.rect(14, y - 5, lw - 28, 8, 'F');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined!, 'bold');
      tLabels.forEach((label, i) => doc.text(label, tCols[i], y));
      doc.setFont(undefined!, 'normal');
      y += 8;
    };

    drawTableHeader();

    doc.setFontSize(7);
    tareas.forEach((t, idx) => {
      if (y > lh - 20) {
        doc.addPage('landscape');
        y = 20;
        drawTableHeader();
      }

      if (idx % 2 === 0) {
        doc.setFillColor(245, 245, 250);
        doc.rect(14, y - 4, lw - 28, 7, 'F');
      }

      doc.setTextColor(30, 30, 30);
      doc.text(t.titulo.substring(0, 35), tCols[0], y);
      doc.text((t.empresa || '-').substring(0, 25), tCols[1], y);
      doc.text((t.consultor || 'Sin asignar').substring(0, 22), tCols[2], y);
      doc.text((t.categoria || '-').substring(0, 15), tCols[3], y);

      // Priority with color
      const pColor = PRIORIDAD_COLORS[t.prioridad?.toLowerCase()] || [80, 80, 80];
      doc.setTextColor(...pColor);
      doc.setFont(undefined!, 'bold');
      doc.text(t.prioridad?.charAt(0).toUpperCase() + t.prioridad?.slice(1) || '-', tCols[4], y);
      doc.setFont(undefined!, 'normal');

      // Estado
      const eColor: [number, number, number] = t.estado === 'completada' ? [34, 139, 34]
        : t.estado === 'en_progreso' ? [30, 64, 175]
        : t.estado === 'cancelada' ? [150, 150, 150]
        : [200, 150, 0];
      doc.setTextColor(...eColor);
      doc.text(ESTADO_LABELS[t.estado] || t.estado, tCols[5], y);

      doc.setTextColor(80, 80, 80);
      const venc = t.fecha_vencimiento ? new Date(t.fecha_vencimiento).toLocaleDateString('es-MX') : '-';
      doc.text(venc, tCols[6], y);

      y += 7;
    });

    y += 5;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Total: ${tareas.length} tareas`, 15, y);
  }

  // ── RENDIMIENTO POR CONSULTOR ──
  const rend = reportData.rendimientoConsultores || [];
  if (rend.length > 0) {
    doc.addPage();
    y = 20;

    drawSectionTitle('RENDIMIENTO POR CONSULTOR');

    // Table
    const cCols = [20, 80, 110, 140, 165];
    const cLabels = ['Consultor', 'Completadas', 'Pendientes', 'Total', 'Tasa'];

    doc.setFillColor(30, 64, 175);
    doc.rect(19, y - 5, pageWidth - 38, 8, 'F');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined!, 'bold');
    cLabels.forEach((l, i) => doc.text(l, cCols[i], y));
    doc.setFont(undefined!, 'normal');
    y += 8;

    doc.setFontSize(9);
    rend.forEach((r, idx) => {
      checkNewPage(8);
      if (idx % 2 === 0) {
        doc.setFillColor(245, 245, 250);
        doc.rect(19, y - 4, pageWidth - 38, 7, 'F');
      }
      doc.setTextColor(30, 30, 30);
      doc.text(r.name.substring(0, 30), cCols[0], y);
      doc.setTextColor(34, 139, 34);
      doc.text(String(r.completadas), cCols[1], y);
      doc.setTextColor(200, 150, 0);
      doc.text(String(r.pendientes), cCols[2], y);
      doc.setTextColor(30, 30, 30);
      doc.text(String(r.total), cCols[3], y);
      doc.setFont(undefined!, 'bold');
      doc.text(`${r.tasa}%`, cCols[4], y);
      doc.setFont(undefined!, 'normal');
      y += 7;
    });
    y += 10;
  }

  // ── TAREAS POR EMPRESA ──
  const porEmpresa = reportData.tareasPorEmpresa || [];
  if (porEmpresa.length > 0) {
    drawSectionTitle('TAREAS POR EMPRESA');
    doc.setFontSize(10);
    porEmpresa.forEach(e => {
      checkNewPage(8);
      doc.setTextColor(80, 80, 80);
      doc.text(e.name.substring(0, 40), 30, y);
      doc.setTextColor(30, 30, 30);
      doc.setFont(undefined!, 'bold');
      doc.text(String(e.value), 160, y);
      doc.setFont(undefined!, 'normal');
      y += 7;
    });
    y += 10;
  }

  // ── TIEMPO POR CONSULTOR ──
  const tiempoCons = reportData.tiempoPorConsultor || [];
  if (tiempoCons.length > 0) {
    drawSectionTitle('TIEMPO REGISTRADO POR CONSULTOR');
    doc.setFontSize(10);
    tiempoCons.forEach(tc => {
      checkNewPage(8);
      doc.setTextColor(80, 80, 80);
      doc.text(tc.name.substring(0, 30), 30, y);
      doc.setTextColor(30, 30, 30);
      doc.setFont(undefined!, 'bold');
      doc.text(`${tc.horas}h`, 120, y);
      doc.setFont(undefined!, 'normal');
      if (tc.facturable !== undefined) {
        doc.setTextColor(34, 139, 34);
        doc.text(`(${tc.facturable}h fact.)`, 145, y);
      }
      y += 7;
    });
    y += 10;
  }

  // ── OBLIGACIONES PENDIENTES ──
  const obPendientes = reportData.obligacionesPendientesDetalle || [];
  if (obPendientes.length > 0) {
    drawSectionTitle('OBLIGACIONES PENDIENTES DE CUMPLIMIENTO', [200, 50, 50]);
    
    const oCols = [20, 90, 140, 175];
    const oLabels = ['Obligación', 'Empresa', 'Categoría', 'Vencimiento'];
    
    doc.setFillColor(200, 50, 50);
    doc.rect(19, y - 5, pageWidth - 38, 8, 'F');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined!, 'bold');
    oLabels.forEach((l, i) => doc.text(l, oCols[i], y));
    doc.setFont(undefined!, 'normal');
    y += 8;

    doc.setFontSize(9);
    obPendientes.forEach((ob, idx) => {
      checkNewPage(8);
      if (idx % 2 === 0) {
        doc.setFillColor(255, 245, 245);
        doc.rect(19, y - 4, pageWidth - 38, 7, 'F');
      }
      doc.setTextColor(50, 50, 50);
      doc.text(ob.nombre.substring(0, 35), oCols[0], y);
      doc.text(ob.empresa.substring(0, 25), oCols[1], y);
      doc.text(ob.categoria.substring(0, 18), oCols[2], y);
      const venc = ob.fecha_vencimiento ? new Date(ob.fecha_vencimiento).toLocaleDateString('es-MX') : '-';
      doc.text(venc, oCols[3], y);
      y += 7;
    });
    y += 10;
  }

  // ── CERTIFICACIONES ──
  if (reportData.certificacionesVencimiento.length > 0) {
    drawSectionTitle('CERTIFICACIONES PRÓXIMAS A VENCER', [245, 158, 11]);
    doc.setFontSize(9);
    const maxCerts = Math.min(reportData.certificacionesVencimiento.length, 15);
    for (let i = 0; i < maxCerts; i++) {
      const cert = reportData.certificacionesVencimiento[i];
      checkNewPage(14);
      doc.setTextColor(50, 50, 50);
      doc.setFont(undefined!, 'bold');
      doc.text(`${cert.razon_social} — ${cert.tipo}`, 30, y);
      doc.setFont(undefined!, 'normal');
      y += 6;
      doc.setTextColor(100, 100, 100);
      const vencDate = new Date(cert.fecha_vencimiento).toLocaleDateString('es-MX');
      const diasText = cert.dias_restantes !== undefined ? ` (${cert.dias_restantes} días)` : '';
      doc.text(`Vence: ${vencDate}${diasText}`, 30, y);
      y += 9;
    }
  }

  // ── FOOTER ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Página ${i} de ${totalPages}`, pw / 2, ph - 8, { align: 'center' });
  }

  const fileName = `reporte-${empresa.razon_social.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

// ==============================
// Obligaciones PDF Report
// ==============================

interface ObligacionPDFData {
  nombre: string;
  categoria: string;
  articulos: string | null;
  presentacion: string | null;
  fecha_vencimiento: string | null;
  estado: string;
  completada_periodo: boolean;
  periodo_actual: string;
}

const CATEGORIA_LABELS_PDF: Record<string, string> = {
  general: 'General', cert_iva_ieps: 'Cert. IVA/IEPS', immex: 'IMMEX',
  prosec: 'PROSEC', padron: 'Padrón', otro: 'Otro',
};

export function generateObligacionesPDF(
  empresa: { razon_social: string; rfc: string },
  obligaciones: ObligacionPDFData[]
) {
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 20;

  // Header
  doc.setFontSize(20);
  doc.setTextColor(30, 64, 175);
  doc.text('REPORTE DE OBLIGACIONES', pageWidth / 2, y, { align: 'center' });
  y += 12;

  doc.setFontSize(12);
  doc.setTextColor(50, 50, 50);
  doc.text(empresa.razon_social, pageWidth / 2, y, { align: 'center' });
  y += 8;

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`RFC: ${empresa.rfc} | Generado: ${new Date().toLocaleDateString('es-MX')}`, pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(0.5);
  doc.line(15, y, pageWidth - 15, y);
  y += 8;

  // Summary
  const completadas = obligaciones.filter(o => o.completada_periodo).length;
  const pendientes = obligaciones.length - completadas;

  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  doc.text(`Total: ${obligaciones.length}  |  `, 15, y);
  doc.setTextColor(34, 139, 34);
  doc.text(`Completadas período actual: ${completadas}`, 65, y);
  doc.setTextColor(200, 50, 50);
  doc.text(`Pendientes: ${pendientes}`, 170, y);
  y += 12;

  // Adjusted column positions to prevent overlap
  const cols = [15, 45, 95, 145, 185, 220, 255];
  const colLabels = ['Categoría', 'Nombre', 'Artículos', 'Presentación', 'Período', 'Vencimiento', 'Estado'];

  doc.setFillColor(30, 64, 175);
  doc.rect(14, y - 5, pageWidth - 28, 8, 'F');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined!, 'bold');
  colLabels.forEach((label, i) => {
    doc.text(label, cols[i], y);
  });
  doc.setFont(undefined!, 'normal');
  y += 8;

  // Table rows
  doc.setFontSize(7.5);
  obligaciones.forEach((ob, idx) => {
    if (y > pageHeight - 20) {
      doc.addPage();
      y = 20;
      // Repeat header
      doc.setFillColor(30, 64, 175);
      doc.rect(14, y - 5, pageWidth - 28, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined!, 'bold');
      doc.setFontSize(8);
      colLabels.forEach((label, i) => doc.text(label, cols[i], y));
      doc.setFont(undefined!, 'normal');
      doc.setFontSize(7.5);
      y += 8;
    }

    // Alternate row background
    if (idx % 2 === 0) {
      doc.setFillColor(245, 245, 250);
      doc.rect(14, y - 4, pageWidth - 28, 7, 'F');
    }

    // Completion indicator
    if (ob.completada_periodo) {
      doc.setTextColor(34, 139, 34);
    } else {
      doc.setTextColor(50, 50, 50);
    }

    doc.text(CATEGORIA_LABELS_PDF[ob.categoria] || ob.categoria, cols[0], y);
    doc.text((ob.completada_periodo ? '✓ ' : '') + ob.nombre.substring(0, 25), cols[1], y);
    doc.text((ob.articulos || '-').substring(0, 22), cols[2], y);
    doc.text((ob.presentacion || '-').substring(0, 18), cols[3], y);
    doc.text(ob.periodo_actual.substring(0, 16), cols[4], y);

    const venc = ob.fecha_vencimiento ? new Date(ob.fecha_vencimiento).toLocaleDateString('es-MX') : '-';
    doc.text(venc, cols[5], y);

    // Estado with color
    if (ob.completada_periodo) {
      doc.setTextColor(34, 139, 34);
      doc.text('Completada', cols[6], y);
    } else {
      doc.setTextColor(200, 150, 0);
      doc.text(ob.estado, cols[6], y);
    }

    y += 7;
  });

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Generado el ${new Date().toLocaleString('es-MX')}`,
    pageWidth / 2,
    pageHeight - 8,
    { align: 'center' }
  );

  const fileName = `obligaciones-${empresa.razon_social.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
