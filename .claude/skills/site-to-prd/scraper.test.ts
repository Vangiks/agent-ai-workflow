// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  parseArgs,
  getImageFilename,
  buildMetaData,
  deduplicateImages,
  mergeMeta,
  type RawPageMeta,
  type RawImage,
  type MetaData,
} from './scraper.js';

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

describe('getImageFilename', () => {
  it('возвращает имя файла из URL', () => {
    expect(getImageFilename('https://example.com/assets/logo.png')).toBe('logo.png');
  });

  it('убирает query string', () => {
    expect(getImageFilename('https://example.com/img/photo.jpg?w=800&h=600')).toBe('photo.jpg');
  });

  it('возвращает fallback для URL без файла', () => {
    expect(getImageFilename('https://example.com/')).toBe('image');
  });

  it('работает с вложенными путями', () => {
    expect(getImageFilename('https://cdn.example.com/a/b/c/pic.svg')).toBe('pic.svg');
  });

  it('возвращает fallback для невалидного URL', () => {
    expect(getImageFilename('not-a-url')).toBe('image');
  });
});

describe('buildMetaData', () => {
  it('извлекает title', () => {
    const raw: RawPageMeta = {
      title: 'Test Title',
      metaTags: [],
      links: [],
    };
    expect(buildMetaData(raw).title).toBe('Test Title');
  });

  it('извлекает description из meta тегов', () => {
    const raw: RawPageMeta = {
      title: null,
      metaTags: [{ name: 'description', property: null, content: 'Test desc' }],
      links: [],
    };
    expect(buildMetaData(raw).description).toBe('Test desc');
  });

  it('извлекает keywords и viewport', () => {
    const raw: RawPageMeta = {
      title: null,
      metaTags: [
        { name: 'keywords', property: null, content: 'foo, bar' },
        { name: 'viewport', property: null, content: 'width=device-width' },
      ],
      links: [],
    };
    const result = buildMetaData(raw);
    expect(result.keywords).toBe('foo, bar');
    expect(result.viewport).toBe('width=device-width');
  });

  it('извлекает OG теги', () => {
    const raw: RawPageMeta = {
      title: null,
      metaTags: [
        { name: null, property: 'og:title', content: 'OG Title' },
        { name: null, property: 'og:description', content: 'OG Desc' },
        { name: null, property: 'og:image', content: 'https://example.com/og.jpg' },
      ],
      links: [],
    };
    const result = buildMetaData(raw);
    expect(result.og['og:title']).toBe('OG Title');
    expect(result.og['og:description']).toBe('OG Desc');
    expect(result.og['og:image']).toBe('https://example.com/og.jpg');
  });

  it('извлекает favicon из link rel=icon', () => {
    const raw: RawPageMeta = {
      title: null,
      metaTags: [],
      links: [{ rel: 'icon', href: '/favicon.ico' }],
    };
    expect(buildMetaData(raw).favicon).toBe('/favicon.ico');
  });

  it('извлекает favicon из shortcut icon', () => {
    const raw: RawPageMeta = {
      title: null,
      metaTags: [],
      links: [{ rel: 'shortcut icon', href: '/favicon.png' }],
    };
    expect(buildMetaData(raw).favicon).toBe('/favicon.png');
  });

  it('заполняет allMeta всеми meta тегами', () => {
    const raw: RawPageMeta = {
      title: null,
      metaTags: [
        { name: 'description', property: null, content: 'desc' },
        { name: null, property: 'og:title', content: 'title' },
      ],
      links: [],
    };
    const result = buildMetaData(raw);
    expect(result.allMeta['description']).toBe('desc');
    expect(result.allMeta['og:title']).toBe('title');
  });

  it('возвращает null для отсутствующих полей', () => {
    const raw: RawPageMeta = { title: null, metaTags: [], links: [] };
    const result = buildMetaData(raw);
    expect(result.title).toBeNull();
    expect(result.description).toBeNull();
    expect(result.favicon).toBeNull();
  });
});

describe('deduplicateImages', () => {
  it('удаляет дубликаты по URL', () => {
    const images: RawImage[] = [
      { src: 'https://example.com/img.png', alt: 'img', width: 100, height: 100 },
      { src: 'https://example.com/img.png', alt: 'duplicate', width: 100, height: 100 },
      { src: 'https://example.com/other.png', alt: 'other', width: 50, height: 50 },
    ];
    expect(deduplicateImages(images)).toHaveLength(2);
  });

  it('сохраняет первое вхождение при дубликате', () => {
    const images: RawImage[] = [
      { src: 'https://example.com/img.png', alt: 'first', width: null, height: null },
      { src: 'https://example.com/img.png', alt: 'second', width: null, height: null },
    ];
    expect(deduplicateImages(images)[0]!.alt).toBe('first');
  });

  it('возвращает пустой массив для пустого входа', () => {
    expect(deduplicateImages([])).toHaveLength(0);
  });
});

describe('mergeMeta', () => {
  it('возвращает пустую структуру для пустого массива', () => {
    const result = mergeMeta([]);
    expect(result.title).toBeNull();
    expect(result.og).toEqual({});
  });

  it('использует первое непустое значение для каждого поля', () => {
    const metas: MetaData[] = [
      {
        title: null,
        description: 'first desc',
        keywords: null,
        viewport: null,
        og: {},
        favicon: null,
        allMeta: {},
      },
      {
        title: 'second title',
        description: 'second desc',
        keywords: null,
        viewport: null,
        og: {},
        favicon: null,
        allMeta: {},
      },
    ];
    const result = mergeMeta(metas);
    expect(result.title).toBe('second title');
    expect(result.description).toBe('first desc');
  });

  it('объединяет OG данные из всех страниц (первое значение приоритетно)', () => {
    const metas: MetaData[] = [
      {
        title: null,
        description: null,
        keywords: null,
        viewport: null,
        og: { 'og:title': 'Page 1' },
        favicon: null,
        allMeta: {},
      },
      {
        title: null,
        description: null,
        keywords: null,
        viewport: null,
        og: { 'og:title': 'Page 2', 'og:image': 'img.jpg' },
        favicon: null,
        allMeta: {},
      },
    ];
    const result = mergeMeta(metas);
    expect(result.og['og:title']).toBe('Page 1');
    expect(result.og['og:image']).toBe('img.jpg');
  });
});
