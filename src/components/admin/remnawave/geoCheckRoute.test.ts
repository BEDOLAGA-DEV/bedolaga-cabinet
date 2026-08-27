import { describe, expect, it } from 'vitest';
import type { NodeInfo } from '@/api/adminRemnawave';
import {
  buildGeoCheckRequest,
  isRouteReady,
  isValidInterfaceName,
  isValidIpAddress,
  suggestedInterfaces,
  suggestedIps,
} from './geoCheckRoute';

function node(overrides: Partial<NodeInfo> = {}): NodeInfo {
  return {
    uuid: 'n-1',
    name: 'Germany #2',
    address: '213.176.77.249',
    is_connected: true,
    is_disabled: false,
    is_node_online: true,
    is_xray_running: true,
    users_online: 10,
    xray_uptime: 0,
    is_traffic_tracking_active: false,
    consumption_multiplier: 1,
    ...overrides,
  } as NodeInfo;
}

describe('isValidIpAddress', () => {
  it.each(['1.2.3.4', '213.176.77.249', '0.0.0.0', '255.255.255.255', '2a0b:4141:820:140d::2'])(
    'принимает %s',
    (value) => expect(isValidIpAddress(value)).toBe(true),
  );

  it.each(['', '   ', 'not-an-ip', '256.1.1.1', '1.2.3', '1.2.3.4/24', '1.2.3.4 ; reboot'])(
    'отклоняет %s',
    (value) => expect(isValidIpAddress(value)).toBe(false),
  );

  it('игнорирует обрамляющие пробелы', () => {
    expect(isValidIpAddress('  1.2.3.4  ')).toBe(true);
  });
});

describe('isValidInterfaceName', () => {
  it.each(['eth0', 'ens3', 'wg0', 'br-lan', 'enp0s31f6'])('принимает %s', (value) =>
    expect(isValidInterfaceName(value)).toBe(true),
  );

  it.each(['', 'bad iface', 'eth0;reboot', '../etc', '-eth0', 'a'.repeat(33)])(
    'отклоняет %s',
    (value) => expect(isValidInterfaceName(value)).toBe(false),
  );
});

describe('isRouteReady', () => {
  it('режим по умолчанию не требует значения', () => {
    expect(isRouteReady('default', '')).toBe(true);
  });

  it('режимы ip и interface требуют корректного значения', () => {
    expect(isRouteReady('ip', '')).toBe(false);
    expect(isRouteReady('ip', '1.2.3.4')).toBe(true);
    expect(isRouteReady('interface', '')).toBe(false);
    expect(isRouteReady('interface', 'ens3')).toBe(true);
  });
});

describe('buildGeoCheckRequest', () => {
  it('по умолчанию отправляет пустое тело', () => {
    expect(buildGeoCheckRequest('default', 'ens3')).toEqual({});
  });

  it('отправляет ровно одно поле — иначе панель получит неоднозначный запрос', () => {
    expect(buildGeoCheckRequest('ip', ' 1.2.3.4 ')).toEqual({ ip: '1.2.3.4' });
    expect(buildGeoCheckRequest('interface', ' ens3 ')).toEqual({ interface: 'ens3' });
  });

  it('пустое значение в режиме ip/interface означает маршрут по умолчанию', () => {
    expect(buildGeoCheckRequest('ip', '   ')).toEqual({});
  });
});

describe('suggestedIps', () => {
  it('ставит адрес ноды первым и не дублирует его', () => {
    const result = suggestedIps(
      node({
        ips: [
          { ip: '213.176.77.249', status: 'OUTBOUND' },
          { ip: '2a0b:4141:820:140d::2', status: 'INBOUND' },
        ],
      }),
    );
    expect(result).toEqual(['213.176.77.249', '2a0b:4141:820:140d::2']);
  });

  it('не предлагает заблокированные адреса', () => {
    const result = suggestedIps(node({ ips: [{ ip: '10.0.0.1', status: 'BLOCKED' }] }));
    expect(result).toEqual(['213.176.77.249']);
  });

  it('работает, когда панель не прислала ips', () => {
    expect(suggestedIps(node())).toEqual(['213.176.77.249']);
  });
});

describe('suggestedInterfaces', () => {
  it('отбрасывает loopback', () => {
    const result = suggestedInterfaces(
      node({
        system: {
          info: { networkInterfaces: ['lo', 'ens3', 'wg0'] },
          stats: {},
        } as unknown as NodeInfo['system'],
      }),
    );
    expect(result).toEqual(['ens3', 'wg0']);
  });

  it('без системной информации — пусто', () => {
    expect(suggestedInterfaces(node())).toEqual([]);
  });
});
