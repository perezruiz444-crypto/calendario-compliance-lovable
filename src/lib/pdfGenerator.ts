import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Brand colors (Russell Bedford Navy) ──────────────────────────────
const C = {
  navy:        [15,  40,  80]  as [number,number,number],
  navyMid:     [25,  65,  120] as [number,number,number],
  navyLight:   [235, 241, 252] as [number,number,number],
  red:         [200, 35,  25]  as [number,number,number],
  redLight:    [254, 238, 236] as [number,number,number],
  amber:       [160, 100, 0]   as [number,number,number],
  amberLight:  [255, 248, 225] as [number,number,number],
  green:       [18,  90,  45]  as [number,number,number],
  greenLight:  [218, 245, 228] as [number,number,number],
  gray:        [80,  85,  95]  as [number,number,number],
  grayMid:     [140, 145, 155] as [number,number,number],
  grayLight:   [248, 249, 251] as [number,number,number],
  border:      [215, 220, 230] as [number,number,number],
  white:       [255, 255, 255] as [number,number,number],
  black:       [20,  22,  28]  as [number,number,number],
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

// ─── Paleta y tipos para reportes especializados ───────────────────────

const CATEGORY_PALETTE: Record<string, {
  accent: [number, number, number];
  accentLight: [number, number, number];
  accentMid: [number, number, number];
  label: string;
  subtitle: string;
}> = {
  immex:         { accent: [0,82,165],   accentLight: [224,237,255], accentMid: [0,112,210],  label: 'IMMEX',               subtitle: 'Programa de Industria Manufacturera' },
  prosec:        { accent: [46,125,50],  accentLight: [220,242,220], accentMid: [56,142,60],  label: 'PROSEC',              subtitle: 'Programas de Promoción Sectorial' },
  cert_iva_ieps: { accent: [123,31,162], accentLight: [243,229,245], accentMid: [142,36,170], label: 'CERT. IVA/IEPS',      subtitle: 'Certificación de IVA e IEPS' },
  padron:        { accent: [180,70,0],   accentLight: [255,240,220], accentMid: [210,90,0],   label: 'PADRÓN IMPORTADORES', subtitle: 'Padrón y Padrón de Sectores Específicos' },
  general:       { accent: [15,40,80],   accentLight: [235,241,252], accentMid: [25,65,120],  label: 'OEA / GENERAL',       subtitle: 'Obligaciones Generales de Comercio Exterior' },
  otro:          { accent: [55,71,79],   accentLight: [236,239,241], accentMid: [69,90,100],  label: 'OTRAS OBLIGACIONES',  subtitle: 'Obligaciones Diversas' },
};

export interface ObligacionCategoriaItem {
  nombre: string;
  empresa: string;
  fecha_vencimiento: string | null;
  dias_restantes: number | null;
  completada: boolean;
  presentacion: string | null;
  riesgo: 'alto' | 'medio' | 'bajo';
}

export interface CategoriaReportData {
  categoria: string;
  empresa: { razon_social: string; rfc?: string };
  period: string;
  obligaciones: ObligacionCategoriaItem[];
  resumen: {
    total: number;
    completadas: number;
    pendientes: number;
    vencenEn30: number;
    vencenEn90: number;
    tasaCumplimiento: number;
  };
}

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
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.3);
    doc.line(0, ph - 10, pw, ph - 10);
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
  // banda de fondo muy sutil
  doc.setFillColor(245, 247, 252);
  doc.rect(10, y, pw - 20, 8.5, 'F');
  // barra izquierda accent
  doc.setFillColor(...accent);
  doc.rect(10, y, 3.5, 8.5, 'F');
  doc.setFontSize(8.5);
  doc.setTextColor(...C.black);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 17, y + 6);
  doc.setFont('helvetica', 'normal');
  return y + 13;
}

// ─── KPI card ──────────────────────────────────────────────────────────

