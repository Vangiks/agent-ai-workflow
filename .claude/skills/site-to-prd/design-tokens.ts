// Чистые функции для извлечения и обработки design tokens (цвета и типографика)

export interface RawColorOccurrence {
  value: string;   // CSS цвет в формате rgb/rgba, напр. "rgb(255, 255, 255)"
  context: string; // CSS свойство, напр. "color", "background-color", "border-color"
  count: number;
}

export interface RawFontOccurrence {
  family: string;     // CSS font-family, напр. "Inter, sans-serif"
  size: string;       // CSS font-size, напр. "16px"
  weight: string;     // CSS font-weight, напр. "400"
  lineHeight: string; // CSS line-height, напр. "24px" или "normal"
}

export interface ColorEntry {
  hex: string;
  count: number;
  contexts: string[];
}

export interface TypographyEntry {
  fontFamily: string;
  isGoogleFont: boolean;
  sizes: string[];
  weights: number[];
  lineHeights: string[];
  nextFontCode: string | null;
}

// Популярные Google Fonts для определения принадлежности
export const GOOGLE_FONTS = new Set([
  'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Source Sans Pro',
  'Raleway', 'PT Sans', 'Playfair Display', 'Merriweather', 'Nunito',
  'Ubuntu', 'Rubik', 'Poppins', 'Inter', 'Oswald', 'Noto Sans',
  'Noto Serif', 'PT Serif', 'Fira Sans', 'Josefin Sans',
  'Mulish', 'Quicksand', 'Titillium Web', 'Work Sans', 'Comfortaa',
  'Dancing Script', 'Pacifico', 'Lobster', 'Anton', 'Bebas Neue',
  'Exo', 'Exo 2', 'Cabin', 'Oxygen', 'Barlow', 'Jost',
  'DM Sans', 'Space Grotesk', 'Outfit', 'Plus Jakarta Sans',
  'Manrope', 'Sora', 'IBM Plex Sans', 'IBM Plex Mono',
  'Source Code Pro', 'Noto Sans JP', 'Nunito Sans', 'Libre Baskerville',
  'Crimson Text', 'Karla', 'Hind', 'Arimo', 'Dosis',
]);

/**
 * Конвертирует CSS rgb/rgba строку в HEX формат.
 * Возвращает null для прозрачных или нераспознанных цветов.
 */
export function rgbToHex(rgb: string): string | null {
  const match = rgb.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)$/);
  if (!match) return null;

  const r = parseInt(match[1]!, 10);
  const g = parseInt(match[2]!, 10);
  const b = parseInt(match[3]!, 10);
  const a = match[4] !== undefined ? parseFloat(match[4]) : 1;

  // Пропускаем полностью прозрачные цвета
  if (a === 0) return null;

  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

/**
 * Извлекает первое семейство шрифтов из CSS font-family строки.
 * Убирает кавычки и лишние пробелы.
 */
