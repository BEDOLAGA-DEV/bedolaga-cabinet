// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Редактор премиум-лимитов в карточке тарифа.
 *
 * Цены хранятся в копейках, а вводятся в рублях — расхождение здесь означало бы
 * тариф, где пакет стоит в сто раз дороже или дешевле задуманного.
 */

vi.mock('react-i18next', async () => (await import('../reachability/testUtils')).i18nMock());

import type { ServerInfo, ServerTrafficLimit } from '../../../api/tariffs';
import { installMatchMedia, renderWithProviders } from '../reachability/testUtils';
import { PremiumSquadLimits } from './PremiumSquadLimits';

installMatchMedia();
afterEach(cleanup);

const LTE = 'e4f819ca-2cfd-4425-9354-16a262b180c1';
const PLAIN = '82a12389-14d6-40c6-b320-4674f6bbb344';

const SERVERS: ServerInfo[] = [
  { id: 1, squad_uuid: LTE, display_name: 'Мобильный резерв', country_code: 'RU' } as ServerInfo,
  { id: 2, squad_uuid: PLAIN, display_name: 'Amsterdam', country_code: 'NL' } as ServerInfo,
];

function render(value: Record<string, ServerTrafficLimit>, selected: string[] = [LTE, PLAIN]) {
  const onChange = vi.fn();
  renderWithProviders(
    <PremiumSquadLimits
      servers={SERVERS}
      selectedSquads={selected}
      value={value}
      onChange={onChange}
    />,
  );
  return onChange;
}

