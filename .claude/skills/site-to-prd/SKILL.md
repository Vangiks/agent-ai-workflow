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
2. Загружает страницу и делает desktop скриншот (1280×800)
3. Сохраняет скриншот в папку `--output` как `desktop.png`
4. (В будущих версиях) Обходит страницы до глубины `--depth`, собирает текст и генерирует PRD

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
4. Сообщи пользователю где сохранены скриншоты
5. Если нужно сгенерировать PRD — проанализируй скриншоты и создай документ в папке `--output/prd.md`
