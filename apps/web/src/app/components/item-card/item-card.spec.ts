import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { ComponentFixture } from '@angular/core/testing';
import type { Item } from '../../core/bridge';
import { ItemCard } from './item-card';

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'item-1',
    type: 'filme',
    title: 'Blade Runner',
    consumed_on: '2026-01-05',
    created_at: '2026-01-05T00:00:00.000Z',
    updated_at: '2026-01-05T00:00:00.000Z',
    ...overrides,
  };
}

async function setup(
  item: Item,
  size: 'small' | 'large' = 'large',
): Promise<ComponentFixture<ItemCard>> {
  await TestBed.configureTestingModule({
    imports: [ItemCard],
    providers: [provideRouter([])],
  }).compileComponents();

  const fixture = TestBed.createComponent(ItemCard);
  fixture.componentRef.setInput('item', item);
  fixture.componentRef.setInput('size', size);
  await fixture.whenStable();

  return fixture;
}

function host(fixture: ComponentFixture<ItemCard>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

describe('ItemCard', () => {
  it('should render the cover image with the media url and an alt with the title', async () => {
    const fixture = await setup(makeItem({ image_path: 'imagens/capa.png' }));

    const image = host(fixture).querySelector<HTMLImageElement>('img');
    const src = image?.getAttribute('src') ?? '';
    const alt = image?.getAttribute('alt') ?? '';

    expect(image).not.toBeNull();
    expect(src.startsWith('media://vault/')).toBe(true);
    expect(alt).toContain('Blade Runner');
    expect(host(fixture).querySelector('.placeholder')).toBeNull();
  });

  it('should render the placeholder with the title initial when there is no image path', async () => {
    const fixture = await setup(makeItem({ title: 'blade runner' }));

    const placeholder = host(fixture).querySelector('.placeholder');

    expect(host(fixture).querySelector('img')).toBeNull();
    expect(placeholder?.textContent?.trim()).toBe('B');
  });

  it('should fall back to the placeholder when the image fails to load', async () => {
    const fixture = await setup(makeItem({ image_path: 'imagens/capa.png' }));

    const image = host(fixture).querySelector<HTMLImageElement>('img');

    expect(image).not.toBeNull();

    image?.dispatchEvent(new Event('error'));
    await fixture.whenStable();

    expect(host(fixture).querySelector('img')).toBeNull();
    expect(host(fixture).querySelector('.placeholder')?.textContent?.trim()).toBe('B');
  });

  it('should show year and rating when both are present', async () => {
    const fixture = await setup(makeItem({ year: 1982, rating: 8 }));

    expect(host(fixture).querySelector('.meta')?.textContent?.trim()).toBe('1982 · Nota 8');
  });

  it('should show only the year when the rating is missing', async () => {
    const fixture = await setup(makeItem({ year: 1982 }));

    expect(host(fixture).querySelector('.meta')?.textContent?.trim()).toBe('1982');
  });

  it('should show a BC year with the a.C. suffix', async () => {
    const fixture = await setup(makeItem({ year: -44 }));

    expect(host(fixture).querySelector('.meta')?.textContent?.trim()).toBe('44 a.C.');
  });

  it('should show only the rating when the year is missing', async () => {
    const fixture = await setup(makeItem({ rating: 8 }));

    expect(host(fixture).querySelector('.meta')?.textContent?.trim()).toBe('Nota 8');
  });

  it('should omit the meta line when there is neither year nor rating', async () => {
    const fixture = await setup(makeItem());

    expect(host(fixture).querySelector('.meta')).toBeNull();
  });

  it('should add the small class to the card when size is small', async () => {
    const small = await setup(makeItem(), 'small');

    expect(host(small).querySelector('.card')?.classList.contains('small')).toBe(true);
  });

  it('should not add the small class to the card when size is large', async () => {
    const large = await setup(makeItem(), 'large');

    expect(host(large).querySelector('.card')?.classList.contains('small')).toBe(false);
  });

  it('should link to the item detail route', async () => {
    const fixture = await setup(makeItem({ id: 'filme-9' }));

    expect(host(fixture).querySelector<HTMLAnchorElement>('a.card')?.getAttribute('href')).toBe(
      '/item/filme-9',
    );
  });

  it.each(['nao_lido', 'lendo'] as const)(
    'should mark the cover with the %s status class',
    async (status) => {
      const fixture = await setup(makeItem({ type: 'livro', reading_status: status }));
      const cssClass = status === 'nao_lido' ? 'nao-lido' : 'lendo';

      expect(host(fixture).querySelector('.cover')?.classList.contains(cssClass)).toBe(true);
    },
  );

  it('should not mark the cover of a read book', async () => {
    const fixture = await setup(makeItem({ type: 'livro', reading_status: 'lido' }));
    const cover = host(fixture).querySelector('.cover');

    expect(cover?.classList.contains('nao-lido')).toBe(false);
    expect(cover?.classList.contains('lendo')).toBe(false);
  });
});
