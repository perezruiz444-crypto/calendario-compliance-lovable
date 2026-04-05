

# Plan: Fix Build Errors Blocking the Application

The app isn't loading because there are **17+ TypeScript build errors** preventing compilation. The root cause is that the generated types file (`src/integrations/supabase/types.ts`) is out of sync with the actual database, plus a few code issues.

## What's Wrong

1. **Outdated Supabase types** -- The types file doesn't reflect recent DB migrations (new columns, new RPC functions), causing type errors everywhere.
2. **Missing RPC definitions in types** -- `get_my_role`, `record_login_attempt`, `is_login_blocked` exist in DB but not in the types file. This breaks auth (login, role fetching).
3. **Missing DB column referenced in code** -- `immex_periodo_renovacion_meses` is used in RenovacionesWidget but doesn't exist in the `empresas` table.
4. **Missing import in Tareas.tsx** -- `BigCalendar` and `localizer` are used but never imported (react-big-calendar).
5. **Invalid toast methods in Reportes.tsx** -- `toast.error()` and `toast.success()` called on wrong toast API.
6. **Invalid FullCalendar prop** -- `eventBorderWidth` doesn't exist on the FullCalendar component.
7. **Edge function import error** -- nodemailer not configured for Deno in `_shared/smtp.ts`.

## Fix Plan

### Step 1: Regenerate Supabase types
Trigger a types regeneration to sync `types.ts` with the actual database schema. This will fix the `obligaciones_catalogo` column mismatches and add the missing RPC function definitions.

### Step 2: Add missing DB column
Create a migration to add `immex_periodo_renovacion_meses` (integer, nullable) to the `empresas` table so RenovacionesWidget works.

### Step 3: Fix Tareas.tsx calendar view
Replace `BigCalendar`/`localizer` usage with FullCalendar (which is already imported), or add the missing react-big-calendar import. Since FullCalendar is already used elsewhere in the project, the cleanest fix is to replace the BigCalendar block with a FullCalendar component.

### Step 4: Fix Reportes.tsx toast calls
Replace `toast.error()`/`toast.success()` with the correct sonner toast API that's used elsewhere in the project.

### Step 5: Fix DashboardCalendar.tsx
Remove the invalid `eventBorderWidth` prop from the FullCalendar component.

### Step 6: Fix edge function smtp.ts
Update the nodemailer import to use a Deno-compatible approach or add a deno.json with the npm specifier.

### Step 7: Fix CatalogoAdmin type cast
After types regeneration, the `as CatalogoItem[]` cast should work. If not, add `as unknown as CatalogoItem[]` as a temporary bridge.

## Technical Details

- The types file (`src/integrations/supabase/types.ts`) cannot be edited manually -- it must be regenerated from the Supabase schema
- The missing columns in types (`categoria`, `obligatorio`, `activo`, `orden`, `notas_internas` on `obligaciones_catalogo`) confirm the types are stale
- Missing RPCs in types (`get_my_role`, `record_login_attempt`, `is_login_blocked`) mean the auth flow crashes at compile time
- Once types are regenerated and code errors fixed, the app will compile and you'll see your data

