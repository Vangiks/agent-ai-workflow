// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { parseArgs } from './scraper.js';

describe('parseArgs', () => {
  it('парсит URL и флаг --output', () => {
    const result = parseArgs(['https://example.com', '--output', './out']);
    expect(result.url).toBe('https://example.com');
    expect(result.output).toBe('./out');
  });

  it('парсит флаг --depth', () => {
    const result = parseArgs([
      'https://example.com',
      '--output',
      './out',
      '--depth',
      '3',
    ]);
    expect(result.depth).toBe(3);
  });

  it('использует depth=1 по умолчанию', () => {
    const result = parseArgs(['https://example.com', '--output', './out']);
    expect(result.depth).toBe(1);
  });

  it('выбрасывает ошибку если нет URL', () => {
    expect(() => parseArgs(['--output', './out'])).toThrow();
  });

  it('выбрасывает ошибку если нет --output', () => {
    expect(() => parseArgs(['https://example.com'])).toThrow();
  });
});
