// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  rgbToHex,
  parseFontFamily,
  isGoogleFont,
  generateNextFontCode,
  normalizeColorOccurrences,
  mergeColorEntries,
  normalizeTypography,
  mergeTypographyEntries,
  type RawColorOccurrence,
  type RawFontOccurrence,
  type ColorEntry,
  type TypographyEntry,
} from './design-tokens.js';

describe('rgbToHex', () => {
  it('конвертирует rgb(255, 255, 255) в #ffffff', () => {
    expect(rgbToHex('rgb(255, 255, 255)')).toBe('#ffffff');
  });

  it('конвертирует rgb(0, 0, 0) в #000000', () => {
    expect(rgbToHex('rgb(0, 0, 0)')).toBe('#000000');
  });

  it('конвертирует rgb(255, 87, 51) в #ff5733', () => {
    expect(rgbToHex('rgb(255, 87, 51)')).toBe('#ff5733');
  });

  it('конвертирует rgba с непрозрачностью 1 в HEX', () => {
    expect(rgbToHex('rgba(100, 149, 237, 1)')).toBe('#6495ed');
  });

  it('возвращает null для прозрачного цвета rgba(0, 0, 0, 0)', () => {
    expect(rgbToHex('rgba(0, 0, 0, 0)')).toBeNull();
  });

  it('возвращает null для rgba с alpha=0', () => {
    expect(rgbToHex('rgba(255, 255, 255, 0)')).toBeNull();
  });

  it('возвращает null для неизвестного формата', () => {
    expect(rgbToHex('transparent')).toBeNull();
    expect(rgbToHex('#ffffff')).toBeNull();
    expect(rgbToHex('')).toBeNull();
  });

  it('обрабатывает пробелы в значениях', () => {
    expect(rgbToHex('rgb(12, 34, 56)')).toBe('#0c2238');
  });

  it('дополняет однозначные hex значения нулём', () => {
    expect(rgbToHex('rgb(1, 2, 3)')).toBe('#010203');
  });
});

describe('parseFontFamily', () => {
  it('возвращает первый шрифт из списка', () => {
    expect(parseFontFamily('Inter, sans-serif')).toBe('Inter');
  });

  it('убирает кавычки из имени шрифта', () => {
    expect(parseFontFamily('"Open Sans", sans-serif')).toBe('Open Sans');
  });

  it('убирает одинарные кавычки', () => {
    expect(parseFontFamily("'Playfair Display', serif")).toBe('Playfair Display');
  });

  it('возвращает одиночный шрифт', () => {
    expect(parseFontFamily('Roboto')).toBe('Roboto');
  });

  it('убирает пробелы вокруг имени', () => {
    expect(parseFontFamily('  Lato  , serif')).toBe('Lato');
  });
});

describe('isGoogleFont', () => {
  it('распознаёт Inter как Google Font', () => {
    expect(isGoogleFont('Inter')).toBe(true);
  });

  it('распознаёт Roboto как Google Font', () => {
    expect(isGoogleFont('Roboto')).toBe(true);
  });

  it('распознаёт Montserrat как Google Font', () => {
    expect(isGoogleFont('Montserrat')).toBe(true);
  });

  it('возвращает false для системных шрифтов', () => {
    expect(isGoogleFont('Arial')).toBe(false);
    expect(isGoogleFont('Helvetica')).toBe(false);
    expect(isGoogleFont('sans-serif')).toBe(false);
    expect(isGoogleFont('serif')).toBe(false);
  });

  it('возвращает false для неизвестных шрифтов', () => {
    expect(isGoogleFont('MyCustomFont')).toBe(false);
  });
});

describe('generateNextFontCode', () => {
  it('генерирует код для Inter', () => {
    const code = generateNextFontCode('Inter', [400, 700]);
    expect(code).toContain("import { Inter } from 'next/font/google'");
    expect(code).toContain('const inter = Inter({');
    expect(code).toContain("subsets: ['latin']");
    expect(code).toContain("weight: ['400', '700']");
  });

  it('генерирует корректный идентификатор для многословного шрифта', () => {
    const code = generateNextFontCode('Open Sans', [400, 600]);
    expect(code).toContain("import { Open_Sans } from 'next/font/google'");
    expect(code).toContain('const openSans = Open_Sans({');
  });

  it('генерирует корректный идентификатор для Playfair Display', () => {
    const code = generateNextFontCode('Playfair Display', [400]);
    expect(code).toContain("import { Playfair_Display } from 'next/font/google'");
    expect(code).toContain('const playfairDisplay = Playfair_Display({');
  });

  it('сортирует веса по возрастанию', () => {
    const code = generateNextFontCode('Roboto', [700, 400, 500]);
    expect(code).toContain("weight: ['400', '500', '700']");
  });

  it('генерирует код с одним весом', () => {
    const code = generateNextFontCode('Lato', [400]);
    expect(code).toContain("weight: ['400']");
  });
});

