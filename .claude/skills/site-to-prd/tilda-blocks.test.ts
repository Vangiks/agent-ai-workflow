// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  getTildaBlockInfo,
  analyzeUnknownBlock,
  TILDA_BLOCK_MAPPING,
  type BlockInfo,
  type DomBlockInfo,
} from './tilda-blocks.js';

describe('TILDA_BLOCK_MAPPING', () => {
  it('содержит минимум 20 блоков', () => {
    expect(TILDA_BLOCK_MAPPING.size).toBeGreaterThanOrEqual(20);
  });

  it('каждый блок имеет все обязательные поля', () => {
    for (const [blockId, info] of TILDA_BLOCK_MAPPING) {
      expect(blockId).toBeTruthy();
      expect(info.semanticType).toBeTruthy();
      expect(info.componentName).toBeTruthy();
      expect(info.stackRecommendation).toBeTruthy();
    }
  });
});

describe('getTildaBlockInfo', () => {
  it('возвращает информацию для известного блока t396 (hero)', () => {
    const info = getTildaBlockInfo('t396');
    expect(info).not.toBeNull();
    expect(info!.semanticType).toBe('hero');
    expect(info!.componentName).toBeTruthy();
    expect(info!.stackRecommendation).toBeTruthy();
  });

  it('возвращает информацию для блока t741 (footer)', () => {
    const info = getTildaBlockInfo('t741');
    expect(info).not.toBeNull();
    expect(info!.semanticType).toBe('footer');
  });

  it('возвращает информацию для блока t226 (header)', () => {
    const info = getTildaBlockInfo('t226');
    expect(info).not.toBeNull();
    expect(info!.semanticType).toBe('header');
  });

  it('возвращает информацию для блока t239 (form)', () => {
    const info = getTildaBlockInfo('t239');
    expect(info).not.toBeNull();
    expect(info!.semanticType).toBe('form');
  });

  it('возвращает null для неизвестного блока', () => {
    const info = getTildaBlockInfo('t99999');
    expect(info).toBeNull();
  });

  it('возвращает null для пустой строки', () => {
    const info = getTildaBlockInfo('');
    expect(info).toBeNull();
  });
});

describe('analyzeUnknownBlock', () => {
  it('возвращает тип custom для неизвестного блока', () => {
    const domInfo: DomBlockInfo = {
      tagName: 'div',
      classes: ['unknown-block'],
      childCount: 3,
      hasImages: false,
      hasVideo: false,
      hasForm: false,
      hasHeading: true,
      textLength: 150,
    };
    const result = analyzeUnknownBlock(domInfo);
    expect(result.semanticType).toBe('custom');
    expect(result.domDescription).toBeTruthy();
  });

  it('определяет форму по наличию form элемента', () => {
    const domInfo: DomBlockInfo = {
      tagName: 'div',
      classes: ['section'],
      childCount: 5,
      hasImages: false,
      hasVideo: false,
      hasForm: true,
      hasHeading: false,
      textLength: 50,
    };
    const result = analyzeUnknownBlock(domInfo);
    expect(result.semanticType).toBe('form');
  });

  it('определяет видео секцию', () => {
    const domInfo: DomBlockInfo = {
      tagName: 'div',
      classes: ['section'],
      childCount: 2,
      hasImages: false,
      hasVideo: true,
      hasForm: false,
      hasHeading: false,
      textLength: 20,
    };
    const result = analyzeUnknownBlock(domInfo);
    expect(result.semanticType).toBe('video');
  });

  it('определяет галерею по большому количеству изображений', () => {
    const domInfo: DomBlockInfo = {
      tagName: 'div',
      classes: ['gallery-section'],
      childCount: 10,
      hasImages: true,
      imageCount: 6,
      hasVideo: false,
      hasForm: false,
      hasHeading: false,
      textLength: 10,
    };
    const result = analyzeUnknownBlock(domInfo);
    expect(result.semanticType).toBe('gallery');
  });

  it('включает описание DOM структуры', () => {
    const domInfo: DomBlockInfo = {
      tagName: 'section',
      classes: ['my-block', 'some-class'],
      childCount: 4,
      hasImages: true,
      imageCount: 1,
      hasVideo: false,
      hasForm: false,
      hasHeading: true,
      textLength: 200,
    };
    const result = analyzeUnknownBlock(domInfo);
    expect(result.domDescription).toContain('section');
    expect(result.domDescription).toBeTruthy();
  });
});
