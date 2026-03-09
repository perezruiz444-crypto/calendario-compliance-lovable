
-- Assign fgarduno as consultor for TOKAIKOGYO
INSERT INTO public.consultor_empresa_asignacion (consultor_id, empresa_id, asignado_por)
VALUES ('e6302d71-7f51-4a6c-98d2-eaccf6ce1e93', '79d994b7-3f6b-49dc-936a-52b705a5ab57', 'e6302d71-7f51-4a6c-98d2-eaccf6ce1e93')
ON CONFLICT DO NOTHING;

-- Assign fgarduno as consultor for XINQUAN
INSERT INTO public.consultor_empresa_asignacion (consultor_id, empresa_id, asignado_por)
VALUES ('e6302d71-7f51-4a6c-98d2-eaccf6ce1e93', '8ab96943-8866-40d9-8c13-c75ae2aaefc8', 'e6302d71-7f51-4a6c-98d2-eaccf6ce1e93')
ON CONFLICT DO NOTHING;

-- Auto-assign fgarduno to TOKAIKOGYO tareas
UPDATE public.tareas 
SET consultor_asignado_id = 'e6302d71-7f51-4a6c-98d2-eaccf6ce1e93'
WHERE empresa_id = '79d994b7-3f6b-49dc-936a-52b705a5ab57'
AND consultor_asignado_id IS NULL;

-- Auto-assign fgarduno to XINQUAN tareas
UPDATE public.tareas 
SET consultor_asignado_id = 'e6302d71-7f51-4a6c-98d2-eaccf6ce1e93'
WHERE empresa_id = '8ab96943-8866-40d9-8c13-c75ae2aaefc8'
AND consultor_asignado_id IS NULL;
