import { StorageProvider } from './storage-provider';

export class StorageProviderRegistry {
  private readonly providers = new Map<string, StorageProvider>();
  private readonly defaultProviderName: string;

  constructor(defaultProvider: StorageProvider) {
    this.defaultProviderName = defaultProvider.name;
    this.register(defaultProvider);
  }

  register(provider: StorageProvider): void {
    this.providers.set(provider.name, provider);
  }

  get(name: string): StorageProvider | undefined {
    return this.providers.get(name);
  }

  getDefault(): StorageProvider {
    const provider = this.get(this.defaultProviderName);
    if (!provider) {
      throw new Error(`Default storage provider ${this.defaultProviderName} is not registered`);
    }
    return provider;
  }
}
