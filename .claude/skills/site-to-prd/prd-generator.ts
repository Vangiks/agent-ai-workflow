import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, resolve } from 'path';
import type { PageData, Section } from './page-analyzer.js';
import type { MetaData, ImageEntry } from './scraper.js';

export interface PrdData {
  outputDir: string;
  pages: PageData[];
  meta: MetaData;
  images: ImageEntry[];
}

// ─────────────────────────────────────────────
// Helper functions
// ─────────────────────────────────────────────

export function slugFromUrl(url: string): string {
  const parsed = new URL(url);
  const parts = [parsed.hostname, ...parsed.pathname.split('/').filter(Boolean)];
  return parts.join('-').replace(/\./g, '-');
}

export function urlToAppRouterPath(url: string): string {
  const parsed = new URL(url);
  const segments = parsed.pathname.split('/').filter(Boolean);
  if (segments.length === 0) return 'app/page.tsx';
  return `app/${segments.join('/')}/page.tsx`;
}

export function getUniqueComponents(pages: PageData[]): Section[] {
  const seen = new Set<string>();
  const result: Section[] = [];
  for (const page of pages) {
    for (const section of page.sections) {
      if (!seen.has(section.componentName)) {
        seen.add(section.componentName);
        result.push(section);
      }
    }
  }
  return result;
}

// ─────────────────────────────────────────────
// PRD.md
// ─────────────────────────────────────────────

export function generatePRD(data: PrdData): string {
  const { pages, meta } = data;
  const title = meta.title ?? 'Сайт';
  const description = meta.description ?? '';
  const totalPages = pages.length;
  const uniqueComponents = getUniqueComponents(pages);

  const startUrl = pages[0]?.url ?? '';
  const startSlug = startUrl ? slugFromUrl(startUrl) : 'site';

  const pageTable = pages
    .map((p) => `| ${p.title} | ${p.url} |`)
    .join('\n');

  const screenshotSection = startUrl
    ? `## Скриншоты\n\n### ${pages[0]?.title ?? title}\n\n![Desktop](screenshots/${startSlug}-desktop.png)\n\n![Mobile](screenshots/${startSlug}-mobile.png)`
    : '';

  return `# PRD: ${title}

> ${description}

**Сайт:** ${startUrl}

## Содержание

- [design-tokens.md](./design-tokens.md) — цвета и типографика
- [components.md](./components.md) — компоненты NextJS
- [pages.md](./pages.md) — структура страниц и роутинг
- [migration-checklist.md](./migration-checklist.md) — чеклист миграции

## Структура сайта

- **Страниц:** ${totalPages}
- **Уникальных компонентов:** ${uniqueComponents.length}

## Страницы

| Страница | URL |
|----------|-----|
${pageTable}

${screenshotSection}
`.trim();
}

// ─────────────────────────────────────────────
// design-tokens.md
// ─────────────────────────────────────────────

export function generateDesignTokens(_data: PrdData): string {
  return `# Design Tokens

## Цвета (Tailwind config)

Извлеките цвета из дизайна сайта (скриншоты в папке \`screenshots/\`) и добавьте их в \`tailwind.config.ts\`:

\`\`\`ts
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  theme: {
    extend: {
      colors: {
        // TODO: заполните на основе скриншотов
        primary: {
          DEFAULT: '#000000',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#ffffff',
          foreground: '#000000',
        },
        accent: '#000000',
        background: '#ffffff',
        foreground: '#000000',
        muted: '#f5f5f5',
        border: '#e5e5e5',
      },
    },
  },
};

export default config;
\`\`\`

## Типографика (next/font/google)

Подключите шрифты в \`app/layout.tsx\`:

\`\`\`ts
// app/layout.tsx
import { Inter } from 'next/font/google';

const font = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-sans',
  display: 'swap',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={font.variable}>
      <body>{children}</body>
    </html>
  );
}
\`\`\`

> **TODO:** Определите конкретный шрифт по скриншотам сайта (например, \`Inter\`, \`Roboto\`, \`Montserrat\`).
> Если используется несколько начертаний, добавьте \`weight\` и \`style\` параметры.
`.trim();
}

// ─────────────────────────────────────────────
// components.md
// ─────────────────────────────────────────────

