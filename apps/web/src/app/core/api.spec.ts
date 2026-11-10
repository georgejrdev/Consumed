import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import type {
  ConsumedBridge,
  Item,
  ItemInput,
  ListOptions,
  Result,
  ValidationError,
} from './bridge';
import { CONSUMED_BRIDGE, missingBridge } from './bridge';
import { Api } from './api';

const MISSING_BRIDGE_MESSAGE = 'Aplicativo desktop não detectado.';
const GENERIC_MESSAGE = 'Falha inesperada na comunicação com o aplicativo.';

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'item-1',
    type: 'filme',
    title: 'Item de teste',
    consumed_on: '2026-01-05',
    created_at: '2026-01-05T00:00:00.000Z',
    updated_at: '2026-01-05T00:00:00.000Z',
    ...overrides,
  };
}

function itemInput(overrides: Partial<ItemInput> = {}): ItemInput {
  return {
    type: 'livro',
    title: 'Livro novo',
    consumed_on: '2026-02-01',
    ...overrides,
  };
}

function ipcError(message: string): Result<never> {
  const errors: ValidationError[] = [{ field: 'ipc', message }];

  return { ok: false, errors };
}

function makeBridge(
  overrides: {
    vault?: Partial<ConsumedBridge['vault']>;
    items?: Partial<ConsumedBridge['items']>;
  } = {},
): ConsumedBridge {
  return {
    vault: {
      choose: async () => ({ ok: true, value: null }),
      current: async () => ({ ok: true, value: null }),
      ...overrides.vault,
    },
    items: {
      list: async () => ({ ok: true, value: [] }),
      get: async () => ({ ok: true, value: null }),
      create: async () => ipcError('não usado'),
      update: async () => ipcError('não usado'),
      delete: async () => ipcError('não usado'),
      importImage: async () => ({ ok: true, value: null }),
      suggestions: async () => ({
        ok: true,
        value: {
          authors: [],
          publishers: [],
          directors: [],
          screenplayBy: [],
          producedBy: [],
          distributedBy: [],
          languages: [],
        },
      }),
      ...overrides.items,
    },
  };
}

function throwingBridge(): ConsumedBridge {
  const fail = async (): Promise<never> => {
    throw new Error('falha');
  };

  return {
    vault: { choose: fail, current: fail },
    items: {
      list: fail,
      get: fail,
      create: fail,
      update: fail,
      delete: fail,
      importImage: fail,
      suggestions: fail,
    },
  };
}

function resolveApi(bridge: ConsumedBridge): Api {
  TestBed.configureTestingModule({
    providers: [{ provide: CONSUMED_BRIDGE, useValue: bridge }],
  });

  return TestBed.inject(Api);
}

type ApiCall = {
  name: string;
  invoke: (api: Api) => Promise<Result<unknown>>;
};

const apiCalls: ApiCall[] = [
  { name: 'chooseVault', invoke: (api) => api.chooseVault() },
  { name: 'currentVault', invoke: (api) => api.currentVault() },
  { name: 'list', invoke: (api) => api.list() },
  { name: 'get', invoke: (api) => api.get('item-1') },
  { name: 'create', invoke: (api) => api.create(itemInput()) },
  { name: 'update', invoke: (api) => api.update('item-1', itemInput()) },
  { name: 'remove', invoke: (api) => api.remove('item-1') },
  { name: 'importImage', invoke: (api) => api.importImage() },
];

