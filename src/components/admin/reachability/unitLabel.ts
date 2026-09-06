import type { Job, Leg, Unit } from '@/api/reachability';
import { operatorCode } from './operatorIcons';

/** Подписи строк таблицы результата: симка оператора и цель. Чистые функции. */

export interface UnitLabel {
  /** Код оператора для иконки («mts»). */
  code: string;
  /** Имя оператора из каталога симок; нет в каталоге — запасное имя из ответа, иначе код. */
  name: string;
  /** Округ заглавными («ЦФО»). */
  region: string;
}

export function unitLabel(
  leg: Pick<Leg, 'op_key' | 'operator' | 'region'>,
  catalog: readonly Unit[],
  fallbackName: string | null = null,
): UnitLabel {
  const unit = catalog.find((item) => item.op_key === leg.op_key);
  const code = leg.operator ?? unit?.operator ?? operatorCode(leg.op_key);
  const [, region = ''] = leg.op_key.split('|');
  return {
    code,
    name: unit?.name ?? fallbackName ?? code,
    region: (leg.region ?? unit?.region ?? region).toUpperCase(),
  };
}

/** Подпись цели из задачи; цели нет в списке — undefined, вызывающий подставляет свою. */
export function targetLabel(job: Pick<Job, 'targets'>, targetKey: string): string | undefined {
  return job.targets.find((target) => target.target_key === targetKey)?.label;
}

/** Имена симок с округом по каталогу («МТС ЦФО»); неизвестная симка — своим ключом. */
export function unitNameList(opKeys: readonly string[], catalog: readonly Unit[]): string[] {
  return opKeys.map((opKey) => {
    const unit = catalog.find((item) => item.op_key === opKey);
    return unit ? `${unit.name} ${unit.region}` : opKey;
  });
}

export function unitNames(opKeys: readonly string[], catalog: readonly Unit[]): string {
  return unitNameList(opKeys, catalog).join(', ');
}
