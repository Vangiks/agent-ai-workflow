import { chromium, type Page } from 'playwright';
import { mkdir, writeFile } from 'fs/promises';
import { resolve, join } from 'path';

export interface ParsedArgs {
  url: string;
  output: string;
  depth: number;
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

  const depth = flags['depth'] !== undefined ? parseInt(flags['depth'], 10) : 1;
  if (isNaN(depth) || depth < 1) {
    throw new Error('--depth должен быть положительным целым числом');
  }

  return {
    url,
    output: flags['output'],
    depth,
  };
}

export function getImageFilename(url: string): string {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    const segments = pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    if (last && last.includes('.')) {
      return last;
    }
    if (last) {
      return last;
    }
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

async function extractInternalLinks(page: Page, origin: string): Promise<string[]> {
  const links = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a[href]'))
      .map(a => (a as HTMLAnchorElement).href)
      .filter(href => href && !href.startsWith('javascript:') && !href.startsWith('mailto:')),
  );

  return links.filter(link => {
    try {
      return new URL(link).origin === origin;
    } catch {
      return false;
    }
  });
}

function resolveFilenameConflict(url: string, usedFilenames: Set<string>): string {
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputDir = resolve(args.output);
  const assetsDir = join(outputDir, 'assets');

  await mkdir(outputDir, { recursive: true });
  await mkdir(assetsDir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const origin = new URL(args.url).origin;
  const visited = new Set<string>();
  const allPageMetas: MetaData[] = [];
  let allRawImages: RawImage[] = [];

  let currentLevel = [args.url];
  visited.add(args.url);
  let isFirstPage = true;

  for (let currentDepth = 0; currentDepth < args.depth; currentDepth++) {
    const nextLevel: string[] = [];

    for (const url of currentLevel) {
      const page = await context.newPage();
      console.log(`Загружаю: ${url}`);
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      if (isFirstPage) {
        const screenshotPath = join(outputDir, 'desktop.png');
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log(`Скриншот сохранён: ${screenshotPath}`);
        isFirstPage = false;
      }

      const rawMeta = await extractMetaFromPage(page);
      allPageMetas.push(buildMetaData(rawMeta));

      const rawImages = await extractImagesFromPage(page);
      allRawImages = allRawImages.concat(rawImages);

      if (currentDepth < args.depth - 1) {
        const links = await extractInternalLinks(page, origin);
        for (const link of links) {
          const normalized = link.split('#')[0]!;
          if (normalized && !visited.has(normalized)) {
            visited.add(normalized);
            nextLevel.push(normalized);
          }
        }
      }

      await page.close();
    }

    currentLevel = nextLevel;
    if (currentLevel.length === 0) break;
  }

  const dedupedImages = deduplicateImages(allRawImages);
  console.log(`Скачиваю ${dedupedImages.length} изображений...`);
  const imageEntries = await downloadImages(dedupedImages, assetsDir);

  const mergedMeta = mergeMeta(allPageMetas);

  await writeFile(join(outputDir, 'images.json'), JSON.stringify(imageEntries, null, 2));
  console.log(`images.json сохранён: ${join(outputDir, 'images.json')}`);

  await writeFile(join(outputDir, 'meta.json'), JSON.stringify(mergedMeta, null, 2));
  console.log(`meta.json сохранён: ${join(outputDir, 'meta.json')}`);

  await browser.close();
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
