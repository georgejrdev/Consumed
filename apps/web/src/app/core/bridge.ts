import { InjectionToken } from '@angular/core';
import type { Item, ItemInput, MediaType, Result } from '@consumed/contract';

export type {
  Item,
  ItemInput,
  MediaType,
  ReadingStatus,
  Result,
  ValidationError,
} from '@consumed/contract';

export type VersionChange = 'upgrade' | 'downgrade';

export interface VaultInfo {
  path: string;
  appVersion?: string;
  previousAppVersion?: string | null;
  versionChange?: VersionChange | null;
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

export interface ConsumedBridge {
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
    consumed?: ConsumedBridge;
  }
}

export const CONSUMED_BRIDGE = new InjectionToken<ConsumedBridge>('CONSUMED_BRIDGE');

const MISSING_BRIDGE_MESSAGE = 'Aplicativo desktop não detectado.';

function rejected<T>(): Promise<Result<T>> {
  return Promise.resolve({
    ok: false,
    errors: [{ field: 'bridge', message: MISSING_BRIDGE_MESSAGE }],
  });
}

export const missingBridge: ConsumedBridge = {
  vault: {
    choose: () => rejected(),
    current: () => rejected(),
  },
  items: {
    list: () => rejected(),
    get: () => rejected(),
    create: () => rejected(),
    update: () => rejected(),
    delete: () => rejected(),
    suggestions: () => rejected(),
    importImage: () => rejected(),
  },
};
