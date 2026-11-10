import {
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { ItemFormDialog } from '../../components/item-form-dialog/item-form-dialog';
import { Api } from '../../core/api';
import type { Item } from '../../core/bridge';
import { formatDate, formatRating, formatRuntime, mediaUrl } from '../../core/format';

interface MetaRow {
  label: string;
  value: string;
}

@Component({
  selector: 'app-detail',
  imports: [ItemFormDialog],
  templateUrl: './detail.html',
  styleUrl: './detail.scss',
})
export class Detail {
  readonly id = input.required<string>();

  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly confirmDialog =
    viewChild.required<ElementRef<HTMLDialogElement>>('confirmDialog');
  private readonly confirmCancel =
    viewChild.required<ElementRef<HTMLButtonElement>>('confirmCancel');

  protected readonly item = signal<Item | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly formOpen = signal(false);
  protected readonly deleting = signal(false);
  protected readonly deleteError = signal<string | null>(null);
  protected readonly broken = signal(false);

  protected readonly formatDate = formatDate;
  protected readonly formatRating = formatRating;

  private requestId = 0;

  protected readonly imageUrl = computed(() => mediaUrl(this.item()?.image_path));
  protected readonly initial = computed(
    () => this.item()?.title.trim().charAt(0).toUpperCase() ?? '?',
  );
  protected readonly backTarget = computed(() =>
    this.item()?.type === 'livro' ? '/books' : '/films',
  );
  protected readonly metaRows = computed<MetaRow[]>(() => {
    const item = this.item();

    if (item === null) {
      return [];
    }

    const rows: MetaRow[] = [];
    const pushText = (label: string, value?: string): void => {
      const trimmed = value?.trim() ?? '';

      if (trimmed !== '') {
        rows.push({ label, value: trimmed });
      }
    };
    const pushList = (label: string, values?: string[]): void => {
      const names = (values ?? []).map((value) => value.trim()).filter((value) => value !== '');

      if (names.length > 0) {
        rows.push({ label, value: names.join(', ') });
      }
    };

    if (item.type === 'filme') {
      if (item.runtime_min !== undefined && item.runtime_min > 0) {
        rows.push({ label: 'Duração:', value: formatRuntime(item.runtime_min) });
      }
      pushText('Direção:', item.director);
      pushList('Roteiro:', item.screenplay_by);
      pushList('Produção:', item.produced_by);
      pushList('Distribuição:', item.distributed_by);
      pushText('Idioma:', item.language);
    } else {
      pushList('Autor:', item.author);
      pushText('Editora:', item.publisher);
      if (item.pages !== undefined && item.pages > 0) {
        rows.push({ label: 'Páginas:', value: String(item.pages) });
      }
      pushText('Idioma:', item.language);
      pushText('ISBN:', item.isbn);
    }

    return rows;
  });

  constructor() {
    effect(() => {
      const id = this.id();
      void this.load(id);
    });
  }

  protected goBack(): void {
    void this.router.navigate([this.backTarget()]);
  }

  protected openForm(): void {
    this.formOpen.set(true);
  }

  protected onSaved(): void {
    this.formOpen.set(false);
    void this.load(this.id());
  }

  protected openConfirm(): void {
    this.deleteError.set(null);

    const dialog = this.confirmDialog().nativeElement;

    try {
      dialog.showModal();
    } catch {
      dialog.setAttribute('open', '');
    }

    this.confirmCancel().nativeElement.focus();
  }

  protected closeConfirm(): void {
    const dialog = this.confirmDialog().nativeElement;

    if (typeof dialog.close === 'function' && dialog.open) {
      dialog.close();
      return;
    }

    dialog.removeAttribute('open');
  }

  protected onConfirmCancel(event: Event): void {
    event.preventDefault();
    this.closeConfirm();
  }

  protected async confirmDelete(): Promise<void> {
    const item = this.item();

    if (item === null || this.deleting()) {
      return;
    }

    this.deleting.set(true);
    this.deleteError.set(null);

    const result = await this.api.remove(item.id);

    this.deleting.set(false);

    if (!result.ok) {
      this.deleteError.set(result.errors[0]?.message ?? 'Não foi possível excluir o item.');
      return;
    }

    this.closeConfirm();
    await this.router.navigate([this.backTarget()]);
  }

  private async load(id: string): Promise<void> {
    const request = ++this.requestId;

    this.loading.set(true);
    this.error.set(null);
    this.item.set(null);
    this.broken.set(false);

    const result = await this.api.get(id);

    if (request !== this.requestId) {
      return;
    }

    if (result.ok) {
      this.item.set(result.value);
    } else {
      this.error.set(result.errors[0]?.message ?? 'Não foi possível carregar o item.');
    }

    this.loading.set(false);
  }
}
