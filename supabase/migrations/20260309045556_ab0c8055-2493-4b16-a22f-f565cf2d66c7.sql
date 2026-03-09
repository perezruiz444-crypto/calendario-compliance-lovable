
-- Auto-assign consultor to ITW AUTOMOTIVE tareas (fgarduno = e6302d71)
UPDATE public.tareas 
SET consultor_asignado_id = 'e6302d71-7f51-4a6c-98d2-eaccf6ce1e93'
WHERE empresa_id = '2fe61136-2f8a-48b5-9aef-140ac19b676f'
AND consultor_asignado_id IS NULL;

-- Auto-assign consultor to JOHNSON ELECTRIC tareas (fgarduno = e6302d71, first assigned)
UPDATE public.tareas 
SET consultor_asignado_id = 'e6302d71-7f51-4a6c-98d2-eaccf6ce1e93'
WHERE empresa_id = 'beb4759d-7dcd-479b-9bde-8180fb343767'
AND consultor_asignado_id IS NULL;
