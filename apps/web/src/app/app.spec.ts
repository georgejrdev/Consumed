import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { ComponentFixture } from '@angular/core/testing';
import type { Item, Result } from './core/bridge';
import { CONSUMED_BRIDGE, type ConsumedBridge } from './core/bridge';
import { App } from './app';

function failure<T>(message: string): Promise<Result<T>> {
  return Promise.resolve({
    ok: false,
    errors: [{ field: 'ipc', message }],
  });
}

function createBridge(overrides: Partial<ConsumedBridge['vault']> = {}): ConsumedBridge {
  return {
    vault: {
      current: async () => ({ ok: true, value: null }),
      choose: async () => ({ ok: true, value: null }),
      ...overrides,
    },
    items: {
      list: async () => ({ ok: true, value: [] }),
      get: async () => ({ ok: true, value: null }),
      create: async () => failure<Item>('não usado'),
      update: async () => failure<Item>('não usado'),
      delete: async () => failure<{ id: string }>('não usado'),
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

async function setup(bridge: ConsumedBridge): Promise<ComponentFixture<App>> {
  await TestBed.configureTestingModule({
    imports: [App],
    providers: [provideRouter([]), { provide: CONSUMED_BRIDGE, useValue: bridge }],
  }).compileComponents();

  const fixture = TestBed.createComponent(App);
  await fixture.whenStable();

  return fixture;
}

function host(fixture: ComponentFixture<App>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function navigationLabels(fixture: ComponentFixture<App>): string[] {
  const links = Array.from(host(fixture).querySelectorAll<HTMLAnchorElement>('nav.navbar a'));

  return links.map((link) => link.textContent?.trim() ?? '');
}

describe('App', () => {
  it('should render the welcome screen when no vault is configured', async () => {
    const fixture = await setup(createBridge());

    expect(host(fixture).querySelector('app-welcome')).not.toBeNull();
    expect(host(fixture).querySelector('nav.navbar')).toBeNull();
  });

  it('should render the navigation when a vault path is returned', async () => {
    const fixture = await setup(
      createBridge({
        current: async () => ({ ok: true, value: { path: '/tmp/cofre' } }),
      }),
    );

    expect(navigationLabels(fixture)).toEqual(['HOME', 'FILMS', 'BOOKS', 'STATISTICS']);
    expect(host(fixture).querySelector('app-welcome')).toBeNull();
  });

  it('should switch to the navigation when choosing a vault succeeds', async () => {
    const fixture = await setup(
      createBridge({
        choose: async () => ({ ok: true, value: { path: '/tmp/cofre' } }),
      }),
    );

    const button = host(fixture).querySelector<HTMLButtonElement>('button');

    expect(button).not.toBeNull();
    button?.click();
    await fixture.whenStable();

    expect(navigationLabels(fixture)).toEqual(['HOME', 'FILMS', 'BOOKS', 'STATISTICS']);
    expect(host(fixture).querySelector('app-welcome')).toBeNull();
  });

  it('should show the error and stay on welcome when choosing a vault fails', async () => {
    const fixture = await setup(
      createBridge({
        choose: () => failure('Não foi possível abrir a pasta.'),
      }),
    );

    const button = host(fixture).querySelector<HTMLButtonElement>('button');

    expect(button).not.toBeNull();
    button?.click();
    await fixture.whenStable();

    expect(host(fixture).querySelector('app-welcome')).not.toBeNull();
    expect(host(fixture).textContent).toContain('Não foi possível abrir a pasta.');
  });
});
