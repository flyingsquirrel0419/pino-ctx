import { AsyncLocalStorage } from 'node:async_hooks';

import type { ContextStore, LogContext } from './types';

export const EMPTY_CONTEXT: LogContext = Object.freeze({});

export function createContextStore(): ContextStore {
  const storage = new AsyncLocalStorage<LogContext>();

  const getContext = (): LogContext => storage.getStore() ?? EMPTY_CONTEXT;

  const setContext = (context: LogContext): void => {
    const current = storage.getStore();

    if (!current || current === EMPTY_CONTEXT) {
      storage.enterWith({ ...context });
      return;
    }

    storage.enterWith({ ...current, ...context });
  };

  const withContext = <T>(context: LogContext, fn: () => T): T =>
    storage.run(
      (() => {
        const current = storage.getStore();

        if (!current || current === EMPTY_CONTEXT) {
          return { ...context };
        }

        return { ...current, ...context };
      })(),
      fn
    );

  const clearContext = (): void => {
    storage.enterWith(EMPTY_CONTEXT);
  };

  return {
    setContext,
    getContext,
    withContext,
    clearContext
  };
}

export const defaultContextStore = createContextStore();

export const setContext = defaultContextStore.setContext;
export const getContext = defaultContextStore.getContext;
export const withContext = defaultContextStore.withContext;
export const clearContext = defaultContextStore.clearContext;
