
# Plan: Centro de Control de Notificaciones y Recordatorios

## Objetivo
Crear un sistema centralizado y configurable para gestionar todas las notificaciones y recordatorios automáticos del sistema.

---

## Nuevas Funcionalidades

### 1. Preferencias de Notificación por Usuario

Cada usuario podrá personalizar:
- Qué notificaciones recibir (tareas, certificaciones, documentos, etc.)
- Cómo recibirlas (email, push, ambas, ninguna)
- Frecuencia de resúmenes (diario, semanal, nunca)

### 2. Recordatorios Configurables de Vencimientos

Panel para configurar cuántos días antes del vencimiento se envían alertas:
- **Certificaciones**: 90, 60, 30, 15, 7 días (configurable)
- **Obligaciones IMMEX/PROSEC**: Igual
- **Documentos**: 30, 15, 7, 1 día

### 3. Centro de Notificaciones Unificado

Nueva sección en Configuraciones con:
- Vista general de todas las reglas activas
- Historial de notificaciones enviadas
- Prueba de notificaciones
- Horario de envío personalizado

---

## Cambios en Base de Datos

### Nueva Tabla: `user_notification_preferences`
```sql
CREATE TABLE user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_key TEXT NOT NULL,
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, notification_key)
);
```

### Nueva Tabla: `reminder_rules`
```sql
CREATE TABLE reminder_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL, -- 'certificacion', 'immex', 'prosec', 'documento'
  dias_antes INTEGER NOT NULL,
  activa BOOLEAN DEFAULT true,
  empresa_id UUID REFERENCES empresas(id), -- NULL = aplica a todas
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Modificar Tabla: `profiles`
```sql
ALTER TABLE profiles ADD COLUMN 
  resumen_frecuencia TEXT DEFAULT 'diario', -- 'diario', 'semanal', 'nunca'
  resumen_hora INTEGER DEFAULT 8; -- Hora de envío (0-23)
```

---

## Nuevos Componentes

### 1. `src/components/notifications/NotificationCenter.tsx`
Panel principal que muestra:
- Resumen de notificaciones activas
- Accesos rápidos a configuración
- Historial reciente

### 2. `src/components/notifications/UserNotificationPreferences.tsx`
Formulario para que cada usuario configure:
- Switches para cada tipo de notificación
- Toggle email/push por categoría
- Selector de frecuencia de resumen

### 3. `src/components/notifications/ReminderRulesManager.tsx`
CRUD para reglas de recordatorio:
- Tipo de vencimiento a monitorear
- Días de anticipación
- Empresa específica o todas
- Activar/desactivar

### 4. `src/components/notifications/NotificationHistory.tsx`
Tabla con:
- Últimas notificaciones enviadas
- Estado (enviada, fallida, pendiente)
- Tipo y destinatario
- Filtros por fecha y tipo

---

## Cambios en Archivos Existentes

### `src/pages/Configuraciones.tsx`
- Reorganizar en pestañas:
  - **General** (tema, idioma)
  - **Mis Notificaciones** (preferencias del usuario actual)
  - **Recordatorios** (reglas de vencimientos - solo admin)
  - **Sistema** (configuraciones globales - solo admin)

### `src/components/layout/DashboardLayout.tsx`
- Ya existe acceso a Configuraciones en el dropdown de perfil

### Edge Function: `send-daily-summary`
- Modificar para respetar preferencias por usuario
- Verificar `user_notification_preferences` antes de enviar
- Respetar horario y frecuencia configurados

---

## Flujo de Usuario

```text
Usuario                    Sistema
   │                          │
   ├─► Ir a Configuraciones   │
   │                          │
   ├─► Pestaña "Mis Notificaciones"
   │   ├─ Toggle: Tareas vencidas [Email ✓] [Push ✓]
   │   ├─ Toggle: Certificaciones [Email ✓] [Push ✗]
   │   ├─ Toggle: Resumen diario [Email ✓]
   │   └─ Selector: Enviar resumen a las [8:00 AM ▼]
   │                          │
   ├─► Guardar ───────────────►├─► Actualiza user_notification_preferences
   │                          │
   │                          ├─► Cron Job (8:00 AM)
   │                          │   ├─ Verifica preferencias de usuario
   │                          │   ├─ Verifica frecuencia (diario/semanal)
   │                          │   └─ Envía solo notificaciones habilitadas
   │                          │
   │◄─── Recibe email/push ───┤
