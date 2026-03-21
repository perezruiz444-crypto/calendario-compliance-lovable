// =============================================
// Plantillas de correo — Calendario Compliance
// =============================================

const BRAND_TEAM = 'El Equipo de Compliance de Russell Bedford';
const PLATFORM_URL = 'https://calendario-compliance.lovable.app';

const NAVY   = '#003366';
const RED    = '#d52b1e';
const GREEN  = '#16a34a';
const AMBER  = '#d97706';
const GRAY   = '#6b7280';
const LIGHT  = '#f8fafc';
const BORDER = '#e2e8f0';

function baseLayout(content: string, preheader = ''): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Calendario Compliance</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Helvetica Neue',Arial,sans-serif;color:#1e293b;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>` : ''}
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid ${BORDER};">

        <!-- Header -->
        <tr>
          <td style="background:${NAVY};padding:0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:${RED};width:6px;">&nbsp;</td>
                <td style="padding:20px 24px;">
                  <p style="margin:0;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">Calendario Compliance</p>
                  <p style="margin:4px 0 0;color:#93b4d4;font-size:12px;">Comercio Exterior · Cumplimiento Regulatorio</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Content -->
        <tr><td style="padding:28px 28px 20px;">${content}</td></tr>

        <!-- Footer -->
        <tr>
          <td style="background:${LIGHT};border-top:1px solid ${BORDER};padding:16px 28px;">
            <p style="margin:0;font-size:12px;color:${GRAY};">
              <a href="${PLATFORM_URL}" style="color:${NAVY};font-weight:600;text-decoration:none;">Acceder a la plataforma</a>
              &nbsp;·&nbsp; ${BRAND_TEAM}
            </p>
            <p style="margin:6px 0 0;font-size:11px;color:#94a3b8;">Correo automático. Por favor no responda a este mensaje.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function sectionHeader(title: string, color: string = NAVY): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 10px;">
    <tr>
      <td style="background:${color};width:3px;border-radius:2px;">&nbsp;</td>
      <td style="padding:0 0 0 10px;font-size:13px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0.5px;">${title}</td>
    </tr>
  </table>`;
}

function obligacionRow(nombre: string, empresa: string, fecha: string, badgeColor: string, badgeText: string): string {
  const fmtFecha = fecha ? new Date(fecha).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' }) : '—';
  return `<tr style="border-bottom:1px solid ${BORDER};">
    <td style="padding:9px 8px;">
      <p style="margin:0;font-size:13px;font-weight:600;color:#1e293b;">${nombre}</p>
      ${empresa ? `<p style="margin:2px 0 0;font-size:11px;color:${GRAY};">${empresa}</p>` : ''}
    </td>
    <td style="padding:9px 8px;text-align:right;white-space:nowrap;">
      <span style="display:inline-block;background:${badgeColor}18;color:${badgeColor};font-size:11px;font-weight:700;border-radius:4px;padding:2px 7px;">${badgeText}</span>
      <p style="margin:2px 0 0;font-size:11px;color:${GRAY};text-align:right;">${fmtFecha}</p>
    </td>
  </tr>`;
}

function kpiCell(label: string, value: number, color: string): string {
  return `<td style="text-align:center;padding:14px 8px;border-right:1px solid ${BORDER};">
    <p style="margin:0;font-size:26px;font-weight:800;color:${color};">${value}</p>
    <p style="margin:3px 0 0;font-size:10px;color:${GRAY};text-transform:uppercase;letter-spacing:0.5px;">${label}</p>
  </td>`;
}

// ── Test Email ──────────────────────────────────────────────────────────

export function testEmailTemplate(userName: string, subject: string, message: string): string {
  return baseLayout(`
    <h2 style="margin:0 0 12px;font-size:20px;color:${NAVY};">${subject}</h2>
    <p style="margin:0 0 10px;">Hola <strong>${userName}</strong>,</p>
    <p style="margin:0;">${message}</p>
  `);
}

// ── Task Notifications ──────────────────────────────────────────────────

interface TareaRow {
  titulo: string;
  empresa: string;
  prioridad: string;
  fechaVencimiento: string;
}

export function taskNotificationTemplate(consultorName: string, titulo: string, tareas: TareaRow[]): string {
  const rows = tareas.map(t => {
    const color = t.prioridad === 'alta' ? RED : t.prioridad === 'media' ? AMBER : GREEN;
    const fmtFecha = t.fechaVencimiento ? new Date(t.fechaVencimiento).toLocaleDateString('es-MX') : '—';
    return `<tr style="border-bottom:1px solid ${BORDER};">
      <td style="padding:8px;font-size:13px;">${t.titulo}</td>
      <td style="padding:8px;font-size:13px;">${t.empresa}</td>
      <td style="padding:8px;"><span style="color:${color};font-weight:700;font-size:12px;text-transform:capitalize;">${t.prioridad||'-'}</span></td>
      <td style="padding:8px;font-size:13px;">${fmtFecha}</td>
    </tr>`;
  }).join('');

  return baseLayout(`
    <h2 style="margin:0 0 12px;font-size:20px;color:${NAVY};">${titulo}</h2>
    <p>Hola <strong>${consultorName}</strong>, tienes <strong>${tareas.length}</strong> tarea(s) que requieren atención:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:8px;overflow:hidden;">
      <thead>
        <tr style="background:${LIGHT};">
          <th style="padding:9px 8px;text-align:left;font-size:12px;color:${GRAY};">Tarea</th>
          <th style="padding:9px 8px;text-align:left;font-size:12px;color:${GRAY};">Empresa</th>
          <th style="padding:9px 8px;text-align:left;font-size:12px;color:${GRAY};">Prioridad</th>
          <th style="padding:9px 8px;text-align:left;font-size:12px;color:${GRAY};">Vencimiento</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `);
}

// ── Weekly Summary (NUEVO — reemplaza daily) ────────────────────────────

interface WeeklyItem {
  nombre: string;
  empresa: string;
  fecha: string;
  categoria?: string;
  prioridad?: string;
}

interface CertItem {
  empresa: string;
  tipo: string;
  fecha: string;
}

interface WeeklySummaryData {
  tareasVencidas: WeeklyItem[];
  tareasSemana: WeeklyItem[];
  obligacionesVencidas: WeeklyItem[];
  obligacionesSemana: WeeklyItem[];
  obligacionesMes: WeeklyItem[];
  certificacionesVencer: CertItem[];
}

const CATEGORIA_LABELS: Record<string, string> = {
  general: 'General', cert_iva_ieps: 'Cert. IVA/IEPS',
  immex: 'IMMEX', prosec: 'PROSEC', padron: 'Padrón', otro: 'Otro',
};

export function weeklySummaryTemplate(userName: string, data: WeeklySummaryData): string {
  const totalVencidas = data.obligacionesVencidas.length + data.tareasVencidas.length;
  const totalSemana   = data.obligacionesSemana.length + data.tareasSemana.length;
  const totalMes      = data.obligacionesMes.length;
  const totalCerts    = data.certificacionesVencer.length;

  const kpis = `
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:8px;overflow:hidden;margin:16px 0;">
      <tr>
        ${kpiCell('Vencidas', totalVencidas, totalVencidas > 0 ? RED : GRAY)}
        ${kpiCell('Esta semana', totalSemana, totalSemana > 0 ? AMBER : GRAY)}
        ${kpiCell('Este mes', totalMes, totalMes > 0 ? '#0ea5e9' : GRAY)}
        <td style="text-align:center;padding:14px 8px;">
          <p style="margin:0;font-size:26px;font-weight:800;color:${totalCerts > 0 ? AMBER : GRAY};">${totalCerts}</p>
          <p style="margin:3px 0 0;font-size:10px;color:${GRAY};text-transform:uppercase;letter-spacing:0.5px;">Certif. por vencer</p>
        </td>
      </tr>
    </table>`;

  let sections = '';

  // Obligaciones vencidas
  if (data.obligacionesVencidas.length > 0) {
    sections += sectionHeader('⚠ Obligaciones vencidas — acción inmediata', RED);
    sections += `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fee2e2;border-radius:8px;overflow:hidden;background:#fff5f5;">`;
    sections += data.obligacionesVencidas.map(o =>
      obligacionRow(o.nombre, o.empresa, o.fecha, RED, CATEGORIA_LABELS[o.categoria||''] || 'Obligación')
    ).join('');
    sections += `</table>`;
  }

  // Tareas vencidas
  if (data.tareasVencidas.length > 0) {
    sections += sectionHeader('⚠ Tareas vencidas', RED);
    sections += `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fee2e2;border-radius:8px;overflow:hidden;background:#fff5f5;">`;
    sections += data.tareasVencidas.map(t =>
      obligacionRow(t.nombre, t.empresa, t.fecha, RED, 'Tarea')
    ).join('');
    sections += `</table>`;
  }

  // Obligaciones esta semana
  if (data.obligacionesSemana.length > 0) {
    sections += sectionHeader('Esta semana — obligaciones por vencer', AMBER);
    sections += `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fde68a;border-radius:8px;overflow:hidden;">`;
    sections += data.obligacionesSemana.map(o =>
      obligacionRow(o.nombre, o.empresa, o.fecha, AMBER, CATEGORIA_LABELS[o.categoria||''] || 'Obligación')
    ).join('');
    sections += `</table>`;
  }

  // Tareas esta semana
  if (data.tareasSemana.length > 0) {
    sections += sectionHeader('Esta semana — tareas por vencer', AMBER);
    sections += `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #fde68a;border-radius:8px;overflow:hidden;">`;
    sections += data.tareasSemana.map(t =>
      obligacionRow(t.nombre, t.empresa, t.fecha, AMBER, t.prioridad || 'Tarea')
    ).join('');
    sections += `</table>`;
  }

  // Obligaciones este mes
  if (data.obligacionesMes.length > 0) {
    sections += sectionHeader('Este mes — próximas obligaciones', '#0ea5e9');
    sections += `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #bae6fd;border-radius:8px;overflow:hidden;">`;
    sections += data.obligacionesMes.map(o =>
      obligacionRow(o.nombre, o.empresa, o.fecha, '#0ea5e9', CATEGORIA_LABELS[o.categoria||''] || 'Obligación')
    ).join('');
    sections += `</table>`;
  }

  // Certificaciones
  if (data.certificacionesVencer.length > 0) {
    sections += sectionHeader('Programas y certificaciones próximos a vencer', AMBER);
    sections += `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:8px;overflow:hidden;">`;
    sections += data.certificacionesVencer.map(c =>
      obligacionRow(c.tipo, c.empresa, c.fecha, AMBER, 'Programa')
    ).join('');
    sections += `</table>`;
  }

  if (!sections) {
    sections = `<div style="text-align:center;padding:24px;color:${GREEN};">
      <p style="font-size:32px;margin:0;">✓</p>
      <p style="font-weight:700;color:${GREEN};margin:8px 0 4px;">¡Todo al día!</p>
      <p style="font-size:13px;color:${GRAY};margin:0;">No hay obligaciones ni tareas pendientes esta semana.</p>
    </div>`;
  }

  const preheader = totalVencidas > 0
    ? `${totalVencidas} obligacion(es) o tarea(s) vencida(s) requieren atención inmediata`
    : `Tienes ${totalSemana} vencimiento(s) esta semana`;

  return baseLayout(`
    <h2 style="margin:0 0 4px;font-size:20px;color:${NAVY};">Resumen Semanal de Cumplimiento</h2>
    <p style="margin:0 0 16px;font-size:13px;color:${GRAY};">
      Hola <strong>${userName}</strong>, aquí tu resumen de la semana en curso.
    </p>
    ${kpis}
    ${sections}
    <p style="margin:20px 0 0;font-size:12px;color:${GRAY};border-top:1px solid ${BORDER};padding-top:14px;">
      Este resumen se envía automáticamente cada lunes. Puedes gestionar tus notificaciones desde la plataforma.
    </p>
  `, preheader);
}

