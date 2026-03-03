import { jsPDF } from 'jspdf';

interface ReportData {
  resumen: {
    totalTareas: number;
    tareasCompletadas: number;
    tareasPendientes: number;
    tasaCompletitud: number;
  };
  tareasPorEstado: Array<{ name: string; value: number }>;
  tareasPorPrioridad: Array<{ name: string; value: number }>;
  certificacionesVencimiento: Array<{
    tipo: string;
    fecha_vencimiento: string;
    dias_restantes: number;
    razon_social: string;
  }>;
}

interface EmpresaData {
  razon_social: string;
  rfc: string;
}

export async function generateReportPDF(
  empresa: EmpresaData,
  reportData: ReportData,
  period: string,
  reportType: string
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  const periodText = period === 'mes_actual' ? 'Mes Actual' :
                     period === 'mes_anterior' ? 'Mes Anterior' :
                     period === 'trimestre' ? 'Último Trimestre' :
                     period === 'semestre' ? 'Último Semestre' : 'Año Actual';

  // Header
  doc.setFontSize(24);
  doc.setTextColor(30, 64, 175);
  doc.text('REPORTE DE GESTIÓN', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  doc.setFontSize(14);
  doc.setTextColor(50, 50, 50);
  doc.text(empresa.razon_social, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`RFC: ${empresa.rfc}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 6;
  doc.text(`Período: ${periodText}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 6;
  doc.text(`Tipo: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(0.5);
  doc.line(20, yPosition, pageWidth - 20, yPosition);
  yPosition += 15;

  const checkNewPage = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - 20) {
      doc.addPage();
      yPosition = 20;
      return true;
    }
    return false;
  };

  // Resumen Section
  doc.setFontSize(16);
  doc.setTextColor(30, 64, 175);
  doc.text('RESUMEN', 20, yPosition);
  yPosition += 10;

  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);

  const resumenItems = [
    { label: 'Total Tareas:', value: reportData.resumen.totalTareas.toString() },
    { label: 'Completadas:', value: reportData.resumen.tareasCompletadas.toString() },
    { label: 'Pendientes:', value: reportData.resumen.tareasPendientes.toString() },
    { label: 'Tasa de Completitud:', value: `${reportData.resumen.tasaCompletitud}%` },
  ];

  for (const item of resumenItems) {
    checkNewPage(10);
    doc.setTextColor(80, 80, 80);
    doc.text(item.label, 30, yPosition);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined!, 'bold');
    doc.text(item.value, 100, yPosition);
    doc.setFont(undefined!, 'normal');
    yPosition += 8;
  }
  yPosition += 10;

  // Tareas por Estado
  if (reportData.tareasPorEstado.length > 0) {
    checkNewPage(50);
    doc.setFontSize(14);
    doc.setTextColor(30, 64, 175);
    doc.text('TAREAS POR ESTADO', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    for (const item of reportData.tareasPorEstado) {
      checkNewPage(8);
      doc.setTextColor(80, 80, 80);
      doc.text(`${item.name}:`, 30, yPosition);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined!, 'bold');
      doc.text(item.value.toString(), 100, yPosition);
      doc.setFont(undefined!, 'normal');
      yPosition += 7;
    }
    yPosition += 10;
  }

  // Tareas por Prioridad
  if (reportData.tareasPorPrioridad.length > 0) {
    checkNewPage(50);
    doc.setFontSize(14);
    doc.setTextColor(30, 64, 175);
    doc.text('TAREAS POR PRIORIDAD', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    for (const item of reportData.tareasPorPrioridad) {
      checkNewPage(8);
      doc.setTextColor(80, 80, 80);
      doc.text(`${item.name}:`, 30, yPosition);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined!, 'bold');
      doc.text(item.value.toString(), 100, yPosition);
      doc.setFont(undefined!, 'normal');
      yPosition += 7;
    }
    yPosition += 10;
  }

  // Certificaciones próximas a vencer
  if (reportData.certificacionesVencimiento.length > 0) {
    checkNewPage(60);
    doc.setFontSize(14);
    doc.setTextColor(245, 158, 11);
    doc.text('CERTIFICACIONES PRÓXIMAS A VENCER', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(9);
    const maxCerts = Math.min(reportData.certificacionesVencimiento.length, 10);
    
    for (let i = 0; i < maxCerts; i++) {
      const cert = reportData.certificacionesVencimiento[i];
      checkNewPage(15);
      
      doc.setTextColor(50, 50, 50);
      doc.setFont(undefined!, 'bold');
      doc.text(cert.tipo, 30, yPosition);
      doc.setFont(undefined!, 'normal');
      yPosition += 6;
      
      doc.setTextColor(100, 100, 100);
      doc.text(`Vence: ${cert.fecha_vencimiento} (${cert.dias_restantes} días)`, 30, yPosition);
      yPosition += 10;
    }
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Generado el ${new Date().toLocaleString('es-MX')}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

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

  // Table header
  const cols = [15, 55, 120, 165, 200, 230, 260];
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
  doc.setFontSize(8);
  obligaciones.forEach((ob, idx) => {
    if (y > pageHeight - 20) {
      doc.addPage();
      y = 20;
      // Repeat header
      doc.setFillColor(30, 64, 175);
      doc.rect(14, y - 5, pageWidth - 28, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined!, 'bold');
      colLabels.forEach((label, i) => doc.text(label, cols[i], y));
      doc.setFont(undefined!, 'normal');
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
    doc.text((ob.completada_periodo ? '✓ ' : '') + ob.nombre.substring(0, 30), cols[1], y);
    doc.text((ob.articulos || '-').substring(0, 20), cols[2], y);
    doc.text((ob.presentacion || '-'), cols[3], y);
    doc.text(ob.periodo_actual.substring(0, 15), cols[4], y);

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
