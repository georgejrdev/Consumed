import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import type { ComponentFixture } from '@angular/core/testing';
import { vi } from 'vitest';
import type { ConsumedBridge, Item, ItemInput, Result } from '../../core/bridge';
import { CONSUMED_BRIDGE } from '../../core/bridge';
import { Detail } from './detail';

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'item-1',
    type: 'filme',
    title: 'Item de teste',
    consumed_on: '2024-05-01',
    created_at: '2024-05-01T00:00:00.000Z',
    updated_at: '2024-05-01T00:00:00.000Z',
    ...overrides,
  };
}

function notUsed<T>(): Promise<Result<T>> {
  return Promise.resolve({ ok: false, errors: [{ field: 'ipc', message: 'não usado' }] });
}

function bridgeWith(items: Partial<ConsumedBridge['items']> = {}): ConsumedBridge {
  return {
    vault: {
      current: async () => ({ ok: true, value: null }),
      choose: async () => ({ ok: true, value: null }),
    },
    items: {
      list: async () => ({ ok: true, value: [] }),
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
      ...items,
    },
  };
}

const dialogPrototype = HTMLDialogElement.prototype as unknown as Record<string, unknown>;

function installDialogStubs(): void {
  dialogPrototype['showModal'] = function showModal(this: HTMLDialogElement): void {
    this.setAttribute('open', '');
  };
  dialogPrototype['close'] = function close(this: HTMLDialogElement): void {
    this.removeAttribute('open');
  };
}

function removeDialogStubs(): void {
  delete dialogPrototype['showModal'];
  delete dialogPrototype['close'];
}

async function drainMicrotasks(): Promise<void> {
  for (let index = 0; index < 8; index += 1) {
    await Promise.resolve();
  }
}

async function settle(fixture: ComponentFixture<Detail>): Promise<void> {
  await fixture.whenStable();
  await drainMicrotasks();
  await fixture.whenStable();
}

async function setup(bridge: ConsumedBridge, id = 'item-1'): Promise<ComponentFixture<Detail>> {
  await TestBed.configureTestingModule({
    imports: [Detail],
    providers: [provideRouter([]), { provide: CONSUMED_BRIDGE, useValue: bridge }],
  }).compileComponents();

  const fixture = TestBed.createComponent(Detail);
  fixture.componentRef.setInput('id', id);
  await settle(fixture);

  return fixture;
}

