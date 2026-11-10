import { Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Item } from '../../core/bridge';
import { mediaUrl } from '../../core/format';

@Component({
  selector: 'app-item-card',
  imports: [RouterLink],
  templateUrl: './item-card.html',
  styleUrl: './item-card.scss',
})
export class ItemCard {
  readonly item = input.required<Item>();
  readonly size = input<'small' | 'large'>('large');

  protected readonly broken = signal(false);
  protected readonly imageUrl = computed(() => mediaUrl(this.item().image_path));
  protected readonly initial = computed(
    () => this.item().title.trim().charAt(0).toUpperCase() || '?',
  );
  protected readonly meta = computed(() => {
    const parts: string[] = [];

    if (this.item().year !== undefined) {
      parts.push(String(this.item().year));
    }
    if (this.item().rating !== undefined) {
      parts.push(`Nota ${this.item().rating}`);
    }

    return parts.join(' · ');
  });
}