export function parseFontFamily(fontFamilyStr: string): string {
  const first = fontFamilyStr.split(',')[0]!.trim();
  return first.replace(/^["']|["']$/g, '');
}

/**
 * Проверяет, является ли шрифт Google Font.
 */
export function isGoogleFont(fontFamily: string): boolean {
  return GOOGLE_FONTS.has(fontFamily);
}

/**
 * Генерирует готовый код подключения шрифта через next/font/google.
 */
export function generateNextFontCode(fontFamily: string, weights: number[]): string {
  // Import name: пробелы заменяем на подчёркивания (Open Sans → Open_Sans)
  const importName = fontFamily.replace(/\s+/g, '_');

  // Variable name: camelCase (Open Sans → openSans)
  const varName = fontFamily
    .split(/\s+/)
    .map((word, i) =>
      i === 0
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join('');

  const sortedWeights = [...weights].sort((a, b) => a - b);
  const weightStrs = sortedWeights.map(w => `'${w}'`).join(', ');

  return [
    `import { ${importName} } from 'next/font/google'`,
    '',
    `export const ${varName} = ${importName}({`,
    `  subsets: ['latin'],`,
    `  weight: [${weightStrs}],`,
    `})`,
  ].join('\n');
}

/**
 * Нормализует сырые данные о цветах в массив ColorEntry.
 * Конвертирует RGB → HEX, агрегирует счётчики, сортирует по частоте.
 */
export function normalizeColorOccurrences(rawColors: RawColorOccurrence[]): ColorEntry[] {
  const map = new Map<string, { count: number; contexts: Set<string> }>();

  for (const raw of rawColors) {
    const hex = rgbToHex(raw.value);
    if (!hex) continue;

    const existing = map.get(hex);
    if (existing) {
      existing.count += raw.count;
      existing.contexts.add(raw.context);
    } else {
      map.set(hex, { count: raw.count, contexts: new Set([raw.context]) });
    }
  }

  return Array.from(map.entries())
    .map(([hex, { count, contexts }]) => ({
      hex,
      count,
      contexts: Array.from(contexts).sort(),
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Объединяет массивы ColorEntry из разных страниц.
 * Суммирует счётчики, объединяет контексты, сортирует по частоте.
 */
export function mergeColorEntries(pages: ColorEntry[][]): ColorEntry[] {
  const map = new Map<string, { count: number; contexts: Set<string> }>();

  for (const pageColors of pages) {
    for (const entry of pageColors) {
      const existing = map.get(entry.hex);
      if (existing) {
        existing.count += entry.count;
        for (const ctx of entry.contexts) existing.contexts.add(ctx);
      } else {
        map.set(entry.hex, {
          count: entry.count,
          contexts: new Set(entry.contexts),
        });
      }
    }
  }

  return Array.from(map.entries())
    .map(([hex, { count, contexts }]) => ({
      hex,
      count,
      contexts: Array.from(contexts).sort(),
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Нормализует сырые данные о шрифтах в массив TypographyEntry.
 * Дедуплицирует шрифты, объединяет размеры/веса/line-height.
 */
export function normalizeTypography(rawFonts: RawFontOccurrence[]): TypographyEntry[] {
  const SKIP_FAMILIES = new Set(['inherit', 'initial', 'unset', 'revert']);

  const map = new Map<
    string,
    { sizes: Set<string>; weights: Set<number>; lineHeights: Set<string> }
  >();

  for (const raw of rawFonts) {
    const family = parseFontFamily(raw.family);
    if (!family || SKIP_FAMILIES.has(family)) continue;

    const existing = map.get(family);
    const weight = parseInt(raw.weight, 10);
    const validWeight = !isNaN(weight) ? weight : null;
    const validLineHeight =
      raw.lineHeight && raw.lineHeight !== 'normal' ? raw.lineHeight : null;

    if (existing) {
      if (raw.size) existing.sizes.add(raw.size);
      if (validWeight !== null) existing.weights.add(validWeight);
      if (validLineHeight) existing.lineHeights.add(validLineHeight);
    } else {
      const sizes = new Set<string>(raw.size ? [raw.size] : []);
      const weights = new Set<number>(validWeight !== null ? [validWeight] : []);
      const lineHeights = new Set<string>(validLineHeight ? [validLineHeight] : []);
      map.set(family, { sizes, weights, lineHeights });
    }
  }

  return Array.from(map.entries()).map(([fontFamily, { sizes, weights, lineHeights }]) => {
    const isGoogle = isGoogleFont(fontFamily);
    const weightsArr = Array.from(weights).sort((a, b) => a - b);

    return {
      fontFamily,
      isGoogleFont: isGoogle,
      sizes: Array.from(sizes).sort(),
      weights: weightsArr,
      lineHeights: Array.from(lineHeights).sort(),
      nextFontCode: isGoogle ? generateNextFontCode(fontFamily, weightsArr) : null,
    };
  });
}

/**
 * Объединяет массивы TypographyEntry из разных страниц.
 * Дедуплицирует шрифты, обновляет nextFontCode с учётом всех весов.
 */
export function mergeTypographyEntries(pages: TypographyEntry[][]): TypographyEntry[] {
  const map = new Map<
    string,
    {
      sizes: Set<string>;
      weights: Set<number>;
      lineHeights: Set<string>;
      isGoogleFont: boolean;
    }
  >();

  for (const pageTypography of pages) {
    for (const entry of pageTypography) {
      const existing = map.get(entry.fontFamily);
      if (existing) {
        for (const s of entry.sizes) existing.sizes.add(s);
        for (const w of entry.weights) existing.weights.add(w);
        for (const lh of entry.lineHeights) existing.lineHeights.add(lh);
      } else {
        map.set(entry.fontFamily, {
          sizes: new Set(entry.sizes),
          weights: new Set(entry.weights),
          lineHeights: new Set(entry.lineHeights),
          isGoogleFont: entry.isGoogleFont,
        });
      }
    }
  }

  return Array.from(map.entries()).map(([fontFamily, { sizes, weights, lineHeights, isGoogleFont }]) => {
    const weightsArr = Array.from(weights).sort((a, b) => a - b);
    return {
      fontFamily,
      isGoogleFont,
      sizes: Array.from(sizes).sort(),
      weights: weightsArr,
      lineHeights: Array.from(lineHeights).sort(),
      nextFontCode: isGoogleFont ? generateNextFontCode(fontFamily, weightsArr) : null,
    };
  });
}
