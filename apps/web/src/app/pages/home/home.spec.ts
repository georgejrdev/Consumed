import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { ComponentFixture } from '@angular/core/testing';
import type { ConsumedBridge, Item, ListOptions, MediaType, Result } from '../../core/bridge';
import { CONSUMED_BRIDGE } from '../../core/bridge';
import { Home } from './home';

function makeItem(id: string, type: MediaType, title: string): Item {
  return {
    id,
    type,
    title,
    consumed_on: '2024-01-01',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  };
}

function notUsed<T>(): Promise<Result<T>> {
  return Promise.resolve({ ok: false, errors: [{ field: 'ipc', message: 'não usado' }] });
}

function bridgeWithList(list: ConsumedBridge['items']['list']): ConsumedBridge {
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

async function setup(bridge: ConsumedBridge): Promise<ComponentFixture<Home>> {
  await TestBed.configureTestingModule({
    imports: [Home],
    providers: [provideRouter([]), { provide: CONSUMED_BRIDGE, useValue: bridge }],
  }).compileComponents();

  const fixture = TestBed.createComponent(Home);
  await fixture.whenStable();

  return fixture;
}

function host(fixture: ComponentFixture<Home>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function cardCount(fixture: ComponentFixture<Home>, shelfIndex: number): number {
  const shelves = Array.from(host(fixture).querySelectorAll<HTMLElement>('.shelf'));

  return shelves[shelfIndex]?.querySelectorAll('app-item-card').length ?? 0;
}

describe('Home', () => {
  it('should render at most five cards per section when the API returns items', async () => {
    const films = Array.from({ length: 6 }, (_, index) =>
      makeItem(`filme-${index}`, 'filme', `Filme ${index}`),
    );
    const books = Array.from({ length: 3 }, (_, index) =>
      makeItem(`livro-${index}`, 'livro', `Livro ${index}`),
    );
    const calls: ListOptions[] = [];

    const fixture = await setup(
      bridgeWithList(async (options) => {
        calls.push(options ?? {});
        return { ok: true, value: options?.type === 'filme' ? films : books };
      }),
    );

    expect(cardCount(fixture, 0)).toBe(5);
    expect(cardCount(fixture, 1)).toBe(3);
    expect(calls).toContainEqual({ type: 'filme', limit: 5 });
    expect(calls).toContainEqual({ type: 'livro', limit: 5, onlyConsumed: true });
  });

  it('should show empty messages when both sections have no items', async () => {
    const fixture = await setup(bridgeWithList(async () => ({ ok: true, value: [] })));

    expect(host(fixture).textContent).toContain('Nenhum filme registrado ainda.');
    expect(host(fixture).textContent).toContain('Nenhum livro registrado ainda.');
    expect(cardCount(fixture, 0)).toBe(0);
    expect(cardCount(fixture, 1)).toBe(0);
  });

  it('should show the error of one section without breaking the other', async () => {
    const fixture = await setup(
      bridgeWithList(async (options) =>
        options?.type === 'filme'
          ? { ok: false, errors: [{ field: 'ipc', message: 'Falha ao carregar filmes.' }] }
          : { ok: true, value: [makeItem('livro-1', 'livro', 'Livro')] },
      ),
    );

    expect(host(fixture).textContent).toContain('Falha ao carregar filmes.');
    expect(cardCount(fixture, 0)).toBe(0);
    expect(cardCount(fixture, 1)).toBe(1);
  });

  it('should open the new item dialog when the add button is clicked', async () => {
    const fixture = await setup(bridgeWithList(async () => ({ ok: true, value: [] })));
    const button = host(fixture).querySelector<HTMLButtonElement>('button.add');

    expect(button).not.toBeNull();
    button?.click();
    await fixture.whenStable();

    expect(host(fixture).querySelector('dialog')).not.toBeNull();
    expect(host(fixture).textContent).toContain('Novo item');
  });
});
