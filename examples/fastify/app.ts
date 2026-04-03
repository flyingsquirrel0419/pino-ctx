import Fastify from 'fastify';

import { createContextLogger, createContextStore, pinoCTXPlugin } from '../../src';

const store = createContextStore();

const contextLogger = createContextLogger({
  level: 'info',
  store
});

const app = Fastify();

await app.register(pinoCTXPlugin, {
  store,
  extractContext: (request) => ({
    requestId: request.id,
    userAgent: request.headers['user-agent']
  })
});

app.get('/users', async () => {
  contextLogger.logger.info('fetching users');
  return { ok: true };
});

await app.listen({ port: 3000 });
contextLogger.logger.info('fastify example listening on :3000');
