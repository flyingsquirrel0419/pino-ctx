import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    axios: 'src/axios.ts',
    createContextLogger: 'src/createContextLogger.ts',
    propagation: 'src/propagation.ts',
    store: 'src/store.ts',
    telemetry: 'src/telemetry.ts',
    'adapters/express': 'src/adapters/express.ts',
    'adapters/fastify': 'src/adapters/fastify.ts',
    'adapters/hono': 'src/adapters/hono.ts',
    'adapters/koa': 'src/adapters/koa.ts'
  },
  format: ['esm', 'cjs'],
  target: 'node18',
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['axios', 'express', 'fastify', 'hono', 'koa', 'pino', '@opentelemetry/api']
});
