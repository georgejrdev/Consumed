import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, type FormControl, type FormGroup } from '@angular/forms';
import { Api } from '../../core/api';
import type { Item, ItemInput, ItemSuggestions, MediaType, ReadingStatus } from '../../core/bridge';
import { mediaUrl } from '../../core/format';
import { TagField } from '../tag-field/tag-field';

interface ItemForm {
  type: FormControl<MediaType>;
  title: FormControl<string>;
  consumed_on: FormControl<string>;
  year: FormControl<number | null>;
  rating: FormControl<string>;
  language: FormControl<string>;
  notes: FormControl<string>;
  author: FormControl<string[]>;
  publisher: FormControl<string>;
  pages: FormControl<number | null>;
  isbn: FormControl<string>;
  started_on: FormControl<string>;
  finished_on: FormControl<string>;
  reading_status: FormControl<ReadingStatus>;
  director: FormControl<string>;
  runtime_min: FormControl<number | null>;
  screenplay_by: FormControl<string[]>;
  produced_by: FormControl<string[]>;
  distributed_by: FormControl<string[]>;
}

function emptySuggestions(): ItemSuggestions {
  return {
    authors: [],
    publishers: [],
    directors: [],
    screenplayBy: [],
    producedBy: [],
    distributedBy: [],
    languages: [],
  };
}

