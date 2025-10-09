import { addToRequestContext, ChannelType, createLogger, TenantSettings } from '@meta-chat/shared';
import {
  Channel,
  Prisma,
  Tenant,
  getPrismaClient,
} from '@meta-chat/database';
import { ProviderConfig } from '@meta-chat/llm';

type JsonValue = Prisma.JsonValue;

type TenantSettingsRecord = TenantSettings & {
  llm?: Partial<ProviderConfig> & LLMExtraOptions;
};

export interface LLMExtraOptions {
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface LLMRuntimeConfiguration {
  config: ProviderConfig;
  options: LLMExtraOptions;
}

export interface TenantRuntimeConfig {
  tenant: Tenant;
  channel: Channel;
  settings: TenantSettingsRecord;
  channelConfig: Record<string, unknown>;
  llm?: LLMRuntimeConfiguration;
}

interface CacheEntry {
  value: TenantRuntimeConfig;
  expiresAt: number;
}

export interface TenantConfigCacheOptions {
  ttlMs?: number;
}

const logger = createLogger('TenantConfigCache');

export class TenantConfigCache {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly prisma = getPrismaClient();
  private readonly ttlMs: number;

  constructor(options: TenantConfigCacheOptions = {}) {
    this.ttlMs = options.ttlMs ?? 5 * 60 * 1000;
  }

  async get(tenantId: string, channelType: ChannelType): Promise<TenantRuntimeConfig> {
    const key = this.getCacheKey(tenantId, channelType);
    const now = Date.now();
    const cached = this.cache.get(key);

    if (cached && cached.expiresAt > now) {
      logger.debug('Cache hit for tenant/channel configuration', { tenantId, channelType });
      return cached.value;
    }

    logger.info('Cache miss for tenant/channel configuration', { tenantId, channelType });

    const result = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        channels: {
          where: { type: channelType },
          take: 1,
        },
      },
    });

    if (!result) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    const channel = result.channels[0];
    if (!channel) {
      throw new Error(`Channel ${channelType} not configured for tenant ${tenantId}`);
    }

    const settings = this.parseSettings(result.settings);
    const channelConfig = this.parseConfig(channel.config);
    const llm = this.extractLLMConfig(settings);

    const runtimeConfig: TenantRuntimeConfig = {
      tenant: result,
      channel,
      settings,
      channelConfig,
      llm,
    };

    this.cache.set(key, {
      value: runtimeConfig,
      expiresAt: now + this.ttlMs,
    });

    addToRequestContext({ tenantId });

    return runtimeConfig;
  }

  invalidate(tenantId: string, channelType?: ChannelType): void {
    if (channelType) {
      this.cache.delete(this.getCacheKey(tenantId, channelType));
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.startsWith(`${tenantId}::`)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  private getCacheKey(tenantId: string, channelType: ChannelType): string {
    return `${tenantId}::${channelType}`;
  }

  private parseSettings(raw: JsonValue): TenantSettingsRecord {
    if (!raw || typeof raw !== 'object') {
      return this.defaultSettings();
    }

    const parsed = this.cloneJson(raw);
    return {
      ...this.defaultSettings(),
      ...(parsed as Partial<TenantSettingsRecord>),
    };
  }

  private parseConfig(raw: JsonValue): Record<string, unknown> {
    if (!raw || typeof raw !== 'object') {
      return {};
    }

    return this.cloneJson(raw) as Record<string, unknown>;
  }

  private cloneJson(raw: JsonValue): Record<string, unknown> | undefined {
    if (!raw) {
      return undefined;
    }

    return JSON.parse(JSON.stringify(raw));
  }

  private extractLLMConfig(settings: TenantSettingsRecord): LLMRuntimeConfiguration | undefined {
    if (!settings.llm || !settings.llm.provider || !settings.llm.model) {
      return undefined;
    }

    const { temperature, topP, maxTokens, systemPrompt, ...providerConfig } = settings.llm;
    return {
      config: providerConfig as ProviderConfig,
      options: { temperature, topP, maxTokens, systemPrompt },
    };
  }

  private defaultSettings(): TenantSettingsRecord {
    return {
      brandName: 'Meta Chat',
      tone: 'friendly',
      locale: ['en-US'],
      enableRag: false,
      enableFunctionCalling: false,
      enableHumanHandoff: false,
      humanHandoffKeywords: [],
      ragConfig: {
        topK: 5,
        minSimilarity: 0.5,
        hybridWeights: {
          keyword: 0.3,
          vector: 0.7,
        },
      },
    };
  }
}

