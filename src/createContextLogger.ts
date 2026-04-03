import type { LogContext } from './types';

import { createContextualLogger } from './pinoProxy';
import { defaultContextStore } from './store';
import { getOpenTelemetryContext } from './telemetry';
import type { ContextLoggerInstance, ContextLoggerOptions } from './types';

function mergeContexts(...contexts: LogContext[]): LogContext {
  return contexts.reduce<LogContext>((merged, context) => ({ ...merged, ...context }), {});
}

export function createContextLogger(
  options: ContextLoggerOptions = {}
): ContextLoggerInstance {
  const {
    destination,
    includeOpenTelemetryContext = false,
    store = defaultContextStore,
    ...pinoOptions
  } = options;

  const getLogContext = (): LogContext =>
    includeOpenTelemetryContext
      ? mergeContexts(store.getContext(), getOpenTelemetryContext())
      : store.getContext();

  const logger = createContextualLogger({
    destination,
    getContext: getLogContext,
    options: pinoOptions
  });

  return {
    logger,
    setContext: store.setContext,
    getContext: store.getContext,
    withContext: store.withContext,
    clearContext: store.clearContext,
    getLogContext
  };
}