function host(fixture: ComponentFixture<Detail>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function actionButton(fixture: ComponentFixture<Detail>, text: string): HTMLButtonElement {
  const buttons = Array.from(host(fixture).querySelectorAll<HTMLButtonElement>('.actions button'));
  const found = buttons.find((element) => (element.textContent ?? '').trim() === text);

  if (found === undefined) {
    throw new Error(`Botão de ação não encontrado: ${text}`);
  }

  return found;
}

async function clickAction(fixture: ComponentFixture<Detail>, text: string): Promise<void> {
  actionButton(fixture, text).click();
  await settle(fixture);
}

function confirmDialog(fixture: ComponentFixture<Detail>): HTMLDialogElement {
  const dialog = host(fixture).querySelector<HTMLDialogElement>('dialog.confirm');

  if (dialog === null) {
    throw new Error('Diálogo de confirmação não encontrado.');
  }

  return dialog;
}

function setInputValue(fixture: ComponentFixture<Detail>, selector: string, value: string): void {
  const element = host(fixture).querySelector<HTMLInputElement>(selector);

  if (element === null) {
    throw new Error(`Campo não encontrado: ${selector}`);
  }

  element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

function dispatchSubmit(fixture: ComponentFixture<Detail>): void {
  const form = host(fixture).querySelector('app-item-form-dialog form');

  if (form === null) {
    throw new Error('Formulário de edição não encontrado.');
  }

  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

describe('Detail', () => {
  beforeEach(() => {
    installDialogStubs();
  });

  afterEach(() => {
    removeDialogStubs();
  });

  it('should render a complete film with title, metadata and rating', async () => {
    const item = makeItem({
      type: 'filme',
      title: 'Blade Runner',
      year: 1982,
      rating: 8,
      runtime_min: 130,
      director: 'Ridley Scott',
      screenplay_by: ['Hampton Fancher'],
      produced_by: ['Michael Deeley'],
      distributed_by: ['Warner Bros.'],
      language: 'Inglês',
      notes: 'Clássico absoluto.',
      consumed_on: '2024-05-01',
    });
    const fixture = await setup(bridgeWith({ get: async () => ({ ok: true, value: item }) }));
    const text = host(fixture).textContent ?? '';

    expect(text).toContain('Blade Runner');
    expect(text).toContain('Ano:');
    expect(text).toContain('1982');
    expect(text).toContain('Duração:');
    expect(text).toContain('2 h 10 min');
    expect(text).toContain('Direção:');
    expect(text).toContain('Ridley Scott');
    expect(text).toContain('Roteiro:');
    expect(text).toContain('Hampton Fancher');
    expect(text).toContain('Produção:');
    expect(text).toContain('Michael Deeley');
    expect(text).toContain('Distribuição:');
    expect(text).toContain('Warner Bros.');
    expect(text).toContain('Idioma:');
    expect(text).toContain('Inglês');
    expect(text).toContain('Assistido em:');
    expect(text).toContain('01/05/2024');
    expect(text).toContain('Clássico absoluto.');
    expect(host(fixture).querySelector('.rating')?.textContent).toContain('8');
  });

  it('should render a BC year with the a.C. suffix', async () => {
    const item = makeItem({
      type: 'livro',
      title: 'A República',
      year: -380,
      consumed_on: '2024-02-20',
    });
    const fixture = await setup(bridgeWith({ get: async () => ({ ok: true, value: item }) }));
    const text = host(fixture).textContent ?? '';

    expect(text).toContain('Ano:');
    expect(text).toContain('380 a.C.');
    expect(text).not.toContain('-380');
  });

  it('should render every label of a complete book', async () => {
    const item = makeItem({
      type: 'livro',
      title: 'Livro completo',
      year: 2019,
      rating: 9,
      author: ['Autora Completa'],
      publisher: 'Editora Central',
      pages: 320,
      language: 'Português',
      isbn: '978-85-0000-000-0',
      started_on: '2024-01-10',
      finished_on: '2024-02-20',
      notes: 'Leitura proveitosa.',
      consumed_on: '2024-02-20',
    });
    const fixture = await setup(bridgeWith({ get: async () => ({ ok: true, value: item }) }));
    const text = host(fixture).textContent ?? '';

    expect(text).toContain('Ano:');
    expect(text).toContain('2019');
    expect(text).toContain('Autor:');
    expect(text).toContain('Autora Completa');
    expect(text).toContain('Editora:');
    expect(text).toContain('Editora Central');
    expect(text).toContain('Páginas:');
    expect(text).toContain('320');
    expect(text).toContain('Idioma:');
    expect(text).toContain('Português');
    expect(text).toContain('ISBN:');
    expect(text).toContain('978-85-0000-000-0');
    expect(text).not.toContain('Lido em:');
    expect(text).toContain('20/02/2024');
    expect(text).toContain('Início da leitura:');
    expect(text).toContain('10/01/2024');
    expect(text).toContain('Fim da leitura:');
    expect(text).toContain('Leitura proveitosa.');
  });

  it('should omit empty labels for a book without optional fields', async () => {
    const item = makeItem({
      type: 'livro',
      title: 'Livro sem extras',
      consumed_on: '2024-02-03',
    });
    const fixture = await setup(bridgeWith({ get: async () => ({ ok: true, value: item }) }));
    const text = host(fixture).textContent ?? '';

    expect(text).toContain('Livro sem extras');
    expect(text).not.toContain('Lido em:');
    expect(text).not.toContain('03/02/2024');

    expect(text).not.toContain('Autor:');
    expect(text).not.toContain('Editora:');
    expect(text).not.toContain('Páginas:');
    expect(text).not.toContain('Idioma:');
    expect(text).not.toContain('ISBN:');
    expect(text).not.toContain('null');
    expect(text).not.toContain('undefined');
    expect(host(fixture).querySelector('.rating')?.textContent).toContain('—');
  });

  it('should not show a year row when the item has no year', async () => {
    const item = makeItem({ title: 'Sem ano', year: undefined });
    const fixture = await setup(bridgeWith({ get: async () => ({ ok: true, value: item }) }));

    expect(host(fixture).querySelector('h1')?.textContent).toContain('Sem ano');
    expect(host(fixture).textContent).not.toContain('Ano:');
  });

  it.each([
    { rating: 0, tone: 'low' },
    { rating: 2, tone: 'low' },
    { rating: 3, tone: 'medium' },
    { rating: 5, tone: 'medium' },
    { rating: 6, tone: 'high' },
    { rating: 8, tone: 'high' },
    { rating: 9, tone: 'top' },
    { rating: 10, tone: 'top' },
  ])('should use the $tone tone for rating $rating', async ({ rating, tone }) => {
    const item = makeItem({ rating });
    const fixture = await setup(bridgeWith({ get: async () => ({ ok: true, value: item }) }));
    const block = host(fixture).querySelector('.rating');

    expect(block?.classList.contains(`rating-${tone}`)).toBe(true);
  });

  it('should use the neutral tone when the item has no rating', async () => {
    const item = makeItem({ rating: undefined });
    const fixture = await setup(bridgeWith({ get: async () => ({ ok: true, value: item }) }));
    const block = host(fixture).querySelector('.rating');

    expect(block?.classList.contains('rating-low')).toBe(false);
    expect(block?.classList.contains('rating-medium')).toBe(false);
    expect(block?.classList.contains('rating-high')).toBe(false);
    expect(block?.classList.contains('rating-top')).toBe(false);
  });

  it('should render the cover image and fall back to the placeholder when it fails', async () => {
    const item = makeItem({ title: 'Com capa', image_path: 'imagens/capa.png' });
    const fixture = await setup(bridgeWith({ get: async () => ({ ok: true, value: item }) }));
    const cover = host(fixture).querySelector<HTMLImageElement>('.cover img');

    expect(cover?.getAttribute('src')).toBe('media://vault/capa.png');
    expect(cover?.getAttribute('alt')).toBe('Capa de Com capa');

    cover?.dispatchEvent(new Event('error'));
    await settle(fixture);

    expect(host(fixture).querySelector('.cover img')).toBeNull();
    expect(host(fixture).querySelector('.cover .placeholder')?.textContent).toContain('C');
  });

  it('should show a not found message when the API returns null', async () => {
    const fixture = await setup(bridgeWith({ get: async () => ({ ok: true, value: null }) }));

    expect(host(fixture).textContent).toContain('Item não encontrado.');
  });

  it('should offer a back button when the item is not found', async () => {
    const fixture = await setup(bridgeWith({ get: async () => ({ ok: true, value: null }) }));
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    expect(host(fixture).textContent).toContain('Item não encontrado.');

    await clickAction(fixture, 'Voltar');

    expect(navigate).toHaveBeenCalledWith(['/films']);
  });

  it('should show the IPC error message when loading fails', async () => {
    const fixture = await setup(
      bridgeWith({
        get: async () => ({
          ok: false,
          errors: [{ field: 'input', message: 'Item inválido.' }],
        }),
      }),
    );

    expect(host(fixture).textContent).toContain('Item inválido.');
  });

  it('should use the default load message when get fails without errors', async () => {
    const fixture = await setup(bridgeWith({ get: async () => ({ ok: false, errors: [] }) }));

    expect(host(fixture).textContent).toContain('Não foi possível carregar o item.');
  });

  it('should update the item through the edit dialog and reload the detail', async () => {
    let stored = makeItem({ id: 'filme-9', title: 'Título antigo' });
    const get = vi.fn(async () => ({ ok: true as const, value: stored }));
    const update = vi.fn(async (id: string, input: ItemInput) => {
      stored = { ...stored, ...input };
      return { ok: true as const, value: stored };
    });
    const fixture = await setup(bridgeWith({ get, update }), 'filme-9');

    await clickAction(fixture, 'Editar');

    expect(host(fixture).querySelector('app-item-form-dialog')).not.toBeNull();

    setInputValue(fixture, '#item-title', 'Título novo');
    dispatchSubmit(fixture);
    await settle(fixture);

    expect(update).toHaveBeenCalledWith(
      'filme-9',
      expect.objectContaining({ title: 'Título novo' }),
    );
    expect(get).toHaveBeenCalledTimes(2);
    expect(host(fixture).querySelector('h1')?.textContent).toContain('Título novo');
  });

  it('should call remove with the item id when the deletion is confirmed', async () => {
    const remove = vi.fn(async (id: string) => ({ ok: true as const, value: { id } }));
    const fixture = await setup(
      bridgeWith({
        get: async () => ({ ok: true, value: makeItem({ id: 'filme-9' }) }),
        delete: remove,
      }),
    );
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    await clickAction(fixture, 'Excluir');

    expect(host(fixture).querySelector('dialog.confirm')).not.toBeNull();
    expect(host(fixture).textContent).toContain(
      'Excluir "Item de teste"? Essa ação não pode ser desfeita.',
    );

    confirmDialog(fixture).querySelector<HTMLButtonElement>('button.danger')?.click();
    await settle(fixture);

    expect(remove).toHaveBeenCalledWith('filme-9');
    expect(navigate).toHaveBeenCalledWith(['/films']);
  });

  it('should keep the confirmation open and show the error when deletion fails', async () => {
    const remove = vi.fn(async () => ({
      ok: false as const,
      errors: [{ field: 'ipc', message: 'Não foi possível excluir agora.' }],
    }));
    const fixture = await setup(
      bridgeWith({
        get: async () => ({ ok: true, value: makeItem() }),
        delete: remove,
      }),
    );
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    await clickAction(fixture, 'Excluir');

    const dialog = confirmDialog(fixture);

    expect(dialog.hasAttribute('open')).toBe(true);

    dialog.querySelector<HTMLButtonElement>('button.danger')?.click();
    await settle(fixture);

    expect(remove).toHaveBeenCalledTimes(1);
    expect(dialog.hasAttribute('open')).toBe(true);
    expect(host(fixture).querySelector('.confirm-error')?.textContent).toContain(
      'Não foi possível excluir agora.',
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it('should use the default delete message when remove fails without errors', async () => {
    const fixture = await setup(
      bridgeWith({
        get: async () => ({ ok: true, value: makeItem() }),
        delete: async () => ({ ok: false as const, errors: [] }),
      }),
    );

    await clickAction(fixture, 'Excluir');
    confirmDialog(fixture).querySelector<HTMLButtonElement>('button.danger')?.click();
    await settle(fixture);

    expect(host(fixture).querySelector('.confirm-error')?.textContent).toContain(
      'Não foi possível excluir o item.',
    );
  });

  it('should close the confirmation without removing when it is cancelled', async () => {
    const remove = vi.fn(async (id: string) => ({ ok: true as const, value: { id } }));
    const fixture = await setup(
      bridgeWith({
        get: async () => ({ ok: true, value: makeItem() }),
        delete: remove,
      }),
    );

    await clickAction(fixture, 'Excluir');

    const dialog = confirmDialog(fixture);

    expect(dialog.hasAttribute('open')).toBe(true);

    dialog.querySelector<HTMLButtonElement>('button.secondary')?.click();
    await settle(fixture);

    expect(dialog.hasAttribute('open')).toBe(false);
    expect(remove).not.toHaveBeenCalled();
  });

  it('should render notes as a full-width block below the cover and info row', async () => {
    const item = makeItem({
      type: 'livro',
      title: 'Com observações',
      notes: 'Bloco separado.',
      consumed_on: '2024-01-01',
    });
    const fixture = await setup(bridgeWith({ get: async () => ({ ok: true, value: item }) }));

    const main = host(fixture).querySelector('.detail > .main');
    const notes = host(fixture).querySelector('.detail > .notes');

    expect(main).not.toBeNull();
    expect(main?.querySelector('.notes')).toBeNull();
    expect(notes?.textContent).toContain('Bloco separado.');
  });

  it.each(['nao_lido', 'lendo'] as const)(
    'should mark the cover with the %s status class',
    async (status) => {
      const item = makeItem({ type: 'livro', title: 'Capa', reading_status: status });
      const fixture = await setup(bridgeWith({ get: async () => ({ ok: true, value: item }) }));
      const cssClass = status === 'nao_lido' ? 'nao-lido' : 'lendo';

      expect(host(fixture).querySelector('.cover')?.classList.contains(cssClass)).toBe(true);
    },
  );

  it('should not mark the cover of a read book', async () => {
    const item = makeItem({ type: 'livro', title: 'Capa', reading_status: 'lido' });
    const fixture = await setup(bridgeWith({ get: async () => ({ ok: true, value: item }) }));
    const cover = host(fixture).querySelector('.cover');

    expect(cover?.classList.contains('nao-lido')).toBe(false);
    expect(cover?.classList.contains('lendo')).toBe(false);
  });
});
