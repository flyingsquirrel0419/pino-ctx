import { Writable } from 'node:stream';
import { performance } from 'node:perf_hooks';

import pino from 'pino';

import { createContextLogger } from '../src';

const noopDestination = new Writable({
  write(_chunk, _encoding, callback) {
    callback();
  }
});

function runBenchmark(label: string, fn: () => void, iterations = 20_000): number {
  const start = performance.now();

  for (let index = 0; index < iterations; index += 1) {
    fn();
  }

  const end = performance.now();
  const duration = end - start;

  console.log(`${label}: ${duration.toFixed(2)}ms`);
  return duration;
}

function average(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function tail(values: number[], countToDrop: number): number[] {
  return values.slice(Math.min(countToDrop, values.length));
}

const baseLogger = pino({ base: null, timestamp: false }, noopDestination);
const contextLogger = createContextLogger({
  base: null,
  timestamp: false,
  destination: noopDestination
});

const baseDurations: number[] = [];
const contextualDurations: number[] = [];

baseLogger.info({ service: 'bench' }, 'warmup');
contextLogger.withContext({ requestId: 'req-bench', userId: 'user-bench' }, () => {
  contextLogger.logger.info({ service: 'bench' }, 'warmup');
});

for (let round = 0; round < 6; round += 1) {
  if (round % 2 === 0) {
    baseDurations.push(
      runBenchmark(`plain pino round ${round + 1}`, () => {
        baseLogger.info({ service: 'bench' }, 'plain');
      })
    );

    contextualDurations.push(
      contextLogger.withContext({ requestId: 'req-bench', userId: 'user-bench' }, () =>
        runBenchmark(`pino-ctx round ${round + 1}`, () => {
          contextLogger.logger.info({ service: 'bench' }, 'contextual');
        })
      )
    );
  } else {
    contextualDurations.push(
      contextLogger.withContext({ requestId: 'req-bench', userId: 'user-bench' }, () =>
        runBenchmark(`pino-ctx round ${round + 1}`, () => {
          contextLogger.logger.info({ service: 'bench' }, 'contextual');
        })
      )
    );

    baseDurations.push(
      runBenchmark(`plain pino round ${round + 1}`, () => {
        baseLogger.info({ service: 'bench' }, 'plain');
      })
    );
  }
}

const baseAverage = average(baseDurations);
const contextualAverage = average(contextualDurations);
const overhead = ((contextualAverage - baseAverage) / baseAverage) * 100;
const steadyStateBaseAverage = average(tail(baseDurations, 2));
const steadyStateContextualAverage = average(tail(contextualDurations, 2));
const steadyStateOverhead =
  ((steadyStateContextualAverage - steadyStateBaseAverage) / steadyStateBaseAverage) * 100;

console.log(`plain pino avg: ${baseAverage.toFixed(2)}ms`);
console.log(`pino-ctx avg: ${contextualAverage.toFixed(2)}ms`);
console.log(`estimated overhead: ${overhead.toFixed(2)}%`);
console.log(`plain pino steady-state avg: ${steadyStateBaseAverage.toFixed(2)}ms`);
console.log(`pino-ctx steady-state avg: ${steadyStateContextualAverage.toFixed(2)}ms`);
console.log(`steady-state overhead: ${steadyStateOverhead.toFixed(2)}%`);
