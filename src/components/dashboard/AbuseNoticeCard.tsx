/**
 * AbuseNoticeCard — предупреждение о нарушении на главной.
 *
 * Показывает ровно то сообщение, которое клиенту уже отправили в Telegram и на
 * почту: ни скоринга, ни признаков, ни истории. Человек, которому объяснили
 * причину, чаще исправляется сам, а тот, кому показали перечень сработавших
 * проверок, просто обходит их.
 *
 * Карточка временная. Она исчезает, когда предупреждение перестаёт быть
 * актуальным на стороне антифрода, и её можно убрать вручную — тогда до
 * следующего предупреждения главная остаётся чистой.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { abuseApi } from '@/api/abuse';
import { Card } from '@/components/data-display';
import { ShieldIcon } from '@/components/icons';
import { Button } from '@/components/primitives';
import { formatDayMonth } from '@/utils/format';

const DISMISSED_KEY = 'abuse-notice-dismissed';

function readDismissed(): string | null {
  try {
    return localStorage.getItem(DISMISSED_KEY);
  } catch {
    // Приватный режим и заблокированное хранилище: просто покажем карточку.
    return null;
  }
}

export default function AbuseNoticeCard({ className }: { className?: string }) {
  const { t } = useTranslation();
  const [dismissedAt, setDismissedAt] = useState<string | null>(() => readDismissed());

  const { data } = useQuery({
    queryKey: ['abuse-status'],
    queryFn: abuseApi.myStatus,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const notice = data?.warned ? data.notice : null;
  if (!notice?.body) return null;
  // Скрытие привязано к конкретному предупреждению: новое покажется снова.
  if (dismissedAt && dismissedAt === (notice.sent_at ?? '')) return null;

  const dismiss = () => {
    const mark = notice.sent_at ?? '';
    setDismissedAt(mark);
    try {
      localStorage.setItem(DISMISSED_KEY, mark);
    } catch {
      // Не сохранилось — карточка вернётся после перезагрузки, это не страшно.
    }
  };

  return (
    <Card size="md" className={className ?? 'border-warning-500/30 bg-warning-500/10'}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-warning-400">
          <ShieldIcon />
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h2 className="text-base font-semibold leading-tight text-dark-100 [overflow-wrap:anywhere]">
              {notice.subject || t('abuse.notice.title')}
            </h2>
            {notice.sent_at && (
              <span className="text-xs text-dark-400">{formatDayMonth(notice.sent_at)}</span>
            )}
          </div>

          <p className="whitespace-pre-line text-sm leading-relaxed text-dark-200">{notice.body}</p>

          {/* На узком экране кнопки встают в колонку во всю ширину: в Mini App
              строка из двух кнопок ломается на половинки. */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button asChild variant="primary" size="md" className="w-full sm:w-auto">
              <Link to="/support">{t('abuse.notice.contactSupport')}</Link>
            </Button>
            <Button variant="ghost" size="md" onClick={dismiss} className="w-full sm:w-auto">
              {t('abuse.notice.dismiss')}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