```

---

## Interfaz: Vista de Preferencias por Usuario

```text
┌──────────────────────────────────────────────────────────────────┐
│ Mis Preferencias de Notificación                                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📋 TAREAS                                    Email    Push      │
│  ├─ Tarea asignada                            [✓]      [✓]       │
│  ├─ Recordatorio 3 días antes                 [✓]      [✗]       │
│  ├─ Recordatorio 1 día antes                  [✓]      [✓]       │
│  └─ Tarea vencida                             [✓]      [✓]       │
│                                                                  │
│  🏆 CERTIFICACIONES                           Email    Push      │
│  ├─ Vencimiento 90 días                       [✓]      [✗]       │
│  ├─ Vencimiento 30 días                       [✓]      [✓]       │
│  └─ Vencimiento 15 días                       [✓]      [✓]       │
│                                                                  │
│  📊 RESUMEN                                                      │
│  ├─ Frecuencia: [Diario ▼]                                       │
│  └─ Hora de envío: [08:00 ▼]                                     │
│                                                                  │
│                                    [Restaurar Predeterminados]   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Interfaz: Reglas de Recordatorio (Admin)

```text
┌──────────────────────────────────────────────────────────────────┐
│ Reglas de Recordatorio                          [+ Nueva Regla]  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 🏆 Certificación IVA/IEPS - 30 días antes      [Activa ●]  │  │
│  │    Aplica a: Todas las empresas                            │  │
│  │    Última ejecución: Hace 2 días                           │  │
│  │                                          [Editar] [Eliminar]│  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 📋 IMMEX - 15 días antes                       [Activa ●]  │  │
│  │    Aplica a: Todas las empresas                            │  │
│  │    Última ejecución: Hace 5 días                           │  │
│  │                                          [Editar] [Eliminar]│  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ 📄 Documentos - 7 días antes                   [Inactiva ○]│  │
│  │    Aplica a: Empresa XYZ                                   │  │
│  │    Última ejecución: Nunca                                 │  │
│  │                                          [Editar] [Eliminar]│  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Orden de Implementación

1. **Fase 1: Base de Datos**
   - Crear tabla `user_notification_preferences`
   - Crear tabla `reminder_rules`
   - Agregar columnas a `profiles`

2. **Fase 2: Preferencias de Usuario**
   - Crear componente `UserNotificationPreferences`
   - Integrar en página de Configuraciones
   - Migrar datos existentes

3. **Fase 3: Reglas de Recordatorio**
   - Crear componente `ReminderRulesManager`
   - CRUD completo para reglas
   - Vista solo para administradores

4. **Fase 4: Actualizar Edge Functions**
   - Modificar `send-daily-summary` para respetar preferencias
   - Crear función para procesar `reminder_rules`
   - Ajustar cron jobs según configuración

5. **Fase 5: Historial y Monitoreo**
   - Crear componente `NotificationHistory`
   - Agregar logging de notificaciones enviadas
   - Panel de estadísticas

---

## Beneficios

| Antes | Después |
|-------|---------|
| Configuración global fija | Personalizable por usuario |
| Horario fijo (8:00 AM) | Horario configurable |
| Sin control de canales | Email y Push independientes |
| Recordatorios hardcodeados | Reglas dinámicas configurables |
| Sin historial | Registro completo de envíos |

---

## Notas Técnicas

- Las preferencias de usuario se almacenan en `user_notification_preferences` con una entrada por cada tipo de notificación
- El edge function `send-daily-summary` consultará esta tabla antes de enviar
- Los defaults se toman de `notification_settings` (configuración global) cuando el usuario no tiene preferencia explícita
- Se mantiene retrocompatibilidad: usuarios sin preferencias configuradas recibirán todo como antes
