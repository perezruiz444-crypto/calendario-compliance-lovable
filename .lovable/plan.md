

# Plan: Fix obligation activation logic and new obligation visibility

## Problems identified

1. **False activations**: The previous migration (`WHERE fecha_inicio IS NOT NULL OR fecha_fin IS NOT NULL`) activated obligations that have `fecha_inicio`/`fecha_fin` but NO `fecha_vencimiento`. These shouldn't be treated as "active pending" obligations.

2. **New obligation not appearing**: The `handleCreate` function on line 170 uses `.select('id').single()` which can cause the insert to fail silently if there's an issue. Additionally, if a new obligation has no `fecha_vencimiento`, it sorts to the bottom of the list (line 67: `nullsFirst: false`) and may be out of view.

## Solution

### 1. Database: Revert false activations
Run an UPDATE to deactivate obligations that were incorrectly activated (have `fecha_inicio`/`fecha_fin` but no `fecha_vencimiento` and weren't manually activated):

```sql
UPDATE obligaciones
SET activa = false
WHERE activa = true
  AND fecha_vencimiento IS NULL
  AND responsable_id IS NULL;
```

This keeps obligations with a `fecha_vencimiento` OR a manually assigned `responsable_id` as active, and reverts the rest.

### 2. Code: Fix auto-activation logic in ObligacionesManager.tsx
Lines 167 and 195 currently auto-activate based on ANY date:
```typescript
activa: data.activa || !!data.fecha_vencimiento || !!data.fecha_inicio || !!data.fecha_fin,
```
Change to only auto-activate based on `fecha_vencimiento`:
```typescript
activa: data.activa || !!data.fecha_vencimiento,
```

### 3. Code: Fix insert call to not fail silently
Line 170 uses `.select('id').single()` which can cause issues. Change to just `.select()` without `.single()` to be more resilient.

### 4. Code: Improve sort order
Change the query sort to show newest first by default, so new obligations are immediately visible. Or add secondary sort by `created_at desc`.

### Files to modify

| Resource | Change |
|----------|--------|
| Database (data update) | Deactivate falsely activated obligations |
| `src/components/obligaciones/ObligacionesManager.tsx` | Fix auto-activation logic, fix insert call, improve sort |

