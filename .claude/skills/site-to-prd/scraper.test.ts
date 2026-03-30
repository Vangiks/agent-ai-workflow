// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { parseArgs, extractInternalLinks, bfsCrawl } from './scraper.js';

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

  it('использует depth=2 по умолчанию', () => {
    const result = parseArgs(['https://example.com', '--output', './out']);
    expect(result.depth).toBe(2);
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

describe('extractInternalLinks', () => {
  it('возвращает внутренние абсолютные ссылки', () => {
    const links = extractInternalLinks('https://example.com', [
      'https://example.com/about',
      'https://example.com/contact',
    ]);
    expect(links).toContain('https://example.com/about');
    expect(links).toContain('https://example.com/contact');
  });

  it('фильтрует внешние ссылки', () => {
    const links = extractInternalLinks('https://example.com', [
      'https://other.com/page',
      'https://example.com/about',
    ]);
    expect(links).toHaveLength(1);
    expect(links[0]).toBe('https://example.com/about');
  });

  it('преобразует относительные ссылки в абсолютные', () => {
    const links = extractInternalLinks('https://example.com/page', [
      '/about',
      '/contact',
    ]);
    expect(links).toContain('https://example.com/about');
    expect(links).toContain('https://example.com/contact');
  });

  it('дедуплицирует ссылки', () => {
    const links = extractInternalLinks('https://example.com', [
      '/about',
      '/about',
      'https://example.com/about',
    ]);
    expect(links).toHaveLength(1);
  });

  it('игнорирует якоря и пустые ссылки', () => {
    const links = extractInternalLinks('https://example.com', [
      '#section',
      '',
      'javascript:void(0)',
    ]);
    expect(links).toHaveLength(0);
  });

  it('убирает фрагменты из URL', () => {
    const links = extractInternalLinks('https://example.com', [
      '/about#section',
    ]);
    expect(links).toContain('https://example.com/about');
    expect(links).not.toContain('https://example.com/about#section');
  });
});

describe('bfsCrawl', () => {
  it('возвращает стартовую страницу с depth=1 при maxDepth=1', async () => {
    const fetchPage = async (_url: string) => ({
      title: 'Home',
      links: ['https://example.com/about'],
    });
    const pages = await bfsCrawl('https://example.com', 1, fetchPage);
    expect(pages).toHaveLength(1);
    expect(pages[0]).toEqual({ url: 'https://example.com', depth: 1, title: 'Home' });
  });

  it('обходит ссылки до заданной глубины', async () => {
    const fetchPage = async (url: string) => {
      if (url === 'https://example.com') {
        return { title: 'Home', links: ['https://example.com/about'] };
      }
      if (url === 'https://example.com/about') {
        return { title: 'About', links: ['https://example.com/team'] };
      }
      return { title: 'Team', links: [] };
    };
    const pages = await bfsCrawl('https://example.com', 2, fetchPage);
    expect(pages).toHaveLength(2);
    expect(pages.map(p => p.url)).toContain('https://example.com');
    expect(pages.map(p => p.url)).toContain('https://example.com/about');
    expect(pages.map(p => p.url)).not.toContain('https://example.com/team');
  });

  it('дедуплицирует страницы', async () => {
    const fetchPage = async (url: string) => {
      if (url === 'https://example.com') {
        return { title: 'Home', links: ['https://example.com/about', 'https://example.com/about'] };
      }
      return { title: 'About', links: ['https://example.com'] };
    };
    const pages = await bfsCrawl('https://example.com', 2, fetchPage);
    const urls = pages.map(p => p.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('устанавливает правильную глубину для каждой страницы', async () => {
    const fetchPage = async (url: string) => {
      if (url === 'https://example.com') {
        return { title: 'Home', links: ['https://example.com/about'] };
      }
      return { title: 'About', links: [] };
    };
    const pages = await bfsCrawl('https://example.com', 2, fetchPage);
    const home = pages.find(p => p.url === 'https://example.com');
    const about = pages.find(p => p.url === 'https://example.com/about');
    expect(home?.depth).toBe(1);
    expect(about?.depth).toBe(2);
  });
});