describe('Api', () => {
  describe('bridge delegation', () => {
    it('should call vault.choose and return its result', async () => {
      const result: Result<{ path: string } | null> = { ok: true, value: { path: '/tmp/cofre' } };
      const choose = vi.fn(async () => result);
      const api = resolveApi(makeBridge({ vault: { choose } }));

      const actual = await api.chooseVault();

      expect(choose).toHaveBeenCalledTimes(1);
      expect(actual).toBe(result);
    });

    it('should call vault.current and return its result', async () => {
      const result: Result<{ path: string } | null> = { ok: true, value: { path: '/tmp/cofre' } };
      const current = vi.fn(async () => result);
      const api = resolveApi(makeBridge({ vault: { current } }));

      const actual = await api.currentVault();

      expect(current).toHaveBeenCalledTimes(1);
      expect(actual).toBe(result);
    });

    it('should forward the list options and return the bridge result', async () => {
      const options: ListOptions = { type: 'livro', q: 'dom', limit: 10, offset: 5 };
      const result: Result<Item[]> = { ok: true, value: [makeItem()] };
      const list = vi.fn(async (_options?: ListOptions) => result);
      const api = resolveApi(makeBridge({ items: { list } }));

      const actual = await api.list(options);

      expect(list).toHaveBeenCalledWith(options);
      expect(actual).toBe(result);
    });

    it('should forward the id to get and return the bridge result', async () => {
      const result: Result<Item | null> = { ok: true, value: makeItem({ id: 'filme-7' }) };
      const get = vi.fn(async (_id: string) => result);
      const api = resolveApi(makeBridge({ items: { get } }));

      const actual = await api.get('filme-7');

      expect(get).toHaveBeenCalledWith('filme-7');
      expect(actual).toBe(result);
    });

    it('should forward the input to create and return the bridge result', async () => {
      const input = itemInput({ title: 'Dom Casmurro' });
      const result: Result<Item> = { ok: true, value: makeItem({ title: 'Dom Casmurro' }) };
      const create = vi.fn(async (_input: ItemInput) => result);
      const api = resolveApi(makeBridge({ items: { create } }));

      const actual = await api.create(input);

      expect(create).toHaveBeenCalledWith(input);
      expect(actual).toBe(result);
    });

    it('should forward the id and input to update and return the bridge result', async () => {
      const input = itemInput({ title: 'Revisado' });
      const result: Result<Item> = { ok: true, value: makeItem({ title: 'Revisado' }) };
      const update = vi.fn(async (_id: string, _input: ItemInput) => result);
      const api = resolveApi(makeBridge({ items: { update } }));

      const actual = await api.update('livro-1', input);

      expect(update).toHaveBeenCalledWith('livro-1', input);
      expect(actual).toBe(result);
    });

    it('should forward the id to delete and return the bridge result', async () => {
      const result: Result<{ id: string }> = { ok: true, value: { id: 'livro-1' } };
      const remove = vi.fn(async (_id: string) => result);
      const api = resolveApi(makeBridge({ items: { delete: remove } }));

      const actual = await api.remove('livro-1');

      expect(remove).toHaveBeenCalledWith('livro-1');
      expect(actual).toBe(result);
    });

    it('should call importImage and return its result', async () => {
      const result: Result<{ path: string } | null> = { ok: true, value: { path: '/tmp/x.png' } };
      const importImage = vi.fn(async () => result);
      const api = resolveApi(makeBridge({ items: { importImage } }));

      const actual = await api.importImage();

      expect(importImage).toHaveBeenCalledTimes(1);
      expect(actual).toBe(result);
    });
  });

  describe('failure handling', () => {
    it.each(apiCalls)(
      'should return an ipc error when $name rejects with an Error',
      async ({ invoke }) => {
        const api = resolveApi(throwingBridge());

        const result = await invoke(api);

        expect(result).toEqual({ ok: false, errors: [{ field: 'ipc', message: 'falha' }] });
      },
    );

    it('should return the generic message when the bridge rejects with a value without message', async () => {
      const api = resolveApi(
        makeBridge({
          items: {
            list: () => Promise.reject({}),
          },
        }),
      );

      const result = await api.list();

      expect(result).toEqual({
        ok: false,
        errors: [{ field: 'ipc', message: GENERIC_MESSAGE }],
      });
    });
  });

  describe('missingBridge', () => {
    it.each(apiCalls)(
      'should report the missing desktop app when calling $name without window.consumed',
      async ({ invoke }) => {
        const bridge = window.consumed ?? missingBridge;
        const api = resolveApi(bridge);

        const result = await invoke(api);

        expect(result).toEqual({
          ok: false,
          errors: [{ field: 'bridge', message: MISSING_BRIDGE_MESSAGE }],
        });
      },
    );
  });
});
