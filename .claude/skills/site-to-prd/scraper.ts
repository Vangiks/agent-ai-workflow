import { chromium, type Page } from 'playwright';
import { mkdir } from 'fs/promises';
import { resolve, join } from 'path';

export interface ParsedArgs {
  url: string;
  output: string;
  depth: number;
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

export function urlToSlug(url: string): string {
  const parsed = new URL(url);
  const base = parsed.hostname;
  const path = parsed.pathname.replace(/\/$/, '');
  if (!path) return base;
  const pathSlug = path.replace(/\//g, '-').replace(/^-/, '');
  return `${base}-${pathSlug}`;
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputDir = resolve(args.output);
  const screenshotsDir = join(outputDir, 'screenshots');

  await mkdir(screenshotsDir, { recursive: true });

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