function kpiCard(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  label: string, value: string,
  accent: [number,number,number] = C.navy
) {
  // fondo blanco con sombra simulada (rect gris claro offset 1px)
  doc.setFillColor(235, 237, 242);
  doc.roundedRect(x + 0.5, y + 0.5, w, h, 2, 2, 'F');
  doc.setFillColor(...C.white);
  doc.roundedRect(x, y, w, h, 2, 2, 'F');
  // borde izquierdo accent de 3px
  doc.setFillColor(...accent);
  doc.rect(x, y, 3, h, 'F');
  // valor
  doc.setFontSize(20);
  doc.setTextColor(...accent);
  doc.setFont('helvetica', 'bold');
  doc.text(value, x + w / 2 + 1.5, y + h / 2 + 2, { align: 'center' });
  // label
  doc.setFontSize(6.5);
  doc.setTextColor(...C.grayMid);
  doc.setFont('helvetica', 'normal');
  doc.text(label.toUpperCase(), x + w / 2 + 1.5, y + h - 4, { align: 'center' });
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
      fontSize: 7.5,
      cellPadding: { top: 4.5, bottom: 4.5, left: 5, right: 5 },
      lineColor: accentColor,
      lineWidth: 0,
    },
    bodyStyles: {
      fontSize: 7.2,
      cellPadding: { top: 3.5, bottom: 3.5, left: 5, right: 5 },
      textColor: C.black,
      lineColor: C.border,
      lineWidth: 0.2,
    },
    alternateRowStyles: { fillColor: C.grayLight },
    tableLineColor: C.border,
    tableLineWidth: 0,
    rowPageBreak: 'avoid' as const,
    styles: { overflow: 'ellipsize' as const },
    margin: { left: 10, right: 10 },
  };
}

// ══════════════════════════════════════════════════════════════════════
// MAIN REPORT PDF
// ══════════════════════════════════════════════════════════════════════

