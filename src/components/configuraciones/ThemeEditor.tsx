import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Palette, RotateCcw, Save, Copy, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

interface ColorConfig {
  label: string;
  variable: string;
  description: string;
}

const COLOR_GROUPS: { title: string; colors: ColorConfig[] }[] = [
  {
    title: 'Colores Principales',
    colors: [
      { label: 'Primario', variable: '--primary', description: 'Color principal (botones, links, sidebar)' },
      { label: 'Primario Hover', variable: '--primary-hover', description: 'Hover del color primario' },
      { label: 'Primario Claro', variable: '--primary-light', description: 'Fondo sutil del color primario' },
      { label: 'Sello', variable: '--sello', description: 'Acento de marca: hoy, vencido, cumplido. Úsalo con moderación' },
      { label: 'Hover neutro', variable: '--accent', description: 'Superficie de hover en menús y listas (no es el acento de marca)' },
    ],
  },
  {
    title: 'Fondos',
    colors: [
      { label: 'Fondo', variable: '--background', description: 'Fondo principal de la página' },
      { label: 'Tarjeta', variable: '--card', description: 'Fondo de tarjetas' },
      { label: 'Secundario', variable: '--secondary', description: 'Fondo secundario / muted' },
      { label: 'Banda', variable: '--band', description: 'Encabezados oscuros de marca (no se invierte en modo oscuro)' },
    ],
  },
  {
    title: 'Texto',
    colors: [
      { label: 'Texto Principal', variable: '--foreground', description: 'Color del texto principal' },
      { label: 'Texto Muted', variable: '--muted-foreground', description: 'Texto secundario / gris' },
    ],
  },
  {
    title: 'Estados',
    colors: [
      { label: 'Éxito', variable: '--success', description: 'Indicador de éxito' },
      { label: 'Advertencia', variable: '--warning', description: 'Indicador de advertencia' },
      { label: 'Destructivo', variable: '--destructive', description: 'Error / eliminar' },
    ],
  },
  {
    title: 'Sidebar',
    colors: [
      { label: 'Fondo Sidebar', variable: '--sidebar-background', description: 'Fondo del menú lateral' },
      { label: 'Texto Sidebar', variable: '--sidebar-foreground', description: 'Texto del menú lateral' },
      { label: 'Acento Sidebar', variable: '--sidebar-accent', description: 'Fondo hover en sidebar' },
      { label: 'Primario Sidebar', variable: '--sidebar-primary', description: 'Color primario del sidebar' },
    ],
  },
  {
    title: 'Bordes',
    colors: [
      { label: 'Borde', variable: '--border', description: 'Color de bordes generales' },
      { label: 'Input', variable: '--input', description: 'Borde de inputs' },
      { label: 'Ring', variable: '--ring', description: 'Anillo de enfoque' },
    ],
  },
];

// Valores por defecto del tema claro: deben coincidir con `:root` en src/index.css (Dirección A · Expediente).
// Nota: estas variables se aplican en línea sobre <html>, así que también pisan el modo oscuro (.dark).
const DEFAULT_COLORS: Record<string, string> = {
  '--primary': '214 17% 8%',            // Tinta
  '--primary-hover': '214 12% 22%',
  '--primary-light': '60 10% 90%',
  '--accent': '60 8% 88%',              // hover neutro (shadcn), NO el acento de marca
  '--sello': '9 75% 45%',               // Sello #C8361D
  '--band': '214 17% 8%',
  '--background': '60 14% 95%',         // Papel
  '--card': '0 0% 100%',
  '--secondary': '60 10% 90%',
  '--foreground': '214 17% 8%',
  '--muted-foreground': '217 8% 39%',   // Folio
  '--success': '150 55% 27%',           // Vigente
  '--warning': '35 100% 30%',
  '--destructive': '9 75% 42%',
  '--sidebar-background': '60 10% 92%',
  '--sidebar-foreground': '214 17% 8%',
  '--sidebar-accent': '60 8% 86%',
  '--sidebar-primary': '214 17% 8%',
  '--border': '70 7% 83%',
  '--input': '214 8% 70%',
  '--ring': '214 17% 8%',
};

// Variantes de Expediente: cambian el acento de marca (Sello) y conservan Papel + Tinta.
// Cada tono de acento pasa 4.5:1 sobre Papel para uso como texto.
const withSello = (sello: string): Record<string, string> => ({ ...DEFAULT_COLORS, '--sello': sello });

const PRESET_THEMES: { name: string; colors: Record<string, string> }[] = [
  { name: 'Expediente (original)', colors: { ...DEFAULT_COLORS } },
  { name: 'Expediente · Azul acero', colors: withSello('209 56% 42%') },
  { name: 'Expediente · Vigente', colors: withSello('150 55% 27%') },
  { name: 'Expediente · Ciruela', colors: withSello('282 31% 41%') },
  {
    name: 'Alto contraste',
    colors: {
      ...DEFAULT_COLORS,
      '--sello': '9 85% 36%', '--background': '0 0% 100%', '--foreground': '0 0% 0%', '--primary': '0 0% 0%',
      '--primary-hover': '0 0% 15%', '--muted-foreground': '0 0% 25%', '--border': '0 0% 25%', '--input': '0 0% 25%',
      '--sidebar-background': '0 0% 96%', '--sidebar-foreground': '0 0% 0%', '--sidebar-primary': '0 0% 0%',
      '--ring': '0 0% 0%', '--band': '0 0% 0%',
    },
  },
];

