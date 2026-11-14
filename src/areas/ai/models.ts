import { num, type AiConnection, type AiConnectionInput, type AiModelSettings } from './types';

/** One model of one connection, as the screens show it: its settings with AbpAi's defaults filled in. */
export interface AiModelRow {
  /** `connectionId:model`: what an alias target and a scope's opened models are keyed by. */
  key: string;
  connectionId: string;
  connection: string;
  scopeId: string | null;
  modelId: string;
  name: string;
  enabled: boolean;
  tools: boolean;
  images: boolean;
  structuredOutput: boolean;
  contextTokens: number | null;
  /** Per million tokens; null when the model costs nothing in and nothing out. */
  inputPrice: number | null;
  outputPrice: number | null;
  priceSetAt: string | null;
}

export const modelKey = (connectionId: string, model: string | null | undefined) => `${connectionId}:${model ?? ''}`;

/** Every model of the connections, in their order. A model with no settings is on and takes tools (AbpAi's defaults). */
export function modelRows(connections: readonly AiConnection[]): AiModelRow[] {
  return connections.flatMap((c) =>
    c.models.map((model) => {
      const settings: AiModelSettings = c.modelSettings?.[model] ?? {};
      const price = c.modelPrices?.[model];
      const input = price ? num(price.input) : num(c.inputPrice);
      const output = price ? num(price.output) : num(c.outputPrice);
      // Nothing in and nothing out is no price: its calls count as free either way.
      const priced = input !== 0 || output !== 0;
      return {
        key: modelKey(c.id, model),
        connectionId: c.id,
        connection: c.name,
        scopeId: c.scopeId ?? null,
        modelId: model,
        name: settings.name || model,
        enabled: settings.enabled ?? true,
        tools: settings.tools ?? true,
        images: settings.images ?? false,
        structuredOutput: settings.structuredOutput ?? c.structuredOutput,
        contextTokens: settings.contextTokens == null ? null : num(settings.contextTokens),
        inputPrice: priced ? input : null,
        outputPrice: priced ? output : null,
        priceSetAt: settings.priceSetAt ?? null,
      };
    }),
  );
}

/**
 * The connection as an update with one model's settings and price changed. Everything else goes back as it is; its key
 * isn't sent, so the server keeps it.
 */
export function withModel(c: AiConnection, model: string, settings: AiModelSettings, price: { input: number; output: number } | null): AiConnectionInput {
  const modelPrices = { ...(c.modelPrices ?? {}) };
  if (price) modelPrices[model] = { ...modelPrices[model], input: price.input, output: price.output };
  else delete modelPrices[model];
  return {
    name: c.name,
    provider: c.provider,
    models: c.models,
    dataClasses: c.dataClasses,
    modelSettings: { ...(c.modelSettings ?? {}), [model]: settings },
    endpoint: c.endpoint,
    labels: c.labels,
    settings: c.settings,
    inputPrice: c.inputPrice,
    outputPrice: c.outputPrice,
    modelPrices,
    structuredOutput: c.structuredOutput,
    enabled: c.enabled,
    cacheWritePrice: c.cacheWritePrice,
    cacheReadPrice: c.cacheReadPrice,
  };
}
