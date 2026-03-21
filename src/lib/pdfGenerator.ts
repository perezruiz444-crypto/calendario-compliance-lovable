import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Brand colors (Russell Bedford Navy) ──────────────────────────────
const C = {
  navy:      [0,   51,  102] as [number,number,number],
  navyMid:   [0,   70,  140] as [number,number,number],
  navyLight: [230, 238, 248] as [number,number,number],
  red:       [213, 43,  30]  as [number,number,number],
  redLight:  [253, 235, 233] as [number,number,number],
  amber:     [180, 120, 0]   as [number,number,number],
  amberLight:[255, 248, 225] as [number,number,number],
  green:     [22,  101, 52]  as [number,number,number],
  greenLight:[220, 242, 229] as [number,number,number],
  gray:      [90,  90,  90]  as [number,number,number],
  grayLight: [245, 246, 248] as [number,number,number],
  border:    [210, 215, 225] as [number,number,number],
  white:     [255, 255, 255] as [number,number,number],
  black:     [20,  20,  20]  as [number,number,number],
};

// ─── Shared types ──────────────────────────────────────────────────────

interface EmpresaData {
  razon_social: string;
  rfc: string;
}

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

const CATEGORIA_LABELS_PDF: Record<string, string> = {
  general: 'General', cert_iva_ieps: 'Cert. IVA/IEPS',
  immex: 'IMMEX', prosec: 'PROSEC', padron: 'Padrón', otro: 'Otro',
};

const ESTADO_LABELS: Record<string, string> = {
  pendiente: 'Pendiente', en_progreso: 'En Progreso',
  completada: 'Completada', cancelada: 'Cancelada',
};

// ─── Page header ───────────────────────────────────────────────────────

function drawPageHeader(doc: jsPDF, empresa: string, title: string) {
  const pw = doc.internal.pageSize.getWidth();
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, pw, 14, 'F');
  doc.setFillColor(...C.red);
  doc.rect(0, 0, 4, 14, 'F');
  doc.setFontSize(8);
  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), 10, 9);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(empresa, pw - 10, 9, { align: 'right' });
}

// ─── Page footer ───────────────────────────────────────────────────────

