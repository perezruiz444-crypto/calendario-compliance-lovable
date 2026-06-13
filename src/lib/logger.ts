const isDev = import.meta.env.DEV;

export const logger = {
  error(message: string, error?: unknown) {
    // Los errores siempre se registran (dev y prod) para no perder señal.
    // Punto único de integración para un servicio de observabilidad futuro.
    console.error(message, error);
  },

  warn(message: string, ...args: unknown[]) {
    if (isDev) {
      console.warn(message, ...args);
    }
  },

  info(message: string, ...args: unknown[]) {
    if (isDev) {
      console.log(message, ...args);
    }
  },
};