// ── Daily Summary (mantenido por compatibilidad) ────────────────────────

interface DailySummaryStats {
  overdueTasks: number;
  pendingTasks: number;
  upcomingDeadlines: number;
  expiringCertifications: number;
  expiringDocuments: number;
}

export function dailySummaryTemplate(userName: string, stats: DailySummaryStats): string {
  return weeklySummaryTemplate(userName, {
    tareasVencidas: Array(stats.overdueTasks).fill({ nombre: 'Tarea vencida', empresa: '', fecha: '' }),
    tareasSemana: Array(stats.upcomingDeadlines).fill({ nombre: 'Tarea próxima', empresa: '', fecha: '' }),
    obligacionesVencidas: [],
    obligacionesSemana: [],
    obligacionesMes: [],
    certificacionesVencer: Array(stats.expiringCertifications).fill({ empresa: '', tipo: 'Certificación', fecha: '' }),
  });
}

// ── Report Email ────────────────────────────────────────────────────────

interface ReportResumen {
  totalTareas: number;
  tareasCompletadas: number;
  tareasPendientes: number;
  tasaCompletitud: number;
}

export function reportEmailTemplate(
  empresa: { razonSocial: string; rfc: string },
  periodo: string,
  reportType: string,
  resumen: ReportResumen
): string {
  const color = resumen.tasaCompletitud >= 80 ? GREEN : resumen.tasaCompletitud >= 50 ? AMBER : RED;
  return baseLayout(`
    <h2 style="margin:0 0 12px;font-size:20px;color:${NAVY};">Reporte de Tareas</h2>
    <p style="margin:0 0 16px;"><strong>${empresa.razonSocial}</strong><br>
    <span style="font-size:12px;color:${GRAY};">RFC: ${empresa.rfc} · Período: ${periodo} · Tipo: ${reportType}</span></p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:8px;overflow:hidden;">
      <tr style="border-bottom:1px solid ${BORDER};"><td style="padding:10px 12px;font-size:13px;">Total de tareas</td><td style="padding:10px 12px;text-align:right;font-size:20px;font-weight:800;">${resumen.totalTareas}</td></tr>
      <tr style="border-bottom:1px solid ${BORDER};"><td style="padding:10px 12px;font-size:13px;">Completadas</td><td style="padding:10px 12px;text-align:right;font-size:20px;font-weight:800;color:${GREEN};">${resumen.tareasCompletadas}</td></tr>
      <tr style="border-bottom:1px solid ${BORDER};"><td style="padding:10px 12px;font-size:13px;">Pendientes</td><td style="padding:10px 12px;text-align:right;font-size:20px;font-weight:800;color:${AMBER};">${resumen.tareasPendientes}</td></tr>
      <tr><td style="padding:10px 12px;font-size:13px;">Tasa de completitud</td><td style="padding:10px 12px;text-align:right;font-size:20px;font-weight:800;color:${color};">${resumen.tasaCompletitud}%</td></tr>
    </table>
  `);
}