describe('PremiumSquadLimits', () => {
  it('без выбранных серверов просит сначала выбрать их', () => {
    render({}, []);

    expect(screen.getByText('Сначала выберите серверы тарифа')).toBeTruthy();
  });

  it('показывает только серверы, выбранные в тарифе', () => {
    render({}, [LTE]);

    expect(screen.getByText('Мобильный резерв')).toBeTruthy();
    expect(screen.queryByText('Amsterdam')).toBeNull();
  });

  it('нулевой лимит не показывает настройки докупки', () => {
    // На сервере без премиума докупать нечего.
    render({ [LTE]: { traffic_limit_gb: 0 } }, [LTE]);

    expect(screen.queryByText('Разрешить докупку')).toBeNull();
  });

  it('положительный лимит открывает настройки докупки', () => {
    render({ [LTE]: { traffic_limit_gb: 5 } }, [LTE]);

    expect(screen.getByText('Разрешить докупку')).toBeTruthy();
  });

  it('название подсказывает именем сервера, пока своё не задано', () => {
    // Когда премиум-серверов несколько, без названия строки в интерфейсе
    // подписаны одинаково и различить их нельзя.
    render({ [LTE]: { traffic_limit_gb: 5 } }, [LTE]);

    const input = screen.getByLabelText('Название') as HTMLInputElement;
    expect(input.value).toBe('');
    expect(input.placeholder).toBe('Мобильный резерв');
  });

  it('своё название уходит наверх', () => {
    const onChange = render({ [LTE]: { traffic_limit_gb: 5 } }, [LTE]);

    fireEvent.change(screen.getByLabelText('Название'), { target: { value: 'Мобильный резерв' } });

    expect(onChange).toHaveBeenCalledWith({
      [LTE]: expect.objectContaining({ name: 'Мобильный резерв' }),
    });
  });

  it('пустое название сбрасывается в null, а не в пустую строку', () => {
    // Пустая строка перекрыла бы фолбэк на имя сервера.
    const onChange = render({ [LTE]: { traffic_limit_gb: 5, name: 'Резерв' } }, [LTE]);

    fireEvent.change(screen.getByLabelText('Название'), { target: { value: '' } });

    expect(onChange).toHaveBeenCalledWith({ [LTE]: expect.objectContaining({ name: null }) });
  });

  it('пробел внутри названия не съедается при наборе', () => {
    // Обрезка на каждом нажатии убирала концевой пробел прямо во время набора,
    // и слова слипались: «Мобильный резерв» набрать было нельзя.
    const onChange = render({ [LTE]: { traffic_limit_gb: 5, name: 'Мобильный' } }, [LTE]);

    fireEvent.change(screen.getByLabelText('Название'), { target: { value: 'Мобильный ' } });

    expect(onChange).toHaveBeenCalledWith({
      [LTE]: expect.objectContaining({ name: 'Мобильный ' }),
    });
  });

  it('эмодзи и кириллица сохраняются как есть', () => {
    const onChange = render({ [LTE]: { traffic_limit_gb: 5 } }, [LTE]);

    fireEvent.change(screen.getByLabelText('Название'), {
      target: { value: '📱 Мобильный резерв' },
    });

    expect(onChange).toHaveBeenCalledWith({
      [LTE]: expect.objectContaining({ name: '📱 Мобильный резерв' }),
    });
  });

  it('изменение лимита уходит наверх', () => {
    const onChange = render({ [LTE]: { traffic_limit_gb: 5 } }, [LTE]);

    fireEvent.change(screen.getByLabelText(/Лимит, ГБ/), { target: { value: '10' } });

    expect(onChange).toHaveBeenCalledWith({ [LTE]: { traffic_limit_gb: 10 } });
  });

  it('очищенное числовое поле остаётся пустым, а не подставляет ноль', () => {
    // Иначе ноль возвращается под курсор на каждом нажатии, и вместо «10»
    // набирается «010», а стереть его невозможно.
    const onChange = render({ [LTE]: { traffic_limit_gb: 5 } }, [LTE]);
    const field = screen.getByLabelText('Лимит, ГБ') as HTMLInputElement;

    fireEvent.change(field, { target: { value: '' } });

    expect(field.value).toBe('');
    expect(onChange).toHaveBeenCalledWith({ [LTE]: { traffic_limit_gb: 0 } });
  });

  it('после очистки набирается ровно то, что вводят', () => {
    const onChange = render({ [LTE]: { traffic_limit_gb: 5 } }, [LTE]);
    const field = screen.getByLabelText('Лимит, ГБ') as HTMLInputElement;

    fireEvent.change(field, { target: { value: '' } });
    fireEvent.change(field, { target: { value: '1' } });
    fireEvent.change(field, { target: { value: '10' } });

    expect(field.value).toBe('10');
    const calls = onChange.mock.calls;
    expect(calls[calls.length - 1][0][LTE].traffic_limit_gb).toBe(10);
  });

  it('по уходу фокуса текст приводится к каноническому виду', () => {
    render({ [LTE]: { traffic_limit_gb: 5 } }, [LTE]);
    const field = screen.getByLabelText('Лимит, ГБ') as HTMLInputElement;

    fireEvent.change(field, { target: { value: '010' } });
    fireEvent.blur(field);

    expect(field.value).toBe('10');
  });

  it('цена пакета тоже очищается без подстановки нуля', () => {
    render({ [LTE]: { traffic_limit_gb: 5, topup_enabled: true, topup_packages: { '5': 2000 } } }, [
      LTE,
    ]);
    const price = screen.getByLabelText('Цена пакета, ₽') as HTMLInputElement;

    fireEvent.change(price, { target: { value: '' } });

    expect(price.value).toBe('');
  });

  it('отрицательный лимит превращается в ноль', () => {
    const onChange = render({ [LTE]: { traffic_limit_gb: 5 } }, [LTE]);

    fireEvent.change(screen.getByLabelText(/Лимит, ГБ/), { target: { value: '-3' } });

    expect(onChange).toHaveBeenCalledWith({ [LTE]: { traffic_limit_gb: 0 } });
  });

  it('цена вводится в рублях, а хранится в копейках', () => {
    const onChange = render(
      { [LTE]: { traffic_limit_gb: 5, topup_enabled: true, topup_packages: { '5': 2000 } } },
      [LTE],
    );

    const price = screen.getByLabelText('Цена пакета, ₽') as HTMLInputElement;
    expect(price.value).toBe('20');

    fireEvent.change(price, { target: { value: '35.50' } });

    expect(onChange).toHaveBeenCalledWith({
      [LTE]: expect.objectContaining({ topup_packages: { '5': 3550 } }),
    });
  });

  it('набор многозначного объёма не затирает существующий пакет', () => {
    // Объём — ключ словаря пакетов. Пока «10» набирается, промежуточная «1»
    // совпадала с существующим пакетом и стирала его цену.
    const onChange = render(
      {
        [LTE]: {
          traffic_limit_gb: 5,
          topup_enabled: true,
          topup_packages: { '1': 500, '2': 0 },
        },
      },
      [LTE],
    );

    const gbInputs = screen.getAllByLabelText('Объём пакета, ГБ');
    // Вторая строка: набираем «10» по одной цифре, как человек.
    fireEvent.change(gbInputs[1], { target: { value: '1' } });
    fireEvent.change(screen.getAllByLabelText('Объём пакета, ГБ')[1], { target: { value: '10' } });

    const calls = onChange.mock.calls;
    const last = calls[calls.length - 1][0];
    expect(last[LTE].topup_packages).toEqual({ '1': 500, '10': 0 });
  });

  it('цена первого пакета не теряется при правке второго', () => {
    const onChange = render(
      {
        [LTE]: {
          traffic_limit_gb: 5,
          topup_enabled: true,
          topup_packages: { '1': 500, '10': 2000 },
        },
      },
      [LTE],
    );

    fireEvent.change(screen.getAllByLabelText('Цена пакета, ₽')[1], { target: { value: '35' } });

    const calls = onChange.mock.calls;
    const last = calls[calls.length - 1][0];
    expect(last[LTE].topup_packages).toEqual({ '1': 500, '10': 3500 });
  });

  it('незаконченный ввод не роняет строку, но и не уходит наверх', () => {
    // Очистив поле, пользователь ещё печатает — строка обязана остаться.
    const onChange = render(
      { [LTE]: { traffic_limit_gb: 5, topup_enabled: true, topup_packages: { '5': 2000 } } },
      [LTE],
    );

    fireEvent.change(screen.getByLabelText('Объём пакета, ГБ'), { target: { value: '' } });

    const calls = onChange.mock.calls;
    expect(calls[calls.length - 1][0][LTE].topup_packages).toEqual({});
    expect(screen.getAllByLabelText('Объём пакета, ГБ')).toHaveLength(1);
  });

  it('одинаковые объёмы помечаются как схлопывающиеся', () => {
    const onChange = render(
      {
        [LTE]: {
          traffic_limit_gb: 5,
          topup_enabled: true,
          topup_packages: { '1': 500, '5': 2000 },
        },
      },
      [LTE],
    );

    fireEvent.change(screen.getAllByLabelText('Объём пакета, ГБ')[1], { target: { value: '1' } });

    expect(screen.getByText(/схлопнутся при сохранении/)).toBeTruthy();
    void onChange;
  });

  it('новый пакет не затирает существующий', () => {
    // Ключ пакета — его объём, поэтому дубль просто перезаписал бы цену.
    const onChange = render(
      { [LTE]: { traffic_limit_gb: 5, topup_enabled: true, topup_packages: { '1': 500 } } },
      [LTE],
    );

    fireEvent.click(screen.getByText(/Добавить пакет/));

    expect(onChange).toHaveBeenCalledWith({
      [LTE]: expect.objectContaining({ topup_packages: { '1': 500, '2': 0 } }),
    });
  });

  it('пакет удаляется', () => {
    const onChange = render(
      {
        [LTE]: {
          traffic_limit_gb: 5,
          topup_enabled: true,
          topup_packages: { '1': 500, '5': 2000 },
        },
      },
      [LTE],
    );

    fireEvent.click(screen.getAllByText('Удалить')[0]);

    expect(onChange).toHaveBeenCalledWith({
      [LTE]: expect.objectContaining({ topup_packages: { '5': 2000 } }),
    });
  });

  it('предупреждает, когда докупка включена без пакетов', () => {
    render({ [LTE]: { traffic_limit_gb: 5, topup_enabled: true } }, [LTE]);

    expect(screen.getByText('Пакетов нет — докупать будет нечего')).toBeTruthy();
  });

  it('порядок берётся из настройки, а не из справочника серверов', () => {
    // Именно в этом порядке строки увидит пользователь на главном экране.
    render(
      {
        [LTE]: { traffic_limit_gb: 5, sort_order: 0 },
        [PLAIN]: { traffic_limit_gb: 5, sort_order: 1 },
      },
      [LTE, PLAIN],
    );

    const names = screen.getAllByText(/Мобильный резерв|Amsterdam/).map((n) => n.textContent);
    expect(names).toEqual(['Мобильный резерв', 'Amsterdam']);
  });

  it('стрелка меняет порядок и переписывает его целиком', () => {
    // Частичная правка оставила бы дубли, а сортировка с одинаковыми ключами
    // дала бы непредсказуемый результат.
    const onChange = render(
      {
        [LTE]: { traffic_limit_gb: 5, sort_order: 0 },
        [PLAIN]: { traffic_limit_gb: 5, sort_order: 1 },
      },
      [LTE, PLAIN],
    );

    fireEvent.click(screen.getAllByLabelText('Ниже')[0]);

    expect(onChange).toHaveBeenCalledWith({
      [PLAIN]: expect.objectContaining({ sort_order: 0 }),
      [LTE]: expect.objectContaining({ sort_order: 1 }),
    });
  });

  it('крайние стрелки выключены', () => {
    render(
      {
        [LTE]: { traffic_limit_gb: 5, sort_order: 0 },
        [PLAIN]: { traffic_limit_gb: 5, sort_order: 1 },
      },
      [LTE, PLAIN],
    );

    const up = screen.getAllByLabelText('Выше') as HTMLButtonElement[];
    const down = screen.getAllByLabelText('Ниже') as HTMLButtonElement[];

    expect(up[0].disabled).toBe(true);
    expect(down[down.length - 1].disabled).toBe(true);
  });

  it('правка одного сервера не трогает настройки другого', () => {
    // Порядок задаём явно: он определяет, какое поле окажется первым.
    const onChange = render(
      {
        [LTE]: { traffic_limit_gb: 5, sort_order: 0 },
        [PLAIN]: { traffic_limit_gb: 20, sort_order: 1 },
      },
      [LTE, PLAIN],
    );

    fireEvent.change(screen.getAllByLabelText(/Лимит, ГБ/)[0], { target: { value: '7' } });

    expect(onChange).toHaveBeenCalledWith({
      [LTE]: { traffic_limit_gb: 7, sort_order: 0 },
      [PLAIN]: { traffic_limit_gb: 20, sort_order: 1 },
    });
  });
});
