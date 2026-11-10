import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { ComponentFixture } from '@angular/core/testing';
import type { ConsumedBridge, Item, ListOptions, MediaType, Result } from '../../core/bridge';
import { CONSUMED_BRIDGE } from '../../core/bridge';
import { Library } from './library';

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

async function drainMicrotasks(): Promise<void> {
  for (let index = 0; index < 8; index += 1) {
    await Promise.resolve();
  }
}

async function settle(fixture: ComponentFixture<Library>): Promise<void> {
  await fixture.whenStable();
  await drainMicrotasks();
  await fixture.whenStable();
}

async function setup(
  bridge: ConsumedBridge,
  type: MediaType = 'filme',
): Promise<ComponentFixture<Library>> {
  await TestBed.configureTestingModule({
    imports: [Library],
    providers: [provideRouter([]), { provide: CONSUMED_BRIDGE, useValue: bridge }],
  }).compileComponents();

  const fixture = TestBed.createComponent(Library);
  fixture.componentRef.setInput('type', type);
  await settle(fixture);

  return fixture;
}

function host(fixture: ComponentFixture<Library>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

describe('Library', () => {
  it('should list only the received type when the API returns both kinds', async () => {
    const calls: ListOptions[] = [];
    const film = makeItem('filme-1', 'filme', 'Filme selecionado');
    const book = makeItem('livro-1', 'livro', 'Livro descartado');

    const fixture = await setup(
      bridgeWithList(async (options) => {
        calls.push(options ?? {});
        return { ok: true, value: options?.type === 'filme' ? [film] : [book] };
      }),
      'filme',
    );

    expect(host(fixture).textContent).toContain('FILMES');
    expect(host(fixture).textContent).toContain('Filme selecionado');
    expect(host(fixture).textContent).not.toContain('Livro descartado');
    expect(host(fixture).querySelectorAll('app-item-card')).toHaveLength(1);
    expect(calls[0]).toEqual({ type: 'filme' });
  });

  it('should call list with type and q when the user types in the search field', async () => {
    const calls: ListOptions[] = [];
    const fixture = await setup(
      bridgeWithList(async (options) => {
        calls.push(options ?? {});
        return { ok: true, value: [] };
      }),
    );

    const input = host(fixture).querySelector<HTMLInputElement>('input[type="search"]');

    expect(input).not.toBeNull();
    if (input !== null) {
      input.value = 'ilha';
      input.dispatchEvent(new Event('input'));
    }
    await settle(fixture);

    expect(calls).toContainEqual({ type: 'filme', q: 'ilha' });
  });

  it('should show an explicit empty state with the search term when nothing matches', async () => {
    const fixture = await setup(bridgeWithList(async () => ({ ok: true, value: [] })));

    expect(host(fixture).textContent).toContain('Nenhum item encontrado.');

    const input = host(fixture).querySelector<HTMLInputElement>('input[type="search"]');

    if (input !== null) {
      input.value = 'inexistente';
      input.dispatchEvent(new Event('input'));
    }
    await settle(fixture);

    expect(host(fixture).textContent).toContain('Nenhum resultado para "inexistente".');
  });

  it('should open the new item dialog when the add button is clicked', async () => {
    const fixture = await setup(bridgeWithList(async () => ({ ok: true, value: [] })));
    const button = host(fixture).querySelector<HTMLButtonElement>('button.add');

    expect(button).not.toBeNull();
    button?.click();
    await settle(fixture);

    expect(host(fixture).querySelector('dialog')).not.toBeNull();
    expect(host(fixture).textContent).toContain('Novo item');
  });
});
