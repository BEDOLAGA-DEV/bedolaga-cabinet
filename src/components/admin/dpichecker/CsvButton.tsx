import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { dpicheckerApi } from '@/api/dpichecker';
import { DownloadIcon } from '@/components/icons';
import { usePlatform } from '@/platform';
import { getApiErrorMessage } from '@/utils/api-error';

/**
 * CSV отчёта или Соседей — одним путём для браузера и Mini App: бот выдаёт подписанную ссылку на
 * 5 минут, платформа качает её сама. Кнопка маленькая — живёт в шапке результата, не отдельной строкой.
 */
export function CsvButton({ kind, actionId }: { kind: 'report' | 'noisy'; actionId: number }) {
  const { t } = useTranslation();
  const { downloadFile } = usePlatform();
  const download = useMutation({
    mutationFn: async () => {
      const link = await dpicheckerApi.downloadLink(kind, actionId);
      await downloadFile(link.url, link.file_name);
    },
  });
  return (
    <span className="flex flex-col items-end gap-1">
      <button
        type="button"
        className="btn-secondary flex min-h-[36px] shrink-0 items-center gap-1.5 px-3 text-sm"
        disabled={download.isPending}
        onClick={() => download.mutate()}
      >
        <DownloadIcon className="h-4 w-4" />
        {t('admin.dpichecker.result.csv')}
      </button>
      {download.isError && (
        <span role="alert" className="text-xs text-error-400">
          {getApiErrorMessage(download.error, t('admin.dpichecker.result.csvFailed'))}
        </span>
      )}
    </span>
  );
}
