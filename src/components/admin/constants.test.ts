import { describe, expect, it } from 'vitest';
import { OTHER_CATEGORIES, SETTINGS_TREE, getMappedCategoryKeys } from './constants';

// Категории настроек на бэкенде выводятся из имени ключа, поэтому каждая новая
// настройка может создать категорию, которой в дереве нет. Раньше такие настройки
// просто не отображались: так исчезла вся категория CABINET (13 настроек, включая
// CABINET_ENABLED и CABINET_URL) и правовые документы из INFO_PAGES.

describe('SETTINGS_TREE', () => {
  it('содержит пункт-сборник для категорий без своего места', () => {
    const children = SETTINGS_TREE.groups.flatMap((group) => group.children);
    const catchAll = children.filter((child) => child.categories.includes(OTHER_CATEGORIES));

    expect(catchAll).toHaveLength(1);
    expect(catchAll[0].id).toBe('sys_other');
  });

  it('не считает маркер сборника обычной категорией', () => {
    expect(getMappedCategoryKeys().has(OTHER_CATEGORIES)).toBe(false);
  });

  it('раскладывает по дереву категории, которые раньше терялись', () => {
    const mapped = getMappedCategoryKeys();

    for (const category of ['CABINET', 'INFO_PAGES', 'MENU']) {
      expect(mapped.has(category)).toBe(true);
    }
  });

  it('незнакомая категория попадает в сборник, а не пропадает', () => {
    const mapped = getMappedCategoryKeys();
    // Так выглядит любая категория, появившаяся на бэкенде после этого релиза.
    expect(mapped.has('SOME_FUTURE_CATEGORY')).toBe(false);
  });

  it('не содержит категорию дважды', () => {
    const all = SETTINGS_TREE.groups
      .flatMap((group) => group.children)
      .flatMap((child) => child.categories)
      .filter((category) => category !== OTHER_CATEGORIES);

    expect(new Set(all).size).toBe(all.length);
  });
});
