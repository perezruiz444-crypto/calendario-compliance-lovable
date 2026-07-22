# Calendario Compliance — Instrucciones del Proyecto

## Stack
- React 18 + TypeScript (strict mode ON — `noImplicitAny`, `strictNullChecks`; `no-explicit-any` en ESLint es `warn` mientras se corrigen `any` preexistentes) + Vite + SWC
- Tailwind CSS + Radix UI (shadcn/ui pattern) + Framer Motion
- React Router v6 (lazy loading en todas las páginas)
- React Query v5 instalado, pero hoy solo provee el QueryClient global — el data fetching real es Supabase directo (ver Data Fetching)
- Zod para validación de formularios (con `.parse()` manual, no `zodResolver`)
- Supabase (auth, PostgreSQL, RLS) — sin backend custom

## Comandos
- Dev: `npm run dev` (puerto 8080)
- Build: `npm run build`
- Lint: `npm run lint`
- Sin tests configurados

## Estructura Clave
```
src/pages/          → páginas mapeadas a rutas
src/components/     → por dominio: dashboard/, empresas/, tareas/, obligaciones/, layout/
src/hooks/          → useAuth, useEmpresaContext, useAnalytics, useNotifications…
src/integrations/supabase/ → cliente singleton y tipos auto-generados
src/types/          → domain types que extienden Supabase Row types
supabase/migrations/ → historial del schema (fuente de verdad)
```

## Arquitectura

### Providers (orden en App.tsx)
```
QueryClientProvider → AuthProvider → EmpresaProvider → ErrorBoundary
```

### Auth
- Hook: `useAuth()` — user, session, role, simulatedRole, authReady
- Roles: `administrador | consultor | cliente`
- Admin puede simular roles para testing (sessionStorage)
- CAPTCHA disponible en signIn (pasar captchaToken)

### Data Fetching
El fetching real es **Supabase directo** con `useEffect` + `useState` (no React Query).
React Query solo provee el `QueryClient` global en App.tsx. Patrón estándar (ver `src/hooks/useEmpresasList.ts`):
```typescript
const [data, setData] = useState([]);
useEffect(() => {
  supabase.from('tabla').select('*').eq('empresa_id', id)
    .then(({ data, error }) => {
      if (error) { toast.error('No se pudo cargar.'); return; }
      setData(data || []);
    });
}, [id]);
```
Errores → `toast.error()` (Sonner). Excepciones no controladas → `ErrorBoundary` (`console.error`).

### Componentes UI
- Usar `cn()` (clsx) para classnames condicionales
- Composición: `<Card><CardHeader><CardContent>` — no monolitos
- `React.forwardRef` para componentes que reciben ref

## Convenciones

### Commits
- Formato: `tipo(scope): descripción`
- Tipos: feat, fix, perf, style, refactor
- Referencias a findings de diseño: `FINDING-###`

### Naming
- Componentes: `PascalCase.tsx`
- Hooks: `camelCase` con prefijo `use`
- Tipos: `PascalCase` sin sufijo Type/Interface

### Seguridad
- RLS activo en todas las tablas — nunca bypass con service key en frontend
- Empresa activa persistida en localStorage con validación UUID
- Validar empresa_id del usuario antes de queries

## Dominio de Negocio

SaaS de compliance para empresas mexicanas con programas de Comercio Exterior
(IMMEX, PROSEC, Padrón de Importadores, IVA/IEPS). Tres roles:
- **Administrador**: gestión global, asigna consultores
- **Consultor**: gestiona múltiples empresas clientes
- **Cliente**: ve solo sus datos

Entidades core: `Empresa → Obligaciones → Cumplimientos → Tareas → Subtareas`

## Variables de Entorno
```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
```
