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
  doc.setTextColor(30, 64, 175); // Blue
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

  // Horizontal line
  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(0.5);
  doc.line(20, yPosition, pageWidth - 20, yPosition);
  yPosition += 15;

  // Check if new page is needed
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
    doc.setFont(undefined, 'bold');
    doc.text(item.value, 100, yPosition);
    doc.setFont(undefined, 'normal');
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
      doc.setFont(undefined, 'bold');
      doc.text(item.value.toString(), 100, yPosition);
      doc.setFont(undefined, 'normal');
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
      doc.setFont(undefined, 'bold');
      doc.text(item.value.toString(), 100, yPosition);
      doc.setFont(undefined, 'normal');
      yPosition += 7;
    }
    yPosition += 10;
  }

  // Certificaciones próximas a vencer
  if (reportData.certificacionesVencimiento.length > 0) {
    checkNewPage(60);
    doc.setFontSize(14);
    doc.setTextColor(245, 158, 11); // Warning color
    doc.text('CERTIFICACIONES PRÓXIMAS A VENCER', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(9);
    const maxCerts = Math.min(reportData.certificacionesVencimiento.length, 10);
    
    for (let i = 0; i < maxCerts; i++) {
      const cert = reportData.certificacionesVencimiento[i];
      checkNewPage(15);
      
      doc.setTextColor(50, 50, 50);
      doc.setFont(undefined, 'bold');
      doc.text(cert.tipo, 30, yPosition);
      doc.setFont(undefined, 'normal');
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

  // Save PDF
  const fileName = `reporte-${empresa.razon_social.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
