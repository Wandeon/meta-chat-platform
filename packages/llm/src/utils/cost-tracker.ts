export interface CostEntry {
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  costInUsd?: number;
  metadata?: Record<string, unknown>;
}

export class CostTracker {
  private readonly entries: CostEntry[] = [];

  public record(entry: CostEntry): void {
    this.entries.push(entry);
  }

  public getAll(): CostEntry[] {
    return [...this.entries];
  }
}
