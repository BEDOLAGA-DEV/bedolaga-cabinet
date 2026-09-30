import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { dpicheckerApi, type ReportRow } from '@/api/dpichecker';
import { Skeleton } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/utils/api-error';

/** Уже видно в строке точки или служебное — в «Подробно» не повторяем. */
const SHOWN_ELSEWHERE = new Set(['name', 'pop_id', 'pop_name', 'host', 'resource', 'is_direct']);

/** Строка отчёта этой точки: по имени ресурса и номеру точки; если имя не совпало — по точке, но только однозначно. */
export function findReportRow(
  rows: ReportRow[],
  name: string,
  popId: number | null,
): ReportRow | undefined {
  const atPop = rows.filter((row) => !row.is_direct && row.pop_id === popId);
  return atPop.find((row) => row.name === name) ?? (atPop.length === 1 ? atPop[0] : undefined);
}

/**
 * Все поля точки из построчного отчёта сервиса — подписями, а не кодами полей; незнакомое сервисное
 * поле не показывается. Отчёт грузится один раз на проверку, при первом раскрытии любой точки.
 */
export function PointDetails({
  actionId,
  resourceName,
  popId,
}: {
  actionId: number;
  resourceName: string;
  popId: number | null;
}) {
  const { t } = useTranslation();
  const report = useQuery({
    queryKey: ['dpichecker', 'report', actionId],
    queryFn: () => dpicheckerApi.reportTable(actionId),
    staleTime: 60_000,
  });
  if (report.isLoading) return <Skeleton className="h-16 w-full" />;
  if (report.isError || !report.data)
    return (
      <p className="text-sm text-error-400">
        {getApiErrorMessage(report.error, t('admin.dpichecker.result.detailsFailed'))}
      </p>
    );
  const row = findReportRow(report.data.rows, resourceName, popId);
  const facts = report.data.columns
    .filter((column) => !SHOWN_ELSEWHERE.has(column))
    .map((column) => {
      const label = t(`admin.dpichecker.result.fields.${column}`, { defaultValue: '' });
      const raw = row?.[column];
      if (!label || raw === null || raw === undefined || raw === '') return null;
      // «Задержка 0 мс» у неудачной точки — не замер, а его отсутствие.
      if (raw === 0 && column.endsWith('_ms')) return null;
      const value =
        typeof raw === 'boolean'
          ? t(raw ? 'admin.dpichecker.result.yes' : 'admin.dpichecker.result.no')
          : String(raw);
      return { column, label, value };
    })
    .filter((fact): fact is { column: string; label: string; value: string } => fact !== null);
  if (!facts.length)
    return <p className="text-sm text-dark-400">{t('admin.dpichecker.result.detailsEmpty')}</p>;
  return (
    <dl className="grid grid-cols-1 gap-x-4 gap-y-1 rounded-xl bg-dark-800/40 p-3 sm:grid-cols-2">
      {facts.map((fact) => (
        <div key={fact.column} className="flex min-w-0 gap-3 text-xs">
          <dt className="w-36 shrink-0 text-dark-400">{fact.label}</dt>
          <dd className="min-w-0 break-words text-dark-100">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
