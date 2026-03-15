// =============================================
// Sistema de plantillas de correo - Calendario Compliance
// =============================================

const BRAND_NAME = 'Calendario Compliance';
const BRAND_TEAM = 'El Equipo de Compliance de Russell Bedford';
const PLATFORM_URL = 'https://calendario-compliance.lovable.app';
const DANGER_COLOR = '#dc2626';
const WARNING_COLOR = '#d97706';
const SUCCESS_COLOR = '#16a34a';
const BORDER_COLOR = '#eeeeee';

function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:20px;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;color:#000000;line-height:1.5;">
  <div style="max-width:600px;margin:0 auto;">
    ${content}
    <p>Puedes <a href="${PLATFORM_URL}" style="color:#2563eb;text-decoration:underline;">ingresar a la plataforma</a> para ver más detalles.</p>
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
    <p>Saludos,<br>${BRAND_TEAM}</p>
    <p><small style="color:#999;">Este es un correo automático enviado desde ${BRAND_NAME}. Por favor no responda a este mensaje.</small></p>
  </div>
</body>
</html>`;
}

// ---- Test Email ----
export function testEmailTemplate(userName: string, subject: string, message: string): string {
  return baseLayout(`
    <h2 style="margin:0 0 16px;">${subject}</h2>
    <p>Hola <strong>${userName}</strong>,</p>
    <p>${message}</p>
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
      <td style="padding:8px;font-size:14px;">${t.titulo}</td>
      <td style="padding:8px;font-size:14px;">${t.empresa}</td>
      <td style="padding:8px;"><span style="color:${pColor};font-weight:600;font-size:13px;text-transform:capitalize;">${t.prioridad || '-'}</span></td>
      <td style="padding:8px;font-size:14px;">${t.fechaVencimiento}</td>
    </tr>`;
  }).join('');

  return baseLayout(`
    <h2 style="margin:0 0 16px;">${titulo}</h2>
    <p>Hola <strong>${consultorName}</strong>,</p>
    <p>Tienes <strong>${tareas.length}</strong> tarea(s) que requieren tu atención:</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;border:1px solid ${BORDER_COLOR};">
      <thead>
        <tr style="border-bottom:2px solid ${BORDER_COLOR};">
          <th style="padding:8px;text-align:left;font-size:13px;font-weight:600;">Tarea</th>
          <th style="padding:8px;text-align:left;font-size:13px;font-weight:600;">Empresa</th>
          <th style="padding:8px;text-align:left;font-size:13px;font-weight:600;">Prioridad</th>
          <th style="padding:8px;text-align:left;font-size:13px;font-weight:600;">Vencimiento</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
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
  const addRow = (label: string, value: number, color: string) => {
    return `<tr style="border-bottom:1px solid ${BORDER_COLOR};">
      <td style="padding:10px 8px;font-size:14px;">${label}</td>
      <td style="padding:10px 8px;text-align:right;font-size:18px;font-weight:700;color:${color};">${value}</td>
    </tr>`;
  };

  const rows = [
    addRow('Tareas Vencidas', stats.overdueTasks, DANGER_COLOR),
    addRow('Tareas Pendientes', stats.pendingTasks, '#000000'),
    addRow('Próximas a vencer (7 días)', stats.upcomingDeadlines, WARNING_COLOR),
    addRow('Certificaciones próximas a vencer', stats.expiringCertifications, WARNING_COLOR),
    addRow('Documentos próximos a vencer', stats.expiringDocuments, WARNING_COLOR),
  ].join('');

  return baseLayout(`
    <h2 style="margin:0 0 16px;">Resumen Diario de Actividades</h2>
    <p>Hola <strong>${userName}</strong>,</p>
    <p>Aquí tienes tu resumen de actividades pendientes:</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;border:1px solid ${BORDER_COLOR};">
      <tbody>${rows}</tbody>
    </table>
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
    <h2 style="margin:0 0 16px;">Reporte de Tareas</h2>
    <p><strong>${empresa.razonSocial}</strong><br>
    <small>RFC: ${empresa.rfc} | Período: ${periodo} | Tipo: ${reportType}</small></p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;border:1px solid ${BORDER_COLOR};">
      <tr style="border-bottom:1px solid ${BORDER_COLOR};">
        <td style="padding:10px 8px;font-size:14px;">Total de tareas</td>
        <td style="padding:10px 8px;text-align:right;font-size:18px;font-weight:700;">${resumen.totalTareas}</td>
      </tr>
      <tr style="border-bottom:1px solid ${BORDER_COLOR};">
        <td style="padding:10px 8px;font-size:14px;">Completadas</td>
        <td style="padding:10px 8px;text-align:right;font-size:18px;font-weight:700;color:${SUCCESS_COLOR};">${resumen.tareasCompletadas}</td>
      </tr>
      <tr style="border-bottom:1px solid ${BORDER_COLOR};">
        <td style="padding:10px 8px;font-size:14px;">Pendientes</td>
        <td style="padding:10px 8px;text-align:right;font-size:18px;font-weight:700;color:${WARNING_COLOR};">${resumen.tareasPendientes}</td>
      </tr>
      <tr>
        <td style="padding:10px 8px;font-size:14px;">Tasa de completitud</td>
        <td style="padding:10px 8px;text-align:right;font-size:18px;font-weight:700;color:${completitudColor};">${resumen.tasaCompletitud}%</td>
      </tr>
    </table>
  `);
}