function applyFooters(doc: jsPDF, empresa: string) {
  const total = doc.getNumberOfPages();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFillColor(...C.grayLight);
    doc.rect(0, ph - 10, pw, 10, 'F');
    doc.setFontSize(6.5);
    doc.setTextColor(...C.gray);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generado: ${new Date().toLocaleString('es-MX')}  ·  ${empresa}`, 10, ph - 3.5);
    doc.text(`${i} / ${total}`, pw - 10, ph - 3.5, { align: 'right' });
  }
}

// ─── Section heading ───────────────────────────────────────────────────

function sectionHeading(doc: jsPDF, title: string, y: number, accent: [number,number,number] = C.navy): number {
  const pw = doc.internal.pageSize.getWidth();
  doc.setFillColor(...accent);
  doc.rect(10, y, 3, 7, 'F');
  doc.setFontSize(10.5);
  doc.setTextColor(...accent);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 16, y + 5.5);
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(16, y + 8, pw - 10, y + 8);
  doc.setFont('helvetica', 'normal');
  return y + 14;
}

// ─── KPI card ──────────────────────────────────────────────────────────

function kpiCard(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  label: string, value: string,
  accent: [number,number,number] = C.navy
) {
  doc.setFillColor(...C.white);
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.4);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');
  doc.setFillColor(...accent);
  doc.rect(x, y, w, 2.5, 'F');
  doc.setFontSize(18);
  doc.setTextColor(...accent);
  doc.setFont('helvetica', 'bold');
  doc.text(value, x + w / 2, y + h / 2 + 2, { align: 'center' });
  doc.setFontSize(7);
  doc.setTextColor(...C.gray);
  doc.setFont('helvetica', 'normal');
  doc.text(label.toUpperCase(), x + w / 2, y + h - 4, { align: 'center' });
}

// ─── Progress bar ──────────────────────────────────────────────────────

function progressBar(
  doc: jsPDF,
  x: number, y: number, w: number,
  pct: number, color: [number,number,number] = C.navy
) {
  doc.setFillColor(...C.border);
  doc.roundedRect(x, y, w, 3.5, 1, 1, 'F');
  if (pct > 0) {
    doc.setFillColor(...color);
    doc.roundedRect(x, y, Math.max(2, (w * pct) / 100), 3.5, 1, 1, 'F');
  }
}

// ─── autoTable style factory ───────────────────────────────────────────

function tableStyles(accentColor: [number,number,number] = C.navy) {
  return {
    headStyles: {
      fillColor: accentColor,
      textColor: C.white,
      fontStyle: 'bold' as const,
      fontSize: 8,
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
    },
    bodyStyles: {
      fontSize: 7.5,
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
      textColor: C.black,
    },
    alternateRowStyles: { fillColor: C.grayLight },
    tableLineColor: C.border,
    tableLineWidth: 0.3,
    rowPageBreak: 'avoid' as const,
    styles: { overflow: 'ellipsize' as const },
  };
}

// ══════════════════════════════════════════════════════════════════════
// MAIN REPORT PDF
// ══════════════════════════════════════════════════════════════════════

export async function generateReportPDF(
  empresa: EmpresaData,
  reportData: ReportData,
  period: string,
  reportType: string
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  const periodText =
    period === 'mes_actual'   ? 'Mes Actual'       :
    period === 'mes_anterior' ? 'Mes Anterior'     :
    period === 'trimestre'    ? 'Último Trimestre' :
    period === 'semestre'     ? 'Último Semestre'  : 'Año Actual';

  // ── COVER PAGE ────────────────────────────────────────────────────

  doc.setFillColor(...C.navy);
  doc.rect(0, 0, pw, 70, 'F');
  doc.setFillColor(...C.red);
  doc.rect(0, 0, 6, 70, 'F');
  doc.setFillColor(...C.navyMid);
  doc.triangle(pw - 50, 0, pw, 0, pw, 50, 'F');

  doc.setFontSize(22);
  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORTE DE GESTIÓN', 16, 30);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 205, 230);
  doc.text('Comercio Exterior · Cumplimiento Regulatorio', 16, 40);

  doc.setFillColor(...C.red);
  doc.roundedRect(16, 48, 55, 10, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'bold');
  doc.text(periodText.toUpperCase(), 43, 54.5, { align: 'center' });

  doc.setFillColor(...C.white);
  doc.roundedRect(10, 80, pw - 20, 30, 3, 3, 'F');
  doc.setFillColor(...C.navy);
  doc.roundedRect(10, 80, 4, 30, 2, 2, 'F');

  doc.setFontSize(13);
  doc.setTextColor(...C.navy);
  doc.setFont('helvetica', 'bold');
  doc.text(empresa.razon_social, 20, 92);

  doc.setFontSize(8.5);
  doc.setTextColor(...C.gray);
  doc.setFont('helvetica', 'normal');
  doc.text(`RFC: ${empresa.rfc}`, 20, 100);
  doc.text(`Tipo de reporte: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`, 20, 106);

  doc.setFontSize(7.5);
  doc.setTextColor(...C.gray);
  doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, pw - 15, 106, { align: 'right' });

  // ── KPI SECTION ───────────────────────────────────────────────────

  let y = 122;
  y = sectionHeading(doc, 'RESUMEN EJECUTIVO', y);

  const { resumen } = reportData;
  const tasa = resumen.tasaCompletitud || 0;
  const tasaColor: [number,number,number] =
    tasa >= 80 ? C.green : tasa >= 50 ? C.amber : C.red;

  const kpis = [
    { label: 'Total Tareas',     value: String(resumen.totalTareas),      color: C.navy  },
    { label: 'Completadas',      value: String(resumen.tareasCompletadas), color: C.green },
    { label: 'Pendientes',       value: String(resumen.tareasPendientes),  color: C.amber },
    { label: 'Tasa Completitud', value: `${tasa}%`,                        color: tasaColor },
  ];
  if (resumen.totalEmpresas)
    kpis.push({ label: 'Empresas', value: String(resumen.totalEmpresas), color: C.navy });
  if (resumen.totalHorasTrabajadas)
    kpis.push({ label: 'Horas Trabajadas', value: `${resumen.totalHorasTrabajadas}h`, color: C.navy });

  const cols = Math.min(kpis.length, 4);
  const cardW = (pw - 20 - (cols - 1) * 4) / cols;
  const cardH = 26;
  kpis.slice(0, 4).forEach((k, i) => {
    kpiCard(doc, 10 + i * (cardW + 4), y, cardW, cardH, k.label, k.value, k.color);
  });
  y += cardH + 5;

  if (kpis.length > 4) {
    const extra = kpis.slice(4);
    const extraW = (pw - 20 - (extra.length - 1) * 4) / extra.length;
    extra.forEach((k, i) => {
      kpiCard(doc, 10 + i * (extraW + 4), y, extraW, cardH, k.label, k.value, k.color);
    });
    y += cardH + 5;
  }

  doc.setFontSize(7.5);
  doc.setTextColor(...C.gray);
  doc.text('Tasa de completitud global', 10, y + 3);
  doc.setTextColor(...tasaColor);
  doc.setFont('helvetica', 'bold');
  doc.text(`${tasa}%`, pw - 10, y + 3, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  progressBar(doc, 10, y + 5, pw - 20, tasa, tasaColor);
  y += 16;

  // ── ESTADO / PRIORIDAD ────────────────────────────────────────────

  if (reportData.tareasPorEstado.length > 0 || reportData.tareasPorPrioridad.length > 0) {
    y = sectionHeading(doc, 'DISTRIBUCIÓN DE TAREAS', y);

    if (reportData.tareasPorEstado.length > 0) {
      autoTable(doc, {
        startY: y,
        margin: { left: 10, right: pw / 2 + 2 },
        head: [['Estado', 'Tareas', '%']],
        body: reportData.tareasPorEstado.map(e => [
          e.name,
          e.value,
          `${resumen.totalTareas > 0 ? Math.round((e.value / resumen.totalTareas) * 100) : 0}%`,
        ]),
        columnStyles: { 0: { cellWidth: 'auto' }, 1: { halign: 'center' }, 2: { halign: 'center' } },
        ...tableStyles(),
      });
    }

    if (reportData.tareasPorPrioridad.length > 0) {
      const priColors: Record<string, [number,number,number]> = {
        alta: C.red, media: C.amber, baja: C.green,
      };
      autoTable(doc, {
        startY: y,
        margin: { left: pw / 2 + 2, right: 10 },
        head: [['Prioridad', 'Tareas']],
        body: reportData.tareasPorPrioridad.map(p => [p.name, p.value]),
        columnStyles: { 0: { cellWidth: 'auto' }, 1: { halign: 'center' } },
        ...tableStyles(),
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 0) {
            const name = String(data.cell.raw).toLowerCase();
            const color = priColors[name] || C.gray;
            doc.setFillColor(...color);
            doc.circle(data.cell.x + 2.5, data.cell.y + data.cell.height / 2, 1.2, 'F');
          }
        },
      });
    }

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── OBLIGACIONES PENDIENTES ────────────────────────────────────────

  const obPendientes = reportData.obligacionesPendientesDetalle || [];
  if (obPendientes.length > 0) {
    if (y > ph - 60) { doc.addPage(); y = 20; drawPageHeader(doc, empresa.razon_social, 'Obligaciones Pendientes'); }
    y = sectionHeading(doc, 'OBLIGACIONES PENDIENTES DE CUMPLIMIENTO', y, C.red);

    autoTable(doc, {
      startY: y,
      margin: { left: 10, right: 10 },
      head: [['Obligación', 'Empresa', 'Programa', 'Vencimiento']],
      body: obPendientes.map(ob => [
        ob.nombre,
        ob.empresa,
        CATEGORIA_LABELS_PDF[ob.categoria] || ob.categoria,
        ob.fecha_vencimiento ? new Date(ob.fecha_vencimiento).toLocaleDateString('es-MX') : '—',
      ]),
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 55 },
        2: { cellWidth: 30 },
        3: { cellWidth: 28, halign: 'center' },
      },
      ...tableStyles(C.red),
      alternateRowStyles: { fillColor: C.redLight },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── CERTIFICACIONES ────────────────────────────────────────────────

  if (reportData.certificacionesVencimiento.length > 0) {
    if (y > ph - 60) { doc.addPage(); y = 20; drawPageHeader(doc, empresa.razon_social, 'Certificaciones'); }
    y = sectionHeading(doc, 'CERTIFICACIONES PRÓXIMAS A VENCER', y, C.amber);

    autoTable(doc, {
      startY: y,
      margin: { left: 10, right: 10 },
      head: [['Empresa', 'Tipo', 'Vence', 'Días restantes']],
      body: reportData.certificacionesVencimiento.slice(0, 20).map(c => [
        c.razon_social,
        c.tipo,
        new Date(c.fecha_vencimiento).toLocaleDateString('es-MX'),
        c.dias_restantes !== undefined ? `${c.dias_restantes}d` : '—',
      ]),
      columnStyles: {
        0: { cellWidth: 75 },
        1: { cellWidth: 50 },
        2: { cellWidth: 35, halign: 'center' },
        3: { cellWidth: 25, halign: 'center' },
      },
      ...tableStyles(C.amber),
      alternateRowStyles: { fillColor: C.amberLight },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          const dias = parseInt(String(data.cell.raw));
          if (!isNaN(dias)) {
            doc.setTextColor(...(dias <= 7 ? C.red : dias <= 30 ? C.amber : C.green));
          }
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── DETALLE DE TAREAS (landscape) ─────────────────────────────────

  const tareas = reportData.tareasDetalle || [];
  if (tareas.length > 0) {
    doc.addPage('landscape');
    drawPageHeader(doc, empresa.razon_social, 'Detalle de Tareas');
    y = 22;
    y = sectionHeading(doc, 'DETALLE DE TAREAS', y);

    const estadoColors: Record<string, [number,number,number]> = {
      completada: C.green, en_progreso: C.navy, pendiente: C.amber, cancelada: C.gray,
    };
    const priColors2: Record<string, [number,number,number]> = {
      alta: C.red, media: C.amber, baja: C.green,
    };

    autoTable(doc, {
      startY: y,
      margin: { left: 10, right: 10 },
      head: [['Tarea', 'Empresa', 'Consultor', 'Categoría', 'Prioridad', 'Estado', 'Vencimiento']],
      body: tareas.map(t => [
        t.titulo,
        t.empresa || '—',
        t.consultor || 'Sin asignar',
        t.categoria || '—',
        t.prioridad ? t.prioridad.charAt(0).toUpperCase() + t.prioridad.slice(1) : '—',
        ESTADO_LABELS[t.estado] || t.estado,
        t.fecha_vencimiento ? new Date(t.fecha_vencimiento).toLocaleDateString('es-MX') : '—',
      ]),
      columnStyles: {
        0: { cellWidth: 65 },
        1: { cellWidth: 45 },
        2: { cellWidth: 40 },
        3: { cellWidth: 32 },
        4: { cellWidth: 22, halign: 'center' },
        5: { cellWidth: 28, halign: 'center' },
        6: { cellWidth: 25, halign: 'center' },
      },
      ...tableStyles(),
      didDrawCell: (data) => {
        if (data.section === 'body') {
          const raw = String(data.cell.raw);
          if (data.column.index === 4) {
            doc.setTextColor(...(priColors2[raw.toLowerCase()] || C.gray));
          }
          if (data.column.index === 5) {
            const key = Object.keys(ESTADO_LABELS).find(k => ESTADO_LABELS[k] === raw) || raw;
            doc.setTextColor(...(estadoColors[key] || C.gray));
          }
        }
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(7.5);
    doc.setTextColor(...C.gray);
    doc.text(`${tareas.length} tareas en total`, 10, finalY + 5);
  }

  // ── RENDIMIENTO POR CONSULTOR ──────────────────────────────────────

  const rend = reportData.rendimientoConsultores || [];
  if (rend.length > 0) {
    doc.addPage('portrait');
    drawPageHeader(doc, empresa.razon_social, 'Rendimiento Consultores');
    y = 22;
    y = sectionHeading(doc, 'RENDIMIENTO POR CONSULTOR', y);

    autoTable(doc, {
      startY: y,
      margin: { left: 10, right: 10 },
      head: [['Consultor', 'Completadas', 'Pendientes', 'Total', 'Tasa']],
      body: rend.map(r => [r.name, r.completadas, r.pendientes, r.total, `${r.tasa}%`]),
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 35, halign: 'center' },
        2: { cellWidth: 35, halign: 'center' },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 25, halign: 'center' },
      },
      ...tableStyles(),
      didDrawCell: (data) => {
        if (data.section === 'body') {
          if (data.column.index === 1) doc.setTextColor(...C.green);
          if (data.column.index === 2) doc.setTextColor(...C.amber);
          if (data.column.index === 4) {
            const t = parseInt(String(data.cell.raw));
            doc.setTextColor(...(t >= 80 ? C.green : t >= 50 ? C.amber : C.red));
          }
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    if (rend.length <= 10) {
      y = sectionHeading(doc, 'COMPARATIVO VISUAL', y);
      const maxTotal = Math.max(...rend.map(r => r.total), 1);
      rend.forEach(r => {
        if (y > ph - 20) { doc.addPage(); y = 22; }
        doc.setFontSize(7.5);
        doc.setTextColor(...C.black);
        doc.text(r.name.substring(0, 28), 10, y + 3);
        const barW = pw - 90;
        doc.setFillColor(...C.border);
        doc.roundedRect(80, y, barW, 5, 1, 1, 'F');
        doc.setFillColor(...C.green);
        doc.roundedRect(80, y, Math.max(1, (r.completadas / maxTotal) * barW), 5, 1, 1, 'F');
        doc.setFontSize(7);
        doc.setTextColor(...C.gray);
        doc.text(`${r.completadas}/${r.total}`, pw - 8, y + 4, { align: 'right' });
        y += 9;
      });
    }
  }

  // ── TAREAS POR EMPRESA ─────────────────────────────────────────────

  const porEmpresa = reportData.tareasPorEmpresa || [];
  if (porEmpresa.length > 0) {
    if (y > ph - 60) { doc.addPage(); y = 20; }
    y = sectionHeading(doc, 'DISTRIBUCIÓN POR EMPRESA', y);

    autoTable(doc, {
      startY: y,
      margin: { left: 10, right: 10 },
      head: [['Empresa', 'Tareas', '%']],
      body: porEmpresa.map(e => [
        e.name,
        e.value,
        `${reportData.resumen.totalTareas > 0 ? Math.round((e.value / reportData.resumen.totalTareas) * 100) : 0}%`,
      ]),
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 25, halign: 'center' },
      },
      ...tableStyles(),
    });
  }

  applyFooters(doc, empresa.razon_social);
  doc.save(`reporte-${empresa.razon_social.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
}


// ══════════════════════════════════════════════════════════════════════
// OBLIGACIONES PDF
// ══════════════════════════════════════════════════════════════════════

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

export function generateObligacionesPDF(
  empresa: { razon_social: string; rfc: string },
  obligaciones: ObligacionPDFData[]
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  // ── HEADER BAND ───────────────────────────────────────────────────

  doc.setFillColor(...C.navy);
  doc.rect(0, 0, pw, 22, 'F');
  doc.setFillColor(...C.red);
  doc.rect(0, 0, 6, 22, 'F');

  doc.setFontSize(14);
  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORTE DE OBLIGACIONES', 14, 10);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 205, 230);
  doc.text('Comercio Exterior · Cumplimiento Regulatorio', 14, 17);

  // Company block
  doc.setFillColor(...C.white);
  doc.roundedRect(10, 28, pw - 20, 18, 2, 2, 'F');
  doc.setFillColor(...C.navy);
  doc.rect(10, 28, 4, 18, 'F');

  doc.setFontSize(11);
  doc.setTextColor(...C.navy);
  doc.setFont('helvetica', 'bold');
  doc.text(empresa.razon_social, 19, 36);
  doc.setFontSize(8);
  doc.setTextColor(...C.gray);
  doc.setFont('helvetica', 'normal');
  doc.text(`RFC: ${empresa.rfc}  ·  Generado: ${new Date().toLocaleDateString('es-MX')}`, 19, 42);

  // ── KPI STRIP ─────────────────────────────────────────────────────

  const completadas = obligaciones.filter(o => o.completada_periodo).length;
  const pendientes  = obligaciones.length - completadas;
  const tasa = obligaciones.length > 0 ? Math.round((completadas / obligaciones.length) * 100) : 0;
  const tasaColor: [number,number,number] = tasa >= 80 ? C.green : tasa >= 50 ? C.amber : C.red;

  const kpis = [
    { label: 'Total',        value: String(obligaciones.length), color: C.navy  },
    { label: 'Cumplidas',    value: String(completadas),          color: C.green },
    { label: 'Pendientes',   value: String(pendientes),           color: C.amber },
    { label: 'Cumplimiento', value: `${tasa}%`,                   color: tasaColor },
  ];
  const cardW = (pw - 20 - 9) / 4;
  kpis.forEach((k, i) => kpiCard(doc, 10 + i * (cardW + 3), 52, cardW, 20, k.label, k.value, k.color));

  let y = 78;
  doc.setFontSize(7);
  doc.setTextColor(...C.gray);
  doc.text('Porcentaje de cumplimiento del periodo:', 10, y + 2.5);
  doc.setTextColor(...tasaColor);
  doc.setFont('helvetica', 'bold');
  doc.text(`${tasa}%`, pw - 10, y + 2.5, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  progressBar(doc, 10, y + 4, pw - 20, tasa, tasaColor);
  y += 14;

  // ── TABLE ─────────────────────────────────────────────────────────

  autoTable(doc, {
    startY: y,
    margin: { left: 10, right: 10 },
    head: [['Programa', 'Obligación', 'Fundamento legal', 'Periodicidad', 'Periodo', 'Vencimiento', 'Estado']],
    body: obligaciones.map(ob => [
      CATEGORIA_LABELS_PDF[ob.categoria] || ob.categoria,
      ob.nombre,
      ob.articulos || '—',
      ob.presentacion || '—',
      ob.periodo_actual,
      ob.fecha_vencimiento ? new Date(ob.fecha_vencimiento).toLocaleDateString('es-MX') : '—',
      ob.completada_periodo ? 'Cumplida' : ob.estado,
    ]),
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 70 },
      2: { cellWidth: 42 },
      3: { cellWidth: 24, halign: 'center' },
      4: { cellWidth: 24, halign: 'center' },
      5: { cellWidth: 24, halign: 'center' },
      6: { cellWidth: 22, halign: 'center' },
    },
    ...tableStyles(),
    didDrawCell: (data) => {
      if (data.section === 'body') {
        if (data.column.index === 6) {
          const val = String(data.cell.raw);
          doc.setTextColor(...(val === 'Cumplida' ? C.green : C.amber));
          doc.setFont('helvetica', 'bold');
        }
        if (data.column.index === 1 && obligaciones[data.row.index]?.completada_periodo) {
          doc.setTextColor(...C.green);
        }
      }
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY;
  doc.setFontSize(7.5);
  doc.setTextColor(...C.gray);
  doc.text(
    `${obligaciones.length} obligaciones · ${completadas} cumplidas · ${pendientes} pendientes`,
    10, finalY + 5
  );

  applyFooters(doc, empresa.razon_social);
  doc.save(`obligaciones-${empresa.razon_social.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
}
