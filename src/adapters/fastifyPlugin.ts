interface FastifyPluginMetadata {
  encapsulate?: boolean;
  fastify?: string;
  name?: string;
}

type FastifyPluginLike<T extends (...args: never[]) => unknown> = T & {
  default?: T;
};

export function fastifyPlugin<T extends (...args: never[]) => unknown>(
  plugin: FastifyPluginLike<T>,
  metadata: FastifyPluginMetadata = {}
): FastifyPluginLike<T> {
  if (typeof plugin !== 'function') {
    throw new TypeError(`fastifyPlugin expects a function, received ${typeof plugin}`);
  }

  const resolvedMetadata: FastifyPluginMetadata = {
    name: metadata.name ?? plugin.name ?? 'pino-ctx-fastify-plugin',
    ...metadata
  };

  const pluginWithMetadata = plugin as unknown as Record<PropertyKey, unknown> & {
    default?: T;
  };

  pluginWithMetadata[Symbol.for('skip-override')] = resolvedMetadata.encapsulate !== true;
  pluginWithMetadata[Symbol.for('fastify.display-name')] = resolvedMetadata.name;
  // We intentionally omit the `fastify` version string here. The wrapper exists to
  // keep `fastify-plugin` out of runtime dependencies, and pinning a version string
  // would reintroduce compatibility warnings across Fastify majors that the adapter
  // does not actually depend on.
  pluginWithMetadata[Symbol.for('plugin-meta')] = resolvedMetadata;

  if (!pluginWithMetadata.default) {
    pluginWithMetadata.default = plugin;
  }

  return plugin as FastifyPluginLike<T>;
}
