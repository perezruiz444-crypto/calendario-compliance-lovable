// =============================================
// Sistema de plantillas de correo - Compliance
// =============================================

const BRAND_COLOR = '#1a56db';
const BRAND_COLOR_LIGHT = '#e8effd';
const BRAND_NAME = 'Compliance Platform';
const TEXT_COLOR = '#1f2937';
const TEXT_MUTED = '#6b7280';
const BORDER_COLOR = '#e5e7eb';
const BG_COLOR = '#f3f4f6';
const CARD_BG = '#ffffff';
const DANGER_COLOR = '#dc2626';
const WARNING_COLOR = '#d97706';
const SUCCESS_COLOR = '#16a34a';

function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:${BG_COLOR};font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG_COLOR};padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:${CARD_BG};border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,${BRAND_COLOR},#2563eb);padding:28px 32px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">📋 ${BRAND_NAME}</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            ${content}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid ${BORDER_COLOR};background-color:#f9fafb;">
            <p style="margin:0;color:${TEXT_MUTED};font-size:12px;text-align:center;line-height:1.5;">
              Este es un correo automático enviado desde ${BRAND_NAME}.<br>
              Por favor no responda a este mensaje.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ---- Test Email ----
export function testEmailTemplate(userName: string, subject: string, message: string): string {
  return baseLayout(`
    <h2 style="margin:0 0 8px;color:${TEXT_COLOR};font-size:20px;">${subject}</h2>
    <p style="color:${TEXT_MUTED};font-size:15px;line-height:1.6;">Hola <strong>${userName}</strong>,</p>
    <div style="background-color:${BRAND_COLOR_LIGHT};padding:20px;border-radius:8px;margin:16px 0;border-left:4px solid ${BRAND_COLOR};">
      <p style="color:${TEXT_COLOR};font-size:15px;line-height:1.6;margin:0;">${message}</p>
    </div>
    <p style="color:${TEXT_MUTED};font-size:13px;margin-top:20px;">Este es un correo de prueba enviado desde la plataforma.</p>
  `);
}

// ---- Task Notifications ----
interface TareaRow {
  titulo: string;
  empresa: string;
  prioridad: string;
  fechaVencimiento: string;
}

export function taskNotificationTemplate(
  consultorName: string,
  titulo: string,
  tareas: TareaRow[]
): string {
  const rows = tareas.map(t => {
    const pColor = t.prioridad === 'alta' ? DANGER_COLOR : t.prioridad === 'media' ? WARNING_COLOR : SUCCESS_COLOR;
    return `<tr style="border-bottom:1px solid ${BORDER_COLOR};">
      <td style="padding:10px 12px;color:${TEXT_COLOR};font-size:14px;">${t.titulo}</td>
      <td style="padding:10px 12px;color:${TEXT_MUTED};font-size:14px;">${t.empresa}</td>
      <td style="padding:10px 12px;"><span style="color:${pColor};font-weight:600;font-size:13px;text-transform:capitalize;">${t.prioridad || '-'}</span></td>
      <td style="padding:10px 12px;color:${TEXT_MUTED};font-size:14px;">${t.fechaVencimiento}</td>
    </tr>`;
  }).join('');

  return baseLayout(`
    <h2 style="margin:0 0 8px;color:${TEXT_COLOR};font-size:20px;">${titulo}</h2>
    <p style="color:${TEXT_MUTED};font-size:15px;">Hola <strong>${consultorName}</strong>,</p>
    <p style="color:${TEXT_MUTED};font-size:14px;">Tienes <strong>${tareas.length}</strong> tarea(s) que requieren tu atención:</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;border:1px solid ${BORDER_COLOR};border-radius:8px;overflow:hidden;">
      <thead>
        <tr style="background-color:${BRAND_COLOR_LIGHT};">
          <th style="padding:10px 12px;text-align:left;color:${BRAND_COLOR};font-size:13px;font-weight:600;">Tarea</th>
          <th style="padding:10px 12px;text-align:left;color:${BRAND_COLOR};font-size:13px;font-weight:600;">Empresa</th>
          <th style="padding:10px 12px;text-align:left;color:${BRAND_COLOR};font-size:13px;font-weight:600;">Prioridad</th>
          <th style="padding:10px 12px;text-align:left;color:${BRAND_COLOR};font-size:13px;font-weight:600;">Vencimiento</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="color:${TEXT_MUTED};font-size:13px;">Accede a tu panel para más detalles.</p>
  `);
}

// ---- Daily Summary ----
interface DailySummaryStats {
  overdueTasks: number;
  pendingTasks: number;
  upcomingDeadlines: number;
  expiringCertifications: number;
  expiringDocuments: number;
}