// ---- New Message Notification ----
export function newMessageTemplate(recipientName: string, senderName: string, asunto: string, contenido: string): string {
  const preview = contenido.length > 300 ? contenido.substring(0, 300) + '...' : contenido;

  return baseLayout(`
    <h2 style="margin:0 0 16px;">Nuevo Mensaje</h2>
    <p>Hola <strong>${recipientName}</strong>,</p>
    <p>Has recibido un nuevo mensaje de <strong>${senderName}</strong>:</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;border:1px solid ${BORDER_COLOR};">
      <tr style="border-bottom:1px solid ${BORDER_COLOR};">
        <td style="padding:10px 8px;font-size:13px;font-weight:600;width:100px;">De</td>
        <td style="padding:10px 8px;font-size:14px;">${senderName}</td>
      </tr>
      <tr style="border-bottom:1px solid ${BORDER_COLOR};">
        <td style="padding:10px 8px;font-size:13px;font-weight:600;">Asunto</td>
        <td style="padding:10px 8px;font-size:14px;">${asunto}</td>
      </tr>
      <tr>
        <td style="padding:10px 8px;font-size:13px;font-weight:600;vertical-align:top;">Mensaje</td>
        <td style="padding:10px 8px;font-size:14px;">${preview}</td>
      </tr>
    </table>
    <p>Ingresa a la plataforma para ver el mensaje completo y responder.</p>
  `);
}

// ---- User Invitation ----
export function userInvitationTemplate(userName: string, setupLink: string | null): string {
  const linkSection = setupLink
    ? `<p>Para comenzar, haz clic en el siguiente enlace para crear tu contraseña:</p>
       <p><a href="${setupLink}"><strong>Configurar mi contraseña</strong></a></p>
       <p>Si tienes problemas con el enlace, puedes copiar y pegar la siguiente URL en tu navegador:<br>
       <a href="${setupLink}" style="word-break:break-all;">${setupLink}</a></p>`
    : `<p>Tu administrador te compartirá el enlace para configurar tu contraseña.</p>`;

  return baseLayout(`
    <h2 style="margin:0 0 16px;">¡Bienvenido/a!</h2>
    <p>Hola <strong>${userName}</strong>,</p>
    <p>Has sido invitado/a a la plataforma de Compliance de <strong>Russell Bedford</strong>.</p>
    ${linkSection}
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
    <p><strong>Importante:</strong> Este enlace expira en 7 días. Si tienes problemas, contacta a tu administrador.</p>
  `);
}
