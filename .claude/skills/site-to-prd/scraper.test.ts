// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { parseArgs, urlToSlug } from './scraper.js';

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

  it('выбрасывает ошибку если --depth не число', () => {
    expect(() =>
      parseArgs(['https://example.com', '--output', './out', '--depth', 'abc']),
    ).toThrow('--depth должен быть положительным целым числом');
  });

  it('выбрасывает ошибку если --depth <= 0', () => {
    expect(() =>
      parseArgs(['https://example.com', '--output', './out', '--depth', '0']),
    ).toThrow('--depth должен быть положительным целым числом');
    expect(() =>
      parseArgs(['https://example.com', '--output', './out', '--depth', '-1']),
    ).toThrow('--depth должен быть положительным целым числом');
  });

  it('выбрасывает ошибку при пустом массиве аргументов', () => {
    expect(() => parseArgs([])).toThrow();
  });

  it('выбрасывает ошибку при неизвестном флаге', () => {
    expect(() =>
      parseArgs(['https://example.com', '--output', './out', '--foo', 'bar']),
    ).toThrow('Неизвестный флаг: --foo');
  });

  it('парсит аргументы в любом порядке', () => {
    const result = parseArgs([
      '--output',
      './out',
      '--depth',
      '2',
      'https://example.com',
    ]);
    expect(result.url).toBe('https://example.com');
    expect(result.output).toBe('./out');
    expect(result.depth).toBe(2);
  });

  it('выбрасывает ошибку если флаг --output без значения в конце', () => {
    expect(() => parseArgs(['https://example.com', '--output'])).toThrow(
      'Флаг --output требует значение',
    );
  });
});

describe('urlToSlug', () => {
  it('возвращает hostname для URL без пути', () => {
    expect(urlToSlug('https://example.com')).toBe('example.com');
  });

  it('добавляет путь через дефис', () => {
    expect(urlToSlug('https://example.com/about')).toBe('example.com-about');
  });

  it('преобразует вложенный путь', () => {
    expect(urlToSlug('https://example.com/products/shoes')).toBe(
      'example.com-products-shoes',
    );
  });

  it('игнорирует trailing slash', () => {
    expect(urlToSlug('https://example.com/')).toBe('example.com');
  });

  it('игнорирует query string', () => {
    expect(urlToSlug('https://example.com/page?foo=bar')).toBe(
      'example.com-page',
    );
  });

  it('игнорирует hash', () => {
    expect(urlToSlug('https://example.com/page#section')).toBe(
      'example.com-page',
    );
  });
});
