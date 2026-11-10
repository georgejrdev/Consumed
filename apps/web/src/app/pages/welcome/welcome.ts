import { Component, inject, output, signal } from '@angular/core';
import { Api } from '../../core/api';
import type { VaultInfo } from '../../core/bridge';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.html',
  styleUrl: './welcome.scss',
})
export class Welcome {
  private readonly api = inject(Api);

  readonly chosen = output<VaultInfo>();
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected async choose(): Promise<void> {
    if (this.busy()) {
      return;
    }

    this.busy.set(true);
    this.error.set(null);

    const result = await this.api.chooseVault();
    this.busy.set(false);

    if (!result.ok) {
      this.error.set(result.errors[0]?.message ?? 'Não foi possível escolher a pasta do cofre.');
      return;
    }

    if (result.value !== null) {
      this.chosen.emit(result.value);
    }
  }
}
