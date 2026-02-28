/**
 * Dev-only logger: no-op in production to avoid console noise and leaking internals.
 */
const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;

export const devLog = {
  log: (...args: unknown[]) => (isDev ? console.log(...args) : undefined),
  warn: (...args: unknown[]) => (isDev ? console.warn(...args) : undefined),
  error: (...args: unknown[]) => (isDev ? console.error(...args) : undefined),
  debug: (...args: unknown[]) => (isDev ? console.debug(...args) : undefined),
};
