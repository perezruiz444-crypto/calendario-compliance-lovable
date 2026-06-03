import {
  Calendar, CheckSquare, Bell, FileText,
  Star, Users, Settings, Building2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type Role = 'administrador' | 'consultor' | 'cliente';

export interface GuiaStep {
  text: string;
  tip?: string;
}

export interface GuiaSection {
  id: string;
  title: string;
  icon: LucideIcon;
  roles: Role[];
  steps: GuiaStep[];
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  roles: Role[];
}

export const guiaSections: GuiaSection[] = [
  {
    id: 'primeros-pasos',
    title: 'Primeros pasos',
    icon: Star,
    roles: ['administrador', 'consultor', 'cliente'],
    steps: [
      {
        text: 'Inicia sesión con el correo y contraseña que te proporcionó tu consultor o administrador.',
        tip: 'Si es tu primer acceso, revisa tu correo con el asunto "Bienvenido a Calendario Compliance" para obtener tu contraseña temporal.',
      },
      {
        text: 'Al entrar por primera vez como cliente, verás un tour de bienvenida de 4 pasos. Puedes volver a verlo en cualquier momento desde el menú lateral.',
      },
      {
        text: 'Familiarízate con el Dashboard: ahí verás el semáforo de cumplimiento, tus tareas pendientes y las obligaciones del mes.',
      },
    ],
  },
  {
    id: 'empresa-obligaciones',
    title: 'Mi empresa y obligaciones',
    icon: Building2,
    roles: ['administrador', 'consultor', 'cliente'],
    steps: [
      {
        text: 'En "Mi Empresa" (clientes) o "Empresas" (consultores/admins) puedes ver la información general de la empresa y sus regímenes activos como IMMEX, PROSEC o Padrón.',
      },
      {
        text: 'Las obligaciones son los compromisos regulatorios que tu empresa debe cumplir en fechas específicas. Se crean por tu consultor o administrador.',
        tip: 'Las obligaciones pendientes aparecen en el Calendario con colores según su estado: verde (a tiempo), amarillo (próximo a vencer), rojo (vencido).',
      },
      {
        text: 'Para clientes: si no ves tu empresa en el Dashboard, contacta a tu consultor para que vincule tu perfil.',
      },
      {
        text: 'Para consultores y administradores: pueden crear y gestionar obligaciones desde el detalle de cada empresa.',
      },
    ],
  },
  {
    id: 'calendario-tareas',
    title: 'Calendario y tareas',
    icon: Calendar,
    roles: ['administrador', 'consultor', 'cliente'],
    steps: [
      {
        text: 'El Calendario muestra todas tus obligaciones y tareas asignadas en vista mensual. Haz clic en cualquier evento para ver el detalle.',
      },
      {
        text: 'En "Tareas" verás el listado completo con filtros por estado (pendiente, en progreso, completada) y prioridad (alta, media, baja).',
        tip: 'Las tareas de alta prioridad aparecen marcadas en rojo. Atiéndelas primero para mantener un buen semáforo de cumplimiento.',
      },
      {
        text: 'Para marcar una tarea como completada: abre el detalle y cambia el estado a "Completada". También puedes usar el botón de check rápido en el listado.',
      },
      {
        text: 'Para consultores y admins: pueden asignar tareas a usuarios específicos y establecer fechas límite desde el panel de creación.',
      },
    ],
  },
  {
    id: 'evidencias-documentos',
    title: 'Evidencias y documentos',
    icon: FileText,
    roles: ['administrador', 'consultor', 'cliente'],
    steps: [
      {
        text: 'Al abrir una tarea encontrarás la sección "Evidencias". Desde ahí puedes subir archivos (PDF, Excel, imágenes) como respaldo del cumplimiento.',
      },
      {
        text: 'Formatos soportados: PDF, Excel (.xlsx), Word (.docx), imágenes (JPG, PNG). Tamaño máximo por archivo: 10 MB.',
        tip: 'Nombra tus archivos con fecha y descripción clara, por ejemplo: "2024-06_pedimento_importacion.pdf". Facilita la auditoría posterior.',
      },
      {
        text: 'Una vez subida la evidencia, el consultor asignado recibirá una notificación para revisarla.',
      },
      {
        text: 'Para exportar documentos o reportes: ve a la sección "Reportes" en el menú lateral (disponible para consultores y administradores).',
      },
    ],
  },
  {
    id: 'notificaciones',
    title: 'Notificaciones',
    icon: Bell,
    roles: ['administrador', 'consultor', 'cliente'],
    steps: [
      {
        text: 'Recibirás notificaciones en la plataforma (ícono de campana en la barra superior) cuando se te asigne una tarea, cuando venza una obligación o cuando cambie su estado.',
      },
      {
        text: 'Para activar notificaciones por correo: ve a Configuraciones → Notificaciones y activa la opción "Notificaciones por email".',
        tip: 'Recomendamos activar las alertas de vencimiento con al menos 7 días de anticipación para tener tiempo de preparar evidencias.',
      },
      {
        text: 'Si tu navegador lo permite, también puedes activar notificaciones push. Aparecerá un aviso la primera vez que entres a la plataforma.',
      },
    ],
  },
  {
    id: 'guia-consultor',
    title: 'Guía del Consultor',
    icon: Users,
    roles: ['consultor'],
    steps: [
      {
        text: 'Como consultor puedes gestionar todas las empresas asignadas a tu usuario desde el selector de empresa en el sidebar.',
      },
      {
        text: 'Para crear una obligación: ve al detalle de la empresa → pestaña Obligaciones → "Nueva Obligación". Define nombre, régimen, fecha límite y tipo.',
      },
      {
        text: 'Para asignar una tarea: crea la tarea desde el Dashboard o desde el detalle de una obligación, y selecciona el usuario responsable en el campo "Asignar a".',
      },
      {
        text: 'Para generar reportes de cumplimiento: ve a Reportes en el menú lateral, selecciona la empresa y el período.',
        tip: 'Los reportes en PDF incluyen el semáforo general, listado de obligaciones y estado de evidencias. Útil para presentaciones a clientes.',
      },
    ],
  },
  {
    id: 'guia-administrador',
    title: 'Guía del Administrador',
    icon: Settings,
    roles: ['administrador'],
    steps: [
      {
        text: 'Como administrador tienes acceso completo a la plataforma. Puedes invitar usuarios desde Usuarios → "Invitar usuario".',
      },
      {
        text: 'Para asignar un consultor a una empresa: ve al detalle de la empresa y edita el campo "Consultor asignado".',
      },
      {
        text: 'El audit log está disponible en Configuraciones → Historial de actividad. Muestra todas las acciones realizadas en la plataforma.',
      },
      {
        text: 'Para configurar el catálogo de obligaciones (tipos, regímenes, periodicidades): ve a Configuraciones → Catálogo.',
        tip: 'Puedes usar el modo "Ver como Cliente" en el sidebar para revisar cómo se ve la plataforma desde la perspectiva de un cliente antes de compartirla.',
      },
    ],
  },
  {
    id: 'guia-cliente',
    title: 'Guía del Cliente',
    icon: CheckSquare,
    roles: ['cliente'],
    steps: [
      {
        text: 'En tu Dashboard verás el resumen de cumplimiento de tu empresa: el semáforo general, tareas pendientes y las próximas obligaciones.',
      },
      {
        text: 'Para subir evidencia de una tarea: abre la tarea, ve a la sección "Evidencias" y sube el archivo correspondiente.',
      },
      {
        text: 'Cuando termines de cumplir una obligación, cambia el estado de la tarea a "Completada" para que tu consultor lo registre.',
      },
      {
        text: 'Si tienes dudas sobre una obligación específica, usa el campo de comentarios en la tarea para comunicarte directamente con tu consultor.',
      },
    ],
  },
];

export const faqItems: FAQItem[] = [
  {
    id: 'faq-01',
    question: '¿Cómo veo mis obligaciones del mes?',
    answer: 'En el Dashboard verás las obligaciones del mes actual en la sección "Obligaciones Mensuales". También puedes ir al Calendario para ver todas las obligaciones en vista mensual, filtradas por empresa si eres consultor o administrador.',
    roles: ['administrador', 'consultor', 'cliente'],
  },
  {
    id: 'faq-02',
    question: '¿Qué significa cada color del semáforo de cumplimiento?',
    answer: 'Verde: todas las obligaciones del período están cumplidas o al día. Amarillo: hay obligaciones próximas a vencer (en los próximos 7 días) sin evidencia subida. Rojo: hay obligaciones vencidas sin cumplir. El objetivo es mantener el semáforo en verde.',
    roles: ['administrador', 'consultor', 'cliente'],
  },
  {
    id: 'faq-03',
    question: '¿Cómo subo evidencia a una tarea?',
    answer: 'Abre la tarea haciendo clic en ella desde el Dashboard, el Calendario o el listado de Tareas. En el panel de detalle busca la sección "Evidencias" y haz clic en "Subir archivo". Soporta PDF, Excel, Word e imágenes. Máximo 10 MB por archivo.',
    roles: ['administrador', 'consultor', 'cliente'],
  },
  {
    id: 'faq-04',
    question: '¿Cómo reasigno una tarea a otro usuario?',
    answer: 'Abre el detalle de la tarea y haz clic en el campo "Asignado a". Selecciona el nuevo usuario del listado. Solo consultores y administradores pueden reasignar tareas. Los cambios quedan registrados en el historial de la tarea.',
    roles: ['administrador', 'consultor'],
  },
  {
    id: 'faq-05',
    question: '¿Cómo activo las notificaciones por correo?',
    answer: 'Ve a Configuraciones en el menú lateral → sección Notificaciones. Activa el interruptor "Notificaciones por email". Puedes elegir recibir alertas de vencimiento, asignación de tareas y cambios de estado.',
    roles: ['administrador', 'consultor', 'cliente'],
  },
  {
    id: 'faq-06',
    question: '¿Qué hago si no veo mi empresa en el Dashboard?',
    answer: 'Esto ocurre cuando tu perfil de cliente aún no tiene una empresa asignada. Contacta a tu consultor o al administrador del sistema para que vincule tu usuario con la empresa correspondiente. Recibirás una notificación cuando esté listo.',
    roles: ['cliente'],
  },
  {
    id: 'faq-07',
    question: '¿Cómo cambio mi contraseña?',
    answer: 'Ve a Configuraciones → Seguridad → "Cambiar contraseña". Ingresa tu contraseña actual y la nueva. Si olvidaste tu contraseña, ve a la pantalla de inicio de sesión y haz clic en "¿Olvidaste tu contraseña?" para recibir un enlace de restablecimiento por correo.',
    roles: ['administrador', 'consultor', 'cliente'],
  },
  {
    id: 'faq-08',
    question: '¿Cuál es la diferencia entre tareas y obligaciones?',
    answer: 'Las obligaciones son compromisos regulatorios de la empresa (por ejemplo, presentar el informe IMMEX mensual). Las tareas son las acciones concretas que se crean para cumplir esas obligaciones (por ejemplo, "Recopilar pedimentos del mes"). Una obligación puede tener múltiples tareas.',
    roles: ['administrador', 'consultor', 'cliente'],
  },
  {
    id: 'faq-09',
    question: '¿Cómo exporto un reporte de cumplimiento?',
    answer: 'Ve a la sección Reportes en el menú lateral. Selecciona la empresa, el período (mes/trimestre/año) y el tipo de reporte. Haz clic en "Generar reporte" y descarga el PDF resultante. Incluye semáforo, listado de obligaciones y estado de evidencias.',
    roles: ['administrador', 'consultor'],
  },
  {
    id: 'faq-10',
    question: '¿Qué es IMMEX, PROSEC y Padrón de Importadores?',
    answer: 'Son regímenes aduaneros mexicanos: IMMEX (Industria Manufacturera, Maquiladora y de Servicios de Exportación) permite importar temporalmente insumos sin pagar impuestos. PROSEC (Programa de Promoción Sectorial) otorga aranceles preferentes. El Padrón de Importadores es el registro obligatorio ante el SAT para poder importar mercancías a México. Cada régimen tiene obligaciones de reporte periódicas.',
    roles: ['administrador', 'consultor', 'cliente'],
  },
  {
    id: 'faq-11',
    question: '¿Cómo invito a un nuevo colaborador a la plataforma?',
    answer: 'Ve a Usuarios en el menú lateral → botón "Invitar usuario". Ingresa el correo del colaborador, selecciona su rol (cliente, consultor o administrador) y si es cliente asígnalo a su empresa. El sistema enviará un correo de invitación con instrucciones para crear su contraseña.',
    roles: ['administrador'],
  },
  {
    id: 'faq-12',
    question: '¿Dónde solicito soporte técnico?',
    answer: 'Si tienes un problema técnico o duda que no esté en esta guía, escríbenos a soporte@calendariocompliance.com. También puedes contactar directamente a tu consultor asignado para dudas sobre obligaciones específicas de tu empresa.',
    roles: ['administrador', 'consultor', 'cliente'],
  },
];

export const navSections = [
  { id: 'primeros-pasos',        label: 'Primeros pasos',            roles: ['administrador', 'consultor', 'cliente'] as Role[] },
  { id: 'empresa-obligaciones',  label: 'Mi empresa y obligaciones', roles: ['administrador', 'consultor', 'cliente'] as Role[] },
  { id: 'calendario-tareas',     label: 'Calendario y tareas',       roles: ['administrador', 'consultor', 'cliente'] as Role[] },
  { id: 'evidencias-documentos', label: 'Evidencias y documentos',   roles: ['administrador', 'consultor', 'cliente'] as Role[] },
  { id: 'notificaciones',        label: 'Notificaciones',            roles: ['administrador', 'consultor', 'cliente'] as Role[] },
  { id: 'guia-consultor',        label: 'Guía del Consultor',        roles: ['consultor'] as Role[] },
  { id: 'guia-administrador',    label: 'Guía del Administrador',    roles: ['administrador'] as Role[] },
  { id: 'guia-cliente',          label: 'Guía del Cliente',          roles: ['cliente'] as Role[] },
  { id: 'preguntas-frecuentes',  label: 'Preguntas frecuentes',      roles: ['administrador', 'consultor', 'cliente'] as Role[] },
];
