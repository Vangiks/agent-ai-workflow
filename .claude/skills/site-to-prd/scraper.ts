import {
  normalizeColorOccurrences,
  mergeColorEntries,
  normalizeTypography,
  mergeTypographyEntries,
  type RawColorOccurrence,
  type RawFontOccurrence,
} from './design-tokens.js';
import { chromium, type Page } from 'playwright';
import { mkdir, writeFile } from 'fs/promises';
import { resolve, join } from 'path';
import { buildSectionTree, type RawSection, type PageData } from './page-analyzer.js';

export interface ParsedArgs {
  url: string;
  output: string;
  depth: number;
}

export interface PageResult {
  url: string;
  depth: number;
  title: string;
}

export interface RawImage {
  src: string;
  alt: string;
  width: number | null;
  height: number | null;
}

export interface ImageEntry {
  originalUrl: string;
  localPath: string;
  alt: string;
  width: number | null;
  height: number | null;
}

export interface OgData {
  [key: string]: string;
}

export interface MetaData {
  title: string | null;
  description: string | null;
  keywords: string | null;
  viewport: string | null;
  og: OgData;
  favicon: string | null;
  allMeta: Record<string, string>;
}

export interface RawPageMeta {
  title: string | null;
  metaTags: Array<{ name: string | null; property: string | null; content: string | null }>;
  links: Array<{ rel: string | null; href: string | null }>;
}

const KNOWN_FLAGS = new Set(['--output', '--depth']);

export function parseArgs(args: string[]): ParsedArgs {
  const flags: Record<string, string> = {};
  let url: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg.startsWith('--')) {
      if (!KNOWN_FLAGS.has(arg)) {
        throw new Error(`Неизвестный флаг: ${arg}`);
      }
      const next = args[i + 1];
      if (!next || next.startsWith('--')) {
        throw new Error(`Флаг ${arg} требует значение`);
      }
      flags[arg.slice(2)] = next;
      i++;
    } else {
      url = arg;
    }
  }

  if (!url) {
    throw new Error('Необходимо указать URL');
  }
  if (!flags['output']) {
    throw new Error('Необходимо указать флаг --output');
  }

  const depth = flags['depth'] !== undefined ? parseInt(flags['depth'], 10) : 2;
  if (isNaN(depth) || depth < 1) {
    throw new Error('--depth должен быть положительным целым числом');
  }

  return {
    url,
    output: flags['output'],
    depth,
  };
}

export function extractInternalLinks(baseUrl: string, hrefs: string[]): string[] {
  const base = new URL(baseUrl);
  const seen = new Set<string>();
  const result: string[] = [];

  for (const href of hrefs) {
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) {
      continue;
    }

    let resolved: URL;
    try {
      resolved = new URL(href, base);
    } catch {
      continue;
    }

    if (resolved.origin !== base.origin) {
      continue;
    }

    // Remove fragment
    resolved.hash = '';
    const normalized = resolved.toString();

    if (!seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }

  return result;
}

export async function bfsCrawl(
  startUrl: string,
  maxDepth: number,
  fetchPage: (url: string) => Promise<{ title: string; links: string[] }>,
): Promise<PageResult[]> {
  const visited = new Set<string>();
  const pages: PageResult[] = [];
  const queue: Array<{ url: string; depth: number }> = [{ url: startUrl, depth: 1 }];

  visited.add(startUrl);

  while (queue.length > 0) {
    const item = queue.shift()!;
    const { url, depth } = item;

    const { title, links } = await fetchPage(url);
    pages.push({ url, depth, title });

    if (depth < maxDepth) {
      for (const link of links) {
        if (!visited.has(link)) {
          visited.add(link);
          queue.push({ url: link, depth: depth + 1 });
        }
      }
    }
  }

  return pages;
}

