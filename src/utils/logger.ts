/**
 * Утилита для логирования только в development режиме
 * В production логи не выводятся
 */

const isDev = import.meta.env.DEV

export const logger = {
  log: (...args: unknown[]): void => {
    if (isDev) {
      console.log(...args)
    }
  },

  warn: (...args: unknown[]): void => {
    if (isDev) {
      console.warn(...args)
    }
  },

  error: (...args: unknown[]): void => {
    // Ошибки логируем всегда (важно для отладки в production)
    console.error(...args)
  },

  debug: (...args: unknown[]): void => {
    if (isDev) {
      console.debug(...args)
    }
  },

  /**
   * Создаёт логгер с префиксом для конкретного модуля
   */
  createLogger: (prefix: string) => ({
    log: (...args: unknown[]): void => {
      if (isDev) {
        console.log(`[${prefix}]`, ...args)
      }
    },
    warn: (...args: unknown[]): void => {
      if (isDev) {
        console.warn(`[${prefix}]`, ...args)
      }
    },
    error: (...args: unknown[]): void => {
      console.error(`[${prefix}]`, ...args)
    },
    debug: (...args: unknown[]): void => {
      if (isDev) {
        console.debug(`[${prefix}]`, ...args)
      }
    },
  }),
}

export default logger