export async function generateReportPDF(
  empresa: EmpresaData,
  reportData: ReportData,
  period: string,
  reportType: string  // conservado por compatibilidad, no se usa
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

  // Fondo navy completo en los primeros 80mm
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, pw, 80, 'F');

  // Banda lateral izquierda de 8mm en navyMid
  doc.setFillColor(...C.navyMid);
  doc.rect(0, 0, 8, 80, 'F');

  // Triángulo en esquina inferior derecha en navyMid
  doc.setFillColor(...C.navyMid);
  doc.triangle(pw - 50, 80, pw, 80, pw, 30, 'F');

  // Badge de período en esquina superior derecha
  doc.setFillColor(...C.red);
  doc.roundedRect(pw - 72, 10, 62, 10, 2, 2, 'F');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'bold');
  doc.text(periodText.toUpperCase(), pw - 41, 16.5, { align: 'center' });

  doc.setFontSize(22);
  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORTE DE GESTIÓN', 18, 38);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 205, 230);
  doc.text('Comercio Exterior · Cumplimiento Regulatorio', 18, 50);

  // Empresa card blanca debajo (sombra simulada)
  doc.setFillColor(220, 223, 230);
  doc.roundedRect(10.5, 88.5, pw - 20, 30, 3, 3, 'F');
  doc.setFillColor(...C.white);
  doc.roundedRect(10, 88, pw - 20, 30, 3, 3, 'F');
  doc.setFillColor(...C.navy);
  doc.rect(10, 88, 4, 30, 'F');

  doc.setFontSize(13);
  doc.setTextColor(...C.navy);
  doc.setFont('helvetica', 'bold');
  doc.text(empresa.razon_social, 20, 100);

  doc.setFontSize(8.5);
  doc.setTextColor(...C.gray);
  doc.setFont('helvetica', 'normal');
  doc.text(`RFC: ${empresa.rfc}`, 20, 108);
  doc.setFontSize(7.5);
  doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, pw - 15, 108, { align: 'right' });

  // ── KPI SECTION ───────────────────────────────────────────────────

  let y = 130;
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

  // ── VENCIMIENTOS PRÓXIMOS 90 DÍAS ─────────────────────────────────

  const certsVenc = reportData.certificacionesVencimiento || [];
  if (certsVenc.length > 0) {
    doc.addPage('portrait');
    drawPageHeader(doc, empresa.razon_social, 'Vencimientos Próximos');
    y = 22;
    y = sectionHeading(doc, 'VENCIMIENTOS PRÓXIMOS 90 DÍAS', y, C.amber);

    // Convertir al formato ObligacionCategoriaItem[] para usar drawVencimientosRoadmap
    const hoy = new Date();
    const asObligaciones: ObligacionCategoriaItem[] = certsVenc
      .filter(c => {
        const dias = c.dias_restantes !== undefined
          ? c.dias_restantes
          : Math.ceil((new Date(c.fecha_vencimiento).getTime() - hoy.getTime()) / 86400000);
        return dias <= 90;
      })
      .map(c => {
        const dias = c.dias_restantes !== undefined
          ? c.dias_restantes
          : Math.ceil((new Date(c.fecha_vencimiento).getTime() - hoy.getTime()) / 86400000);
        const riesgo: 'alto' | 'medio' | 'bajo' = dias <= 7 ? 'alto' : dias <= 30 ? 'medio' : 'bajo';
        return {
          nombre: `${c.tipo} — ${c.razon_social}`,
          empresa: c.razon_social,
          fecha_vencimiento: c.fecha_vencimiento,
          dias_restantes: dias,
          completada: false,
          presentacion: null,
          riesgo,
        };
      });

    if (asObligaciones.length > 0) {
      y = drawVencimientosRoadmap(doc, asObligaciones, y, C.amber, 90);
    } else {
      doc.setFontSize(8.5);
      doc.setTextColor(...C.gray);
      doc.text('No hay vencimientos próximos en los siguientes 90 días.', 10, y + 6);
    }
  }

  applyFooters(doc, empresa.razon_social);
  doc.save(`reporte-${empresa.razon_social.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
}


// ══════════════════════════════════════════════════════════════════════
// CATEGORY SPECIALIZED PDF HELPERS
// ══════════════════════════════════════════════════════════════════════

function drawCategoryHeader(
  doc: jsPDF,
  empresa: { razon_social: string; rfc?: string },
  categoria: string,
  period: string
) {
  const pw = doc.internal.pageSize.getWidth();
  const pal = CATEGORY_PALETTE[categoria] || CATEGORY_PALETTE['general'];

  const periodText =
    period === 'mes_actual'   ? 'Mes Actual'       :
    period === 'mes_anterior' ? 'Mes Anterior'     :
    period === 'trimestre'    ? 'Último Trimestre' :
    period === 'semestre'     ? 'Último Semestre'  : 'Año Actual';

  doc.setFillColor(...pal.accent);
  doc.rect(0, 0, pw, 70, 'F');
  doc.setFillColor(...pal.accentMid);
  doc.triangle(pw - 50, 0, pw, 0, pw, 50, 'F');

  // Banda lateral oscura (accentMid oscurecido)
  doc.setFillColor(
    Math.max(0, pal.accent[0] - 20),
    Math.max(0, pal.accent[1] - 20),
    Math.max(0, pal.accent[2] - 20)
  );
  doc.rect(0, 0, 6, 70, 'F');

  doc.setFontSize(22);
  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'bold');
  doc.text(pal.label, 16, 28);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 215, 240);
  doc.text(pal.subtitle, 16, 38);

  doc.setFillColor(...pal.accentMid);
  doc.roundedRect(16, 46, 60, 10, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'bold');
  doc.text(periodText.toUpperCase(), 46, 52.5, { align: 'center' });

  doc.setFillColor(...C.white);
  doc.roundedRect(10, 78, pw - 20, 28, 3, 3, 'F');
  doc.setFillColor(...pal.accent);
  doc.rect(10, 78, 4, 28, 'F');

  doc.setFontSize(13);
  doc.setTextColor(...pal.accent);
  doc.setFont('helvetica', 'bold');
  doc.text(empresa.razon_social, 19, 89);

  doc.setFontSize(8);
  doc.setTextColor(...C.gray);
  doc.setFont('helvetica', 'normal');
  if (empresa.rfc) doc.text(`RFC: ${empresa.rfc}`, 19, 97);
  doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, pw - 15, 97, { align: 'right' });
}

function drawCategoryObligacionesTable(
  doc: jsPDF,
  obligaciones: ObligacionCategoriaItem[],
  y: number,
  accent: [number, number, number]
): number {
  if (obligaciones.length === 0) return y;

  autoTable(doc, {
    startY: y,
    margin: { left: 10, right: 10 },
    head: [['Obligación', 'Presentación', 'Vencimiento', 'Días Rest.', 'Estado']],
    body: obligaciones.map(ob => [
      ob.nombre,
      ob.presentacion || '—',
      ob.fecha_vencimiento ? new Date(ob.fecha_vencimiento).toLocaleDateString('es-MX') : '—',
      ob.dias_restantes !== null ? `${ob.dias_restantes}d` : '—',
      ob.completada ? 'Cumplida' : 'Pendiente',
    ]),
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 35, halign: 'center' },
      2: { cellWidth: 30, halign: 'center' },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 23, halign: 'center' },
    },
    ...tableStyles(accent),
    didDrawCell: (data) => {
      if (data.section === 'body') {
        if (data.column.index === 4) {
          const val = String(data.cell.raw);
          doc.setTextColor(...(val === 'Cumplida' ? C.green : C.amber));
          doc.setFont('helvetica', 'bold');
        }
        if (data.column.index === 3) {
          const raw = String(data.cell.raw);
          const dias = parseInt(raw);
          if (!isNaN(dias)) {
            doc.setTextColor(...(dias <= 7 ? C.red : dias <= 30 ? C.amber : C.green));
            doc.setFont('helvetica', 'bold');
          }
        }
      }
    },
  });
  return (doc as any).lastAutoTable.finalY + 8;
}

function drawVencimientosRoadmap(
  doc: jsPDF,
  obligaciones: ObligacionCategoriaItem[],
  y: number,
  accent: [number, number, number],
  diasHorizonte = 90
): number {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const proximas = obligaciones
    .filter(ob => !ob.completada && ob.dias_restantes !== null && ob.dias_restantes <= diasHorizonte)
    .sort((a, b) => (a.dias_restantes ?? 0) - (b.dias_restantes ?? 0));

  if (proximas.length === 0) {
    doc.setFontSize(8.5);
    doc.setTextColor(...C.gray);
    doc.text('No hay vencimientos próximos en los siguientes 90 días.', 10, y + 6);
    return y + 14;
  }

  const barMaxW = pw - 100;
  const maxDias = Math.max(...proximas.map(ob => ob.dias_restantes ?? 1), 1);

  proximas.forEach(ob => {
    if (y > ph - 25) { doc.addPage(); y = 22; }

    const dias = ob.dias_restantes ?? 0;
    const color: [number, number, number] = dias <= 7 ? C.red : dias <= 30 ? C.amber : C.green;
    const barW = Math.max(4, (dias / maxDias) * barMaxW);

    doc.setFontSize(7.5);
    doc.setTextColor(...C.black);
    doc.setFont('helvetica', 'normal');
    const label = ob.nombre.length > 38 ? ob.nombre.substring(0, 36) + '…' : ob.nombre;
    doc.text(label, 10, y + 4);

    doc.setFillColor(...C.border);
    doc.roundedRect(10, y + 6, barMaxW, 4, 1, 1, 'F');
    doc.setFillColor(...color);
    doc.roundedRect(10, y + 6, barW, 4, 1, 1, 'F');

    doc.setFontSize(7);
    doc.setTextColor(...color);
    doc.setFont('helvetica', 'bold');
    doc.text(`${dias}d`, 10 + barMaxW + 4, y + 9.5);

    doc.setTextColor(...C.gray);
    doc.setFont('helvetica', 'normal');
    if (ob.fecha_vencimiento) {
      doc.text(new Date(ob.fecha_vencimiento).toLocaleDateString('es-MX'), pw - 10, y + 9.5, { align: 'right' });
    }
    y += 14;
  });

  return y + 4;
}

function drawRiskMatrix(
  doc: jsPDF,
  obligaciones: ObligacionCategoriaItem[],
  y: number,
  _accent: [number, number, number]
): number {
  const pw = doc.internal.pageSize.getWidth();
  const alto  = obligaciones.filter(ob => ob.riesgo === 'alto');
  const medio = obligaciones.filter(ob => ob.riesgo === 'medio');
  const bajo  = obligaciones.filter(ob => ob.riesgo === 'bajo');

  const colW = (pw - 20 - 8) / 3;
  const levels: Array<{ label: string; items: ObligacionCategoriaItem[]; color: [number,number,number]; light: [number,number,number] }> = [
    { label: 'RIESGO ALTO',  items: alto,  color: C.red,   light: C.redLight   },
    { label: 'RIESGO MEDIO', items: medio, color: C.amber, light: C.amberLight },
    { label: 'RIESGO BAJO',  items: bajo,  color: C.green, light: C.greenLight },
  ];

  levels.forEach((lvl, i) => {
    const x = 10 + i * (colW + 4);
    doc.setFillColor(...lvl.color);
    doc.roundedRect(x, y, colW, 8, 2, 2, 'F');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.white);
    doc.setFont('helvetica', 'bold');
    doc.text(`${lvl.label} (${lvl.items.length})`, x + colW / 2, y + 5.5, { align: 'center' });

    doc.setFillColor(...lvl.light);
    const bodyH = Math.max(10, lvl.items.length * 8 + 6);
    doc.roundedRect(x, y + 8, colW, bodyH, 2, 2, 'F');

    doc.setFontSize(7);
    doc.setTextColor(...C.black);
    doc.setFont('helvetica', 'normal');
    lvl.items.slice(0, 5).forEach((ob, j) => {
      const txt = ob.nombre.length > 28 ? ob.nombre.substring(0, 26) + '…' : ob.nombre;
      doc.text(`· ${txt}`, x + 3, y + 14 + j * 8);
    });
    if (lvl.items.length > 5) {
      doc.setTextColor(...C.gray);
      doc.text(`+${lvl.items.length - 5} más`, x + 3, y + 14 + 5 * 8);
    }
  });

  const maxItems = Math.max(alto.length, medio.length, bajo.length, 1);
  return y + Math.max(40, maxItems * 8 + 18);
}

// ══════════════════════════════════════════════════════════════════════
// CATEGORY SPECIALIZED REPORT PDF
// ══════════════════════════════════════════════════════════════════════

export async function generateCategoriaReportPDF(data: CategoriaReportData): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const ph = doc.internal.pageSize.getHeight();
  const pal = CATEGORY_PALETTE[data.categoria] || CATEGORY_PALETTE['general'];

  // ── PORTADA ───────────────────────────────────────────────────────
  drawCategoryHeader(doc, data.empresa, data.categoria, data.period);

  let y = 116;
  const { resumen } = data;
  const tasaColor: [number,number,number] = resumen.tasaCumplimiento >= 80 ? C.green : resumen.tasaCumplimiento >= 50 ? C.amber : C.red;

  const kpis = [
    { label: 'Total',       value: String(resumen.total),       color: pal.accent as [number,number,number] },
    { label: 'Cumplidas',   value: String(resumen.completadas), color: C.green },
    { label: 'Pendientes',  value: String(resumen.pendientes),  color: C.amber },
    { label: 'Cumplimiento',value: `${resumen.tasaCumplimiento}%`, color: tasaColor },
  ];
  const cardW = (doc.internal.pageSize.getWidth() - 20 - 9) / 4;
  const cardH = 26;
  kpis.forEach((k, i) => kpiCard(doc, 10 + i * (cardW + 3), y, cardW, cardH, k.label, k.value, k.color));
  y += cardH + 6;

  doc.setFontSize(7.5);
  doc.setTextColor(...C.gray);
  doc.text('Tasa de cumplimiento', 10, y + 3);
  doc.setTextColor(...tasaColor);
  doc.setFont('helvetica', 'bold');
  doc.text(`${resumen.tasaCumplimiento}%`, doc.internal.pageSize.getWidth() - 10, y + 3, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  progressBar(doc, 10, y + 5, doc.internal.pageSize.getWidth() - 20, resumen.tasaCumplimiento, tasaColor);
  y += 16;

  // ── ESTADO ACTUAL ─────────────────────────────────────────────────
  if (y > ph - 60) { doc.addPage(); y = 20; drawPageHeader(doc, data.empresa.razon_social, pal.label); }
  y = sectionHeading(doc, 'ESTADO ACTUAL DE OBLIGACIONES', y, pal.accent as [number,number,number]);
  y = drawCategoryObligacionesTable(doc, data.obligaciones, y, pal.accent as [number,number,number]);

  // ── PRÓXIMOS VENCIMIENTOS ─────────────────────────────────────────
  if (y > ph - 60) { doc.addPage(); y = 20; drawPageHeader(doc, data.empresa.razon_social, pal.label); }
  y = sectionHeading(doc, 'PRÓXIMOS VENCIMIENTOS (90 DÍAS)', y, C.amber);
  y = drawVencimientosRoadmap(doc, data.obligaciones, y, pal.accent as [number,number,number]);

  // ── ANÁLISIS DE RIESGO ────────────────────────────────────────────
  if (y > ph - 70) { doc.addPage(); y = 20; drawPageHeader(doc, data.empresa.razon_social, pal.label); }
  y = sectionHeading(doc, 'ANÁLISIS DE RIESGO', y, C.red);
  drawRiskMatrix(doc, data.obligaciones, y, pal.accent as [number,number,number]);

  applyFooters(doc, data.empresa.razon_social);
  doc.save(`reporte-${data.categoria}-${data.empresa.razon_social.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
}

// ══════════════════════════════════════════════════════════════════════
// CUMPLIMIENTO MENSUAL FIRMABLE PDF
// ══════════════════════════════════════════════════════════════════════

export interface CumplimientoMensualData {
  empresa: { razon_social: string; rfc?: string };
  period: string;         // ej. "2025-05"
  periodLabel: string;    // ej. "Mayo 2025"
  categorias: Array<{
    key: string;
    label: string;
    obligaciones: Array<{
      nombre: string;
      presentacion: string | null;
      fecha_vencimiento: string | null;
      completada: boolean;
      completada_en: string | null;
      notas: string | null;
    }>;
  }>;
  resumen: {
    total: number;
    completadas: number;
    pendientes: number;
    tasaCumplimiento: number;
  };
}

export async function generateCumplimientoMensualPDF(data: CumplimientoMensualData): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  // ── PORTADA ───────────────────────────────────────────────────────

  // Fondo navy en los primeros 70mm
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, pw, 70, 'F');

  // Banda lateral izquierda navyMid
  doc.setFillColor(...C.navyMid);
  doc.rect(0, 0, 8, 70, 'F');

  // Triángulo navyMid en esquina inferior derecha
  doc.setFillColor(...C.navyMid);
  doc.triangle(pw - 50, 70, pw, 70, pw, 20, 'F');

  // Título principal
  doc.setFontSize(18);
  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORTE DE CUMPLIMIENTO MENSUAL', 18, 28);

  // Subtítulo
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 205, 230);
  doc.text('Comercio Exterior · Cumplimiento Regulatorio', 18, 38);

  // Badge período en rojo
  doc.setFillColor(...C.red);
  doc.roundedRect(18, 46, 55, 10, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(...C.white);
  doc.setFont('helvetica', 'bold');
  doc.text(data.periodLabel.toUpperCase(), 45.5, 52.5, { align: 'center' });

  // Card empresa blanca
  doc.setFillColor(220, 223, 230);
  doc.roundedRect(10.5, 78.5, pw - 20, 28, 3, 3, 'F');
  doc.setFillColor(...C.white);
  doc.roundedRect(10, 78, pw - 20, 28, 3, 3, 'F');
  doc.setFillColor(...C.navy);
  doc.rect(10, 78, 4, 28, 'F');

  doc.setFontSize(13);
  doc.setTextColor(...C.navy);
  doc.setFont('helvetica', 'bold');
  doc.text(data.empresa.razon_social, 20, 90);

  doc.setFontSize(8.5);
  doc.setTextColor(...C.gray);
  doc.setFont('helvetica', 'normal');
  if (data.empresa.rfc) doc.text(`RFC: ${data.empresa.rfc}`, 20, 99);
  doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, pw - 15, 99, { align: 'right' });

  // ── KPI CARDS ─────────────────────────────────────────────────────

  let y = 116;
  const { resumen } = data;
  const tasaColor: [number,number,number] = resumen.tasaCumplimiento >= 80 ? C.green : resumen.tasaCumplimiento >= 50 ? C.amber : C.red;

  const kpis = [
    { label: 'Total',        value: String(resumen.total),             color: C.navy     },
    { label: 'Cumplidas',    value: String(resumen.completadas),       color: C.green    },
    { label: 'Pendientes',   value: String(resumen.pendientes),        color: C.amber    },
    { label: 'Tasa %',       value: `${resumen.tasaCumplimiento}%`,    color: tasaColor  },
  ];
  const cardW = (pw - 20 - 9) / 4;
  const cardH = 24;
  kpis.forEach((k, i) => kpiCard(doc, 10 + i * (cardW + 3), y, cardW, cardH, k.label, k.value, k.color));
  y += cardH + 6;

  // Barra de progreso
  doc.setFontSize(7.5);
  doc.setTextColor(...C.gray);
  doc.text('Porcentaje de cumplimiento del período:', 10, y + 3);
  doc.setTextColor(...tasaColor);
  doc.setFont('helvetica', 'bold');
  doc.text(`${resumen.tasaCumplimiento}%`, pw - 10, y + 3, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  progressBar(doc, 10, y + 5, pw - 20, resumen.tasaCumplimiento, tasaColor);
  y += 16;

  // ── RESUMEN POR CATEGORÍA ─────────────────────────────────────────

  const catsConObligaciones = data.categorias.filter(c => c.obligaciones.length > 0);

  if (catsConObligaciones.length > 0) {
    if (y > ph - 60) { doc.addPage(); y = 20; drawPageHeader(doc, data.empresa.razon_social, 'Cumplimiento Mensual'); }
    y = sectionHeading(doc, 'RESUMEN POR CATEGORÍA', y, C.navy);

    autoTable(doc, {
      startY: y,
      margin: { left: 10, right: 10 },
      head: [['Programa', 'Cumplidas / Total', 'Tasa %']],
      body: catsConObligaciones.map(cat => {
        const cumplidas = cat.obligaciones.filter(o => o.completada).length;
        const total = cat.obligaciones.length;
        const tasa = total > 0 ? Math.round((cumplidas / total) * 100) : 0;
        return [cat.label, `${cumplidas} / ${total}`, `${tasa}%`];
      }),
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 40, halign: 'center' },
        2: { cellWidth: 28, halign: 'center' },
      },
      ...tableStyles(C.navy),
      didDrawCell: (cellData) => {
        if (cellData.section === 'body' && cellData.column.index === 2) {
          const tasa = parseInt(String(cellData.cell.raw));
          if (!isNaN(tasa)) {
            doc.setTextColor(...(tasa >= 80 ? C.green : tasa >= 50 ? C.amber : C.red));
            doc.setFont('helvetica', 'bold');
          }
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ── DETALLE POR CATEGORÍA ─────────────────────────────────────────

  for (const cat of catsConObligaciones) {
    if (y > ph - 60) { doc.addPage(); y = 20; drawPageHeader(doc, data.empresa.razon_social, 'Cumplimiento Mensual'); }

    const pal = CATEGORY_PALETTE[cat.key] || CATEGORY_PALETTE['general'];
    y = sectionHeading(doc, cat.label.toUpperCase(), y, pal.accent as [number,number,number]);

    autoTable(doc, {
      startY: y,
      margin: { left: 10, right: 10 },
      head: [['Obligación', 'Periodicidad', 'Vencimiento', 'Cumplida', 'Cumplida El', 'Notas']],
      body: cat.obligaciones.map(ob => [
        ob.nombre,
        ob.presentacion || '—',
        ob.fecha_vencimiento ? new Date(ob.fecha_vencimiento).toLocaleDateString('es-MX') : '—',
        ob.completada ? 'Sí' : 'No',
        ob.completada_en ? new Date(ob.completada_en).toLocaleDateString('es-MX') : '—',
        ob.notas || '—',
      ]),
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 25, halign: 'center' },
        5: { cellWidth: 'auto' },
      },
      ...tableStyles(pal.accent as [number,number,number]),
      didDrawCell: (cellData) => {
        if (cellData.section === 'body' && cellData.column.index === 3) {
          const val = String(cellData.cell.raw);
          doc.setTextColor(...(val === 'Sí' ? C.green : C.amber));
          doc.setFont('helvetica', 'bold');
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ── SECCIÓN DE FIRMAS ─────────────────────────────────────────────

  if (y > ph - 65) { doc.addPage(); y = 20; drawPageHeader(doc, data.empresa.razon_social, 'Cumplimiento Mensual'); }
  y = sectionHeading(doc, 'FIRMAS DE CONFORMIDAD', y, C.navy);

  const firmas = [
    'Responsable de Cumplimiento',
    'Gerente / Director General',
    'Asesor Externo',
  ];
  const firmaW = 60;
  const firmaGap = (pw - 20 - firmas.length * firmaW) / (firmas.length - 1);

  firmas.forEach((label, i) => {
    const fx = 10 + i * (firmaW + firmaGap);
    const fy = y + 20;
    // Línea de firma
    doc.setDrawColor(...C.black);
    doc.setLineWidth(0.4);
    doc.line(fx, fy, fx + firmaW, fy);
    // Etiqueta
    doc.setFontSize(7);
    doc.setTextColor(...C.gray);
    doc.setFont('helvetica', 'normal');
    doc.text(label, fx + firmaW / 2, fy + 5, { align: 'center' });
  });

  y += 38;

  doc.setFontSize(7.5);
  doc.setTextColor(...C.gray);
  doc.setFont('helvetica', 'normal');
  const certText = 'Este reporte certifica el estado de cumplimiento de las obligaciones de Comercio Exterior para el período indicado.';
  doc.text(certText, pw / 2, y, { align: 'center', maxWidth: pw - 30 });

  doc.setFontSize(7);
  doc.setTextColor(...C.grayMid);
  doc.text(`Fecha de generación: ${new Date().toLocaleString('es-MX')}`, pw / 2, y + 8, { align: 'center' });

  applyFooters(doc, data.empresa.razon_social);
  doc.save(`cumplimiento-mensual-${data.empresa.razon_social.replace(/\s+/g, '-')}-${data.period}.pdf`);
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