export function urlToSlug(url: string): string {
  const parsed = new URL(url);
  const base = parsed.hostname;
  const path = parsed.pathname.replace(/\/$/, '');
  if (!path) return base;
  const pathSlug = path.replace(/\//g, '-').replace(/^-/, '');
  return `${base}-${pathSlug}`;
}

export function getImageFilename(url: string): string {
  try {
    const segments = new URL(url).pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    if (last) return last;
  } catch {
    // not a valid URL
  }
  return 'image';
}

export function buildMetaData(rawMeta: RawPageMeta): MetaData {
  const allMeta: Record<string, string> = {};
  const og: OgData = {};
  let description: string | null = null;
  let keywords: string | null = null;
  let viewport: string | null = null;
  let favicon: string | null = null;

  for (const tag of rawMeta.metaTags) {
    const content = tag.content;
    if (!content) continue;

    if (tag.name) {
      allMeta[tag.name] = content;
      const nameLower = tag.name.toLowerCase();
      if (nameLower === 'description') description = content;
      if (nameLower === 'keywords') keywords = content;
      if (nameLower === 'viewport') viewport = content;
    }

    if (tag.property) {
      allMeta[tag.property] = content;
      if (tag.property.startsWith('og:')) {
        og[tag.property] = content;
      }
    }
  }

  for (const link of rawMeta.links) {
    if (!link.rel || !link.href) continue;
    const rels = link.rel.toLowerCase().split(/\s+/);
    if (rels.some(r => r === 'icon' || r === 'shortcut')) {
      if (!favicon) favicon = link.href;
    }
  }

  return {
    title: rawMeta.title,
    description,
    keywords,
    viewport,
    og,
    favicon,
    allMeta,
  };
}

export function deduplicateImages(images: RawImage[]): RawImage[] {
  const seen = new Set<string>();
  return images.filter(img => {
    if (seen.has(img.src)) return false;
    seen.add(img.src);
    return true;
  });
}

export function mergeMeta(metas: MetaData[]): MetaData {
  if (metas.length === 0) {
    return {
      title: null,
      description: null,
      keywords: null,
      viewport: null,
      og: {},
      favicon: null,
      allMeta: {},
    };
  }

  const result: MetaData = {
    title: null,
    description: null,
    keywords: null,
    viewport: null,
    og: {},
    favicon: null,
    allMeta: {},
  };

  for (const meta of metas) {
    if (!result.title && meta.title) result.title = meta.title;
    if (!result.description && meta.description) result.description = meta.description;
    if (!result.keywords && meta.keywords) result.keywords = meta.keywords;
    if (!result.viewport && meta.viewport) result.viewport = meta.viewport;
    if (!result.favicon && meta.favicon) result.favicon = meta.favicon;

    for (const [key, value] of Object.entries(meta.og)) {
      if (!(key in result.og)) result.og[key] = value;
    }

    for (const [key, value] of Object.entries(meta.allMeta)) {
      if (!(key in result.allMeta)) result.allMeta[key] = value;
    }
  }

  return result;
}

export function resolveFilenameConflict(url: string, usedFilenames: Set<string>): string {
  const base = getImageFilename(url);
  if (!usedFilenames.has(base)) {
    usedFilenames.add(base);
    return base;
  }

  const dotIdx = base.lastIndexOf('.');
  const name = dotIdx >= 0 ? base.slice(0, dotIdx) : base;
  const ext = dotIdx >= 0 ? base.slice(dotIdx) : '';

  let counter = 1;
  let candidate = `${name}_${counter}${ext}`;
  while (usedFilenames.has(candidate)) {
    counter++;
    candidate = `${name}_${counter}${ext}`;
  }
  usedFilenames.add(candidate);
  return candidate;
}

async function autoScroll(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 200;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 50);
    });
  });
}