export function dailySummaryTemplate(userName: string, stats: DailySummaryStats): string {
  const items: string[] = [];

  const addRow = (icon: string, label: string, value: number, color: string) => {
    if (value > 0) {
      items.push(`<tr style="border-bottom:1px solid ${BORDER_COLOR};">
        <td style="padding:14px 16px;color:${TEXT_COLOR};font-size:14px;">${icon} ${label}</td>
        <td style="padding:14px 16px;text-align:right;font-size:22px;font-weight:700;color:${color};">${value}</td>
      </tr>`);
    }
  };

  addRow('⚠️', 'Tareas Vencidas', stats.overdueTasks, DANGER_COLOR);
  addRow('📝', 'Tareas Pendientes', stats.pendingTasks, TEXT_COLOR);
  addRow('🔔', 'Próximas a vencer (7 días)', stats.upcomingDeadlines, WARNING_COLOR);
  addRow('📜', 'Certificaciones próximas a vencer', stats.expiringCertifications, WARNING_COLOR);
  addRow('📄', 'Documentos próximos a vencer', stats.expiringDocuments, WARNING_COLOR);

  return baseLayout(`
    <h2 style="margin:0 0 8px;color:${TEXT_COLOR};font-size:20px;">📋 Resumen Diario de Actividades</h2>
    <p style="color:${TEXT_MUTED};font-size:15px;">Hola <strong>${userName}</strong>,</p>
    <p style="color:${TEXT_MUTED};font-size:14px;">Aquí tienes tu resumen de actividades pendientes:</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;border:1px solid ${BORDER_COLOR};border-radius:8px;overflow:hidden;">
      <tbody>${items.join('')}</tbody>
    </table>
    <p style="color:${TEXT_MUTED};font-size:13px;">Accede a tu panel para más detalles.</p>
  `);
}

// ---- Report Email ----
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
  const completitudColor = resumen.tasaCompletitud >= 80 ? SUCCESS_COLOR : resumen.tasaCompletitud >= 50 ? WARNING_COLOR : DANGER_COLOR;

  return baseLayout(`
    <h2 style="margin:0 0 8px;color:${TEXT_COLOR};font-size:20px;">📊 Reporte de Tareas</h2>
    <div style="background-color:${BG_COLOR};padding:16px;border-radius:8px;margin:16px 0;">
      <p style="margin:0 0 6px;color:${TEXT_COLOR};font-size:16px;font-weight:600;">${empresa.razonSocial}</p>
      <p style="margin:0;color:${TEXT_MUTED};font-size:13px;"><strong>RFC:</strong> ${empresa.rfc} &nbsp;|&nbsp; <strong>Período:</strong> ${periodo} &nbsp;|&nbsp; <strong>Tipo:</strong> ${reportType}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;border:1px solid ${BORDER_COLOR};border-radius:8px;overflow:hidden;">
      <tr style="border-bottom:1px solid ${BORDER_COLOR};">
        <td style="padding:12px 16px;color:${TEXT_MUTED};font-size:14px;">Total de tareas</td>
        <td style="padding:12px 16px;text-align:right;font-size:18px;font-weight:700;color:${TEXT_COLOR};">${resumen.totalTareas}</td>
      </tr>
      <tr style="border-bottom:1px solid ${BORDER_COLOR};">
        <td style="padding:12px 16px;color:${TEXT_MUTED};font-size:14px;">Completadas</td>
        <td style="padding:12px 16px;text-align:right;font-size:18px;font-weight:700;color:${SUCCESS_COLOR};">${resumen.tareasCompletadas}</td>
      </tr>
      <tr style="border-bottom:1px solid ${BORDER_COLOR};">
        <td style="padding:12px 16px;color:${TEXT_MUTED};font-size:14px;">Pendientes</td>
        <td style="padding:12px 16px;text-align:right;font-size:18px;font-weight:700;color:${WARNING_COLOR};">${resumen.tareasPendientes}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;color:${TEXT_MUTED};font-size:14px;">Tasa de completitud</td>
        <td style="padding:12px 16px;text-align:right;font-size:18px;font-weight:700;color:${completitudColor};">${resumen.tasaCompletitud}%</td>
      </tr>
    </table>
    <p style="color:${TEXT_MUTED};font-size:13px;">Para ver más detalles, accede a tu panel de reportes en la plataforma.</p>
  `);
}

// ---- User Invitation ----
export function userInvitationTemplate(userName: string, setupLink: string | null): string {
  const linkSection = setupLink
    ? `<div style="text-align:center;margin:24px 0;">
        <a href="${setupLink}" style="display:inline-block;background:${BRAND_COLOR};color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">Configurar mi contraseña</a>
      </div>
      <p style="color:${TEXT_MUTED};font-size:12px;text-align:center;">Si el botón no funciona, copia y pega este enlace:<br><a href="${setupLink}" style="color:${BRAND_COLOR};word-break:break-all;">${setupLink}</a></p>`
    : `<p style="color:${TEXT_MUTED};font-size:14px;">Tu administrador te compartirá el enlace para configurar tu contraseña.</p>`;

  return baseLayout(`
    <h2 style="margin:0 0 8px;color:${TEXT_COLOR};font-size:20px;">🎉 ¡Bienvenido/a!</h2>
    <p style="color:${TEXT_MUTED};font-size:15px;">Hola <strong>${userName}</strong>,</p>
    <p style="color:${TEXT_MUTED};font-size:14px;line-height:1.6;">Has sido invitado/a a la plataforma <strong>${BRAND_NAME}</strong>. Para comenzar, configura tu contraseña haciendo clic en el siguiente botón:</p>
    ${linkSection}
    <p style="color:${TEXT_MUTED};font-size:13px;margin-top:20px;">Este enlace expira en 7 días. Si tienes problemas, contacta a tu administrador.</p>
  `);
}
