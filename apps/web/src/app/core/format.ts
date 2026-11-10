import type { MediaType } from './bridge';

export function formatDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);

  if (match === null) {
    return iso;
  }

  const [, year = '', month = '', day = ''] = match;

  return `${day}/${month}/${year}`;
}

export function formatRating(rating?: number): string {
  return rating === undefined ? '—' : String(rating);
}

export function formatRuntime(minutes?: number): string {
  if (minutes === undefined || minutes <= 0) {
    return '—';
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} min`;
  }

  if (remainingMinutes === 0) {
    return `${hours} h`;
  }

  return `${hours} h ${remainingMinutes} min`;
}

export function mediaLabel(type: MediaType): string {
  return type === 'filme' ? 'Filme' : 'Livro';
}

export function mediaUrl(imagePath?: string): string | null {
  if (imagePath === undefined || imagePath.trim() === '') {
    return null;
  }

  const relative = imagePath.replace(/^imagens\//, '').replace(/^\/+/, '');

  if (relative === '') {
    return null;
  }

  const encoded = relative.split('/').map(encodeURIComponent).join('/');

  return `media://vault/${encoded}`;
}
