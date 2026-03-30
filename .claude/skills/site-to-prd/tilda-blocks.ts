export type SemanticType =
  | 'hero'
  | 'header'
  | 'features'
  | 'testimonials'
  | 'footer'
  | 'cta'
  | 'gallery'
  | 'pricing'
  | 'team'
  | 'faq'
  | 'contact'
  | 'text'
  | 'video'
  | 'form'
  | 'countdown'
  | 'stats'
  | 'partners'
  | 'menu'
  | 'custom';

export interface BlockInfo {
  semanticType: SemanticType;
  componentName: string;
  stackRecommendation: string;
}

export interface DomBlockInfo {
  tagName: string;
  classes: string[];
  childCount: number;
  hasImages: boolean;
  imageCount?: number;
  hasVideo: boolean;
  hasForm: boolean;
  hasHeading: boolean;
  textLength: number;
}

export interface AnalyzedBlock extends BlockInfo {
  domDescription?: string;
}

// Таблица маппинга популярных Tilda блоков на NextJS компоненты
export const TILDA_BLOCK_MAPPING: Map<string, BlockInfo> = new Map([
  // Hero / Cover блоки
  [
    't396',
    {
      semanticType: 'hero',
      componentName: 'HeroSection',
      stackRecommendation: 'Framer Motion для анимации, shadcn/ui Button для CTA',
    },
  ],
  [
    't123',
    {
      semanticType: 'hero',
      componentName: 'HeroSection',
      stackRecommendation: 'Framer Motion для анимации появления',
    },
  ],
  [
    't124',
    {
      semanticType: 'hero',
      componentName: 'HeroSectionSmall',
      stackRecommendation: 'Framer Motion, shadcn/ui Button',
    },
  ],
  [
    't432',
    {
      semanticType: 'hero',
      componentName: 'HeroFullscreen',
      stackRecommendation: 'next/image для оптимизации, Framer Motion',
    },
  ],

  // Header / Navigation
  [
    't226',
    {
      semanticType: 'header',
      componentName: 'SiteHeader',
      stackRecommendation: 'shadcn/ui NavigationMenu, framer-motion для мобильного меню',
    },
  ],
  [
    't216',
    {
      semanticType: 'menu',
      componentName: 'NavigationBar',
      stackRecommendation: 'shadcn/ui NavigationMenu',
    },
  ],

  // Features / Cards
  [
    't245',
    {
      semanticType: 'features',
      componentName: 'FeaturesGrid',
      stackRecommendation: 'shadcn/ui Card, Framer Motion для stagger-анимации',
    },
  ],
  [
    't77',
    {
      semanticType: 'features',
      componentName: 'FeaturesColumns',
      stackRecommendation: 'shadcn/ui Card',
    },
  ],
  [
    't077',
    {
      semanticType: 'text',
      componentName: 'TextColumns',
      stackRecommendation: 'Tailwind CSS grid',
    },
  ],

  // Text content
  [
    't228',
    {
      semanticType: 'text',
      componentName: 'TextImageSection',
      stackRecommendation: 'next/image, Tailwind CSS',
    },
  ],
  [
    't161',
    {
      semanticType: 'text',
      componentName: 'TextBlock',
      stackRecommendation: 'Tailwind CSS typography plugin',
    },
  ],

  // Gallery
  [
    't171',
    {
      semanticType: 'gallery',
      componentName: 'ImageGallery',
      stackRecommendation: 'next/image, shadcn/ui Dialog для лайтбокса',
    },
  ],
  [
    't248',
    {
      semanticType: 'gallery',
      componentName: 'GalleryWithOverlay',
      stackRecommendation: 'next/image, Framer Motion для hover-эффектов',
    },
  ],

  // Video
  [
    't106',
    {
      semanticType: 'video',
      componentName: 'VideoSection',
      stackRecommendation: 'react-player или next/dynamic для lazy-загрузки',
    },
  ],

  // Form
  [
    't239',
    {
      semanticType: 'form',
      componentName: 'ContactForm',
      stackRecommendation: 'react-hook-form, shadcn/ui Form, zod для валидации',
    },
  ],

  // Testimonials
  [
    't681',
    {
      semanticType: 'testimonials',
      componentName: 'TestimonialsSection',
      stackRecommendation: 'shadcn/ui Card, Embla Carousel для слайдера',
    },
  ],

  // Pricing
  [
    't198',
    {
      semanticType: 'pricing',
      componentName: 'PricingSection',
      stackRecommendation: 'shadcn/ui Card, shadcn/ui Badge для тарифов',
    },
  ],

  // Team
  [
    't744',
    {
      semanticType: 'team',
      componentName: 'TeamSection',
      stackRecommendation: 'next/image, shadcn/ui Card для карточек команды',
    },
  ],

  // FAQ
  [
    't279',
    {
      semanticType: 'faq',
      componentName: 'FaqSection',
      stackRecommendation: 'shadcn/ui Accordion',
    },
  ],

  // Stats / Counters
  [
    't40',
    {
      semanticType: 'stats',
      componentName: 'StatsSection',
      stackRecommendation: 'Framer Motion useInView + counter animation',
    },
  ],

  // Countdown / Timer
  [
    't183',
    {
      semanticType: 'countdown',
      componentName: 'CountdownTimer',
      stackRecommendation: 'Framer Motion, date-fns для расчёта времени',
    },
  ],

  // Social / Partners
  [
    't126',
    {
      semanticType: 'partners',
      componentName: 'SocialLinks',
      stackRecommendation: 'lucide-react для иконок',
    },
  ],

  // CTA
  [
    't122',
    {
      semanticType: 'cta',
      componentName: 'CtaSection',
      stackRecommendation: 'shadcn/ui Button, Framer Motion',
    },
  ],

  // Contact / Maps
  [
    't184',
    {
      semanticType: 'contact',
      componentName: 'ContactMap',
      stackRecommendation: '@react-google-maps/api или react-leaflet',
    },
  ],

  // Footer
  [
    't741',
    {
      semanticType: 'footer',
      componentName: 'SiteFooter',
      stackRecommendation: 'Tailwind CSS grid, lucide-react для иконок соцсетей',
    },
  ],
]);