describe('normalizeColorOccurrences', () => {
  it('конвертирует RGB цвета в HEX', () => {
    const raw: RawColorOccurrence[] = [
      { value: 'rgb(255, 255, 255)', context: 'background-color', count: 5 },
    ];
    const result = normalizeColorOccurrences(raw);
    expect(result).toHaveLength(1);
    expect(result[0]!.hex).toBe('#ffffff');
  });

  it('агрегирует счётчики для одинаковых цветов из разных контекстов', () => {
    const raw: RawColorOccurrence[] = [
      { value: 'rgb(0, 0, 0)', context: 'color', count: 10 },
      { value: 'rgb(0, 0, 0)', context: 'background-color', count: 3 },
    ];
    const result = normalizeColorOccurrences(raw);
    expect(result).toHaveLength(1);
    expect(result[0]!.count).toBe(13);
    expect(result[0]!.contexts).toContain('color');
    expect(result[0]!.contexts).toContain('background-color');
  });

  it('агрегирует счётчики для одинаковых цветов и контекстов', () => {
    const raw: RawColorOccurrence[] = [
      { value: 'rgb(255, 0, 0)', context: 'color', count: 5 },
      { value: 'rgb(255, 0, 0)', context: 'color', count: 3 },
    ];
    const result = normalizeColorOccurrences(raw);
    expect(result).toHaveLength(1);
    expect(result[0]!.count).toBe(8);
    expect(result[0]!.contexts).toHaveLength(1);
  });

  it('пропускает прозрачные цвета', () => {
    const raw: RawColorOccurrence[] = [
      { value: 'rgba(0, 0, 0, 0)', context: 'background-color', count: 100 },
      { value: 'rgb(255, 0, 0)', context: 'color', count: 5 },
    ];
    const result = normalizeColorOccurrences(raw);
    expect(result).toHaveLength(1);
    expect(result[0]!.hex).toBe('#ff0000');
  });

  it('сортирует по частоте (descending)', () => {
    const raw: RawColorOccurrence[] = [
      { value: 'rgb(255, 0, 0)', context: 'color', count: 5 },
      { value: 'rgb(0, 0, 255)', context: 'color', count: 20 },
      { value: 'rgb(0, 255, 0)', context: 'color', count: 10 },
    ];
    const result = normalizeColorOccurrences(raw);
    expect(result[0]!.hex).toBe('#0000ff');
    expect(result[1]!.hex).toBe('#00ff00');
    expect(result[2]!.hex).toBe('#ff0000');
  });

  it('возвращает пустой массив для пустого входа', () => {
    expect(normalizeColorOccurrences([])).toHaveLength(0);
  });

  it('пропускает невалидные цвета', () => {
    const raw: RawColorOccurrence[] = [
      { value: 'transparent', context: 'color', count: 5 },
      { value: '#ffffff', context: 'color', count: 5 },
    ];
    expect(normalizeColorOccurrences(raw)).toHaveLength(0);
  });
});

describe('mergeColorEntries', () => {
  it('объединяет цвета из разных страниц', () => {
    const page1: ColorEntry[] = [
      { hex: '#ffffff', count: 5, contexts: ['background-color'] },
      { hex: '#000000', count: 10, contexts: ['color'] },
    ];
    const page2: ColorEntry[] = [
      { hex: '#ffffff', count: 3, contexts: ['color'] },
      { hex: '#ff0000', count: 7, contexts: ['border-color'] },
    ];
    const result = mergeColorEntries([page1, page2]);
    expect(result).toHaveLength(3);
    const white = result.find(c => c.hex === '#ffffff');
    expect(white!.count).toBe(8);
    expect(white!.contexts).toContain('background-color');
    expect(white!.contexts).toContain('color');
  });

  it('сортирует итог по частоте', () => {
    const page1: ColorEntry[] = [{ hex: '#ff0000', count: 2, contexts: ['color'] }];
    const page2: ColorEntry[] = [{ hex: '#0000ff', count: 10, contexts: ['color'] }];
    const result = mergeColorEntries([page1, page2]);
    expect(result[0]!.hex).toBe('#0000ff');
  });

  it('возвращает пустой массив для пустого входа', () => {
    expect(mergeColorEntries([])).toHaveLength(0);
    expect(mergeColorEntries([[]])).toHaveLength(0);
  });
});

