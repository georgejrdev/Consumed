import { Injectable, inject } from '@angular/core';
import {
  CONSUMED_BRIDGE,
  type Item,
  type ItemInput,
  type ItemSuggestions,
  type ListOptions,
  type MediaType,
  type Result,
  type VaultInfo,
} from './bridge';

@Injectable({ providedIn: 'root' })
export class Api {
  private readonly bridge = inject(CONSUMED_BRIDGE);

  chooseVault(): Promise<Result<VaultInfo | null>> {
    return this.safe(() => this.bridge.vault.choose());
  }

  currentVault(): Promise<Result<VaultInfo | null>> {
    return this.safe(() => this.bridge.vault.current());
  }

  list(options?: ListOptions): Promise<Result<Item[]>> {
    return this.safe(() => this.bridge.items.list(options));
  }

  get(id: string): Promise<Result<Item | null>> {
    return this.safe(() => this.bridge.items.get(id));
  }

  create(input: ItemInput): Promise<Result<Item>> {
    return this.safe(() => this.bridge.items.create(input));
  }

  update(id: string, input: ItemInput): Promise<Result<Item>> {
    return this.safe(() => this.bridge.items.update(id, input));
  }

  remove(id: string): Promise<Result<{ id: string }>> {
    return this.safe(() => this.bridge.items.delete(id));
  }

  suggestions(type: MediaType): Promise<Result<ItemSuggestions>> {
    return this.safe(() => this.bridge.items.suggestions(type));
  }

  importImage(): Promise<Result<{ path: string } | null>> {
    return this.safe(() => this.bridge.items.importImage());
  }

  private async safe<T>(call: () => Promise<Result<T>>): Promise<Result<T>> {
    try {
      return await call();
    } catch (error) {
      return {
        ok: false,
        errors: [
          {
            field: 'ipc',
            message:
              error instanceof Error
                ? error.message
                : 'Falha inesperada na comunicação com o aplicativo.',
          },
        ],
      };
    }
  }
}
