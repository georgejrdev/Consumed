import { formatDate, formatRating, formatRuntime, mediaLabel, mediaUrl } from './format';

describe('formatDate', () => {
  it('should format a date that matches the ISO pattern as dd/mm/yyyy', () => {
    expect(formatDate('2026-02-30')).toBe('30/02/2026');
    expect(formatDate('2024-12-01')).toBe('01/12/2024');
  });

  it('should return the input as it came when it is outside the ISO pattern', () => {
    expect(formatDate('30/02/2026')).toBe('30/02/2026');
    expect(formatDate('2026-2-3')).toBe('2026-2-3');
    expect(formatDate('ontem')).toBe('ontem');
    expect(formatDate('')).toBe('');
  });
});

describe('formatRating', () => {
  it('should return a dash when the rating is undefined', () => {
    expect(formatRating()).toBe('—');
  });

  it('should return the rating as text when it is zero', () => {
    expect(formatRating(0)).toBe('0');
  });

  it('should return the rating as text when it is the maximum', () => {
    expect(formatRating(10)).toBe('10');
  });
});

describe('formatRuntime', () => {
  it('should return a dash when the runtime is undefined or not positive', () => {
    expect(formatRuntime()).toBe('—');
    expect(formatRuntime(0)).toBe('—');
    expect(formatRuntime(-30)).toBe('—');
  });

  it('should show only minutes when the runtime is below one hour', () => {
    expect(formatRuntime(42)).toBe('42 min');
  });

  it('should show only hours when the runtime is an exact amount of hours', () => {
    expect(formatRuntime(60)).toBe('1 h');
  });

  it('should show hours and minutes when the runtime has both', () => {
    expect(formatRuntime(102)).toBe('1 h 42 min');
  });
});

describe('mediaLabel', () => {
  it('should label a film', () => {
    expect(mediaLabel('filme')).toBe('Filme');
  });

  it('should label a book', () => {
    expect(mediaLabel('livro')).toBe('Livro');
  });
});

describe('mediaUrl', () => {
  it('should return null when the image path is undefined', () => {
    expect(mediaUrl()).toBeNull();
  });

  it('should return null when the image path is an empty string', () => {
    expect(mediaUrl('')).toBeNull();
  });

  it('should return null when the image path only contains whitespace', () => {
    expect(mediaUrl('   ')).toBeNull();
  });

  it('should strip the imagens/ prefix and build the media url', () => {
    expect(mediaUrl('imagens/x.png')).toBe('media://vault/x.png');
  });

  it('should strip the leading slash and build the media url', () => {
    expect(mediaUrl('/x.png')).toBe('media://vault/x.png');
  });

  it('should return null when the image path only contains the imagens/ prefix', () => {
    expect(mediaUrl('imagens/')).toBeNull();
  });

  it('should encode characters that require escaping', () => {
    expect(mediaUrl('imagens/capa final.png')).toBe('media://vault/capa%20final.png');
    expect(mediaUrl('imagens/capa#1.png')).toBe('media://vault/capa%231.png');
  });
});
