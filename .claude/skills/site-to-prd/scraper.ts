import { chromium } from 'playwright';
import { mkdir, writeFile } from 'fs/promises';
import { resolve, join } from 'path';
import { buildSectionTree, extractTildaBlockId, type RawSection, type PageData } from './page-analyzer.js';

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

/**
 * Извлекает секции Tilda из DOM страницы через Playwright evaluate.
 */
async function extractPageSections(
  page: import('playwright').Page,
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
      // Ищем класс вида t{число}
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

  const page = await context.newPage();

  console.log(`Загружаю: ${args.url}`);
  await page.goto(args.url, { waitUntil: 'networkidle', timeout: 30000 });

  const screenshotPath = join(outputDir, 'desktop.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`Скриншот сохранён: ${screenshotPath}`);

  // Анализируем DOM секций
  const title = await page.title();
  const rawSections = await extractPageSections(page);
  const sections = buildSectionTree(rawSections);

  console.log(`Обнаружено секций: ${sections.length}`);

  const pageData: PageData = {
    url: args.url,
    title,
    sections,
  };

  const pagesJson: PageData[] = [pageData];
  const pagesJsonPath = join(outputDir, 'pages.json');
  await writeFile(pagesJsonPath, JSON.stringify(pagesJson, null, 2), 'utf-8');
  console.log(`pages.json сохранён: ${pagesJsonPath}`);

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
