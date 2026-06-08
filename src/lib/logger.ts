const isDev = import.meta.env.DEV;

export const logger = {
  error(message: string, error?: unknown) {
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