function hslToHex(hsl: string): string {
  const parts = hsl.trim().split(/\s+/);
  if (parts.length < 3) return '#000000';
  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  const a2 = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a2 * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHsl(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0 0% 0%';
  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyColors(colors: Record<string, string>) {
  const root = document.documentElement;
  Object.entries(colors).forEach(([variable, value]) => {
    root.style.setProperty(variable, value);
  });
}

// Load theme from Supabase and apply it — called on app init
export async function initThemeFromStorage() {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'theme_colors')
      .maybeSingle();

    if (!error && data?.value) {
      const colors = data.value as Record<string, string>;
      applyColors(colors);
    }
  } catch {
    // Silently fail — use CSS defaults
  }
}

export default function ThemeEditor() {
  const [colors, setColors] = useState<Record<string, string>>({ ...DEFAULT_COLORS });
  const [saving, setSaving] = useState(false);
  const [loadingTheme, setLoadingTheme] = useState(true);

  useEffect(() => {
    loadThemeFromDB();
  }, []);

  const loadThemeFromDB = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'theme_colors')
        .maybeSingle();

      if (!error && data?.value) {
        const saved = data.value as Record<string, string>;
        setColors(saved);
      }
    } catch {
      // Use defaults
    } finally {
      setLoadingTheme(false);
    }
  };

  const updateColor = useCallback((variable: string, hexValue: string) => {
    const hslValue = hexToHsl(hexValue);
    const newColors = { ...colors, [variable]: hslValue };
    setColors(newColors);
    document.documentElement.style.setProperty(variable, hslValue);
  }, [colors]);

  const applyPreset = (preset: Record<string, string>) => {
    setColors({ ...preset });
    applyColors(preset);
    toast.success('Tema aplicado (no guardado aún)');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert(
          { key: 'theme_colors', value: colors, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );
      if (error) throw error;
      toast.success('Tema guardado — todos los usuarios verán los cambios');
    } catch (err) {
      logger.error('Error saving theme:', err);
      toast.error('Error al guardar el tema');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setColors({ ...DEFAULT_COLORS });
    // Remove inline styles to revert to CSS defaults
    const root = document.documentElement;
    Object.keys(DEFAULT_COLORS).forEach((variable) => {
      root.style.removeProperty(variable);
    });

    setSaving(true);
    try {
      await supabase
        .from('app_settings')
        .delete()
        .eq('key', 'theme_colors');
      toast.success('Colores restaurados al original');
    } catch {
      toast.error('Error al restaurar');
    } finally {
      setSaving(false);
    }
  };

  const exportTheme = () => {
    const css = Object.entries(colors)
      .map(([k, v]) => `    ${k}: ${v};`)
      .join('\n');
    navigator.clipboard.writeText(`:root {\n${css}\n}`);
    toast.success('CSS copiado al portapapeles');
  };

  if (loadingTheme) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Presets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Temas Predefinidos
          </CardTitle>
          <CardDescription>
            Selecciona un tema base y luego personaliza los colores individuales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {PRESET_THEMES.map((preset) => {
              const primary = preset.colors['--primary'];
              const accent = preset.colors['--sello'];
              const sidebarBg = preset.colors['--sidebar-background'];
              return (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset.colors)}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-all text-left"
                >
                  <div className="flex gap-1">
                    <div className="w-5 h-5 rounded-full border border-border" style={{ backgroundColor: `hsl(${primary})` }} />
                    <div className="w-5 h-5 rounded-full border border-border" style={{ backgroundColor: `hsl(${accent})` }} />
                    <div className="w-5 h-5 rounded-full border border-border" style={{ backgroundColor: `hsl(${sidebarBg})` }} />
                  </div>
                  <span className="text-sm font-medium">{preset.name}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Color Pickers by Group */}
      {COLOR_GROUPS.map((group) => (
        <Card key={group.title}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{group.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.colors.map((color) => {
                const currentHsl = colors[color.variable] || DEFAULT_COLORS[color.variable] || '0 0% 50%';
                const hexValue = hslToHex(currentHsl);
                return (
                  <div key={color.variable} className="flex items-center gap-3">
                    <input
                      type="color"
                      value={hexValue}
                      onChange={(e) => updateColor(color.variable, e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border border-border"
                      style={{ padding: 0 }}
                    />
                    <div className="flex-1 min-w-0">
                      <Label className="text-sm font-medium">{color.label}</Label>
                      <p className="text-xs text-muted-foreground truncate">{color.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar Tema
        </Button>
        <Button variant="outline" onClick={exportTheme} className="gap-2">
          <Copy className="h-4 w-4" />
          Copiar CSS
        </Button>
        <Button variant="destructive" onClick={handleReset} disabled={saving} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Restaurar Original
        </Button>
      </div>
    </div>
  );
}
