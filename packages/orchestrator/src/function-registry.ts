import { FunctionDefinition } from '@meta-chat/shared';

export class FunctionRegistry {
  private readonly registry = new Map<string, FunctionDefinition[]>();

  register(tenantId: string, functions: FunctionDefinition[]): void {
    this.registry.set(tenantId, functions);
  }

  append(tenantId: string, functions: FunctionDefinition[]): void {
    const existing = this.registry.get(tenantId) ?? [];
    this.registry.set(tenantId, [...existing, ...functions]);
  }

  get(tenantId: string): FunctionDefinition[] {
    return this.registry.get(tenantId) ?? [];
  }
}