function todayIso(): string {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

@Component({
  selector: 'app-item-form-dialog',
  imports: [ReactiveFormsModule, TagField],
  templateUrl: './item-form-dialog.html',
  styleUrl: './item-form-dialog.scss',
})
export class ItemFormDialog implements OnInit, AfterViewInit {
  readonly item = input.required<Item | null>();
  readonly defaultType = input<MediaType>('filme');
  readonly saved = output<void>();
  readonly closed = output<void>();

  private readonly api = inject(Api);
  private readonly fb = inject(FormBuilder);
  private readonly dialogElement = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  private suggestionsRequest = 0;

  protected form!: FormGroup<ItemForm>;
  protected readonly typeValue = signal<MediaType>('filme');
  protected readonly saving = signal(false);
  protected readonly summary = signal<string[]>([]);
  protected readonly fieldErrors = signal<Record<string, string>>({});
  protected readonly suggestions = signal<ItemSuggestions>(emptySuggestions());
  protected readonly imagePath = signal<string | null>(null);
  protected readonly imageBroken = signal(false);
  protected readonly imageUrl = computed(() => mediaUrl(this.imagePath() ?? undefined));
  protected readonly dialogTitle = computed(() =>
    this.item() === null ? 'Novo item' : 'Editar item',
  );
  protected readonly ratings = Array.from({ length: 11 }, (_, index) => index);

  ngOnInit(): void {
    const current = this.item();
    const initialType = current?.type ?? this.defaultType();

    this.form = this.fb.group<ItemForm>({
      type: this.fb.nonNullable.control<MediaType>(initialType),
      title: this.fb.nonNullable.control(current?.title ?? ''),
      consumed_on: this.fb.nonNullable.control(current?.consumed_on ?? todayIso()),
      year: this.fb.control<number | null>(current?.year ?? null),
      rating: this.fb.nonNullable.control(
        current?.rating === undefined ? '' : String(current.rating),
      ),
      language: this.fb.nonNullable.control(current?.language ?? ''),
      notes: this.fb.nonNullable.control(current?.notes ?? ''),
      author: this.fb.nonNullable.control<string[]>(current?.author ?? []),
      publisher: this.fb.nonNullable.control(current?.publisher ?? ''),
      pages: this.fb.control<number | null>(current?.pages ?? null),
      isbn: this.fb.nonNullable.control(current?.isbn ?? ''),
      started_on: this.fb.nonNullable.control(current?.started_on ?? ''),
      finished_on: this.fb.nonNullable.control(current?.finished_on ?? ''),
      reading_status: this.fb.nonNullable.control<ReadingStatus>(current?.reading_status ?? 'lido'),
      director: this.fb.nonNullable.control(current?.director ?? ''),
      runtime_min: this.fb.control<number | null>(current?.runtime_min ?? null),
      screenplay_by: this.fb.nonNullable.control<string[]>(current?.screenplay_by ?? []),
      produced_by: this.fb.nonNullable.control<string[]>(current?.produced_by ?? []),
      distributed_by: this.fb.nonNullable.control<string[]>(current?.distributed_by ?? []),
    });

    this.typeValue.set(initialType);
    this.form.controls.type.valueChanges.subscribe((value) => {
      this.typeValue.set(value);
      void this.loadSuggestions(value);
    });
    void this.loadSuggestions(initialType);
    this.imagePath.set(current?.image_path ?? null);
  }

  ngAfterViewInit(): void {
    const dialog = this.dialogElement().nativeElement;

    try {
      dialog.showModal();
    } catch {
      dialog.setAttribute('open', '');
    }

    // Fechar ao clicar no backdrop é um atalho de mouse; teclado usa Esc e o botão Cancelar.
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) {
        this.requestClose();
      }
    });
  }

  protected fieldError(field: string): string | undefined {
    return this.fieldErrors()[field];
  }

  protected onCancel(event: Event): void {
    event.preventDefault();
    this.requestClose();
  }

  protected requestClose(): void {
    this.closeDialog();
    this.closed.emit();
  }

  protected async chooseImage(): Promise<void> {
    const result = await this.api.importImage();

    if (!result.ok) {
      this.setFieldError(
        'image_path',
        result.errors[0]?.message ?? 'Não foi possível escolher a imagem.',
      );
      return;
    }

    if (result.value !== null) {
      this.imagePath.set(result.value.path);
      this.imageBroken.set(false);
      this.clearFieldError('image_path');
    }
  }

  protected removeImage(): void {
    this.imagePath.set(null);
    this.imageBroken.set(false);
    this.clearFieldError('image_path');
  }

  protected async submit(): Promise<void> {
    if (this.saving()) {
      return;
    }

    this.saving.set(true);
    this.summary.set([]);
    this.fieldErrors.set({});

    const input = this.toInput();
    const current = this.item();
    const result =
      current === null ? await this.api.create(input) : await this.api.update(current.id, input);

    this.saving.set(false);

    if (result.ok) {
      this.saved.emit();
      this.closeDialog();
      return;
    }

    const errors: Record<string, string> = {};
    for (const error of result.errors) {
      errors[error.field] = error.message;
    }

    this.fieldErrors.set(errors);
    this.summary.set(result.errors.map((error) => error.message));
  }

  private toInput(): ItemInput {
    const value = this.form.getRawValue();
    const input: ItemInput = {
      type: value.type,
      title: value.title.trim(),
    };

    if (value.year !== null) {
      input.year = value.year;
    }
    if (value.rating !== '') {
      input.rating = Number(value.rating);
    }

    this.assignText(input, 'language', value.language);
    this.assignText(input, 'notes', value.notes);

    if (value.type === 'livro') {
      this.assignNames(input, 'author', value.author);
      this.assignText(input, 'publisher', value.publisher);
      if (value.pages !== null) {
        input.pages = value.pages;
      }
      this.assignText(input, 'isbn', value.isbn);
      this.assignText(input, 'started_on', value.started_on);
      this.assignText(input, 'finished_on', value.finished_on);
      input.reading_status = value.reading_status;
    } else {
      input.consumed_on = value.consumed_on;
      this.assignText(input, 'director', value.director);
      if (value.runtime_min !== null) {
        input.runtime_min = value.runtime_min;
      }
      this.assignNames(input, 'screenplay_by', value.screenplay_by);
      this.assignNames(input, 'produced_by', value.produced_by);
      this.assignNames(input, 'distributed_by', value.distributed_by);
    }

    const image = this.imagePath();

    if (image !== null) {
      input.image_path = image;
    }

    return input;
  }

  private assignText(
    input: ItemInput,
    field: 'language' | 'notes' | 'publisher' | 'isbn' | 'started_on' | 'finished_on' | 'director',
    value: string,
  ): void {
    const trimmed = value.trim();

    if (trimmed !== '') {
      input[field] = trimmed;
    }
  }

  private assignNames(
    input: ItemInput,
    field: 'author' | 'screenplay_by' | 'produced_by' | 'distributed_by',
    value: string[],
  ): void {
    const names = value.map((name) => name.trim()).filter((name) => name !== '');

    if (names.length > 0) {
      input[field] = names;
    }
  }

  private async loadSuggestions(type: MediaType): Promise<void> {
    this.suggestionsRequest += 1;
    const request = this.suggestionsRequest;
    const result = await this.api.suggestions(type);

    if (request !== this.suggestionsRequest) {
      return;
    }

    this.suggestions.set(result.ok ? result.value : emptySuggestions());
  }

  private setFieldError(field: string, message: string): void {
    this.fieldErrors.set({ ...this.fieldErrors(), [field]: message });
  }

  private clearFieldError(field: string): void {
    const errors = { ...this.fieldErrors() };
    delete errors[field];
    this.fieldErrors.set(errors);
  }

  private closeDialog(): void {
    const dialog = this.dialogElement().nativeElement;

    if (typeof dialog.close === 'function' && dialog.open) {
      dialog.close();
      return;
    }

    dialog.removeAttribute('open');
  }
}
