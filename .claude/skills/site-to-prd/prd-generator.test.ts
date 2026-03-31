// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  generatePRD,
  generateDesignTokens,
  generateComponents,
  generatePages,
  generateMigrationChecklist,
  slugFromUrl,
  getUniqueComponents,
  urlToAppRouterPath,
  type PrdData,
} from './prd-generator.js';
import type { PageData } from './page-analyzer.js';
import type { MetaData, ImageEntry } from './scraper.js';

const sampleMeta: MetaData = {
  title: 'Acme Corp',
  description: 'Лучшие продукты для вас',
  keywords: 'acme, products, quality',
  viewport: 'width=device-width, initial-scale=1',
  og: {
    'og:title': 'Acme Corp',
    'og:description': 'Лучшие продукты для вас',
    'og:image': 'https://acme.com/og.jpg',
  },
  favicon: '/favicon.ico',
  allMeta: {
    description: 'Лучшие продукты для вас',
  },
};

const samplePages: PageData[] = [
  {
    url: 'https://acme.com',
    title: 'Главная',
    sections: [
      {
        tildaBlockId: 't396',
        semanticType: 'hero',
        componentName: 'HeroSection',
        stackRecommendation: 'Framer Motion для анимации, shadcn/ui Button для CTA',
      },
      {
        tildaBlockId: 't239',
        semanticType: 'form',
        componentName: 'ContactForm',
        stackRecommendation: 'react-hook-form, shadcn/ui Form, zod',
      },
    ],
  },
  {
    url: 'https://acme.com/about',
    title: 'О компании',
    sections: [],
  },
  {
    url: 'https://acme.com/products/item',
    title: 'Товар',
    sections: [],
  },
];

const sampleImages: ImageEntry[] = [
  {
    originalUrl: 'https://cdn.acme.com/logo.png',
    localPath: 'assets/logo.png',
    alt: 'Логотип',
    width: 200,
    height: 60,
  },
];

const sampleData: PrdData = {
  outputDir: './out',
  pages: samplePages,
  meta: sampleMeta,
  images: sampleImages,
};

describe('slugFromUrl', () => {
  it('возвращает hostname для корневого URL', () => {
    expect(slugFromUrl('https://acme.com')).toBe('acme-com');
  });

  it('добавляет путь через дефис', () => {
    expect(slugFromUrl('https://acme.com/about')).toBe('acme-com-about');
  });

  it('заменяет слэши на дефисы', () => {
    expect(slugFromUrl('https://acme.com/products/item')).toBe('acme-com-products-item');
  });

  it('убирает query и hash', () => {
    expect(slugFromUrl('https://acme.com/page?foo=1#bar')).toBe('acme-com-page');
  });
});

describe('urlToAppRouterPath', () => {
  it('корневой URL → app/page.tsx', () => {
    expect(urlToAppRouterPath('https://acme.com')).toBe('app/page.tsx');
  });

  it('/about → app/about/page.tsx', () => {
    expect(urlToAppRouterPath('https://acme.com/about')).toBe('app/about/page.tsx');
  });

  it('/products/item → app/products/item/page.tsx', () => {
    expect(urlToAppRouterPath('https://acme.com/products/item')).toBe('app/products/item/page.tsx');
  });
});

describe('getUniqueComponents', () => {
  it('возвращает уникальные компоненты из всех страниц', () => {
    const pages: PageData[] = [
      {
        url: 'https://a.com',
        title: 'Home',
        sections: [
          { tildaBlockId: 't396', semanticType: 'hero', componentName: 'HeroSection', stackRecommendation: 'FM' },
          { tildaBlockId: 't239', semanticType: 'form', componentName: 'ContactForm', stackRecommendation: 'rhf' },
        ],
      },
      {
        url: 'https://a.com/about',
        title: 'About',
        sections: [
          { tildaBlockId: 't396', semanticType: 'hero', componentName: 'HeroSection', stackRecommendation: 'FM' },
        ],
      },
    ];
    const result = getUniqueComponents(pages);
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.componentName)).toContain('HeroSection');
    expect(result.map((c) => c.componentName)).toContain('ContactForm');
  });

  it('возвращает пустой массив если нет секций', () => {
    const pages: PageData[] = [{ url: 'https://a.com', title: 'Home', sections: [] }];
    expect(getUniqueComponents(pages)).toHaveLength(0);
  });
});

describe('generatePRD', () => {
  it('содержит заголовок с именем сайта', () => {
    const result = generatePRD(sampleData);
    expect(result).toContain('Acme Corp');
  });

  it('содержит ссылки на все PRD файлы', () => {
    const result = generatePRD(sampleData);
    expect(result).toContain('design-tokens.md');
    expect(result).toContain('components.md');
    expect(result).toContain('pages.md');
    expect(result).toContain('migration-checklist.md');
  });

  it('содержит количество страниц', () => {
    const result = generatePRD(sampleData);
    expect(result).toContain('3');
  });

  it('содержит ссылки на скриншоты', () => {
    const result = generatePRD(sampleData);
    expect(result).toContain('screenshots/');
    expect(result).toContain('desktop.png');
    expect(result).toContain('mobile.png');
  });

  it('содержит описание сайта из meta', () => {
    const result = generatePRD(sampleData);
    expect(result).toContain('Лучшие продукты для вас');
  });

  it('содержит список страниц с URL', () => {
    const result = generatePRD(sampleData);
    expect(result).toContain('https://acme.com');
    expect(result).toContain('https://acme.com/about');
  });

  it('работает без meta.description', () => {
    const data: PrdData = { ...sampleData, meta: { ...sampleMeta, description: null } };
    expect(() => generatePRD(data)).not.toThrow();
  });
});

