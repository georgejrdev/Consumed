import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { ComponentFixture } from '@angular/core/testing';
import { vi } from 'vitest';
import type { ConsumedBridge, Item, ItemInput, MediaType, Result } from '../../core/bridge';
import { CONSUMED_BRIDGE } from '../../core/bridge';
import { ItemFormDialog } from './item-form-dialog';

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'livro-1',
    type: 'livro',
    title: 'Livro existente',
    consumed_on: '2024-01-02',
    author: ['Autora'],
    created_at: '2024-01-02T00:00:00.000Z',
    updated_at: '2024-01-02T00:00:00.000Z',
    ...overrides,
  };
}

function itemFromInput(input: ItemInput): Item {
  return {
    consumed_on: '2024-01-02',
    ...input,
    id: 'novo-item',
    created_at: '2024-01-02T00:00:00.000Z',
    updated_at: '2024-01-02T00:00:00.000Z',
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

async function settle(fixture: ComponentFixture<ItemFormDialog>): Promise<void> {
  await fixture.whenStable();
  await drainMicrotasks();
  await fixture.whenStable();
}

async function setup(
  bridge: ConsumedBridge,
  item: Item | null,
  defaultType?: MediaType,
): Promise<ComponentFixture<ItemFormDialog>> {
  await TestBed.configureTestingModule({
    imports: [ItemFormDialog],
    providers: [provideRouter([]), { provide: CONSUMED_BRIDGE, useValue: bridge }],
  }).compileComponents();

  const fixture = TestBed.createComponent(ItemFormDialog);
  fixture.componentRef.setInput('item', item);

  if (defaultType !== undefined) {
    fixture.componentRef.setInput('defaultType', defaultType);
  }

  await settle(fixture);

  return fixture;
}

function host(fixture: ComponentFixture<ItemFormDialog>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function setInputValue(
  fixture: ComponentFixture<ItemFormDialog>,
  selector: string,
  value: string,
): void {
  const element = host(fixture).querySelector<HTMLInputElement>(selector);

  if (element === null) {
    throw new Error(`Campo não encontrado: ${selector}`);
  }

  element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

function addTag(fixture: ComponentFixture<ItemFormDialog>, selector: string, value: string): void {
  setInputValue(fixture, selector, value);
  const element = host(fixture).querySelector<HTMLInputElement>(selector);

  if (element === null) {
    throw new Error(`Campo não encontrado: ${selector}`);
  }

  element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
}

function setSelectValue(
  fixture: ComponentFixture<ItemFormDialog>,
  selector: string,
  value: string,
): void {
  const element = host(fixture).querySelector<HTMLSelectElement>(selector);

  if (element === null) {
    throw new Error(`Select não encontrado: ${selector}`);
  }

  element.value = value;
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

function button(fixture: ComponentFixture<ItemFormDialog>, text: string): HTMLButtonElement {
  const buttons = Array.from(host(fixture).querySelectorAll('button'));
  const found = buttons.find((element) => (element.textContent ?? '').includes(text));

  if (found === undefined) {
    throw new Error(`Botão não encontrado: ${text}`);
  }

  return found;
}

async function clickButton(fixture: ComponentFixture<ItemFormDialog>, text: string): Promise<void> {
  button(fixture, text).click();
  await settle(fixture);
}

function previewImage(fixture: ComponentFixture<ItemFormDialog>): HTMLImageElement | null {
  return host(fixture).querySelector<HTMLImageElement>('img.preview');
}

function dispatchSubmit(fixture: ComponentFixture<ItemFormDialog>): void {
  const form = host(fixture).querySelector('form');

  if (form === null) {
    throw new Error('Formulário não encontrado.');
  }

  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

async function submit(fixture: ComponentFixture<ItemFormDialog>): Promise<void> {
  dispatchSubmit(fixture);
  await settle(fixture);
}

describe('ItemFormDialog', () => {
  beforeEach(() => {
    installDialogStubs();
  });

  afterEach(() => {
    removeDialogStubs();
  });

  it('should create an item when the form is submitted with title and date', async () => {
    const calls: ItemInput[] = [];
    const bridge = bridgeWith({
      create: async (input) => {
        calls.push(input);
        return { ok: true, value: itemFromInput(input) };
      },
    });
    const fixture = await setup(bridge, null);
    const saved = vi.fn();
    fixture.componentInstance.saved.subscribe(saved);

    setInputValue(fixture, '#item-title', 'Meu filme');
    setInputValue(fixture, '#item-consumed-on', '2024-05-01');
    await submit(fixture);

    expect(calls[0]).toEqual({
      type: 'filme',
      title: 'Meu filme',
      consumed_on: '2024-05-01',
    });
    expect(saved).toHaveBeenCalledTimes(1);
  });

  it('should send a negative year as a BC date', async () => {
    const calls: ItemInput[] = [];
    const bridge = bridgeWith({
      create: async (input) => {
        calls.push(input);
        return { ok: true, value: itemFromInput(input) };
      },
    });
    const fixture = await setup(bridge, null);

    setInputValue(fixture, '#item-title', 'A República');
    setInputValue(fixture, '#item-consumed-on', '2024-05-01');
    setInputValue(fixture, '#item-year', '-380');
    await submit(fixture);

    expect(calls[0]?.year).toBe(-380);
    expect(host(fixture).textContent).toContain('anos a.C.');
  });

  it('should show an IPC validation error and not emit saved when creation fails', async () => {
    const bridge = bridgeWith({
      create: async () => ({
        ok: false,
        errors: [
          {
            field: 'rating',
            message: 'A nota deve ser um número inteiro entre 0 e 10.',
          },
        ],
      }),
    });
    const fixture = await setup(bridge, null);
    const saved = vi.fn();
    fixture.componentInstance.saved.subscribe(saved);

    setInputValue(fixture, '#item-title', 'Filme inválido');
    await submit(fixture);

    expect(host(fixture).textContent).toContain('A nota deve ser um número inteiro entre 0 e 10.');
    expect(saved).not.toHaveBeenCalled();
  });

  it('should fill the fields and call update when editing an existing item', async () => {
    const calls: Array<{ id: string; input: ItemInput }> = [];
    const bridge = bridgeWith({
      update: async (id, input) => {
        calls.push({ id, input });
        return { ok: true, value: itemFromInput(input) };
      },
    });
    const fixture = await setup(bridge, makeItem());

    expect(host(fixture).querySelector<HTMLInputElement>('#item-title')?.value).toBe(
      'Livro existente',
    );
    expect(
      host(fixture).querySelector('#item-author')?.closest('.tag-field')?.textContent,
    ).toContain('Autora');
    expect(host(fixture).textContent).toContain('Editar item');

    await submit(fixture);

    expect(calls[0]?.id).toBe('livro-1');
    expect(calls[0]?.input.title).toBe('Livro existente');
    expect(calls[0]?.input.type).toBe('livro');
  });

  it('should show film fields for filme and hide them for livro', async () => {
    const fixture = await setup(bridgeWith(), null);

    expect(host(fixture).querySelector('#item-director')).not.toBeNull();
    expect(host(fixture).querySelector('#item-author')).toBeNull();

    setSelectValue(fixture, '#item-type', 'livro');
    await settle(fixture);

    expect(host(fixture).querySelector('#item-author')).not.toBeNull();
    expect(host(fixture).querySelector('#item-director')).toBeNull();
  });

  it('should only send the fields of the selected type when the type changes', async () => {
    const calls: ItemInput[] = [];
    const bridge = bridgeWith({
      create: async (input) => {
        calls.push(input);
        return { ok: true, value: itemFromInput(input) };
      },
    });
    const fixture = await setup(bridge, null);

    setInputValue(fixture, '#item-title', 'Obra trocada');
    setInputValue(fixture, '#item-director', 'Direção descartada');

    setSelectValue(fixture, '#item-type', 'livro');
    await settle(fixture);

    addTag(fixture, '#item-author', 'Autora escolhida');
    await settle(fixture);
    await submit(fixture);

    expect(calls[0]?.type).toBe('livro');
    expect(calls[0]?.author).toEqual(['Autora escolhida']);
    expect(calls[0]?.director).toBeUndefined();
  });

  it('should start with the default type when it is a book', async () => {
    const fixture = await setup(bridgeWith(), null, 'livro');

    expect(host(fixture).querySelector<HTMLSelectElement>('#item-type')?.value).toBe('livro');
    expect(host(fixture).querySelector('#item-author')).not.toBeNull();
    expect(host(fixture).querySelector('#item-director')).toBeNull();
  });

  it('should preview a chosen image and drop image_path when it is removed', async () => {
    const calls: ItemInput[] = [];
    const bridge = bridgeWith({
      importImage: async () => ({ ok: true, value: { path: 'imagens/foto.png' } }),
      create: async (input) => {
        calls.push(input);
        return { ok: true, value: itemFromInput(input) };
      },
    });
    const fixture = await setup(bridge, null);

    await clickButton(fixture, 'Escolher imagem');

    expect(previewImage(fixture)?.getAttribute('src')).toBe('media://vault/foto.png');
    expect(host(fixture).textContent).toContain('Remover imagem');

    await clickButton(fixture, 'Remover imagem');

    expect(previewImage(fixture)).toBeNull();
    expect(host(fixture).textContent).toContain('Nenhuma imagem selecionada.');

    setInputValue(fixture, '#item-title', 'Com imagem');
    await submit(fixture);

    expect(calls[0]?.image_path).toBeUndefined();
  });

  it('should keep the form unchanged when the image selection is cancelled', async () => {
    const importImage = vi.fn(async () => ({ ok: true as const, value: null }));
    const fixture = await setup(bridgeWith({ importImage }), null);

    await clickButton(fixture, 'Escolher imagem');

    expect(importImage).toHaveBeenCalledTimes(1);
    expect(previewImage(fixture)).toBeNull();
    expect(host(fixture).textContent).toContain('Nenhuma imagem selecionada.');
    expect(host(fixture).textContent).not.toContain('Não foi possível escolher a imagem.');
  });

  it('should show the IPC message when choosing an image fails', async () => {
    const bridge = bridgeWith({
      importImage: async () => ({
        ok: false,
        errors: [{ field: 'image_path', message: 'Seletor de arquivos indisponível.' }],
      }),
    });
    const fixture = await setup(bridge, null);

    await clickButton(fixture, 'Escolher imagem');

    expect(host(fixture).querySelector('#item-image-error')?.textContent).toContain(
      'Seletor de arquivos indisponível.',
    );
    expect(previewImage(fixture)).toBeNull();
  });

  it('should show the default message when choosing an image fails without errors', async () => {
    const bridge = bridgeWith({ importImage: async () => ({ ok: false, errors: [] }) });
    const fixture = await setup(bridge, null);

    await clickButton(fixture, 'Escolher imagem');

    expect(host(fixture).querySelector('#item-image-error')?.textContent).toContain(
      'Não foi possível escolher a imagem.',
    );
    expect(previewImage(fixture)).toBeNull();
  });

  it('should fall back to a placeholder when the preview image fails to load', async () => {
    const bridge = bridgeWith({
      importImage: async () => ({ ok: true, value: { path: 'imagens/quebrada.png' } }),
    });
    const fixture = await setup(bridge, null);

    await clickButton(fixture, 'Escolher imagem');

    const preview = previewImage(fixture);

    expect(preview).not.toBeNull();

    preview?.dispatchEvent(new Event('error'));
    await settle(fixture);

    expect(previewImage(fixture)).toBeNull();
    expect(host(fixture).textContent).toContain('Não foi possível exibir a imagem.');
  });

  it('should preview the image of an existing item when it opens', async () => {
    const fixture = await setup(bridgeWith(), makeItem({ image_path: 'imagens/capa.png' }));

    expect(previewImage(fixture)?.getAttribute('src')).toBe('media://vault/capa.png');
  });

  it('should disable the save button while saving and ignore a second submit', async () => {
    let resolveCreate: (value: Result<Item>) => void = () => {
      throw new Error('create não foi chamado.');
    };
    const create = vi.fn(
      () =>
        new Promise<Result<Item>>((resolve) => {
          resolveCreate = resolve;
        }),
    );
    const fixture = await setup(bridgeWith({ create }), null);
    const saved = vi.fn();
    fixture.componentInstance.saved.subscribe(saved);

    setInputValue(fixture, '#item-title', 'Filme lento');
    dispatchSubmit(fixture);
    await settle(fixture);

    const saveButton = button(fixture, 'Salvando…');

    expect(saveButton.disabled).toBe(true);
    expect(host(fixture).textContent).toContain('Salvando…');

    dispatchSubmit(fixture);
    await settle(fixture);

    expect(create).toHaveBeenCalledTimes(1);
    expect(saved).not.toHaveBeenCalled();

    resolveCreate({ ok: true, value: makeItem({ id: 'novo-item', title: 'Filme lento' }) });
    await settle(fixture);

    expect(saved).toHaveBeenCalledTimes(1);
    expect(host(fixture).textContent).not.toContain('Salvando…');
  });

  it('should show an error without a matching field only in the summary', async () => {
    const bridge = bridgeWith({
      create: async () => ({
        ok: false,
        errors: [{ field: 'ipc', message: 'Falha inesperada na comunicação.' }],
      }),
    });
    const fixture = await setup(bridge, null);

    setInputValue(fixture, '#item-title', 'Item qualquer');
    await submit(fixture);

    const summary = host(fixture).querySelector('[role="alert"]');

    expect(summary?.textContent).toContain('Falha inesperada na comunicação.');
    expect(host(fixture).querySelectorAll('.field-error')).toHaveLength(0);
  });

  it('should create a book without a consumption date and default the status to lido', async () => {
    const calls: ItemInput[] = [];
    const bridge = bridgeWith({
      create: async (input) => {
        calls.push(input);
        return { ok: true, value: itemFromInput(input) };
      },
    });
    const fixture = await setup(bridge, null, 'livro');

    expect(host(fixture).querySelector('#item-consumed-on')).toBeNull();

    setInputValue(fixture, '#item-title', 'Livro novo');
    await submit(fixture);

    expect(calls[0]?.consumed_on).toBeUndefined();
    expect(calls[0]?.reading_status).toBe('lido');
  });

  it('should send the reading status chosen for a book', async () => {
    const calls: ItemInput[] = [];
    const bridge = bridgeWith({
      create: async (input) => {
        calls.push(input);
        return { ok: true, value: itemFromInput(input) };
      },
    });
    const fixture = await setup(bridge, null, 'livro');

    setInputValue(fixture, '#item-title', 'Em leitura');
    setSelectValue(fixture, '#item-reading-status', 'lendo');
    await submit(fixture);

    expect(calls[0]?.reading_status).toBe('lendo');
  });

  it('should keep the consumption date for films and hide the reading status', async () => {
    const fixture = await setup(bridgeWith(), null, 'filme');

    expect(host(fixture).querySelector('#item-consumed-on')).not.toBeNull();
    expect(host(fixture).querySelector('#item-reading-status')).toBeNull();
  });

  it('should send every name added to the author field', async () => {
    const calls: ItemInput[] = [];
    const bridge = bridgeWith({
      create: async (input) => {
        calls.push(input);
        return { ok: true, value: itemFromInput(input) };
      },
    });
    const fixture = await setup(bridge, null, 'livro');

    setInputValue(fixture, '#item-title', 'Dois autores');
    addTag(fixture, '#item-author', 'Ana');
    addTag(fixture, '#item-author', 'Bia');
    await settle(fixture);
    await submit(fixture);

    expect(calls[0]?.author).toEqual(['Ana', 'Bia']);
  });

  it('should offer the suggestions of the selected type', async () => {
    const types: MediaType[] = [];
    const bridge = bridgeWith({
      suggestions: async (type) => {
        types.push(type);
        return {
          ok: true,
          value: {
            authors: ['Autora Sugerida'],
            publishers: [],
            directors: [],
            screenplayBy: [],
            producedBy: [],
            distributedBy: [],
            languages: [],
          },
        };
      },
    });
    const fixture = await setup(bridge, null, 'livro');

    const options = Array.from(
      host(fixture).querySelectorAll('#item-author-suggestions option'),
    ).map((option) => option.getAttribute('value'));

    expect(types).toContain('livro');
    expect(options).toContain('Autora Sugerida');
  });
  it('should emit closed when the dialog is cancelled and when Cancelar is clicked', async () => {
    const fixture = await setup(bridgeWith(), null);
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);

    const dialog = host(fixture).querySelector('dialog');

    if (dialog === null) {
      throw new Error('Dialog não encontrado.');
    }

    dialog.dispatchEvent(new Event('cancel', { bubbles: true, cancelable: true }));
    await settle(fixture);

    expect(closed).toHaveBeenCalledTimes(1);

    await clickButton(fixture, 'Cancelar');

    expect(closed).toHaveBeenCalledTimes(2);
  });
});
