import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';

import { extractTraceContext } from '../propagation';
import { fastifyPlugin } from './fastifyPlugin';
import { defaultContextStore } from '../store';
import type { FastifyContextOptions, LogContext } from '../types';

const REQUEST_CONTEXT_SYMBOL = Symbol('pino-ctx.fastify.context');

type FastifyRequestWithContext = FastifyRequest & {
  [REQUEST_CONTEXT_SYMBOL]?: LogContext;
};

function defaultExtractContext(request: FastifyRequest): LogContext {
  const requestIdHeader = request.headers['x-request-id'];

  return {
    ...extractTraceContext(request.headers as Record<string, string | string[] | undefined>),
    requestId: Array.isArray(requestIdHeader) ? requestIdHeader[0] : requestIdHeader ?? request.id,
    method: request.method,
    path: request.routeOptions.url || request.url
  };
}

const plugin: FastifyPluginAsync<
  FastifyContextOptions<FastifyRequest, FastifyReply>
> = async (
  fastify: FastifyInstance,
  options: FastifyContextOptions<FastifyRequest, FastifyReply> = {}
) => {
  const store = options.store ?? defaultContextStore;
  const extractContext =
    options.extractContext ??
    ((request: FastifyRequest, _reply: FastifyReply) => defaultExtractContext(request));

  fastify.addHook('onRequest', (request, reply, done) => {
    try {
      const requestWithContext = request as FastifyRequestWithContext;
      requestWithContext[REQUEST_CONTEXT_SYMBOL] = extractContext(request, reply);
      store.withContext(requestWithContext[REQUEST_CONTEXT_SYMBOL], () => done());
    } catch (error) {
      done(error as Error);
    }
  });
};

export const pinoCTXPlugin = fastifyPlugin(plugin, {
  name: 'pino-ctx'
});
