import type { Item, ItemInput, MediaType, Result } from '@consumed/contract';

export interface VaultInfo {
  path: string;
}

export interface ListOptions {
  type?: MediaType;
  q?: string;
  limit?: number;
  offset?: number;
  onlyConsumed?: boolean;
}

export interface ItemSuggestions {
  authors: string[];
  publishers: string[];
  directors: string[];
  screenplayBy: string[];
  producedBy: string[];
  distributedBy: string[];
  languages: string[];
}

export interface ConsumedApi {
  vault: {
    choose(): Promise<Result<VaultInfo | null>>;
    current(): Promise<Result<VaultInfo | null>>;
  };
  items: {
    list(options?: ListOptions): Promise<Result<Item[]>>;
    get(id: string): Promise<Result<Item | null>>;
    create(input: ItemInput): Promise<Result<Item>>;
    update(id: string, input: ItemInput): Promise<Result<Item>>;
    delete(id: string): Promise<Result<{ id: string }>>;
    suggestions(type: MediaType): Promise<Result<ItemSuggestions>>;
    importImage(): Promise<Result<{ path: string } | null>>;
  };
}

declare global {
  interface Window {
    consumed: ConsumedApi;
  }
}
