# Análisis de Duplicados: OBLIGACIONES_UNIFICADO.xlsx

He analizado la hoja "Catálogo Unificado" utilizando un algoritmo de comparación de textos para identificar repeticiones exactas, similitudes altas (fuzzy matching) y obligaciones que comparten la misma referencia normativa.

A continuación, presento los hallazgos principales para que puedas unificar o eliminar registros redundantes:

## 1. Duplicados Exactos (Mismo texto de obligación)

Existen muchos registros que tienen **exactamente la misma descripción** pero a veces varían en el ID o en la referencia normativa. Esto sucede especialmente al combinar listados generales y específicos.

### Ejemplos Críticos (Mismo texto y misma referencia):
- **Obtención del programa** (`IMX-028` a `IMX-032`): 5 registros idénticos que apuntan al *Art. 24 Fracción II DECRETO IMMEX*.
- **Temporalidad de retorno** (`IMX-035` a `IMX-039`): 5 registros idénticos apuntando al *Art. 24 Fracción V / Art. 4 DECRETO IMMEX*.
- **Cancelación del programa** (`IMX-051` a `IMX-060`): 10 registros para las distintas fracciones del *Art. 27 DECRETO IMMEX*. Se podría unificar en un solo registro que cite "Art. 27 Fracciones I a IX".
- **Cancelación (PROSEC)** (`PRO-003` a `PRO-005`): 3 registros idénticos para el *Art. 9 DECRETO PROSEC*.
- **Requisitos Generales (CERTIVA)** (`CER-095` a `CER-112`): 18 registros idénticos referenciando cada fracción de la *Regla 7.1.1*. Se podría consolidar en uno solo si el requerimiento es el mismo o describir específicamente de qué trata cada fracción.
- **Fusión o escisión** (`CER-088` a `CER-091`): 4 registros idénticos para las fracciones III a VI de la Regla 7.2.1.

### Mismo texto, diferente fuente/referencia:
- **Control de inventarios**: 
  - `IMX-045` (Art. 24 Fracc IX IMMEX)
  - `IMX-046` (Regla 4.3.1 RGCE)
  - `PRO-002` (Art. 8 DECRETO PROSEC)
  > *Sugerencia*: Crear una sola obligación "Control de inventarios" e indicar que aplica para ambos programas (IMMEX/PROSEC) uniendo las referencias.
- **Opinión positiva**: `GEN-001` (IMMEX) y `GEN-002` (RGCE).
- **Artículo 69 del CFF**: `GEN-003`, `GEN-004`, `GEN-005`.
- **Buzón tributario**: `GEN-006` y `GEN-007`.

---

## 2. Duplicados Parciales / Similitud Alta (>85% de coincidencia)

Estos son registros que son casi idénticos pero difieren en detalles como plazos, montos o son la versión "negativa" de otra obligación.

### Casos de Variación de Plazos/Montos:
- **Crédito Fiscal**: 
  - `CER-034`: Sin crédito fiscal notificado en los últimos **12 meses**. (Regla 7.1.3 I b)
  - `CER-037`: Sin crédito fiscal notificado en los últimos **24 meses**. (Regla 7.1.3 II b)
- **Años operando / Trabajadores**:
  - `CER-033`: ≥**4** años operando o >**1,000** trabajadores o >$**50,000,000**.
  - `CER-036`: ≥**7** años operando o >**2,500** trabajadores o >$**100,000,000**.

### Casos de Obligación vs Causal de Requerimiento/Cancelación (Opuestos):
En tu checklist de CERTIVA parece que incluiste tanto el **requisito** como la **causal de cancelación/requerimiento** (incumplimiento).
- `CER-005` (*No haberse emitido* resolución de falsos comprobantes) vs `CER-056` (*Haberse emitido y notificado*).
- `CER-006` (Socios *al corriente*) vs `CER-057` (Socios *no al corriente*).
- `CER-004` (*No estar* en listados SAT) vs `CER-052` (*Ubicarse* en listados).
- `CER-046` (*Acreditar* uso y goce de inmueble) vs `CER-060` (*Dejar de acreditar* uso y goce).
> *Sugerencia*: Mantener solo la obligación positiva (el "qué se debe cumplir") ya que la negativa es simplemente la consecuencia de no cumplirla. 

### Diferencia leve de redacción:
- `IMX-004`: Mantener las **mercancías** importadas temporalmente en el domicilio.
- `IMX-022`: Mantener los **activos fijos** importados temporalmente en el domicilio.
> Ambos citan el Art. 24 Fracc. VI Decreto IMMEX.

---

## 3. Duplicados por Referencia Normativa

Varios registros distintos apuntan a la misma fracción legal. A veces tiene sentido (la fracción contiene múltiples obligaciones), pero otras veces es un síntoma de redundancia.

- **Art. 8 DECRETO PROSEC**:
  - `PRO-001`: Reporte Anual Operaciones
  - `PRO-002`: Control de inventarios
- **Artículo 11, fracción III, Decreto IMMEX**:
  - `GEN-001`: Opinión positiva
  - `GEN-003`: Artículo 69 del CFF
- **Art. 24 Fracc. V y Art. 4 Decreto IMMEX**:
  - `IMX-003`: Retornar mercancías en plazos (insumos, contenedores, etc.)
  - `IMX-024`: Verificar que activos fijos no utilizados sean retornados.

---

## Recomendaciones para la limpieza:
1. **Unificar registros generales repetidos**: Borra los `GEN-` y `IMX-` que dicen lo mismo (ej. "Obtención del programa" repetido 5 veces).
2. **Consolidar Fracciones**: En lugar de tener 18 filas que digan "Requisitos Generales" (CER-095 a CER-112), sustitúyelo por una sola fila con la obligación descriptiva, o escribe el detalle de la obligación en la columna de texto.
3. **Limpiar Opuestos**: Elimina las causales de requerimiento (las que dicen "Haber dejado de...", "Ubicarse en...", "Emitir resolución de falsos...") si ya tienes la obligación que dice "Acreditar...", "No estar en listados...", "No tener resolución...".
4. **Programa Múltiple**: Añade una columna de "Aplica para" o usa etiquetas para las obligaciones transversales (ej. Control de inventarios) en lugar de duplicarlas para IMMEX, PROSEC y CERTIVA.
