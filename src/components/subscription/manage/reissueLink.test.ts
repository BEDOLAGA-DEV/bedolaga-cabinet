import { describe, expect, it } from 'vitest';
import { canReissueLink } from './ReissueLinkButton';

/**
 * Условие живёт отдельно от кнопки, потому что подложку вокруг неё рисует
 * вызывающий экран. Пока их было двое — полная страница и простой вид — на
 * обоих успела появиться пустая карточка: блок сам прятался, а его рамка и
 * разделитель оставались. Тест держит одно условие на всех.
 */

const active = { is_active: true, is_limited: false, is_trial: false };

describe('canReissueLink', () => {
  it('живой платной подписке перевыпуск доступен', () => {
    expect(canReissueLink(active)).toBe(true);
  });

  it('исчерпавшей трафик — тоже: ссылка работать не перестала', () => {
    expect(canReissueLink({ is_active: false, is_limited: true, is_trial: false })).toBe(true);
  });

  it('пробной — нет', () => {
    expect(canReissueLink({ ...active, is_trial: true })).toBe(false);
    expect(canReissueLink({ is_active: false, is_limited: true, is_trial: true })).toBe(false);
  });

  it('неактивной — нет: перевыпускать нечего', () => {
    expect(canReissueLink({ is_active: false, is_limited: false, is_trial: false })).toBe(false);
  });
});
