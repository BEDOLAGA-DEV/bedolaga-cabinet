import { describe, expect, it } from 'vitest';
import { parseSniHosts, sniNamesFor, sniNamesForAddresses } from './sniNames';

/**
 * Какие имена уйдут в TLS-SNI — то же правило, что в боте (requests.sni_hosts_for):
 * SNI цели, а без него домен; у голого IP имени нет.
 */

describe('sniNamesFor', () => {
  it('SNI важнее адреса, IP без SNI пропускается, имена уникальны и по алфавиту', () => {
    expect(
      sniNamesFor([
        { address: '203.0.113.10', sni: null },
        { address: '203.0.113.11', sni: 'White.example' },
        { address: 'EU-host.example', sni: null },
        { address: 'eu-host.example', sni: 'eu-host.example' },
      ]),
    ).toEqual(['eu-host.example', 'white.example']);
  });
});

describe('sniNamesForAddresses', () => {
  it('из своих адресов берутся только домены: схема, путь и порт отбрасываются', () => {
    expect(
      sniNamesForAddresses(['https://ya.ru/path?q=1', '77.88.8.8', 'github.com:443', 'Ya.ru']),
    ).toEqual(['github.com', 'ya.ru']);
  });
});

describe('parseSniHosts', () => {
  it('имена через запятую или с новой строки, в нижнем регистре, без повторов, не больше пяти', () => {
    const parsed = parseSniHosts(' Ads.X5.ru, vk.com; ads.x5.ru\nyandex.ru.');
    expect(parsed).toEqual({
      names: ['ads.x5.ru', 'vk.com', 'yandex.ru'],
      invalid: [],
      overLimit: 0,
    });
    const many = parseSniHosts('a.ru, b.ru, c.ru, d.ru, e.ru, f.ru, g.ru');
    expect(many.names).toHaveLength(5);
    expect(many.overLimit).toBe(2);
  });

  it('IP и мусор попадают в invalid, пустая строка — пустой результат', () => {
    expect(parseSniHosts('203.0.113.10, not a host, ok.example')).toEqual({
      names: ['ok.example'],
      invalid: ['203.0.113.10', 'not a host'],
      overLimit: 0,
    });
    expect(parseSniHosts('')).toEqual({ names: [], invalid: [], overLimit: 0 });
  });
});