export function generateComponents(data: PrdData): string {
  const components = getUniqueComponents(data.pages);

  if (components.length === 0) {
    return `# Компоненты

Компоненты не обнаружены. Возможно, сайт не использует стандартные Tilda-блоки или анализ DOM не выполнялся.
`.trim();
  }

  const rows = components
    .map((c) => `| \`${c.tildaBlockId}\` | ${c.semanticType} | \`${c.componentName}\` | ${c.stackRecommendation} |`)
    .join('\n');

  const componentDetails = components
    .map((c) => {
      const domNote = c.domDescription ? `\n\n  > DOM: ${c.domDescription}` : '';
      return `### \`${c.componentName}\`\n\n- **Tilda блок:** \`${c.tildaBlockId}\`\n- **Тип:** ${c.semanticType}\n- **Стек:** ${c.stackRecommendation}${domNote}`;
    })
    .join('\n\n');

  return `# Компоненты

## Маппинг Tilda → NextJS

| Tilda блок | Семантика | NextJS компонент | Стек |
|------------|-----------|-----------------|------|
${rows}

## Детали компонентов

${componentDetails}

## Структура проекта

\`\`\`
src/
└── components/
${components.map((c) => `    └── ${c.componentName}.tsx`).join('\n')}
\`\`\`
`.trim();
}

// ─────────────────────────────────────────────
// pages.md
// ─────────────────────────────────────────────

export function generatePages(data: PrdData): string {
  const { pages } = data;

  const rows = pages
    .map((p) => {
      const routerPath = urlToAppRouterPath(p.url);
      const sectionsNote = p.sections.length > 0
        ? p.sections.map((s) => s.componentName).join(', ')
        : '—';
      return `| ${p.title} | ${p.url} | \`${routerPath}\` | ${sectionsNote} |`;
    })
    .join('\n');

  const pageDetails = pages
    .map((p) => {
      const routerPath = urlToAppRouterPath(p.url);
      const sectionsList = p.sections.length > 0
        ? p.sections.map((s) => `  - \`${s.componentName}\` (${s.semanticType})`).join('\n')
        : '  - *Секции не проанализированы*';
      return `### ${p.title}\n\n- **URL:** ${p.url}\n- **Файл:** \`${routerPath}\`\n- **Секции:**\n${sectionsList}`;
    })
    .join('\n\n');

  return `# Структура страниц

## NextJS App Router роутинг

| Страница | URL | Файл | Компоненты |
|----------|-----|------|-----------|
${rows}

## Детали страниц

${pageDetails}

## Рекомендации

- Используйте **App Router** (\`app/\` директория) с серверными компонентами по умолчанию
- Добавьте \`app/layout.tsx\` для общей обёртки (шрифты, мета)
- Добавьте \`app/not-found.tsx\` для страницы 404
- Для динамических страниц используйте \`[slug]/page.tsx\`
`.trim();
}

// ─────────────────────────────────────────────
// migration-checklist.md
// ─────────────────────────────────────────────

