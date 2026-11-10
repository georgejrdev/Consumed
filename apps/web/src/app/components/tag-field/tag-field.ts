import { Component, computed, forwardRef, input, signal } from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';

@Component({
  selector: 'app-tag-field',
  templateUrl: './tag-field.html',
  styleUrl: './tag-field.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TagField),
      multi: true,
    },
  ],
})
export class TagField implements ControlValueAccessor {
  readonly label = input.required<string>();
  readonly inputId = input.required<string>();
  readonly suggestions = input<string[]>([]);
  readonly placeholder = input('');

  protected readonly values = signal<string[]>([]);
  protected readonly disabled = signal(false);
  protected readonly draft = signal('');
  protected readonly listId = computed(() => `${this.inputId()}-suggestions`);

  private onChange: (value: string[]) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string[] | null): void {
    this.values.set(Array.isArray(value) ? [...value] : []);
  }

  registerOnChange(fn: (value: string[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }

  protected onInput(event: Event): void {
    const target = event.target;

    if (target instanceof HTMLInputElement) {
      this.draft.set(target.value);
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addDraft();
      return;
    }

    if (event.key === 'Backspace' && this.draft() === '') {
      this.removeAt(this.values().length - 1);
    }
  }

  protected onBlur(): void {
    this.onTouched();
  }

  protected removeAt(index: number): void {
    if (index < 0 || index >= this.values().length) {
      return;
    }

    this.commit(this.values().filter((_, position) => position !== index));
  }

  private addDraft(): void {
    const names = this.draft()
      .split(',')
      .map((name) => name.trim())
      .filter((name) => name !== '');

    this.draft.set('');
    this.commit([...this.values(), ...names]);
  }

  private commit(values: string[]): void {
    const unique = [...new Set(values)];
    const current = this.values();

    if (
      unique.length === current.length &&
      unique.every((value, index) => value === current[index])
    ) {
      return;
    }

    this.values.set(unique);
    this.onChange(unique);
  }
}
