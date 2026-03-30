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
10. Для стартовой страницы делает два full-page скриншота:
    - Desktop (1440px): `screenshots/{slug}-desktop.png`
    - Mobile (375px): `screenshots/{slug}-mobile.png`
11. Перед каждым скриншотом выполняет авто-скролл до конца страницы и ожидает `networkidle`

## Структура вывода

```
<output>/
├── pages.json          — массив страниц с секциями Tilda
├── meta.json           — title, description, keywords, viewport, OG, favicon
├── images.json         — маппинг URL → локальные пути, alt, размеры
├── assets/             — скачанные изображения
│   ├── logo.png
│   └── ...
└── screenshots/
    ├── {slug}-desktop.png
    └── {slug}-mobile.png
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
4. Сообщи пользователю где сохранены результаты: `pages.json`, `meta.json`, `images.json`, скриншоты (папка `<output>/screenshots/`), изображения (папка `<output>/assets/`)
5. Проанализируй `pages.json` — покажи пользователю структуру страниц и предложенные компоненты
6. Если нужно сгенерировать PRD — проанализируй pages.json, meta.json и скриншоты, создай документ в папке `--output/prd.md`
