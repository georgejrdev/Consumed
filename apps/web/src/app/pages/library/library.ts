import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { ItemCard } from '../../components/item-card/item-card';
import { ItemFormDialog } from '../../components/item-form-dialog/item-form-dialog';
import { Api } from '../../core/api';
import type { Item, ListOptions, MediaType } from '../../core/bridge';

@Component({
  selector: 'app-library',
  imports: [ItemCard, ItemFormDialog],
  templateUrl: './library.html',
  styleUrl: './library.scss',
})
export class Library {
  readonly type = input.required<MediaType>();

  private readonly api = inject(Api);
  private requestId = 0;

  protected readonly query = signal('');
  protected readonly items = signal<Item[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly formOpen = signal(false);

  protected readonly heading = computed(() => (this.type() === 'filme' ? 'FILMES' : 'LIVROS'));
  protected readonly emptyMessage = computed(() => {
    const term = this.query().trim();

    return term === '' ? 'Nenhum item encontrado.' : `Nenhum resultado para "${term}".`;
  });

  constructor() {
    effect(() => {
      const type = this.type();
      const term = this.query().trim();
      void this.load(type, term);
    });
  }

  protected onSearch(event: Event): void {
    const target = event.target;

    if (target instanceof HTMLInputElement) {
      this.query.set(target.value);
    }
  }

  protected openForm(): void {
    this.formOpen.set(true);
  }

  protected onSaved(): void {
    this.formOpen.set(false);
    void this.load(this.type(), this.query().trim());
  }

  private async load(type: MediaType, term: string): Promise<void> {
    const request = ++this.requestId;
    const options: ListOptions = { type };

    if (term !== '') {
      options.q = term;
    }

    this.loading.set(true);
    this.error.set(null);

    const result = await this.api.list(options);

    if (request !== this.requestId) {
      return;
    }

    if (result.ok) {
      this.items.set(result.value);
    } else {
      this.items.set([]);
      this.error.set(result.errors[0]?.message ?? 'Não foi possível carregar os itens.');
    }

    this.loading.set(false);
  }
}