describe('normalizeTypography', () => {
  it('извлекает шрифт из raw данных', () => {
    const raw: RawFontOccurrence[] = [
      { family: 'Inter, sans-serif', size: '16px', weight: '400', lineHeight: '24px' },
    ];
    const result = normalizeTypography(raw);
    expect(result).toHaveLength(1);
    expect(result[0]!.fontFamily).toBe('Inter');
    expect(result[0]!.sizes).toContain('16px');
    expect(result[0]!.weights).toContain(400);
    expect(result[0]!.lineHeights).toContain('24px');
  });

  it('определяет Google Fonts', () => {
    const raw: RawFontOccurrence[] = [
      { family: 'Roboto, sans-serif', size: '14px', weight: '400', lineHeight: 'normal' },
    ];
    const result = normalizeTypography(raw);
    expect(result[0]!.isGoogleFont).toBe(true);
    expect(result[0]!.nextFontCode).not.toBeNull();
  });

  it('помечает не-Google шрифты без nextFontCode', () => {
    const raw: RawFontOccurrence[] = [
      { family: 'Arial, sans-serif', size: '16px', weight: '400', lineHeight: '1.5' },
    ];
    const result = normalizeTypography(raw);
    expect(result[0]!.isGoogleFont).toBe(false);
    expect(result[0]!.nextFontCode).toBeNull();
  });

  it('дедуплицирует одинаковые шрифты и объединяет размеры', () => {
    const raw: RawFontOccurrence[] = [
      { family: 'Inter', size: '14px', weight: '400', lineHeight: '20px' },
      { family: 'Inter', size: '16px', weight: '400', lineHeight: '24px' },
      { family: 'Inter', size: '24px', weight: '700', lineHeight: '32px' },
    ];
    const result = normalizeTypography(raw);
    expect(result).toHaveLength(1);
    expect(result[0]!.sizes).toContain('14px');
    expect(result[0]!.sizes).toContain('16px');
    expect(result[0]!.sizes).toContain('24px');
    expect(result[0]!.weights).toContain(400);
    expect(result[0]!.weights).toContain(700);
  });

  it('пропускает lineHeight=normal', () => {
    const raw: RawFontOccurrence[] = [
      { family: 'Inter', size: '16px', weight: '400', lineHeight: 'normal' },
    ];
    const result = normalizeTypography(raw);
    expect(result[0]!.lineHeights).toHaveLength(0);
  });

  it('пропускает шрифты с inherit/initial/unset', () => {
    const raw: RawFontOccurrence[] = [
      { family: 'inherit', size: '16px', weight: '400', lineHeight: '1.5' },
      { family: 'initial', size: '16px', weight: '400', lineHeight: '1.5' },
    ];
    expect(normalizeTypography(raw)).toHaveLength(0);
  });

  it('возвращает пустой массив для пустого входа', () => {
    expect(normalizeTypography([])).toHaveLength(0);
  });
});

describe('mergeTypographyEntries', () => {
  it('объединяет шрифты из разных страниц', () => {
    const page1: TypographyEntry[] = [
      {
        fontFamily: 'Inter',
        isGoogleFont: true,
        sizes: ['14px', '16px'],
        weights: [400],
        lineHeights: ['20px'],
        nextFontCode: null,
      },
    ];
    const page2: TypographyEntry[] = [
      {
        fontFamily: 'Inter',
        isGoogleFont: true,
        sizes: ['24px'],
        weights: [700],
        lineHeights: ['32px'],
        nextFontCode: null,
      },
    ];
    const result = mergeTypographyEntries([page1, page2]);
    expect(result).toHaveLength(1);
    expect(result[0]!.sizes).toContain('14px');
    expect(result[0]!.sizes).toContain('16px');
    expect(result[0]!.sizes).toContain('24px');
    expect(result[0]!.weights).toContain(400);
    expect(result[0]!.weights).toContain(700);
  });

  it('объединяет разные шрифты из разных страниц', () => {
    const page1: TypographyEntry[] = [
      { fontFamily: 'Inter', isGoogleFont: true, sizes: ['16px'], weights: [400], lineHeights: [], nextFontCode: null },
    ];
    const page2: TypographyEntry[] = [
      { fontFamily: 'Roboto', isGoogleFont: true, sizes: ['14px'], weights: [400], lineHeights: [], nextFontCode: null },
    ];
    const result = mergeTypographyEntries([page1, page2]);
    expect(result).toHaveLength(2);
  });

  it('обновляет nextFontCode с учётом всех весов', () => {
    const page1: TypographyEntry[] = [
      { fontFamily: 'Inter', isGoogleFont: true, sizes: ['16px'], weights: [400], lineHeights: [], nextFontCode: null },
    ];
    const page2: TypographyEntry[] = [
      { fontFamily: 'Inter', isGoogleFont: true, sizes: ['24px'], weights: [700], lineHeights: [], nextFontCode: null },
    ];
    const result = mergeTypographyEntries([page1, page2]);
    expect(result[0]!.nextFontCode).toContain("weight: ['400', '700']");
  });

  it('возвращает пустой массив для пустого входа', () => {
    expect(mergeTypographyEntries([])).toHaveLength(0);
    expect(mergeTypographyEntries([[]])).toHaveLength(0);
  });
});
