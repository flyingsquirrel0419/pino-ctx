import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';

import { createHonoMiddleware } from '../../src/adapters/hono';
import { createBufferedLogger } from '../helpers';

describe('hono adapter', () => {
  it('binds context for fetch-style handlers', async () => {
    const contextLogger = createBufferedLogger();
    const app = new Hono();

    app.use(
      createHonoMiddleware({
        store: contextLogger.store,
        extractContext: (ctx) => ({
          requestId: ctx.req.header('x-request-id') ?? 'missing',
          projectId: 'proj-hono'
        })
      })
    );

    app.get('/tasks', async (ctx) => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      contextLogger.logger.info('hono handler');
      return ctx.json({ context: contextLogger.getContext() });
    });

    const response = await app.request('http://localhost/tasks', {
      headers: {
        'x-request-id': 'req-hono'
      }
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      context: {
        requestId: 'req-hono',
        projectId: 'proj-hono'
      }
    });

    const logs = await contextLogger.readLogs();

    expect(logs[0]).toMatchObject({
      msg: 'hono handler',
      requestId: 'req-hono',
      projectId: 'proj-hono'
    });
  });
});
