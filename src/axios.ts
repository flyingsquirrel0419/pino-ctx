import type { InternalAxiosRequestConfig } from 'axios';

import { defaultContextStore } from './store';
import { injectTraceContextHeaders } from './propagation';
import type { LogContext } from './types';

export function createAxiosContextInterceptor(
  getContext: () => LogContext = defaultContextStore.getContext
) {
  return (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const context = getContext();
    const mergedHeaders = injectTraceContextHeaders(
      config.headers as unknown as Record<string, string | number | boolean | string[] | undefined>,
      context
    );

    return {
      ...config,
      headers: mergedHeaders as unknown as InternalAxiosRequestConfig['headers']
    };
  };
}
