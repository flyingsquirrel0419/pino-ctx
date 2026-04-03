# pino-ctx

**Zero-boilerplate request context for Pino.** Set it once in your middleware — every log across every async call carries it automatically.

```
npm install pino-ctx pino
```

[![npm version](https://img.shields.io/npm/v/pino-ctx)](https://www.npmjs.com/package/pino-ctx)
[![npm downloads](https://img.shields.io/npm/dw/pino-ctx)](https://www.npmjs.com/package/pino-ctx)
[![Node.js >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

---

## The Problem

You're three function calls deep. You need `requestId` in your logs. So you either pass `logger` through every function signature — or your logs come out naked.

```ts
// 😩 the "logger as a hot potato" pattern
async function handleRequest(req, res) {
  const logger = pino.child({ requestId: req.id, userId: req.user.id })
  await processOrder(logger, req.body)           // pass it
}

async function processOrder(logger, order) {
  await validateInventory(logger, order)         // pass it again
}

async function validateInventory(logger, order) {
  await reserveStock(logger, order)              // and again
}
```

And once you hit `Promise.all`, you've lost track of which log belongs to which request.

## The Fix

```ts
// 😌 set once, available everywhere
app.use(createExpressMiddleware())

async function reserveStock(order) {
  logger.info('reserving stock')
  // → {"msg":"reserving stock","requestId":"abc-123","method":"POST","path":"/orders","traceId":"4bf92f3..."}
}
```

`pino-ctx` uses Node.js's built-in `AsyncLocalStorage` to bind context to the current async execution chain — no prop drilling, no global mutation, no context bleed between concurrent requests.

---

## Quick Start

```ts
// logger.ts
import { createContextLogger, createContextStore } from 'pino-ctx'

export const store = createContextStore()

export const { logger, setContext, getContext, withContext } = createContextLogger({
  level: 'info',
  store,
})
```

```ts
// server.ts
import express from 'express'
import { createExpressMiddleware } from 'pino-ctx'
import { logger, store } from './logger'

const app = express()

app.use(createExpressMiddleware({ store }))   // ← logger and middleware share the same store

app.get('/orders', async (req, res) => {
  logger.info('fetching orders')
  const orders = await getOrders()  // logs inside here get the same context
  res.json(orders)
})
```

Every log in every function called from this request — no matter how deeply nested — will include `requestId`, `method`, `path`, and any W3C trace headers automatically.

---

## Features

- **Automatic context propagation** via `AsyncLocalStorage` — survives `Promise.all`, `setTimeout`, `EventEmitter`, everything
- **Zero-config adapters** for Express, Fastify, Koa, and Hono
- **Nested context scopes** with `withContext()` — add per-operation fields without touching the parent scope
- **W3C Trace Context** — parses `traceparent` / `tracestate` headers inbound, injects them outbound
- **OpenTelemetry** — auto-merges active span's `traceId` and `spanId` when `@opentelemetry/api` is present (no-op if not installed)
- **Axios interceptor** — propagates trace headers to downstream HTTP calls
- **ESM + CJS** dual output, TypeScript-first

---

## Framework Adapters

### Express

```ts
import { createExpressMiddleware } from 'pino-ctx'

app.use(createExpressMiddleware())

// or with custom context extraction:
app.use(createExpressMiddleware({
  extractContext: (req) => ({
    requestId: req.headers['x-request-id'] ?? req.id,
    userId: req.user?.id,
    tenantId: req.headers['x-tenant-id'],
  })
}))
```

### Fastify

```ts
import { pinoCTXPlugin } from 'pino-ctx/fastify'

await app.register(pinoCTXPlugin, {
  extractContext: (request) => ({
    requestId: request.id,
    userId: request.user?.id,
  })
})
```

### Koa

```ts
import { createKoaMiddleware } from 'pino-ctx/koa'

app.use(createKoaMiddleware())
```

### Hono

```ts
import { createHonoMiddleware } from 'pino-ctx/hono'

app.use(createHonoMiddleware())
```

---

## Nested Contexts

Scope extra fields to a specific operation without affecting the parent:

```ts
import { logger, withContext } from 'pino-ctx'

async function processOrder(orderId: string) {
  await withContext({ orderId }, async () => {
    logger.info('processing order')
    // → {"requestId":"abc","userId":42,"orderId":"ord-99","msg":"processing order"}

    await withContext({ step: 'payment' }, async () => {
      logger.info('charging card')
      // → {"requestId":"abc","userId":42,"orderId":"ord-99","step":"payment","msg":"charging card"}
    })

    logger.info('order done')
    // → {"requestId":"abc","userId":42,"orderId":"ord-99","msg":"order done"}  (step is gone)
  })
}
```

Works correctly under `Promise.all` — each branch keeps its own isolated context.

---

## Microservices / Distributed Tracing

Propagate trace context to downstream HTTP calls with the Axios interceptor:

```ts
import axios from 'axios'
import { createAxiosContextInterceptor } from 'pino-ctx/axios'
import { getLogContext } from './logger'

const client = axios.create({ baseURL: 'http://orders-service' })
client.interceptors.request.use(createAxiosContextInterceptor(getLogContext))

// Now every outbound request carries:
// traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
// x-request-id: abc-123
```

---

## OpenTelemetry

Pass `includeOpenTelemetryContext: true` when setting up your logger and `pino-ctx` will automatically pull `traceId`, `spanId`, and `traceFlags` from the active OTel span:

```ts
const { logger } = createContextLogger({
  includeOpenTelemetryContext: true,
})

// logs automatically include:
// {"traceId":"4bf92f35...","spanId":"00f067aa...","msg":"..."}
```

Requires `@opentelemetry/api` to be installed. Falls back silently if it's not.

---

## Performance

`pino-ctx` uses pino's native `hooks.logMethod` rather than a `Proxy` wrapper. Context injection still has measurable overhead, but it stays on pino's supported extension path and avoids wrapping the logger API itself.

```
plain pino:   lower baseline
pino-ctx:     slightly higher
overhead:     benchmark- and workload-dependent
```

The included benchmark prints both overall and steady-state overhead. Run it yourself: `npm run bench`

---

## API Reference

### Core

| Export | Description |
|--------|-------------|
| `createContextLogger(options)` | Create a logger instance with its own context store |
| `logger` | Default logger (pre-configured instance) |
| `setContext(ctx)` | Merge fields into the current async context |
| `getContext()` | Read the current context |
| `withContext(ctx, fn)` | Run `fn` in a child context scope |
| `clearContext()` | Reset the current context to `{}` |
| `getLogContext()` | Read the context as pino will see it (includes OTel if enabled) |
| `createContextStore()` | Create an isolated `AsyncLocalStorage` store |

### Adapters

| Import path | Export |
|-------------|--------|
| `pino-ctx` | `createExpressMiddleware`, `pinoCTXMiddleware` |
| `pino-ctx/fastify` | `pinoCTXPlugin` |
| `pino-ctx/koa` | `createKoaMiddleware` |
| `pino-ctx/hono` | `createHonoMiddleware` |

### Trace / Propagation

| Import path | Export |
|-------------|--------|
| `pino-ctx` | `createAxiosContextInterceptor` |
| `pino-ctx/propagation` | `extractTraceContext`, `injectTraceContextHeaders`, `parseTraceparentHeader`, `serializeTraceparentHeader` |
| `pino-ctx/telemetry` | `getActiveTraceContext`, `getOpenTelemetryContext` |

---

## setContext vs withContext

| | `setContext(ctx)` | `withContext(ctx, fn)` |
|---|---|---|
| Scope | Mutates the current async context | Creates a child scope, isolated to `fn` |
| Use case | Inside middleware where the whole request is already scoped | Per-operation context (a job, a sub-transaction) |
| Leaks? | If called outside a scoped context, yes | Never |

**Rule of thumb:** prefer `withContext`. Use `setContext` only inside framework middleware that already owns the request lifetime.

---

## Installation by Use Case

```bash
# Core (always required)
npm install pino-ctx pino

# Express
npm install express

# Fastify
npm install fastify

# Koa
npm install koa

# Hono
npm install hono

# Axios propagation
npm install axios

# OpenTelemetry integration
npm install @opentelemetry/api
```

---

## Requirements

- Node.js >= 18 (`AsyncLocalStorage` stable)
- Pino >= 8

---

## Contributing

```bash
npm install
npm run typecheck
npm test
npm run build
```

See [`examples/`](./examples) for runnable Express, Fastify, and microservices demos.

---

## License

MIT
