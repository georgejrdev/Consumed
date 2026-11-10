import { contextBridge, ipcRenderer } from 'electron';
import type { Item, ItemInput, MediaType, Result } from '@consumed/contract';
import type { ConsumedApi, ItemSuggestions, ListOptions, VaultInfo } from './types';

async function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  const response = await ipcRenderer.invoke(channel, ...args);
  return response as T;
}

const api: ConsumedApi = {
  vault: {
    choose: () => invoke<Result<VaultInfo | null>>('vault:choose'),
    current: () => invoke<Result<VaultInfo | null>>('vault:current'),
  },
  items: {
    list: (options?: ListOptions) => invoke<Result<Item[]>>('items:list', options),
    get: (id: string) => invoke<Result<Item | null>>('items:get', id),
    create: (input: ItemInput) => invoke<Result<Item>>('items:create', input),
    update: (id: string, input: ItemInput) => invoke<Result<Item>>('items:update', id, input),
    delete: (id: string) => invoke<Result<{ id: string }>>('items:delete', id),
    suggestions: (type: MediaType) => invoke<Result<ItemSuggestions>>('items:suggestions', type),
    importImage: () => invoke<Result<{ path: string } | null>>('items:importImage'),
  },
};

contextBridge.exposeInMainWorld('consumed', api);
