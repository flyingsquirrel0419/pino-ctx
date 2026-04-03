import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';

import { pinoCTXPlugin } from '../../src/adapters/fastify';
import { createBufferedLogger } from '../helpers';

describe('fastify adapter', () => {
  it('binds request context for route handlers', async () => {
    const contextLogger = createBufferedLogger();
    const app = Fastify();

    await app.register(pinoCTXPlugin, {
      store: contextLogger.store,
      extractContext: (request) => ({
        requestId: request.headers['x-request-id'] ?? request.id,
        accountId: 'acct-fastify'
      })
    });

    app.get('/users', async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      contextLogger.logger.info('fetching users');
      return { context: contextLogger.getContext() };
    });

    const response = await app.inject({
      method: 'GET',
      url: '/users',
      headers: {
        'x-request-id': 'req-fastify'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      context: {
        requestId: 'req-fastify',
        accountId: 'acct-fastify'
      }
    });

    const logs = await contextLogger.readLogs();

    expect(logs[0]).toMatchObject({
      msg: 'fetching users',
      requestId: 'req-fastify',
      accountId: 'acct-fastify'
    });

    const secondResponse = await app.inject({
      method: 'GET',
      url: '/users',
      headers: {
        'x-request-id': 'req-fastify-2'
      }
    });

    expect(secondResponse.json()).toEqual({
      context: {
        requestId: 'req-fastify-2',
        accountId: 'acct-fastify'
      }
    });

    expect(contextLogger.getContext()).toEqual({});

    await app.close();
  });

  it('keeps concurrent requests isolated at the adapter level', async () => {
    const contextLogger = createBufferedLogger();
    const app = Fastify();

    await app.register(pinoCTXPlugin, {
      store: contextLogger.store,
      extractContext: (request) => ({
        requestId: request.headers['x-request-id'] ?? request.id,
        lane: request.headers['x-lane'] ?? 'default'
      })
    });

    app.get('/concurrent', async (request) => {
      const delay = Number(request.headers['x-delay'] ?? 0);
      await new Promise((resolve) => setTimeout(resolve, delay));
      contextLogger.logger.info('concurrent fastify handler');
      return { context: contextLogger.getContext() };
    });

    const [firstResponse, secondResponse] = await Promise.all([
      app.inject({
        method: 'GET',
        url: '/concurrent',
        headers: {
          'x-request-id': 'req-fastify-a',
          'x-lane': 'lane-a',
          'x-delay': '20'
        }
      }),
      app.inject({
        method: 'GET',
        url: '/concurrent',
        headers: {
          'x-request-id': 'req-fastify-b',
          'x-lane': 'lane-b',
          'x-delay': '5'
        }
      })
    ]);

    expect(firstResponse.json()).toEqual({
      context: {
        requestId: 'req-fastify-a',
        lane: 'lane-a'
      }
    });
    expect(secondResponse.json()).toEqual({
      context: {
        requestId: 'req-fastify-b',
        lane: 'lane-b'
      }
    });

    const logs = await contextLogger.readLogs();

    expect(logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          msg: 'concurrent fastify handler',
          requestId: 'req-fastify-a',
          lane: 'lane-a'
        }),
        expect.objectContaining({
          msg: 'concurrent fastify handler',
          requestId: 'req-fastify-b',
          lane: 'lane-b'
        })
      ])
    );

    await app.close();
  });
});
