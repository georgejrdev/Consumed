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
  protected readonly versionNotice = signal<string | null>(null);

  constructor() {
    void this.loadVault();
  }

  protected onChosen(vault: VaultInfo): void {
    this.error.set(null);
    this.applyVault(vault);
  }

  protected dismissVersionNotice(): void {
    this.versionNotice.set(null);
  }

  private applyVault(vault: VaultInfo | null): void {
    this.vault.set(vault);
    this.versionNotice.set(vault === null ? null : this.noticeFor(vault));
  }

  private noticeFor(vault: VaultInfo): string | null {
    const current = vault.appVersion ?? '';
    const previous = vault.previousAppVersion ?? null;

    if (vault.versionChange === 'upgrade' && previous !== null) {
      return `Este cofre foi aberto pela última vez na versão ${previous}. Você está na versão ${current}. Recomendamos fazer backup antes de continuar.`;
    }

    if (vault.versionChange === 'downgrade' && previous !== null) {
      return `Este cofre foi usado por uma versão mais nova (${previous}). Atualize o aplicativo para evitar incompatibilidades.`;
    }

    return null;
  }

  private async loadVault(): Promise<void> {
    const result = await this.api.currentVault();
    this.loading.set(false);

    if (result.ok) {
      this.applyVault(result.value);
      return;
    }

    this.error.set(result.errors[0]?.message ?? 'Não foi possível ler a pasta do cofre.');
  }
}
