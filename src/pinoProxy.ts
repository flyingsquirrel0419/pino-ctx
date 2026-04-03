import pino, { type DestinationStream, type LogFn, type Logger, type LoggerOptions } from 'pino';

import { EMPTY_CONTEXT } from './store';
import type { LogContext } from './types';

const lastScopedCache = new WeakMap<Logger, { context: LogContext; logger: Logger }>();

function getScopedLogger(target: Logger, context: LogContext): Logger {
  if (context === EMPTY_CONTEXT) {
    return target;
  }

  const lastScoped = lastScopedCache.get(target);

  if (lastScoped?.context === context) {
    return lastScoped.logger;
  }

  const childLogger = target.child(context);
  lastScopedCache.set(target, {
    context,
    logger: childLogger
  });
  return childLogger;
}

export interface ContextualLoggerConfig {
  destination?: DestinationStream;
  getContext: () => LogContext;
  options?: LoggerOptions;
}

export function createContextualLogger(config: ContextualLoggerConfig): Logger {
  const userHooks = config.options?.hooks;
  const userLogMethod = userHooks?.logMethod;

  const logMethod = userLogMethod
    ? function contextualUserHook(this: Logger, args: Parameters<LogFn>, method: LogFn, level: number) {
        const contextualMethod: LogFn = function (this: Logger, ...callArgs: Parameters<LogFn>) {
          const targetLogger = getScopedLogger(this, config.getContext());
          return method.apply(targetLogger, callArgs);
        } as LogFn;

        return userLogMethod.call(this, args, contextualMethod, level);
      }
    : function contextualLogMethod(this: Logger, args: Parameters<LogFn>, method: LogFn) {
        const targetLogger = getScopedLogger(this, config.getContext());
        return method.apply(targetLogger, args);
      };

  return pino(
    {
      ...config.options,
      hooks: {
        ...userHooks,
        logMethod
      }
    },
    config.destination
  );
}
