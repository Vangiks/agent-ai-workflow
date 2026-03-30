# site-to-prd

Анализирует сайт и генерирует PRD (Product Requirements Document) на основе его содержимого.

## Использование

```
/site-to-prd <URL> --output <папка> [--depth <глубина>]
```

### Параметры

- `<URL>` — URL сайта для анализа (обязательный)
- `--output <папка>` — директория для сохранения результатов (обязательный)
- `--depth <число>` — глубина обхода страниц (по умолчанию: 1)

### Примеры

```
/site-to-prd https://example.com --output ./out
/site-to-prd https://example.com --output ./out --depth 3
```

## Что делает skill

1. Запускает scraper через Playwright
2. Загружает страницу и делает desktop скриншот (1280×800), сохраняет как `desktop.png`
3. Извлекает все `<meta>` теги, Open Graph данные и favicon → `meta.json`
4. Скачивает все изображения в `assets/` с оригинальными именами файлов → `images.json`
5. При `--depth > 1` обходит внутренние страницы того же домена (BFS), дедуплицирует данные
6. (В будущих версиях) Анализирует скриншоты и создаёт PRD

## Структура вывода

```
<output>/
├── desktop.png         — скриншот главной страницы
├── images.json         — маппинг URL → локальные пути, alt, размеры
├── meta.json           — title, description, keywords, viewport, OG, favicon
└── assets/
    ├── logo.png
    ├── hero.jpg
    └── ...
```

### images.json

```json
[
  {
    "originalUrl": "https://example.com/img/logo.png",
    "localPath": "assets/logo.png",
    "alt": "Company logo",
    "width": 200,
    "height": 60
  }
]
```

### meta.json

```json
{
  "title": "Example Site",
  "description": "Site description",
  "keywords": "foo, bar",
  "viewport": "width=device-width, initial-scale=1",
  "og": {
    "og:title": "Example Site",
    "og:description": "OG description",
    "og:image": "https://example.com/og.jpg"
  },
  "favicon": "/favicon.ico",
  "allMeta": { ... }
}
```

## Инструкция для Claude

Когда пользователь вызывает `/site-to-prd`, выполни следующее:

1. Разбери аргументы: URL, --output, --depth
2. Запусти scraper командой:
   ```
   npx tsx .claude/skills/site-to-prd/scraper.ts <URL> --output <папка> [--depth <глубина>]
   ```
3. Сообщи пользователю где сохранены результаты (скриншот, images.json, meta.json, assets/)
4. Если нужно сгенерировать PRD — проанализируй скриншоты и данные, создай документ в `--output/prd.md`
