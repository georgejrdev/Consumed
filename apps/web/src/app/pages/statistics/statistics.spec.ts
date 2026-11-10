import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import type { ConsumedBridge, Item, ListOptions, Result } from '../../core/bridge';
import { CONSUMED_BRIDGE } from '../../core/bridge';
import { Statistics } from './statistics';

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

function notUsed<T>(): Promise<Result<T>> {
  return Promise.resolve({ ok: false, errors: [{ field: 'ipc', message: 'não usado' }] });
}

function bridgeWith(list: ConsumedBridge['items']['list']): ConsumedBridge {
  return {
    vault: {
      current: async () => ({ ok: true, value: null }),
      choose: async () => ({ ok: true, value: null }),
    },
    items: {
      list,
      get: async () => ({ ok: true, value: null }),
      create: () => notUsed<Item>(),
      update: () => notUsed<Item>(),
      delete: () => notUsed<{ id: string }>(),
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
    },
  };
}

async function drainMicrotasks(): Promise<void> {
  for (let index = 0; index < 8; index += 1) {
    await Promise.resolve();
  }
}

async function settle(fixture: ComponentFixture<Statistics>): Promise<void> {
  await fixture.whenStable();
  await drainMicrotasks();
  await fixture.whenStable();
}

async function setup(
  bridge: ConsumedBridge,
  defaultYear = 2026,
): Promise<ComponentFixture<Statistics>> {
  await TestBed.configureTestingModule({
    imports: [Statistics],
    providers: [{ provide: CONSUMED_BRIDGE, useValue: bridge }],
  }).compileComponents();

  const fixture = TestBed.createComponent(Statistics);
  fixture.componentRef.setInput('defaultYear', defaultYear);
  await settle(fixture);

  return fixture;
}

function host(fixture: ComponentFixture<Statistics>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function cardValues(fixture: ComponentFixture<Statistics>): string[] {
  return Array.from(host(fixture).querySelectorAll<HTMLElement>('.card-value')).map((element) =>
    (element.textContent ?? '').trim(),
  );
}

describe('Statistics', () => {
  it('should request only consumed items', async () => {
    const calls: ListOptions[] = [];

    await setup(
      bridgeWith(async (options) => {
        calls.push(options ?? {});
        return { ok: true, value: [] };
      }),
    );

    expect(calls).toContainEqual({ onlyConsumed: true });
  });

  it('should list both years and start on the current year', async () => {
    const items = [
      makeItem({ id: 'v2026', consumed_on: '2026-01-05' }),
      makeItem({ id: 'v2025', consumed_on: '2025-12-31' }),
    ];
    const fixture = await setup(
      bridgeWith(async () => ({ ok: true, value: items })),
      2026,
    );
    const select = host(fixture).querySelector<HTMLSelectElement>('select');

    expect(select).not.toBeNull();
    expect(select?.value).toBe('2026');

    const options = Array.from(host(fixture).querySelectorAll<HTMLOptionElement>('option'));

    expect(options.map((option) => option.textContent?.trim())).toEqual(['2026', '2025']);
    expect(host(fixture).textContent).toContain('ESTATÍSTICAS');
  });

  it('should show the calculated values in the cards', async () => {
    const items = [
      makeItem({ id: 'a', type: 'filme', consumed_on: '2026-01-05', rating: 8 }),
      makeItem({
        id: 'b',
        type: 'livro',
        consumed_on: '2026-01-20',
        pages: 100,
        rating: 9,
        publisher: 'Alpha',
      }),
      makeItem({
        id: 'c',
        type: 'livro',
        consumed_on: '2026-02-10',
        pages: 50,
        rating: 9,
        publisher: 'Beta',
      }),
      makeItem({
        id: 'd',
        type: 'livro',
        consumed_on: '2026-03-01',
        publisher: 'Alpha',
      }),
    ];
    const fixture = await setup(
      bridgeWith(async () => ({ ok: true, value: items })),
      2026,
    );

    expect(cardValues(fixture)).toEqual(['4', '150', '8,7', 'Alpha']);
    expect(host(fixture).querySelectorAll('.bar')).toHaveLength(3);
    expect(host(fixture).querySelector('.chart')?.getAttribute('aria-label')).toContain(
      'Itens por mês em 2026',
    );
  });

  it('should show the empty state when there are no items', async () => {
    const fixture = await setup(bridgeWith(async () => ({ ok: true, value: [] })));

    expect(host(fixture).textContent).toContain('Nenhum dado registrado ainda.');
    expect(host(fixture).querySelector('.cards')).toBeNull();
    expect(host(fixture).querySelector('.chart')).toBeNull();
  });

  it('should show the IPC error message when loading fails', async () => {
    const fixture = await setup(
      bridgeWith(async () => ({
        ok: false,
        errors: [{ field: 'ipc', message: 'Falha ao carregar as estatísticas.' }],
      })),
    );

    expect(host(fixture).textContent).toContain('Falha ao carregar as estatísticas.');
    expect(host(fixture).querySelector('[role="alert"]')).not.toBeNull();
  });
});
