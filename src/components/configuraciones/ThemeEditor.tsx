import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Palette, RotateCcw, Save, Copy, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';

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
      { label: 'Acento', variable: '--accent', description: 'Color de acento (badges, alertas)' },
    ],
  },
  {
    title: 'Fondos',
    colors: [
      { label: 'Fondo', variable: '--background', description: 'Fondo principal de la página' },
      { label: 'Tarjeta', variable: '--card', description: 'Fondo de tarjetas' },
      { label: 'Secundario', variable: '--secondary', description: 'Fondo secundario / muted' },
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

// Default light theme values from index.css
const DEFAULT_COLORS: Record<string, string> = {
  '--primary': '210 100% 20%',
  '--primary-hover': '210 100% 25%',
  '--primary-light': '210 100% 95%',
  '--accent': '4 76% 49%',
  '--background': '0 0% 100%',
  '--card': '0 0% 100%',
  '--secondary': '0 0% 96%',
  '--foreground': '0 0% 20%',
  '--muted-foreground': '0 0% 40%',
  '--success': '142 76% 36%',
  '--warning': '38 92% 50%',
  '--destructive': '4 76% 49%',
  '--sidebar-background': '210 100% 15%',
  '--sidebar-foreground': '0 0% 100%',
  '--sidebar-accent': '210 100% 18%',
  '--sidebar-primary': '4 76% 49%',
  '--border': '0 0% 90%',
  '--input': '0 0% 90%',
  '--ring': '210 100% 20%',
};

const PRESET_THEMES: { name: string; colors: Record<string, string> }[] = [
  {
    name: '🔵 Azul Marino (Original)',
    colors: { ...DEFAULT_COLORS },
  },
  {
    name: '🟣 Púrpura Corporativo',
    colors: {
      ...DEFAULT_COLORS,
      '--primary': '262 80% 30%',
      '--primary-hover': '262 80% 35%',
      '--primary-light': '262 80% 95%',
      '--accent': '330 70% 50%',
      '--sidebar-background': '262 80% 20%',
      '--sidebar-accent': '262 80% 25%',
      '--sidebar-primary': '330 70% 50%',
      '--ring': '262 80% 30%',
    },
  },
  {
    name: '🌲 Verde Bosque',
    colors: {
      ...DEFAULT_COLORS,
      '--primary': '160 60% 25%',
      '--primary-hover': '160 60% 30%',
      '--primary-light': '160 60% 95%',
      '--accent': '30 80% 50%',
      '--sidebar-background': '160 60% 18%',
      '--sidebar-accent': '160 60% 22%',
      '--sidebar-primary': '30 80% 50%',
      '--ring': '160 60% 25%',
    },
  },
  {
    name: '🔴 Rojo Ejecutivo',
    colors: {
      ...DEFAULT_COLORS,
      '--primary': '0 65% 35%',
      '--primary-hover': '0 65% 40%',
      '--primary-light': '0 65% 95%',
      '--accent': '210 70% 45%',
      '--sidebar-background': '0 65% 22%',
      '--sidebar-accent': '0 65% 28%',
      '--sidebar-primary': '210 70% 45%',
      '--ring': '0 65% 35%',
    },
  },
  {
    name: '🌊 Azul Moderno',
    colors: {
      ...DEFAULT_COLORS,
      '--primary': '220 85% 45%',
      '--primary-hover': '220 85% 50%',
      '--primary-light': '220 85% 95%',
      '--accent': '45 90% 50%',
      '--sidebar-background': '220 85% 20%',
      '--sidebar-accent': '220 85% 25%',
      '--sidebar-primary': '45 90% 50%',
      '--ring': '220 85% 45%',
    },
  },
  {
    name: '🤍 Monocromático',
    colors: {
      ...DEFAULT_COLORS,
      '--primary': '0 0% 15%',
      '--primary-hover': '0 0% 22%',
      '--primary-light': '0 0% 96%',
      '--accent': '0 0% 40%',
      '--background': '0 0% 100%',
      '--card': '0 0% 100%',
      '--secondary': '0 0% 96%',
      '--foreground': '0 0% 10%',
      '--muted-foreground': '0 0% 45%',
      '--sidebar-background': '0 0% 8%',
      '--sidebar-foreground': '0 0% 95%',
      '--sidebar-accent': '0 0% 14%',
      '--sidebar-primary': '0 0% 70%',
      '--border': '0 0% 88%',
      '--input': '0 0% 88%',
      '--ring': '0 0% 15%',
      '--destructive': '0 70% 50%',
      '--success': '142 60% 40%',
      '--warning': '38 80% 50%',
    },
  },
  {
    name: '☁️ Tonos Claros',
    colors: {
      ...DEFAULT_COLORS,
      '--primary': '220 15% 50%',
      '--primary-hover': '220 15% 55%',
      '--primary-light': '220 15% 96%',
      '--accent': '200 20% 60%',
      '--background': '220 20% 98%',
      '--card': '0 0% 100%',
      '--secondary': '220 15% 95%',
      '--foreground': '220 10% 30%',
      '--muted-foreground': '220 10% 55%',
      '--sidebar-background': '220 15% 94%',
      '--sidebar-foreground': '220 10% 25%',
      '--sidebar-accent': '220 15% 90%',
      '--sidebar-primary': '200 20% 50%',
      '--border': '220 15% 90%',
      '--input': '220 15% 90%',
      '--ring': '220 15% 50%',
      '--destructive': '0 55% 55%',
      '--success': '142 40% 45%',
      '--warning': '38 60% 55%',
    },
  },
  {
    name: '⚫ Grafito',
    colors: {
      ...DEFAULT_COLORS,
      '--primary': '0 0% 25%',
      '--primary-hover': '0 0% 30%',
      '--primary-light': '0 0% 95%',
      '--accent': '200 80% 50%',
      '--sidebar-background': '0 0% 12%',
      '--sidebar-accent': '0 0% 18%',
      '--sidebar-primary': '200 80% 50%',
      '--ring': '0 0% 25%',
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

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

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

const STORAGE_KEY = 'lovable-custom-theme';

function loadSavedColors(): Record<string, string> | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function saveColors(colors: Record<string, string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
}

function applyColors(colors: Record<string, string>) {
  const root = document.documentElement;
  Object.entries(colors).forEach(([variable, value]) => {
    root.style.setProperty(variable, value);
  });
}

export function initThemeFromStorage() {
  const saved = loadSavedColors();
  if (saved) {
    applyColors(saved);
  }
}

export default function ThemeEditor() {
  const [colors, setColors] = useState<Record<string, string>>(() => {
    return loadSavedColors() || { ...DEFAULT_COLORS };
  });

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

  const handleSave = () => {
    saveColors(colors);
    toast.success('Tema guardado correctamente');
  };

  const handleReset = () => {
    setColors({ ...DEFAULT_COLORS });
    applyColors(DEFAULT_COLORS);
    localStorage.removeItem(STORAGE_KEY);
    // Remove inline styles to revert to CSS
    const root = document.documentElement;
    Object.keys(DEFAULT_COLORS).forEach((variable) => {
      root.style.removeProperty(variable);
    });
    toast.success('Colores restaurados al original');
  };

  const exportTheme = () => {
    const css = Object.entries(colors)
      .map(([k, v]) => `    ${k}: ${v};`)
      .join('\n');
    navigator.clipboard.writeText(`:root {\n${css}\n}`);
    toast.success('CSS copiado al portapapeles');
  };

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
              const accent = preset.colors['--accent'];
              const sidebarBg = preset.colors['--sidebar-background'];
              return (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset.colors)}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-all text-left"
                >
                  <div className="flex gap-1">
                    <div
                      className="w-5 h-5 rounded-full border border-border"
                      style={{ backgroundColor: `hsl(${primary})` }}
                    />
                    <div
                      className="w-5 h-5 rounded-full border border-border"
                      style={{ backgroundColor: `hsl(${accent})` }}
                    />
                    <div
                      className="w-5 h-5 rounded-full border border-border"
                      style={{ backgroundColor: `hsl(${sidebarBg})` }}
                    />
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
                    <div className="relative">
                      <input
                        type="color"
                        value={hexValue}
                        onChange={(e) => updateColor(color.variable, e.target.value)}
                        className="w-10 h-10 rounded-lg cursor-pointer border border-border"
                        style={{ padding: 0 }}
                      />
                    </div>
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
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />
          Guardar Tema
        </Button>
        <Button variant="outline" onClick={exportTheme} className="gap-2">
          <Copy className="h-4 w-4" />
          Copiar CSS
        </Button>
        <Button variant="destructive" onClick={handleReset} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Restaurar Original
        </Button>
      </div>
    </div>
  );
}