async function takeScreenshots(
  url: string,
  screenshotsDir: string,
): Promise<void> {
  const slug = urlToSlug(url);

  const viewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 375, height: 812 },
  ] as const;

  for (const viewport of viewports) {
    const browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    console.log(`Загружаю (${viewport.name}): ${url}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    await autoScroll(page);
    await page.waitForLoadState('networkidle');

    const screenshotPath = join(screenshotsDir, `${slug}-${viewport.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Скриншот сохранён: ${screenshotPath}`);

    await browser.close();
  }
}

/**
 * Извлекает секции Tilda из DOM страницы через Playwright evaluate.
 */
async function extractPageSections(
  page: Page,
): Promise<RawSection[]> {
  return page.evaluate(() => {
    const records = document.querySelectorAll('.t-rec');
    const results: Array<{
      tildaBlockId: string;
      classes: string[];
      tagName: string;
      childCount: number;
      hasImages: boolean;
      imageCount: number;
      hasVideo: boolean;
      hasForm: boolean;
      hasHeading: boolean;
      textLength: number;
    }> = [];

    records.forEach((el) => {
      const classes = Array.from(el.classList);
      const tildaBlockId =
        classes.find((cls) => /^t\d+$/.test(cls)) ?? '';

      results.push({
        tildaBlockId,
        classes,
        tagName: el.tagName.toLowerCase(),
        childCount: el.children.length,
        hasImages: el.querySelectorAll('img').length > 0,
        imageCount: el.querySelectorAll('img').length,
        hasVideo:
          el.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]')
            .length > 0,
        hasForm: el.querySelectorAll('form, input, textarea').length > 0,
        hasHeading:
          el.querySelectorAll('h1, h2, h3, h4, h5, h6').length > 0,
        textLength: (el.textContent ?? '').trim().length,
      });
    });

    return results;
  });
}

async function extractMetaFromPage(page: Page): Promise<RawPageMeta> {
  return page.evaluate(() => {
    const metaTags = Array.from(document.querySelectorAll('meta')).map(meta => ({
      name: meta.getAttribute('name'),
      property: meta.getAttribute('property'),
      content: meta.getAttribute('content'),
    }));

    const links = Array.from(document.querySelectorAll('link')).map(link => ({
      rel: link.getAttribute('rel'),
      href: link.getAttribute('href'),
    }));

    return {
      title: document.title || null,
      metaTags,
      links,
    };
  });
}

async function extractImagesFromPage(page: Page): Promise<RawImage[]> {
  return page.evaluate(() => {
    return Array.from(document.querySelectorAll('img'))
      .map(img => ({
        src: img.src,
        alt: img.alt || '',
        width: img.naturalWidth > 0 ? img.naturalWidth : img.width > 0 ? img.width : null,
        height: img.naturalHeight > 0 ? img.naturalHeight : img.height > 0 ? img.height : null,
      }))
      .filter(img => img.src && !img.src.startsWith('data:'));
  });
}

async function downloadImages(images: RawImage[], assetsDir: string): Promise<ImageEntry[]> {
  const entries: ImageEntry[] = [];
  const usedFilenames = new Set<string>();

  for (const image of images) {
    const filename = resolveFilenameConflict(image.src, usedFilenames);
    const localPath = join(assetsDir, filename);
    const relativePath = join('assets', filename);

    try {
      const response = await fetch(image.src);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const buffer = Buffer.from(await response.arrayBuffer());
      await writeFile(localPath, buffer);

      entries.push({
        originalUrl: image.src,
        localPath: relativePath,
        alt: image.alt,
        width: image.width,
        height: image.height,
      });
    } catch (err) {
      console.warn(`Не удалось скачать изображение ${image.src}: ${err}`);
    }
  }

  return entries;
}


interface RawDesignTokensFromPage {
  colors: RawColorOccurrence[];
  fonts: RawFontOccurrence[];
}

/**
 * Извлекает computed CSS цвета и типографику со страницы через Playwright evaluate.
 * Собирает уникальные computed styles всех элементов, дедуплицирует в браузере.
 */
async function extractDesignTokensFromPage(page: Page): Promise<RawDesignTokensFromPage> {
  return page.evaluate(() => {
    const COLOR_PROPS = [
      { prop: 'color', context: 'color' },
      { prop: 'backgroundColor', context: 'background-color' },
      { prop: 'borderTopColor', context: 'border-color' },
    ];

    const colorMap = new Map<string, number>(); // "value|context" -> count
    const fontKeys = new Set<string>();
    const fontEntries: Array<{ family: string; size: string; weight: string; lineHeight: string }> = [];

    const elements = document.querySelectorAll('*');
    for (const el of Array.from(elements)) {
      const style = window.getComputedStyle(el);

      // Цвета
      for (const { prop, context } of COLOR_PROPS) {
        const value = style[prop as keyof CSSStyleDeclaration] as string;
        if (!value || value === 'rgba(0, 0, 0, 0)' || value === 'transparent') continue;
        const key = `${value}|${context}`;
        colorMap.set(key, (colorMap.get(key) ?? 0) + 1);
      }

      // Типографика
      const family = style.fontFamily;
      const size = style.fontSize;
      const weight = style.fontWeight;
      const lineHeight = style.lineHeight;
      if (family) {
        const fontKey = `${family}|${size}|${weight}|${lineHeight}`;
        if (!fontKeys.has(fontKey)) {
          fontKeys.add(fontKey);
          fontEntries.push({ family, size, weight, lineHeight });
        }
      }
    }

    const colors = Array.from(colorMap.entries()).map(([key, count]) => {
      const sepIdx = key.indexOf('|');
      return { value: key.slice(0, sepIdx), context: key.slice(sepIdx + 1), count };
    });

    return { colors, fonts: fontEntries };
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputDir = resolve(args.output);
  const screenshotsDir = join(outputDir, 'screenshots');
  const assetsDir = join(outputDir, 'assets');

  await mkdir(screenshotsDir, { recursive: true });
  await mkdir(assetsDir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const allPageMetas: MetaData[] = [];
  let allRawImages: RawImage[] = [];
  let allRawColors: RawColorOccurrence[] = [];
  let allRawFonts: RawFontOccurrence[] = [];

  const crawlResults = await bfsCrawl(args.url, args.depth, async (url) => {
    const page = await context.newPage();
    console.log(`Загружаю: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    const title = await page.title();
    const hrefs = await page.$$eval('a[href]', (anchors) =>
      anchors.map((a) => (a as HTMLAnchorElement).href),
    );
    const links = extractInternalLinks(url, hrefs);

    const rawMeta = await extractMetaFromPage(page);
    allPageMetas.push(buildMetaData(rawMeta));

    const rawImages = await extractImagesFromPage(page);
    allRawImages = allRawImages.concat(rawImages);

    const rawTokens = await extractDesignTokensFromPage(page);
    allRawColors = allRawColors.concat(rawTokens.colors);
    allRawFonts = allRawFonts.concat(rawTokens.fonts);

    await page.close();
    return { title, links };
  });

  // Анализируем DOM секций для стартовой страницы
  const startPage = await context.newPage();
  await startPage.goto(args.url, { waitUntil: 'networkidle', timeout: 30000 });
  const startTitle = await startPage.title();
  const rawSections = await extractPageSections(startPage);
  const sections = buildSectionTree(rawSections);
  await startPage.close();

  await browser.close();

  console.log(`Обнаружено секций: ${sections.length}`);

  // Формируем pages.json в расширенном формате с секциями для стартовой страницы
  const pagesData: PageData[] = crawlResults.map((p) => {
    if (p.url === args.url) {
      return { url: p.url, title: startTitle, sections };
    }
    return { url: p.url, title: p.title, sections: [] };
  });

  const pagesJsonPath = join(outputDir, 'pages.json');
  await writeFile(pagesJsonPath, JSON.stringify(pagesData, null, 2), 'utf-8');
  console.log(`pages.json сохранён: ${pagesJsonPath} (${pagesData.length} страниц)`);

  // Скачиваем изображения
  const dedupedImages = deduplicateImages(allRawImages);
  console.log(`Скачиваю ${dedupedImages.length} изображений...`);
  const imageEntries = await downloadImages(dedupedImages, assetsDir);
  await writeFile(join(outputDir, 'images.json'), JSON.stringify(imageEntries, null, 2));
  console.log(`images.json сохранён: ${join(outputDir, 'images.json')}`);

  // Сохраняем meta.json
  const mergedMeta = mergeMeta(allPageMetas);
  await writeFile(join(outputDir, 'meta.json'), JSON.stringify(mergedMeta, null, 2));
  console.log(`meta.json сохранён: ${join(outputDir, 'meta.json')}`);

  // Сохраняем colors.json
  const colorEntries = normalizeColorOccurrences(allRawColors);
  const mergedColors = mergeColorEntries([colorEntries]);
  await writeFile(join(outputDir, 'colors.json'), JSON.stringify(mergedColors, null, 2));
  console.log(`colors.json сохранён: ${join(outputDir, 'colors.json')} (${mergedColors.length} цветов)`);

  // Сохраняем typography.json
  const typographyEntries = normalizeTypography(allRawFonts);
  const mergedTypography = mergeTypographyEntries([typographyEntries]);
  await writeFile(join(outputDir, 'typography.json'), JSON.stringify(mergedTypography, null, 2));
  console.log(`typography.json сохранён: ${join(outputDir, 'typography.json')} (${mergedTypography.length} шрифтов)`);

  // Делаем responsive скриншоты стартовой страницы
  await takeScreenshots(args.url, screenshotsDir);
}

// Запускаем main только при прямом вызове скрипта
if (
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].endsWith('scraper.ts') ||
    process.argv[1].endsWith('scraper.js'))
) {
  main().catch((err: unknown) => {
    console.error('Ошибка:', err);
    process.exit(1);
  });
}
