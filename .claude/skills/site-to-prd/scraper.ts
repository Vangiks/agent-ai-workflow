import { chromium } from 'playwright';
import { mkdir, writeFile } from 'fs/promises';
import { resolve, join } from 'path';

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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputDir = resolve(args.output);

  await mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const pages = await bfsCrawl(args.url, args.depth, async (url) => {
    const page = await context.newPage();
    console.log(`Загружаю: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    const title = await page.title();
    const hrefs = await page.$$eval('a[href]', (anchors) =>
      anchors.map((a) => (a as HTMLAnchorElement).href),
    );
    const links = extractInternalLinks(url, hrefs);

    await page.close();
    return { title, links };
  });

  // Take screenshot of start page
  const startPage = await context.newPage();
  await startPage.goto(args.url, { waitUntil: 'networkidle', timeout: 30000 });
  const screenshotPath = join(outputDir, 'desktop.png');
  await startPage.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`Скриншот сохранён: ${screenshotPath}`);
  await startPage.close();

  // Save pages.json
  const pagesJsonPath = join(outputDir, 'pages.json');
  await writeFile(pagesJsonPath, JSON.stringify(pages, null, 2), 'utf-8');
  console.log(`pages.json сохранён: ${pagesJsonPath} (${pages.length} страниц)`);

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
