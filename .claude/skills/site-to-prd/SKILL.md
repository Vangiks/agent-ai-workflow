# site-to-prd

Анализирует сайт и генерирует PRD (Product Requirements Document) на основе его содержимого.

## Использование

```
/site-to-prd <URL> --output <папка> [--depth <глубина>]
```

### Параметры

- `<URL>` — URL сайта для анализа (обязательный)
- `--output <папка>` — директория для сохранения результатов (обязательный)
- `--depth <число>` — глубина обхода страниц (по умолчанию: 2)

### Примеры

```
/site-to-prd https://example.com --output ./out
/site-to-prd https://example.com --output ./out --depth 3
```

## Что делает skill

1. Запускает scraper через Playwright
2. Обходит страницы BFS до глубины `--depth` (default: 2)
3. Собирает внутренние ссылки (`<a href>`) с каждой страницы
4. Дедуплицирует URL — каждая страница посещается один раз
5. Анализирует DOM стартовой страницы: ищет `.t-rec` элементы (Tilda блоки)
6. Маппит найденные блоки на семантические типы и NextJS компоненты
7. Извлекает `<meta>` теги, Open Graph данные и favicon → `meta.json`
8. Скачивает все изображения в `assets/` с оригинальными именами файлов → `images.json`
9. Сохраняет `pages.json` с массивом страниц (url, title, sections)
10. Извлекает computed CSS цвета и типографику со всех страниц → `colors.json`, `typography.json`
11. Для стартовой страницы делает два full-page скриншота:
    - Desktop (1440px): `screenshots/{slug}-desktop.png`
    - Mobile (375px): `screenshots/{slug}-mobile.png`
11. Перед каждым скриншотом выполняет авто-скролл до конца страницы и ожидает `networkidle`

## Структура вывода

```
<output>/
├── pages.json          — массив страниц с секциями Tilda
├── meta.json           — title, description, keywords, viewport, OG, favicon
├── images.json         — маппинг URL → локальные пути, alt, размеры
├── colors.json         — уникальные цвета сайта в HEX, отсортированные по частоте
├── typography.json     — шрифты: название, размеры, weight, line-height, next/font/google код
├── assets/             — скачанные изображения
│   ├── logo.png
│   └── ...
├── screenshots/
│   ├── {slug}-desktop.png
│   └── {slug}-mobile.png
└── prd/                — сгенерированный PRD (шаг 6)
    ├── PRD.md
    ├── design-tokens.md
    ├── components.md
    ├── pages.md
    └── migration-checklist.md
```

## Формат pages.json

```json
[
  {
    "url": "https://example.com",
    "title": "Page Title",
    "sections": [
      {
        "tildaBlockId": "t396",
        "semanticType": "hero",
        "componentName": "HeroSection",
        "stackRecommendation": "Framer Motion для анимации, shadcn/ui Button для CTA"
      },
      {
        "tildaBlockId": "t99999",
        "semanticType": "custom",
        "componentName": "CustomSection",
        "stackRecommendation": "Tailwind CSS, shadcn/ui",
        "domDescription": "Тег: <div>; Классы: t-rec, t99999; ..."
      }
    ]
  },
  { "url": "https://example.com/about", "title": "About", "sections": [] }
]
```

### Поля секции

- `tildaBlockId` — ID Tilda блока (класс вида `t{число}`)
- `semanticType` — семантический тип: `hero`, `header`, `features`, `testimonials`, `footer`, `cta`, `gallery`, `pricing`, `team`, `faq`, `contact`, `text`, `video`, `form`, `countdown`, `stats`, `partners`, `menu`, `custom`
- `componentName` — предлагаемое имя NextJS компонента
- `stackRecommendation` — рекомендация из стека (shadcn, Framer Motion и т.д.)
- `domDescription` — описание DOM структуры (только для блоков типа `custom` и нераспознанных)


## Формат colors.json

```json
[
  {
    "hex": "#ffffff",
    "count": 42,
    "contexts": ["background-color", "color"]
  },
  {
    "hex": "#000000",
    "count": 28,
    "contexts": ["color"]
  }
]
```

### Поля ColorEntry

- `hex` — цвет в HEX формате (напр. `#ff5733`)
- `count` — суммарное количество вхождений на всех страницах
- `contexts` — список CSS свойств использования: `color`, `background-color`, `border-color`

## Формат typography.json

```json
[
  {
    "fontFamily": "Inter",
    "isGoogleFont": true,
    "sizes": ["14px", "16px", "24px"],
    "weights": [400, 700],
    "lineHeights": ["20px", "24px"],
    "nextFontCode": "import { Inter } from 'next/font/google'\n\nexport const inter = Inter({\n  subsets: ['latin'],\n  weight: ['400', '700'],\n})"
  },
  {
    "fontFamily": "Arial",
    "isGoogleFont": false,
    "sizes": ["12px", "14px"],
    "weights": [400],
    "lineHeights": [],
    "nextFontCode": null
  }
]
```

### Поля TypographyEntry

- `fontFamily` — название шрифта (первый из font-family списка без кавычек)
- `isGoogleFont` — является ли Google Font
- `sizes` — все уникальные размеры шрифта в пикселях
- `weights` — все уникальные веса шрифта (числа)
- `lineHeights` — все уникальные межстрочные интервалы (кроме `normal`)
- `nextFontCode` — готовый код подключения через `next/font/google` (только для Google Fonts)

## Инструкция для Claude

Когда пользователь вызывает `/site-to-prd`, выполни следующее:

1. Разбери аргументы: URL, --output, --depth
2. Проверь и установи зависимости (если отсутствуют):
   ```
   npx tsx .claude/skills/site-to-prd/ensure-deps.ts
   ```
3. Запусти scraper командой:
   ```
   npx tsx .claude/skills/site-to-prd/scraper.ts <URL> --output <папка> [--depth <глубина>]
   ```
4. Сообщи пользователю где сохранены результаты: `pages.json`, `meta.json`, `images.json`, `colors.json`, `typography.json`, скриншоты (папка `<output>/screenshots/`), изображения (папка `<output>/assets/`)
5. Проанализируй `pages.json` — покажи пользователю структуру страниц и предложенные компоненты
6. Сгенерируй PRD папку командой:
   ```
   npx tsx .claude/skills/site-to-prd/prd-generator.ts --output <папка>
   ```
7. Сообщи пользователю о созданных файлах в `<папка>/prd/`:
   - `PRD.md` — обзор сайта, ссылки на скриншоты
   - `design-tokens.md` — цвета (Tailwind config), типографика (next/font/google)
   - `components.md` — маппинг Tilda→NextJS компонентов
   - `pages.md` — структура страниц, App Router роутинг
   - `migration-checklist.md` — чеклист с SEO данными из meta.json
