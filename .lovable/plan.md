

# Plan: Fix client assignment in obligation form

## Problem
When a consultor tries to assign a responsable to an obligation, clients don't appear in the dropdown. This is because `fetchUsuarios` in `ObligacionFormDialog.tsx` queries the `user_roles` table to verify the 'cliente' role, but the RLS policy on `user_roles` only allows users to see **their own** roles. Consultores can't see other users' roles, so the query returns nothing and clients are filtered out.

## Solution

### 1. Database: Add RLS policy on `user_roles` for consultores

Add a SELECT policy that allows consultores to see roles of users whose `profiles.empresa_id` matches an empresa they're assigned to:

```sql
CREATE POLICY "Consultores can view roles of users in their empresas"
ON public.user_roles FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'consultor'::app_role) 
  AND EXISTS (
    SELECT 1 FROM profiles p
    JOIN consultor_empresa_asignacion cea 
      ON cea.empresa_id = p.empresa_id
    WHERE p.id = user_roles.user_id
      AND cea.consultor_id = auth.uid()
  )
);
```

This lets consultores see roles of users (clients) belonging to their assigned empresas, which is the minimum needed for the dropdown to work.

### 2. No code changes needed
The existing `fetchUsuarios` logic in `ObligacionFormDialog.tsx` is correct -- it queries profiles by empresa_id, then verifies the 'cliente' role via user_roles. Once the RLS policy is fixed, it will work as expected.

### Files/resources to modify
| Resource | Change |
|----------|--------|
| Database migration | Add SELECT policy on `user_roles` for consultores |

