import * as Sentry from '@sentry/react';

const isDev = import.meta.env.DEV;

export const logger = {
  error(message: string, error?: unknown) {
    if (isDev) {
      console.error(message, error);
    } else {
      Sentry.captureException(error instanceof Error ? error : new Error(message), {
        extra: { message },
      });
    }
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
