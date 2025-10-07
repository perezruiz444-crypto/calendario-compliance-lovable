-- Asignar rol de consultor al usuario eechave@russellbedford.mx
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'consultor'::app_role
FROM auth.users
WHERE email = 'eechave@russellbedford.mx'
ON CONFLICT (user_id, role) DO NOTHING;