import type { Config } from "tailwindcss";
import tailwindAnimate from "tailwindcss-animate";


// ── Escalas de la marca ─────────────────────────────────────────────────────
// Dirección A: el código legado usa la paleta cruda de Tailwind (amber-500, blue-100, purple-600…).
// En vez de editar cada componente, esas escalas se redefinen aquí a partir de cuatro tonos de marca,
// conservando su semántica (ámbar = atención, verde = vigente, rojo = vencido, azul = informativo).
// OJO: `amber-500`, `blue-100`, etc. NO son los valores por defecto de Tailwind.
const mix = (hex: string, target: number, t: number) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(c + (target - c) * t));
  return `#${ch.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
};
const brandScale = (base: string) => ({
  50: mix(base, 255, 0.92), 100: mix(base, 255, 0.84), 200: mix(base, 255, 0.68),
  300: mix(base, 255, 0.5), 400: mix(base, 255, 0.25), 500: base,
  600: mix(base, 0, 0.12), 700: mix(base, 0, 0.28), 800: mix(base, 0, 0.45),
  900: mix(base, 0, 0.6), 950: mix(base, 0, 0.75),
});
const OCRE = brandScale("#B87400");
const VIGENTE = brandScale("#1F6B45");
const SELLO = brandScale("#C8361D");
const ACERO = brandScale("#2F6FA8");
const CIRUELA = brandScale("#7A4A8C");

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
    fontFamily: {
        heading: ['IBM Plex Sans Condensed', 'IBM Plex Sans', 'system-ui', 'sans-serif'],
        body: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        amber: OCRE, orange: OCRE, yellow: OCRE,
        green: VIGENTE, emerald: VIGENTE, lime: VIGENTE,
        red: SELLO, rose: SELLO, pink: SELLO,
        blue: ACERO, sky: ACERO, cyan: ACERO, teal: ACERO, indigo: ACERO,
        purple: CIRUELA, violet: CIRUELA, fuchsia: CIRUELA,
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
          light: "hsl(var(--primary-light))",
          glow: "hsl(var(--primary-glow))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        band: {
          DEFAULT: "hsl(var(--band))",
          foreground: "hsl(var(--band-foreground))",
        },
        sello: {
          DEFAULT: "hsl(var(--sello))",
          foreground: "hsl(var(--sello-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      // Dirección A: sin sombras decorativas. Solo las capas flotantes conservan una sombra corta.
      boxShadow: {
        sm: "none",
        DEFAULT: "none",
        md: "0 8px 24px -16px hsl(214 17% 8% / 0.25)",
        lg: "0 12px 28px -18px hsl(214 17% 8% / 0.30)",
        xl: "0 16px 32px -20px hsl(214 17% 8% / 0.35)",
        "2xl": "0 24px 48px -24px hsl(214 17% 8% / 0.40)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        // Dirección A: esquinas casi rectas. Los xl/2xl/3xl heredados se normalizan aquí
        // en lugar de editar cada componente; `full` se conserva para avatares, puntos y switches.
        xl: "var(--radius)",
        "2xl": "var(--radius)",
        "3xl": "var(--radius)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0", opacity: "0" },
          to: { height: "var(--radix-accordion-content-height)", opacity: "1" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)", opacity: "1" },
          to: { height: "0", opacity: "0" },
        },
        "fade-in": {
          "0%": {
            opacity: "0",
            transform: "translateY(10px)"
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)"
          }
        },
        "fade-out": {
          "0%": {
            opacity: "1",
            transform: "translateY(0)"
          },
          "100%": {
            opacity: "0",
            transform: "translateY(10px)"
          }
        },
        "scale-in": {
          "0%": {
            transform: "scale(0.95)",
            opacity: "0"
          },
          "100%": {
            transform: "scale(1)",
            opacity: "1"
          }
        },
        "scale-out": {
          from: { transform: "scale(1)", opacity: "1" },
          to: { transform: "scale(0.95)", opacity: "0" }
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" }
        },
        "slide-out-right": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(100%)" }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "fade-out": "fade-out 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "scale-out": "scale-out 0.2s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "slide-out-right": "slide-out-right 0.3s ease-out",
        "enter": "fade-in 0.3s ease-out, scale-in 0.2s ease-out",
        "exit": "fade-out 0.3s ease-out, scale-out 0.2s ease-out"
      },
    },
  },
  plugins: [tailwindAnimate],
} satisfies Config;
