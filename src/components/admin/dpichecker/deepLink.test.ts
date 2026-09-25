import { describe, expect, it } from 'vitest';
import { buildLink, readLink } from './deepLink';

describe('адрес раздела DPI//CHECKER', () => {
  it('по умолчанию — вкладка VPN', () => {
    expect(readLink(new URLSearchParams(''))).toEqual({
      tab: 'vpn',
      check: null,
      scan: null,
      source: null,
      ref: null,
    });
  });

  it('неизвестная вкладка → VPN, номера — только положительные числа', () => {
    expect(readLink(new URLSearchParams('tab=zzz&check=12&scan=-3'))).toMatchObject({
      tab: 'vpn',
      check: 12,
      scan: null,
    });
    expect(readLink(new URLSearchParams('check=abc'))).toMatchObject({ check: null });
  });

  it('переход с ноды подставляет источник, чужой источник отбрасывается', () => {
    expect(readLink(new URLSearchParams('tab=ip&source=node&ref=abc'))).toMatchObject({
      tab: 'ip',
      source: 'node',
      ref: 'abc',
    });
    expect(readLink(new URLSearchParams('source=evil&ref=x'))).toMatchObject({
      source: null,
      ref: null,
    });
  });

  it('сборка и разбор сходятся', () => {
    const url = buildLink({ tab: 'history', check: 5 });
    expect(url).toBe('/admin/dpichecker?tab=history&check=5');
    expect(readLink(new URLSearchParams(url.split('?')[1]))).toMatchObject({
      tab: 'history',
      check: 5,
    });
  });

  it('пустая сборка — сам раздел', () => {
    expect(buildLink({})).toBe('/admin/dpichecker');
  });
});
