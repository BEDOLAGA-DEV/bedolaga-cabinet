import { describe, expect, it } from 'vitest';
import { initialSelection } from './autoSelect';

/** Вставленные конфиги отмечаются сразу — но API берёт не больше 20 за тест, а в подписке
 * бывает 10 тысяч серверов: тогда отмечать «все» нельзя, человек выбирает сам. */
describe('initialSelection', () => {
  it('до двадцати конфигов отмечает все', () => {
    expect(initialSelection([{ index: 3 }, { index: 7 }])).toEqual([3, 7]);
    expect(initialSelection(Array.from({ length: 20 }, (_, i) => ({ index: i })))).toHaveLength(20);
  });

  it('больше двадцати — ничего: первые двадцать из тысяч были бы случайными', () => {
    expect(initialSelection(Array.from({ length: 21 }, (_, i) => ({ index: i })))).toEqual([]);
    expect(initialSelection(Array.from({ length: 10_000 }, (_, i) => ({ index: i })))).toEqual([]);
  });
});