export function generateMigrationChecklist(data: PrdData): string {
  const { meta, pages } = data;
  const hasForm = getUniqueComponents(pages).some((c) => c.semanticType === 'form');

  const titleLine = meta.title
    ? `- [ ] **title**: \`${meta.title}\` → \`metadata.title\` в \`app/layout.tsx\``
    : '- [ ] **title**: *не найден* — заполните вручную';

  const descLine = meta.description
    ? `- [ ] **description**: \`${meta.description}\` → \`metadata.description\``
    : '- [ ] **description**: *не найдено* — заполните вручную';

  const keywordsLine = meta.keywords
    ? `- [ ] **keywords**: \`${meta.keywords}\` → \`metadata.keywords\``
    : '- [ ] **keywords**: *не найдены*';

  const faviconLine = meta.favicon
    ? `- [ ] **favicon**: скопировать \`${meta.favicon}\` → \`app/favicon.ico\``
    : '- [ ] **favicon**: *не найден* — добавьте \`app/favicon.ico\`';

  const ogImageLine = meta.og['og:image']
    ? `- [ ] **og:image**: \`${meta.og['og:image']}\` → \`app/opengraph-image.tsx\` или \`app/opengraph-image.png\``
    : '- [ ] **og:image**: *не найден* — создайте \`app/opengraph-image.tsx\`';

  const ogTitleLine = meta.og['og:title']
    ? `- [ ] **og:title**: \`${meta.og['og:title']}\``
    : '- [ ] **og:title**: *не найден*';

  const ogDescLine = meta.og['og:description']
    ? `- [ ] **og:description**: \`${meta.og['og:description']}\``
    : '- [ ] **og:description**: *не найдено*';

  const formsSection = hasForm
    ? `\n## Формы\n\n- [ ] Реализовать обработку отправки форм (в Tilda обрабатывалось автоматически)\n- [ ] Настроить валидацию с \`react-hook-form\` + \`zod\`\n- [ ] Подключить email-сервис (Resend, SendGrid, Nodemailer) или API-роут\n- [ ] Добавить защиту от спама (reCAPTCHA или Turnstile)\n`
    : '';

  return `# Migration Checklist

Этот чеклист содержит задачи, которые Tilda выполняла автоматически и которые нужно реализовать вручную в NextJS.

## SEO Metadata

Настройте в \`app/layout.tsx\`:

\`\`\`ts
export const metadata: Metadata = {
  title: '${meta.title ?? 'TODO'}',
  description: '${meta.description ?? 'TODO'}',
};
\`\`\`

${titleLine}
${descLine}
${keywordsLine}

## Open Graph

${ogTitleLine}
${ogDescLine}
${ogImageLine}

## Технические файлы

- [ ] **sitemap.xml** → создать \`app/sitemap.ts\` (Next.js генерирует автоматически)
- [ ] **robots.txt** → создать \`app/robots.ts\`
${faviconLine}
- [ ] **manifest.json** → создать \`app/manifest.ts\` (для PWA, если нужно)
${formsSection}
## Аналитика

- [ ] Подключить аналитику (Google Analytics, Яндекс Метрика, Plausible)
- [ ] Добавить компонент \`<Analytics />\` или скрипт в \`app/layout.tsx\`
- [ ] Настроить события конверсий (если были в Tilda)

## Производительность

- [ ] Заменить \`<img>\` на \`next/image\` для оптимизации (${data.images.length} изображений в \`assets/\`)
- [ ] Настроить \`next.config.ts\` → \`images.domains\` для внешних источников
- [ ] Включить ISR или SSG для статических страниц

## Деплой

- [ ] Настроить \`next.config.ts\`
- [ ] Добавить переменные окружения (\`.env.local\`)
- [ ] Настроить CI/CD (Vercel, GitHub Actions)
- [ ] Проверить Core Web Vitals после деплоя
`.trim();
}

// ─────────────────────────────────────────────
// Main: читает JSON файлы и пишет PRD папку
// ─────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const outputIdx = args.indexOf('--output');
  if (outputIdx === -1 || !args[outputIdx + 1]) {
    console.error('Использование: npx tsx prd-generator.ts --output <папка>');
    process.exit(1);
  }
  const outputDir = resolve(args[outputIdx + 1]!);
  const prdDir = join(outputDir, 'prd');

  const [pagesRaw, metaRaw, imagesRaw] = await Promise.all([
    readFile(join(outputDir, 'pages.json'), 'utf-8'),
    readFile(join(outputDir, 'meta.json'), 'utf-8'),
    readFile(join(outputDir, 'images.json'), 'utf-8'),
  ]);

  const pages: PageData[] = JSON.parse(pagesRaw) as PageData[];
  const meta: MetaData = JSON.parse(metaRaw) as MetaData;
  const images: ImageEntry[] = JSON.parse(imagesRaw) as ImageEntry[];

  const data: PrdData = { outputDir, pages, meta, images };

  await mkdir(prdDir, { recursive: true });

  const files: Array<[string, string]> = [
    ['PRD.md', generatePRD(data)],
    ['design-tokens.md', generateDesignTokens(data)],
    ['components.md', generateComponents(data)],
    ['pages.md', generatePages(data)],
    ['migration-checklist.md', generateMigrationChecklist(data)],
  ];

  await Promise.all(
    files.map(([name, content]) => writeFile(join(prdDir, name), content + '\n', 'utf-8')),
  );

  console.log(`PRD сгенерирован в ${prdDir}:`);
  for (const [name] of files) {
    console.log(`  ${name}`);
  }
}

// Запускаем main только при прямом вызове скрипта
if (
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].endsWith('prd-generator.ts') ||
    process.argv[1].endsWith('prd-generator.js'))
) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