describe('generateDesignTokens', () => {
  it('содержит секцию Tailwind config', () => {
    const result = generateDesignTokens(sampleData);
    expect(result).toContain('tailwind.config');
  });

  it('содержит next/font/google', () => {
    const result = generateDesignTokens(sampleData);
    expect(result).toContain('next/font/google');
  });

  it('содержит пример конфига цветов', () => {
    const result = generateDesignTokens(sampleData);
    expect(result).toContain('colors');
  });

  it('содержит cyrillic subsets', () => {
    const result = generateDesignTokens(sampleData);
    expect(result).toContain('cyrillic');
  });
});

describe('generateComponents', () => {
  it('содержит названия компонентов', () => {
    const result = generateComponents(sampleData);
    expect(result).toContain('HeroSection');
    expect(result).toContain('ContactForm');
  });

  it('содержит Tilda block IDs', () => {
    const result = generateComponents(sampleData);
    expect(result).toContain('t396');
    expect(result).toContain('t239');
  });

  it('содержит рекомендации стека', () => {
    const result = generateComponents(sampleData);
    expect(result).toContain('Framer Motion');
    expect(result).toContain('react-hook-form');
  });

  it('не дублирует компоненты', () => {
    const pages: PageData[] = [
      {
        url: 'https://a.com',
        title: 'Home',
        sections: [
          { tildaBlockId: 't396', semanticType: 'hero', componentName: 'HeroSection', stackRecommendation: 'FM' },
          { tildaBlockId: 't396', semanticType: 'hero', componentName: 'HeroSection', stackRecommendation: 'FM' },
        ],
      },
    ];
    const components = getUniqueComponents(pages);
    expect(components).toHaveLength(1);
    expect(components[0]?.componentName).toBe('HeroSection');
  });

  it('показывает сообщение если нет компонентов', () => {
    const pages: PageData[] = [{ url: 'https://a.com', title: 'Home', sections: [] }];
    const result = generateComponents({ ...sampleData, pages });
    expect(result).toBeTruthy();
  });
});

describe('generatePages', () => {
  it('содержит все URL страниц', () => {
    const result = generatePages(sampleData);
    expect(result).toContain('https://acme.com');
    expect(result).toContain('https://acme.com/about');
    expect(result).toContain('https://acme.com/products/item');
  });

  it('содержит App Router пути', () => {
    const result = generatePages(sampleData);
    expect(result).toContain('app/page.tsx');
    expect(result).toContain('app/about/page.tsx');
    expect(result).toContain('app/products/item/page.tsx');
  });

  it('содержит заголовки страниц', () => {
    const result = generatePages(sampleData);
    expect(result).toContain('Главная');
    expect(result).toContain('О компании');
  });
});

describe('generateMigrationChecklist', () => {
  it('содержит title из meta', () => {
    const result = generateMigrationChecklist(sampleData);
    expect(result).toContain('Acme Corp');
  });

  it('содержит description из meta', () => {
    const result = generateMigrationChecklist(sampleData);
    expect(result).toContain('Лучшие продукты для вас');
  });

  it('содержит favicon из meta', () => {
    const result = generateMigrationChecklist(sampleData);
    expect(result).toContain('/favicon.ico');
  });

  it('содержит og:image из meta', () => {
    const result = generateMigrationChecklist(sampleData);
    expect(result).toContain('https://acme.com/og.jpg');
  });

  it('содержит пункты чеклиста для технических задач', () => {
    const result = generateMigrationChecklist(sampleData);
    expect(result).toContain('sitemap');
    expect(result).toContain('robots');
    expect(result).toContain('favicon');
  });

  it('содержит пункт для форм если есть form-компонент', () => {
    const result = generateMigrationChecklist(sampleData);
    expect(result).toContain('форм');
  });

  it('содержит пункты для аналитики', () => {
    const result = generateMigrationChecklist(sampleData);
    expect(result).toContain('аналитик');
  });

  it('содержит пункты для OG изображений', () => {
    const result = generateMigrationChecklist(sampleData);
    expect(result).toContain('opengraph');
  });

  it('работает с пустыми meta полями', () => {
    const emptyMeta: MetaData = {
      title: null,
      description: null,
      keywords: null,
      viewport: null,
      og: {},
      favicon: null,
      allMeta: {},
    };
    expect(() => generateMigrationChecklist({ ...sampleData, meta: emptyMeta })).not.toThrow();
  });
});