// ── New Message ─────────────────────────────────────────────────────────

export function newMessageTemplate(recipientName: string, senderName: string, asunto: string, contenido: string): string {
  const preview = contenido.length > 300 ? contenido.substring(0, 300) + '...' : contenido;
  return baseLayout(`
    <h2 style="margin:0 0 12px;font-size:20px;color:${NAVY};">Nuevo Mensaje</h2>
    <p>Hola <strong>${recipientName}</strong>, recibiste un mensaje de <strong>${senderName}</strong>:</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${BORDER};border-radius:8px;overflow:hidden;margin:16px 0;">
      <tr style="border-bottom:1px solid ${BORDER};"><td style="padding:9px 12px;font-size:12px;color:${GRAY};width:80px;">De</td><td style="padding:9px 12px;font-size:13px;font-weight:600;">${senderName}</td></tr>
      <tr style="border-bottom:1px solid ${BORDER};"><td style="padding:9px 12px;font-size:12px;color:${GRAY};">Asunto</td><td style="padding:9px 12px;font-size:13px;">${asunto}</td></tr>
      <tr><td style="padding:9px 12px;font-size:12px;color:${GRAY};vertical-align:top;">Mensaje</td><td style="padding:9px 12px;font-size:13px;">${preview}</td></tr>
    </table>
  `);
}

// ── User Invitation ─────────────────────────────────────────────────────

export function userInvitationTemplate(userName: string, setupLink: string | null): string {
  const linkSection = setupLink
    ? `<p>Para comenzar, configura tu contraseña:</p>
       <p style="margin:16px 0;"><a href="${setupLink}" style="background:${NAVY};color:#fff;padding:10px 22px;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px;">Crear mi contraseña</a></p>
       <p style="font-size:12px;color:${GRAY};">O copia: <a href="${setupLink}" style="color:${NAVY};word-break:break-all;">${setupLink}</a></p>`
    : `<p>Tu administrador te compartirá el enlace para configurar tu contraseña.</p>`;

  return baseLayout(`
    <h2 style="margin:0 0 12px;font-size:20px;color:${NAVY};">¡Bienvenido/a a la plataforma!</h2>
    <p>Hola <strong>${userName}</strong>,</p>
    <p>Has sido invitado/a al <strong>Calendario de Cumplimiento de Comercio Exterior</strong> de Russell Bedford.</p>
    ${linkSection}
    <p style="font-size:12px;color:${GRAY};margin-top:16px;"><strong>Importante:</strong> Este enlace expira en 7 días.</p>
  `);
}