/**
 * Возвращает информацию о Tilda блоке по его ID или null если блок неизвестен.
 */
export function getTildaBlockInfo(blockId: string): BlockInfo | null {
  if (!blockId) return null;
  return TILDA_BLOCK_MAPPING.get(blockId) ?? null;
}

/**
 * Анализирует DOM структуру неизвестного блока и возвращает семантический тип.
 */
export function analyzeUnknownBlock(domInfo: DomBlockInfo): AnalyzedBlock {
  const domDescription = buildDomDescription(domInfo);

  // Приоритет: form > video > gallery > custom
  if (domInfo.hasForm) {
    return {
      semanticType: 'form',
      componentName: 'CustomFormSection',
      stackRecommendation: 'react-hook-form, shadcn/ui Form, zod для валидации',
      domDescription,
    };
  }

  if (domInfo.hasVideo) {
    return {
      semanticType: 'video',
      componentName: 'CustomVideoSection',
      stackRecommendation: 'react-player или next/dynamic для lazy-загрузки',
      domDescription,
    };
  }

  const imageCount = domInfo.imageCount ?? (domInfo.hasImages ? 1 : 0);
  if (domInfo.hasImages && imageCount >= 4) {
    return {
      semanticType: 'gallery',
      componentName: 'CustomGallery',
      stackRecommendation: 'next/image, shadcn/ui Dialog для лайтбокса',
      domDescription,
    };
  }

  return {
    semanticType: 'custom',
    componentName: 'CustomSection',
    stackRecommendation: 'Tailwind CSS, shadcn/ui',
    domDescription,
  };
}

function buildDomDescription(domInfo: DomBlockInfo): string {
  const parts: string[] = [
    `Тег: <${domInfo.tagName}>`,
    `Классы: ${domInfo.classes.length > 0 ? domInfo.classes.join(', ') : '(нет)'}`,
    `Дочерних элементов: ${domInfo.childCount}`,
  ];

  if (domInfo.hasImages) {
    parts.push(`Изображений: ${domInfo.imageCount ?? '1+'}`);
  }
  if (domInfo.hasVideo) {
    parts.push('Содержит видео');
  }
  if (domInfo.hasForm) {
    parts.push('Содержит форму');
  }
  if (domInfo.hasHeading) {
    parts.push('Содержит заголовок');
  }
  if (domInfo.textLength > 0) {
    parts.push(`Длина текста: ~${domInfo.textLength} символов`);
  }

  return parts.join('; ');
}
