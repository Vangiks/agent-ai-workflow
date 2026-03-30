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
5. Сохраняет `pages.json` с массивом страниц: `url`, `depth`, `title`
6. Для стартовой страницы делает два full-page скриншота:
   - Desktop (1440px): `screenshots/{slug}-desktop.png`
   - Mobile (375px): `screenshots/{slug}-mobile.png`
7. Перед каждым скриншотом выполняет авто-скролл до конца страницы и ожидает `networkidle`

## Формат pages.json

```json
[
  { "url": "https://example.com", "depth": 1, "title": "Home" },
  { "url": "https://example.com/about", "depth": 2, "title": "About" }
]
```

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
4. Сообщи пользователю где сохранены `pages.json` и скриншоты (папка `<output>/screenshots/`)
5. Если нужно сгенерировать PRD — проанализируй pages.json и скриншоты, создай документ в папке `--output/prd.md`
