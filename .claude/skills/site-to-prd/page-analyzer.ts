import { getTildaBlockInfo, analyzeUnknownBlock, type SemanticType } from './tilda-blocks.js';

export interface RawSection {
  tildaBlockId: string;
  classes: string[];
  tagName: string;
  childCount: number;
  hasImages: boolean;
  imageCount?: number;
  hasVideo: boolean;
  hasForm: boolean;
  hasHeading: boolean;
  textLength: number;
}

export interface Section {
  tildaBlockId: string;
  semanticType: SemanticType;
  componentName: string;
  stackRecommendation: string;
  domDescription?: string;
}

export interface PageData {
  url: string;
  title: string;
  sections: Section[];
}

/**
 * Преобразует массив RawSection в массив Section с семантической разметкой.
 */
export function buildSectionTree(rawSections: RawSection[]): Section[] {
  return rawSections.map((raw) => {
    const known = getTildaBlockInfo(raw.tildaBlockId);
    if (known) {
      return {
        tildaBlockId: raw.tildaBlockId,
        semanticType: known.semanticType,
        componentName: known.componentName,
        stackRecommendation: known.stackRecommendation,
      };
    }

    const analyzed = analyzeUnknownBlock({
      tagName: raw.tagName,
      classes: raw.classes,
      childCount: raw.childCount,
      hasImages: raw.hasImages,
      imageCount: raw.imageCount,
      hasVideo: raw.hasVideo,
      hasForm: raw.hasForm,
      hasHeading: raw.hasHeading,
      textLength: raw.textLength,
    });

    return {
      tildaBlockId: raw.tildaBlockId,
      semanticType: analyzed.semanticType,
      componentName: analyzed.componentName,
      stackRecommendation: analyzed.stackRecommendation,
      domDescription: analyzed.domDescription,
    };
  });
}

/**
 * Извлекает Tilda block ID из списка CSS классов элемента.
 * Ищет классы вида t{число} (например, t396, t741).
 */
export function extractTildaBlockId(classes: string[]): string {
  for (const cls of classes) {
    if (/^t\d+$/.test(cls)) {
      return cls;
    }
  }
  return '';
}
