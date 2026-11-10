import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Api } from './core/api';
import type { VaultInfo } from './core/bridge';
import { Welcome } from './pages/welcome/welcome';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Welcome],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly api = inject(Api);

  protected readonly vault = signal<VaultInfo | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  constructor() {
    void this.loadVault();
  }

  protected onChosen(vault: VaultInfo): void {
    this.error.set(null);
    this.vault.set(vault);
  }

  private async loadVault(): Promise<void> {
    const result = await this.api.currentVault();
    this.loading.set(false);

    if (result.ok) {
      this.vault.set(result.value);
      return;
    }

    this.error.set(result.errors[0]?.message ?? 'Não foi possível ler a pasta do cofre.');
  }
}
