/**
 * Paleta categórica de la marca (dirección A "Expediente").
 * Hex a propósito: estos valores se guardan en BD (categorías) y se usan en gráficas SVG/inline styles.
 * Todos mantienen contraste suficiente sobre Papel (#F3F3EF) y sobre Tinta (#111418).
 */
export const BRAND_CATEGORY_COLORS = [
  { value: '#5B616B', label: 'Grafito' },
  { value: '#C8361D', label: 'Sello' },
  { value: '#1F6B45', label: 'Vigente' },
  { value: '#B87400', label: 'Ocre' },
  { value: '#2F6FA8', label: 'Azul acero' },
  { value: '#7A4A8C', label: 'Ciruela' },
  { value: '#0F7B8A', label: 'Turquesa' },
  { value: '#8A5A2B', label: 'Café' },
] as const;

export const DEFAULT_CATEGORY_COLOR: string = BRAND_CATEGORY_COLORS[0].value;
export const CATEGORY_CHART_COLORS: string[] = BRAND_CATEGORY_COLORS.map((c) => c.value);
