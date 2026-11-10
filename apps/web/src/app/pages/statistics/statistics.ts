import { Component, computed, inject, input, signal } from '@angular/core';
import { Api } from '../../core/api';
import type { Item } from '../../core/bridge';
import {
  availableYears,
  computeStatistics,
  type MonthBucket,
  type Statistics as StatisticsData,
} from '../../core/statistics';

interface ChartBar extends MonthBucket {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  valueY: number;
}

const CHART_WIDTH = 1140;
const CHART_HEIGHT = 260;
const CHART_PADDING = 24;
const CHART_TOP = 30;
const CHART_BASELINE = 220;
const PLOT_HEIGHT = CHART_BASELINE - CHART_TOP;
const BAR_WIDTH = 56;

@Component({
  selector: 'app-statistics',
  imports: [],
  templateUrl: './statistics.html',
  styleUrl: './statistics.scss',
})
export class Statistics {
  readonly defaultYear = input<number>(new Date().getFullYear());

  private readonly api = inject(Api);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  private readonly items = signal<Item[]>([]);
  private readonly selectedYear = signal<number | null>(null);

  protected readonly years = computed(() => availableYears(this.items()));
  protected readonly hasItems = computed(() => this.items().length > 0);
  protected readonly year = computed(() => {
    const years = this.years();

    if (years.length === 0) {
      return this.defaultYear();
    }

    const selected = this.selectedYear();

    if (selected !== null && years.includes(selected)) {
      return selected;
    }

    const preferred = this.defaultYear();

    if (years.includes(preferred)) {
      return preferred;
    }

    return years[0] ?? preferred;
  });
  protected readonly stats = computed<StatisticsData>(() =>
    computeStatistics(this.items(), this.year()),
  );
  protected readonly averageLabel = computed(() => {
    const average = this.stats().averageRating;

    return average === null ? '—' : average.toFixed(1).replace('.', ',');
  });
  protected readonly publisherLong = computed(() => (this.stats().topPublisher?.length ?? 0) > 14);
  protected readonly chart = computed<ChartBar[]>(() => {
    const stats = this.stats();
    const max = Math.max(1, ...stats.months.map((bucket) => bucket.items));
    const slot = (CHART_WIDTH - CHART_PADDING * 2) / stats.months.length;
    const slotIndexed = stats.months.map((bucket, index) => ({ bucket, index }));

    return slotIndexed.map(({ bucket, index }) => {
      const height = bucket.items === 0 ? 0 : Math.round((bucket.items / max) * PLOT_HEIGHT);
      const slotStart = CHART_PADDING + index * slot;

      return {
        ...bucket,
        x: slotStart + (slot - BAR_WIDTH) / 2,
        y: CHART_BASELINE - height,
        width: BAR_WIDTH,
        height,
        centerX: slotStart + slot / 2,
        valueY: CHART_BASELINE - height - 8,
      };
    });
  });
  protected readonly chartLabel = computed(() => {
    const stats = this.stats();
    const parts = stats.months.map((bucket) => `${bucket.label} ${bucket.items}`);

    return `Itens por mês em ${stats.year}: ${parts.join(', ')}.`;
  });
  protected readonly chartWidth = CHART_WIDTH;
  protected readonly chartHeight = CHART_HEIGHT;
  protected readonly chartPadding = CHART_PADDING;
  protected readonly chartBaseline = CHART_BASELINE;
  protected readonly axisEnd = CHART_WIDTH - CHART_PADDING;

  constructor() {
    void this.load();
  }

  protected onYearChange(event: Event): void {
    const target = event.target;

    if (!(target instanceof HTMLSelectElement)) {
      return;
    }

    const value = Number(target.value);

    if (Number.isInteger(value)) {
      this.selectedYear.set(value);
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    const result = await this.api.list({ onlyConsumed: true });

    if (result.ok) {
      this.items.set(result.value);
    } else {
      this.items.set([]);
      this.error.set(result.errors[0]?.message ?? 'Não foi possível carregar as estatísticas.');
    }

    this.loading.set(false);
  }
}
