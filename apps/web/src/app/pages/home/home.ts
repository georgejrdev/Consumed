import { Component, inject, signal } from '@angular/core';
import { ItemCard } from '../../components/item-card/item-card';
import { ItemFormDialog } from '../../components/item-form-dialog/item-form-dialog';
import { Api } from '../../core/api';
import type { Item } from '../../core/bridge';

@Component({
  selector: 'app-home',
  imports: [ItemCard, ItemFormDialog],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly api = inject(Api);

  protected readonly films = signal<Item[]>([]);
  protected readonly books = signal<Item[]>([]);
  protected readonly filmsError = signal<string | null>(null);
  protected readonly booksError = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly formOpen = signal(false);

  constructor() {
    void this.load();
  }

  protected openForm(): void {
    this.formOpen.set(true);
  }

  protected onSaved(): void {
    this.formOpen.set(false);
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.filmsError.set(null);
    this.booksError.set(null);

    const [films, books] = await Promise.all([
      this.api.list({ type: 'filme', limit: 5 }),
      this.api.list({ type: 'livro', limit: 5, onlyConsumed: true }),
    ]);

    if (films.ok) {
      this.films.set(films.value.slice(0, 5));
    } else {
      this.filmsError.set(films.errors[0]?.message ?? 'Não foi possível carregar os filmes.');
    }

    if (books.ok) {
      this.books.set(books.value.slice(0, 5));
    } else {
      this.booksError.set(books.errors[0]?.message ?? 'Não foi possível carregar os livros.');
    }

    this.loading.set(false);
  }
}
