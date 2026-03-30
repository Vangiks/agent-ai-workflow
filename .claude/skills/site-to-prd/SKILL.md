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
4. Анализирует DOM страницы: ищет `.t-rec` элементы (Tilda блоки)
5. Маппит найденные блоки на семантические типы и NextJS компоненты
6. Сохраняет структуру страниц в `--output/pages.json`
7. (В будущих версиях) Обходит страницы до глубины `--depth` и генерирует полный PRD

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
  }
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
2. Запусти scraper командой:
   ```
   npx tsx .claude/skills/site-to-prd/scraper.ts <URL> --output <папка> [--depth <глубина>]
   ```
3. Сообщи пользователю где сохранены файлы: `desktop.png` и `pages.json`
4. Проанализируй `pages.json` — покажи пользователю структуру страниц и предложенные компоненты
5. Если нужно сгенерировать PRD — проанализируй скриншоты и `pages.json`, создай документ в папке `--output/prd.md`
