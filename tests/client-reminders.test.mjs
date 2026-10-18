import test from 'node:test';
import assert from 'node:assert/strict';
import {includeClientReminder,includeObligationAction} from '../.test-build/supabase/functions/_shared/obligationPresentation.js';

const validated = [{id:'r',clasificacion_estado:'aprobada',normativa_estado:'validada'}];
test('cliente no recibe fechas heredadas aunque el catálogo se haya validado después',()=>{
  assert.equal(includeClientReminder({origen_fecha:'heredada',regla_id:'r'},validated),false);
});
test('cliente recibe fechas normativas solo con la versión de regla acreditada',()=>{
  assert.equal(includeClientReminder({origen_fecha:'normativa',regla_id:'r'},validated),true);
  assert.equal(includeClientReminder({origen_fecha:'normativa',regla_id:'otra'},validated),false);
  assert.equal(includeClientReminder({origen_fecha:'normativa',regla_id:null},validated),false);
  assert.equal(includeClientReminder({origen_fecha:'normativa',regla_id:'r'},[{...validated[0],normativa_estado:'pendiente'}]),false);
  assert.equal(includeClientReminder({origen_fecha:'normativa',regla_id:'r'},[{...validated[0],clasificacion_estado:'propuesta'}]),false);
});
test('objetivos internos conservan su seguimiento y los riesgos no generan entregas',()=>{
  assert.equal(includeClientReminder({origen_fecha:'interna',regla_id:null},[]),true);
  assert.equal(includeClientReminder({origen_fecha:null,regla_id:null},[]),false);
  assert.equal(includeObligationAction('riesgo','normativa',null),false);
});
