import { useMemo } from 'react';
import { useHosts, useSummary } from '../useTargets';
import { useUnits } from '../useUnits';
import { type FleetRow, fleetRows } from './fleet';

/** Состояние флота: сводка последних проверок по всем симкам, хосты панели и каталог симок. */
export function useFleet() {
  const summary = useSummary('any');
  const hosts = useHosts();
  const units = useUnits();
  const rows: FleetRow[] = useMemo(
    () => (summary.data && hosts.data ? fleetRows(summary.data, hosts.data) : []),
    [summary.data, hosts.data],
  );
  return {
    rows,
    summary: summary.data,
    hosts: hosts.data ?? [],
    units: units.data ?? [],
    isLoading: summary.isLoading || hosts.isLoading,
    error: summary.error ?? hosts.error ?? null,
    refetch: () => {
      void summary.refetch();
      void hosts.refetch();
    },
  };
}
