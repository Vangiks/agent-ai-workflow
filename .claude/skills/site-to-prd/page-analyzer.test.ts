// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildSectionTree, type RawSection } from './page-analyzer.js';

describe('buildSectionTree', () => {
  it('маппит известный блок t396 на hero', () => {
    const rawSections: RawSection[] = [
      {
        tildaBlockId: 't396',
        classes: ['t-rec', 't396'],
        tagName: 'div',
        childCount: 3,
        hasImages: true,
        imageCount: 1,
        hasVideo: false,
        hasForm: false,
        hasHeading: true,
        textLength: 200,
      },
    ];
    const sections = buildSectionTree(rawSections);
    expect(sections).toHaveLength(1);
    expect(sections[0]!.tildaBlockId).toBe('t396');
    expect(sections[0]!.semanticType).toBe('hero');
    expect(sections[0]!.componentName).toBeTruthy();
    expect(sections[0]!.stackRecommendation).toBeTruthy();
  });

  it('маппит блок t741 на footer', () => {
    const rawSections: RawSection[] = [
      {
        tildaBlockId: 't741',
        classes: ['t-rec', 't741'],
        tagName: 'div',
        childCount: 5,
        hasImages: false,
        hasVideo: false,
        hasForm: false,
        hasHeading: false,
        textLength: 100,
      },
    ];
    const sections = buildSectionTree(rawSections);
    expect(sections[0]!.semanticType).toBe('footer');
  });

  it('нераспознанный блок получает тип custom', () => {
    const rawSections: RawSection[] = [
      {
        tildaBlockId: 't99999',
        classes: ['t-rec', 't99999'],
        tagName: 'div',
        childCount: 2,
        hasImages: false,
        hasVideo: false,
        hasForm: false,
        hasHeading: false,
        textLength: 50,
      },
    ];
    const sections = buildSectionTree(rawSections);
    expect(sections[0]!.semanticType).toBe('custom');
    expect(sections[0]!.domDescription).toBeTruthy();
  });

  it('нераспознанный блок с формой получает тип form', () => {
    const rawSections: RawSection[] = [
      {
        tildaBlockId: 't88888',
        classes: ['t-rec', 't88888'],
        tagName: 'div',
        childCount: 6,
        hasImages: false,
        hasVideo: false,
        hasForm: true,
        hasHeading: true,
        textLength: 80,
      },
    ];
    const sections = buildSectionTree(rawSections);
    expect(sections[0]!.semanticType).toBe('form');
  });

  it('обрабатывает несколько секций', () => {
    const rawSections: RawSection[] = [
      {
        tildaBlockId: 't226',
        classes: ['t-rec', 't226'],
        tagName: 'div',
        childCount: 4,
        hasImages: false,
        hasVideo: false,
        hasForm: false,
        hasHeading: false,
        textLength: 30,
      },
      {
        tildaBlockId: 't396',
        classes: ['t-rec', 't396'],
        tagName: 'div',
        childCount: 3,
        hasImages: true,
        imageCount: 1,
        hasVideo: false,
        hasForm: false,
        hasHeading: true,
        textLength: 200,
      },
      {
        tildaBlockId: 't741',
        classes: ['t-rec', 't741'],
        tagName: 'div',
        childCount: 5,
        hasImages: false,
        hasVideo: false,
        hasForm: false,
        hasHeading: false,
        textLength: 100,
      },
    ];
    const sections = buildSectionTree(rawSections);
    expect(sections).toHaveLength(3);
    expect(sections[0]!.semanticType).toBe('header');
    expect(sections[1]!.semanticType).toBe('hero');
    expect(sections[2]!.semanticType).toBe('footer');
  });

  it('возвращает пустой массив для пустого входа', () => {
    const sections = buildSectionTree([]);
    expect(sections).toHaveLength(0);
  });

  it('каждая секция содержит все обязательные поля', () => {
    const rawSections: RawSection[] = [
      {
        tildaBlockId: 't245',
        classes: ['t-rec', 't245'],
        tagName: 'div',
        childCount: 6,
        hasImages: true,
        imageCount: 3,
        hasVideo: false,
        hasForm: false,
        hasHeading: true,
        textLength: 300,
      },
    ];
    const sections = buildSectionTree(rawSections);
    const section = sections[0]!;
    expect(section.tildaBlockId).toBeTruthy();
    expect(section.semanticType).toBeTruthy();
    expect(section.componentName).toBeTruthy();
    expect(section.stackRecommendation).toBeTruthy();
  });
});
