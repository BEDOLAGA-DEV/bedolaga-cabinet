import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { GeoCheckResult } from '@/api/adminRemnawave';
import {
  CheckIcon,
  CodeIcon,
  CollapseIcon,
  CopyIcon,
  DownloadIcon,
  ExpandIcon,
  EyeIcon,
  RefreshIcon,
} from '@/components/icons';
import { cn } from '@/lib/utils';
import { copyToClipboard } from '@/utils/clipboard';
import { GeoCheckImageViewer } from './GeoCheckImageViewer';

type ReportTab = 'report' | 'json';

const TOOLBAR_BUTTON =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-dark-800 text-dark-400 transition-colors hover:bg-dark-700 hover:text-dark-100 disabled:cursor-not-allowed disabled:opacity-40';

interface GeoCheckReportProps {
  result: GeoCheckResult;
  nodeName: string;
  fullscreen: boolean;
  /**
   * Показывать ли переключатель полного экрана. В Telegram Mini App окно и так
   * во весь экран — режим лишь снимал отступы и лез под хром Telegram.
   */
  canFullscreen: boolean;
  /**
   * Показывать ли скачивание. В webview Telegram атрибут `download`
   * игнорируется: вместо сохранения файла webview уходит на blob и подменяет
   * собой Mini App, вернуться можно только кнопкой «Назад». Штатный
   * `downloadFile` из Bot API 8.0 тут не помогает — он требует HTTPS-ссылку
   * на файл, а отчёт приходит base64 внутри JSON.
   */
  canDownload: boolean;
  onToggleFullscreen: () => void;
  onRerun: () => void;
}

/**
 * Готовый отчёт GeoCheck: картинка либо тот же отчёт в JSON.
 *
 * Картинка вставляется как `<img src="data:...">`, а не сырым SVG в разметку:
 * отчёт несёт встроенный моноширинный шрифт и `<style>`, на которых держится
 * выравнивание колонок, — санитайзер их выбросит и таблицы поедут. В `<img>`
 * SVG рисуется в изолированном контексте без скриптов и внешних запросов, то
 * есть это и безопаснее, и вернее по виду.
 */
export function GeoCheckReport({
  result,
  nodeName,
  fullscreen,
  canFullscreen,
  canDownload,
  onToggleFullscreen,
  onRerun,
}: GeoCheckReportProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<ReportTab>('report');
  const [copied, setCopied] = useState(false);

  const imageSrc = useMemo(() => {
    const image = result.image;
    if (!image?.data) return null;
    return `data:${image.media_type};${image.encoding},${image.data}`;
  }, [result.image]);

  const reportJson = useMemo(
    () => (result.raw_report ? JSON.stringify(result.raw_report, null, 2) : null),
    [result.raw_report],
  );

  const imageAlt = t('admin.remnawave.geoCheck.reportAlt', 'GeoCheck report for {{node}}', {
    node: nodeName,
  });

  const handleCopy = async () => {
    if (!reportJson) return;
    await copyToClipboard(reportJson);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const image = result.image;
    if (!image?.data) return;
    // Blob, а не прямая ссылка на data: URL — во встроенном webview Telegram
    // скачивание по data: молча ничего не делает.
    const binary = atob(image.data);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: image.media_type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `geocheck-${nodeName.replace(/[^\w.-]+/g, '-').toLowerCase()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const tabs: Array<{ id: ReportTab; label: string; icon: ReactNode; enabled: boolean }> = [
    {
      id: 'report',
      label: t('admin.remnawave.geoCheck.tab.report', 'Report'),
      icon: <EyeIcon className="h-3.5 w-3.5" />,
      enabled: Boolean(imageSrc),
    },
    {
      id: 'json',
      label: t('admin.remnawave.geoCheck.tab.json', 'JSON'),
      icon: <CodeIcon className="h-3.5 w-3.5" />,
      enabled: Boolean(reportJson),
    },
  ];

  const fullscreenLabel = fullscreen
    ? t('admin.remnawave.geoCheck.exitFullscreen', 'Exit fullscreen')
    : t('admin.remnawave.geoCheck.fullscreen', 'Fullscreen');

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1 rounded-xl bg-dark-800/50 p-1">
          {tabs
            .filter((item) => item.enabled)
            .map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                aria-pressed={tab === item.id}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  tab === item.id
                    ? 'bg-accent-500/20 text-accent-400'
                    : 'text-dark-400 hover:bg-dark-700/50 hover:text-dark-200',
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
        </div>

        <div className="flex items-center gap-1">
          {canFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              disabled={!imageSrc}
              className={TOOLBAR_BUTTON}
              title={fullscreenLabel}
              aria-label={fullscreenLabel}
              aria-pressed={fullscreen}
            >
              {fullscreen ? (
                <CollapseIcon className="h-4 w-4" />
              ) : (
                <ExpandIcon className="h-4 w-4" />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            disabled={!reportJson}
            className={TOOLBAR_BUTTON}
            title={t('admin.remnawave.geoCheck.copyJson', 'Copy JSON report')}
            aria-label={t('admin.remnawave.geoCheck.copyJson', 'Copy JSON report')}
          >
            {copied ? (
              <CheckIcon className="h-4 w-4 text-success-400" />
            ) : (
              <CopyIcon className="h-4 w-4" />
            )}
          </button>
          {canDownload && (
            <button
              type="button"
              onClick={handleDownload}
              disabled={!imageSrc}
              className={TOOLBAR_BUTTON}
              title={t('admin.remnawave.geoCheck.download', 'Download SVG')}
              aria-label={t('admin.remnawave.geoCheck.download', 'Download SVG')}
            >
              <DownloadIcon className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onRerun}
            className={TOOLBAR_BUTTON}
            title={t('admin.remnawave.geoCheck.rerun', 'Run again')}
            aria-label={t('admin.remnawave.geoCheck.rerun', 'Run again')}
          >
            <RefreshIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {result.message && (
        <p className="mt-3 rounded-xl bg-warning-500/10 px-3 py-2 text-xs text-warning-400">
          {result.message}
        </p>
      )}

      {/* Высота задана явно: без неё зум-поверхности не от чего отталкиваться,
          а модалка растягивалась бы под натуральный размер отчёта. */}
      <div
        className={cn(
          'relative mt-3 overflow-hidden rounded-2xl border border-dark-700 bg-dark-950 [contain:paint]',
          fullscreen ? 'min-h-0 flex-1' : 'h-[62dvh] min-h-[16rem]',
        )}
      >
        {tab === 'report' && imageSrc && (
          <GeoCheckImageViewer src={imageSrc} alt={imageAlt} fullscreen={fullscreen} />
        )}
        {tab === 'json' && reportJson && (
          <pre className="h-full overflow-auto p-3 font-mono text-[11px] leading-relaxed text-dark-200">
            {reportJson}
          </pre>
        )}
      </div>
    </div>
  );
}
