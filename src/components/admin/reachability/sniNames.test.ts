import { describe, expect, it } from 'vitest';
import { sniNamesFor, sniNamesForAddresses } from './sniNames';

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
